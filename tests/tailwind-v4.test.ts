import { describe, expect, it } from 'vitest'
import { xcss } from '../src/core'
import { minifyCss } from '../src/minify'
import { resolveConfigFile } from '../src/config-file'
import { extractFromClasses } from '../src/extract'
import { parseTailwindStylesheet, tailwindV4Dialect } from '../src/tailwind-v4'
import { resolveTailwindPlugin, TAILWIND_PLUGINS } from '../src/tailwind-plugins'

const css = (classes: string, options: Parameters<typeof tailwindV4Dialect>[0] = {}) => {
    const built = xcss({ hashClassName: false, silent: true, dialects: [tailwindV4Dialect(options)] }).buildCss(undefined)
    built.clsx(classes)
    const out = built.getCssString()
    built.destroy()
    return out
}

describe('phương ngữ Tailwind v4 (sinh từ chính Tailwind)', () => {
    it('khai báo nguyên văn của Tailwind, theme nhúng làm giá trị dự phòng', () => {
        const out = css('p-4 bg-red-500 text-sm shadow-md')
        expect(out).toContain('.p-4{padding:calc(var(--spacing, 0.25rem) * 4)}')
        expect(out).toContain('background-color:var(--color-red-500, oklch(63.7% 0.237 25.331))')
        expect(out).toContain('box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow)')
        expect(out).toContain('@property --tw-shadow')
    })

    it('breakpoint đúng của Tailwind (lg = 64rem), container query và at-rule nội tuyến', () => {
        const out = css('lg:p-4 @md:p-2 supports-[display:grid]:grid starting:opacity-0')
        expect(out).toContain('@media (width >= 64rem)')
        expect(out).toContain('@container (width >= 28rem){')
        expect(out).toContain('@supports (display:grid){')
        expect(out).toContain('@starting-style{')
    })

    it('biến thể ghép: not-, has-, group-*/name, in-, nth-, rtl', () => {
        const dialect = tailwindV4Dialect()
        for (const c of ['not-first:p-4', 'has-checked:p-4', 'group-hover/item:p-4', 'in-focus:p-4', 'nth-3:p-4', 'rtl:p-4', 'peer-checked/name:p-4', 'not-dark:p-4']) {
            expect(dialect(c), c).not.toBeNull()
        }
        expect(css('in-focus:p-4')).toContain(':where(:focus) .in-focus\\:p-4')
        expect(css('space-x-4')).toContain(':where(.space-x-4 > :not(:last-child))')
    })

    it('độ mờ màu, line-height modifier, !important, giá trị tuỳ ý', () => {
        expect(css('bg-red-500/50')).toContain('color-mix(in oklab, var(--color-red-500')
        expect(css('text-sm/6')).toContain('line-height:calc(var(--spacing, 0.25rem) * 6)')
        expect(css('p-4!')).toContain('!important')
        expect(css('w-[calc(100%-2rem)]')).toContain('width:calc(100% - 2rem)')
        // Khoảng trắng trong chuỗi có nháy được escape (trình duyệt đọc là "Segoe UI Emoji").
        expect(css('font-sans')).toContain('Segoe\\000020UI')
    })

    it('theme tuỳ chỉnh: màu, bo góc, breakpoint, shadow', () => {
        const theme = { '--color-brand': '#0a64e8', '--radius-blob': '2rem', '--breakpoint-3xl': '112rem', '--shadow-soft': '0 2px 8px rgb(0 0 0 / 0.2)' }
        const out = css('bg-brand rounded-blob 3xl:p-4 shadow-soft', { theme })
        expect(out).toContain('background-color:var(--color-brand, #0a64e8)')
        expect(out).toContain('var(--radius-blob, 2rem)')
        expect(out).toContain('@media (width >= 112rem)')
        expect(out).toContain('var(--tw-shadow-color, rgb(0 0 0 / 0.2))')
        expect(css('bg-brand')).not.toContain('--color-brand')
    })

    it('đọc stylesheet kiểu Tailwind: @theme, keyframes, CSS thường', () => {
        const parsed = parseTailwindStylesheet('@import "tailwindcss";\n@theme { --color-brand: #f00; @keyframes wiggle { 50% { rotate: 3deg } } }\n.card { padding: 1rem }')
        expect(parsed.theme).toEqual({ '--color-brand': '#f00' })
        expect(parsed.css).toContain('@keyframes wiggle')
        expect(parsed.css).toMatch(/\.card\s*\{\s*padding: 1rem\s*\}/)
        expect(parsed.css).not.toContain('@import')
    })

    it('một class nhiều rule: container, not-hover, ≥3 điều kiện media', () => {
        const out = css('container not-hover:flex md:dark:hover:underline')
        expect(out).toContain('.container{width:100%}')
        expect(out).toMatch(/@media \(width >= 48rem\)\{\.container\{max-width:48rem\}/)
        expect(out).toContain('.not-hover\\:flex:not(:hover){display:flex}')
        expect(out).toMatch(/@media not \(hover: hover\)\{\.not-hover\\:flex\{display:flex\}/)
        expect(out).toMatch(/@media \(hover: hover\) and \(prefers-color-scheme: dark\) and \(width >= 48rem\)\{\.md\\:dark\\:hover\\:underline:hover\{/)
    })

    it('@custom-variant: dạng ngắn, dạng khối @slot (nhiều selector), at-rule, dùng sau group-', () => {
        const sheet = parseTailwindStylesheet(`
            @custom-variant dark (&:is(.dark *));
            @custom-variant data-open { &:where([data-state="open"]), &:where([data-open]:not([data-open="false"])) { @slot; } }
            @custom-variant pointer-fine (@media (pointer: fine));`)
        const out = css('dark:flex data-open:block group-data-open:grid pointer-fine:underline', { variants: sheet.variants })
        expect(out).toContain('.dark\\:flex:is(.dark *){display:flex}')
        expect(out).toContain('.data-open\\:block:where([data-state="open"]){display:block}')
        expect(out).toContain('.data-open\\:block:where([data-open]:not([data-open="false"])){display:block}')
        // Như Tailwind: danh sách selector của biến thể thay `&` bằng `:where(.group)` rồi bọc `:is()`.
        expect(out).toContain(':is(:is(:where(.group):where([data-state="open"]), :where(.group):where([data-open]:not([data-open="false"]))) *)')
        expect(out).toMatch(/@media \(pointer: fine\)\{\.pointer-fine\\:underline\{/)
    })

    it('@utility dạng hàm: --value(number/integer/ratio/--theme-*/[type]/"literal"), --modifier, selector lồng', () => {
        const sheet = parseTailwindStylesheet(`
            @theme { --tab-wide: 12; }
            @utility tab-* { tab-size: --value(integer, --tab-*, [integer], "auto"); }
            @utility fade-* { opacity: calc(--value(number) / 100); opacity: --value([percentage]); }
            @utility ratio-* { aspect-ratio: --value(ratio); }
            @utility tint-* { color: --value([color]); opacity: --modifier(number); }
            @utility no-scrollbar { scrollbar-width: none; &::-webkit-scrollbar { display: none; } }`)
        const d = tailwindV4Dialect({ theme: sheet.theme, utilities: sheet.utilities })
        expect(d('tab-4')).toEqual(['tab-size[4]'])
        expect(d('tab-wide')).toEqual(['tab-size[var(--tab-wide,_12)]'])
        expect(d('tab-auto')).toEqual(['tab-size[auto]'])
        expect(d('tab-[7]')).toEqual(['tab-size[7]'])
        expect(d('tab-x')).toBeNull()
        expect(d('fade-2.5')).toEqual(['opacity[calc(2.5_/_100)]'])
        expect(d('fade-2.3')).toBeNull()
        expect(d('fade-[40%]')).toEqual(['opacity[40%]'])
        expect(d('ratio-16/9')).toEqual(['aspect-ratio[16_/_9]'])
        expect(d('tint-[#f00]/1')).toEqual(['color[#f00]', 'opacity[1]'])
        expect(d('no-scrollbar')).toEqual(['scrollbar-width[none]', 'display[none]@::-webkit-scrollbar'])
        expect(d('md:no-scrollbar')).toEqual(['[@media_(width_>=_48rem)]:scrollbar-width[none]', '[@media_(width_>=_48rem)]:display[none]@::-webkit-scrollbar'])
    })

    it('@apply kèm biến thể, modifier, !important; @layer base về layer nền', () => {
        const out = css('flex', {
            preflight: false,
            css: '@layer base { * { @apply border-red-500 outline-red-500/50; } } .btn { @apply px-4 hover:underline md:py-2 !font-bold; }',
        })
        expect(out).toContain('@layer l0{*{border-color:var(--color-red-500')
        expect(out).toContain('outline-color:color-mix(in oklab, var(--color-red-500')
        expect(out).toContain('.btn{padding-inline:calc(var(--spacing, 0.25rem) * 4);--tw-font-weight:var(--font-weight-bold, 700) !important;font-weight:var(--font-weight-bold, 700) !important;}')
        expect(out).toMatch(/@media \(hover: hover\)\{\.btn:hover\{text-decoration-line:underline;\}\}/)
        expect(out).toMatch(/@media \(width >= 48rem\)\{\.btn\{padding-block:/)
        expect(out).not.toContain('chưa hỗ trợ')
    })

    it('thứ tự rule như Tailwind: không phụ thuộc thứ tự gặp class (`px-4` thắng `p-2`)', async () => {
        const d = tailwindV4Dialect()
        expect(['px-4', 'hover:flex', 'p-2', 'md:p-1', 'focus:flex', 'flex'].sort(d.compare!)).toEqual(['flex', 'p-2', 'px-4', 'hover:flex', 'focus:flex', 'md:p-1'])
        for (const order of [['px-4', 'p-2'], ['p-2', 'px-4']]) {
            const out = (await extractFromClasses(order, { hashClassName: false, silent: true, dialects: [d] })).css
            expect(out.indexOf('.p-2{')).toBeLessThan(out.indexOf('.px-4{'))
        }
        // Class không thuộc phương ngữ đứng trước (như prettier-plugin-tailwindcss).
        expect(['flex', 'my-btn', 'p-2'].sort(d.compare!)).toEqual(['my-btn', 'flex', 'p-2'])
    })

    it('plugin đóng gói sẵn: tw-animate-css, forms, typography (biến thể prose-*)', () => {
        expect(TAILWIND_PLUGINS).toEqual(expect.arrayContaining(['tw-animate-css', '@tailwindcss/forms', '@tailwindcss/typography', 'tailwindcss-animate']))
        const sheet = parseTailwindStylesheet('@import "tailwindcss"; @import "tw-animate-css"; @plugin "@tailwindcss/typography"; @plugin "@tailwindcss/forms"; @plugin "khong-co";', { resolve: resolveTailwindPlugin })
        expect(sheet.unresolved).toEqual(['khong-co'])
        const d = tailwindV4Dialect({ theme: sheet.theme, utilities: sheet.utilities, variants: sheet.variants, css: sheet.css })
        expect(d('fade-in-50')).toEqual(['--tw-enter-opacity[calc(50/100)]', '--tw-enter-opacity[var(--percentage-50,_.5)]'])
        expect(d('slide-in-from-start')).toEqual(['--tw-enter-translate-x[-100%]@:dir(ltr)', '--tw-enter-translate-x[100%]@:dir(rtl)'])
        // Trùng tên utility sẵn có (`delay-*`): cả hai cùng áp như Tailwind.
        expect(d('delay-150')).toEqual(['transition-delay[150ms]', 'animation-delay[calc(150*1ms)]', 'animation-delay[var(--animation-delay-150,_.15s)]', '--tw-animation-delay[calc(150*1ms)]', '--tw-animation-delay[var(--animation-delay-150,_.15s)]'])
        expect(d('prose')!.length).toBeGreaterThan(100)
        expect(d('prose-headings:underline')![0]).toContain(':where(h1,;h2,;h3,;h4,;h5,;h6,;th)')
        expect(d('form-input')).not.toBeNull()
        expect(tailwindV4Dialect({ preflight: false, css: sheet.css }).baseCss).toContain("input:where([type='text'])")
    })

    it('cấu hình JSON "dialects": ["tailwind"] dùng bản v4', () => {
        const config = resolveConfigFile({ dialects: ['tailwind', 'tailwind-legacy'] })
        expect(config.dialects).toHaveLength(2)
        expect((config.dialects![0] as any).baseCss).toContain('@property')
    })
})

// Kết quả mong đợi lấy từ Tailwind 4.3.5 thật (candidatesToCss), xem eval/REAL-PROJECTS.md mục "Phân Tích Lệch".
describe('phương ngữ Tailwind v4: giá trị như Tailwind trên dự án thật', () => {
    it('class dạng Tailwind không nhận thì không rơi xuống x-css; x-css thật vẫn chạy', () => {
        const d = tailwindV4Dialect()
        expect(d.owns!('z-01')).toBe(true)
        expect(d.owns!('hover:opacity-0.3')).toBe(true)
        expect(d.owns!('not-[&:hover]:duration-1000')).toBe(true)
        expect(d.owns!('m-10px')).toBe(false)
        expect(d.owns!('dF')).toBe(false)
        expect(d.owns!('z-1@:hover')).toBe(false)
        const out = css('z-01 opacity-0.3 m-10px')
        expect(out).not.toContain('.z-01')
        expect(out).not.toContain('.opacity-0')
        expect(out).toContain('.m-10px{margin:-10px}')
        // Có tiền tố: class không tiền tố không thuộc phương ngữ.
        expect(tailwindV4Dialect({ prefix: 'tw' }).owns!('z-01')).toBe(false)
        expect(tailwindV4Dialect({ prefix: 'tw' }).owns!('tw:z-01')).toBe(true)
    })

    it('giá trị trần ngoài getClassList (số nguyên, bội 0.25, phân số)', () => {
        const d = tailwindV4Dialect()
        expect(d('z-1')).toEqual(['z-index[1]'])
        expect(d('-z-13')).toEqual(['z-index[calc(13_*_-1)]'])
        expect(d('opacity-64')).toEqual(['opacity[64%]'])
        expect(d('opacity-7.5')).toEqual(['opacity[7.5%]'])
        expect(d('scale-98')![0]).toBe('--tw-scale-x[98%]')
        expect(d('rotate-10')).toEqual(['rotate[10deg]'])
        expect(d('duration-450')).toEqual(['--tw-duration[450ms]', 'transition-duration[450ms]'])
        expect(d('duration-0')).toEqual(['--tw-duration[0ms]', 'transition-duration[0ms]'])
        expect(d('delay-0')).toEqual(['transition-delay[0ms]'])
        expect(d('aspect-3/7')).toEqual(['aspect-ratio[3/7]'])
        expect(css('sm:data-ending-style:scale-98')).toContain('--tw-scale-x:98%')
        // Giá trị liệt kê giữ dạng của Tailwind (`0deg`), số trần theo mẫu trần (`calc(1deg * 37)`).
        expect(d('mask-linear-0')).toContain('--tw-mask-linear-position[0deg]')
        expect(d('mask-linear-37')).toContain('--tw-mask-linear-position[calc(1deg_*_37)]')
        expect(d('grid-cols-37')).toEqual(['grid-template-columns[repeat(37,_minmax(0,_1fr))]'])
        expect(d('grid-cols-0')).toBeNull()
        // Tailwind không nhận: số không chuẩn, không phải bội 0.25, số nguyên mà họ chỉ nhận số nguyên.
        for (const c of ['z-01', 'z-1.5', 'opacity-0.3', 'scale-13.25', 'p-13.3', 'p-.5', 'bg-red-500/0.3']) expect(d(c), c).toBeNull()
    })

    it('start-*/end-* (inset-inline-start/end) như Tailwind 4.3', () => {
        const d = tailwindV4Dialect()
        expect(d('start-0')).toEqual(['inset-inline-start[0px]'])
        expect(d('end-0.5')).toEqual(['inset-inline-end[calc(var(--spacing,_0.25rem)_*_0.5)]'])
        expect(d('-start-4')).toEqual(['inset-inline-start[calc(var(--spacing,_0.25rem)_*_-4)]'])
        expect(d('after:start-1/2')).toEqual(['content[var(--tw-content)]@::after', 'inset-inline-start[calc(1/2_*_100%)]@::after'])
        expect(d('peer-checked:start-6')).not.toBeNull()
    })

    it('--spacing(), --theme(), --alpha() trong giá trị tuỳ ý', () => {
        const d = tailwindV4Dialect()
        expect(d('px-[calc(--spacing(3)-1px)]')).toEqual(['padding-inline[calc(calc(var(--spacing,_0.25rem)_*_3)_-_1px)]'])
        expect(d('pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(4))]')).toEqual(['padding-bottom[calc(env(safe-area-inset-bottom,0px)_+_calc(var(--spacing,_0.25rem)_*_4))]'])
        expect(d('w-[calc(100%-(--spacing(12)))]')).toEqual(['width[calc(100%_-_(calc(var(--spacing,_0.25rem)_*_12)))]'])
        // Toán tử sau số có đơn vị chữ (`1lh`) cũng được tách như Tailwind; tên và số mũ thì không.
        expect(d('min-h-[calc(var(--rows,1)*1lh+--spacing(2))]')).toEqual(['min-height[calc(var(--rows,1)*1lh_+_calc(var(--spacing,_0.25rem)_*_2))]'])
        expect(d('w-[calc(1lh-2px)]')).toEqual(['width[calc(1lh_-_2px)]'])
        expect(d('w-[calc(1e+3px)]')).toEqual(['width[calc(1e+3px)]'])
        expect(d('[--composer-padding:--spacing(2)]')).toEqual(['--composer-padding[calc(var(--spacing,_0.25rem)_*_2)]'])
        expect(d('m-[--spacing(1)]')).toEqual(['margin[var(--spacing,_0.25rem)]'])
        expect(d('bg-[--alpha(red/0.5)]')).toEqual(['background-color[color-mix(in_oklab,_red_50%,_transparent)]'])
        expect(d('bg-[--theme(--color-red-500/50%)]')![0]).toContain('color-mix(in_oklab,_var(--color-red-500')
        expect(d('m-[--theme(--khong-co,3px)]')).toEqual(['margin[3px]'])
        expect(d('m-[--theme(--khong-co)]')).toBeNull()
        expect(d('inset-shadow-[0_1px_--theme(--color-black/4%)]')![0]).toBe('--tw-inset-shadow[inset_0_1px_var(--tw-inset-shadow-color,_color-mix(in_oklab,_var(--color-black,_#000)_4%,_transparent))]')
    })

    it('modifier line-height của text-*: /none, /tight, /6 (cả cỡ tuỳ ý), /(--x), /[x]', () => {
        const d = tailwindV4Dialect()
        expect(d('text-sm/none')).toEqual(['font-size[var(--text-sm,_0.875rem)]', 'line-height[1]'])
        expect(d('text-sm/tight')).toEqual(['font-size[var(--text-sm,_0.875rem)]', 'line-height[var(--leading-tight,_1.25)]'])
        expect(d('text-[10px]/6')).toEqual(['font-size[10px]', 'line-height[calc(var(--spacing,_0.25rem)_*_6)]'])
        expect(d('text-xs/(--x)')).toEqual(['font-size[var(--text-xs,_0.75rem)]', 'line-height[var(--x)]'])
        expect(d('text-sm/[1.5]')).toEqual(['font-size[var(--text-sm,_0.875rem)]', 'line-height[1.5]'])
        expect(d('text-(length:--x)/6')).toEqual(['font-size[var(--x)]', 'line-height[calc(var(--spacing,_0.25rem)_*_6)]'])
        expect(d('text-sm/foo')).toBeNull()
    })

    it('bóng: màu trong bóng tuỳ ý theo `--tw-shadow-color`, modifier độ mờ của bóng', () => {
        const d = tailwindV4Dialect()
        expect(d('shadow-[4px_4px_0_0]')![0]).toBe('--tw-shadow[4px_4px_0_0_var(--tw-shadow-color,_currentcolor)]')
        expect(d('shadow-[0_1px_red,inset_0_2px_var(--x)]')![0]).toBe('--tw-shadow[0_1px_var(--tw-shadow-color,_red),_inset_0_2px_var(--tw-shadow-color,_var(--x))]')
        expect(d('shadow-[var(--x)]')![0]).toBe('--tw-shadow[var(--x)]')
        expect(d('inset-shadow-[0_1px_red,0_2px_blue]')![0]).toBe('--tw-inset-shadow[inset_0_1px_var(--tw-inset-shadow-color,_red),_inset_0_2px_var(--tw-inset-shadow-color,_blue)]')
        expect(d('drop-shadow-[0_1px_red,0_2px_blue]')![0]).toBe('--tw-drop-shadow-size[drop-shadow(0_1px_var(--tw-drop-shadow-color,_red))_drop-shadow(0_2px_var(--tw-drop-shadow-color,_blue))]')
        expect(d('shadow-xs/5')!.slice(0, 2)).toEqual(['--tw-shadow-alpha[5%]', '--tw-shadow[0_1px_2px_0_var(--tw-shadow-color,_oklab(from_rgb(0_0_0_/_0.05)_l_a_b_/_5%))]'])
        expect(d('shadow-[0_1px_2px]/50')!.slice(0, 2)).toEqual(['--tw-shadow-alpha[50%]', '--tw-shadow[0_1px_2px_var(--tw-shadow-color,_color-mix(in_oklab,_currentcolor_50%,_transparent))]'])
        expect(d('data-checked:shadow-sm/5')).not.toBeNull()
        // `shadow-black` đổi được màu của bóng tuỳ ý.
        const out = css('shadow-[4px_4px_0_0] shadow-black')
        expect(out).toContain('--tw-shadow-color:color-mix(in oklab, var(--color-black, #000) var(--tw-shadow-alpha), transparent)')
        expect(out).toContain('--tw-shadow:4px 4px 0 0 var(--tw-shadow-color, currentcolor)')
    })

    it('nền tuỳ ý: gợi ý kiểu, ảnh nhiều lớp, vị trí/kích thước; bg-size-[], bg-position-[]', () => {
        const d = tailwindV4Dialect()
        expect(d('bg-[length:200%]')).toEqual(['background-size[200%]'])
        expect(d('bg-[200%]')).toEqual(['background-position[200%]'])
        expect(d('bg-[200px_auto]')).toEqual(['background-size[200px_auto]'])
        expect(d('bg-[center_top]')).toEqual(['background-position[center_top]'])
        expect(d('bg-[url(a.png)]')).toEqual(['background-image[url(a.png)]'])
        expect(d('bg-[linear-gradient(red,blue),linear-gradient(red,blue)]')).toEqual(['background-image[linear-gradient(red,blue),linear-gradient(red,blue)]'])
        expect(d('bg-[repeating-linear-gradient(45deg,red_0,blue_10px)]')).toEqual(['background-image[repeating-linear-gradient(45deg,red_0,blue_10px)]'])
        expect(d('bg-[red]/50')).toEqual(['background-color[color-mix(in_oklab,_red_50%,_transparent)]'])
        expect(d('bg-size-[200%_auto]')).toEqual(['background-size[200%_auto]'])
        expect(d('bg-position-[0_0]')).toEqual(['background-position[0_0]'])
    })

    it('cú pháp biến có gợi ý kiểu, filter-[], mask-size-(--x)', () => {
        const d = tailwindV4Dialect()
        expect(d('border-(length:--w)')).toEqual(['border-style[var(--tw-border-style)]', 'border-width[var(--w)]'])
        expect(d('text-(color:--shiki-dark)!')).toEqual(['color![var(--shiki-dark)]'])
        expect(d('filter-[url(#threshold)_blur(0.6px)]')).toEqual(['filter[url(#threshold)_blur(0.6px)]'])
        expect(d('mask-size-(--x)')).toEqual(['mask-size[var(--x)]'])
        expect(d('mask-position-(--x)')).toEqual(['mask-position[var(--x)]'])
    })

    it('@utility trùng tên utility sẵn có: container (có @apply), utility có modifier', () => {
        const sheet = parseTailwindStylesheet(`
            @utility container { @apply mx-auto max-w-[1400px] px-4 lg:px-8; }
            @utility scrollbar-thumb-* { --x-thumb: --value(--color-*); opacity: --modifier(integer); }`)
        const d = tailwindV4Dialect({ utilities: sheet.utilities })
        const out = css('container', { utilities: sheet.utilities })
        // Phần của dự án đứng sau container sẵn có nên `max-width:1400px` thắng (như Tailwind).
        expect(out.indexOf('max-width:80rem')).toBeLessThan(out.indexOf('max-width:1400px'))
        expect(out).toContain('.container{margin-inline:auto;max-width:1400px;padding-inline:calc(var(--spacing, 0.25rem) * 4)}')
        expect(out).toMatch(/@media \(width >= 64rem\)\{\.container\{padding-inline:calc\(var\(--spacing, 0\.25rem\) \* 8\)\}/)
        // `scrollbar-thumb-*` có sẵn trong Tailwind 4.3 + của dự án: giữ cả phần có sẵn khi có modifier.
        const tokens = d('scrollbar-thumb-red-500/50')!
        expect(tokens).toContain('scrollbar-color[var(--tw-scrollbar-thumb)_var(--tw-scrollbar-track)]')
        expect(tokens[0]).toContain('color-mix(in_oklab,_var(--color-red-500')
        expect(tokens).toContain('opacity[50]')
    })
})

describe('minify CSS tĩnh', () => {
    it('bỏ @property/@keyframes không dùng, gộp @layer, giữ thứ tự rule', async () => {
        const { css: full } = await extractFromClasses(['p-4', 'shadow-md', 'sm:p-2'], { hashClassName: false, dialects: [tailwindV4Dialect()] })
        const min = minifyCss(full)
        expect(min.length).toBeLessThan(full.length * 0.7)
        expect(min).toContain('@property --tw-shadow{')
        expect(min).not.toContain('@property --tw-gradient-from')
        expect(min).not.toContain('@keyframes spin')
        expect(min.indexOf('.p-4')).toBeLessThan(min.indexOf('.shadow-md'))
        expect(min.match(/@layer l0\{/g)!.length).toBeLessThan(full.match(/@layer l0\{/g)!.length)
    })

    it('giữ keyframes khi animation đang dùng', () => {
        const min = minifyCss('@keyframes spin{to{rotate:1turn}}@keyframes ping{}@layer l0{.a{animation:var(--animate-spin, spin 1s linear infinite)}}')
        expect(min).toContain('@keyframes spin')
        expect(min).not.toContain('@keyframes ping')
    })
})

describe('biến theme ở :root và hàm theme trong CSS của dự án (như Tailwind)', () => {
    it('phát biến theme mà CSS của dự án/@apply đọc (cả biến mà giá trị theme đọc), trong layer thấp nhất', () => {
        const sheet = parseTailwindStylesheet(`
            @import "tailwindcss";
            @theme inline { --color-border: var(--border); }
            @theme { --color-brand: var(--color-pink-500); --color-unused: blue; }
            :root { --border: --alpha(var(--color-black) / 8%); --foreground: var(--color-neutral-800); }
            .dark { --border: --alpha(var(--color-white) / 6%); }
            @layer base { * { @apply border-border; } }
            .x { color: var(--color-brand); }`)
        const base = tailwindV4Dialect({ theme: sheet.theme, css: sheet.css }).baseCss as string
        const root = base.match(/@layer l0\{:root,:host\{([^}]*)\}\}/)
        expect(root).not.toBeNull()
        const decls = root![1]
        expect(decls).toContain('--color-black:#000;')
        expect(decls).toContain('--color-white:#fff;')
        expect(decls).toContain('--color-neutral-800:oklch(')
        // `--color-brand` đọc `--color-pink-500`: phát cả hai.
        expect(decls).toContain('--color-brand:var(--color-pink-500);')
        expect(decls).toContain('--color-pink-500:oklch(')
        expect(decls).not.toContain('--color-unused')
        expect(decls).not.toContain('--color-red-500')
        // Khai triển `--alpha()` ngoài `@theme`.
        expect(base).toContain('--border: color-mix(in oklab, var(--color-black) 8%, transparent)')
        expect(base).not.toContain('--alpha(')
        // Khối theme đứng trước CSS nền của dự án (thứ tự trong cùng layer).
        expect(base.indexOf(':root,:host{')).toBeLessThan(base.indexOf('@layer l0{*{'))
    })

    it('--spacing(), --theme() (inline, /alpha, dự phòng, trong @media), theme() cũ, @theme static', () => {
        const sheet = parseTailwindStylesheet(`
            @theme inline { --color-q: var(--color-green-500); }
            @theme { --spacing-x: --spacing(3); }
            @theme static { --color-st: var(--color-orange-500); }
            .a { margin: --spacing(-2); width: var(--spacing-x); }
            .b { color: --theme(--color-q); background: --theme(--color-red-500 / 50%); border-color: --theme(--color-nope, blue); }
            .c { color: theme(--color-red-500); }
            @media (width >= --theme(--breakpoint-md)) { .d { color: red } }`)
        expect(sheet.theme['--spacing-x']).toBe('calc(var(--spacing) * 3)')
        expect(sheet.css).toContain('margin: calc(var(--spacing) * -2)')
        expect(sheet.css).toContain('color: var(--color-green-500)')
        expect(sheet.css).toContain('background: color-mix(in oklab, var(--color-red-500) 50%, transparent)')
        expect(sheet.css).toContain('border-color: blue')
        expect(sheet.css).toContain('color: oklch(63.7% 0.237 25.331)')
        expect(sheet.css).toContain('@media (width >= 48rem)')
        expect(sheet.css.startsWith('@layer theme{:root,:host{--color-st:var(--color-orange-500);}}')).toBe(true)
        const base = tailwindV4Dialect({ theme: sheet.theme, css: sheet.css }).baseCss as string
        const decls = base.match(/@layer l0\{:root,:host\{([^}]*)\}\}/)![1]
        expect(decls).toContain('--spacing:0.25rem;')
        expect(decls).toContain('--spacing-x:calc(var(--spacing) * 3);')
        expect(decls).toContain('--color-orange-500:oklch(')
        expect(decls).toContain('--color-green-500:oklch(')
        expect(base).toContain('@layer l0{:root,:host{--color-st:var(--color-orange-500);}}')
    })

    it('không có CSS của dự án: không thêm khối theme', () => {
        expect(tailwindV4Dialect().baseCss).not.toContain(':root,:host{')
    })
})

describe('biến thể ghép như Tailwind (group-/peer-/in-/has-/not- với biến thể nhiều bước)', () => {
    const variants = parseTailwindStylesheet(`
        @custom-variant prose-headings (& :is(:where(h1, h2):not(:where([class~="not-prose"], [class~="not-prose"] *))));
        @custom-variant hover { @media (hover: hover) { &:is(:where([data-rac])[data-hovered], :where(:not([data-rac])):hover) { @slot; } } }
        @custom-variant rac-hover (&[data-hovered]);
        @custom-variant pd (&::before);`).variants

    it('has-/in-/not- thay `&` bằng `*`: biến thể hậu duệ giữ `* ` (has-prose-headings)', () => {
        const out = css('has-prose-headings:flex in-prose-headings:grid not-prose-headings:block', { variants })
        expect(out).toContain('.has-prose-headings\\:flex:has(* :is(:where(h1, h2):not(:where([class~="not-prose"], [class~="not-prose"] *)))){display:flex}')
        expect(out).toContain(':where(* :is(:where(h1, h2):not(:where([class~="not-prose"], [class~="not-prose"] *)))) .in-prose-headings\\:grid{display:grid}')
        expect(out).toContain('.not-prose-headings\\:block:not(* :is(:where(h1, h2):not(:where([class~="not-prose"], [class~="not-prose"] *)))){display:block}')
    })

    it('biến thể tự định nghĩa @media + selector: giữ @media khi ghép, not- thành hai rule', () => {
        const out = css('group-hover:flex peer-hover:grid has-hover:block in-hover:inline not-hover:contents', { variants })
        expect(out).toMatch(/@media \(hover: hover\)\{\.group-hover\\:flex:is\(:where\(\.group\):is\(:where\(\[data-rac\]\)\[data-hovered\], :where\(:not\(\[data-rac\]\)\):hover\) \*\)\{display:flex\}/)
        expect(out).toMatch(/@media \(hover: hover\)\{\.peer-hover\\:grid:is\(:where\(\.peer\):is\(.*\) ~ \*\)\{display:grid\}/)
        expect(out).toMatch(/@media \(hover: hover\)\{\.has-hover\\:block:has\(:is\(:where\(\[data-rac\]\)\[data-hovered\]/)
        expect(out).toMatch(/@media \(hover: hover\)\{:where\(:is\(:where\(\[data-rac\]\)\[data-hovered\], :where\(:not\(\[data-rac\]\)\):hover\)\) \.in-hover\\:inline\{display:inline\}/)
        expect(out).toContain('.not-hover\\:contents:not(:is(:where([data-rac])[data-hovered], :where(:not([data-rac])):hover)){display:contents}')
        expect(out).toMatch(/@media not \(hover: hover\)\{\.not-hover\\:contents\{display:contents\}/)
    })

    it('not- của biến thể tự định nghĩa trùng tên media sẵn có (`dark`) dùng selector của dự án', () => {
        const dark = parseTailwindStylesheet('@custom-variant dark (&:is(.dark *));').variants
        const out = css('not-dark:flex', { variants: dark })
        expect(out).toContain('.not-dark\\:flex:not(:is(.dark *)){display:flex}')
        expect(out).not.toContain('prefers-color-scheme')
    })

    it('tên biến thể kết thúc bằng -hover không tự thêm @media (hover: hover)', () => {
        const out = css('group-rac-hover:flex has-rac-hover:grid', { variants })
        expect(out).toContain('.group-rac-hover\\:flex:is(:where(.group)[data-hovered] *){display:flex}')
        expect(out).toContain('.has-rac-hover\\:grid:has([data-hovered]){display:grid}')
        expect(out).not.toContain('@media (hover: hover)')
    })

    it('biến thể có giả phần tử không ghép được; has-hover sẵn có có @media', () => {
        expect(css('group-pd:flex not-pd:flex', { variants })).not.toContain('display:flex')
        expect(css('has-hover:flex')).toMatch(/@media \(hover: hover\)\{\.has-hover\\:flex:has\(:hover\)\{display:flex\}/)
        expect(css('group-not-hover:flex has-not-hover:flex')).not.toContain('display:flex')
    })

    it('biến thể tuỳ ý trong not-/has-/in-/group-: `[&:hover]`, `[.x_&]`, `[>img]`, `[@media...]`', () => {
        const out = css('not-[&:hover]:flex has-[.x_&]:grid has-[>img]:block in-[&:focus]:inline group-[&:hover,&:focus]:table not-[@media(hover:hover)]:contents')
        expect(out).toContain('.not-\\[\\&\\:hover\\]\\:flex:not(:hover){display:flex}')
        expect(out).toContain(':has(.x *){display:grid}')
        expect(out).toContain(':has(>img){display:block}')
        expect(out).toContain(':where(:focus) .in-\\[\\&\\:focus\\]\\:inline{display:inline}')
        expect(out).toContain(':is(:is(:where(.group):hover, :where(.group):focus) *){display:table}')
        expect(out).toMatch(/@media not \(hover:hover\)\{\.not-\\\[\\@media\\\(hover\\:hover\\\)\\\]\\:contents\{display:contents\}/)
    })
})
