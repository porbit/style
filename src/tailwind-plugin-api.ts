/**
 * Chạy plugin JS của Tailwind (v3/v4: `plugin(api)`, `{ handler, config }` của `tailwindcss/plugin`,
 * `plugin.withOptions`) mà không cần cài `tailwindcss`, rồi viết kết quả thành CSS Tailwind v4 cho
 * `parseTailwindStylesheet`:
 *
 *   - `addUtilities`/`addComponents` -> `@utility name { ... }` (selector lồng dùng `&`),
 *   - `matchUtilities`/`matchComponents` -> mỗi giá trị trong `values` (kể cả `DEFAULT`, giá trị âm,
 *     tổ hợp `modifiers`) thành `@utility` tĩnh; giá trị tuỳ ý `name-[x]`, giá trị trần (`fade-in-37`)
 *     và độ mờ màu (`name-red-500/50`) thành `@utility name-* { x: --value(...) }` khi dựng được mẫu,
 *   - `addBase` -> `@layer base {...}`, `@keyframes` -> giữ nguyên,
 *   - `addVariant`/`matchVariant` -> `@custom-variant name { ... @slot; }`; giá trị tuỳ ý của `matchVariant`
 *     (`name-[x]:`, `name-[x]/mod:`) thành biến thể hàm `name-*` (thân có chỗ giữ giá trị) khi dựng được mẫu,
 *   - `@apply` trong CSS-in-JS (`'.btn': { '@apply px-4 py-2': {} }`) -> `@apply px-4 py-2;` trong `@utility`,
 *   - `config.theme` của plugin -> `@theme` (qua `tailwindConfigToCss`).
 *
 * `theme()` mô phỏng đúng thuật toán của Tailwind 4.3.5 (src/compat/plugin-api.ts): đọc biến theme CSS
 * (theme mặc định của v4 + `@theme` của dự án) trước, rồi theme cấu hình kiểu v3 (theme mặc định compat
 * — cùng dữ liệu `tailwindcss/defaultTheme` — + `config.theme` của plugin + `tailwind.config.js`).
 *
 * Tên utility có `.`, `/`, `%` (`scrollbar-w-0.5`, `w-1/2`) không viết được bằng `@utility` của
 * `parseTailwindStylesheet`: chúng nằm trong `output.utilities` và được gộp vào stylesheet bằng
 * `applyTailwindPluginOutput` (hoặc `loader.apply(sheet)`).
 *
 * Chưa hỗ trợ: `matchVariant` mà kết quả không là mẫu của giá trị (giá trị dùng để rẽ nhánh), at-rule khác `@media`
 * bên trong utility (`@supports`,
 * `@container`...), `prefix`/`important` của cấu hình, modifier dạng `modifiers: 'any'` với tên (chỉ nhận `/[x]`).
 */
import Module, { createRequire } from 'node:module'
import { isAbsolute, join, resolve as resolvePath } from 'node:path'
import { isOpenPropertyName, standardCssProperties } from './css-properties'
import { flattenTailwindPresets, mergeTailwindConfigs, tailwindConfigToCss } from './tailwind-config'
import { TW_DATA } from './tailwind-generated'
import type { TailwindVariantOrder } from './tailwind-v4'

type Json = Record<string, any>

// ---------------------------------------------------------------------------
// Tiện ích chung (bản sao hành vi của Tailwind)
// ---------------------------------------------------------------------------

const isPlainObject = (value: unknown): value is Json => {
    if (Object.prototype.toString.call(value) !== '[object Object]') return false
    const proto = Object.getPrototypeOf(value)
    return proto === null || Object.getPrototypeOf(proto) === null
}

/** Tách chuỗi theo `separator` ở cấp ngoài cùng (bỏ qua trong ngoặc/nháy, ký tự thoát). */
const segment = (input: string, separator: string): string[] => {
    const parts: string[] = []
    const closers: string[] = []
    let start = 0
    for (let i = 0; i < input.length; i++) {
        const ch = input[i]
        if (closers.length === 0 && ch === separator) {
            parts.push(input.slice(start, i))
            start = i + 1
            continue
        }
        if (ch === '\\') i++
        else if (ch === '"' || ch === "'") {
            while (++i < input.length) {
                if (input[i] === '\\') i++
                else if (input[i] === ch) break
            }
        } else if (ch === '(') closers.push(')')
        else if (ch === '[') closers.push(']')
        else if (ch === '{') closers.push('}')
        else if (closers.length && ch === closers[closers.length - 1]) closers.pop()
    }
    parts.push(input.slice(start))
    return parts
}

/** `CSS.escape` (như Tailwind dùng cho tên class). */
export const escapeClassName = (value: string): string => {
    const text = String(value)
    let out = ''
    const first = text.charCodeAt(0)
    if (text.length === 1 && first === 45) return '\\' + text
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i)
        if (code === 0) out += '�'
        else if ((code >= 1 && code <= 31) || code === 127 || (i === 0 && code >= 48 && code <= 57) || (i === 1 && code >= 48 && code <= 57 && first === 45)) out += '\\' + code.toString(16) + ' '
        else if (code >= 128 || code === 45 || code === 95 || (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) out += text.charAt(i)
        else out += '\\' + text.charAt(i)
    }
    return out
}

/** Bỏ ký tự thoát CSS (`0\.5` -> `0.5`). */
const unescapeCss = (value: string): string =>
    value.replace(/\\(?:([\dA-Fa-f]{1,6})[\t\n\f\r ]?|([\S\s]))/g, (_m, hex: string, ch: string) => {
        if (!hex) return ch
        const code = Number.parseInt(hex, 16)
        return code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? '�' : String.fromCodePoint(code)
    })

/** Độ mờ cho màu như Tailwind: `50` -> `color-mix(in oklab, x 5000%, transparent)` (giữ nguyên hành vi gốc). */
const withAlpha = (value: string, alpha: string | null): string => {
    if (alpha === null) return value
    const n = Number(alpha)
    if (!Number.isNaN(n)) alpha = `${n * 100}%`
    return alpha === '100%' ? value : `color-mix(in oklab, ${value} ${alpha}, transparent)`
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isPositiveInteger = (value: unknown) => {
    const n = Number(value)
    return Number.isInteger(n) && n >= 0 && String(n) === String(value)
}

// ---------------------------------------------------------------------------
// Theme mặc định (compat v3) và bảng màu — cùng dữ liệu `tailwindcss/defaultTheme`, `tailwindcss/colors` 4.3.5
// ---------------------------------------------------------------------------

type BareCandidate = { value: string; fraction: string | null }
type BareFn = (candidate: BareCandidate) => string | undefined
const BARE: Record<string, BareFn> = {
    int: ({ value }) => (isPositiveInteger(value) ? value : undefined),
    pct: ({ value }) => (isPositiveInteger(value) ? `${value}%` : undefined),
    px: ({ value }) => (isPositiveInteger(value) ? `${value}px` : undefined),
    ms: ({ value }) => (isPositiveInteger(value) ? `${value}ms` : undefined),
    deg: ({ value }) => (isPositiveInteger(value) ? `${value}deg` : undefined),
    fraction: ({ fraction }) => {
        if (fraction === null) return undefined
        const [a, b] = segment(fraction, '/')
        return isPositiveInteger(a) && isPositiveInteger(b) ? fraction : undefined
    },
    repeat: ({ value }) => (isPositiveInteger(Number(value)) ? `repeat(${value}, minmax(0, 1fr))` : undefined),
}

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const COLOR_FAMILIES = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'mauve', 'olive', 'mist', 'taupe', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']

/** Biến theme mặc định của Tailwind v4 (theme.css), bung bảng màu nén. */
const DEFAULT_CSS_THEME: Record<string, string> = (() => {
    const out: Record<string, string> = { ...(TW_DATA.theme as Record<string, string>) }
    for (const entry of (TW_DATA.palette as string).split('|').filter(Boolean)) {
        const [family, values] = entry.split(':')
        values.split(',').forEach((value, i) => {
            const [l, c, h] = value.split(' ')
            out[`--color-${family}-${SHADES[i]}`] = `oklch(${l}% ${c} ${h})`
        })
    }
    return out
})()
// Khối `@theme default inline reference` (đã lỗi thời) cuối theme.css.
const DEPRECATED_THEME_KEYS = new Set(['--blur', '--shadow', '--shadow-inner', '--drop-shadow', '--radius', '--max-width-prose'])

/** `tailwindcss/colors` (v4: màu oklch). */
export const TAILWIND_COLORS: Json = (() => {
    const out: Json = { inherit: 'inherit', current: 'currentcolor', transparent: 'transparent', black: '#000', white: '#fff' }
    for (const family of COLOR_FAMILIES) out[family] = Object.fromEntries(SHADES.map((shade) => [shade, DEFAULT_CSS_THEME[`--color-${family}-${shade}`]]))
    return out
})()

// Mỗi khoá: object tĩnh, hoặc [phần tĩnh, khoá theme được trải vào, kiểu giá trị trần].
// Sinh một lần từ `require('tailwindcss/defaultTheme')` 4.3.5 (MIT); `colors` dựng từ bảng màu ở trên.
type ThemeEntry = Json | [Json, string[], string | null] | string
const DEFAULT_THEME_DATA: Record<string, ThemeEntry> = {
    accentColor: [{},["colors"],null],
    animation: {"none":"none","spin":"spin 1s linear infinite","ping":"ping 1s cubic-bezier(0, 0, 0.2, 1) infinite","pulse":"pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite","bounce":"bounce 1s infinite"},
    aria: {"busy":"busy=\"true\"","checked":"checked=\"true\"","disabled":"disabled=\"true\"","expanded":"expanded=\"true\"","hidden":"hidden=\"true\"","pressed":"pressed=\"true\"","readonly":"readonly=\"true\"","required":"required=\"true\"","selected":"selected=\"true\""},
    aspectRatio: [{"auto":"auto","square":"1 / 1","video":"16 / 9"},[],"fraction"],
    backdropBlur: [{},["blur"],null],
    backdropBrightness: [{},["brightness"],"pct"],
    backdropContrast: [{},["contrast"],"pct"],
    backdropGrayscale: [{},["grayscale"],"pct"],
    backdropHueRotate: [{},["hueRotate"],"deg"],
    backdropInvert: [{},["invert"],"pct"],
    backdropOpacity: [{},["opacity"],"pct"],
    backdropSaturate: [{},["saturate"],"pct"],
    backdropSepia: [{},["sepia"],"pct"],
    backgroundColor: [{},["colors"],null],
    backgroundImage: {"none":"none","gradient-to-t":"linear-gradient(to top, var(--tw-gradient-stops))","gradient-to-tr":"linear-gradient(to top right, var(--tw-gradient-stops))","gradient-to-r":"linear-gradient(to right, var(--tw-gradient-stops))","gradient-to-br":"linear-gradient(to bottom right, var(--tw-gradient-stops))","gradient-to-b":"linear-gradient(to bottom, var(--tw-gradient-stops))","gradient-to-bl":"linear-gradient(to bottom left, var(--tw-gradient-stops))","gradient-to-l":"linear-gradient(to left, var(--tw-gradient-stops))","gradient-to-tl":"linear-gradient(to top left, var(--tw-gradient-stops))"},
    backgroundOpacity: [{},["opacity"],null],
    backgroundPosition: {"bottom":"bottom","center":"center","left":"left","left-bottom":"left bottom","left-top":"left top","right":"right","right-bottom":"right bottom","right-top":"right top","top":"top"},
    backgroundSize: {"auto":"auto","cover":"cover","contain":"contain"},
    blur: {"0":"0","none":"","sm":"4px","DEFAULT":"8px","md":"12px","lg":"16px","xl":"24px","2xl":"40px","3xl":"64px"},
    borderColor: [{"DEFAULT":"currentcolor"},["colors"],null],
    borderOpacity: [{},["opacity"],null],
    borderRadius: {"none":"0px","sm":"0.125rem","DEFAULT":"0.25rem","md":"0.375rem","lg":"0.5rem","xl":"0.75rem","2xl":"1rem","3xl":"1.5rem","full":"9999px"},
    borderSpacing: [{},["spacing"],null],
    borderWidth: [{"0":"0px","2":"2px","4":"4px","8":"8px","DEFAULT":"1px"},[],"px"],
    boxShadow: {"sm":"0 1px 2px 0 rgb(0 0 0 / 0.05)","DEFAULT":"0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)","md":"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)","lg":"0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)","xl":"0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)","2xl":"0 25px 50px -12px rgb(0 0 0 / 0.25)","inner":"inset 0 2px 4px 0 rgb(0 0 0 / 0.05)","none":"none"},
    boxShadowColor: [{},["colors"],null],
    brightness: [{"0":"0","50":".5","75":".75","90":".9","95":".95","100":"1","105":"1.05","110":"1.1","125":"1.25","150":"1.5","200":"2"},[],"pct"],
    caretColor: [{},["colors"],null],
    colors: "COLORS",
    columns: [{"1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","10":"10","11":"11","12":"12","auto":"auto","3xs":"16rem","2xs":"18rem","xs":"20rem","sm":"24rem","md":"28rem","lg":"32rem","xl":"36rem","2xl":"42rem","3xl":"48rem","4xl":"56rem","5xl":"64rem","6xl":"72rem","7xl":"80rem"},[],"int"],
    container: {},
    content: {"none":"none"},
    contrast: [{"0":"0","50":".5","75":".75","100":"1","125":"1.25","150":"1.5","200":"2"},[],"pct"],
    cursor: {"auto":"auto","default":"default","pointer":"pointer","wait":"wait","text":"text","move":"move","help":"help","not-allowed":"not-allowed","none":"none","context-menu":"context-menu","progress":"progress","cell":"cell","crosshair":"crosshair","vertical-text":"vertical-text","alias":"alias","copy":"copy","no-drop":"no-drop","grab":"grab","grabbing":"grabbing","all-scroll":"all-scroll","col-resize":"col-resize","row-resize":"row-resize","n-resize":"n-resize","e-resize":"e-resize","s-resize":"s-resize","w-resize":"w-resize","ne-resize":"ne-resize","nw-resize":"nw-resize","se-resize":"se-resize","sw-resize":"sw-resize","ew-resize":"ew-resize","ns-resize":"ns-resize","nesw-resize":"nesw-resize","nwse-resize":"nwse-resize","zoom-in":"zoom-in","zoom-out":"zoom-out"},
    divideColor: [{},["borderColor"],null],
    divideOpacity: [{},["borderOpacity"],null],
    divideWidth: [{},["borderWidth"],"px"],
    dropShadow: {"sm":"0 1px 1px rgb(0 0 0 / 0.05)","DEFAULT":["0 1px 2px rgb(0 0 0 / 0.1)","0 1px 1px rgb(0 0 0 / 0.06)"],"md":["0 4px 3px rgb(0 0 0 / 0.07)","0 2px 2px rgb(0 0 0 / 0.06)"],"lg":["0 10px 8px rgb(0 0 0 / 0.04)","0 4px 3px rgb(0 0 0 / 0.1)"],"xl":["0 20px 13px rgb(0 0 0 / 0.03)","0 8px 5px rgb(0 0 0 / 0.08)"],"2xl":"0 25px 25px rgb(0 0 0 / 0.15)","none":"0 0 #0000"},
    fill: [{},["colors"],null],
    flex: {"1":"1 1 0%","auto":"1 1 auto","initial":"0 1 auto","none":"none"},
    flexBasis: [{"auto":"auto","1/2":"50%","1/3":"33.333333%","2/3":"66.666667%","1/4":"25%","2/4":"50%","3/4":"75%","1/5":"20%","2/5":"40%","3/5":"60%","4/5":"80%","1/6":"16.666667%","2/6":"33.333333%","3/6":"50%","4/6":"66.666667%","5/6":"83.333333%","1/12":"8.333333%","2/12":"16.666667%","3/12":"25%","4/12":"33.333333%","5/12":"41.666667%","6/12":"50%","7/12":"58.333333%","8/12":"66.666667%","9/12":"75%","10/12":"83.333333%","11/12":"91.666667%","full":"100%"},["spacing"],null],
    flexGrow: [{"0":"0","DEFAULT":"1"},[],"int"],
    flexShrink: [{"0":"0","DEFAULT":"1"},[],"int"],
    fontFamily: {"sans":["-apple-system","BlinkMacSystemFont","\"Segoe UI\"","Roboto","\"Helvetica Neue\"","\"Noto Sans\"","Arial","sans-serif","\"Apple Color Emoji\"","\"Segoe UI Emoji\"","\"Segoe UI Symbol\"","\"Noto Color Emoji\""],"serif":["ui-serif","Georgia","Cambria","\"Times New Roman\"","Times","serif"],"mono":["ui-monospace","SFMono-Regular","Menlo","Monaco","Consolas","\"Liberation Mono\"","\"Courier New\"","monospace"]},
    fontSize: {"xs":["0.75rem",{"lineHeight":"1rem"}],"sm":["0.875rem",{"lineHeight":"1.25rem"}],"base":["1rem",{"lineHeight":"1.5rem"}],"lg":["1.125rem",{"lineHeight":"1.75rem"}],"xl":["1.25rem",{"lineHeight":"1.75rem"}],"2xl":["1.5rem",{"lineHeight":"2rem"}],"3xl":["1.875rem",{"lineHeight":"2.25rem"}],"4xl":["2.25rem",{"lineHeight":"2.5rem"}],"5xl":["3rem",{"lineHeight":"1"}],"6xl":["3.75rem",{"lineHeight":"1"}],"7xl":["4.5rem",{"lineHeight":"1"}],"8xl":["6rem",{"lineHeight":"1"}],"9xl":["8rem",{"lineHeight":"1"}]},
    fontWeight: {"thin":"100","extralight":"200","light":"300","normal":"400","medium":"500","semibold":"600","bold":"700","extrabold":"800","black":"900"},
    gap: [{},["spacing"],null],
    gradientColorStops: [{},["colors"],null],
    gradientColorStopPositions: [{"0%":"0%","5%":"5%","10%":"10%","15%":"15%","20%":"20%","25%":"25%","30%":"30%","35%":"35%","40%":"40%","45%":"45%","50%":"50%","55%":"55%","60%":"60%","65%":"65%","70%":"70%","75%":"75%","80%":"80%","85%":"85%","90%":"90%","95%":"95%","100%":"100%"},[],"pct"],
    grayscale: [{"0":"0","DEFAULT":"100%"},[],"pct"],
    gridAutoColumns: {"auto":"auto","min":"min-content","max":"max-content","fr":"minmax(0, 1fr)"},
    gridAutoRows: {"auto":"auto","min":"min-content","max":"max-content","fr":"minmax(0, 1fr)"},
    gridColumn: {"auto":"auto","span-1":"span 1 / span 1","span-2":"span 2 / span 2","span-3":"span 3 / span 3","span-4":"span 4 / span 4","span-5":"span 5 / span 5","span-6":"span 6 / span 6","span-7":"span 7 / span 7","span-8":"span 8 / span 8","span-9":"span 9 / span 9","span-10":"span 10 / span 10","span-11":"span 11 / span 11","span-12":"span 12 / span 12","span-full":"1 / -1"},
    gridColumnEnd: [{"1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","10":"10","11":"11","12":"12","13":"13","auto":"auto"},[],"int"],
    gridColumnStart: [{"1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","10":"10","11":"11","12":"12","13":"13","auto":"auto"},[],"int"],
    gridRow: {"auto":"auto","span-1":"span 1 / span 1","span-2":"span 2 / span 2","span-3":"span 3 / span 3","span-4":"span 4 / span 4","span-5":"span 5 / span 5","span-6":"span 6 / span 6","span-7":"span 7 / span 7","span-8":"span 8 / span 8","span-9":"span 9 / span 9","span-10":"span 10 / span 10","span-11":"span 11 / span 11","span-12":"span 12 / span 12","span-full":"1 / -1"},
    gridRowEnd: [{"1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","10":"10","11":"11","12":"12","13":"13","auto":"auto"},[],"int"],
    gridRowStart: [{"1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","10":"10","11":"11","12":"12","13":"13","auto":"auto"},[],"int"],
    gridTemplateColumns: [{"1":"repeat(1, minmax(0, 1fr))","2":"repeat(2, minmax(0, 1fr))","3":"repeat(3, minmax(0, 1fr))","4":"repeat(4, minmax(0, 1fr))","5":"repeat(5, minmax(0, 1fr))","6":"repeat(6, minmax(0, 1fr))","7":"repeat(7, minmax(0, 1fr))","8":"repeat(8, minmax(0, 1fr))","9":"repeat(9, minmax(0, 1fr))","10":"repeat(10, minmax(0, 1fr))","11":"repeat(11, minmax(0, 1fr))","12":"repeat(12, minmax(0, 1fr))","none":"none","subgrid":"subgrid"},[],"repeat"],
    gridTemplateRows: [{"1":"repeat(1, minmax(0, 1fr))","2":"repeat(2, minmax(0, 1fr))","3":"repeat(3, minmax(0, 1fr))","4":"repeat(4, minmax(0, 1fr))","5":"repeat(5, minmax(0, 1fr))","6":"repeat(6, minmax(0, 1fr))","7":"repeat(7, minmax(0, 1fr))","8":"repeat(8, minmax(0, 1fr))","9":"repeat(9, minmax(0, 1fr))","10":"repeat(10, minmax(0, 1fr))","11":"repeat(11, minmax(0, 1fr))","12":"repeat(12, minmax(0, 1fr))","none":"none","subgrid":"subgrid"},[],"repeat"],
    height: [{"auto":"auto","1/2":"50%","1/3":"33.333333%","2/3":"66.666667%","1/4":"25%","2/4":"50%","3/4":"75%","1/5":"20%","2/5":"40%","3/5":"60%","4/5":"80%","1/6":"16.666667%","2/6":"33.333333%","3/6":"50%","4/6":"66.666667%","5/6":"83.333333%","full":"100%","screen":"100vh","svh":"100svh","lvh":"100lvh","dvh":"100dvh","min":"min-content","max":"max-content","fit":"fit-content"},["spacing"],null],
    hueRotate: [{"0":"0deg","15":"15deg","30":"30deg","60":"60deg","90":"90deg","180":"180deg"},[],"deg"],
    inset: [{"auto":"auto","1/2":"50%","1/3":"33.333333%","2/3":"66.666667%","1/4":"25%","2/4":"50%","3/4":"75%","full":"100%"},["spacing"],null],
    invert: [{"0":"0","DEFAULT":"100%"},[],"pct"],
    keyframes: {"spin":{"to":{"transform":"rotate(360deg)"}},"ping":{"75%, 100%":{"transform":"scale(2)","opacity":"0"}},"pulse":{"50%":{"opacity":".5"}},"bounce":{"0%, 100%":{"transform":"translateY(-25%)","animationTimingFunction":"cubic-bezier(0.8,0,1,1)"},"50%":{"transform":"none","animationTimingFunction":"cubic-bezier(0,0,0.2,1)"}}},
    letterSpacing: {"tighter":"-0.05em","tight":"-0.025em","normal":"0em","wide":"0.025em","wider":"0.05em","widest":"0.1em"},
    lineHeight: {"3":".75rem","4":"1rem","5":"1.25rem","6":"1.5rem","7":"1.75rem","8":"2rem","9":"2.25rem","10":"2.5rem","none":"1","tight":"1.25","snug":"1.375","normal":"1.5","relaxed":"1.625","loose":"2"},
    listStyleType: {"none":"none","disc":"disc","decimal":"decimal"},
    listStyleImage: {"none":"none"},
    margin: [{"auto":"auto"},["spacing"],null],
    lineClamp: [{"1":"1","2":"2","3":"3","4":"4","5":"5","6":"6"},[],"int"],
    maxHeight: [{"none":"none","full":"100%","screen":"100vh","svh":"100svh","lvh":"100lvh","dvh":"100dvh","min":"min-content","max":"max-content","fit":"fit-content"},["spacing"],null],
    maxWidth: [{"none":"none","xs":"20rem","sm":"24rem","md":"28rem","lg":"32rem","xl":"36rem","2xl":"42rem","3xl":"48rem","4xl":"56rem","5xl":"64rem","6xl":"72rem","7xl":"80rem","full":"100%","min":"min-content","max":"max-content","fit":"fit-content","prose":"65ch"},["spacing"],null],
    minHeight: [{"full":"100%","screen":"100vh","svh":"100svh","lvh":"100lvh","dvh":"100dvh","min":"min-content","max":"max-content","fit":"fit-content"},["spacing"],null],
    minWidth: [{"full":"100%","min":"min-content","max":"max-content","fit":"fit-content"},["spacing"],null],
    objectPosition: {"bottom":"bottom","center":"center","left":"left","left-bottom":"left bottom","left-top":"left top","right":"right","right-bottom":"right bottom","right-top":"right top","top":"top"},
    opacity: [{"0":"0","5":"0.05","10":"0.1","15":"0.15","20":"0.2","25":"0.25","30":"0.3","35":"0.35","40":"0.4","45":"0.45","50":"0.5","55":"0.55","60":"0.6","65":"0.65","70":"0.7","75":"0.75","80":"0.8","85":"0.85","90":"0.9","95":"0.95","100":"1"},[],"pct"],
    order: [{"1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","10":"10","11":"11","12":"12","first":"-9999","last":"9999","none":"0"},[],"int"],
    outlineColor: [{},["colors"],null],
    outlineOffset: [{"0":"0px","1":"1px","2":"2px","4":"4px","8":"8px"},[],"px"],
    outlineWidth: [{"0":"0px","1":"1px","2":"2px","4":"4px","8":"8px"},[],"px"],
    padding: [{},["spacing"],null],
    placeholderColor: [{},["colors"],null],
    placeholderOpacity: [{},["opacity"],null],
    ringColor: [{"DEFAULT":"currentcolor"},["colors"],null],
    ringOffsetColor: [{},["colors"],null],
    ringOffsetWidth: [{"0":"0px","1":"1px","2":"2px","4":"4px","8":"8px"},[],"px"],
    ringOpacity: [{"DEFAULT":"0.5"},["opacity"],null],
    ringWidth: [{"0":"0px","1":"1px","2":"2px","4":"4px","8":"8px","DEFAULT":"3px"},[],"px"],
    rotate: [{"0":"0deg","1":"1deg","2":"2deg","3":"3deg","6":"6deg","12":"12deg","45":"45deg","90":"90deg","180":"180deg"},[],"deg"],
    saturate: [{"0":"0","50":".5","100":"1","150":"1.5","200":"2"},[],"pct"],
    scale: [{"0":"0","50":".5","75":".75","90":".9","95":".95","100":"1","105":"1.05","110":"1.1","125":"1.25","150":"1.5"},[],"pct"],
    screens: {"sm":"40rem","md":"48rem","lg":"64rem","xl":"80rem","2xl":"96rem"},
    scrollMargin: [{},["spacing"],null],
    scrollPadding: [{},["spacing"],null],
    sepia: [{"0":"0","DEFAULT":"100%"},[],"pct"],
    skew: [{"0":"0deg","1":"1deg","2":"2deg","3":"3deg","6":"6deg","12":"12deg"},[],"deg"],
    space: [{},["spacing"],null],
    spacing: {"0":"0px","1":"0.25rem","2":"0.5rem","3":"0.75rem","4":"1rem","5":"1.25rem","6":"1.5rem","7":"1.75rem","8":"2rem","9":"2.25rem","10":"2.5rem","11":"2.75rem","12":"3rem","14":"3.5rem","16":"4rem","20":"5rem","24":"6rem","28":"7rem","32":"8rem","36":"9rem","40":"10rem","44":"11rem","48":"12rem","52":"13rem","56":"14rem","60":"15rem","64":"16rem","72":"18rem","80":"20rem","96":"24rem","px":"1px","0.5":"0.125rem","1.5":"0.375rem","2.5":"0.625rem","3.5":"0.875rem"},
    stroke: [{"none":"none"},["colors"],null],
    strokeWidth: [{"0":"0","1":"1","2":"2"},[],"int"],
    supports: {},
    data: {},
    textColor: [{},["colors"],null],
    textDecorationColor: [{},["colors"],null],
    textDecorationThickness: [{"0":"0px","1":"1px","2":"2px","4":"4px","8":"8px","auto":"auto","from-font":"from-font"},[],"px"],
    textIndent: [{},["spacing"],null],
    textOpacity: [{},["opacity"],null],
    textUnderlineOffset: [{"0":"0px","1":"1px","2":"2px","4":"4px","8":"8px","auto":"auto"},[],"px"],
    transformOrigin: {"center":"center","top":"top","top-right":"top right","right":"right","bottom-right":"bottom right","bottom":"bottom","bottom-left":"bottom left","left":"left","top-left":"top left"},
    transitionDelay: [{"0":"0s","75":"75ms","100":"100ms","150":"150ms","200":"200ms","300":"300ms","500":"500ms","700":"700ms","1000":"1000ms"},[],"ms"],
    transitionDuration: [{"0":"0s","75":"75ms","100":"100ms","150":"150ms","200":"200ms","300":"300ms","500":"500ms","700":"700ms","1000":"1000ms","DEFAULT":"150ms"},[],"ms"],
    transitionProperty: {"none":"none","all":"all","DEFAULT":"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter","colors":"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke","opacity":"opacity","shadow":"box-shadow","transform":"transform"},
    transitionTimingFunction: {"DEFAULT":"cubic-bezier(0.4, 0, 0.2, 1)","linear":"linear","in":"cubic-bezier(0.4, 0, 1, 1)","out":"cubic-bezier(0, 0, 0.2, 1)","in-out":"cubic-bezier(0.4, 0, 0.2, 1)"},
    translate: [{"1/2":"50%","1/3":"33.333333%","2/3":"66.666667%","1/4":"25%","2/4":"50%","3/4":"75%","full":"100%"},["spacing"],null],
    size: [{"auto":"auto","1/2":"50%","1/3":"33.333333%","2/3":"66.666667%","1/4":"25%","2/4":"50%","3/4":"75%","1/5":"20%","2/5":"40%","3/5":"60%","4/5":"80%","1/6":"16.666667%","2/6":"33.333333%","3/6":"50%","4/6":"66.666667%","5/6":"83.333333%","1/12":"8.333333%","2/12":"16.666667%","3/12":"25%","4/12":"33.333333%","5/12":"41.666667%","6/12":"50%","7/12":"58.333333%","8/12":"66.666667%","9/12":"75%","10/12":"83.333333%","11/12":"91.666667%","full":"100%","min":"min-content","max":"max-content","fit":"fit-content"},["spacing"],null],
    width: [{"auto":"auto","1/2":"50%","1/3":"33.333333%","2/3":"66.666667%","1/4":"25%","2/4":"50%","3/4":"75%","1/5":"20%","2/5":"40%","3/5":"60%","4/5":"80%","1/6":"16.666667%","2/6":"33.333333%","3/6":"50%","4/6":"66.666667%","5/6":"83.333333%","1/12":"8.333333%","2/12":"16.666667%","3/12":"25%","4/12":"33.333333%","5/12":"41.666667%","6/12":"50%","7/12":"58.333333%","8/12":"66.666667%","9/12":"75%","10/12":"83.333333%","11/12":"91.666667%","full":"100%","screen":"100vw","svw":"100svw","lvw":"100lvw","dvw":"100dvw","min":"min-content","max":"max-content","fit":"fit-content"},["spacing"],null],
    willChange: {"auto":"auto","scroll":"scroll-position","contents":"contents","transform":"transform"},
    zIndex: [{"0":"0","10":"10","20":"20","30":"30","40":"40","50":"50","auto":"auto"},[],"int"],
}

/** `tailwindcss/defaultTheme` dựng lại (giá trị phụ thuộc theme là hàm `({ theme }) => ...` như bản gốc). */
export const TAILWIND_DEFAULT_THEME: Json = (() => {
    const out: Json = {}
    for (const [key, entry] of Object.entries(DEFAULT_THEME_DATA)) {
        if (entry === 'COLORS') {
            out[key] = () => ({ ...TAILWIND_COLORS })
            continue
        }
        if (!Array.isArray(entry)) {
            out[key] = entry
            continue
        }
        const [own, refs, bare] = entry as [Json, string[], string | null]
        const bareValue = bare ? { __BARE_VALUE__: BARE[bare] } : {}
        out[key] = refs.length
            ? ({ theme }: { theme: (path: string) => unknown }) => Object.assign({}, own, ...refs.map((ref) => theme(ref)), bareValue)
            : { ...own, ...bareValue }
    }
    return out
})()

/** `tailwindcss/lib/util/flattenColorPalette` (bản v4: bỏ `__CSS_VALUES__`, giữ giá trị CSS không mặc định). */
export const flattenColorPalette = (colors: Json | null | undefined): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(colors ?? {})) {
        if (key === '__CSS_VALUES__') continue
        if (typeof value === 'object' && value !== null) {
            for (const [shade, inner] of Object.entries(flattenColorPalette(value))) out[`${key}${shade === 'DEFAULT' ? '' : `-${shade}`}`] = inner
        } else out[key] = value
    }
    if (colors && '__CSS_VALUES__' in colors) {
        for (const [key, flags] of Object.entries(colors.__CSS_VALUES__ as Json)) if ((Number(flags) & 4) === 0) out[key] = colors[key]
    }
    return out
}

/** `tailwindcss/plugin`: `plugin(handler, config)` và `plugin.withOptions(fn, configFn)`. */
export const createPlugin = Object.assign(
    (handler: (api: TailwindPluginApi) => void, config?: Json) => ({ handler, config }),
    {
        withOptions: (pluginFn: (options: any) => (api: TailwindPluginApi) => void, configFn: (options: any) => Json = () => ({})) => {
            const optionsFn = (options: any) => ({ handler: pluginFn(options), config: configFn(options) })
            return Object.assign(optionsFn, { __isOptionsFunction: true as const })
        },
    },
)

// ---------------------------------------------------------------------------
// Theme CSS (bản sao lớp Theme của Tailwind: giá trị + cờ default/inline/reference)
// ---------------------------------------------------------------------------

const THEME_DEFAULT = 4
// Namespace con không bị xoá khi xoá namespace cha (`--font-*: initial` giữ `--font-weight-*`).
const SUB_NAMESPACES: Record<string, string[]> = {
    '--font': ['--font-weight', '--font-size'],
    '--inset': ['--inset-shadow', '--inset-ring'],
    '--text': ['--text-color', '--text-decoration-color', '--text-decoration-thickness', '--text-indent', '--text-shadow', '--text-underline-offset'],
    '--grid-column': ['--grid-column-start', '--grid-column-end'],
    '--grid-row': ['--grid-row-start', '--grid-row-end'],
}

class CssTheme {
    values = new Map<string, { value: string; options: number }>()
    add(key: string, value: string, options = 0) {
        if (key.endsWith('-*')) {
            if (value !== 'initial') return
            if (key === '--*') this.values.clear()
            else this.clearNamespace(key.slice(0, -2))
            return
        }
        if (options & THEME_DEFAULT) {
            const existing = this.values.get(key)
            if (existing && !(existing.options & THEME_DEFAULT)) return
        }
        if (value === 'initial') this.values.delete(key)
        else this.values.set(key, { value, options })
    }
    clearNamespace(ns: string) {
        const keep = SUB_NAMESPACES[ns] ?? []
        for (const key of [...this.values.keys()]) if (key.startsWith(ns) && !keep.some((sub) => key.startsWith(sub))) this.values.delete(key)
    }
    get(keys: string[]): string | null {
        for (const key of keys) {
            const entry = this.values.get(key)
            if (entry) return entry.value
        }
        return null
    }
    getOptions(key: string): number {
        return this.values.get(unescapeCss(key))?.options ?? 0
    }
    namespace(ns: string): Map<string | null, string> {
        const out = new Map<string | null, string>()
        const prefix = `${ns}-`
        for (const [key, { value }] of this.values) {
            if (key === ns) out.set(null, value)
            else if (key.startsWith(`${prefix}-`)) out.set(key.slice(ns.length), value)
            else if (key.startsWith(prefix)) out.set(key.slice(prefix.length), value)
        }
        return out
    }
}

/** Theme CSS mà plugin nhìn thấy: theme mặc định v4 + biến `@theme` của dự án (`--color-*: initial` xoá namespace). */
const buildCssTheme = (projectTheme: Record<string, string> = {}): CssTheme => {
    const theme = new CssTheme()
    for (const [key, value] of Object.entries(DEFAULT_CSS_THEME)) theme.add(key, value, DEPRECATED_THEME_KEYS.has(key) ? 7 : THEME_DEFAULT)
    for (const [key, value] of Object.entries(projectTheme)) theme.add(key, value, 0)
    return theme
}

// ---------------------------------------------------------------------------
// theme(): bản sao `createThemeFn` của Tailwind 4.3.5
// ---------------------------------------------------------------------------

/** `colors.red.500`, `spacing[2.5]` -> danh sách khoá. */
const toKeyPath = (path: string): string[] => {
    const out: string[] = []
    for (const part of segment(path, '.')) {
        if (!part.includes('[')) {
            out.push(part)
            continue
        }
        let current = 0
        for (;;) {
            const open = part.indexOf('[', current)
            const close = part.indexOf(']', open)
            if (open === -1 || close === -1) break
            if (open > current) out.push(part.slice(current, open))
            out.push(part.slice(open + 1, close))
            current = close + 1
        }
        if (current <= part.length - 1) out.push(part.slice(current))
    }
    return out
}

const LEGACY_DEFAULT_KEYS: Record<string, string> = { borderWidth: 'border-width', outlineWidth: 'outline-width', ringColor: 'ring-color', ringWidth: 'ring-width', transitionDuration: 'transition-duration', transitionTimingFunction: 'transition-timing-function' }
const KEY_NAMESPACES: Record<string, string> = { animation: 'animate', aspectRatio: 'aspect', borderRadius: 'radius', boxShadow: 'shadow', colors: 'color', containers: 'container', fontFamily: 'font', fontSize: 'text', letterSpacing: 'tracking', lineHeight: 'leading', maxWidth: 'container', screens: 'breakpoint', transitionTimingFunction: 'ease' }
const VALID_KEY = /^[a-zA-Z0-9-_%/.]+$/

/** Đường khoá theme v3 -> tên biến CSS v4 (không có `--`). */
const keyPathToCssProperty = (path: string[]): string | null => {
    const legacy = LEGACY_DEFAULT_KEYS[path[0]]
    if (legacy && path[1] === 'DEFAULT') return `default-${legacy}`
    if (path[0] === 'container') return null
    for (const part of path) if (!VALID_KEY.test(part)) return null
    const ns = KEY_NAMESPACES[path[0]]
    if (ns) {
        path = path.slice()
        path[0] = ns
    }
    return path
        .map((part, i, all) => (part === '1' && i !== all.length - 1 ? '' : part))
        .map((part, i) => {
            part = part.replaceAll('.', '_')
            if (i === 0 || part.startsWith('-') || part === 'lineHeight') part = part.replace(/([a-z])([A-Z])/g, (_m, a: string, b: string) => `${a}-${b.toLowerCase()}`)
            return part
        })
        .filter((part, i) => part !== 'DEFAULT' || i !== path.length - 1)
        .join('-')
}

/** Đọc theme CSS theo đường khoá: [giá trị (chuỗi/object/[giá trị, phụ]), cờ]. */
const readFromCss = (theme: CssTheme, path: string[]): [any, any] => {
    if (path.length === 1 && path[0].startsWith('--')) return [theme.get([path[0]]), theme.getOptions(path[0])]
    const name = keyPathToCssProperty(path)
    const values = new Map<string | null, any>()
    const nested = new Map<string | null, Map<string, [string, number]>>()
    const ns = theme.namespace(`--${name}`)
    if (ns.size === 0) return [null, 0]
    const options = new Map<string | null, any>()
    for (const [key, value] of ns) {
        if (!key || !key.includes('--')) {
            values.set(key, value)
            options.set(key, theme.getOptions(key ? `--${name}-${key}` : `--${name}`))
            continue
        }
        const at = key.indexOf('--')
        const base = key.slice(0, at)
        const sub = key.slice(at + 2).replace(/-([a-z])/g, (_m, ch: string) => ch.toUpperCase())
        const group = nested.get(base === '' ? null : base) ?? new Map()
        nested.set(base === '' ? null : base, group)
        // (Tailwind ghép `--${name}${key}` không có `-`: cờ luôn là 0 — giữ nguyên hành vi.)
        group.set(sub, [value, theme.getOptions(`--${name}${key}`)])
    }
    const baseOptions = theme.getOptions(`--${name}`)
    for (const [base, group] of nested) {
        const value = values.get(base)
        if (typeof value !== 'string') continue
        const extra: Json = {}
        const extraOptions: Json = {}
        for (const [sub, [v, o]] of group) {
            extra[sub] = v
            extraOptions[sub] = o
        }
        values.set(base, [value, extra])
        options.set(base, [baseOptions, extraOptions])
    }
    const result: Json = {}
    const flags: Json = {}
    for (const [key, value] of values) result[key ?? 'DEFAULT'] = value
    for (const [key, value] of options) flags[key ?? 'DEFAULT'] = value
    if (path[path.length - 1] === 'DEFAULT') return [result.DEFAULT ?? null, flags.DEFAULT ?? 0]
    if (path.length > 1 && 'DEFAULT' in result && Object.keys(result).length === 1) return [result.DEFAULT, flags.DEFAULT ?? 0]
    result.__CSS_VALUES__ = flags
    return [result, flags]
}

/** Lấy theo đường khoá; khoá thiếu thì ghép với khoá sau (`['red', '500']` -> `red-500`). Sửa `path` tại chỗ như Tailwind. */
const getPath = (obj: unknown, path: string[]): unknown => {
    for (let i = 0; i < path.length; ++i) {
        const key = path[i]
        if (obj === null || obj === undefined || typeof obj !== 'object' || !Object.hasOwn(obj, key)) {
            if (path[i + 1] === undefined) return undefined
            path[i + 1] = `${key}-${path[i + 1]}`
            continue
        }
        obj = (obj as Json)[key]
    }
    return obj
}

const deepMerge = (target: Json, sources: unknown[], customizer: (a: unknown, b: unknown) => unknown): Json => {
    for (const source of sources) {
        if (source === null || source === undefined) continue
        for (const key of Reflect.ownKeys(source as object) as string[]) {
            const merged = customizer(target[key], (source as Json)[key])
            if (merged !== undefined) target[key] = merged
            else if (!isPlainObject(target[key]) || !isPlainObject((source as Json)[key])) target[key] = (source as Json)[key]
            else target[key] = deepMerge({}, [target[key], (source as Json)[key]], customizer)
        }
    }
    return target
}

const mergeThemeArrays = (a: unknown, b: unknown): unknown => {
    if (Array.isArray(a) && isPlainObject(a[0])) return a.concat(b)
    if (Array.isArray(b) && isPlainObject(b[0]) && isPlainObject(a)) return [a, ...b]
    if (Array.isArray(b)) return b
    return undefined
}

type ThemeFn = (path: string, defaultValue?: unknown) => any

const createThemeFn = (css: CssTheme, configTheme: () => Json, resolveValue: (value: unknown) => unknown): ThemeFn => (rawPath, defaultValue) => {
    let path = rawPath
    let alpha: string | null = null
    const slash = path.lastIndexOf('/')
    if (slash !== -1) {
        alpha = path.slice(slash + 1).trim()
        path = path.slice(0, slash).trim()
    }
    const value = (() => {
        const keyPath = toKeyPath(path)
        let [cssValue, cssOptions] = readFromCss(css, keyPath)
        let configValue = resolveValue(getPath(configTheme() ?? {}, keyPath) ?? null) as any
        if (typeof configValue === 'string') configValue = configValue.replace('<alpha-value>', '1')
        if (typeof cssValue !== 'object') return typeof cssOptions !== 'object' && cssOptions & THEME_DEFAULT ? configValue ?? cssValue : cssValue
        if (configValue !== null && typeof configValue === 'object' && !Array.isArray(configValue)) {
            const merged = deepMerge({}, [configValue], (_a, b) => b)
            if (cssValue === null && Object.hasOwn(configValue, '__CSS_VALUES__')) {
                const own: Json = {}
                for (const key in configValue.__CSS_VALUES__) {
                    own[key] = configValue[key]
                    delete merged[key]
                }
                cssValue = own
            }
            for (const key in cssValue) {
                if (key === '__CSS_VALUES__') continue
                if (configValue?.__CSS_VALUES__?.[key] & THEME_DEFAULT && getPath(merged, key.split('-')) !== undefined) continue
                merged[unescapeCss(key)] = cssValue[key]
            }
            return merged
        }
        if (Array.isArray(cssValue) && Array.isArray(cssOptions) && Array.isArray(configValue)) {
            let first = cssValue[0]
            const extra = cssValue[1]
            if (cssOptions[0] & THEME_DEFAULT) first = configValue[0] ?? first
            for (const key of Object.keys(extra)) if (cssOptions[1][key] & THEME_DEFAULT) extra[key] = configValue[1][key] ?? extra[key]
            return [first, extra]
        }
        return keyPath.length > 1 && cssValue !== null && typeof cssValue === 'object' && !Array.isArray(cssValue) && 'DEFAULT' in cssValue ? cssValue.DEFAULT : cssValue ?? configValue
    })()
    const out = alpha && typeof value === 'string' ? withAlpha(value, alpha) : value
    return out ?? defaultValue
}

/** Cấu hình compat mà Tailwind v4 đặt trước mọi cấu hình (theme mặc định v3 + namespace v4). */
const compatConfig = (css: CssTheme): Json => ({
    theme: {
        ...TAILWIND_DEFAULT_THEME,
        colors: ({ theme }: { theme: ThemeFn }) => theme('color', {}),
        extend: {
            fontSize: ({ theme }: { theme: ThemeFn }) => ({ ...theme('text', {}) }),
            boxShadow: ({ theme }: { theme: ThemeFn }) => ({ ...theme('shadow', {}) }),
            animation: ({ theme }: { theme: ThemeFn }) => ({ ...theme('animate', {}) }),
            aspectRatio: ({ theme }: { theme: ThemeFn }) => ({ ...theme('aspect', {}) }),
            borderRadius: ({ theme }: { theme: ThemeFn }) => ({ ...theme('radius', {}) }),
            screens: ({ theme }: { theme: ThemeFn }) => ({ ...theme('breakpoint', {}) }),
            letterSpacing: ({ theme }: { theme: ThemeFn }) => ({ ...theme('tracking', {}) }),
            lineHeight: ({ theme }: { theme: ThemeFn }) => ({ ...theme('leading', {}) }),
            transitionDuration: { DEFAULT: css.get(['--default-transition-duration']) ?? null },
            transitionTimingFunction: { DEFAULT: css.get(['--default-transition-timing-function']) ?? null },
            maxWidth: ({ theme }: { theme: ThemeFn }) => ({ ...theme('container', {}) }),
        },
    },
})

/** Gộp theme của các cấu hình (`theme` thay, `extend` bổ sung, hàm được giải lần lượt) như Tailwind. */
const resolveConfigTheme = (css: CssTheme, configs: Json[]): Json => {
    const theme: Json = {}
    const extend: Record<string, unknown[]> = {}
    const themeFn = createThemeFn(css, () => theme, (value) => resolveValue(value))
    const helpers = Object.assign(themeFn, { theme: themeFn, colors: TAILWIND_COLORS })
    function resolveValue(value: unknown): unknown {
        return typeof value === 'function' ? value(helpers) ?? null : value ?? null
    }
    for (const config of configs) {
        const own = (config?.theme ?? {}) as Json
        const ext = (own.extend ?? {}) as Json
        Object.assign(theme, own)
        for (const key in ext) (extend[key] ??= []).push(ext[key])
    }
    delete theme.extend
    for (const key in extend) {
        const layers = [theme[key], ...extend[key]]
        theme[key] = () => deepMerge({}, layers.map(resolveValue), mergeThemeArrays)
    }
    for (const key in theme) theme[key] = resolveValue(theme[key])
    if (theme.screens && typeof theme.screens === 'object') {
        for (const key of Object.keys(theme.screens)) {
            const screen = theme.screens[key]
            if (screen && typeof screen === 'object' && !('raw' in screen) && !('max' in screen) && 'min' in screen) theme.screens[key] = screen.min
        }
    }
    return theme
}

// ---------------------------------------------------------------------------
// CSS-in-JS -> cây CSS -> văn bản
// ---------------------------------------------------------------------------

type CssNode = { kind: 'decl'; prop: string; value: string } | { kind: 'rule'; selector: string; nodes: CssNode[] } | { kind: 'at'; name: string; nodes: CssNode[] | null }

// `'@apply px-4 py-2': {}` (CSS-in-JS của plugin): at-rule không thân như Tailwind.
const block = (head: string, nodes: CssNode[]): CssNode => (head.charCodeAt(0) === 64 ? { kind: 'at', name: head, nodes: /^@apply\s/.test(head) && !nodes.length ? null : nodes } : { kind: 'rule', selector: head, nodes })

/** Object CSS-in-JS -> cây CSS (bản sao `objectToAst`: camelCase -> kebab, số -> chuỗi, mảng -> nhiều khai báo, `@slot`). */
const objectToAst = (input: unknown): CssNode[] => {
    const out: CssNode[] = []
    const list = Array.isArray(input) ? input : [input]
    for (const [key, value] of list.flatMap((item) => (item && typeof item === 'object' ? Object.entries(item) : []))) {
        if (value === null || value === undefined || value === false) continue
        if (typeof value !== 'object') {
            let prop = key
            if (!prop.startsWith('--')) {
                if (value === '@slot') {
                    out.push(block(prop, [{ kind: 'at', name: '@slot', nodes: null }]))
                    continue
                }
                prop = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
            }
            out.push({ kind: 'decl', prop, value: String(value) })
        } else if (Array.isArray(value)) {
            for (const item of value) out.push(typeof item === 'string' ? { kind: 'decl', prop: key, value: item } : block(key, objectToAst(item)))
        } else out.push(block(key, objectToAst(value)))
    }
    return out
}

const printCss = (nodes: CssNode[]): string =>
    nodes.map((node) => {
        if (node.kind === 'decl') return `${node.prop}: ${node.value};`
        if (node.kind === 'at' && node.nodes === null) return `${node.name};`
        return `${node.kind === 'rule' ? node.selector : node.name} { ${printCss(node.nodes as CssNode[])} }`
    }).join(' ')

const walkNodes = (nodes: CssNode[], fn: (node: CssNode) => void) => {
    for (const node of nodes) {
        fn(node)
        if (node.kind !== 'decl' && node.nodes) walkNodes(node.nodes, fn)
    }
}

// ---------------------------------------------------------------------------
// Selector của addUtilities: tìm `.class` (bỏ qua bên trong :not/:nth-child/:nth-last-child)
// ---------------------------------------------------------------------------

const STANDARD_PROPERTIES = new Set(standardCssProperties())
const VALID_UTILITY = /^[a-z@][a-zA-Z0-9/%._-]*$/
const VALID_VARIANT = /^@?[a-z0-9][a-zA-Z0-9_-]*(?<![_-])$/

/** Các lần xuất hiện `.class` trong selector: [vị trí bắt đầu, vị trí kết thúc, tên]. */
const classOccurrences = (selector: string): Array<[number, number, string]> => {
    const out: Array<[number, number, string]> = []
    const fns: string[] = []
    let bracket = 0
    for (let i = 0; i < selector.length; i++) {
        const ch = selector[i]
        if (ch === '\\') {
            i++
            continue
        }
        if (ch === '"' || ch === "'") {
            while (++i < selector.length && selector[i] !== ch) if (selector[i] === '\\') i++
            continue
        }
        if (ch === '[') bracket++
        else if (ch === ']') bracket--
        else if (bracket > 0) continue
        else if (ch === '(') {
            const name = selector.slice(0, i).match(/:[\w-]*$/)?.[0] ?? ''
            fns.push(name)
        } else if (ch === ')') fns.pop()
        else if (ch === '.') {
            let j = i + 1
            while (j < selector.length && !/[\s.#:[\]()>+~,*]/.test(selector[j])) j += selector[j] === '\\' ? 2 : 1
            const name = selector.slice(i + 1, j)
            if (!fns.some((fn) => fn === ':not' || fn === ':nth-child' || fn === ':nth-last-child') && VALID_UTILITY.test(name)) out.push([i, j, name])
            i = j - 1
        }
    }
    return out
}

// ---------------------------------------------------------------------------
// Kết quả và API giả lập
// ---------------------------------------------------------------------------

export interface TailwindPluginApi {
    addBase(base: Json | Json[]): void
    addUtilities(utilities: Json | Json[], options?: unknown): void
    addComponents(components: Json | Json[], options?: unknown): void
    matchUtilities(utilities: Record<string, (value: any, extra: { modifier: string | null }) => Json | Json[] | null | undefined>, options?: MatchOptions): void
    matchComponents(components: Record<string, (value: any, extra: { modifier: string | null }) => Json | Json[] | null | undefined>, options?: MatchOptions): void
    addVariant(name: string, variant: string | string[] | Json): void
    matchVariant(name: string, fn: (value: any, extra: { modifier: string | null }) => string | string[], options?: { values?: Json; sort?: unknown }): void
    theme: ThemeFn
    config(path?: string, defaultValue?: unknown): any
    prefix(className: string): string
    e(className: string): string
    corePlugins(path?: string): boolean
}

export interface MatchOptions {
    values?: Json
    type?: string | string[]
    supportsNegativeValues?: boolean
    modifiers?: 'any' | Json
}

export interface TailwindPluginOutput {
    /** CSS Tailwind v4 cho `parseTailwindStylesheet`: `@theme`, `@layer base`, `@keyframes`, `@utility`, `@custom-variant`. */
    css: string
    /** Mọi utility (tên -> thân `@utility`), kể cả tên không viết được bằng `@utility` (`x-0.5`, `x-1/2`). */
    utilities: Record<string, string>
    /** Mọi biến thể (tên -> thân dạng khối `{ ... @slot; }`). */
    variants: Record<string, string>
    /** Nhóm thứ tự của từng `matchVariant` (giá trị có tên và tuỳ ý xếp theo `sort`, như Tailwind). */
    variantOrder: Record<string, TailwindVariantOrder>
    /** Tên class tĩnh mà plugin sinh (giống `getClassList` của Tailwind, chưa kể modifier). */
    classes: string[]
    /** Phần chưa chuyển được (mô tả ngắn). */
    unsupported: string[]
}

export interface RunTailwindPluginOptions {
    /** Biến `@theme` của dự án (`--color-brand: ...`), plugin đọc qua `theme()`. */
    theme?: Record<string, string>
    /** Cấu hình JS kiểu v3 của dự án (`tailwind.config.js`): theme cấu hình + `config()`. */
    config?: Json
    /** Tuỳ chọn cho `plugin.withOptions` (`@plugin "x" { ... }`). */
    options?: unknown
}

/** Tên mà `@utility`/`@custom-variant` của `parseTailwindStylesheet` viết được. */
const CSS_UTILITY_NAME = /^-?[\w-]+$/
const CSS_VARIANT_NAME = /^[\w-]+$/

const SENTINEL_VALUE = '__porbit_value__'
// Chỗ giữ giá trị/modifier của biến thể hàm `name-*` (phải trùng với tailwind-v4.ts).
const VARIANT_VALUE = '__porbit_variant_value__'
const VARIANT_MODIFIER = '__porbit_variant_modifier__'
const SENTINEL_MODIFIER = '__porbit_modifier__'
// Kiểu của `matchUtilities` -> đối số `--value([kiểu])` mà dialect hiểu.
const BRACKET_TYPE: Record<string, string> = { color: 'color', length: 'length', percentage: 'percentage', number: 'number', integer: 'integer', url: 'url', image: 'image', angle: 'angle', 'line-width': 'length' }

type PluginInput = { handler: (api: TailwindPluginApi) => void; config?: Json }

/** Chuẩn hoá: hàm, `{ handler, config }`, hàm tuỳ chọn (`withOptions`), module ESM (`default`). */
const normalizePlugin = (plugin: any, options?: unknown): PluginInput | null => {
    if (plugin && typeof plugin === 'object' && 'default' in plugin && !('handler' in plugin)) plugin = plugin.default
    if (!plugin) return null
    if (typeof plugin === 'function' && plugin.__isOptionsFunction) return normalizePlugin(plugin(options))
    if (typeof plugin === 'function') return { handler: plugin }
    if (typeof plugin === 'object' && typeof plugin.handler === 'function') return plugin
    return null
}

/**
 * Chạy một plugin Tailwind với API giả lập và thu kết quả.
 *
 *   const out = runTailwindPlugin(require('tailwind-scrollbar'))
 *   const sheet = parseTailwindStylesheet(out.css)
 *   applyTailwindPluginOutput(sheet, out)
 */
export const runTailwindPlugin = (plugin: unknown, options: RunTailwindPluginOptions = {}): TailwindPluginOutput => {
    const input = normalizePlugin(plugin, options.options)
    const output: TailwindPluginOutput = { css: '', utilities: {}, variants: {}, variantOrder: {}, classes: [], unsupported: [] }
    if (!input) {
        output.unsupported.push('không phải plugin Tailwind')
        return output
    }
    const css = buildCssTheme(options.theme)
    const userConfig = options.config ? mergeTailwindConfigs(options.config) : undefined
    // `presets` của cấu hình dự án: theme gộp theo thứ tự preset -> cấu hình như Tailwind.
    const configs = [compatConfig(css), input.config ?? {}, ...flattenTailwindPresets(options.config)]
    const resolvedTheme = resolveConfigTheme(css, configs)
    const resolvedConfig: Json = { blocklist: [], future: {}, experimental: {}, prefix: '', important: false, darkMode: null, ...(userConfig ?? {}), theme: resolvedTheme, plugins: [] }
    const theme = createThemeFn(css, () => resolvedTheme, (value) => value)

    const top: string[] = []
    const base: string[] = []
    const utilityBodies = new Map<string, string[]>()
    const functional = new Map<string, string>()
    const classes = new Set<string>()
    const unsupported = new Set<string>()
    /**
     * Chuẩn hoá cây CSS của một utility cho dialect. `self`: class mà selector lồng nhắc lại
     * (`:where(.prose > :last-child)`); Tailwind thay bằng chính class đang dùng.
     */
    const prepareNodes = (name: string, nodes: CssNode[], self = name): CssNode[] => {
        // `@keyframes`/`@property`/`@font-face` lồng trong rule của utility: Tailwind 4.3.5 để nguyên chỗ lồng nên
        // trình duyệt bỏ qua (CSS nesting không nhận các at-rule này) — bỏ đi cho cùng kết quả.
        const dropNested = (list: CssNode[]): CssNode[] => list.filter((node) => {
            if (node.kind === 'at' && /^@(keyframes|property|font-face)\b/.test(node.name)) return false
            if (node.kind !== 'decl' && node.nodes) node.nodes = dropNested(node.nodes)
            return true
        })
        nodes = dropNested(nodes)
        // `@scope (&) { :where(:scope > x) {...} }` (join của daisyUI): rule con với `:scope` là chính phần tử — cùng
        // phần tử khớp, cùng độ ưu tiên (chỉ bỏ "độ gần scope", vốn chỉ quyết khi hai rule cùng độ ưu tiên).
        const rescope = (list: CssNode[]): CssNode[] => list.map((node) => {
            if (node.kind === 'rule') return { ...node, selector: node.selector.replace(/:scope\b/g, '&') }
            return node.kind === 'at' && node.nodes ? { ...node, nodes: rescope(node.nodes) } : node
        })
        const unscope = (list: CssNode[]): CssNode[] => list.flatMap((node) => {
            if (node.kind === 'at' && /^@scope\s*\(\s*&\s*\)$/.test(node.name) && node.nodes) return rescope(node.nodes)
            if (node.kind !== 'decl' && node.nodes) node.nodes = unscope(node.nodes)
            return [node]
        })
        nodes = unscope(nodes)
        // At-rule lồng trong utility mà dialect hiểu: `@media`, `@layer` (daisyUI xếp component vào layer con
        // `daisyui.l1.l2...` của layer utility), `@supports`, `@container`, `@starting-style`.
        walkNodes(nodes, (node) => {
            if (node.kind === 'at' && node.name !== '@slot' && !/^@(media|apply|layer|supports|container|starting-style)\b/.test(node.name)) unsupported.add(`${name}: ${node.name.split(/[\s(]/)[0]} trong utility`)
        })
        const selfToken = new RegExp(`\\.${escapeRegExp(escapeClassName(self))}(?![\\w\\\\-])`, 'g')
        const rewrite = (list: CssNode[]): CssNode[] => list.map((node) => {
            if (node.kind === 'rule') {
                // Dialect tự thêm `content` cho rule `::before`/`::after` (như biến thể `before:`); Tailwind không thêm cho
                // selector lồng của plugin. Cú pháp một dấu hai chấm (`:before`) tương đương mà không bị thêm.
                let selector = node.selector.replace(/::(before|after)\b/g, ':$1')
                // Class nhắc lại -> `&`; selector lồng không có `&` vốn là hậu duệ ngầm của rule cha nên thêm `& `.
                if (selector.match(selfToken)) selector = (selector.includes('&') ? '' : '& ') + selector.replace(selfToken, '&')
                return { ...node, selector, nodes: rewrite(node.nodes) }
            }
            // Biến rỗng (`--x: ;`): dialect đổi thành `initial` (biến không hợp lệ); `var(--porbit-empty,)` cho đúng
            // giá trị rỗng như Tailwind (biến không tồn tại -> dùng phần dự phòng rỗng).
            if (node.kind === 'decl' && node.prop.startsWith('--') && node.value.trim() === '') return { ...node, value: 'var(--porbit-empty,)' }
            return node.kind === 'at' && node.nodes ? { ...node, nodes: rewrite(node.nodes) } : node
        }).filter((node) => {
            // Thuộc tính không chuẩn (`ms-overflow-style` từ `msOverflowStyle`): trình duyệt bỏ qua, còn engine sẽ bỏ
            // cả class; chỉ bỏ khai báo đó.
            if (node.kind !== 'decl' || STANDARD_PROPERTIES.has(node.prop) || isOpenPropertyName(node.prop)) return true
            unsupported.add(`${name}: bỏ thuộc tính không chuẩn ${node.prop}`)
            return false
        })
        return rewrite(nodes)
    }
    const addUtilityBody = (name: string, nodes: CssNode[], self = name) => {
        const list = utilityBodies.get(name) ?? []
        list.push(printCss(prepareNodes(name, nodes, self)))
        utilityBodies.set(name, list)
    }

    const addUtilities = (utilities: Json | Json[]) => {
        const entries = (Array.isArray(utilities) ? utilities : [utilities]).flatMap((item) => Object.entries(item ?? {}))
        for (const [rawSelector, value] of entries) {
            for (const selector of segment(rawSelector, ',').map((s) => s.trim())) {
                if (selector.startsWith('@keyframes ')) {
                    top.push(printCss([block(selector, objectToAst(value))]))
                    continue
                }
                const found = classOccurrences(selector)
                if (!found.length) {
                    unsupported.add(`selector utility không hợp lệ: ${selector}`)
                    continue
                }
                for (const [start, end, name] of found) {
                    const nested = selector.slice(0, start) + '&' + selector.slice(end)
                    const nodes = nested === '&' ? objectToAst(value) : [block(nested, objectToAst(value))]
                    addUtilityBody(name, nodes)
                    classes.add(name)
                }
            }
        }
    }

    /** CSS của một lần gọi hàm utility (null nếu trả về rỗng). */
    const callUtility = (fn: (value: any, extra: { modifier: string | null }) => unknown, value: unknown, modifier: string | null): CssNode[] | null => {
        const result = fn(value, { modifier })
        if (result === null || result === undefined) return null
        const nodes = objectToAst(result)
        return nodes.length ? nodes : null
    }

    /** Thân `@utility name-*` từ mẫu (giá trị/modifier giả) nếu kết quả chỉ thay giá trị trong khai báo. */
    const templateBody = (name: string, fn: (value: any, extra: { modifier: string | null }) => unknown, makeValue: (v: string, m: string) => string, modifier: string | null, versions: Array<{ value: string; modifier?: string }>): string | null => {
        let template: CssNode[] | null
        let sample: CssNode[] | null
        try {
            template = callUtility(fn, makeValue(SENTINEL_VALUE, SENTINEL_MODIFIER), modifier === null ? null : SENTINEL_MODIFIER)
            sample = callUtility(fn, makeValue('var(--porbit-sample)', 'porbit-sample-modifier'), modifier === null ? null : 'porbit-sample-modifier')
        } catch (_error) {
            return null
        }
        if (!template || !sample) return null
        const printed = printCss(template)
        if (!printed.includes(SENTINEL_VALUE)) return null
        const expected = printed.replaceAll(SENTINEL_VALUE, 'var(--porbit-sample)').replaceAll(SENTINEL_MODIFIER, 'porbit-sample-modifier')
        if (expected !== printCss(sample)) return null
        // Giá trị giả chỉ được nằm trong giá trị khai báo (không trong selector/at-rule).
        let onlyInDecls = true
        walkNodes(template, (node) => {
            const head = node.kind === 'rule' ? node.selector : node.kind === 'at' ? node.name : node.prop
            if (head.includes(SENTINEL_VALUE) || head.includes(SENTINEL_MODIFIER)) onlyInDecls = false
        })
        if (!onlyInDecls) return null
        // Mỗi khai báo có giá trị giả -> một bản cho từng cách giải (giá trị tuỳ ý, giá trị trần, màu + độ mờ).
        const expand = (nodes: CssNode[]): CssNode[] => nodes.flatMap((node): CssNode[] => {
            if (node.kind !== 'decl') return [node.nodes ? { ...node, nodes: expand(node.nodes) } as CssNode : node]
            if (!node.value.includes(SENTINEL_VALUE) && !node.value.includes(SENTINEL_MODIFIER)) return [node]
            return versions.map((version) => ({ kind: 'decl', prop: node.prop, value: node.value.replaceAll(SENTINEL_VALUE, version.value).replaceAll(SENTINEL_MODIFIER, version.modifier ?? '') }))
        })
        return printCss(expand(prepareNodes(`${name}-*`, template, name)))
    }

    const matchUtilities = (utilities: Record<string, (value: any, extra: { modifier: string | null }) => any>, matchOptions: MatchOptions = {}) => {
        const types = matchOptions.type ? (Array.isArray(matchOptions.type) ? matchOptions.type : [matchOptions.type]) : ['any']
        const isColor = types.includes('color')
        const rawValues = (matchOptions.values ?? {}) as Json
        const values: Json = isColor ? Object.assign({ inherit: 'inherit', transparent: 'transparent', current: 'currentcolor' }, rawValues) : rawValues
        const modifiers = matchOptions.modifiers ?? null
        const valueKeys = Object.keys(values).filter((key) => key !== '__BARE_VALUE__' && key !== '__CSS_VALUES__')
        const modifierKeys = modifiers && modifiers !== 'any' ? Object.keys(modifiers) : []
        for (const [name, fn] of Object.entries(utilities)) {
            if (!VALID_UTILITY.test(name)) {
                unsupported.add(`tên matchUtilities không hợp lệ: ${name}`)
                continue
            }
            for (const negative of matchOptions.supportsNegativeValues ? [false, true] : [false]) {
                const root = negative ? `-${name}` : name
                const apply = (value: unknown) => (negative ? `calc(${value} * -1)` : value)
                for (const key of valueKeys) {
                    const value = values[key]
                    if (value === null || value === undefined) continue
                    const className = key === 'DEFAULT' ? root : `${root}-${key}`
                    try {
                        const nodes = callUtility(fn, apply(value), null)
                        if (nodes) {
                            addUtilityBody(className, nodes, name)
                            if (!negative && Object.hasOwn(rawValues, key)) classes.add(className)
                        }
                        // Tổ hợp giá trị × modifier khai báo sẵn: utility tĩnh `name-key/mod`.
                        if (modifierKeys.length && valueKeys.length * modifierKeys.length <= 20000) {
                            for (const mod of modifierKeys) {
                                const modValue = (modifiers as Json)[mod]
                                const withMod = callUtility(fn, apply(isColor && typeof value === 'string' ? withAlpha(value, modValue) : value), modValue)
                                if (withMod) addUtilityBody(`${className}/${mod}`, withMod, name)
                            }
                        } else if (modifierKeys.length) unsupported.add(`${name}: quá nhiều tổ hợp giá trị × modifier`)
                    } catch (error) {
                        unsupported.add(`${className}: ${(error as Error).message}`)
                    }
                }
                // Dạng hàm `name-*`: giá trị tuỳ ý, giá trị trần, màu + độ mờ.
                const versions: Array<{ value: string; modifier?: string }> = []
                const bracketArgs = types.includes('any') ? '[*]' : [...new Set(types.map((type) => `[${BRACKET_TYPE[type] ?? '*'}]`))].join(', ')
                versions.push({ value: `--value(${bracketArgs})` })
                const bare = values.__BARE_VALUE__
                if (typeof bare === 'function') {
                    const at = (v: string) => {
                        try {
                            return bare({ kind: 'named', value: v, fraction: null })
                        } catch (_error) {
                            return undefined
                        }
                    }
                    const [a, b] = [at('7'), at('13')]
                    if (typeof a === 'string' && typeof b === 'string' && a.includes('7') && b === a.replace('7', '13')) {
                        const arg = typeof at('2.5') === 'string' ? 'number' : 'integer'
                        versions.push({ value: a.replace('7', `--value(${arg})`) })
                    }
                }
                let modifierVersion = false
                if (isColor && !modifierKeys.length) {
                    // Màu lấy từ theme (`red-500` có `--color-red-500` cùng giá trị): tra `--value(--color-*)`.
                    const fromTheme = valueKeys.filter((key) => typeof values[key] === 'string' && css.get([`--color-${key}`]) !== null)
                    if (fromTheme.length && fromTheme.every((key) => css.get([`--color-${key}`]) === values[key])) {
                        versions.push({ value: `color-mix(in oklab, --value(--color-*, [color]) --modifier(integer)%, transparent)`, modifier: '--modifier(integer)%' })
                        modifierVersion = true
                    }
                }
                const plain = templateBody(name, fn, (v) => String(apply(v)), null, versions.filter((v) => v.modifier === undefined))
                let body = plain
                if (modifierVersion) {
                    // Màu + modifier: Tailwind truyền `color-mix(in oklab, màu N%, transparent)` và modifier `N%`.
                    const withModifier = templateBody(name, fn, (v, m) => String(apply(`color-mix(in oklab, ${v} ${m}, transparent)`)), SENTINEL_MODIFIER, [{ value: '--value(--color-*, [color])', modifier: '--modifier(integer)%' }])
                    if (withModifier) body = [plain, withModifier].filter(Boolean).join(' ')
                }
                if (body) functional.set(`${root}-*`, [functional.get(`${root}-*`), body].filter(Boolean).join(' '))
            }
        }
    }

    /** Biến thể (chuỗi, mảng, object CSS-in-JS) -> thân dạng khối có `@slot`. */
    const variantBody = (variant: unknown): string | null => {
        if (typeof variant === 'string' || Array.isArray(variant)) {
            const list = typeof variant === 'string' ? [variant] : variant
            return list.map((item: unknown) => {
                const text = String(item).trim()
                if (text.endsWith('}')) return text.replace('}', '{ @slot; }}')
                return `${text} { @slot; }`
            }).join(' ')
        }
        if (variant && typeof variant === 'object') return printCss(objectToAst(variant))
        return null
    }
    const addVariant = (name: string, variant: unknown) => {
        if (!VALID_VARIANT.test(name)) {
            unsupported.add(`tên biến thể không hợp lệ: ${name}`)
            return
        }
        // `:merge(...)` (group/peer kiểu v3): Tailwind v4 bỏ qua.
        if (JSON.stringify(variant ?? '').includes(':merge(')) return
        const body = variantBody(variant)
        if (body) output.variants[name] = `{ ${body} }`
    }

    const api: TailwindPluginApi = {
        addBase(css) {
            base.push(printCss(objectToAst(css)))
        },
        addUtilities,
        addComponents(components) {
            addUtilities(components)
        },
        matchUtilities,
        matchComponents(components, matchOptions) {
            matchUtilities(components, matchOptions)
        },
        addVariant,
        matchVariant(name, fn, variantOptions) {
            // `:merge(...)` (group/peer kiểu v3): Tailwind v4 bỏ cả biến thể.
            try {
                if (JSON.stringify(fn('a', { modifier: null }) ?? '').includes(':merge(')) return
            } catch (_error) {
                // hàm lỗi với giá trị thử: để các bước dưới báo
            }
            if (!VALID_VARIANT.test(name)) {
                unsupported.add(`tên biến thể không hợp lệ: ${name}`)
                return
            }
            const values = (variantOptions?.values ?? {}) as Json
            const sort = variantOptions?.sort
            const entries = Object.entries(values).filter(([, value]) => typeof value === 'string')
            // Thứ tự trong nhóm như `matchVariant` của Tailwind: giá trị có tên và tuỳ ý (`name-[x]`) cùng một nhóm, theo
            // `sort` (trên giá trị đã giải) nếu có, không thì theo thứ tự khai báo khoá (giá trị tuỳ ý sau), hoà thì so chuỗi.
            const keys = Object.keys(values)
            output.variantOrder[name] = {
                keys: entries.map(([key]) => key),
                compare: (a, b) => {
                    const ka = a.value ?? 'DEFAULT'
                    const kb = b.value ?? 'DEFAULT'
                    const va = (Object.hasOwn(values, ka) ? values[ka] : undefined) ?? ka
                    const vb = (Object.hasOwn(values, kb) ? values[kb] : undefined) ?? kb
                    const ia = keys.includes(ka) ? keys.indexOf(ka) : keys.length
                    const ib = keys.includes(kb) ? keys.indexOf(kb) : keys.length
                    const result = typeof sort === 'function' ? (sort as (a: Json, b: Json) => number)({ value: va, modifier: a.modifier }, { value: vb, modifier: b.modifier }) : ia !== ib ? ia - ib : va === vb ? 0 : va < vb ? -1 : 1
                    // Hoà (cùng giá trị, khác modifier): Tailwind để thứ tự gặp quyết định; ở đây không modifier trước.
                    return result || (a.modifier === b.modifier ? 0 : a.modifier === null ? -1 : b.modifier === null ? 1 : a.modifier < b.modifier ? -1 : 1)
                },
            }
            // Thứ tự đăng ký (dialect không nhận `variantOrder`): giá trị có tên theo `compare`.
            entries.sort(([a], [b]) => output.variantOrder[name].compare({ value: a, modifier: null }, { value: b, modifier: null }))
            for (const [key, value] of entries) {
                try {
                    addVariant(key === 'DEFAULT' ? name : `${name}-${key}`, fn(value, { modifier: null }))
                } catch (error) {
                    unsupported.add(`${name}-${key}: ${(error as Error).message}`)
                }
            }
            // Giá trị tuỳ ý `name-[x]` (và `/modifier`): mẫu dựng từ giá trị giả, kiểm lại bằng giá trị thử thứ hai.
            const template = (value: string, modifier: string | null): string | null => {
                try {
                    return variantBody(fn(value, { modifier }))
                } catch (_error) {
                    return null
                }
            }
            const SAMPLE = 'porbit-sample', SAMPLE_MOD = 'porbit-sample-mod'
            const fill = (body: string, value: string, modifier: string) => body.split(VARIANT_VALUE).join(value).split(VARIANT_MODIFIER).join(modifier)
            const plain = template(VARIANT_VALUE, null)
            if (!plain || !plain.includes(VARIANT_VALUE) || fill(plain, SAMPLE, '') !== template(SAMPLE, null)) {
                unsupported.add(`${name}-[…]: matchVariant với giá trị tuỳ ý`)
                return
            }
            output.variants[`${name}-*`] = `{ ${plain} }`
            const withModifier = template(VARIANT_VALUE, VARIANT_MODIFIER)
            if (withModifier && fill(withModifier, SAMPLE, SAMPLE_MOD) === template(SAMPLE, SAMPLE_MOD)) output.variants[`${name}-*/*`] = `{ ${withModifier} }`
            else unsupported.add(`${name}-[…]/…: matchVariant với modifier`)
        },
        theme,
        config(path, defaultValue) {
            if (!path) return resolvedConfig
            let current: any = resolvedConfig
            for (const key of toKeyPath(path)) {
                if (current?.[key] === undefined) return defaultValue
                current = current[key]
            }
            return current ?? defaultValue
        },
        prefix: (className) => className,
        e: escapeClassName,
        corePlugins: () => true,
    }

    try {
        input.handler(api)
    } catch (error) {
        unsupported.add(`plugin lỗi: ${(error as Error).message}`)
    }

    // `config.theme` của plugin (colors, animation, keyframes...) -> `@theme` cho utility sẵn có (`animate-x`).
    const pluginTheme = input.config?.theme as Json | undefined
    if (pluginTheme && typeof pluginTheme === 'object') {
        const helpers = Object.assign(theme, { theme, colors: TAILWIND_COLORS })
        const resolveFns = (obj: Json): Json => Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, key === 'extend' && value && typeof value === 'object' ? resolveFns(value) : typeof value === 'function' ? value(helpers) : value]))
        try {
            const converted = tailwindConfigToCss({ theme: resolveFns(pluginTheme) })
            if (converted.css) top.unshift(converted.css)
        } catch (error) {
            unsupported.add(`config.theme: ${(error as Error).message}`)
        }
    }

    const parts: string[] = [...top]
    if (base.length) parts.push(`@layer base { ${base.join(' ')} }`)
    for (const [name, bodies] of utilityBodies) output.utilities[name] = bodies.join(' ')
    for (const [name, body] of functional) output.utilities[name] = body
    for (const [name, body] of Object.entries(output.utilities)) {
        const bare = name.endsWith('-*') ? name.slice(0, -2) : name
        if (CSS_UTILITY_NAME.test(bare)) parts.push(`@utility ${name} { ${body} }`)
    }
    for (const [name, body] of Object.entries(output.variants)) if (CSS_VARIANT_NAME.test(name)) parts.push(`@custom-variant ${name} ${body}`)
    output.css = parts.join('\n')
    output.classes = [...classes]
    output.unsupported = [...unsupported]
    return output
}

/**
 * Thân `@plugin "x" { a: 1; b: x, y; c: "z"; }` -> `{ a: 1, b: ['x', 'y'], c: 'z' }` như Tailwind
 * (`null`/`true`/`false`, số, chuỗi trong nháy, danh sách cách bằng dấu phẩy).
 */
export const parsePluginOptions = (body: string): Record<string, unknown> => {
    const options: Record<string, unknown> = {}
    for (const decl of segment(body, ';')) {
        const colon = decl.indexOf(':')
        if (colon <= 0) continue
        const values = segment(decl.slice(colon + 1), ',').map((part): unknown => {
            part = part.trim()
            if (part === 'null') return null
            if (part === 'true') return true
            if (part === 'false') return false
            if (!Number.isNaN(Number(part))) return Number(part)
            if ((part[0] === '"' && part.endsWith('"')) || (part[0] === "'" && part.endsWith("'"))) return part.slice(1, -1)
            return part
        })
        options[decl.slice(0, colon).trim()] = values.length === 1 ? values[0] : values
    }
    return options
}

/** Gộp utility/biến thể mà CSS không viết được (`x-0.5`, `x-1/2`) vào stylesheet đã đọc. */
export const applyTailwindPluginOutput = <T extends { utilities: Record<string, string>; variants: Record<string, string>; variantOrder?: Record<string, TailwindVariantOrder> }>(sheet: T, output: Pick<TailwindPluginOutput, 'utilities' | 'variants'> & Partial<Pick<TailwindPluginOutput, 'variantOrder'>>): T => {
    for (const [name, body] of Object.entries(output.utilities)) {
        const bare = name.endsWith('-*') ? name.slice(0, -2) : name
        if (!CSS_UTILITY_NAME.test(bare) && !(name in sheet.utilities)) sheet.utilities[name] = body
    }
    for (const [name, body] of Object.entries(output.variants)) if (!CSS_VARIANT_NAME.test(name) && !(name in sheet.variants)) sheet.variants[name] = body
    for (const [name, order] of Object.entries(output.variantOrder || {})) (sheet.variantOrder ||= {})[name] ??= order
    return sheet
}

// ---------------------------------------------------------------------------
// Nạp plugin từ dự án (Node), cấp bản thay cho `tailwindcss/*` khi dự án không cài tailwindcss
// ---------------------------------------------------------------------------

/** Module `tailwindcss/*` mà plugin hay `require`. */
export const TAILWIND_SHIMS: Record<string, unknown> = {
    'tailwindcss/plugin': createPlugin,
    'tailwindcss/colors': TAILWIND_COLORS,
    'tailwindcss/defaultTheme': TAILWIND_DEFAULT_THEME,
    'tailwindcss/lib/util/flattenColorPalette': flattenColorPalette,
}
const shimFor = (request: string): string | null => {
    const id = request.replace(/\.(c|m)?js$/, '')
    return id in TAILWIND_SHIMS ? id : null
}
const SHIM_FILE_PREFIX = '\0porbit-tailwind-shim:'
const SHIM_GLOBAL = Symbol.for('porbit.tailwindShims')

type ModuleInternals = typeof Module & {
    _resolveFilename: (request: string, parent: unknown, isMain: boolean, options?: unknown) => string
    _cache: Record<string, unknown>
}

/**
 * `require(id)` từ `baseDir` với bản thay cho `tailwindcss/plugin`, `tailwindcss/colors`,
 * `tailwindcss/defaultTheme`, `tailwindcss/lib/util/flattenColorPalette` (luôn dùng bản thay để kết quả
 * giống Tailwind 4.3.5 dù dự án không cài hoặc cài tailwindcss v3).
 *
 * Cách làm: trong lúc nạp, tạm thay `Module._resolveFilename` (đường `require()` của CommonJS): yêu cầu
 * `tailwindcss/...` trả về một tên file ảo đã đặt sẵn trong `Module._cache` với `exports` là bản thay, nên
 * `require` lấy thẳng từ bộ nhớ đệm. Plugin ESM (`import plugin from 'tailwindcss/plugin'`, nạp qua
 * `require(esm)` của Node ≥ 22) đi đường của bộ nạp ESM: dùng `module.registerHooks` (Node ≥ 22.15) để
 * trả module `data:` đọc bản thay từ `globalThis`. Cả hai được gỡ ngay sau khi nạp xong.
 */
export const requireWithTailwindShims = (baseDir: string, id: string): unknown => {
    const req = createRequire(join(resolvePath(baseDir), 'noop.js'))
    const internals = Module as ModuleInternals
    const originalResolve = internals._resolveFilename
    ;(globalThis as any)[SHIM_GLOBAL] = TAILWIND_SHIMS
    internals._resolveFilename = function (request: string, ...rest: [unknown, boolean, unknown?]) {
        const shim = shimFor(request)
        if (!shim) return originalResolve.call(this, request, ...rest)
        const filename = SHIM_FILE_PREFIX + shim
        if (!internals._cache[filename]) internals._cache[filename] = { id: filename, filename, loaded: true, exports: TAILWIND_SHIMS[shim], children: [], paths: [] }
        return filename
    }
    const registerHooks = (Module as any).registerHooks as undefined | ((hooks: unknown) => { deregister(): void })
    const hooks = registerHooks?.({
        resolve(specifier: string, context: { conditions?: string[] }, next: (s: string, c: unknown) => unknown) {
            const shim = shimFor(specifier)
            // `require()` đã có `_resolveFilename` ở trên; chỉ chặn `import`.
            if (shim && !context.conditions?.includes('require')) {
                const source = `const m = globalThis[Symbol.for('porbit.tailwindShims')][${JSON.stringify(shim)}]; export default m;`
                return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true, format: 'module' }
            }
            return next(specifier, context)
        },
    })
    try {
        return req(id)
    } finally {
        internals._resolveFilename = originalResolve
        hooks?.deregister()
    }
}

export interface TailwindPluginLoader {
    /** CSS cho `@plugin "id"` (gói hoặc file JS của dự án), null nếu không nạp/chạy được. */
    resolve(id: string, options?: unknown): string | null
    /** Chạy một plugin đã nạp (ví dụ từ `plugins` của tailwind.config.js) và trả CSS. */
    run(plugin: unknown, config?: Json, name?: string): string
    /** Gộp utility/biến thể mà CSS không viết được vào stylesheet sau `parseTailwindStylesheet`. */
    apply<T extends { utilities: Record<string, string>; variants: Record<string, string>; variantOrder?: Record<string, TailwindVariantOrder> }>(sheet: T): T
    /** File plugin cục bộ đã nạp (cho chế độ watch). */
    files: string[]
    /** Lỗi/phần chưa hỗ trợ theo plugin. */
    messages: Record<string, string[]>
}

/**
 * Bộ nạp plugin JS cho một thư mục dự án. `theme` trả biến `@theme` của dự án (gọi lười, chỉ khi có plugin).
 *
 *   const plugins = createTailwindPluginLoader(dir, { theme: () => sheetTheme })
 *   const sheet = plugins.apply(parseTailwindStylesheet(css, { resolve: (id) => bundled(id) ?? plugins.resolve(id) }))
 */
export const createTailwindPluginLoader = (baseDir: string, loaderOptions: { theme?: () => Record<string, string> } = {}): TailwindPluginLoader => {
    const outputs: TailwindPluginOutput[] = []
    const files: string[] = []
    const messages: Record<string, string[]> = {}
    let projectTheme: Record<string, string> | undefined
    const themeOf = () => (projectTheme ??= loaderOptions.theme?.() ?? {})
    const run = (plugin: unknown, config?: Json, name = 'plugin') => {
        const output = runTailwindPlugin(plugin, { theme: themeOf(), config })
        outputs.push(output)
        if (output.unsupported.length) messages[name] = output.unsupported
        return output.css
    }
    return {
        resolve(id, options) {
            const local = id.startsWith('.') || isAbsolute(id)
            const target = local ? resolvePath(baseDir, id) : id
            let mod: unknown
            try {
                if (local) {
                    // Chế độ watch: nạp lại file plugin của dự án khi đổi.
                    const file = createRequire(join(resolvePath(baseDir), 'noop.js')).resolve(target)
                    delete createRequire(file).cache[file]
                    files.push(file)
                }
                mod = requireWithTailwindShims(baseDir, target)
            } catch (error) {
                messages[id] = [`không nạp được: ${(error as Error).message.split('\n')[0]}`]
                return null
            }
            if (!normalizePlugin(mod, options)) return null
            const output = runTailwindPlugin(mod, { theme: themeOf(), options })
            outputs.push(output)
            if (output.unsupported.length) messages[id] = output.unsupported
            return output.css || '/* plugin không sinh CSS */'
        },
        run,
        apply(sheet) {
            for (const output of outputs) applyTailwindPluginOutput(sheet, output)
            return sheet
        },
        files,
        messages,
    }
}
