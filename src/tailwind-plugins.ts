/**
 * Plugin Tailwind phổ biến đóng gói sẵn cho dialect Tailwind v4 (không cần build, không cần Node):
 *
 *   import { parseTailwindStylesheet } from '@porbit/style/tailwind-v4'
 *   import { resolveTailwindPlugin } from '@porbit/style/tailwind-plugins'
 *   const sheet = parseTailwindStylesheet('@import "tw-animate-css"; @plugin "@tailwindcss/typography";', { resolve: resolveTailwindPlugin })
 *
 * Bản CDN `tailwind-auto` tự tải file này khi `<style type="text/tailwindcss">` có `@import`/`@plugin`.
 */
import { TAILWIND_PLUGIN_CSS } from './tailwind-plugins-generated'

// Không có bí danh: `tailwindcss-animate` và `tw-animate-css` cùng tên class nhưng khác giá trị, mỗi gói đóng gói riêng.
const ALIASES: Record<string, string> = {}

/** Danh sách plugin có sẵn. */
export const TAILWIND_PLUGINS = [...Object.keys(TAILWIND_PLUGIN_CSS), ...Object.keys(ALIASES)]

/** CSS Tailwind v4 của plugin (`@utility`, `@custom-variant`, `@layer base`...), null nếu chưa đóng gói. */
export const resolveTailwindPlugin = (id: string): string | null => TAILWIND_PLUGIN_CSS[ALIASES[id] ?? id] ?? null
