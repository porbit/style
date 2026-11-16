/**
 * `@porbit/style/merge`: `cn`/`twMerge` cho class Tailwind v4 (kèm dữ liệu phương ngữ).
 * Bản nhẹ không kèm dữ liệu: `@porbit/style/merge/lite` + bảng sinh sẵn (`buildMergeTable`).
 */
import { getConflictKey } from './class-tools'
import { clsx, createMerge, longhandsOf, type ClassValue } from './merge'
import { isXcssLike } from './analyze'
import { tailwindV4Dialect } from './tailwind-v4'

export { buildMergeTable, classSlots, clsx, createMerge, type ClassValue, type MergeOptions, type MergeTable } from './merge'

/** Ô của class x-css (`p16`, `md:bgcRed@:hover`): theo khoá xung đột của engine. */
export const xcssSlots = (className: string): string[] | null => {
    const key = isXcssLike(className) ? getConflictKey(className) : null
    if (!key) return null
    const [media, layer, property, selector] = key.split('|')
    return longhandsOf(property).map((longhand) => `x${media}|${layer}|${selector}|${longhand}`)
}

let merge: ((...inputs: ClassValue[]) => string) | null = null
/** Gộp class xung đột như tailwind-merge, theo khai báo CSS thật của Tailwind v4. */
export const twMerge = (...inputs: ClassValue[]): string => (merge ||= createMerge({ dialect: tailwindV4Dialect(), fallback: xcssSlots }))(...inputs)
/** `cn()` của shadcn/ui: `clsx` + gộp xung đột. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(...inputs))
