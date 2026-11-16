/**
 * Hàm xử lý chuỗi CSS thuần (không trạng thái, không dữ liệu Tailwind) dùng chung giữa phương ngữ
 * (src/tailwind-v4-core.ts) và phần đọc stylesheet (src/tailwind-stylesheet.ts). Bản CDN `tailwind-auto` chép
 * các hàm này vào cả hai file tự chứa nên giữ chúng nhỏ.
 */

/**
 * Một rule: selector (`&` là phần tử), khai báo; `query` là điều kiện media riêng (`container`); `at` là các at-rule
 * khác bọc rule (`@layer x`, `@supports (...)` trong utility của plugin như daisyUI), ngoài vào trong; `more` là rule kèm theo.
 */
export type Rule = { sel: string; decls: Array<[string, string]>; query?: string; at?: string[]; more?: Rule[] }

/** Chuẩn hoá tiền tố như Tailwind v4: bỏ một `-` cuối (kiểu v3 `tw-`), chỉ nhận chữ thường a-z. */
export const normalizeTailwindPrefix = (prefix: string): string => {
    const value = prefix.endsWith('-') ? prefix.slice(0, -1) : prefix
    if (!/^[a-z]+$/.test(value)) throw new Error(`The prefix "${value}" is invalid. Prefixes must be lowercase ASCII letters (a-z) only.`)
    return value
}

/** Giá trị tuỳ ý: `_` là khoảng trắng, `\_` giữ gạch dưới. */
export const arbitraryInner = (raw: string) => raw.replace(/\\_/g, '\u0000').replace(/_/g, ' ').replace(/\u0000/g, '_')

/** Tách theo dấu phẩy ở cấp ngoài cùng (không tách trong ngoặc/nháy). */
export const splitTopLevel = (text: string, separator = ','): string[] => {
    const parts: string[] = []
    let depth = 0
    let quote = ''
    let start = 0
    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (quote) {
            if (ch === '\\') i++
            else if (ch === quote) quote = ''
        } else if (ch === '"' || ch === "'") quote = ch
        else if (ch === '(' || ch === '[') depth++
        else if (ch === ')' || ch === ']') depth--
        else if (ch === separator && depth === 0) {
            parts.push(text.slice(start, i))
            start = i + 1
        }
    }
    parts.push(text.slice(start))
    return parts.map((p) => p.trim()).filter(Boolean)
}

/** Thay mọi `name(...)` trong chuỗi bằng `fn(nội dung)`; null nếu một lần thay thất bại. */
export const replaceCssFunction = (value: string, name: string, fn: (args: string) => string | null): string | null => {
    let out = ''
    let i = 0
    for (let at = value.indexOf(name + '(', i); at !== -1; at = value.indexOf(name + '(', i)) {
        let depth = 1
        let k = at + name.length + 1
        while (k < value.length && depth > 0) {
            if (value[k] === '(') depth++
            else if (value[k] === ')') depth--
            k++
        }
        const replaced = fn(value.slice(at + name.length + 1, k - 1))
        if (replaced === null) return null
        out += value.slice(i, at) + replaced
        i = k
    }
    return out + value.slice(i)
}

export const encodeArbitrary = (text: string) => `[${text.replace(/_/g, '\\_').replace(/\s+/g, '_')}]`
