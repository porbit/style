import { parseClassName } from './parser'

export type TailwindConversionStatus = 'converted' | 'passthrough' | 'unsupported'
export type TailwindTokenClassification = 'tailwind' | 'xcss' | 'ambiguous' | 'unknown'
export type TailwindConversionMode = 'legacy' | 'safe' | 'strict'

export interface TailwindConversionWarning {
    token: string
    message: string
    /** true khi cảnh báo khiến token không thể đổi an toàn (token được giữ nguyên hoặc bị loại). */
    blocking?: boolean
}

export interface TailwindTokenConversion {
    input: string
    outputs: string[]
    status: TailwindConversionStatus
    classification: TailwindTokenClassification
    exact: boolean
    warnings: TailwindConversionWarning[]
}

type TailwindBaseTokenConversion = Omit<TailwindTokenConversion, 'classification'>

export interface TailwindConversionResult {
    input: string
    output: string
    details: TailwindTokenConversion[]
    converted: string[]
    passthrough: string[]
    unsupported: string[]
    ambiguous: string[]
    warnings: TailwindConversionWarning[]
}

export interface TailwindConversionOptions {
    preserveUnknown?: boolean
    mode?: TailwindConversionMode
    /**
     * Cách đổi biến thể `dark:`. `media` (mặc định) dùng media key `dark` và cần khai báo
     * `breakpoints: [{ dark: '(prefers-color-scheme: dark)' }]`; `class` dùng tổ tiên `.dark`.
     */
    darkMode?: 'media' | 'class'
}

const DEFAULT_OPTIONS: Required<TailwindConversionOptions> = {
    preserveUnknown: true,
    mode: 'legacy',
    darkMode: 'media',
}

const RESPONSIVE_VARIANTS = new Set(['xs', 'sm', 'md', 'lg', 'xl', '2xl'])

const SELECTOR_VARIANTS: Record<string, string> = {
    hover: ':hover',
    focus: ':focus',
    active: ':active',
    visited: ':visited',
    disabled: ':disabled',
    checked: ':checked',
    'focus-within': ':focus-within',
    'focus-visible': ':focus-visible',
    first: ':first-child',
    last: ':last-child',
    odd: ':nth-child(odd)',
    even: ':nth-child(even)',
    before: '::before',
    after: '::after',
    placeholder: '::placeholder',
    selection: '::selection',
}

const TAILWIND_ONLY_VARIANTS = new Set([
    ...Object.keys(SELECTOR_VARIANTS),
    'dark',
    'group-hover',
    'group-focus',
    'group-focus-within',
    'peer-hover',
    'peer-focus',
    'placeholder',
    'before',
    'after',
    'selection',
])

const SPACING_SCALE: Record<string, string> = {
    '0': '0',
    px: '1px',
    '0.5': '2px',
    '1': '4px',
    '1.5': '6px',
    '2': '8px',
    '2.5': '10px',
    '3': '12px',
    '3.5': '14px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '7': '28px',
    '8': '32px',
    '9': '36px',
    '10': '40px',
    '11': '44px',
    '12': '48px',
    '14': '56px',
    '16': '64px',
    '20': '80px',
    '24': '96px',
    '28': '112px',
    '32': '128px',
    '36': '144px',
    '40': '160px',
    '44': '176px',
    '48': '192px',
    '52': '208px',
    '56': '224px',
    '60': '240px',
    '64': '256px',
    '72': '288px',
    '80': '320px',
    '96': '384px',
}

const RADIUS_SCALE: Record<string, string> = {
    none: '0',
    sm: '2px',
    DEFAULT: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px',
}

const FONT_SIZE_SCALE: Record<string, string> = {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
    '6xl': '60px',
    '7xl': '72px',
    '8xl': '96px',
    '9xl': '128px',
}

const FONT_WEIGHT_SCALE: Record<string, string> = {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
}

const LINE_HEIGHT_SCALE: Record<string, string> = {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '7': '28px',
    '8': '32px',
    '9': '36px',
    '10': '40px',
}

const LETTER_SPACING_SCALE: Record<string, string> = {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
}

const SHADOW_SCALE: Record<string, string> = {
    sm: '[0;1px;2px;0;rgb(0;0;0;/;0.05)]',
    DEFAULT: '[0;1px;3px;0;rgb(0;0;0;/;0.1),0;1px;2px;-1px;rgb(0;0;0;/;0.1)]',
    md: '[0;4px;6px;-1px;rgb(0;0;0;/;0.1),0;2px;4px;-2px;rgb(0;0;0;/;0.1)]',
    lg: '[0;10px;15px;-3px;rgb(0;0;0;/;0.1),0;4px;6px;-4px;rgb(0;0;0;/;0.1)]',
    xl: '[0;20px;25px;-5px;rgb(0;0;0;/;0.1),0;8px;10px;-6px;rgb(0;0;0;/;0.1)]',
    '2xl': '[0;25px;50px;-12px;rgb(0;0;0;/;0.25)]',
    none: '[none]',
}

const SIZE_KEYWORDS: Record<string, string> = {
    auto: 'auto',
    full: '100%',
    screen: '100vw',
    dvw: '100dvw',
    svw: '100svw',
    lvw: '100lvw',
    min: 'min-content',
    max: 'max-content',
    fit: 'fit-content',
}

const HEIGHT_KEYWORDS: Record<string, string> = {
    auto: 'auto',
    full: '100%',
    screen: '100vh',
    dvh: '100dvh',
    svh: '100svh',
    lvh: '100lvh',
    min: 'min-content',
    max: 'max-content',
    fit: 'fit-content',
}

const WIDTH_SCALE: Record<string, string> = {
    xs: '20rem',
    sm: '24rem',
    md: '28rem',
    lg: '32rem',
    xl: '36rem',
    '2xl': '42rem',
    '3xl': '48rem',
    '4xl': '56rem',
    '5xl': '64rem',
    '6xl': '72rem',
    '7xl': '80rem',
}

const encodeBracketValue = (value: string): string => `[${value.replace(/ /g, ';')}]`

const encodeXcssValue = (value: string): string => {
    if (!value) return value
    if (value.startsWith('[') && value.endsWith(']')) return value

    const first = value[0]
    if (first === '#' || first === '!' || first === '-' || /[0-9]/.test(first)) {
        return value
    }

    if (/[(),/:]/.test(value) || /\s/.test(value)) {
        return encodeBracketValue(value)
    }

    return `${first.toUpperCase()}${value.slice(1)}`
}

const buildValueToken = (property: string, value: string): string => `${property}${encodeXcssValue(value)}`

const COLOR_SCALE: Record<string, string> = {
    transparent: 'transparent',
    current: 'currentColor',
    inherit: 'inherit',
    white: '#ffffff',
    black: '#000000',
    'slate-50': '#f8fafc',
    'slate-100': '#f1f5f9',
    'slate-200': '#e2e8f0',
    'slate-300': '#cbd5e1',
    'slate-400': '#94a3b8',
    'slate-500': '#64748b',
    'slate-600': '#475569',
    'slate-700': '#334155',
    'slate-800': '#1e293b',
    'slate-900': '#0f172a',
    'gray-50': '#f9fafb',
    'gray-100': '#f3f4f6',
    'gray-200': '#e5e7eb',
    'gray-300': '#d1d5db',
    'gray-400': '#9ca3af',
    'gray-500': '#6b7280',
    'gray-600': '#4b5563',
    'gray-700': '#374151',
    'gray-800': '#1f2937',
    'gray-900': '#111827',
    'red-50': '#fef2f2',
    'red-100': '#fee2e2',
    'red-200': '#fecaca',
    'red-300': '#fca5a5',
    'red-400': '#f87171',
    'red-500': '#ef4444',
    'red-600': '#dc2626',
    'red-700': '#b91c1c',
    'red-800': '#991b1b',
    'red-900': '#7f1d1d',
    'orange-50': '#fff7ed',
    'orange-100': '#ffedd5',
    'orange-200': '#fed7aa',
    'orange-300': '#fdba74',
    'orange-400': '#fb923c',
    'orange-500': '#f97316',
    'orange-600': '#ea580c',
    'orange-700': '#c2410c',
    'orange-800': '#9a3412',
    'orange-900': '#7c2d12',
    'amber-50': '#fffbeb',
    'amber-100': '#fef3c7',
    'amber-200': '#fde68a',
    'amber-300': '#fcd34d',
    'amber-400': '#fbbf24',
    'amber-500': '#f59e0b',
    'amber-600': '#d97706',
    'amber-700': '#b45309',
    'amber-800': '#92400e',
    'amber-900': '#78350f',
    'yellow-50': '#fefce8',
    'yellow-100': '#fef9c3',
    'yellow-200': '#fef08a',
    'yellow-300': '#fde047',
    'yellow-400': '#facc15',
    'yellow-500': '#eab308',
    'yellow-600': '#ca8a04',
    'yellow-700': '#a16207',
    'yellow-800': '#854d0e',
    'yellow-900': '#713f12',
    'green-50': '#f0fdf4',
    'green-100': '#dcfce7',
    'green-200': '#bbf7d0',
    'green-300': '#86efac',
    'green-400': '#4ade80',
    'green-500': '#22c55e',
    'green-600': '#16a34a',
    'green-700': '#15803d',
    'green-800': '#166534',
    'green-900': '#14532d',
    'emerald-50': '#ecfdf5',
    'emerald-100': '#d1fae5',
    'emerald-200': '#a7f3d0',
    'emerald-300': '#6ee7b7',
    'emerald-400': '#34d399',
    'emerald-500': '#10b981',
    'emerald-600': '#059669',
    'emerald-700': '#047857',
    'emerald-800': '#065f46',
    'emerald-900': '#064e3b',
    'blue-50': '#eff6ff',
    'blue-100': '#dbeafe',
    'blue-200': '#bfdbfe',
    'blue-300': '#93c5fd',
    'blue-400': '#60a5fa',
    'blue-500': '#3b82f6',
    'blue-600': '#2563eb',
    'blue-700': '#1d4ed8',
    'blue-800': '#1e40af',
    'blue-900': '#1e3a8a',
    'indigo-50': '#eef2ff',
    'indigo-100': '#e0e7ff',
    'indigo-200': '#c7d2fe',
    'indigo-300': '#a5b4fc',
    'indigo-400': '#818cf8',
    'indigo-500': '#6366f1',
    'indigo-600': '#4f46e5',
    'indigo-700': '#4338ca',
    'indigo-800': '#3730a3',
    'indigo-900': '#312e81',
    'violet-50': '#f5f3ff',
    'violet-100': '#ede9fe',
    'violet-200': '#ddd6fe',
    'violet-300': '#c4b5fd',
    'violet-400': '#a78bfa',
    'violet-500': '#8b5cf6',
    'violet-600': '#7c3aed',
    'violet-700': '#6d28d9',
    'violet-800': '#5b21b6',
    'violet-900': '#4c1d95',
    'purple-50': '#faf5ff',
    'purple-100': '#f3e8ff',
    'purple-200': '#e9d5ff',
    'purple-300': '#d8b4fe',
    'purple-400': '#c084fc',
    'purple-500': '#a855f7',
    'purple-600': '#9333ea',
    'purple-700': '#7e22ce',
    'purple-800': '#6b21a8',
    'purple-900': '#581c87',
    'pink-50': '#fdf2f8',
    'pink-100': '#fce7f3',
    'pink-200': '#fbcfe8',
    'pink-300': '#f9a8d4',
    'pink-400': '#f472b6',
    'pink-500': '#ec4899',
    'pink-600': '#db2777',
    'pink-700': '#be185d',
    'pink-800': '#9d174d',
    'pink-900': '#831843',
    'cyan-50': '#ecfeff',
    'cyan-100': '#cffafe',
    'cyan-200': '#a5f3fc',
    'cyan-300': '#67e8f9',
    'cyan-400': '#22d3ee',
    'cyan-500': '#06b6d4',
    'cyan-600': '#0891b2',
    'cyan-700': '#0e7490',
    'cyan-800': '#155e75',
    'cyan-900': '#164e63',
}

const DIRECT_MAP: Record<string, string[]> = {
    flex: ['dF'],
    'inline-flex': ['dIf'],
    block: ['dB'],
    'inline-block': ['dIb'],
    inline: ['dI'],
    hidden: ['dN'],
    grid: ['dG'],
    'inline-grid': ['dIg'],
    contents: ['dC'],
    relative: ['posR'],
    absolute: ['posA'],
    fixed: ['posF'],
    sticky: ['pos[sticky]'],
    static: ['posS'],
    'flex-row': ['fxd[row]'],
    'flex-col': ['fxd[column]'],
    'flex-row-reverse': ['fxd[row-reverse]'],
    'flex-col-reverse': ['fxd[column-reverse]'],
    'flex-wrap': ['fxw[wrap]'],
    'flex-nowrap': ['fxw[nowrap]'],
    'items-start': ['ai[start]'],
    'items-end': ['ai[end]'],
    'items-center': ['ai[center]'],
    'items-stretch': ['ai[stretch]'],
    'items-baseline': ['ai[baseline]'],
    'content-start': ['ac[start]'],
    'content-end': ['ac[end]'],
    'content-center': ['ac[center]'],
    'content-between': ['ac[space-between]'],
    'content-around': ['ac[space-around]'],
    'content-evenly': ['ac[space-evenly]'],
    'content-stretch': ['ac[stretch]'],
    'content-baseline': ['ac[baseline]'],
    'justify-start': ['jc[start]'],
    'justify-end': ['jc[end]'],
    'justify-center': ['jc[center]'],
    'justify-between': ['jc[space-between]'],
    'justify-around': ['jc[space-around]'],
    'justify-evenly': ['jc[space-evenly]'],
    'justify-items-start': ['ji[start]'],
    'justify-items-end': ['ji[end]'],
    'justify-items-center': ['ji[center]'],
    'justify-items-stretch': ['ji[stretch]'],
    'justify-items-baseline': ['ji[baseline]'],
    'justify-self-auto': ['js[auto]'],
    'justify-self-start': ['js[start]'],
    'justify-self-end': ['js[end]'],
    'justify-self-center': ['js[center]'],
    'justify-self-stretch': ['js[stretch]'],
    'place-items-start': ['pli[start]'],
    'place-items-end': ['pli[end]'],
    'place-items-center': ['pli[center]'],
    'place-items-stretch': ['pli[stretch]'],
    'place-content-start': ['plc[start]'],
    'place-content-end': ['plc[end]'],
    'place-content-center': ['plc[center]'],
    'place-content-between': ['plc[space-between]'],
    'place-content-around': ['plc[space-around]'],
    'place-content-evenly': ['plc[space-evenly]'],
    'place-content-stretch': ['plc[stretch]'],
    'place-self-auto': ['pls[auto]'],
    'place-self-start': ['pls[start]'],
    'place-self-end': ['pls[end]'],
    'place-self-center': ['pls[center]'],
    'place-self-stretch': ['pls[stretch]'],
    'self-auto': ['as[auto]'],
    'self-start': ['as[start]'],
    'self-end': ['as[end]'],
    'self-center': ['as[center]'],
    'self-stretch': ['as[stretch]'],
    'appearance-none': ['ap[none]'],
    'font-sans': ['ffA'],
    'font-serif': ['ffS'],
    'font-mono': ['ffM'],
    italic: ['fnsty[italic]'],
    'not-italic': ['fnsty[normal]'],
    underline: ['tdlU'],
    'line-through': ['tdlLt'],
    uppercase: ['ttrU'],
    lowercase: ['ttrL'],
    capitalize: ['ttrC'],
    truncate: ['ofl[hidden]', 'tolE', 'ws[nowrap]'],
    'whitespace-normal': ['ws[normal]'],
    'whitespace-nowrap': ['ws[nowrap]'],
    'whitespace-pre': ['ws[pre]'],
    'whitespace-pre-wrap': ['ws[pre-wrap]'],
    'text-left': ['taL'],
    'text-center': ['taC'],
    'text-right': ['taR'],
    'overflow-hidden': ['ofl[hidden]'],
    'overflow-auto': ['ofl[auto]'],
    'overflow-scroll': ['ofl[scroll]'],
    'overflow-visible': ['ofl[visible]'],
    'overflow-x-hidden': ['oflx[hidden]'],
    'overflow-x-auto': ['oflx[auto]'],
    'overflow-x-scroll': ['oflx[scroll]'],
    'overflow-y-hidden': ['ofly[hidden]'],
    'overflow-y-auto': ['ofly[auto]'],
    'overflow-y-scroll': ['ofly[scroll]'],
    'cursor-pointer': ['crP'],
    'cursor-not-allowed': ['crNa'],
    'cursor-default': ['crD'],
    'select-none': ['us[none]'],
    'rounded-none': ['bdra0'],
    rounded: [`bdra${RADIUS_SCALE.DEFAULT}`],
    'rounded-sm': [`bdra${RADIUS_SCALE.sm}`],
    'rounded-md': [`bdra${RADIUS_SCALE.md}`],
    'rounded-lg': [`bdra${RADIUS_SCALE.lg}`],
    'rounded-xl': [`bdra${RADIUS_SCALE.xl}`],
    'rounded-2xl': [`bdra${RADIUS_SCALE['2xl']}`],
    'rounded-3xl': [`bdra${RADIUS_SCALE['3xl']}`],
    'rounded-full': [`bdra${RADIUS_SCALE.full}`],
    border: ['bdw1px', 'bds[solid]', buildValueToken('bdc', 'currentColor')],
    'border-0': ['bdw0'],
    'border-2': ['bdw2px'],
    'border-4': ['bdw4px'],
    'border-8': ['bdw8px'],
    'border-solid': ['bds[solid]'],
    'border-dashed': ['bds[dashed]'],
    'border-dotted': ['bds[dotted]'],
    'shadow-sm': [`bxsh${SHADOW_SCALE.sm}`],
    shadow: [`bxsh${SHADOW_SCALE.DEFAULT}`],
    'shadow-md': [`bxsh${SHADOW_SCALE.md}`],
    'shadow-lg': [`bxsh${SHADOW_SCALE.lg}`],
    'shadow-xl': [`bxsh${SHADOW_SCALE.xl}`],
    'shadow-2xl': [`bxsh${SHADOW_SCALE['2xl']}`],
    'shadow-none': [`bxsh${SHADOW_SCALE.none}`],
    'w-full': ['w100%'],
    'w-screen': ['w100vw'],
    'w-auto': ['w[auto]'],
    'h-full': ['h100%'],
    'h-screen': ['h100vh'],
    'h-auto': ['h[auto]'],
    'min-w-full': ['miw100%'],
    'min-h-full': ['mih100%'],
    'min-h-screen': ['mih100vh'],
    'max-w-full': ['mw100%'],
    'max-h-full': ['mh100%'],
    'max-w-none': ['mw[none]'],
    'max-h-none': ['mh[none]'],
    'flex-1': ['fx1'],
    'flex-auto': ['fx[a]'],
    'flex-initial': ['fx[i]'],
    'flex-none': ['fx[none]'],
    grow: ['fxg1'],
    'grow-0': ['fxg0'],
    shrink: ['fxs1'],
    'shrink-0': ['fxs0'],
    'aspect-square': ['ar1'],
    'aspect-video': ['ar[16/9]'],
    'aspect-auto': ['ar[auto]'],
    'object-contain': ['of[contain]'],
    'object-cover': ['of[cover]'],
    'object-fill': ['of[fill]'],
    'object-none': ['of[none]'],
    'object-scale-down': ['of[scale-down]'],
    'object-center': ['op[center]'],
    'object-top': ['op[top]'],
    'object-right': ['op[right]'],
    'object-bottom': ['op[bottom]'],
    'object-left': ['op[left]'],
}

const DIRECTIONAL_ROUNDED_MAP: Record<string, string[]> = {
    'rounded-t': ['bdtlr4px', 'bdtrr4px'],
    'rounded-r': ['bdtrr4px', 'bdbrr4px'],
    'rounded-b': ['bdblr4px', 'bdbrr4px'],
    'rounded-l': ['bdtlr4px', 'bdblr4px'],
}

const TAILWIND_EXACT_UTILITIES = new Set([
    ...Object.keys(DIRECT_MAP),
    ...Object.keys(DIRECTIONAL_ROUNDED_MAP),
    'appearance-none',
    'transition',
    'sr-only',
    'not-sr-only',
    'no-underline',
    'shadow-inner',
    'divide-x',
    'divide-y',
    'border-x',
    'border-y',
    'border-t',
    'border-r',
    'border-b',
    'border-l',
    'container',
])

const TAILWIND_PREFIXES = [
    'p-',
    'px-',
    'py-',
    'pt-',
    'pr-',
    'pb-',
    'pl-',
    'm-',
    'mx-',
    'my-',
    'mt-',
    'mr-',
    'mb-',
    'ml-',
    'gap-',
    'gap-x-',
    'gap-y-',
    'top-',
    'right-',
    'bottom-',
    'left-',
    'inset-',
    'inset-x-',
    'inset-y-',
    'w-',
    'h-',
    'min-w-',
    'min-h-',
    'max-w-',
    'max-h-',
    'size-',
    'bg-',
    'text-',
    'border-',
    'placeholder-',
    'divide-',
    'rounded-',
    'font-',
    'leading-',
    'tracking-',
    'opacity-',
    'z-',
    'shadow-',
    'duration-',
    'ease-',
    'delay-',
    'translate-',
    'scale-',
    'rotate-',
    'skew-',
    'ring-',
    'outline-',
    'from-',
    'via-',
    'to-',
    'basis-',
    'order-',
    'grid-cols-',
    'grid-rows-',
    'col-',
    'row-',
    'pointer-events-',
    'space-',
    'line-clamp-',
    'blur',
    'backdrop-',
    'brightness-',
    'contrast-',
    'saturate-',
    'stroke-',
    'fill-',
    'aspect-',
    'resize',
    'list-',
    'break-',
    'animate-',
    'bg-gradient-',
    'outline-offset-',
]

const NEGATIVE_PREFIXES = new Set(['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'top', 'right', 'bottom', 'left', 'inset', 'inset-x', 'inset-y'])
const AUTO_VALUE_PREFIXES = new Set(['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'top', 'right', 'bottom', 'left', 'inset', 'inset-x', 'inset-y'])

const normalizeOptions = (options?: TailwindConversionOptions): Required<TailwindConversionOptions> => {
    const merged = { ...DEFAULT_OPTIONS, ...options }

    if (options?.preserveUnknown === undefined) {
        merged.preserveUnknown = merged.mode === 'legacy'
    }

    return merged
}

const splitOutsideBrackets = (value: string, delimiter: string): string[] => {
    const parts: string[] = []
    let depth = 0
    let current = ''

    for (const char of value) {
        if (char === '[') depth++
        if (char === ']') depth = Math.max(0, depth - 1)
        if (char === delimiter && depth === 0) {
            parts.push(current)
            current = ''
            continue
        }
        current += char
    }

    if (current) parts.push(current)
    return parts
}

const normalizeColor = (value: string): string | null => {
    if (COLOR_SCALE[value]) return COLOR_SCALE[value]
    if (/^\[(.+)\]$/.test(value)) {
        const match = value.match(/^\[(.+)\]$/)
        if (!match) return null
        const inner = match[1].trim()
        if (inner.startsWith('#') || inner.startsWith('rgb') || inner.startsWith('hsl') || inner === 'transparent' || inner === 'currentColor') {
            return inner
        }
    }
    return null
}

const normalizeScalar = (value: string, table: Record<string, string>): string | null => {
    if (table[value] !== undefined) return table[value]
    if (/^\[(.+)\]$/.test(value)) {
        const match = value.match(/^\[(.+)\]$/)
        return match ? match[1] : null
    }
    return null
}

const normalizeSpacing = (raw: string, allowNegative: boolean): string | null => {
    let negative = false
    let value = raw
    if (raw.startsWith('-')) {
        if (!allowNegative) return null
        negative = true
        value = raw.slice(1)
    }

    if (value.startsWith('[') && value.endsWith(']')) {
        const inner = value.slice(1, -1)
        return negative ? `-${inner}` : inner
    }

    const scaled = SPACING_SCALE[value]
    if (!scaled) return null
    return negative && scaled !== '0' ? `-${scaled}` : scaled
}

const normalizeFraction = (value: string): string | null => {
    const match = value.match(/^(\d+)\/(\d+)$/)
    if (!match) return null
    const numerator = Number(match[1])
    const denominator = Number(match[2])
    if (!denominator) return null
    return `${(numerator / denominator) * 100}%`
}

const GROUP_PEER_STATES: Record<string, string> = {
    hover: ':hover',
    focus: ':focus',
    active: ':active',
    'focus-within': ':focus-within',
    'focus-visible': ':focus-visible',
    disabled: ':disabled',
    checked: ':checked',
}

/**
 * Đổi một biến thể Tailwind thành hậu tố selector của x-css (phần sau `@`).
 * Trả về null khi chưa có cách biểu diễn an toàn.
 */
const variantToSelector = (variant: string): string | null => {
    if (SELECTOR_VARIANTS[variant]) return SELECTOR_VARIANTS[variant]

    const groupPeer = variant.match(/^(group|peer)-(.+)$/)
    if (groupPeer && GROUP_PEER_STATES[groupPeer[2]]) {
        const state = GROUP_PEER_STATES[groupPeer[2]]
        return groupPeer[1] === 'group'
            ? `:is(.group${state};*)`
            : `:is(.peer${state}~*)`
    }

    const aria = variant.match(/^aria-(?:\[(.+)\]|([a-z-]+))$/)
    if (aria) return `[aria-${aria[1] ?? `${aria[2]}=true`}]`

    const data = variant.match(/^data-(?:\[(.+)\]|([a-z-]+))$/)
    if (data) return `[data-${data[1] ?? `${data[2]}`}]`

    // Biến thể tuỳ ý: `[&>*]`, `[&:nth-child(3)]`, `[&_p]`.
    const arbitrary = variant.match(/^\[&(.*)\]$/)
    if (arbitrary) {
        const inner = arbitrary[1].replace(/_/g, ';')
        return inner.startsWith(':') || inner.startsWith('[') || inner.startsWith('>') || inner.startsWith('+') || inner.startsWith('~') || inner.startsWith(';') || inner.startsWith('.')
            ? inner
            : null
    }

    return null
}

const appendVariants = (
    tokens: string[],
    variants: string[],
    options?: { darkMode?: 'media' | 'class' },
): { tokens: string[], warnings: TailwindConversionWarning[] } => {
    let media: string | null = null
    const selectors: string[] = []
    const warnings: TailwindConversionWarning[] = []

    const setMedia = (key: string): boolean => {
        if (media !== null && media !== key) {
            warnings.push({
                token: key,
                message: `một class x-css chỉ mang một media; \`${media}:\` và \`${key}:\` không thể gộp. Khai báo một breakpoint tổ hợp trong \`breakpoints\`.`,
                blocking: true,
            })
            return false
        }
        media = key
        return true
    }

    for (const variant of variants) {
        if (RESPONSIVE_VARIANTS.has(variant)) {
            setMedia(variant)
            continue
        }

        if (variant === 'dark') {
            if ((options?.darkMode ?? 'media') === 'class') {
                selectors.push(':is(.dark;*)')
            } else {
                if (!setMedia('dark')) continue
                warnings.push({
                    token: variant,
                    message: 'dark: được đổi thành media key `dark`; hãy khai báo breakpoints: [{ dark: \'(prefers-color-scheme: dark)\' }] (hoặc dùng darkMode: \'class\').',
                })
            }
            continue
        }

        if (variant === 'print') {
            if (!setMedia('print')) continue
            warnings.push({
                token: variant,
                message: 'print: được đổi thành media key `print`; hãy khai báo breakpoints: [{ print: \'print\' }].',
            })
            continue
        }

        const selector = variantToSelector(variant)
        if (selector) {
            selectors.push(selector)
            continue
        }

        warnings.push({
            token: variant,
            message: `unsupported Tailwind variant \`${variant}\``,
            blocking: true,
        })
    }

    const selectorSuffix = selectors.join('')

    return {
        tokens: tokens.map((token) => {
            let withSelector = token
            if (selectorSuffix) {
                const at = token.lastIndexOf('@')
                // Token đã có selector riêng (ví dụ `ml16px@>*+*` của space-x): gộp để biến thể đứng trước.
                withSelector = at > 0 && !token.slice(at).includes(']')
                    ? `${token.slice(0, at)}@${selectorSuffix}${token.slice(at + 1)}`
                    : `${token}@${selectorSuffix}`
            }
            return media ? `${media}:${withSelector}` : withSelector
        }),
        warnings,
    }
}

const buildSpacingToken = (prefix: string, value: string): string[] | null => {
    const negativeAllowed = NEGATIVE_PREFIXES.has(prefix)
    const normalized =
        value === 'auto' && AUTO_VALUE_PREFIXES.has(prefix)
            ? 'auto'
            : normalizeSpacing(value, negativeAllowed)
    if (!normalized) return null

    const propertyMap: Record<string, string[]> = {
        p: ['p'],
        px: ['px'],
        py: ['py'],
        pt: ['pt'],
        pr: ['pr'],
        pb: ['pb'],
        pl: ['pl'],
        m: ['m'],
        mx: ['mx'],
        my: ['my'],
        mt: ['mt'],
        mr: ['mr'],
        mb: ['mb'],
        ml: ['ml'],
        gap: ['gap'],
        'gap-x': ['cgap'],
        'gap-y': ['rgap'],
        top: ['t'],
        right: ['r'],
        bottom: ['b'],
        left: ['l'],
        inset: ['i'],
        'inset-x': ['l', 'r'],
        'inset-y': ['t', 'b'],
    }

    const properties = propertyMap[prefix]
    if (!properties) return null

    if (normalized === 'auto') {
        return properties.map((property) => `${property}[auto]`)
    }

    return properties.map((property) => `${property}${normalized}`)
}

const normalizeBasis = (rawValue: string): string | null => {
    return (
        normalizeScalar(rawValue, {
            auto: 'auto',
            full: '100%',
            min: 'min-content',
            max: 'max-content',
            fit: 'fit-content',
        }) ??
        normalizeFraction(rawValue) ??
        normalizeSpacing(rawValue, false)
    )
}

const normalizeOrder = (rawValue: string): string | null => {
    if (rawValue === 'first') return '-9999'
    if (rawValue === 'last') return '9999'
    if (rawValue === 'none') return '0'
    if (/^-?\d+$/.test(rawValue)) return rawValue
    if (/^\[(.+)\]$/.test(rawValue)) {
        const match = rawValue.match(/^\[(.+)\]$/)
        return match ? match[1] : null
    }
    return null
}

const buildSizeToken = (prefix: string, rawValue: string): string | null => {
    const propertyMap: Record<string, string> = {
        w: 'w',
        h: 'h',
        'min-w': 'miw',
        'min-h': 'mih',
        'max-w': 'mw',
        'max-h': 'mh',
    }

    const property = propertyMap[prefix]
    if (!property) return null
    const valueTable = prefix === 'h' || prefix === 'min-h' || prefix === 'max-h' ? HEIGHT_KEYWORDS : SIZE_KEYWORDS
    const normalized =
        normalizeScalar(rawValue, prefix.startsWith('max-w') ? { ...WIDTH_SCALE, ...valueTable } : valueTable) ??
        normalizeFraction(rawValue) ??
        normalizeSpacing(rawValue, false)
    if (!normalized) return null
    return `${property}[${normalized}]`
}


// ---------------------------------------------------------------------------
// Nhóm utility mở rộng: lưới, vị trí phân số, motion, border từng cạnh, màu có độ mờ,
// khoảng cách giữa phần tử con, line-clamp, filter, v.v.
// Mỗi mục trả về token x-css tương đương; nếu không tương đương hoàn toàn thì
// đặt exact=false kèm cảnh báo để người dùng rà soát.
// ---------------------------------------------------------------------------

const EASE_SCALE: Record<string, string> = {
    linear: 'linear',
    in: 'cubic-bezier(0.4,0,1,1)',
    out: 'cubic-bezier(0,0,0.2,1)',
    'in-out': 'cubic-bezier(0.4,0,0.2,1)',
}

const BLUR_SCALE: Record<string, string> = {
    none: '0',
    sm: '4px',
    DEFAULT: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '40px',
    '3xl': '64px',
}

const spacingOrFraction = (raw: string): string | null =>
    normalizeSpacing(raw, true) ?? normalizeFraction(raw.startsWith('-') ? raw.slice(1) : raw)

const hexToRgbTriplet = (hex: string): [number, number, number] | null => {
    const m = hex.match(/^#([0-9a-f]{6})$/i)
    if (!m) return null
    const n = parseInt(m[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** `bg-black/50` -> `rgb(0_0_0_/_0.5)`. Chỉ áp dụng cho màu hex 6 ký tự trong bảng màu. */
const normalizeColorWithAlpha = (value: string): string | null => {
    const slash = value.lastIndexOf('/')
    if (slash <= 0) return null
    const color = normalizeColor(value.slice(0, slash))
    const alphaRaw = value.slice(slash + 1)
    if (!color || !/^\d{1,3}$/.test(alphaRaw)) return null
    const rgb = hexToRgbTriplet(color)
    if (!rgb) return null
    const alpha = Math.min(100, Number(alphaRaw)) / 100
    return `[rgb(${rgb.join('_')}_/_${alpha})]`
}

const ok = (
    token: string,
    outputs: string[],
    exact = true,
    warnings: TailwindConversionWarning[] = [],
): TailwindBaseTokenConversion => ({ input: token, outputs, status: 'converted', exact, warnings })

const approx = (token: string, outputs: string[], message: string): TailwindBaseTokenConversion =>
    ok(token, outputs, false, [{ token, message }])

const bracketInner = (value: string): string | null => {
    const m = value.match(/^\[(.+)\]$/)
    return m ? m[1] : null
}

const convertExtendedToken = (token: string): TailwindBaseTokenConversion | null => {
    let m: RegExpMatchArray | null

    // Thuộc tính tuỳ ý: [mask-type:luminance] -> mask-type[luminance]
    if ((m = token.match(/^\[([a-z-]+):(.+)\]$/))) {
        return ok(token, [`${m[1]}[${m[2]}]`])
    }

    // Lưới: grid-cols-*, grid-rows-*
    if ((m = token.match(/^grid-(cols|rows)-(.+)$/))) {
        const prop = m[1] === 'cols' ? 'gtc' : 'gtr'
        const raw = m[2]
        if (/^\d+$/.test(raw)) return ok(token, [`${prop}[repeat(${raw},minmax(0,1fr))]`])
        if (raw === 'none') return ok(token, [`${prop}[none]`])
        if (raw === 'subgrid') return ok(token, [`${prop}[subgrid]`])
        const inner = bracketInner(raw)
        if (inner) return ok(token, [`${prop}[${inner}]`])
        return null
    }

    // Lưới: col-span-*, row-span-*, col-start-*, col-end-*, row-start-*, row-end-*
    if ((m = token.match(/^(col|row)-span-(.+)$/))) {
        const prop = m[1] === 'col' ? 'gc' : 'gr'
        if (m[2] === 'full') return ok(token, [`${prop}[1_/_-1]`])
        if (/^\d+$/.test(m[2])) return ok(token, [`${prop}[span_${m[2]}_/_span_${m[2]}]`])
        return null
    }
    if ((m = token.match(/^(col|row)-(start|end)-(.+)$/))) {
        const prop = `${m[1] === 'col' ? 'g' : 'gr'}${m[1] === 'col' ? 'c' : ''}${m[2] === 'start' ? 's' : 'e'}`
        const inner = bracketInner(m[3])
        if (/^-?\d+$/.test(m[3]) || m[3] === 'auto') return ok(token, [`${prop}[${m[3]}]`])
        if (inner) return ok(token, [`${prop}[${inner}]`])
        return null
    }

    // Vị trí phân số: top-1/2, left-1/3, inset-x-1/2, -top-1/2
    if ((m = token.match(/^(-?)(top|right|bottom|left|inset|inset-x|inset-y)-(\d+\/\d+)$/))) {
        const pct = normalizeFraction(m[3])
        if (!pct) return null
        const v = m[1] ? `-${pct}` : pct
        const map: Record<string, string[]> = {
            top: ['t'], right: ['r'], bottom: ['b'], left: ['l'],
            inset: ['inset'], 'inset-x': ['l', 'r'], 'inset-y': ['t', 'b'],
        }
        return ok(token, map[m[2]].map((p) => `${p}[${v}]`))
    }

    // Sự kiện con trỏ, resize, danh sách, gạch chân, ngắt từ
    const SIMPLE: Record<string, string[]> = {
        'pointer-events-none': ['pe[none]'],
        'pointer-events-auto': ['pe[auto]'],
        'resize-none': ['rsz[none]'],
        resize: ['rsz[both]'],
        'resize-x': ['rsz[horizontal]'],
        'resize-y': ['rsz[vertical]'],
        'list-none': ['lst[none]'],
        'list-disc': ['lst[disc]'],
        'list-decimal': ['lst[decimal]'],
        'no-underline': ['tdl[none]'],
        'break-words': ['oflw[break-word]'],
        'break-all': ['wrb[break-all]'],
        'break-normal': ['oflw[normal]', 'wrb[normal]'],
        'fill-current': ['fill[currentColor]'],
        'stroke-current': ['stroke[currentColor]'],
        'shadow-inner': ['bxsh[inset_0_2px_4px_0_rgb(0_0_0_/_0.05)]'],
        'sr-only': ['pos[absolute]', 'w1px', 'h1px', 'p0', 'm-1px', 'ofl[hidden]', 'clip[rect(0,0,0,0)]', 'ws[nowrap]', 'bdw0'],
        'not-sr-only': ['pos[static]', 'w[auto]', 'h[auto]', 'p0', 'm0', 'ofl[visible]', 'clip[auto]', 'ws[normal]'],
        'divide-y': ['bdtw1px@>*+*'],
        'divide-x': ['bdlw1px@>*+*'],
        'border-x': ['bdlw1px', 'bdrw1px'],
        'border-y': ['bdtw1px', 'bdbw1px'],
        'border-t': ['bdtw1px'],
        'border-r': ['bdrw1px'],
        'border-b': ['bdbw1px'],
        'border-l': ['bdlw1px'],
        'bg-none': ['bgi[none]'],
        'bg-cover': ['bgsz[cover]'],
        'bg-contain': ['bgsz[contain]'],
        'bg-center': ['bgp[center]'],
        'bg-no-repeat': ['bgr[no-repeat]'],
        'bg-fixed': ['bga[fixed]'],
    }
    if (SIMPLE[token]) return ok(token, SIMPLE[token])

    // border-{t,r,b,l,x,y}-N: độ dày từng cạnh
    if ((m = token.match(/^border-(t|r|b|l|x|y)-(\d+)$/))) {
        const w = `${m[2]}px`
        const map: Record<string, string[]> = {
            t: [`bdtw${w}`], r: [`bdrw${w}`], b: [`bdbw${w}`], l: [`bdlw${w}`],
            x: [`bdlw${w}`, `bdrw${w}`], y: [`bdtw${w}`, `bdbw${w}`],
        }
        return ok(token, map[m[1]])
    }

    // Màu có độ mờ: bg-black/50, text-white/80, border-white/20
    if ((m = token.match(/^(bg|text|border)-(.+\/\d{1,3})$/))) {
        const color = normalizeColorWithAlpha(m[2])
        if (color) return ok(token, [`${m[1] === 'bg' ? 'bgc' : m[1] === 'text' ? 'c' : 'bdc'}${color}`])
    }

    // Màu / kích thước / ảnh tuỳ ý: text-[14px], bg-[url(...)], z-[60], aspect-[4/3]
    if ((m = token.match(/^text-(\[.+\])$/))) {
        const inner = bracketInner(m[1]) as string
        if (/^(\d|\.\d|calc\(|clamp\(|min\(|max\()/.test(inner)) return ok(token, [`fns[${inner}]`])
    }
    if ((m = token.match(/^bg-(\[.+\])$/))) {
        const inner = bracketInner(m[1]) as string
        if (/^(url\(|[a-z-]*gradient\()/.test(inner)) return ok(token, [`bgi[${inner}]`])
    }
    if ((m = token.match(/^z-(\[.+\])$/))) return ok(token, [`z${m[1]}`])
    if ((m = token.match(/^aspect-(\[.+\])$/))) return ok(token, [`ar${m[1]}`])

    // Motion: duration, delay, ease
    if ((m = token.match(/^duration-(.+)$/))) {
        if (/^\d+$/.test(m[1])) return ok(token, [`trandur${m[1]}ms`])
        const inner = bracketInner(m[1])
        if (inner) return ok(token, [`trandur[${inner}]`])
        return null
    }
    if ((m = token.match(/^delay-(.+)$/))) {
        if (/^\d+$/.test(m[1])) return ok(token, [`trand${m[1]}ms`])
        const inner = bracketInner(m[1])
        if (inner) return ok(token, [`trand[${inner}]`])
        return null
    }
    if ((m = token.match(/^ease-(.+)$/))) {
        if (EASE_SCALE[m[1]]) return ok(token, [`trantf[${EASE_SCALE[m[1]]}]`])
        const inner = bracketInner(m[1])
        if (inner) return ok(token, [`trantf[${inner}]`])
        return null
    }

    // Biến đổi: translate, scale, rotate dùng property riêng lẻ (không cộng dồn như Tailwind v3)
    if ((m = token.match(/^(-?)translate-(x|y)-(.+)$/))) {
        const v = spacingOrFraction(`${m[1]}${m[3]}`)
        if (!v) return null
        const pair = m[2] === 'x' ? `${v}_0` : `0_${v}`
        return approx(token, [`trl[${pair}]`], `\`${token}\` dùng property \`translate\`; kết hợp translate-x và translate-y trên cùng phần tử sẽ ghi đè nhau, hãy gộp thành \`trl[X_Y]\`.`)
    }
    if ((m = token.match(/^(-?)scale-(\d+)$/))) {
        const n = Number(m[2]) / 100
        return ok(token, [`s[${m[1]}${n}]`])
    }
    if ((m = token.match(/^(-?)rotate-(\d+)$/))) return ok(token, [`rot[${m[1]}${m[2]}deg]`])

    // Khoảng cách giữa phần tử con
    if ((m = token.match(/^(-?)space-(x|y)-(.+)$/))) {
        const v = normalizeSpacing(`${m[1]}${m[3]}`, true)
        if (!v) return null
        return ok(token, [`${m[2] === 'x' ? 'ml' : 'mt'}[${v}]@>*+*`])
    }

    // Cắt dòng
    if ((m = token.match(/^line-clamp-(\d+|none)$/))) {
        if (m[1] === 'none') return ok(token, ['-webkit-line-clamp[unset]', 'ofl[visible]', 'd[block]', '-webkit-box-orient[horizontal]'])
        return ok(token, ['d[-webkit-box]', '-webkit-box-orient[vertical]', `-webkit-line-clamp[${m[1]}]`, 'ofl[hidden]'])
    }

    // Filter: blur, backdrop-blur, brightness, grayscale
    if ((m = token.match(/^(backdrop-)?blur(?:-(.+))?$/))) {
        const key = m[2] ?? 'DEFAULT'
        const v = BLUR_SCALE[key] ?? (bracketInner(key) ?? null)
        if (v) return ok(token, [`${m[1] ? 'bkdf' : 'flt'}[blur(${v})]`])
        return null
    }
    if ((m = token.match(/^(backdrop-)?(brightness|contrast|saturate)-(\d+)$/))) {
        return ok(token, [`${m[1] ? 'bkdf' : 'flt'}[${m[2]}(${Number(m[3]) / 100})]`])
    }

    // Độ dày nét SVG
    if ((m = token.match(/^stroke-(\d+)$/))) return ok(token, [`stroke-width[${m[1]}]`])

    // Viền / đường viền ngoài
    if (token === 'outline-none') {
        return approx(token, ['oli[2px_solid_transparent]', 'olo2px'], '`outline-none` đổi theo Tailwind v3 (viền trong suốt, giữ được chế độ tương phản cao); Tailwind v4 dùng `outline-style: none`.')
    }
    if ((m = token.match(/^outline-offset-(\d+)$/))) return ok(token, [`olo${m[1]}px`])

    return null
}

const convertBaseToken = (token: string): TailwindBaseTokenConversion => {
    const warnings: TailwindConversionWarning[] = []

    const extended = convertExtendedToken(token)
    if (extended) return extended

    if (DIRECT_MAP[token]) {
        return {
            input: token,
            outputs: DIRECT_MAP[token],
            status: 'converted',
            exact: true,
            warnings,
        }
    }

    if (DIRECTIONAL_ROUNDED_MAP[token]) {
        return {
            input: token,
            outputs: DIRECTIONAL_ROUNDED_MAP[token],
            status: 'converted',
            exact: true,
            warnings,
        }
    }

    const colorPrefixes: Array<[RegExp, string]> = [
        [/^bg-(.+)$/, 'bgc'],
        [/^text-(.+)$/, 'c'],
        [/^border-(.+)$/, 'bdc'],
    ]
    for (const [pattern, property] of colorPrefixes) {
        const match = token.match(pattern)
        if (!match) continue
        const color = normalizeColor(match[1])
        if (color) {
            return {
                input: token,
                outputs: [buildValueToken(property, color)],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    const spacingPrefixes = ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'gap', 'gap-x', 'gap-y', 'top', 'right', 'bottom', 'left', 'inset', 'inset-x', 'inset-y']
    for (const prefix of spacingPrefixes) {
        const bare = token.startsWith('-') ? token.slice(1) : token
        if (!bare.startsWith(`${prefix}-`)) continue
        const value = token.startsWith('-') ? `-${bare.slice(prefix.length + 1)}` : bare.slice(prefix.length + 1)
        const built = buildSpacingToken(prefix, value)
        if (built) {
            return {
                input: token,
                outputs: built,
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    const sizePrefixes = ['w', 'h', 'min-w', 'min-h', 'max-w', 'max-h']
    for (const prefix of sizePrefixes) {
        if (!token.startsWith(`${prefix}-`)) continue
        const value = token.slice(prefix.length + 1)
        const built = buildSizeToken(prefix, value)
        if (built) {
            return {
                input: token,
                outputs: [built],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('size-')) {
        const value = token.slice(5)
        const normalized = normalizeSpacing(value, false)
        if (normalized) {
            return {
                input: token,
                outputs: [`w${normalized}`, `h${normalized}`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('rounded-')) {
        const value = token.slice(8)
        const radius = normalizeScalar(value, RADIUS_SCALE)
        if (radius) {
            return {
                input: token,
                outputs: [`bdra${radius}`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('font-')) {
        const value = token.slice(5)
        const weight = FONT_WEIGHT_SCALE[value]
        if (weight) {
            return {
                input: token,
                outputs: [`fnw${weight}`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('text-')) {
        const value = token.slice(5)
        const fontSize = FONT_SIZE_SCALE[value]
        if (fontSize) {
            return {
                input: token,
                outputs: [`fns${fontSize}`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('leading-')) {
        const value = token.slice(8)
        const normalized = normalizeScalar(value, LINE_HEIGHT_SCALE)
        if (normalized) {
            return {
                input: token,
                outputs: [`lh${normalized}`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('tracking-')) {
        const value = token.slice(9)
        const normalized = normalizeScalar(value, LETTER_SPACING_SCALE)
        if (normalized) {
            return {
                input: token,
                outputs: [`lts${normalized}`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('opacity-')) {
        const raw = token.slice(8)
        const amount = Number(raw)
        if (!Number.isNaN(amount)) {
            return {
                input: token,
                outputs: [`opc${String(amount / 100)}`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('z-')) {
        const raw = token.slice(2)
        if (/^-?\d+$/.test(raw)) {
            return {
                input: token,
                outputs: [`z${raw}`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('shadow')) {
        const suffix = token === 'shadow' ? 'DEFAULT' : token.slice(7)
        const shadow = SHADOW_SCALE[suffix]
        if (shadow) {
            return {
                input: token,
                outputs: [`bxsh${shadow}`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('basis-')) {
        const raw = token.slice(6)
        const normalized = normalizeBasis(raw)
        if (normalized) {
            return {
                input: token,
                outputs: [`fxb[${normalized}]`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('order-')) {
        const raw = token.slice(6)
        const normalized = normalizeOrder(raw)
        if (normalized) {
            return {
                input: token,
                outputs: /^-?\d+$/.test(normalized) ? [`ord${normalized}`] : [`ord[${normalized}]`],
                status: 'converted',
                exact: true,
                warnings,
            }
        }
    }

    if (token.startsWith('transition')) {
        warnings.push({
            token,
            message: `Tailwind transition utility \`${token}\` converted approximately to 200ms transition`,
        })
        return {
            input: token,
            outputs: ['tran0.2s'],
            status: 'converted',
            exact: false,
            warnings,
        }
    }

    if (token.startsWith('duration-') || token.startsWith('ease-') || token.startsWith('delay-')) {
        warnings.push({
            token,
            message: `Tailwind motion utility \`${token}\` requires manual review in x-css migration`,
        })
        return {
            input: token,
            outputs: [],
            status: 'unsupported',
            exact: false,
            warnings,
        }
    }

    warnings.push({
        token,
        message: `Tailwind utility \`${token}\` is not mapped yet`,
    })
    return {
        input: token,
        outputs: [],
        status: 'unsupported',
        exact: false,
        warnings,
    }
}

const splitVariants = (token: string): { variants: string[], base: string } => {
    const parts = splitOutsideBrackets(token, ':')
    if (parts.length === 1) {
        return { variants: [], base: token }
    }
    return {
        variants: parts.slice(0, -1),
        base: parts[parts.length - 1],
    }
}

const looksLikeTailwindBase = (base: string): boolean => {
    if (!base) return false
    if (TAILWIND_EXACT_UTILITIES.has(base)) return true

    const bare = base.startsWith('-') ? base.slice(1) : base
    if (TAILWIND_EXACT_UTILITIES.has(bare)) return true
    if (TAILWIND_PREFIXES.some((prefix) => bare.startsWith(prefix))) return true

    return /^(?:[a-z0-9]+-)+\[[^\]]+\]$/i.test(bare)
}

export const classifyTailwindToken = (token: string): TailwindTokenClassification => {
    const { variants, base } = splitVariants(token)
    // `[mask-type:luminance]` là thuộc tính tuỳ ý của Tailwind, không phải nhóm alias `[name]` của x-css.
    if (/^\[[a-z-]+:[^\]]+\]$/.test(base)) return 'tailwind'
    const tailwindLike = looksLikeTailwindBase(base) || variants.some((variant) => TAILWIND_ONLY_VARIANTS.has(variant))
    const parsed = parseClassName(token)
    const hasExplicitXcssBoundary =
        /[A-Z[#0-9!@]/.test(token) ||
        token.includes('--') ||
        (parsed !== null && (parsed.selector.length > 0 || parsed.layer.length > 0 || parsed.mq.length > 0)) ||
        (parsed !== null && parsed.val.length > 0)
    const parseableAsXcss = parsed !== null && hasExplicitXcssBoundary

    if (tailwindLike && parseableAsXcss) return 'ambiguous'
    if (tailwindLike) return 'tailwind'
    if (parseableAsXcss) return 'xcss'
    return 'unknown'
}

export const convertTailwindToken = (
    token: string,
    options?: TailwindConversionOptions,
): TailwindTokenConversion => {
    const normalized = normalizeOptions(options)
    const classification = classifyTailwindToken(token)

    if (classification === 'xcss') {
        return {
            input: token,
            outputs: [token],
            status: 'passthrough',
            classification,
            exact: true,
            warnings: [],
        }
    }

    const { variants, base } = splitVariants(token)
    const converted = convertBaseToken(base)

    if (converted.status === 'converted') {
        const withVariants = appendVariants(converted.outputs, variants, { darkMode: normalized.darkMode })

        if (withVariants.warnings.some((w) => w.blocking)) {
            const warnings = [
                {
                    token,
                    message: `Tailwind token \`${token}\` uses variants that are not mapped safely`,
                },
                ...converted.warnings,
                ...withVariants.warnings,
            ]

            if (normalized.preserveUnknown) {
                return {
                    input: token,
                    outputs: [token],
                    status: 'passthrough',
                    classification: 'ambiguous',
                    exact: false,
                    warnings,
                }
            }

            return {
                input: token,
                outputs: [],
                status: 'unsupported',
                classification: 'ambiguous',
                exact: false,
                warnings,
            }
        }

        return {
            input: token,
            outputs: withVariants.tokens,
            status: 'converted',
            classification,
            exact: converted.exact,
            warnings: [...converted.warnings, ...withVariants.warnings],
        }
    }

    const warnings = [...converted.warnings]
    if (classification === 'ambiguous') {
        warnings.unshift({
            token,
            message: `Tailwind token \`${token}\` is ambiguous with x-css syntax and requires review`,
        })
    }

    if (classification === 'unknown') {
        warnings.unshift({
            token,
            message: `Token \`${token}\` is neither recognized Tailwind nor confirmed x-css`,
        })
    }

    if (normalized.preserveUnknown) {
        return {
            input: token,
            outputs: [token],
            status: 'passthrough',
            classification,
            exact: false,
            warnings,
        }
    }

    return {
        input: token,
        outputs: [],
        status: 'unsupported',
        classification,
        exact: false,
        warnings,
    }
}

export const convertTailwindClasses = (
    input: string,
    options?: TailwindConversionOptions,
): TailwindConversionResult => {
    const tokens = input.split(/\s+/).map((item) => item.trim()).filter(Boolean)
    const details = tokens.map((token) => convertTailwindToken(token, options))
    const outputTokens = details.flatMap((item) => item.outputs)
    const warnings = details.flatMap((item) => item.warnings)

    return {
        input,
        output: outputTokens.join(' '),
        details,
        converted: details.filter((item) => item.status === 'converted').flatMap((item) => item.outputs),
        passthrough: details.filter((item) => item.status === 'passthrough').flatMap((item) => item.outputs),
        unsupported: details.filter((item) => item.status === 'unsupported').map((item) => item.input),
        ambiguous: details.filter((item) => item.classification === 'ambiguous').map((item) => item.input),
        warnings,
    }
}

export const tailwindToXcss = convertTailwindClasses
