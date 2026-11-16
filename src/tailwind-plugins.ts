/**
 * Plugin Tailwind phổ biến đóng gói sẵn cho dialect Tailwind v4 (không cần build, không cần Node):
 *
 *   import { parseTailwindStylesheet } from '@porbit/style/tailwind-v4'
 *   import { resolveTailwindPlugin } from '@porbit/style/tailwind-plugins'
 *   const sheet = parseTailwindStylesheet('@import "tw-animate-css"; @plugin "@tailwindcss/typography";', { resolve: resolveTailwindPlugin })
 *
 * Bản CDN `tailwind-auto` tự tải file này khi `<style type="text/tailwindcss">` có `@import`/`@plugin`.
 */
import { TAILWIND_PLUGIN_CSS_PACKED } from './tailwind-plugins-generated'

// Không có bí danh: `tailwindcss-animate` và `tw-animate-css` cùng tên class nhưng khác giá trị, mỗi gói đóng gói riêng.
const ALIASES: Record<string, string> = {}

/** Danh sách plugin có sẵn. */
export const TAILWIND_PLUGINS = [...Object.keys(TAILWIND_PLUGIN_CSS_PACKED), ...Object.keys(ALIASES)]

const PACK_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$'
/**
 * Giải nén CSS plugin (LZ77 dạng chữ của scripts/gen-tailwind-plugins.mjs): `` `abc `` chép lại (a*64+b) ký tự trước
 * đó, độ dài c+24; hai dấu `` ` `` liền nhau là một dấu `` ` ``.
 */
const unpackPluginCss = (packed: string): string => {
    let out = ''
    let i = 0
    for (let at = packed.indexOf('`'); at !== -1; at = packed.indexOf('`', i)) {
        out += packed.slice(i, at)
        if (packed[at + 1] === '`') {
            out += '`'
            i = at + 2
            continue
        }
        const distance = PACK_CHARS.indexOf(packed[at + 1]) * 64 + PACK_CHARS.indexOf(packed[at + 2])
        for (let length = PACK_CHARS.indexOf(packed[at + 3]) + 24; length > 0;) {
            const from = out.length - distance
            const piece = out.slice(from, from + Math.min(length, distance))
            out += piece
            length -= piece.length
        }
        i = at + 4
    }
    return out + packed.slice(i)
}
const unpacked = new Map<string, string>()

/** CSS Tailwind v4 của plugin (`@utility`, `@custom-variant`, `@layer base`...), null nếu chưa đóng gói. */
export const resolveTailwindPlugin = (id: string): string | null => {
    const key = ALIASES[id] ?? id
    if (!Object.hasOwn(TAILWIND_PLUGIN_CSS_PACKED, key)) return null
    let css = unpacked.get(key)
    if (css === undefined) unpacked.set(key, (css = unpackPluginCss(TAILWIND_PLUGIN_CSS_PACKED[key])))
    return css
}
