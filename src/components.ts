/**
 * Bộ component mẫu cho @porbit/style.
 *
 * Đây là "công thức" (recipe) class, không phải component đóng gói: mỗi recipe trả về
 * một chuỗi class x-css, dùng được với HTML thuần, React, Vue, Svelte... Màu, bo góc,
 * bóng đổ đều đọc từ CSS custom property `--ps-*`, nên đổi giao diện chỉ cần đổi biến.
 *
 * Quy ước ưu tiên (cascade layer):
 *   - layer 0: class nền của recipe;
 *   - layer 1: variant cần thắng class nền (`active`, `invalid`, `block`, cỡ chữ...);
 *   - layer 2 trở lên: dành cho bạn ghi đè, ví dụ `button({ class: '2bdra999px' })`.
 * Không ghi đè bằng class cùng layer: thứ tự rule theo lần xuất hiện đầu tiên trên trang,
 * không theo thứ tự class trong thuộc tính `class`.
 */

export type RecipeVariants = Record<string, Record<string, string>>

export type RecipeProps<V extends RecipeVariants> = {
    [K in keyof V]?: keyof V[K] | false | null | undefined
} & {
    /** Class bổ sung, nối vào cuối chuỗi kết quả. */
    class?: string | false | null
}

export interface RecipeConfig<V extends RecipeVariants> {
    base: string
    variants?: V
    defaultVariants?: { [K in keyof V]?: keyof V[K] }
    /** Class thêm khi tổ hợp variant khớp hoàn toàn. */
    compoundVariants?: Array<{ [K in keyof V]?: keyof V[K] } & { class: string }>
}

export interface Recipe<V extends RecipeVariants> {
    (props?: RecipeProps<V>): string
    readonly config: RecipeConfig<V>
    /** Tên các variant và giá trị hợp lệ, phục vụ tài liệu / công cụ. */
    readonly variantKeys: { [K in keyof V]: Array<keyof V[K]> }
}

/**
 * Tạo recipe có variant (tương tự `cva`). Kết quả được memo theo tổ hợp props để
 * mỗi lần render chỉ tốn một lần tra Map.
 */
export const recipe = <V extends RecipeVariants = {}>(config: RecipeConfig<V>): Recipe<V> => {
    const variants = (config.variants || {}) as V
    const variantNames = Object.keys(variants) as Array<keyof V>
    const defaults = (config.defaultVariants || {}) as Record<keyof V, string | undefined>
    const memo = new Map<string, string>()

    const fn = ((props?: RecipeProps<V>): string => {
        const selected: Record<string, string | undefined> = {}
        let key = ''
        for (const name of variantNames) {
            const raw = props?.[name]
            const value = raw === false || raw === null || raw === undefined ? defaults[name] : String(raw)
            selected[name as string] = value
            key += (value ?? '') + '|'
        }
        const extra = props?.class || ''
        key += extra

        const cached = memo.get(key)
        if (cached !== undefined) return cached

        const parts: string[] = [config.base]
        for (const name of variantNames) {
            const value = selected[name as string]
            if (value === undefined) continue
            const cls = variants[name]?.[value]
            if (cls) parts.push(cls)
        }
        for (const compound of config.compoundVariants || []) {
            const { class: cls, ...conditions } = compound
            const matches = Object.entries(conditions).every(([name, value]) => selected[name] === String(value))
            if (matches && cls) parts.push(cls)
        }
        if (extra) parts.push(extra)

        const output = parts.join(' ').replace(/\s+/g, ' ').trim()
        if (memo.size > 500) memo.clear()
        memo.set(key, output)
        return output
    }) as Recipe<V>

    const variantKeys = {} as { [K in keyof V]: Array<keyof V[K]> }
    for (const name of variantNames) variantKeys[name] = Object.keys(variants[name]) as Array<keyof V[typeof name]>

    Object.defineProperty(fn, 'config', { value: config })
    Object.defineProperty(fn, 'variantKeys', { value: variantKeys })
    return fn
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export type ThemeTokens = Record<string, string>

/** Token mặc định (chế độ sáng). Tên không kèm tiền tố `--ps-`. */
export const DEFAULT_THEME: ThemeTokens = {
    bg: '#f8fafc',
    surface: '#ffffff',
    fg: '#0f172a',
    'muted': '#f1f5f9',
    'muted-hover': '#e2e8f0',
    'muted-fg': '#64748b',
    border: '#e2e8f0',
    'border-strong': '#cbd5e1',
    primary: '#2563eb',
    'primary-hover': '#1d4ed8',
    'primary-fg': '#ffffff',
    'primary-soft': '#eff6ff',
    success: '#15803d',
    'success-soft': '#f0fdf4',
    warning: '#b45309',
    'warning-soft': '#fffbeb',
    danger: '#dc2626',
    'danger-hover': '#b91c1c',
    'danger-fg': '#ffffff',
    'danger-soft': '#fef2f2',
    info: '#0369a1',
    'info-soft': '#f0f9ff',
    ring: 'rgba(37, 99, 235, 0.35)',
    radius: '8px',
    'radius-lg': '12px',
    shadow: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.1)',
    'shadow-lg': '0 10px 30px rgba(15, 23, 42, 0.16)',
    font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}

/** Token chế độ tối; chỉ cần khai báo các token khác bản sáng. */
export const DEFAULT_DARK_THEME: ThemeTokens = {
    bg: '#020617',
    surface: '#0f172a',
    fg: '#e2e8f0',
    muted: '#1e293b',
    'muted-hover': '#334155',
    'muted-fg': '#94a3b8',
    border: '#1e293b',
    'border-strong': '#334155',
    primary: '#3b82f6',
    'primary-hover': '#60a5fa',
    'primary-soft': '#172554',
    success: '#4ade80',
    'success-soft': '#052e16',
    warning: '#fbbf24',
    'warning-soft': '#422006',
    danger: '#ef4444',
    'danger-hover': '#f87171',
    'danger-soft': '#450a0a',
    info: '#38bdf8',
    'info-soft': '#082f49',
    ring: 'rgba(59, 130, 246, 0.45)',
    shadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
    'shadow-lg': '0 10px 30px rgba(0, 0, 0, 0.6)',
}

const SAFE_TOKEN_NAME = /^[a-zA-Z0-9-]+$/
const UNSAFE_TOKEN_VALUE = /[{}<;]|\/\*/

const declareTokens = (tokens: ThemeTokens): string =>
    Object.entries(tokens)
        .filter(([name, value]) => SAFE_TOKEN_NAME.test(name) && typeof value === 'string' && !UNSAFE_TOKEN_VALUE.test(value))
        .map(([name, value]) => `--ps-${name}:${value}`)
        .join(';')

export interface ComponentThemeOptions {
    /** Ghi đè token chế độ sáng. */
    light?: ThemeTokens
    /** Ghi đè token chế độ tối. Đặt `false` để không sinh chế độ tối. */
    dark?: ThemeTokens | false
    /** `media` (mặc định): theo hệ điều hành. `class`: theo class `.dark` trên phần tử cha. */
    darkMode?: 'media' | 'class'
    /** Selector gốc nhận token. Mặc định `:root`. */
    selector?: string
}

/**
 * Sinh CSS khai báo token `--ps-*` và keyframes dùng bởi component.
 * Truyền kết quả vào tuỳ chọn `base` của engine, hoặc nhúng trong thẻ `<style>`.
 */
export const createComponentTheme = (options: ComponentThemeOptions = {}): string => {
    const selector = options.selector || ':root'
    const light = { ...DEFAULT_THEME, ...(options.light || {}) }
    const parts = [`${selector}{${declareTokens(light)}}`]

    if (options.dark !== false) {
        const dark = declareTokens({ ...DEFAULT_DARK_THEME, ...(options.dark || {}) })
        if (options.darkMode === 'class') {
            parts.push(`.dark{${dark}}`)
        } else {
            parts.push(`@media (prefers-color-scheme: dark){${selector}{${dark}}}`)
        }
    }

    parts.push('@keyframes ps-spin{to{transform:rotate(360deg)}}')
    parts.push('@keyframes ps-pulse{50%{opacity:.5}}')
    return parts.join('\n')
}

/** CSS theme mặc định, dùng ngay: `xcss.cssObserve(document, { base: componentTheme })`. */
export const componentTheme = createComponentTheme()

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

const FOCUS_RING = 'oliN@:focus-visible bxsh[0_0_0_3px_var(--ps-ring)]@:focus-visible'

export const button = recipe({
    base: `dIF aiC jcC gap8px bdN bdra--ps-radius ff--ps-font fnw600 lh1 tdN wsNowrap crP usN tran[background-color_.15s,color_.15s,box-shadow_.15s] ${FOCUS_RING} opc.5@:disabled crNa@:disabled`,
    variants: {
        variant: {
            solid: 'bgc--ps-primary c--ps-primary-fg bgc--ps-primary-hover@:hover',
            secondary: 'bgc--ps-muted c--ps-fg bgc--ps-muted-hover@:hover',
            outline: 'bgcTransparent c--ps-fg bxsh[inset_0_0_0_1px_var(--ps-border-strong)] bgc--ps-muted@:hover',
            ghost: 'bgcTransparent c--ps-fg bgc--ps-muted@:hover',
            danger: 'bgc--ps-danger c--ps-danger-fg bgc--ps-danger-hover@:hover',
            link: 'bgcTransparent c--ps-primary 1p0 1h[auto] tdU@:hover',
        },
        size: {
            sm: 'h32px p0;12px fns13px',
            md: 'h40px p0;16px fns14px',
            lg: 'h48px p0;24px fns16px',
            icon: 'w40px h40px p0 fns16px',
        },
        block: {
            true: '1dF w100%',
        },
    },
    defaultVariants: { variant: 'solid', size: 'md' },
})

export const badge = recipe({
    base: 'dIF aiC gap4px h22px p0;8px bdra999px ff--ps-font fns12px fnw600 lh1 wsNowrap',
    variants: {
        tone: {
            neutral: 'bgc--ps-muted c--ps-fg',
            primary: 'bgc--ps-primary-soft c--ps-primary',
            success: 'bgc--ps-success-soft c--ps-success',
            warning: 'bgc--ps-warning-soft c--ps-warning',
            danger: 'bgc--ps-danger-soft c--ps-danger',
            info: 'bgc--ps-info-soft c--ps-info',
        },
    },
    defaultVariants: { tone: 'neutral' },
})

export const card = recipe({
    base: 'dF fxdC bgc--ps-surface c--ps-fg ff--ps-font bd[1px_solid_var(--ps-border)] bdra--ps-radius-lg oflH',
    variants: {
        elevated: {
            true: 'bxsh--ps-shadow-lg 1bdc[transparent]',
            false: 'bxsh--ps-shadow',
        },
        interactive: {
            true: 'tran[box-shadow_.2s,transform_.2s] crP tra[translateY(-2px)]@:hover bxsh--ps-shadow-lg@:hover',
        },
    },
    defaultVariants: { elevated: 'false' },
})

export const cardHeader = recipe({ base: 'dF fxdC gap4px p20px;20px;0' })
export const cardTitle = recipe({ base: 'm0 fns18px fnw600 lh1.4 c--ps-fg' })
export const cardDescription = recipe({ base: 'm0 fns14px lh1.5 c--ps-muted-fg' })
export const cardBody = recipe({ base: 'p20px fns14px lh1.6' })
export const cardFooter = recipe({ base: 'dF aiC jcE gap8px p12px;20px bdt[1px_solid_var(--ps-border)] bgc--ps-muted' })

export const label = recipe({ base: 'dB mb6px ff--ps-font fns14px fnw500 c--ps-fg' })

export const input = recipe({
    base: `dB w100% bxsz[border-box] p0;12px bgc--ps-surface c--ps-fg ff--ps-font fns14px bd[1px_solid_var(--ps-border-strong)] bdra--ps-radius oliN tran[border-color_.15s,box-shadow_.15s] bdc--ps-primary@:focus bxsh[0_0_0_3px_var(--ps-ring)]@:focus c--ps-muted-fg@::placeholder opc.6@:disabled crNa@:disabled`,
    variants: {
        size: {
            sm: 'h32px 1fns13px',
            md: 'h40px',
            lg: 'h48px 1fns16px',
        },
        invalid: {
            true: '1bdc--ps-danger 1bxsh[0_0_0_3px_var(--ps-danger-soft)]@:focus',
        },
    },
    defaultVariants: { size: 'md' },
})

export const textarea = recipe({
    base: `dB w100% bxsz[border-box] mih96px p10px;12px bgc--ps-surface c--ps-fg ff--ps-font fns14px lh1.5 bd[1px_solid_var(--ps-border-strong)] bdra--ps-radius oliN rsz[vertical] bdc--ps-primary@:focus bxsh[0_0_0_3px_var(--ps-ring)]@:focus c--ps-muted-fg@::placeholder`,
})

export const select = recipe({
    base: `dB w100% bxsz[border-box] h40px p0;36px;0;12px bgc--ps-surface c--ps-fg ff--ps-font fns14px bd[1px_solid_var(--ps-border-strong)] bdra--ps-radius oliN apN crP bgi[linear-gradient(45deg,transparent_50%,currentColor_50%),linear-gradient(135deg,currentColor_50%,transparent_50%)] bgp[calc(100%_-_18px)_50%,calc(100%_-_13px)_50%] bgs[5px_5px,5px_5px] bgr[no-repeat] bdc--ps-primary@:focus bxsh[0_0_0_3px_var(--ps-ring)]@:focus`,
})

export const checkbox = recipe({
    base: 'w16px h16px m0 crP acc--ps-primary',
})

export const helperText = recipe({
    base: 'mt6px mb0 ff--ps-font fns13px',
    variants: {
        tone: {
            muted: 'c--ps-muted-fg',
            danger: 'c--ps-danger',
        },
    },
    defaultVariants: { tone: 'muted' },
})

export const alert = recipe({
    base: 'dF gap12px p12px;16px bdra--ps-radius ff--ps-font fns14px lh1.5 bd[1px_solid_currentColor]',
    variants: {
        tone: {
            info: 'bgc--ps-info-soft c--ps-info',
            success: 'bgc--ps-success-soft c--ps-success',
            warning: 'bgc--ps-warning-soft c--ps-warning',
            danger: 'bgc--ps-danger-soft c--ps-danger',
        },
    },
    defaultVariants: { tone: 'info' },
})

export const avatar = recipe({
    base: 'dIF aiC jcC fxs0 bdra50% oflH bgc--ps-primary-soft c--ps-primary ff--ps-font fnw600 usN',
    variants: {
        size: {
            sm: 'w32px h32px fns12px',
            md: 'w40px h40px fns14px',
            lg: 'w56px h56px fns18px',
        },
    },
    defaultVariants: { size: 'md' },
})

export const navbar = recipe({
    base: 'posSt t0 z40 dF aiC jcSp gap16px h64px p0;24px bgc--ps-surface c--ps-fg ff--ps-font bdb[1px_solid_var(--ps-border)]',
})

export const navLink = recipe({
    base: 'dIF aiC h36px p0;12px bdra--ps-radius fns14px fnw500 tdN c--ps-muted-fg tran[color_.15s,background-color_.15s] c--ps-fg@:hover bgc--ps-muted@:hover',
    variants: {
        active: {
            true: '1c--ps-fg 1bgc--ps-muted',
        },
    },
})

export const tabs = recipe({
    base: 'dF gap4px p4px bgc--ps-muted bdra--ps-radius ff--ps-font',
})

export const tab = recipe({
    base: `fx1 h32px p0;12px wsNowrap bdN bdra6px bgcTransparent c--ps-muted-fg fns14px fnw500 crP tran[background-color_.15s,color_.15s] c--ps-fg@:hover ${FOCUS_RING}`,
    variants: {
        active: {
            true: '1bgc--ps-surface 1c--ps-fg 1bxsh--ps-shadow',
        },
    },
})

export const table = recipe({
    base: 'w100% bdcl[collapse] ff--ps-font fns14px c--ps-fg',
})
export const tableHead = recipe({
    base: 'p10px;12px taL fns12px fnw600 ttrU lts.04em c--ps-muted-fg bgc--ps-muted bdb[1px_solid_var(--ps-border)]',
})
export const tableCell = recipe({
    base: 'p12px bdb[1px_solid_var(--ps-border)]',
})
export const tableRow = recipe({
    base: 'bgc--ps-muted@:hover',
})

export const modalOverlay = recipe({
    base: 'posF i0 z50 dF aiC jcC p16px bgc[rgba(15,23,42,.55)]',
})
export const modal = recipe({
    base: 'w100% mw480px mh[calc(100vh_-_32px)] oflyA bgc--ps-surface c--ps-fg ff--ps-font bdra--ps-radius-lg bxsh--ps-shadow-lg',
})

export const progress = recipe({
    base: 'w100% h8px oflH bgc--ps-muted bdra999px',
})
export const progressBar = recipe({
    base: 'h100% bgc--ps-primary bdra999px tran[width_.3s_ease]',
})

export const skeleton = recipe({
    base: 'dB bgc--ps-muted bdra--ps-radius ani[ps-pulse_1.5s_ease-in-out_infinite]',
})

export const spinner = recipe({
    base: 'dIB w20px h20px bdra50% bd[2px_solid_currentColor] bdrc[transparent] ani[ps-spin_.7s_linear_infinite]',
})

export const breadcrumb = recipe({
    base: 'dF aiC fxw[wrap] gap8px m0 p0 lsN ff--ps-font fns14px c--ps-muted-fg',
})

export const pagination = recipe({
    base: 'dF aiC gap4px ff--ps-font',
})
export const pageItem = recipe({
    base: `dIF aiC jcC miw36px h36px p0;8px bdN bdra--ps-radius bgcTransparent c--ps-fg fns14px crP bgc--ps-muted@:hover ${FOCUS_RING}`,
    variants: {
        active: {
            true: '1bgc--ps-primary 1c--ps-primary-fg 1bgc--ps-primary-hover@:hover',
        },
    },
})

export const tooltip = recipe({
    base: 'posR dIB',
})
export const tooltipContent = recipe({
    base: 'posA b[calc(100%_+_8px)] l50% tra[translateX(-50%)] z60 p6px;10px bdra6px bgc--ps-fg c--ps-surface ff--ps-font fns12px wsNowrap peN opc0 v[hidden] tran[opacity_.15s]',
})

export const container = recipe({
    base: 'w100% mw1200px m0;auto p0;16px bxsz[border-box] md:p0;24px',
})

export const stack = recipe({
    base: 'dF fxdC',
    variants: {
        gap: { sm: 'gap8px', md: 'gap16px', lg: 'gap24px' },
    },
    defaultVariants: { gap: 'md' },
})

export const grid = recipe({
    base: 'dG gtc1fr gap16px',
    variants: {
        cols: {
            '2': 'md:gtc[repeat(2,minmax(0,1fr))]',
            '3': 'md:gtc[repeat(2,minmax(0,1fr))] lg:gtc[repeat(3,minmax(0,1fr))]',
            '4': 'md:gtc[repeat(2,minmax(0,1fr))] lg:gtc[repeat(4,minmax(0,1fr))]',
        },
    },
    defaultVariants: { cols: '3' },
})

/** Toàn bộ recipe theo tên, tiện tra cứu động. */
export const ui = {
    alert,
    avatar,
    badge,
    breadcrumb,
    button,
    card,
    cardBody,
    cardDescription,
    cardFooter,
    cardHeader,
    cardTitle,
    checkbox,
    container,
    grid,
    helperText,
    input,
    label,
    modal,
    modalOverlay,
    navLink,
    navbar,
    pageItem,
    pagination,
    progress,
    progressBar,
    select,
    skeleton,
    spinner,
    stack,
    tab,
    table,
    tableCell,
    tableHead,
    tableRow,
    tabs,
    textarea,
    tooltip,
    tooltipContent,
} as const

export type UiRecipeName = keyof typeof ui

// ---------------------------------------------------------------------------
// Snippet HTML (dùng cho tài liệu, demo, MCP)
// ---------------------------------------------------------------------------

export interface ComponentSnippet {
    name: string
    title: string
    description: string
    /** Recipe được dùng trong snippet. */
    recipes: UiRecipeName[]
    html: string
}

const h = (strings: TemplateStringsArray, ...values: string[]): string =>
    strings.reduce((out, chunk, i) => out + chunk + (values[i] ?? ''), '').replace(/^\n+|\s+$/g, '')

export const COMPONENT_SNIPPETS: ComponentSnippet[] = [
    {
        name: 'button',
        title: 'Button',
        description: 'Nút bấm với 6 kiểu (solid, secondary, outline, ghost, danger, link) và 4 cỡ.',
        recipes: ['button'],
        html: h`
<button class="${button()}">Lưu thay đổi</button>
<button class="${button({ variant: 'secondary' })}">Huỷ</button>
<button class="${button({ variant: 'outline' })}">Xuất file</button>
<button class="${button({ variant: 'ghost', size: 'sm' })}">Bỏ qua</button>
<button class="${button({ variant: 'danger' })}">Xoá</button>
<button class="${button({ size: 'lg' })}" disabled>Đang xử lý</button>`,
    },
    {
        name: 'badge',
        title: 'Badge',
        description: 'Nhãn trạng thái nhỏ theo tông màu.',
        recipes: ['badge'],
        html: h`
<span class="${badge()}">Nháp</span>
<span class="${badge({ tone: 'primary' })}">Mới</span>
<span class="${badge({ tone: 'success' })}">Hoạt động</span>
<span class="${badge({ tone: 'warning' })}">Chờ duyệt</span>
<span class="${badge({ tone: 'danger' })}">Lỗi</span>`,
    },
    {
        name: 'card',
        title: 'Card',
        description: 'Khung nội dung có header, body, footer.',
        recipes: ['card', 'cardHeader', 'cardTitle', 'cardDescription', 'cardBody', 'cardFooter', 'button'],
        html: h`
<article class="${card()} mw380px">
  <header class="${cardHeader()}">
    <h3 class="${cardTitle()}">Gói Pro</h3>
    <p class="${cardDescription()}">Dành cho nhóm nhỏ cần cộng tác.</p>
  </header>
  <div class="${cardBody()}">Không giới hạn dự án, 20 GB lưu trữ, hỗ trợ ưu tiên.</div>
  <footer class="${cardFooter()}">
    <button class="${button({ variant: 'ghost', size: 'sm' })}">Tìm hiểu</button>
    <button class="${button({ size: 'sm' })}">Nâng cấp</button>
  </footer>
</article>`,
    },
    {
        name: 'form',
        title: 'Form field',
        description: 'Label, input, select, textarea, checkbox và helper text, kèm trạng thái lỗi.',
        recipes: ['label', 'input', 'select', 'textarea', 'checkbox', 'helperText', 'stack', 'button'],
        html: h`
<form class="${stack()} w100% mw420px">
  <div>
    <label class="${label()}" for="email">Email</label>
    <input class="${input()}" id="email" type="email" placeholder="ban@vidu.vn" />
  </div>
  <div>
    <label class="${label()}" for="pass">Mật khẩu</label>
    <input class="${input({ invalid: 'true' })}" id="pass" type="password" aria-invalid="true" />
    <p class="${helperText({ tone: 'danger' })}">Mật khẩu cần ít nhất 8 ký tự.</p>
  </div>
  <div>
    <label class="${label()}" for="role">Vai trò</label>
    <select class="${select()}" id="role"><option>Quản trị</option><option>Thành viên</option></select>
  </div>
  <div>
    <label class="${label()}" for="note">Ghi chú</label>
    <textarea class="${textarea()}" id="note" placeholder="Tuỳ chọn"></textarea>
  </div>
  <label class="dF aiC gap8px fns14px"><input class="${checkbox()}" type="checkbox" checked /> Ghi nhớ đăng nhập</label>
  <button class="${button({ block: 'true' })}" type="submit">Đăng nhập</button>
</form>`,
    },
    {
        name: 'alert',
        title: 'Alert',
        description: 'Thông báo nội tuyến theo 4 tông: info, success, warning, danger.',
        recipes: ['alert', 'stack'],
        html: h`
<div class="${stack({ gap: 'sm' })} w100%">
  <div class="${alert()}" role="status"><strong>Lưu ý:</strong> Bản cập nhật sẽ chạy lúc 2 giờ sáng.</div>
  <div class="${alert({ tone: 'success' })}" role="status">Đã lưu thay đổi.</div>
  <div class="${alert({ tone: 'warning' })}" role="status">Dung lượng sắp đầy (92%).</div>
  <div class="${alert({ tone: 'danger' })}" role="alert">Không kết nối được máy chủ.</div>
</div>`,
    },
    {
        name: 'avatar',
        title: 'Avatar',
        description: 'Ảnh đại diện hoặc chữ viết tắt, 3 cỡ.',
        recipes: ['avatar'],
        html: h`
<span class="${avatar({ size: 'sm' })}">AN</span>
<span class="${avatar()}">BT</span>
<span class="${avatar({ size: 'lg' })}"><img class="w100% h100% ofC" src="https://picsum.photos/seed/ps/112" alt="" /></span>`,
    },
    {
        name: 'navbar',
        title: 'Navbar',
        description: 'Thanh điều hướng dính đầu trang, ẩn menu trên màn hình nhỏ.',
        recipes: ['navbar', 'navLink', 'button'],
        html: h`
<nav class="${navbar()}">
  <a class="fnw700 fns18px tdN c--ps-fg" href="#">Presence</a>
  <div class="dF aiC gap4px sma:dN">
    <a class="${navLink({ active: 'true' })}" href="#">Tổng quan</a>
    <a class="${navLink()}" href="#">Dự án</a>
    <a class="${navLink()}" href="#">Báo cáo</a>
  </div>
  <button class="${button({ size: 'sm' })}">Đăng nhập</button>
</nav>`,
    },
    {
        name: 'tabs',
        title: 'Tabs',
        description: 'Thanh tab dạng segmented control.',
        recipes: ['tabs', 'tab'],
        html: h`
<div class="${tabs()} w100% mw420px" role="tablist">
  <button class="${tab({ active: 'true' })}" role="tab" aria-selected="true">Tài khoản</button>
  <button class="${tab()}" role="tab" aria-selected="false">Bảo mật</button>
  <button class="${tab()}" role="tab" aria-selected="false">Thông báo</button>
</div>`,
    },
    {
        name: 'table',
        title: 'Table',
        description: 'Bảng dữ liệu có header và hover theo hàng.',
        recipes: ['table', 'tableHead', 'tableCell', 'tableRow', 'badge'],
        html: h`
<table class="${table()}">
  <thead><tr><th class="${tableHead()}">Khách hàng</th><th class="${tableHead()}">Trạng thái</th><th class="${tableHead()} 2taR">Số tiền</th></tr></thead>
  <tbody>
    <tr class="${tableRow()}"><td class="${tableCell()}">Nguyễn An</td><td class="${tableCell()}"><span class="${badge({ tone: 'success' })}">Đã thanh toán</span></td><td class="${tableCell()} taR">1.200.000 ₫</td></tr>
    <tr class="${tableRow()}"><td class="${tableCell()}">Trần Bình</td><td class="${tableCell()}"><span class="${badge({ tone: 'warning' })}">Chờ xử lý</span></td><td class="${tableCell()} taR">850.000 ₫</td></tr>
  </tbody>
</table>`,
    },
    {
        name: 'modal',
        title: 'Modal',
        description: 'Hộp thoại có lớp phủ, cuộn nội dung khi dài.',
        recipes: ['modalOverlay', 'modal', 'cardHeader', 'cardTitle', 'cardDescription', 'cardFooter', 'button'],
        html: h`
<div class="${modalOverlay()}" role="presentation">
  <div class="${modal()}" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
    <div class="${cardHeader()} 2pb20px">
      <h2 class="${cardTitle()}" id="dlg-title">Xoá dự án?</h2>
      <p class="${cardDescription()}">Thao tác này không hoàn tác được.</p>
    </div>
    <div class="${cardFooter()}">
      <button class="${button({ variant: 'secondary', size: 'sm' })}">Huỷ</button>
      <button class="${button({ variant: 'danger', size: 'sm' })}">Xoá</button>
    </div>
  </div>
</div>`,
    },
    {
        name: 'feedback',
        title: 'Progress, Skeleton, Spinner',
        description: 'Chỉ báo tiến trình và trạng thái đang tải.',
        recipes: ['progress', 'progressBar', 'skeleton', 'spinner', 'stack'],
        html: h`
<div class="${stack()} w100% mw360px">
  <div class="${progress()}" role="progressbar" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100"><div class="${progressBar()}" style="width:64%"></div></div>
  <div class="${stack({ gap: 'sm' })}">
    <div class="${skeleton()} h16px w60%"></div>
    <div class="${skeleton()} h16px w100%"></div>
    <div class="${skeleton()} h16px w80%"></div>
  </div>
  <span class="${spinner()} c--ps-primary" role="status" aria-label="Đang tải"></span>
</div>`,
    },
    {
        name: 'navigation',
        title: 'Breadcrumb, Pagination',
        description: 'Đường dẫn vị trí và phân trang.',
        recipes: ['breadcrumb', 'pagination', 'pageItem'],
        html: h`
<ol class="${breadcrumb()}">
  <li><a class="c--ps-muted-fg tdN c--ps-fg@:hover" href="#">Trang chủ</a></li><li aria-hidden="true">/</li>
  <li><a class="c--ps-muted-fg tdN c--ps-fg@:hover" href="#">Dự án</a></li><li aria-hidden="true">/</li>
  <li class="c--ps-fg fnw500" aria-current="page">Website</li>
</ol>
<nav class="${pagination()}" aria-label="Phân trang">
  <button class="${pageItem()}">‹</button>
  <button class="${pageItem()}">1</button>
  <button class="${pageItem({ active: 'true' })}" aria-current="page">2</button>
  <button class="${pageItem()}">3</button>
  <button class="${pageItem()}">›</button>
</nav>`,
    },
    {
        name: 'tooltip',
        title: 'Tooltip',
        description: 'Chú thích hiện khi hover hoặc focus phần tử cha (dùng selector `@:hover;>;*`).',
        recipes: ['tooltip', 'tooltipContent', 'button'],
        html: h`
<span class="${tooltip()} opc1@:hover;>;[role=tooltip] v[visible]@:hover;>;[role=tooltip] opc1@:focus-within;>;[role=tooltip] v[visible]@:focus-within;>;[role=tooltip]">
  <button class="${button({ variant: 'outline', size: 'sm' })}">Di chuột vào đây</button>
  <span class="${tooltipContent()}" role="tooltip">Sao chép liên kết</span>
</span>`,
    },
    {
        name: 'pricing',
        title: 'Pricing grid',
        description: 'Lưới bảng giá responsive: 1 cột → 3 cột.',
        recipes: ['container', 'grid', 'card', 'cardHeader', 'cardTitle', 'cardDescription', 'cardBody', 'cardFooter', 'badge', 'button'],
        html: h`
<section class="${container()} p32px;16px">
  <div class="${grid()}">
    <article class="${card()}">
      <header class="${cardHeader()}"><h3 class="${cardTitle()}">Free</h3><p class="${cardDescription()}">Cho cá nhân.</p></header>
      <div class="${cardBody()}"><p class="m0 fns32px fnw700">0 ₫</p></div>
      <footer class="${cardFooter()}"><button class="${button({ variant: 'outline', block: 'true' })}">Bắt đầu</button></footer>
    </article>
    <article class="${card({ elevated: 'true' })} 2bdc--ps-primary">
      <header class="${cardHeader()}"><h3 class="${cardTitle()} dF aiC gap8px">Pro <span class="${badge({ tone: 'primary' })}">Phổ biến</span></h3><p class="${cardDescription()}">Cho nhóm nhỏ.</p></header>
      <div class="${cardBody()}"><p class="m0 fns32px fnw700">199.000 ₫</p></div>
      <footer class="${cardFooter()}"><button class="${button({ block: 'true' })}">Nâng cấp</button></footer>
    </article>
    <article class="${card()}">
      <header class="${cardHeader()}"><h3 class="${cardTitle()}">Business</h3><p class="${cardDescription()}">Cho doanh nghiệp.</p></header>
      <div class="${cardBody()}"><p class="m0 fns32px fnw700">Liên hệ</p></div>
      <footer class="${cardFooter()}"><button class="${button({ variant: 'secondary', block: 'true' })}">Liên hệ</button></footer>
    </article>
  </div>
</section>`,
    },
]

/** Tra một snippet theo tên (không phân biệt hoa thường). */
export const getComponentSnippet = (name: string): ComponentSnippet | undefined => {
    const key = String(name || '').toLowerCase()
    return COMPONENT_SNIPPETS.find((item) => item.name === key)
}
