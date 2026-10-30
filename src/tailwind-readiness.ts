import {
    type TailwindConversionOptions,
    type TailwindConversionResult,
    type TailwindTokenConversion,
    convertTailwindClasses,
} from './tailwind'

export type TailwindCoverageSupport = 'exact' | 'partial' | 'manual'

export interface TailwindCoverageEntry {
    group: string
    support: TailwindCoverageSupport
    examples: string[]
    notes: string
}

export interface TailwindMigrationReadinessOptions extends TailwindConversionOptions {}

export interface TailwindMigrationReadinessReport {
    input: string
    conversion: TailwindConversionResult
    autoApplyOutput: string
    exactConverted: string[]
    approximateConverted: string[]
    passthroughXcss: string[]
    reviewRequired: string[]
    blocked: string[]
    safeToAutoApply: boolean
    releaseDecision: 'safe' | 'review' | 'blocked'
}

export const TAILWIND_COVERAGE_MATRIX: readonly TailwindCoverageEntry[] = [
    {
        group: 'layout-core',
        support: 'exact',
        examples: ['flex', 'inline-flex', 'grid', 'block', 'hidden', 'relative', 'absolute'],
        notes: 'display, position, flex-direction, flex-wrap, and core layout helpers map 1:1 to x-css tokens.',
    },
    {
        group: 'spacing-size',
        support: 'exact',
        examples: ['p-4', 'gap-4', 'mx-auto', 'w-1/2', 'max-w-7xl', 'inset-x-4', 'inset-y-2'],
        notes: 'spacing scale, fractions, width/height keywords, auto margins, and axis inset helpers are safe to auto-apply.',
    },
    {
        group: 'color-border-shadow',
        support: 'exact',
        examples: ['bg-white', 'text-slate-900', 'border', 'border-slate-200', 'shadow-lg'],
        notes: 'core color, border, rounded, and shadow utilities are exact when the target token is supported in the built-in dictionary.',
    },
    {
        group: 'typography',
        support: 'exact',
        examples: ['font-semibold', 'text-sm', 'leading-6', 'tracking-wide', 'uppercase', 'truncate'],
        notes: 'font family, weight, size, line-height, letter-spacing, casing, whitespace, and overflow text helpers are mapped directly.',
    },
    {
        group: 'alignment-placement',
        support: 'exact',
        examples: ['items-baseline', 'justify-between', 'place-items-center', 'content-between', 'justify-self-end'],
        notes: 'align, justify, place, self, and content helpers are safe to auto-apply.',
    },
    {
        group: 'object-appearance',
        support: 'exact',
        examples: ['appearance-none', 'object-cover', 'object-center', 'aspect-video', 'basis-1/2', 'order-last'],
        notes: 'appearance, object-fit/object-position, aspect-ratio, flex-basis, and order helpers are mapped exactly.',
    },
    {
        group: 'state-variants-safe',
        support: 'exact',
        examples: ['hover:bg-slate-50', 'focus:text-blue-600', 'before:bg-slate-50', 'placeholder:text-slate-400'],
        notes: 'responsive variants and safe pseudo/pseudo-element variants are supported directly: hover, focus, active, visited, disabled, checked, before, after, placeholder, selection, first, last, odd, even.',
    },
    {
        group: 'grid-position',
        support: 'exact',
        examples: ['grid-cols-3', 'col-span-2', 'col-start-2', 'grid-rows-2', 'top-1/2', 'inset-x-1/2'],
        notes: 'lưới, vị trí theo phân số và phạm vi cột/hàng đổi 1:1 sang gtc, gtr, gc, gr, t, l, r, b.',
    },
    {
        group: 'motion',
        support: 'exact',
        examples: ['duration-300', 'delay-150', 'ease-in-out', 'ease-linear'],
        notes: 'thời lượng, độ trễ và hàm thời gian đổi sang trandur, trand, trantf; `transition` đứng một mình vẫn chỉ gần đúng (200ms).',
    },
    {
        group: 'motion-basic',
        support: 'partial',
        examples: ['transition'],
        notes: 'transition currently degrades to a generic 200ms x-css transition and should be reviewed before release.',
    },
    {
        group: 'transform-effects',
        support: 'partial',
        examples: ['scale-95', 'rotate-45', 'translate-x-4', 'blur-sm', 'backdrop-blur-md', 'brightness-50'],
        notes: 'scale, rotate, blur, backdrop-blur, brightness dùng property riêng lẻ; translate-x và translate-y trên cùng phần tử ghi đè nhau vì dùng chung property `translate`, hãy gộp thành `trl[X_Y]`.',
    },
    {
        group: 'contextual-variants',
        support: 'exact',
        examples: ['group-hover:bg-slate-50', 'peer-checked:bg-blue-600', 'aria-expanded:rotate-180', 'data-[open=true]:flex', '[&>*]:mb-2', 'dark:bg-slate-900'],
        notes: 'group, peer, aria, data, biến thể tuỳ ý `[&...]` và dark đổi sang hậu tố selector hoặc media key; dark cần khai báo breakpoints hoặc dùng darkMode: class.',
    },
    {
        group: 'opacity-colors-arbitrary',
        support: 'exact',
        examples: ['bg-black/50', 'text-white/80', 'w-[calc(100%_-_2rem)]', 'text-[14px]', 'z-[60]', '[mask-type:luminance]'],
        notes: 'màu hex có độ mờ và giá trị tuỳ ý trong ngoặc vuông được đổi sang cú pháp ngoặc vuông của x-css, với `_` là khoảng trắng.',
    },
    {
        group: 'dividers-spacing-children',
        support: 'exact',
        examples: ['space-x-4', 'space-y-2', 'divide-y', 'divide-x', 'border-t-2', 'border-x'],
        notes: 'khoảng cách giữa phần tử con và đường kẻ phân cách dùng selector `>*+*`.',
    },
    {
        group: 'accessibility-text',
        support: 'exact',
        examples: ['sr-only', 'line-clamp-3', 'break-words', 'pointer-events-none', 'no-underline'],
        notes: 'sr-only, cắt dòng, ngắt từ, sự kiện con trỏ.',
    },
    {
        group: 'manual-review',
        support: 'manual',
        examples: ['bg-gradient-to-r', 'from-blue-500', 'ring-2', 'animate-spin', 'prose', 'container', 'supports-[display:grid]:flex'],
        notes: 'gradient theo hướng, ring, animate, plugin typography, container và biến thể supports cần viết tay: x-css biểu đạt được bằng giá trị tuỳ ý nhưng không có phép đổi 1:1 an toàn.',
    },
] as const

const DEFAULT_READINESS_OPTIONS: Required<TailwindMigrationReadinessOptions> = {
    mode: 'safe',
    preserveUnknown: false,
    darkMode: 'media',
}

const isSafeDetailForAutoApply = (detail: TailwindTokenConversion): boolean => {
    if (detail.status === 'converted') return detail.exact
    return detail.status === 'passthrough' && detail.classification === 'xcss'
}

export const getTailwindCoverageMatrix = (): readonly TailwindCoverageEntry[] => {
    return TAILWIND_COVERAGE_MATRIX
}

export const assessTailwindMigrationReadiness = (
    input: string,
    options?: TailwindMigrationReadinessOptions,
): TailwindMigrationReadinessReport => {
    const normalizedOptions: TailwindMigrationReadinessOptions = {
        ...DEFAULT_READINESS_OPTIONS,
        ...options,
    }

    const conversion = convertTailwindClasses(input, normalizedOptions)
    const exactConverted = conversion.details
        .filter((detail) => detail.status === 'converted' && detail.exact)
        .flatMap((detail) => detail.outputs)
    const approximateConverted = conversion.details
        .filter((detail) => detail.status === 'converted' && !detail.exact)
        .flatMap((detail) => detail.outputs)
    const passthroughXcss = conversion.details
        .filter((detail) => detail.status === 'passthrough' && detail.classification === 'xcss')
        .flatMap((detail) => detail.outputs)

    const reviewRequired = conversion.details
        .filter((detail) => !isSafeDetailForAutoApply(detail))
        .map((detail) => detail.input)

    const blocked = conversion.details
        .filter((detail) => {
            if (isSafeDetailForAutoApply(detail)) return false
            if (detail.status === 'converted') return false
            return detail.status === 'unsupported' || detail.classification === 'ambiguous' || detail.classification === 'unknown'
        })
        .map((detail) => detail.input)

    const autoApplyOutput = conversion.details
        .flatMap((detail) => (isSafeDetailForAutoApply(detail) ? detail.outputs : []))
        .join(' ')

    const safeToAutoApply = reviewRequired.length === 0
    const releaseDecision =
        blocked.length > 0
            ? 'blocked'
            : safeToAutoApply
                ? 'safe'
                : 'review'

    return {
        input,
        conversion,
        autoApplyOutput,
        exactConverted,
        approximateConverted,
        passthroughXcss,
        reviewRequired,
        blocked,
        safeToAutoApply,
        releaseDecision,
    }
}
