/**
 * Trích xuất CSS tĩnh (static extraction).
 *
 * Mục đích: quét chuỗi nguồn (HTML, JSX/TSX, template) để lấy các class ứng viên,
 * chạy engine ở chế độ SSR (không DOM), và sinh ra CSS tĩnh dùng cho build-time.
 * Nhờ đó trang có thể nạp CSS sẵn sàng, không phải chờ runtime parse ở trình duyệt.
 */
import { xcss, type XCSSConfig } from './core'

export interface ExtractOptions extends XCSSConfig {
    /**
     * Bổ sung các class không xuất hiện trực tiếp trong nguồn (ví dụ class sinh động
     * bằng biểu thức). Các class này luôn được đưa vào kết quả.
     */
    safelist?: string[]
}

export interface ExtractResult {
    /** Chuỗi CSS tĩnh, đã bọc `@media` và `@layer` theo cấu hình engine. */
    css: string
    /** Danh sách class ứng viên tìm thấy trong nguồn (đã khử trùng lặp). */
    candidates: string[]
    /** Map class nguồn -> tên class rút gọn khi bật `hashClassName`. */
    classMap: Record<string, string>
    /** Số class thực sự sinh ra được CSS hợp lệ. */
    matched: number
}

// Ký tự hợp lệ trong một class x-css: chữ, số, và các ký tự cú pháp của engine.
// KHÔNG gồm dấu nháy kép và dấu phẩy để token không nuốt cú pháp của mã nguồn.
const CLASS_TOKEN_REGEX = /[A-Za-z0-9_][A-Za-z0-9_@:%#.;!()[\]/*+~<>=$&|^?'-]*/g

/**
 * Cắt phần đuôi do cú pháp mã nguồn dính vào token.
 *
 * Ví dụ trong `clsx('fz14px', active && 'cRed')`, quét thô sẽ ra `cRed')`.
 * Nếu không cắt, engine SSR (không có `CSS.supports`) sẽ sinh ra khai báo rác
 * dạng `color:Red')`. Chỉ cắt khi ký tự đóng KHÔNG có ký tự mở tương ứng.
 */
const trimSourceSyntaxTail = (token: string): string => {
    let end = token.length

    while (end > 0) {
        const ch = token[end - 1]

        if (ch === "'") {
            // `';` là cú pháp hợp lệ của engine, nhưng dấu nháy đơn ở CUỐI thì không.
            end--
            continue
        }

        if (ch === ')' || ch === ']') {
            const open = ch === ')' ? '(' : '['
            let depth = 0
            for (let i = 0; i < end; i++) {
                if (token[i] === open) depth++
                else if (token[i] === ch) depth--
            }
            // depth < 0 nghĩa là thừa ký tự đóng -> thuộc mã nguồn, không thuộc class.
            if (depth < 0) {
                end--
                continue
            }
        }

        break
    }

    return token.slice(0, end)
}

/**
 * Tách các class ứng viên từ chuỗi nguồn bất kỳ.
 *
 * Ưu tiên nội dung của `class` / `className` (kể cả `clsx(...)`, template literal),
 * và luôn có nhánh quét toàn văn để không bỏ sót class viết trong biến hoặc mảng.
 */
export const extractCandidates = (source: string): string[] => {
    if (typeof source !== 'string' || !source) return []

    const found = new Set<string>()

    const pushToken = (token: string) => {
        const value = trimSourceSyntaxTail(token.trim())
        if (!value) return
        // Loại bỏ token quá ngắn hoặc không bắt đầu bằng ký tự property hợp lệ.
        if (value.length < 2) return
        found.add(value)
    }

    const collect = (text: string) => {
        const matches = text.match(CLASS_TOKEN_REGEX)
        if (!matches) return
        matches.forEach(pushToken)
    }

    // 1) Ưu tiên các vùng class/className để tăng độ chính xác.
    const attrRegex = /(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}|`([^`]*)`)/g
    let attrMatch: RegExpExecArray | null
    while ((attrMatch = attrRegex.exec(source)) !== null) {
        const value = attrMatch[1] ?? attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ''
        collect(value)
    }

    // 2) Quét toàn văn các chuỗi trích dẫn để bắt class nằm ngoài thuộc tính.
    const stringRegex = /"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g
    let stringMatch: RegExpExecArray | null
    while ((stringMatch = stringRegex.exec(source)) !== null) {
        const value = stringMatch[1] ?? stringMatch[2] ?? stringMatch[3] ?? ''
        collect(value)
    }

    return [...found]
}

/**
 * Sinh CSS tĩnh từ danh sách class cho trước (không quét nguồn).
 */
export const extractFromClasses = async (
    classes: string[],
    options?: ExtractOptions,
): Promise<ExtractResult> => {
    const { safelist = [], ...config } = options || {}
    const candidates = [...new Set([...classes, ...safelist].filter((c) => typeof c === 'string' && c.trim()))]

    // Khi `hashClassName: false`, đầu ra của clsx luôn trùng đầu vào nên không thể
    // dùng để biết class nào sinh được CSS. Vì vậy phép đếm `matched` luôn chạy trên
    // một engine bật hash; engine xuất CSS vẫn dùng đúng cấu hình của người dùng.
    const keepOriginalNames = config.hashClassName === false
    const probeEngine = keepOriginalNames
        ? xcss({ ...(config as XCSSConfig), hashClassName: true })
        : null
    const probe = probeEngine ? probeEngine.buildCss(undefined) : null
    if (probeEngine) await probeEngine.ready

    const engine = xcss(config as XCSSConfig)
    const built = engine.buildCss(undefined)
    await engine.ready

    const classMap: Record<string, string> = {}
    let matched = 0

    candidates.forEach((candidate) => {
        const output = built.clsx(candidate)
        const probeOutput = probe ? probe.clsx(candidate) : output
        if (probeOutput !== candidate) {
            matched++
            if (!keepOriginalNames) classMap[candidate] = output
        }
    })
    probe?.destroy()

    // clsx phát sự kiện đồng bộ ở môi trường không có DOM, nhưng vẫn nhường một vòng
    // microtask để mọi handler kịp ghi vào text store trước khi đọc CSS.
    await Promise.resolve()

    const css = built.getCssString()
    built.destroy()

    return { css, candidates, classMap, matched }
}

/**
 * Quét chuỗi nguồn và sinh CSS tĩnh tương ứng.
 */
export const extract = async (
    source: string,
    options?: ExtractOptions,
): Promise<ExtractResult> => {
    return extractFromClasses(extractCandidates(source), options)
}
