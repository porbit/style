import { mitt } from './events'
import { STANDARD_CSS_PROPERTIES, isOpenPropertyName } from './css-properties'
import { parseClassName } from './parser'
import {
    SHORT_PROPERTIES as BUILTIN_SHORT_PROPERTIES,
    COMMON_VALUES as BUILTIN_COMMON_VALUES,
    SPECIFIC_VALUES as BUILTIN_SPECIFIC_VALUES,
} from './dictionary'

// Cờ build (tsup.config.ts `define`): bản CDN Tailwind (`tailwind-auto.mjs`) đặt cả hai là false để bundler
// loại bỏ phần không dùng. Mọi entry khác đặt true; không định nghĩa (chạy thẳng mã nguồn: vitest...) cũng là true.
//   __XCSS_CACHE__: cache localStorage (nén LZW/deflate), đồng bộ khoá giữa tab, nạp CSS từ cache lúc khởi tạo.
//   __XCSS_DICTIONARY__: từ điển x-css dựng sẵn, nạp từ điển ngoài (URL/Node), danh sách property chuẩn.
// Khi tắt từ điển, engine chạy như `dictionaryImport: false` dù cấu hình đặt gì.
declare const __XCSS_CACHE__: boolean | undefined
declare const __XCSS_DICTIONARY__: boolean | undefined
const CACHE_BUILD = typeof __XCSS_CACHE__ === 'undefined' || __XCSS_CACHE__
const DICTIONARY_BUILD = typeof __XCSS_DICTIONARY__ === 'undefined' || __XCSS_DICTIONARY__


export type XCSSConfig = {
    base?: string
    aliases?: Record<string, string[]>
    excludes?: string[]
    excludePrefixes?: string[]
    breakpoints?: Record<string, string>[]
    theme?: Record<string, string>
    prefix?: string
    hashClassName?: boolean
    dictionaryImport?: boolean | string
    /**
     * Bọc các rule có selector `:hover` trong `@media (hover: hover)` để tránh
     * sticky-hover trên thiết bị cảm ứng (mobile). Mặc định false (giữ hành vi cũ).
     */
    hoverMedia?: boolean
    /**
     * Tự thêm tiền tố `-webkit-` cho các property cần thiết trên Safari/iOS
     * (backdrop-filter, mask, user-select, position:sticky, background-clip:text...).
     * Chỉ thêm declaration vendor khi nó hợp lệ, không bao giờ làm hỏng rule chuẩn.
     * Mặc định false.
     */
    autoprefix?: boolean
    /**
     * Tắt mọi `console.warn` / `console.error` của engine ở runtime production.
     * Mặc định false (vẫn cảnh báo).
     */
    silent?: boolean
    /**
     * Trần số entry cho memo cache nội bộ (class -> declaration). Khi vượt trần,
     * cache được xoá sạch để tránh phình bộ nhớ ở ứng dụng sinh class động vô hạn.
     * Mặc định 5000. Đặt 0 để bỏ giới hạn.
     */
    maxCacheEntries?: number
    /**
     * Static-first: danh sách class đã có CSS từ bước build (`presence-style extract --manifest`).
     * Engine coi các class này là đã xử lý nên không parse, không dựng rule ở runtime.
     * `classMap` (class nguồn -> tên rút gọn) bắt buộc khi build bật `hashClassName`
     * để runtime trả đúng tên class đã dùng trong CSS tĩnh.
     */
    preload?: XCSSPreloadManifest
    /**
     * Phương ngữ được thử TRƯỚC cú pháp x-css, ví dụ `[tailwindDialect()]` từ
     * `@porbit/style/tailwind` để viết thẳng class Tailwind mà không cần build.
     */
    dialects?: XCSSDialect[]
    cache?: {
        styleId?: string
        version?: string
        compression?: boolean
        debounceMs?: number
        sizeLast?: number
        loadOnInit?: boolean
    }
}

/**
 * Phương ngữ: hàm đổi một class theo cú pháp khác (ví dụ Tailwind) thành các token x-css.
 * Trả `null` khi không nhận class đó; engine sẽ xử lý class như x-css bình thường.
 * Token liền kề cùng media/layer/selector gộp thành một rule; khác nhau thì thành nhiều rule cho cùng class.
 */
export type XCSSDialect = ((className: string) => string[] | null) & {
    /** Breakpoint riêng của phương ngữ (ví dụ `tw-sm` = 40rem của Tailwind), nối sau breakpoint của engine. */
    breakpoints?: Record<string, string>[]
    /** CSS nền phương ngữ cần (ví dụ `@property` của Tailwind), đặt ngay sau câu khai báo thứ tự layer. */
    baseCss?: string
    /**
     * Thứ tự rule trong CSS (cascade) giữa các class của phương ngữ, như thứ tự của Tailwind:
     * rule được chèn đúng vị trí thay vì nối theo thứ tự gặp class. Trả số âm nếu `a` đứng trước `b`.
     */
    compare?: (a: string, b: string) => number
    /** Danh sách class phương ngữ sinh được (cho gợi ý của editor). */
    classList?: () => string[]
    /** Danh sách biến thể dùng trước `:` (cho gợi ý của editor). */
    variantList?: () => string[]
    /** Khai báo phương ngữ sinh ra đã được kiểm ở nguồn: bỏ qua CSS.supports (selector vẫn được kiểm). */
    trusted?: boolean
    /**
     * Class thuộc phương ngữ dù phương ngữ không sinh được CSS (ví dụ `z-1` có dạng utility Tailwind nhưng giá trị
     * không hợp lệ): engine không hiểu class theo cú pháp x-css nữa, tránh sinh CSS sai (`z-index:-1`).
     */
    owns?: (className: string) => boolean
}

export type XCSSPreloadManifest = {
    classes?: string[]
    classMap?: Record<string, string>
    /**
     * Bỏ qua lần quét DOM đầu tiên vì HTML ban đầu đã được trích xuất đủ ở bước build
     * (SSR/SSG cùng một lần build). Observer vẫn xử lý mọi node và class thêm sau đó.
     * Chỉ bật khi chắc chắn CSS tĩnh phủ hết HTML ban đầu.
     */
    skipInitialScan?: boolean
    /**
     * Chế độ lai (CSS tĩnh build sẵn + runtime): trả khối `@layer` của stylesheet tĩnh để chèn rule sinh lúc
     * chạy của `layer` vào đó, đúng vị trí theo thứ tự của phương ngữ, thay vì vào sheet riêng (luôn đứng sau CSS
     * tĩnh). Không trả gì: dùng sheet riêng như thường. Xem `staticLayerBlock` trong src/hybrid.ts.
     */
    staticBlock?: (layer: number) => XCSSStaticBlock | null | undefined
}

/**
 * Khối `@layer` có sẵn mà runtime chèn rule vào (chế độ lai). `b`: khối; `g`: với mỗi rule của khối theo thứ tự,
 * nhóm chứa nó (null: rule nằm thẳng trong khối; nhóm `@media`/`@supports` chỉ chứa style rule: chính nhóm, wrap ghi
 * ở thuộc tính `w`); `k`: khoá thứ tự tương ứng (`compare` của phương ngữ + tên class; undefined: đứng trước mọi
 * class có thứ tự).
 */
export type XCSSStaticBlock = {
    b: CSSGroupingRule
    g: any[]
    k: Array<{ compare: (a: string, b: string) => number; name: string } | undefined>
}

type CssPropertyMap = Record<string, string>
type CssValueMap = Record<string, Record<string, string>>
type CssCommonValueMap = Record<string, string>

type XCSSDictionaryData = {
    SHORT_PROPERTIES: CssPropertyMap
    COMMON_VALUES: CssCommonValueMap
    SPECIFIC_VALUES: CssValueMap
}

type DictionaryModuleShape = Partial<XCSSDictionaryData> & {
    default?: Partial<XCSSDictionaryData>
}

type XCSSCacheConfig = {
    styleId: string
    version: string
    compression: boolean
    debounceMs: number
    sizeLast: number
    loadOnInit: boolean
}

type XCSSCacheEnvelopeLZW = {
    __xcss_cache_v: 2
    compressed: true
    payload: string
}

type XCSSCacheEnvelopeStream = {
    __xcss_cache_v: 3
    compressed: true
    algorithm: 'deflate-raw'
    encoding: 'base64'
    payload: string
}

type XCSSKeySyncPayload = {
    source: string
    sizeLast: number
    entries: [string, string][]
}

type XCSSKeyRegistry = {
    sizeLast: number
    entries: [string, string][]
}

type NodeBuiltinProcess = typeof process & {
    getBuiltinModule?: (id: string) => unknown
}

const BUILTIN_DICTIONARY: XCSSDictionaryData = {
    SHORT_PROPERTIES: BUILTIN_SHORT_PROPERTIES,
    COMMON_VALUES: BUILTIN_COMMON_VALUES,
    SPECIFIC_VALUES: BUILTIN_SPECIFIC_VALUES,
}


const resolveCacheConfig = (config?: XCSSConfig['cache']): XCSSCacheConfig => {
    const styleId =
        typeof config?.styleId === 'string' && config.styleId.trim()
            ? config.styleId.trim()
            : 'presence-style'
    const version =
        typeof config?.version === 'string' && config.version.trim()
            ? config.version.trim()
            : 'v1'
    const compression = config?.compression ?? true
    const debounceMs =
        typeof config?.debounceMs === 'number' && config.debounceMs >= 0
            ? config.debounceMs
            : 1000
    const sizeLast =
        typeof config?.sizeLast === 'number' && Number.isFinite(config.sizeLast) && config.sizeLast >= 0
            ? Math.floor(config.sizeLast)
            : 1000
    const loadOnInit = config?.loadOnInit ?? false

    return { styleId, version, compression, debounceMs, sizeLast, loadOnInit }
}

const createCacheKey = (cache: XCSSCacheConfig): string => `${cache.styleId}_cache_${cache.version}`
// Key sync nhẹ cho cross-tab: delta sync cho key/value mới phát sinh.
const createKeySyncKey = (cache: XCSSCacheConfig): string => `${cache.styleId}_ks_${cache.version}`
const createKeySyncChannelName = (cache: XCSSCacheConfig): string => `${cache.styleId}_bc_${cache.version}`
const createKeyRegistryKey = (cache: XCSSCacheConfig): string => `${cache.styleId}_kr_${cache.version}`

const readKeyRegistry = (storage: Storage | null, key: string): XCSSKeyRegistry => {
    if (!storage) return { sizeLast: 0, entries: [] }

    try {
        const raw = storage.getItem(key)
        if (!raw) return { sizeLast: 0, entries: [] }

        const parsed = JSON.parse(raw) as {
            sizeLast?: unknown
            entries?: unknown
            s?: unknown
            e?: unknown
        }

        const sizeSource = typeof parsed.sizeLast === 'number'
            ? parsed.sizeLast
            : typeof parsed.s === 'number'
                ? parsed.s
                : 0

        const entriesSource = Array.isArray(parsed.entries)
            ? parsed.entries
            : Array.isArray(parsed.e)
                ? parsed.e
                : []

        const entries = entriesSource.filter((entry): entry is [string, string] => {
            return (
                Array.isArray(entry) &&
                entry.length === 2 &&
                typeof entry[0] === 'string' &&
                typeof entry[1] === 'string'
            )
        })

        return {
            sizeLast: Number.isFinite(sizeSource) && sizeSource >= 0 ? Math.floor(sizeSource) : 0,
            entries,
        }
    } catch (_error) {
        return { sizeLast: 0, entries: [] }
    }
}

const writeKeyRegistry = (storage: Storage | null, key: string, registry: XCSSKeyRegistry): void => {
    if (!storage) return

    try {
        storage.setItem(
            key,
            JSON.stringify({
                s: registry.sizeLast,
                e: registry.entries,
            }),
        )
    } catch (_error) {
        // Bỏ qua lỗi ghi localStorage (quota, private mode, ...)
    }
}

// Đọc `window.localStorage` có thể ném SecurityError (iframe sandbox, file://,
// trình duyệt chặn cookie/bộ nhớ). Mọi truy cập phải đi qua hàm này.
const getLocalStorageSafe = (): Storage | null => {
    if (typeof window === 'undefined') return null
    try {
        return window.localStorage || null
    } catch (_error) {
        return null
    }
}

const canUseWritableLocalStorage = (): boolean => {
    if (!getLocalStorageSafe()) return false

    try {
        const key = '__xcss_cache_probe__'
        window.localStorage.setItem(key, '1')
        window.localStorage.removeItem(key)
        return true
    } catch (_error) {
        return false
    }
}

// Kiểm tra Web Locks API có khả dụng không
const canUseCacheRuntime = (): boolean => canUseWritableLocalStorage()


const isCacheEnvelopeLZW = (value: unknown): value is XCSSCacheEnvelopeLZW => {
    if (!value || typeof value !== 'object') return false
    const obj = value as Partial<XCSSCacheEnvelopeLZW>
    return obj.__xcss_cache_v === 2 && obj.compressed === true && typeof obj.payload === 'string'
}

const isCacheEnvelopeStream = (value: unknown): value is XCSSCacheEnvelopeStream => {
    if (!value || typeof value !== 'object') return false
    const obj = value as Partial<XCSSCacheEnvelopeStream>
    return (
        obj.__xcss_cache_v === 3 &&
        obj.compressed === true &&
        obj.algorithm === 'deflate-raw' &&
        obj.encoding === 'base64' &&
        typeof obj.payload === 'string'
    )
}

const canUseCompressionStream = (): boolean =>
    typeof CompressionStream !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof Response !== 'undefined'

const canUseDecompressionStream = (): boolean =>
    typeof DecompressionStream !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof Response !== 'undefined'

const bytesToBase64 = (bytes: Uint8Array): string => {
    if (typeof btoa === 'function') {
        let binary = ''
        const CHUNK_SIZE = 0x8000
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const chunk = bytes.subarray(i, i + CHUNK_SIZE)
            for (let j = 0; j < chunk.length; j++) {
                binary += String.fromCharCode(chunk[j])
            }
        }
        return btoa(binary)
    }

    const buff = (globalThis as any).Buffer
    if (typeof buff !== 'undefined') {
        return buff.from(bytes).toString('base64')
    }

    throw new Error('XCSS: base64 encoding is not supported in this runtime')
}

const base64ToBytes = (base64: string): Uint8Array => {
    if (typeof atob === 'function') {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
        }
        return bytes
    }

    const buff = (globalThis as any).Buffer
    if (typeof buff !== 'undefined') {
        return new Uint8Array(buff.from(base64, 'base64'))
    }

    throw new Error('XCSS: base64 decoding is not supported in this runtime')
}

const compressDeflateRawBase64 = async (input: string): Promise<string> => {
    if (!canUseCompressionStream()) {
        throw new Error('XCSS: CompressionStream is not supported')
    }

    const stream = new Blob([input])
        .stream()
        .pipeThrough(new CompressionStream('deflate-raw'))

    const compressed = await new Response(stream).arrayBuffer()
    return bytesToBase64(new Uint8Array(compressed))
}

const decompressDeflateRawBase64 = async (payload: string): Promise<string> => {
    if (!canUseDecompressionStream()) {
        throw new Error('XCSS: DecompressionStream is not supported')
    }

    const bytes = base64ToBytes(payload)
    const normalized = new Uint8Array(bytes.length)
    normalized.set(bytes)
    const stream = new Blob([normalized.buffer])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'))

    return await new Response(stream).text()
}

const isStreamCacheEnvelopeRaw = (raw: string): boolean => {
    try {
        const parsed = JSON.parse(raw)
        return isCacheEnvelopeStream(parsed)
    } catch (_error) {
        return false
    }
}

const compressLZW = (input: string): string => {
    if (!input) return ''

    const dictionary = new Map<string, number>()
    const codes: number[] = []
    let dictSize = 256

    for (let i = 0; i < 256; i++) {
        dictionary.set(String.fromCharCode(i), i)
    }

    let phrase = input[0]
    for (let i = 1; i < input.length; i++) {
        const currentChar = input[i]
        const phraseWithChar = phrase + currentChar
        if (dictionary.has(phraseWithChar)) {
            phrase = phraseWithChar
        } else {
            codes.push(dictionary.get(phrase)!)
            dictionary.set(phraseWithChar, dictSize++)
            phrase = currentChar
        }
    }
    codes.push(dictionary.get(phrase)!)

    return codes.map((code) => String.fromCharCode(code)).join('')
}

const decompressLZW = (compressed: string): string => {
    if (!compressed) return ''

    const dictionary = new Map<number, string>()
    let dictSize = 256
    let result = ''

    for (let i = 0; i < 256; i++) {
        dictionary.set(i, String.fromCharCode(i))
    }

    const codes = compressed.split('').map((char) => char.charCodeAt(0))
    let previous = codes[0]
    let phrase = dictionary.get(previous) || ''
    result = phrase

    for (let i = 1; i < codes.length; i++) {
        const current = codes[i]
        let entry = dictionary.get(current)
        if (!entry) {
            entry = current === dictSize ? phrase + phrase[0] : ''
        }
        result += entry
        dictionary.set(dictSize++, phrase + entry[0])
        phrase = entry
    }

    return result
}

const resolveDictionaryData = (mod: unknown): XCSSDictionaryData | null => {
    if (!mod || typeof mod !== 'object') return null

    const moduleObj = mod as DictionaryModuleShape
    const source =
        moduleObj.default && typeof moduleObj.default === 'object'
            ? moduleObj.default
            : moduleObj

    const short = source.SHORT_PROPERTIES
    const common = source.COMMON_VALUES
    const specific = source.SPECIFIC_VALUES

    if (!short || !common || !specific) return null
    if (
        typeof short !== 'object' ||
        typeof common !== 'object' ||
        typeof specific !== 'object'
    ) {
        return null
    }

    return {
        SHORT_PROPERTIES: short,
        COMMON_VALUES: common,
        SPECIFIC_VALUES: specific,
    }
}

const normalizeKeySyncPayload = (value: unknown): XCSSKeySyncPayload | null => {
    if (!value || typeof value !== 'object') return null

    const obj = value as Partial<XCSSKeySyncPayload> & {
        s?: unknown
        k?: unknown
    }

    const entriesSource = Array.isArray(obj.entries)
        ? obj.entries
        : Array.isArray(obj.k)
            ? obj.k
            : null

    if (!entriesSource) return null

    const entries = entriesSource.filter((entry): entry is [string, string] => {
        return (
            Array.isArray(entry) &&
            entry.length === 2 &&
            typeof entry[0] === 'string' &&
            typeof entry[1] === 'string'
        )
    })

    const sizeLast = typeof obj.sizeLast === 'number'
        ? obj.sizeLast
        : typeof obj.s === 'number'
            ? obj.s
            : null

    if (sizeLast === null) return null

    return {
        source: typeof obj.source === 'string' ? obj.source : '',
        sizeLast,
        entries,
    }
}

const skipWhitespace = (source: string, start: number): number => {
    let index = start
    while (index < source.length && /\s/.test(source[index])) {
        index++
    }
    return index
}

const findMatchingBrace = (source: string, start: number): number => {
    let depth = 0
    let quote: '"' | "'" | '`' | null = null
    let escaped = false
    let lineComment = false
    let blockComment = false

    for (let index = start; index < source.length; index++) {
        const char = source[index]
        const next = source[index + 1]

        if (lineComment) {
            if (char === '\n') {
                lineComment = false
            }
            continue
        }

        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false
                index++
            }
            continue
        }

        if (quote) {
            if (escaped) {
                escaped = false
                continue
            }
            if (char === '\\') {
                escaped = true
                continue
            }
            if (char === quote) {
                quote = null
            }
            continue
        }

        if (char === '/' && next === '/') {
            lineComment = true
            index++
            continue
        }

        if (char === '/' && next === '*') {
            blockComment = true
            index++
            continue
        }

        if (char === '"' || char === "'" || char === '`') {
            quote = char
            continue
        }

        if (char === '{') {
            depth++
            continue
        }

        if (char === '}') {
            depth--
            if (depth === 0) {
                return index
            }
        }
    }

    return -1
}

const extractExportedObjectLiteral = (source: string, marker: string): string | null => {
    const index = source.indexOf(marker)
    if (index === -1) return null

    const objectStart = skipWhitespace(source, index + marker.length)
    if (source[objectStart] !== '{') return null

    const objectEnd = findMatchingBrace(source, objectStart)
    if (objectEnd === -1) return null

    return source.slice(objectStart, objectEnd + 1)
}

const skipWhitespaceAndComments = (source: string, start: number): number => {
    let index = start

    while (index < source.length) {
        const char = source[index]
        const next = source[index + 1]

        if (/\s/.test(char)) {
            index++
            continue
        }

        if (char === '/' && next === '/') {
            index += 2
            while (index < source.length && source[index] !== '\n') {
                index++
            }
            continue
        }

        if (char === '/' && next === '*') {
            index += 2
            while (index < source.length) {
                if (source[index] === '*' && source[index + 1] === '/') {
                    index += 2
                    break
                }
                index++
            }
            continue
        }

        break
    }

    return index
}

const parseQuotedString = (
    source: string,
    start: number,
): { value: string, end: number } | null => {
    const quote = source[start]
    if (quote !== '"' && quote !== "'") return null

    let value = ''
    let index = start + 1

    while (index < source.length) {
        const char = source[index]

        if (char === '\\') {
            index++
            if (index >= source.length) return null

            const escaped = source[index]
            const escapeMap: Record<string, string> = {
                n: '\n',
                r: '\r',
                t: '\t',
                b: '\b',
                f: '\f',
                v: '\v',
                '\\': '\\',
                '"': '"',
                "'": "'",
            }

            value += escapeMap[escaped] ?? escaped
            index++
            continue
        }

        if (char === quote) {
            return { value, end: index + 1 }
        }

        value += char
        index++
    }

    return null
}

const parseIdentifierToken = (
    source: string,
    start: number,
): { value: string, end: number } | null => {
    const first = source[start]
    if (!first || !/[A-Za-z_$]/.test(first)) {
        return null
    }

    let end = start + 1
    while (end < source.length && /[A-Za-z0-9_$]/.test(source[end])) {
        end++
    }

    return {
        value: source.slice(start, end),
        end,
    }
}

const parsePlainObjectLiteral = (expression: string): Record<string, unknown> | null => {
    const parseValue = (
        source: string,
        start: number,
    ): { value: unknown, end: number } | null => {
        const index = skipWhitespaceAndComments(source, start)
        const char = source[index]

        if (char === '{') {
            return parseObject(source, index)
        }

        return parseQuotedString(source, index)
    }

    const parseObject = (
        source: string,
        start: number,
    ): { value: Record<string, unknown>, end: number } | null => {
        let index = skipWhitespaceAndComments(source, start)
        if (source[index] !== '{') return null

        index++
        const objectValue: Record<string, unknown> = {}

        while (index < source.length) {
            index = skipWhitespaceAndComments(source, index)

            if (source[index] === '}') {
                return {
                    value: objectValue,
                    end: index + 1,
                }
            }

            const keyToken =
                parseQuotedString(source, index) ||
                parseIdentifierToken(source, index)
            if (!keyToken) return null

            index = skipWhitespaceAndComments(source, keyToken.end)
            if (source[index] !== ':') {
                return null
            }

            index++
            const valueToken = parseValue(source, index)
            if (!valueToken) return null

            objectValue[keyToken.value] = valueToken.value
            index = skipWhitespaceAndComments(source, valueToken.end)

            if (source[index] === ',') {
                index++
                continue
            }

            if (source[index] === '}') {
                return {
                    value: objectValue,
                    end: index + 1,
                }
            }

            return null
        }

        return null
    }

    const parsed = parseObject(expression, 0)
    if (!parsed) {
        return null
    }

    return skipWhitespaceAndComments(expression, parsed.end) === expression.length
        ? parsed.value
        : null
}

const parseExternalDictionarySource = (sourceCode: string): XCSSDictionaryData | null => {
    const shortLiteral = extractExportedObjectLiteral(
        sourceCode,
        'export const SHORT_PROPERTIES =',
    )
    const commonLiteral = extractExportedObjectLiteral(
        sourceCode,
        'export const COMMON_VALUES =',
    )
    const specificLiteral = extractExportedObjectLiteral(
        sourceCode,
        'export const SPECIFIC_VALUES =',
    )

    if (shortLiteral && commonLiteral && specificLiteral) {
        return resolveDictionaryData({
            SHORT_PROPERTIES: parsePlainObjectLiteral(shortLiteral),
            COMMON_VALUES: parsePlainObjectLiteral(commonLiteral),
            SPECIFIC_VALUES: parsePlainObjectLiteral(specificLiteral),
        })
    }

    const defaultLiteral = extractExportedObjectLiteral(sourceCode, 'export default')
    if (!defaultLiteral) return null

    return resolveDictionaryData(parsePlainObjectLiteral(defaultLiteral))
}

const readDictionarySourceFromNode = async (source: string): Promise<string | null> => {
    const nodeProcess =
        typeof process !== 'undefined'
            ? (process as NodeBuiltinProcess)
            : null

    if (!nodeProcess || typeof nodeProcess.getBuiltinModule !== 'function') {
        return null
    }

    const isFileUrl = source.startsWith('file:')
    const isPathLike =
        source.startsWith('/') ||
        source.startsWith('./') ||
        source.startsWith('../') ||
        /^[A-Za-z]:[\\/]/.test(source)

    if (!isFileUrl && !isPathLike) {
        return null
    }

    const fs = nodeProcess.getBuiltinModule('node:fs/promises') as {
        readFile?: (path: string | URL, encoding: BufferEncoding) => Promise<string>
    } | null

    if (!fs?.readFile) {
        return null
    }

    return fs.readFile(isFileUrl ? new URL(source) : source, 'utf8')
}

const readExternalDictionarySource = async (source: string): Promise<string> => {
    const nodeSource = await readDictionarySourceFromNode(source)
    if (typeof nodeSource === 'string') {
        return nodeSource
    }

    if (typeof fetch === 'function') {
        const response = await fetch(source)
        if (!response.ok) {
            throw new Error(`XCSS: Failed to fetch dictionary module: ${response.status}`)
        }
        return response.text()
    }

    throw new Error('XCSS: fetch is not supported in this runtime')
}

const loadExternalDictionary = async (source: string): Promise<XCSSDictionaryData> => {
    const sourceCode = await readExternalDictionarySource(source)
    const data = parseExternalDictionarySource(sourceCode)
    if (!data) {
        throw new Error(DICTIONARY_MODULE_ERROR)
    }
    return data
}

const DICTIONARY_MODULE_ERROR =
    'XCSS: dictionary module must export plain-object SHORT_PROPERTIES, COMMON_VALUES and SPECIFIC_VALUES'

// Thứ tự cascade layer: l0 thấp nhất, l23 cao nhất. PHẢI được khai báo trước mọi rule
// `@layer lN{...}`, nếu không trình duyệt xếp layer theo lần xuất hiện đầu tiên.
const LAYER_NAMES = Array.from({ length: 24 }, (_, i) => 'l' + i)
export const LAYER_ORDER_STATEMENT = `@layer ${LAYER_NAMES.join(', ')};`

/**
 * Ghép selector của class với hậu tố: thường là nối sau (`.c` + `:hover`); nếu hậu tố chứa `&`
 * thì `&` được thay bằng class, cho phép bọc class (`:where(& > :not(:last-child))`).
 */
export const composeSelector = (classSelector: string, selector: string): string =>
    selector.includes('&') ? selector.replace(/&/g, classSelector) : classSelector + selector

/**
 * Media key dạng at-rule nội tuyến `[@...]`, ví dụ `[@supports_(display:grid)]`, `[@starting-style]`; nhiều at-rule
 * lồng nhau nối bằng `{` (`[@layer_x{@media_(hover:hover)]`).
 */
export const isInlineAtRuleKey = (key: string): boolean => /^\[@[^\]]+\]$/.test(key)
export const decodeInlineAtRule = (key: string): string => key.slice(1, -1).replace(/\\_/g, '\u0000').replace(/_/g, ' ').replace(/\u0000/g, '_')

const setupCssLayers = (docRoot: Document | ShadowRoot | null, id?: string) => {
    if (!docRoot) return
    // Id riêng: trước đây trùng id thẻ bootloader nên bị removeBootloaderStyle() xoá sau
    // hai khung hình, làm thứ tự layer bị tính lại theo lần xuất hiện (layer thấp thắng cao).
    id = (id || 'PresenceStyle') + '-layers'
    const ownerDocument =
        'ownerDocument' in docRoot && docRoot.ownerDocument
            ? docRoot.ownerDocument
            : docRoot as Document

    // Tạo danh sách các layer
    const layers = Array.from({ length: 24 }, (_, i) => {
        return 'l' + i
    })

    // Tạo <style> element
    if (!docRoot.querySelector('style[id="' + id + '"]')) {
        const styleElement = ownerDocument.createElement('style')
        styleElement.id = id
        // Chèn @layer đồng bộ vào textContent TRƯỚC khi gắn vào DOM — tránh CLS
        const layerRule = `@layer ${layers.join(', ')};`
        styleElement.textContent = layerRule
        if (!(docRoot instanceof ShadowRoot)) {
            ownerDocument.head.append(styleElement)
        } else {
            try {
                docRoot.prepend(styleElement)
            } catch (e) {
                docRoot.appendChild(styleElement)
            }
        }
    }
}

// Helper to hash config
/**
 * Giải mã `_` trong giá trị `[...]`: `_` -> khoảng trắng, `\\_` -> `_` nguyên văn.
 * Giữ nguyên nội dung trong chuỗi có nháy (`"..."`, `'...'`) và trong `url(...)`, `attr(...)`
 * vì đó là dữ liệu chữ, không phải cú pháp CSS.
 * Cho phép viết `w[calc(100%_-_2rem)]` = `width: calc(100% - 2rem)` và vẫn có `content["a_b"]`.
 */
const decodeArbitraryUnderscore = (input: string): string => {
    if (!input.includes('_')) return input
    let out = ''
    let i = 0
    while (i < input.length) {
        const ch = input[i]
        if (ch === '\\' && input[i + 1] === '_') {
            out += '_'
            i += 2
            continue
        }
        if (ch === '"' || ch === "'") {
            let j = i + 1
            while (j < input.length && input[j] !== ch) {
                if (input[j] === '\\') j++
                j++
            }
            const end = Math.min(j + 1, input.length)
            out += input.slice(i, end)
            i = end
            continue
        }
        const head = input.slice(i, i + 5).toLowerCase()
        if (head.startsWith('url(') || head.startsWith('attr(')) {
            const close = input.indexOf(')', i)
            const end = close === -1 ? input.length : close + 1
            out += input.slice(i, end)
            i = end
            continue
        }
        out += ch === '_' ? ' ' : ch
        i++
    }
    return out
}

// Mẫu giá trị không được phép khi không có CSS.supports để kiểm tra.
const UNSAFE_VALUE_PATTERN = /[{}<]|\/\*/

/**
 * Kiểm tra cấu trúc của giá trị/selector khi không có CSS.supports.
 * Từ chối: dấu `\` ở cuối (thoát mất `}` đóng khối), nháy không đóng, và ngoặc `(` `[`
 * không đóng hoặc lồng sai. Một ngoặc hoặc nháy hở trong CSS sẽ nuốt mọi rule phía sau.
 */
const hasBalancedStructure = (text: string): boolean => {
    const stack: string[] = []
    let i = 0
    while (i < text.length) {
        const ch = text[i]
        if (ch === '\\') {
            if (i + 1 >= text.length) return false
            i += 2
            continue
        }
        if (ch === '"' || ch === "'") {
            let j = i + 1
            while (j < text.length && text[j] !== ch) {
                if (text[j] === '\\') j++
                j++
            }
            if (j >= text.length) return false
            i = j + 1
            continue
        }
        if (ch === '(' || ch === '[') stack.push(ch)
        else if (ch === ')') {
            if (stack.pop() !== '(') return false
        } else if (ch === ']') {
            if (stack.pop() !== '[') return false
        }
        i++
    }
    return stack.length === 0
}

const hashConfig = (config: XCSSConfig): string => {
    const excludes = Array.isArray(config.excludes)
        ? config.excludes : []
    const cache = resolveCacheConfig(config.cache)

    const str = JSON.stringify({
        base: config.base || '',
        aliases: config.aliases || {},
        breakpoints: config.breakpoints || [],
        theme: config.theme || {},
        prefix: config.prefix || '',
        hashClassName: config.hashClassName ?? true,
        excludes,
        excludePrefixes: config.excludePrefixes || [],
        dictionaryImport: config.dictionaryImport ?? true,
        // Hai cờ này đổi CSS sinh ra (@media (hover:hover), -webkit-*) nên PHẢI vào
        // configHash, nếu không cache cũ sẽ được hydrate nhầm sang cấu hình mới.
        hoverMedia: config.hoverMedia ?? false,
        autoprefix: config.autoprefix ?? false,
        cache,
    })

    let hash = 0
    if (str.length === 0) return hash.toString()
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash |= 0
    }
    return hash.toString()
}

interface XCSSCacheData {
    configHash: string
    cssText: Record<string, string>
    rulesSet: Record<string, string[]>
    keys: [string, string][],
    sizeLast: number
}

/**
 * Hàm factory chính để khởi tạo và cấu hình engine xcss.
 */
const parseCacheDataSync = (raw: string | null): XCSSCacheData | null => {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw)
        if (isCacheEnvelopeLZW(parsed)) {
            const expanded = decompressLZW(parsed.payload)
            if (!expanded) return null
            const data = JSON.parse(expanded) as XCSSCacheData
            return data
        }
        if (isCacheEnvelopeStream(parsed)) return null
        return parsed as XCSSCacheData
    } catch (_error) {
        return null
    }
}

const parseCacheDataAsync = async (raw: string | null): Promise<XCSSCacheData | null> => {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw)
        if (isCacheEnvelopeLZW(parsed)) {
            const expanded = decompressLZW(parsed.payload)
            if (!expanded) return null
            return JSON.parse(expanded) as XCSSCacheData
        }
        if (isCacheEnvelopeStream(parsed)) {
            const expanded = await decompressDeflateRawBase64(parsed.payload)
            if (!expanded) return null
            return JSON.parse(expanded) as XCSSCacheData
        }
        return parsed as XCSSCacheData
    } catch (_error) {
        return null
    }
}

const unwrapCachedCssText = (mediaKey: string, text: string): string => {
    if (mediaKey === 'root') return text
    const match = /@media[^{]+\{\n?([\s\S]+)\n?\}/.exec(text)
    if (match && match[1]) return match[1].trim()
    return text
}

const normalizeBaseCssText = (base?: string | string[] | null): string => {
    if (Array.isArray(base)) return base.join('\n')
    return base || ''
}

const mergeRootCssText = (baseText: string, cachedText: string): string => {
    if (!baseText) return cachedText
    if (!cachedText) return baseText
    if (cachedText === baseText) return baseText
    if (cachedText.startsWith(baseText)) return cachedText
    return `${baseText}\n${cachedText}`
}

/**
 * Hàm factory chính để khởi tạo và cấu hình engine xcss.
 */
export const xcss = (
    modules: XCSSConfig = {
        base: '',
        aliases: {},
        excludes: [],
        excludePrefixes: [],
        breakpoints: [],
        theme: {},
        prefix: '',
        hashClassName: true,
        dictionaryImport: true,
        cache: {
            styleId: 'presence-style',
            version: 'v1',
            compression: true,
            debounceMs: 1000,
            sizeLast: 1000,
            loadOnInit: false,
        },
    },
) => {

    let {
        base: cssDefault = null,
        breakpoints: mediaQuery = [],
        aliases: groupValues = {},
        theme: valueExt = {},
        excludes: excludeNames = [],
        excludePrefixes = [],
        prefix = '',
        hashClassName = true,
        dictionaryImport = true,
        hoverMedia = false,
        autoprefix = false,
        silent = false,
        maxCacheEntries = 5000,
        cache: cacheOptions = {},
        dialects = [],
    } = modules || {}
    const dialectList: XCSSDialect[] = Array.isArray(dialects) ? dialects.filter((d) => typeof d === 'function') : []
    const dialectBaseCss = dialectList.map((d) => (typeof d.baseCss === 'string' ? d.baseCss : '')).filter(Boolean).join('\n')

    // Logger nội bộ: tôn trọng `silent` để bundle production không phát log rác.
    const warn = (...args: unknown[]): void => {
        if (!silent) console.warn(...args)
    }
    const logError = (...args: unknown[]): void => {
        if (!silent) console.error(...args)
    }

    const cacheEntryLimit =
        typeof maxCacheEntries === 'number' && Number.isFinite(maxCacheEntries) && maxCacheEntries >= 0
            ? Math.floor(maxCacheEntries)
            : 5000

    if (!Array.isArray(mediaQuery)) mediaQuery = []
    const dialectBreakpoints = (Array.isArray(dialects) ? dialects : []).flatMap((d: any) => (d && Array.isArray(d.breakpoints) ? d.breakpoints : []))
    if (dialectBreakpoints.length) mediaQuery = [...mediaQuery, ...dialectBreakpoints]
    if (!Array.isArray(excludeNames)) excludeNames = []
    if (!Array.isArray(excludePrefixes)) excludePrefixes = []
    if (!groupValues || typeof groupValues !== 'object') groupValues = {}
    if (!valueExt || typeof valueExt !== 'object') valueExt = {}
    const shouldHashOutputClassName = hashClassName !== false

    const cacheConfig = resolveCacheConfig(cacheOptions)
    const cacheKey = CACHE_BUILD ? createCacheKey(cacheConfig) : ''
    const keySyncKey = CACHE_BUILD ? createKeySyncKey(cacheConfig) : ''
    const keySyncChannelName = CACHE_BUILD ? createKeySyncChannelName(cacheConfig) : ''

    const mergedExcludes = excludeNames

    const normalizedExcludePrefixes = excludePrefixes
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim())
        .filter((x) => x.length > 0)

    const globToRegex = (pattern: string): RegExp => {
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$')
    }

    const excludeRules = mergedExcludes
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .map((pattern) => {
            if (pattern.includes('*')) {
                const regex = globToRegex(pattern)
                return (cls: string) => regex.test(cls)
            }
            return (cls: string) => cls === pattern
        })

    const isExcludedClass = (txtClass: string): boolean => {
        if (normalizedExcludePrefixes.some((prefixText) => txtClass.startsWith(prefixText))) {
            return true
        }
        return excludeRules.some((rule) => rule(txtClass))
    }

    const shouldProcessClass = (txtClass: string): boolean => {
        // Step 1: Exclude rules first.
        if (isExcludedClass(txtClass)) return false
        // Step 2: Prefix check.
        if (prefix && !txtClass.startsWith(prefix)) return false
        return true
    }

    const defaultMediaKeys = ['default', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'sma', 'mda', 'lga', 'xla']
    const customMediaKeys = mediaQuery
        .filter((m): m is Record<string, string> => !!m && typeof m === 'object' && !Array.isArray(m))
        .map((m) => Object.keys(m)[0])
        .filter((k): k is string => typeof k === 'string' && k.length > 0)
    const mediaKeySet = new Set<string>([...defaultMediaKeys, ...customMediaKeys])
    // `[@supports_(display:grid)]`: at-rule nội tuyến (không cần đăng ký), `_` là khoảng trắng.
    const isValidMediaKey = (mq?: string): boolean => !mq || mediaKeySet.has(mq) || isInlineAtRuleKey(mq)
    const shouldEnforceKnownProperties = DICTIONARY_BUILD && dictionaryImport !== false
    const compositePropertyKeys = new Set(['mx', 'my', 'px', 'py', 'bdx', 'bdy'])
    let knownFullPropertyNames = new Set<string>()
    const standardPropertyNames = new Set<string>(DICTIONARY_BUILD ? STANDARD_CSS_PROPERTIES : [])
    const isKnownPropertyKey = (prop: string): boolean => {
        if (!prop) return false
        if (!shouldEnforceKnownProperties) return true
        // Từ điển rỗng <=> tập tên đầy đủ rỗng; tránh Object.keys() O(n) ở mỗi lần tra (nóng khi dịch class).
        if (!knownFullPropertyNames.size) return true
        return (
            !!PropertiesCss[prop] ||
            compositePropertyKeys.has(prop) ||
            knownFullPropertyNames.has(prop) ||
            standardPropertyNames.has(prop) ||
            isOpenPropertyName(prop)
        )
    }

    let PropertiesCss: CssPropertyMap = {}
    let ValueExts: CssValueMap = {}
    let CommonValues: CssCommonValueMap = {}
    let exts: Record<string, string> = {}

    // --- Hot-path memo caches (B1/B2/B4) ---
    // classToPropCache: tránh parse + resolve lại cùng một class (clsx + observeDom).
    // propToValueCache: tránh resolve lại cùng (prop,val), hữu ích cho &-chain.
    // cssSupportsCache: tránh gọi CSS.supports() lặp cho cùng declaration/selector.
    const classToPropCache = new Map<string, any>()
    const propToValueCache = new Map<string, string | null>()
    const cssSupportsCache = new Map<string, boolean>()
    // Chặn phình bộ nhớ: các Map trên bị khoá theo chuỗi class do người dùng sinh ra,
    // nên ứng dụng tạo class động không giới hạn có thể giữ cache lớn vô hạn.
    const setBounded = <K, V>(map: Map<K, V>, key: K, value: V): void => {
        if (cacheEntryLimit > 0 && map.size >= cacheEntryLimit) map.clear()
        map.set(key, value)
    }
    // Hoisted: trước đây compile lại trong propsValueExt mỗi lần resolve property (B3).
    const ALIAS_GROUP_REGEX = /^\[([a-zA-Z]+)\]$/

    // CB5: các property cần bản sao -webkit- trên Safari/iOS.
    const WEBKIT_PREFIX_PROPS = new Set([
        'backdrop-filter', 'mask', 'mask-image', 'mask-size', 'mask-position',
        'mask-repeat', 'mask-clip', 'mask-origin', 'mask-composite',
        'user-select', 'clip-path', 'appearance', 'box-decoration-break',
    ])
    // Trả về các declaration vendor cần thêm TRƯỚC declaration chuẩn (chuẩn thắng nếu cùng hỗ trợ).
    const buildWebkitPrefixes = (prop: string, val: string): string[] => {
        if (prop === 'position' && /(^|\s)sticky\b/.test(val)) {
            return ['position:-webkit-' + val]
        }
        if (prop === 'background-clip' && /(^|\s)text\b/.test(val)) {
            return ['-webkit-background-clip:' + val]
        }
        if (WEBKIT_PREFIX_PROPS.has(prop)) {
            return ['-webkit-' + prop + ':' + val]
        }
        return []
    }

    const cssSupports = (query: string): boolean => {
        if (typeof CSS === 'undefined') return true
        let v = cssSupportsCache.get(query)
        if (v === undefined) {
            v = CSS.supports(query)
            setBounded(cssSupportsCache, query, v)
        }
        return v
    }

    // Dictionary đổi -> parse/resolve có thể đổi; supports không phụ thuộc dictionary nên giữ.
    const clearHotCaches = () => {
        classToPropCache.clear()
        propToValueCache.clear()
    }

    const rebuildExts = () => {
        exts = {
            ...CommonValues,
            ...valueExt,
        }
        clearHotCaches()
    }

    const applyDictionary = (dictionary: XCSSDictionaryData | null) => {
        if (!dictionary) {
            PropertiesCss = {}
            ValueExts = {}
            CommonValues = {}
            knownFullPropertyNames = new Set()
            rebuildExts()
            return
        }

        PropertiesCss = dictionary.SHORT_PROPERTIES
        ValueExts = dictionary.SPECIFIC_VALUES
        CommonValues = dictionary.COMMON_VALUES
        knownFullPropertyNames = new Set(Object.values(PropertiesCss))
        rebuildExts()
    }

    let dictionaryReady = true
    let dictionaryReadyPromise: Promise<void> = Promise.resolve()

    if (!DICTIONARY_BUILD || dictionaryImport === false) {
        applyDictionary(null)
    } else if (typeof dictionaryImport === 'string') {
        dictionaryReady = false
        applyDictionary(null)
        dictionaryReadyPromise = loadExternalDictionary(dictionaryImport)
            .then((dictionary) => {
                applyDictionary(dictionary)
            })
            .catch((error) => {
                warn('PresenceStyle: Failed to import dictionary from URL', error)
            })
            .finally(() => {
                dictionaryReady = true
            })
    } else {
        applyDictionary(BUILTIN_DICTIONARY)
    }

    let lastKnownCacheData: XCSSCacheData | null = null



    const buildCss = (doc: Document | ShadowRoot | Element | undefined = typeof document !== 'undefined' ? document : undefined) => {
        // If running in non-browser environment without a doc, we can still simulate for extraction
        const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'
        const browserWindow = isBrowser ? window : null
        // Chỉ thăm dò (ghi/xoá thử) localStorage khi người dùng bật cache: tránh một lần
        // ghi đồng bộ vào ổ đĩa cho mỗi engine khởi tạo ở cấu hình mặc định.
        const cacheEnabled = CACHE_BUILD && !!cacheConfig.loadOnInit && isBrowser && canUseCacheRuntime()
        const browserStorage = cacheEnabled ? getLocalStorageSafe() : null
        const cacheStorage = cacheEnabled ? browserStorage : null
        let docRoot: Document | ShadowRoot | null = null
        // Sheet/layer thuộc Document hoặc ShadowRoot bao quanh; observer phải bám
        // đúng target người gọi truyền vào để buildCss(element) không quét cả trang.
        const observeTarget = doc
        const baseCssText = normalizeBaseCssText(cssDefault)

        if (doc) {
            docRoot = 'getRootNode' in doc ? (doc.getRootNode() as Document | ShadowRoot) : (doc as any)
        }

        // CB1: Constructable Stylesheets + adoptedStyleSheets chỉ có từ Safari 16.4 / Chrome 73 / FF 101.
        // iOS 15/16.0–16.3 và WebView Android cũ KHÔNG hỗ trợ -> phải fallback <style> element.
        const supportsConstructable = isBrowser && (() => {
            try {
                new CSSStyleSheet()
                // adoptedStyleSheets phải khả dụng trên root đích (document hoặc shadow root).
                const root: any = docRoot || (typeof document !== 'undefined' ? document : null)
                return !!root && 'adoptedStyleSheets' in root
            } catch {
                return false
            }
        })()
        // CB2: @layer có từ Safari 15.4+. SSR (non-browser) coi như có để giữ output @layer như cũ;
        // chỉ những trình duyệt thật sự thiếu CSSLayerBlockRule mới rơi về rule không bọc @layer.
        const supportsAtLayer = isBrowser ? (typeof CSSLayerBlockRule !== 'undefined') : true
        // Map <style> fallback theo media key (chỉ dùng khi !supportsConstructable).
        const legacyStyleEls: Record<string, HTMLStyleElement> = {}

        // Tạo sheet cho 1 media key: constructable nếu hỗ trợ, ngược lại <style> element thật.
        const createMediaSheet = (mediaKey: string, media: string): CSSStyleSheet | null => {
            // Query bắt đầu bằng `@` (`@container (...)`, `@supports (...)`): rule tự bọc at-rule, sheet không có media.
            if (media.startsWith('@')) media = ''
            if (supportsConstructable) {
                return media ? new CSSStyleSheet({ media }) : new CSSStyleSheet()
            }
            if (typeof document === 'undefined') return null
            const el = document.createElement('style')
            el.setAttribute('data-presence-style', mediaKey)
            if (media) el.media = media
            const isShadow = typeof ShadowRoot !== 'undefined' && docRoot instanceof ShadowRoot
            const target = isShadow ? (docRoot as ShadowRoot) : document.head
            target.appendChild(el)
            legacyStyleEls[mediaKey] = el
            return null // legacy: dùng textContent, không qua CSSStyleSheet API
        }

        const CSS_KEYS = new Map<string, string>();
        const CSS_KEY_SOURCES = new Map<string, string>()
        const CSS_VALUES = new Set<string>(); // Set song song để check trùng O(1)

        const registerCssKey = (source: string, value: string) => {
            CSS_KEYS.set(source, value)
            CSS_KEY_SOURCES.set(value, source)
            CSS_VALUES.add(value)
        }

        const resolveSourceClassName = (value: string): string =>
            shouldHashOutputClassName ? CSS_KEY_SOURCES.get(value) || value : value
        const keyRegistryKey = CACHE_BUILD ? createKeyRegistryKey(cacheConfig) : ''
        let sizeLast = cacheConfig.sizeLast;

        // Flag: lần render đầu tiên xử lý CSS đồng bộ để giảm CLS
        let isFirstRenderBatch = true;
        const syncSourceId = CACHE_BUILD ? `xcss_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}` : ''
        const pendingKeySyncEntries: [string, string][] = []
        let pendingKeySyncScheduled = false
        let keySyncBroadcastChannel: BroadcastChannel | null = null

        const mergeSizeLast = (nextSizeLast?: number) => {
            if (typeof nextSizeLast === 'number' && Number.isFinite(nextSizeLast) && nextSizeLast > sizeLast) {
                sizeLast = nextSizeLast
            }
        }

        const mergeKnownKeys = (entries?: [string, string][]) => {
            if (!entries) return

            entries.forEach(([source, value]) => {
                const currentValue = CSS_KEYS.get(source)
                if (currentValue === value) return
                if (currentValue) return
                if (CSS_VALUES.has(value) && CSS_KEY_SOURCES.get(value) !== source) return
                registerCssKey(source, value)
            })
        }

        if (cacheEnabled) {
            const registry = readKeyRegistry(cacheStorage, keyRegistryKey)
            mergeSizeLast(registry.sizeLast)
            mergeKnownKeys(registry.entries)
        }

        const mergeKeySyncPayload = (payload: XCSSKeySyncPayload | null) => {
            if (!payload) return
            if (payload.source && payload.source === syncSourceId) return

            mergeSizeLast(payload.sizeLast)

            payload.entries.forEach(([key, value]) => {
                const currentValue = CSS_KEYS.get(key)
                if (currentValue === value) return
                if (currentValue || CSS_VALUES.has(value)) return
                registerCssKey(key, value)
            })
        }

        const flushPendingKeySyncEntries = () => {
            pendingKeySyncScheduled = false
            if (!isBrowser || pendingKeySyncEntries.length === 0) return

            const payload: XCSSKeySyncPayload = {
                source: syncSourceId,
                sizeLast,
                entries: pendingKeySyncEntries.splice(0, pendingKeySyncEntries.length),
            }

            if (keySyncBroadcastChannel) {
                try {
                    keySyncBroadcastChannel.postMessage(payload)
                    return
                } catch (_error) {
                    keySyncBroadcastChannel = null
                }
            }

            if (!cacheStorage) return

            try {
                cacheStorage.setItem(keySyncKey, JSON.stringify(payload))
            } catch (_error) {
                // ignore key-sync write failure
            }
        }

        const scheduleKeySync = (entry: [string, string]) => {
            if (!isBrowser || !cacheEnabled) return

            pendingKeySyncEntries.push(entry)
            if (pendingKeySyncScheduled) return
            pendingKeySyncScheduled = true
            queueMicrotask(flushPendingKeySyncEntries)
        }

        const allocateLocalKey = (source: string): string => {
            let key: string
            do {
                key = 'D' + (sizeLast++).toString(32).toUpperCase()
            } while (CSS_VALUES.has(key))

            registerCssKey(source, key)
            return key
        }

        // Registry key giữ trong bộ nhớ để tránh đọc + JSON.parse + JSON.stringify toàn bộ
        // localStorage cho MỖI class mới (trước đây là O(n^2) theo số class của trang).
        let registryEntries: [string, string][] | null = null
        const registryMap = new Map<string, string>()
        const registryValues = new Set<string>()
        let registryWriteScheduled = false

        const ensureRegistryLoaded = (): [string, string][] => {
            if (registryEntries) return registryEntries

            const registry = readKeyRegistry(cacheStorage, keyRegistryKey)
            registryEntries = [...registry.entries]
            registryEntries.forEach(([source, value]) => {
                registryMap.set(source, value)
                registryValues.add(value)
            })

            mergeSizeLast(registry.sizeLast)
            mergeKnownKeys(registry.entries)
            return registryEntries
        }

        // Ghi registry gộp 1 lần mỗi microtask thay vì mỗi class -> giảm mạnh chi phí
        // serialize localStorage khi render danh sách lớn.
        const flushRegistryWrite = () => {
            registryWriteScheduled = false
            if (!cacheStorage || !registryEntries) return
            writeKeyRegistry(cacheStorage, keyRegistryKey, {
                sizeLast,
                entries: registryEntries,
            })
        }

        const scheduleRegistryWrite = () => {
            if (registryWriteScheduled) return
            registryWriteScheduled = true
            queueMicrotask(flushRegistryWrite)
        }

        const allocatePersistentKeySync = (source: string): string => {
            const current = CSS_KEYS.get(source)
            if (current) return current

            if (!cacheEnabled || !cacheStorage) {
                return allocateLocalKey(source)
            }

            const entries = ensureRegistryLoaded()

            const existing = registryMap.get(source)
            if (existing) {
                registerCssKey(source, existing)
                return existing
            }

            let nextSizeLast = Math.max(sizeLast, cacheConfig.sizeLast)
            let key: string
            do {
                key = 'D' + (nextSizeLast++).toString(32).toUpperCase()
            } while (registryValues.has(key) || CSS_VALUES.has(key))

            registryMap.set(source, key)
            registryValues.add(key)
            entries.push([source, key])
            registerCssKey(source, key)
            mergeSizeLast(nextSizeLast)
            scheduleRegistryWrite()

            scheduleKeySync([source, key])
            return key
        }

        // Setup layers if in browser — chỉ khi trình duyệt hỗ trợ @layer (CB2).
        if (isBrowser && docRoot && supportsAtLayer) {
            setupCssLayers(docRoot, cacheConfig.styleId)
        }

        if (cacheEnabled && isBrowser && typeof BroadcastChannel !== 'undefined') {
            try {
                keySyncBroadcastChannel = new BroadcastChannel(keySyncChannelName)
                keySyncBroadcastChannel.addEventListener('message', (event: MessageEvent) => {
                    mergeKeySyncPayload(normalizeKeySyncPayload(event.data))
                })
            } catch (_error) {
                keySyncBroadcastChannel = null
            }
        }

        let emitter = mitt()
        // Hàm ngắt MutationObserver (gán khi observe() chạy) — phục vụ destroy().
        let disconnectObserver: (() => void) | undefined
        let mqDfAll = [
            { default: '' },
            { xs: 'screen and (max-width: 575px)' },
            { sm: 'screen and (min-width: 576px)' },
            { md: 'screen and (min-width: 768px)' },
            { lg: 'screen and (min-width: 992px)' },
            { xl: 'screen and (min-width: 1200px)' },
            { '2xl': 'screen and (min-width: 1400px)' },
            { sma: 'screen and (max-width: 768px)' },
            { mda: 'screen and (max-width: 992px)' },
            { lga: 'screen and (max-width: 1200px)' },
            { xla: 'screen and (max-width: 1400px)' },
            ...mediaQuery,
        ]

        let mqDf = mqDfAll.filter(
            (f, i) =>
                mqDfAll.findLastIndex(
                    (fi: any) => Object.keys(fi)[0] == Object.keys(f)[0],
                ) == i,
        )

        let keysCssStyleSheetsDom = mqDf.map((m) => Object.keys(m)[0])
        // Bảng tra media query đã áp dụng last-write-wins. PHẢI dùng bảng này thay cho
        // `mqDfAll.find(...)`: `find` trả về khai báo ĐẦU TIÊN nên breakpoint custom ghi đè
        // key mặc định (ví dụ `md`) bị bỏ qua khi sinh CSS và khi ghi cache.
        const mediaQueryByKey = new Map<string, string>(
            mqDf.map((m) => {
                const key = Object.keys(m)[0]
                return [key, m[key]] as [string, string]
            }),
        )

        const cssStyleSheetsSet: Record<string, Set<string>> = {}
        const cssStyleSheetsDom: Record<string, CSSStyleSheet> = {}

        // Store text content for SSR/Extraction in chunks. Nối chuỗi tích luỹ
        // cho từng rule tạo cấp phát O(n²) khi một sheet có nhiều utility.
        const cssStyleSheetsText: Record<string, string[]> = { root: [] }
        const getSheetText = (mediaKey: string): string =>
            (cssStyleSheetsText[mediaKey] || []).join('\n')
        const setSheetText = (mediaKey: string, text: string): void => {
            cssStyleSheetsText[mediaKey] = text ? [text] : []
        }

        // Fallback <style> không có insertRule; gom các rule mới trong cùng
        // microtask để chỉ cập nhật textContent một lần cho mỗi media sheet (tập rỗng = chưa hẹn flush).
        const dirtyLegacyMediaKeys = new Set<string>()
        const flushLegacyStyleText = () => {
            dirtyLegacyMediaKeys.forEach((mediaKey) => {
                const style = legacyStyleEls[mediaKey]
                if (style) style.textContent = getSheetText(mediaKey)
            })
            dirtyLegacyMediaKeys.clear()
        }
        const scheduleLegacyStyleText = (mediaKey: string) => {
            if (!dirtyLegacyMediaKeys.size) queueMicrotask(flushLegacyStyleText)
            dirtyLegacyMediaKeys.add(mediaKey)
        }

        // Cache Key & Logic
        let currentConfigHash = hashConfig(modules)
        let debounceTimer: any = null
        let latestSaveTicket = 0
        let cacheLoaded = false
        let loadedCacheData: XCSSCacheData | null = null
        let asyncCacheCandidate: { raw: string } | null = null

        const writeCache = (value: string) => {
            try {
                cacheStorage?.setItem(cacheKey, value)
            } catch (e) {
                warn('PresenceStyle: Failed to save cache', e)
            }
        }


        const removeCacheIfUnchanged = (expectedRaw?: string) => {
            if (!isBrowser || !cacheStorage) return

            if (typeof expectedRaw === 'string') {
                const currentRaw = cacheStorage.getItem(cacheKey)
                if (currentRaw !== expectedRaw) return
            }

            cacheStorage.removeItem(cacheKey)
            cacheStorage.removeItem(keySyncKey)
        }

        const saveCache = (data: XCSSCacheData) => {
            if (!cacheEnabled || !isBrowser || !cacheStorage) return
            lastKnownCacheData = data
            const ticket = ++latestSaveTicket
            try {
                const json = JSON.stringify(data)

                const writeLZWEnvelope = () => {
                    const envelope: XCSSCacheEnvelopeLZW = {
                        __xcss_cache_v: 2,
                        compressed: true,
                        payload: compressLZW(json),
                    }
                    writeCache(JSON.stringify(envelope))
                }

                if (!cacheConfig.compression) {
                    writeCache(json)
                    return
                }

                if (canUseCompressionStream() && canUseDecompressionStream()) {
                    void compressDeflateRawBase64(json)
                        .then((payload) => {
                            if (ticket !== latestSaveTicket) return
                            const envelope: XCSSCacheEnvelopeStream = {
                                __xcss_cache_v: 3,
                                compressed: true,
                                algorithm: 'deflate-raw',
                                encoding: 'base64',
                                payload,
                            }
                            writeCache(JSON.stringify(envelope))
                        })
                        .catch(() => {
                            if (ticket !== latestSaveTicket) return
                            writeLZWEnvelope()
                        })
                    return
                }

                writeLZWEnvelope()
            } catch (e) {
                warn('PresenceStyle: Failed to save cache', e)
            }
        }

        const triggerSave = () => {
            if (!isBrowser || !cacheEnabled) return
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
                const rulesSetObj: Record<string, string[]> = {}
                for (const k in cssStyleSheetsSet) {
                    rulesSetObj[k] = Array.from(cssStyleSheetsSet[k])
                }

                // Prepare CSS Text with @media wrapping for Bootloader
                const cssTextForCache: Record<string, string> = {}
                Object.keys(cssStyleSheetsText).forEach(k => {
                    const cssText = getSheetText(k)
                    if (k === 'root') {
                        cssTextForCache[k] = cssText
                    } else {
                        const mqStr = mediaQueryByKey.get(k)
                        // Only wrap if meaningful content
                        if (mqStr && cssText && !mqStr.startsWith('@')) {
                            cssTextForCache[k] = `@media ${mqStr} {\n${cssText}\n}`
                        } else {
                            cssTextForCache[k] = cssText
                        }
                    }
                })

                const data: XCSSCacheData = {
                    configHash: currentConfigHash,
                    cssText: cssTextForCache,
                    rulesSet: rulesSetObj,
                    keys: Array.from(CSS_KEYS.entries()),
                    sizeLast: sizeLast
                }
                saveCache(data)
            }, cacheConfig.debounceMs)
        }

        // Tải cache (đồng bộ) — chỉ sử dụng 1 key duy nhất
        if (cacheEnabled && isBrowser && cacheStorage) {
            try {
                const raw = cacheStorage.getItem(cacheKey)
                if (raw) {
                    const data = parseCacheDataSync(raw)
                    if (!data) {
                        // Nếu là stream-compressed thì xử lý bất đồng bộ sau
                        if (isStreamCacheEnvelopeRaw(raw)) {
                            asyncCacheCandidate = { raw }
                        } else {
                            cacheStorage.removeItem(cacheKey)
                        }
                    } else if (data.configHash !== currentConfigHash) {
                        // Config đã thay đổi, xóa cache cũ
                        cacheStorage.removeItem(cacheKey)
                    } else {
                        loadedCacheData = data
                        cacheLoaded = true
                        lastKnownCacheData = data
                    }
                }
            } catch (e) { logError('PresenceStyle: Failed to read cache', e) }
        }

        // Câu khai báo thứ tự layer nằm ở đầu sheet gốc: có mặt trong CSS tĩnh (SSR/extract),
        // trong cache/bootloader và trong adoptedStyleSheets, độc lập với thẻ <style> ở <head>.
        const rootBaseText = [supportsAtLayer ? LAYER_ORDER_STATEMENT : '', dialectBaseCss, baseCssText].filter(Boolean).join('\n')

        // Init sheets & Finish Hydration
        if (isBrowser) {
            const rootSheet = createMediaSheet('root', '')
            if (rootSheet) cssStyleSheetsDom['root'] = rootSheet
        }

        // Khối @layer trong CSSOM của từng sheet (xem insertIntoLayer). replaceSync xoá các khối đó: lần chèn sau
        // tạo khối mới ở cuối sheet.
        let layerBlocks: Record<string, { b: CSSStyleSheet | CSSGroupingRule; g: any[]; o: number }> = {}
        const applySheetText = (mediaKey: string, text: string) => {
            setSheetText(mediaKey, text)
            layerBlocks = {}
            if (!isBrowser) return
            if (cssStyleSheetsDom[mediaKey]) {
                cssStyleSheetsDom[mediaKey].replaceSync(text)
            } else if (legacyStyleEls[mediaKey]) {
                // Legacy: replaceSync không có trên <style>.sheet -> set textContent.
                legacyStyleEls[mediaKey].textContent = text
            }
        }

        keysCssStyleSheetsDom.forEach((k) => {
            cssStyleSheetsSet[k] = new Set()
            if (isBrowser) {
                const media = mediaQueryByKey.get(k) || ''
                const sheet = createMediaSheet(k, media)
                if (sheet) cssStyleSheetsDom[k] = sheet
            }
            cssStyleSheetsText[k] = []
        })

        applySheetText('root', rootBaseText)

        // Xóa bootloader style SAU khi adoptedStyleSheets đã paint xong
        // Dùng double requestAnimationFrame để đảm bảo trình duyệt đã render CSS mới
        const removeBootloaderStyle = () => {
            if (!docRoot) return
            const blStyle = docRoot.querySelector(`style[id="${cacheConfig.styleId}"]`)
            if (blStyle) {
                const scheduleNextPaint =
                    typeof requestAnimationFrame === 'function'
                        ? requestAnimationFrame
                        : (callback: (time: number) => void) => setTimeout(() => callback(Date.now()), 0)

                scheduleNextPaint(() => {
                    scheduleNextPaint(() => {
                        blStyle.remove()
                    })
                })
            }
        }

        const hydrateCacheAfterInit = (data: XCSSCacheData) => {
            if (data.keys) {
                mergeKnownKeys(data.keys)
            }
            mergeSizeLast(data.sizeLast)

            const sheetKeys = ['root', ...keysCssStyleSheetsDom]
            sheetKeys.forEach((key) => {
                const currentRules = cssStyleSheetsSet[key] || new Set<string>()
                const cachedRules = data.rulesSet?.[key] || []
                const mergedRules = new Set<string>([...cachedRules, ...Array.from(currentRules)])
                cssStyleSheetsSet[key] = mergedRules

                if (key === 'root') {
                    const cachedRoot = typeof data.cssText?.root === 'string' ? data.cssText.root : ''
                    const txt = mergeRootCssText(rootBaseText, cachedRoot)
                    applySheetText('root', txt)
                    return
                }

                const textFromRules = Array.from(mergedRules).join('\n')
                const fallbackText =
                    typeof data.cssText?.[key] === 'string'
                        ? unwrapCachedCssText(key, data.cssText[key])
                        : ''
                applySheetText(key, textFromRules || fallbackText)
            })

            lastKnownCacheData = data
            removeBootloaderStyle()
        }

        // Post-Init Hydration: áp dụng dữ liệu cache vào DOM/stylesheet
        if (cacheLoaded && loadedCacheData) {
            hydrateCacheAfterInit(loadedCacheData)
        }

        // Gắn tất cả sheets MỘT LẦN DUY NHẤT (batch) để tránh multi-reflow gây CLS.
        // Legacy (<style> element) đã nằm sẵn trong DOM nên bỏ qua bước adopt.
        if (supportsConstructable && docRoot?.adoptedStyleSheets) {
            const existingSheets = docRoot.adoptedStyleSheets
            const newSheets = ['root', ...keysCssStyleSheetsDom]
                .map(k => cssStyleSheetsDom[k])
                .filter(sheet => sheet && !existingSheets.includes(sheet))
            if (newSheets.length > 0) {
                docRoot.adoptedStyleSheets = [...existingSheets, ...newSheets]
            }
        }

        if (!cacheEnabled) {
            removeBootloaderStyle()
        }

        // Xử lý bất đồng bộ cho cache stream-compressed
        if (cacheEnabled && isBrowser && cacheStorage && asyncCacheCandidate && !cacheLoaded) {
            void (async () => {
                const data = await parseCacheDataAsync(asyncCacheCandidate!.raw)
                if (!data) {
                    removeCacheIfUnchanged(asyncCacheCandidate!.raw)
                    return
                }
                if (data.configHash !== currentConfigHash) {
                    removeCacheIfUnchanged(asyncCacheCandidate!.raw)
                    return
                }
                cacheLoaded = true
                loadedCacheData = data
                hydrateCacheAfterInit(data)
            })()
        }

        // Đồng bộ key generation từ tab khác: ưu tiên BroadcastChannel, fallback storage.
        if (cacheEnabled && isBrowser && browserWindow?.addEventListener) {
            browserWindow.addEventListener('storage', (e) => {
                if (e.key === keySyncKey && e.newValue) {
                    try {
                        mergeKeySyncPayload(normalizeKeySyncPayload(JSON.parse(e.newValue)))
                    } catch (_e) {}
                }
            })
        }

        // Thứ tự rule của phương ngữ có `compare` (Tailwind): khối rule có thứ tự nằm cuối mỗi sheet, sắp theo
        // `compare`; rule khác (x-css, cache) nằm trước khối đó theo thứ tự chèn như cũ.
        const orderKeysByMedia: Record<string, Array<{ compare: (a: string, b: string) => number; name: string } | undefined>> = {}
        const orderedCountByMedia: Record<string, number> = {}
        const ruleInsertIndex = (media: string, length: number, order?: { compare: (a: string, b: string) => number; name: string }): number => {
            const keys = (orderKeysByMedia[media] ||= [])
            while (keys.length < length) keys.unshift(undefined)
            const ordered = orderedCountByMedia[media] || 0
            let lo = length - ordered
            if (order) {
                let hi = length
                while (lo < hi) {
                    const mid = (lo + hi) >> 1
                    const key = keys[mid]
                    if (key && key.compare === order.compare && order.compare(order.name, key.name) < 0) hi = mid
                    else lo = mid + 1
                }
                orderedCountByMedia[media] = ordered + 1
            }
            keys.splice(lo, 0, order)
            return lo
        }

        // CSSOM của trình duyệt có @layer: mỗi sheet giữ MỘT khối `@layer lN{}` cho mỗi layer và chèn style rule
        // vào trong khối đó. Chromium chỉ invalidate phần tử khớp selector khi thêm style rule vào khối/nhóm có
        // sẵn, còn thêm một at-rule mới (`@layer`, `@media`, `@supports`) thì tính lại style của mọi phần tử dùng
        // sheet (đo trên trang 1.000 phần tử: 0,3 ms so với 17 ms mỗi lần). Rule cùng `wrap` nằm liền nhau dùng
        // chung một nhóm (`@media (hover: hover){a}{b}` ≡ `{a b}`), nên chỉ nhóm mới phải trả giá đó.
        // Thứ tự trong khối theo đúng quy tắc của text store (ruleInsertIndex) nên cascade không đổi: khác layer
        // thì thứ tự layer quyết định, cùng layer thì thứ tự tương đối giữ nguyên. `g`: nhóm chứa từng rule (null:
        // rule nằm thẳng trong khối), wrap của nhóm ghi ở thuộc tính `w` của chính nhóm.
        // Trình duyệt thiếu @layer: "khối" là chính sheet (một dãy cho cả sheet như text store), `o` = số rule có
        // sẵn ở đầu sheet (CSS nạp từ cache lúc khởi tạo).
        // Chế độ lai (`preload.staticBlock`): "khối" là khối `@layer` của CSS tĩnh, dãy khoá dựng từ rule có sẵn
        // (CSS tĩnh build theo cùng thứ tự nên cả khối là vùng có thứ tự). Dựng lại sau mỗi lần xoá layerBlocks.
        const insertIntoLayer = (sheet: CSSStyleSheet, media: string, layer: number, body: string, wrap: string, order?: { compare: (a: string, b: string) => number; name: string }) => {
            const key = '@' + media + (supportsAtLayer ? ' ' + layer : '')
            let blk = layerBlocks[key]
            let i = -1
            try {
                if (!blk) {
                    const o = sheet.cssRules.length
                    const target = supportsAtLayer && !sheet.media.length && modules?.preload?.staticBlock?.(layer)
                    blk = layerBlocks[key] = target ? { b: target.b, g: target.g, o: 0 } : supportsAtLayer ? { b: sheet.cssRules[sheet.insertRule(`@layer l${layer}{}`, o)] as CSSGroupingRule, g: [], o: 0 } : { b: sheet, g: [], o }
                    orderKeysByMedia[key] = target ? target.k : []
                    orderedCountByMedia[key] = target ? target.k.length : 0
                }
                const { b, g } = blk
                i = ruleInsertIndex(key, g.length, order)
                // Vị trí trong khối (mỗi nhóm tính là một rule) và số rule của nhóm đứng trước nằm trước điểm chèn.
                let top = blk.o
                let run = 0
                for (let j = 0; j < i; j++) {
                    if (g[j] && g[j] === g[j - 1]) run++
                    else {
                        top++
                        run = 1
                    }
                }
                const prev = g[i - 1]
                if (prev && prev === g[i] && prev.w !== wrap) {
                    // Điểm chèn nằm giữa một nhóm khác wrap: phần sau điểm chèn sang nhóm mới ngay sau nhóm cũ,
                    // rule mới đứng giữa hai nhóm (vị trí `top`).
                    let rest = ''
                    for (; prev.cssRules.length > run; prev.deleteRule(run)) rest += prev.cssRules[run].cssText
                    b.insertRule(`${prev.w}{${rest}}`, top)
                    const next: any = b.cssRules[top]
                    next.w = prev.w
                    for (let j = i; g[j] === prev; j++) g[j] = next
                }
                let group = wrap && prev?.w === wrap ? prev : null
                if (group) group.insertRule(body, run)
                else if (wrap && g[i]?.w === wrap) (group = g[i]).insertRule(body, 0)
                else {
                    b.insertRule(wrap ? `${wrap}{${body}}` : body, top)
                    if (wrap) (group = b.cssRules[top] as any).w = wrap
                }
                g.splice(i, 0, group)
            } catch (_error) {
                // Rule trình duyệt không hiểu: bỏ qua như replaceSync sẽ làm.
                if (i >= 0) {
                    orderKeysByMedia[key].splice(i, 1)
                    if (order) orderedCountByMedia[key]--
                }
            }
        }

        const updateRules = (txtCls: string, d: any) => {
            let { media, property, selector, layer, className } = d

            layer = Number(layer) || 0
            let cssExts = shouldHashOutputClassName ? CSS_KEYS.get(txtCls) : null
            let cssName = composeSelector(`.${cssExts || className}`, selector)

            // CB4: trên thiết bị cảm ứng, chỉ áp :hover khi thiết bị thật sự hỗ trợ hover.
            // `wrap`: at-rule bọc ngoài cùng (giữ riêng để gom nhóm trong CSSOM, xem insertIntoLayer).
            let ruleBody = `${cssName}{${property}}`
            let wrap = hoverMedia && selector?.includes(':hover') ? '@media (hover: hover)' : ''
            // At-rule ngoài @media: breakpoint đăng ký với query `@...` giữ sheet riêng (giữ thứ tự),
            // key nội tuyến `[@...]` đi vào sheet mặc định.
            let outer = mediaQueryByKey.get(media)
            if (!outer?.startsWith('@')) outer = isInlineAtRuleKey(media) ? decodeInlineAtRule(media) : ''
            if (outer) {
                if (wrap) ruleBody = `${wrap}{${ruleBody}}`
                // Chuỗi at-rule lồng (`@layer x{@media y` — at-rule bên trong utility của plugin): `wrap` là at-rule
                // ngoài cùng, các at-rule còn lại bọc thân rule.
                const heads = outer.split('{')
                for (let h = heads.length - 1; h > 0; h--) ruleBody = `${heads[h]}{${ruleBody}}`
                wrap = heads[0]
                if (media[0] === '[') media = 'default'
            }
            const fullBody = wrap ? `${wrap}{${ruleBody}}` : ruleBody
            // CB2: bỏ bọc @layer trên trình duyệt thiếu hỗ trợ -> giữ thứ tự theo insertion order.
            var txtCss = supportsAtLayer ? `@layer l${layer}{${fullBody}}` : fullBody

            const cssStyleSheetSet = (cssStyleSheetsSet[media] ||= new Set())

            if (!cssStyleSheetSet.has(txtCss)) {
                cssStyleSheetSet.add(txtCss)

                // Cập nhật text store cho cache persistence. Chỉ join khi thật sự
                // cần export/cache/fallback CSSOM để tránh sao chép toàn bộ sheet.
                const store = (cssStyleSheetsText[media] ||= [])
                store.splice(ruleInsertIndex(media, store.length, d.order), 0, txtCss)

                if (!isBrowser) {
                    // SSR: chỉ cập nhật text store (đã làm ở trên)
                } else if (cssStyleSheetsDom[media]) {
                    insertIntoLayer(cssStyleSheetsDom[media], media, layer, ruleBody, wrap, d.order)
                } else if (legacyStyleEls[media]) {
                    scheduleLegacyStyleText(media)
                }

                triggerSave()
            }
        }

        // Mỗi cặp (class nguồn, tên class xuất) chỉ cần dựng rule MỘT lần cho một engine.
        // Trước đây mọi lần clsx()/mutation đều chạy lại classToProp + dựng chuỗi rule +
        // tra Set cho từng token, kể cả token đã có CSS: re-render React, quét lần đầu
        // (cùng class lặp ở hàng nghìn node) và burst mutation đều trả chi phí đó.
        // Khoá gồm cả tên xuất vì một class có thể được áp trước khi được cấp key hash.
        const appliedClassKeys = new Set<string>()
        const appliedKeyOf = (sourceClassName: string): string => {
            if (!shouldHashOutputClassName) return sourceClassName
            const out = CSS_KEYS.get(sourceClassName)
            return out ? sourceClassName + ' ' + out : sourceClassName
        }

        // Static-first: đánh dấu class đã có CSS tĩnh để observer/clsx bỏ qua hoàn toàn.
        const preload = modules?.preload
        if (preload && typeof preload === 'object') {
            const classMap = preload.classMap && typeof preload.classMap === 'object' ? preload.classMap : {}
            if (shouldHashOutputClassName) {
                for (const source in classMap) {
                    const key = classMap[source]
                    if (typeof key !== 'string' || !key || CSS_KEYS.has(source) || CSS_VALUES.has(key)) continue
                    registerCssKey(source, key)
                }
            }
            const preloadClasses = Array.isArray(preload.classes) ? preload.classes : Object.keys(classMap)
            for (let index = 0; index < preloadClasses.length; index++) {
                const source = preloadClasses[index]
                if (typeof source === 'string' && source) appliedClassKeys.add(appliedKeyOf(source))
            }
        }

        const applyObservedItems = (items: string[]) => {
            for (let index = 0; index < items.length; index++) {
                const sourceClassName = resolveSourceClassName(items[index])
                const appliedKey = appliedKeyOf(sourceClassName)
                if (appliedClassKeys.has(appliedKey)) continue
                appliedClassKeys.add(appliedKey)
                const item = classToProp(sourceClassName)
                if (item) {
                    updateRules(sourceClassName, item)
                    if (item.extra) for (let k = 0; k < item.extra.length; k++) updateRules(sourceClassName, item.extra[k])
                }
            }
        }

        const processObservedItems = (items: string[]) => {
            const run = () => applyObservedItems(items)
            if (dictionaryReady) {
                run()
            } else {
                dictionaryReadyPromise.then(run)
            }
        }

        emitter.on('observeDom' as any, processObservedItems)

        // Memo cho trường hợp phổ biến nhất: clsx('chuỗi class tĩnh') gọi lặp ở mỗi render.
        // Chỉ dùng khi dictionary đã sẵn sàng (kết quả hash phụ thuộc dictionary).
        const clsxStringCache = new Map<string, string>()

        const clsx = (...clsArrs: any[]) => {
            // Khoá memo: nối các đối số chuỗi bằng khoảng trắng. Tách token của chuỗi nối
            // cho cùng kết quả với tách từng đối số, nên khoá này chính xác. Đối số không
            // phải chuỗi và không phải mảng (false, null, số) bị bỏ qua như cũ; có mảng thì không memo.
            let memoKey: string | null = dictionaryReady ? '' : null
            for (let index = 0; memoKey !== null && index < clsArrs.length; index++) {
                const arg = clsArrs[index]
                if (typeof arg === 'string') memoKey = memoKey ? memoKey + ' ' + arg : arg
                else if (Array.isArray(arg)) memoKey = null
            }
            if (memoKey !== null) {
                const cachedOutput = clsxStringCache.get(memoKey)
                if (cachedOutput !== undefined) return cachedOutput
            }
            // Tương đương flatten(Infinity) + split whitespace trước đây, nhưng
            // không tạo mảng trung gian cho từng đối số/chuỗi class.
            const pending = [...clsArrs].reverse()
            const visitedArrays = new Set<any[]>()
            const seenClasses = new Set<string>()
            const lsCss: string[] = []

            while (pending.length > 0) {
                const value = pending.pop()
                if (Array.isArray(value)) {
                    if (visitedArrays.has(value)) continue
                    visitedArrays.add(value)
                    for (let index = value.length - 1; index >= 0; index--) {
                        pending.push(value[index])
                    }
                    continue
                }
                if (typeof value !== 'string') continue

                let tokenStart = -1
                for (let index = 0; index <= value.length; index++) {
                    const isBoundary =
                        index === value.length || isClassWhitespace(value.charCodeAt(index))
                    if (!isBoundary) {
                        if (tokenStart === -1) tokenStart = index
                        continue
                    }
                    if (tokenStart !== -1) {
                        const token = value.slice(tokenStart, index)
                        if (!seenClasses.has(token)) {
                            seenClasses.add(token)
                            lsCss.push(token)
                        }
                        tokenStart = -1
                    }
                }
            }

            const shouldHashClass = (txtClass: string): boolean => {
                if (!shouldProcessClass(txtClass)) return false

                if (dictionaryReady) {
                    return !!classToProp(txtClass)
                }

                const parseTarget = prefix ? txtClass.slice(prefix.length) : txtClass
                const parsed = parseClassName(parseTarget)
                if (!parsed) return false
                if (!isValidMediaKey(parsed.mq)) return false

                const selectorStr = (parsed.selector || '').replace(/(';|;)/g, (v: string) => (v == "';" ? ';' : ' '))
                if (selectorStr && !isLikelyValidSelectorFallback(selectorStr)) return false

                if (parsed.prop.startsWith('[')) {
                    return !!propsValueExt(parsed.prop + parsed.val)
                }
                if (!isKnownPropertyKey(parsed.prop)) return false
                if (parsed.prop === '&') return parsed.val.length > 0
                return parsed.val.length > 0
            }

            const lsClassNew: string[] = []
            for (const l of lsCss) {
                let item = l
                if (CSS_KEYS.has(l)) {
                    item = shouldHashOutputClassName ? CSS_KEYS.get(l)! : l
                } else {
                    // Chỉ hash class name nếu có thể sinh CSS hợp lệ.
                    // Token không hợp lệ (ví dụ "bs-a") giữ nguyên.
                    if (shouldHashClass(l)) {
                        if (!shouldHashOutputClassName) {
                            item = l
                        } else if (cacheEnabled && isBrowser) {
                            item = allocatePersistentKeySync(l)
                        } else {
                            const key = allocateLocalKey(l)
                            scheduleKeySync([l, key])
                            triggerSave() // LƯU CACHE
                            item = key
                        }
                    }
                }
                lsClassNew.push(item)
            }

            // Emit event to update styles
            // In SSR/Non-browser, we might want to sync immediately?
            // Emit event to update styles
            // In SSR/Non-browser, sync immediately for extraction support
            // Chỉ phát sự kiện cho token chưa được dựng rule: tránh cấp phát microtask và
            // duyệt lại toàn bộ danh sách khi mọi class đã có CSS.
            const pendingCss = lsCss.filter((token) => !appliedClassKeys.has(appliedKeyOf(token)))
            if (pendingCss.length > 0) {
                if (!isBrowser || isFirstRenderBatch) {
                    emitter.emit('observeDom' as any, pendingCss)
                } else {
                    queueMicrotask(() => emitter.emit('observeDom' as any, pendingCss))
                }
            }

            const output = lsClassNew.join(' ')
            if (memoKey !== null) setBounded(clsxStringCache, memoKey, output)
            return output
        }

        const observe = () => {
            if (!isBrowser || !observeTarget || !docRoot) return
            if (disconnectObserver) return
            // Lần đầu: xử lý đồng bộ để CSS apply trước first paint
            const skipInitial = modules?.preload?.skipInitialScan === true
            disconnectObserver = observeDom(observeTarget, (items) => {
                if (isFirstRenderBatch) {
                    applyObservedItems(items)
                } else {
                    processObservedItems(items)
                }
            }, skipInitial)
            // Sau lần quét đầu tiên, chuyển sang async để không block UI
            isFirstRenderBatch = false
        }

        const getCssString = () => {
            return Object.keys(cssStyleSheetsText).map((media) => {
                const css = getSheetText(media)
                if (!css) return ''
                if (media === 'root' || media === 'default') return css
                // Wrap in media query
                const mediaQueryStr = mediaQueryByKey.get(media)
                if (mediaQueryStr && !mediaQueryStr.startsWith('@')) {
                    return `@media ${mediaQueryStr} {\n${css}\n}`
                }
                return css
            }).filter(Boolean).join('\n')
        }

        /**
         * Giải phóng tài nguyên của instance: ngắt MutationObserver, đóng BroadcastChannel,
         * huỷ timer debounce ghi cache, và xoá memo cache.
         * Dùng khi unmount ứng dụng, hot-reload, hoặc teardown test để tránh rò rỉ bộ nhớ.
         */
        const destroy = () => {
            disconnectObserver?.()
            disconnectObserver = undefined
            if (debounceTimer) {
                clearTimeout(debounceTimer)
                debounceTimer = null
            }
            dirtyLegacyMediaKeys.clear()
            if (keySyncBroadcastChannel) {
                try {
                    keySyncBroadcastChannel.close()
                } catch (_error) {
                    // Bỏ qua lỗi đóng kênh đã bị đóng trước đó.
                }
                keySyncBroadcastChannel = null
            }
            emitter.all.clear()
            appliedClassKeys.clear()
            clsxStringCache.clear()
            clearHotCaches()
            cssSupportsCache.clear()
        }

        return { clsx, observe, getCssString, destroy }
    }


    function propsValueExt(txtProps: string) {
        const p = ALIAS_GROUP_REGEX.exec(txtProps)?.[1] ?? ''
        if (p && groupValues[p] && Array.isArray(groupValues[p])) {
            let cssProp = groupValues[p]

            let resolvedProps: string[] = []
            let isAllValidUtilities = true
            const normalizeAliasDeclaration = (input: string): string | null => {
                const text = input.trim()
                if (!text) return null

                const cleaned = text.endsWith(';') ? text.slice(0, -1).trim() : text
                const colonIndex = cleaned.indexOf(':')
                if (colonIndex <= 0 || colonIndex >= cleaned.length - 1) return null

                const prop = cleaned.slice(0, colonIndex).trim()
                const value = cleaned.slice(colonIndex + 1).trim()
                if (!prop || !value) return null
                if (!/^(?:--[a-zA-Z0-9-_]+|-?[a-zA-Z][a-zA-Z0-9-]*)$/.test(prop)) return null

                return `${prop}:${value}`
            }

            for (const cls of cssProp) {
                if (typeof cls !== 'string') {
                    isAllValidUtilities = false
                    break
                }

                const declaration = normalizeAliasDeclaration(cls)
                if (declaration) {
                    if (typeof CSS !== 'undefined' && !cssSupports(declaration)) {
                        isAllValidUtilities = false
                        break
                    }
                    resolvedProps.push(declaration)
                    continue
                }

                isAllValidUtilities = false
                break
            }

            if (resolvedProps.length > 0 && isAllValidUtilities) {
                return resolvedProps.join(';')
            }
        }

        return null
    }

    function propToValue(p: string, v: string, trusted = false): string | null {
        const cacheKey = (trusted ? 't ' : '') + p + ' ' + v
        const cached = propToValueCache.get(cacheKey)
        if (cached !== undefined) return cached
        const result = computePropToValue(p, v, trusted)
        setBounded(propToValueCache, cacheKey, result)
        return result
    }

    function computePropToValue(p: string, v: string, trusted = false): string | null {
        // Step 0: Check config extensions
        let gvalue = propsValueExt(p + v)
        if (gvalue) return gvalue

        if (!p || v === undefined) return null

        // Step 1: Normalize Property Key
        let c = PropertiesCss[p]
        let propertyName = c ? c : p

        // Step 2: Analyze Value (Important, Arbitrary, Variable)
        let v0 = v[0]
        let i = false
        let vx = v

        // 2.1 Check Important (!)
        if (v0 === '!') {
            i = true
            vx = vx.substring(1)
            v0 = vx[0] // update first char
        }

        // 2.2 Normalize Value Key (Lowercase if alpha) 
        // Only if not arbitrary or variable
        // But arbitrary starts with [ or {
        if (vx.startsWith('--')) {
            vx = 'var(' + vx + ')'
        } else if (v0 === '[' && vx.endsWith(']')) {
            // Arbitrary Value: Strip brackets, rồi giải mã `_` thành khoảng trắng.
            vx = decodeArbitraryUnderscore(vx.substring(1, vx.length - 1))
        } else {
            // Dictionary Value Lookup
            if (vx.length > 0) {
                // Try lowercasing the whole key for Dictionary Lookup.
                let lookupKey = vx[0].toLowerCase() + vx.substring(1)

                // Try 1: Standard (first char lower)
                let val = ValueExts[p]?.[lookupKey] || exts[lookupKey]

                // Try 2: Full Lowercase (e.g. SB -> sb)
                if (!val) {
                    let lowerKey = vx.toLowerCase()
                    val = ValueExts[p]?.[lowerKey] || exts[lowerKey]
                }

                vx = val || vx
            }
        }

        // Step 3: Replace Semicolon
        vx = vx.replace(/(';|;)/g, (val: string) => (val == "';" ? ';' : ' '))

        if (!vx) return null

        // Ở môi trường không có CSS.supports (SSR/CLI), chặn các chuỗi có thể thoát khỏi
        // khối rule hoặc thẻ <style>: dấu ngoặc nhọn, dấu '<', mở comment.
        if (typeof CSS === 'undefined' && (UNSAFE_VALUE_PATTERN.test(vx) || !hasBalancedStructure(vx))) return null

        // Step 4: Construct CSS
        let vxx = vx + (i ? ' !important' : '')
        let cssProp = [propertyName + ':' + vxx]

        switch (propertyName) {
            case 'mx':
                cssProp = [`margin-left:${vxx}`, `margin-right:${vxx}`]
                break
            case 'my':
                cssProp = [`margin-top:${vxx}`, `margin-bottom:${vxx}`]
                break
            case 'px':
                cssProp = [`padding-left:${vxx}`, `padding-right:${vxx}`]
                break
            case 'py':
                cssProp = [`padding-top:${vxx}`, `padding-bottom:${vxx}`]
                break
            case 'bdx':
                cssProp = [`border-left:${vxx}`, `border-right:${vxx}`]
                break
            case 'bdy':
                cssProp = [`border-top:${vxx}`, `border-bottom:${vxx}`]
                break
        }

        const isBrowser = typeof CSS !== 'undefined'
        // `trusted`: khai báo do phương ngữ sinh từ nguồn đã kiểm (compiler Tailwind) bỏ qua CSS.supports.
        if (!isBrowser || trusted || cssProp.every((x) => cssSupports(x))) {
            if (autoprefix) {
                // Chỉ thêm vendor declaration khi nó hợp lệ -> không bao giờ làm rule chuẩn bị loại.
                const prefixed = buildWebkitPrefixes(propertyName, vxx).filter((d) => cssSupports(d))
                if (prefixed.length) return [...prefixed, ...cssProp].join(';')
            }
            return cssProp.join(';')
        }

        return null
    }

    const splitSelectorSuffix = (input: string): { body: string, selector: string } => {
        let bracketDepth = 0
        for (let i = input.length - 1; i >= 0; i--) {
            const ch = input[i]
            if (ch === ']') {
                bracketDepth++
                continue
            }
            if (ch === '[') {
                if (bracketDepth > 0) bracketDepth--
                continue
            }
            if (ch === '@' && bracketDepth === 0) {
                return {
                    body: input.slice(0, i),
                    selector: input.slice(i + 1),
                }
            }
        }
        return { body: input, selector: '' }
    }

    const splitByAmpersandOutsideBrackets = (input: string): string[] => {
        const parts: string[] = []
        let start = 0
        let bracketDepth = 0

        for (let i = 0; i < input.length; i++) {
            const ch = input[i]
            if (ch === '[') {
                bracketDepth++
                continue
            }
            if (ch === ']') {
                if (bracketDepth > 0) bracketDepth--
                continue
            }
            if (ch === '&' && bracketDepth === 0) {
                parts.push(input.slice(start, i))
                start = i + 1
            }
        }

        parts.push(input.slice(start))
        return parts
    }

    const isLikelyValidSelectorFallback = (selector: string): boolean => {
        if (!selector) return true
        const text = selector.trim()
        if (!text) return true
        if (/[{}<]|\/\*/.test(text)) return false
        if (!hasBalancedStructure(text)) return false
        if (text === '#' || text === '(' || text === ')' || text === ',' || text === '>' || text === '+' || text === '~') return false
        if (text.startsWith('(') || text.startsWith(')')) return false

        let roundDepth = 0
        for (let i = 0; i < text.length; i++) {
            const ch = text[i]
            if (ch === '(') {
                roundDepth++
                continue
            }
            if (ch === ')') {
                if (roundDepth === 0) return false
                roundDepth--
            }
        }

        return roundDepth === 0
    }

    function classToProp(txtClass: string) {
        const cached = classToPropCache.get(txtClass)
        if (cached !== undefined) return cached
        const result = computeClassToProp(txtClass)
        setBounded(classToPropCache, txtClass, result)
        return result
    }

    // Gộp nhiều token x-css thành rule cho một class nguồn. Token liền kề cùng media/layer/selector chung một rule;
    // nhóm khác (`not-hover:`, `container`, `prose`, biến thể nhiều selector) thành rule kèm theo (`extra`),
    // giữ thứ tự xuất hiện. Một token không hợp lệ thì cả class bị bỏ (không sinh CSS dở dang).
    function resolveTokenGroup(tokens: string[], className: string, trusted = false, order?: { compare: (a: string, b: string) => number; name: string }) {
        const groups: Array<{ key: string; media: string; layer: string; selector: string; declarations: string[] }> = []
        for (let index = 0; index < tokens.length; index++) {
            const parsed = parseClassName(tokens[index])
            if (!parsed) return null
            if (!isValidMediaKey(parsed.mq)) return null
            if (!parsed.prop.startsWith('[') && !isKnownPropertyKey(parsed.prop)) return null
            if (parsed.prop.startsWith('--') && !parsed.val.startsWith('[')) return null
            const media = parsed.mq || ''
            const layer = parsed.layer || ''
            const selector = parsed.selector || ''
            const key = media + '\n' + layer + '\n' + selector
            // Chỉ gộp token liền kề: gộp rule cách xa nhau sẽ đổi thứ tự cascade (prose: `figure` rồi `> :last-child`).
            let group = groups[groups.length - 1]
            if (!group || group.key !== key) {
                group = { key, media, layer, selector, declarations: [] }
                groups.push(group)
            }
            const value = propToValue(parsed.prop, parsed.val, trusted)
            if (!value) return null
            group.declarations.push(value)
        }
        if (groups.length === 0) return null
        const rules: any[] = []
        for (const group of groups) {
            const selectorStr = group.selector.replace(/(';|;)/g, (v: string) => (v == "';" ? ';' : ' '))
            if (selectorStr) {
                const valid = typeof CSS !== 'undefined'
                    ? cssSupports(`selector(${composeSelector('.' + className, selectorStr)})`)
                    : isLikelyValidSelectorFallback(selectorStr)
                // Như trình duyệt: rule có selector không hỗ trợ (`ol[type="A" s]` của prose) bị bỏ riêng,
                // các rule khác của class vẫn giữ.
                if (!valid) continue
            }
            rules.push({
                media: group.media || 'default',
                layer: group.layer || '0',
                className,
                property: group.declarations.join(';'),
                selector: selectorStr,
                cssRules: `.${className}${selectorStr}{${group.declarations.join(';')}}`,
                order,
            })
        }
        if (rules.length === 0) return null
        const [first, ...extra] = rules
        if (extra.length) first.extra = extra
        return first
    }

    function computeClassToProp(txtClass: string) {
        if (!shouldProcessClass(txtClass)) return null

        const parseTarget = prefix ? txtClass.slice(prefix.length) : txtClass
        const className = typeof CSS !== 'undefined' ? CSS.escape(txtClass) : escapeCssIdentifier(txtClass)

        if (dialectList.length) {
            for (const dialect of dialectList) {
                let tokens: string[] | null = null
                try {
                    tokens = dialect(parseTarget)
                } catch (_error) {
                    tokens = null
                }
                if (tokens && tokens.length) {
                    const order = typeof dialect.compare === 'function' ? { compare: dialect.compare, name: parseTarget } : undefined
                    const resolved = resolveTokenGroup(tokens, className, dialect.trusted === true, order)
                    if (resolved) return resolved
                }
            }
        }
        // Class có dạng của phương ngữ mà phương ngữ không nhận: không rơi xuống cú pháp x-css (sinh CSS sai).
        if (dialectList.some((dialect) => {
            try {
                return typeof dialect.owns === 'function' && dialect.owns(parseTarget)
            } catch (_error) {
                return false
            }
        })) return null


        // Support chained utilities: "md:dF&fxdC@;li", "dF&fk-fxdC@;li", "md:[grp1]&[grp2]@;li"
        if (parseTarget.includes('&') && !parseTarget.startsWith('&')) {
            const { body, selector } = splitSelectorSuffix(parseTarget)
            const segments = splitByAmpersandOutsideBrackets(body)
                .map((seg) => seg.trim())
                .filter((seg) => seg.length > 0)
                .map((seg) => (prefix && seg.startsWith(prefix) ? seg.slice(prefix.length) : seg))

            if (segments.length > 1) {
                let rootMedia = ''
                let rootLayer = ''
                const rootSelector = selector
                let hasRoot = false
                const cssPropItems: string[] = []

                for (const seg of segments) {
                    const segClass = rootSelector ? `${seg}@${rootSelector}` : seg
                    const parsedSeg = parseClassName(segClass)
                    if (!parsedSeg) return null
                    if (!isValidMediaKey(parsedSeg.mq)) return null
                    if (!parsedSeg.prop.startsWith('[') && !isKnownPropertyKey(parsedSeg.prop)) return null

                    if (!hasRoot) {
                        rootMedia = parsedSeg.mq || ''
                        rootLayer = parsedSeg.layer || ''
                        hasRoot = true
                    } else {
                        if (!parsedSeg.mq && rootMedia) parsedSeg.mq = rootMedia
                        if (!parsedSeg.layer && rootLayer) parsedSeg.layer = rootLayer
                    }

                    const segMedia = parsedSeg.mq || ''
                    const segLayer = parsedSeg.layer || ''
                    const segSelector = parsedSeg.selector || ''
                    if (segMedia !== rootMedia || segLayer !== rootLayer || segSelector !== rootSelector) {
                        return null
                    }

                    const valStr = propToValue(parsedSeg.prop, parsedSeg.val)
                    if (!valStr) return null
                    cssPropItems.push(valStr)
                }

                if (cssPropItems.length === 0) return null

                const selectorStr = rootSelector.replace(/(';|;)/g, (v: string) => (v == "';" ? ';' : ' '))
                const checkSupport = `selector(${composeSelector('.' + className, selectorStr)})`
                if (selectorStr) {
                    if (typeof CSS !== 'undefined') {
                        if (!cssSupports(checkSupport)) return null
                    } else if (!isLikelyValidSelectorFallback(selectorStr)) {
                        return null
                    }
                }

                return {
                    media: rootMedia || 'default',
                    layer: rootLayer || '0',
                    className,
                    property: cssPropItems.join(';'),
                    selector: selectorStr,
                    cssRules: `.${className}${selectorStr}{${cssPropItems.join(';')}}`,
                }
            }
        }

        const parsed = parseClassName(parseTarget)
        if (!parsed) return null
        if (!isValidMediaKey(parsed.mq)) return null
        if (!parsed.prop.startsWith('[') && !isKnownPropertyKey(parsed.prop)) return null
        // Custom property chỉ hợp lệ ở dạng `--ten[gia-tri]`; `--tenGiaTri` là mơ hồ nên bị từ chối.
        if (parsed.prop.startsWith('--') && !parsed.val.startsWith('[')) return null

        let { mq: m = 'default', layer: l = '0', prop: p, val: v, selector: s = '' } = parsed
        const cssPropItems: string[] = []

        const valStr = propToValue(p, v)
        if (valStr) cssPropItems.push(valStr)

        if (cssPropItems.length === 0) return null

        const selectorStr = s.replace(/(';|;)/g, (v: string) => (v == "';" ? ';' : ' '))
        const checkSupport = `selector(${composeSelector('.' + className, selectorStr)})`
        if (selectorStr) {
            if (typeof CSS !== 'undefined') {
                if (!cssSupports(checkSupport)) return null
            } else if (!isLikelyValidSelectorFallback(selectorStr)) {
                return null
            }
        }

        return {
            media: m || 'default',
            layer: l || '0',
            className,
            property: cssPropItems.join(';'),
            selector: selectorStr,
            cssRules: `.${className}${selectorStr}{${cssPropItems.join(';')}}`,
        }
    }

    // Polyfill CSS.escape cho Node/SSR — bám sát thuật toán CSSOM (Mathias Bynens).
    // Trước đây regex [^\w-] để nguyên ký tự số ở đầu -> selector không hợp lệ và
    // KHÁC với CSS.escape của trình duyệt (lệch cache SSR↔browser cho class có layer số).
    const escapeCssIdentifier = (str: string): string => {
        const length = str.length
        let index = -1
        let result = ''
        const firstCode = str.charCodeAt(0)
        while (++index < length) {
            const codeUnit = str.charCodeAt(index)
            // U+0000 -> ký tự thay thế U+FFFD
            if (codeUnit === 0x0000) {
                result += '�'
                continue
            }
            if (
                // [U+0001, U+001F] hoặc U+007F
                (codeUnit >= 0x0001 && codeUnit <= 0x001f) || codeUnit === 0x007f ||
                // chữ số ở vị trí đầu
                (index === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
                // chữ số ngay sau dấu '-' ở đầu
                (index === 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCode === 0x002d)
            ) {
                result += '\\' + codeUnit.toString(16) + ' '
                continue
            }
            // '-' đơn lẻ ở đầu
            if (index === 0 && length === 1 && codeUnit === 0x002d) {
                result += '\\' + str.charAt(index)
                continue
            }
            // Giữ nguyên: >= U+0080, '-', '_', [0-9], [A-Z], [a-z]
            if (
                codeUnit >= 0x0080 || codeUnit === 0x002d || codeUnit === 0x005f ||
                (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
                (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
                (codeUnit >= 0x0061 && codeUnit <= 0x007a)
            ) {
                result += str.charAt(index)
                continue
            }
            // Còn lại: escape bằng backslash
            result += '\\' + str.charAt(index)
        }
        return result
    }

    // B5: thay đệ quy + spread + flat(Infinity) bằng querySelectorAll('[class]').
    // Gom class của chính `el` và toàn bộ hậu duệ có class, lọc theo ký tự đầu (a-z/0-9, cho phép '-').
    const isClassWhitespace = (code: number): boolean =>
        (code >= 0x0009 && code <= 0x000d) ||
        code === 0x0020 ||
        code === 0x00a0 ||
        code === 0x1680 ||
        (code >= 0x2000 && code <= 0x200a) ||
        code === 0x2028 ||
        code === 0x2029 ||
        code === 0x202f ||
        code === 0x205f ||
        code === 0x3000 ||
        code === 0xfeff

    // Chuỗi class của phần tử (`className`, SVG: `baseVal`) tách như classList: theo khoảng trắng HTML (ASCII).
    const classNameOf = (node: any): string => {
        const raw = node.className
        return typeof raw === 'string' ? raw : raw?.baseVal || ''
    }
    const splitClassName = (value: string): string[] => value.split(/[\t\n\f\r ]+/)

    // Đọc chuỗi class một lần (`className`, SVG: `baseVal`) thay vì gọi `classList[i]` cho từng token, và bỏ
    // qua chuỗi đã gặp: danh sách/bảng/burst innerHTML lặp cùng chuỗi class ở hàng nghìn phần tử. Bỏ qua an toàn
    // vì mọi token của chuỗi đó đã vào hàng đợi của observer này (`seen` sống theo từng observeDom()).
    const collectClassesInto = (node: Element, out: string[], seen: Set<string>): void => {
        const value = classNameOf(node)
        if (!value || seen.has(value)) return
        if (seen.size > 4095) seen.clear()
        seen.add(value)
        for (const f of splitClassName(value)) {
            const c = f.charCodeAt(0) === 45 ? f.charCodeAt(1) : f.charCodeAt(0)
            if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57)) out.push(f)
        }
    }

    const getClassAttrs = (el: Element, seen: Set<string>, out: string[] = []): string[] => {
        collectClassesInto(el, out, seen)
        for (const node of el.querySelectorAll?.('[class]') || []) collectClassesInto(node, out, seen)
        return out
    }

    const observeDom = (
        dom: Document | Element | ShadowRoot,
        cb: (items: string[]) => void,
        skipInitialScan = false,
    ): (() => void) | undefined => {
        // Document -> documentElement; Element và ShadowRoot giữ nguyên.
        const docx = (dom && 'documentElement' in dom ? dom.documentElement : dom) as Element
        if (!docx) return undefined

        // Chuỗi class đã quét bởi observer này (xem collectClassesInto).
        const seen = new Set<string>()
        // Element: cả chính nó lẫn con cháu; ShadowRoot không phải Element (không có className) nên chỉ quét
        // con cháu — vẫn có CSS trước paint đầu.
        const scan = () => {
            const items = getClassAttrs(docx, seen)
            if (items.length) cb(items)
        }
        if (skipInitialScan) {
            // Static-first: không quét trước paint đầu. Vẫn quét một lần khi trình duyệt rảnh
            // để bù class không có trong CSS tĩnh (ví dụ class do JS sinh trước khi observe);
            // class đã có trong manifest bị bỏ qua O(1) nên lượt quét này rẻ.
            const deferredScan = () => {
                if (active) scan()
            }
            const idle = (globalThis as any).requestIdleCallback as ((fn: () => void, opts?: { timeout: number }) => number) | undefined
            if (typeof idle === 'function') idle(deferredScan, { timeout: 500 })
            else setTimeout(deferredScan, 0)
        } else {
            scan()
        }

        // B6: gom class từ một loạt mutation (burst) rồi flush 1 lần qua rAF/microtask, trước style recalc của
        // khung hình kế tiếp. Sau destroy() (`active` = false) lượt flush đã hẹn không làm gì.
        let pendingClasses: Set<string> | null = null
        let active = true
        const enqueue = (items: string[]): void => {
            if (!items.length) return
            if (!pendingClasses) {
                pendingClasses = new Set()
                const flush = () => {
                    const batch = pendingClasses
                    pendingClasses = null
                    if (active && batch?.size) cb([...batch])
                }
                ;((globalThis as any).requestAnimationFrame || queueMicrotask)(flush)
            }
            for (let i = 0; i < items.length; i++) pendingClasses.add(items[i])
        }

        // MutationObserver: `attributeFilter` chỉ báo thuộc tính class (đích luôn là Element); childList chỉ cần
        // node được thêm.
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutationList) => {
                for (const mutation of mutationList) {
                    if (mutation.type == 'attributes') {
                        const oldClassSet = new Set(splitClassName(mutation.oldValue || ''))
                        enqueue(splitClassName(classNameOf(mutation.target)).filter((token) => token && !oldClassSet.has(token)))
                    } else {
                        const vClass: string[] = []
                        for (const node of mutation.addedNodes || []) if (node.nodeType === 1) getClassAttrs(node as Element, seen, vClass)
                        enqueue(vClass)
                    }
                }
            })

            observer.observe(docx, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['class'],
                childList: true,
                subtree: true,
            })

            return () => {
                active = false
                pendingClasses = null
                observer.disconnect()
            }
        }

        return undefined
    }

    // API công khai để xuất cache cho build thủ công
    const exportCache = () => {
        const storage = CACHE_BUILD && cacheConfig.loadOnInit ? getLocalStorageSafe() : null
        if (!storage) return lastKnownCacheData
        let raw: string | null = null
        try {
            raw = storage.getItem(cacheKey)
        } catch (_error) {
            return lastKnownCacheData
        }
        const data = parseCacheDataSync(raw)
        return data || lastKnownCacheData
    }

    return { buildCss, exportCache, ready: dictionaryReadyPromise }
}

export const cssObserve = (dom: Document | Element | ShadowRoot, options?: XCSSConfig) => {
    xcss(options).buildCss(dom).observe()
}

export const cssClsx = (dom: Document | Element | ShadowRoot, options?: XCSSConfig) => {
    return xcss(options).buildCss(dom).clsx
}

export default { css: xcss, cssObserve, clsx: cssClsx }
