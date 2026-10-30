import { mitt } from './events'
import { parseClassName } from './parser'
import {
    SHORT_PROPERTIES as BUILTIN_SHORT_PROPERTIES,
    COMMON_VALUES as BUILTIN_COMMON_VALUES,
    SPECIFIC_VALUES as BUILTIN_SPECIFIC_VALUES,
} from './dictionary'


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
    cache?: {
        styleId?: string
        version?: string
        compression?: boolean
        debounceMs?: number
        sizeLast?: number
        loadOnInit?: boolean
    }
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

const canUseWritableLocalStorage = (): boolean => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return false

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

const setupCssLayers = (docRoot: Document | ShadowRoot | null, id?: string) => {
    if (!docRoot) return
    id = id || 'PresenceStyle'
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
// Mẫu giá trị không được phép khi không có CSS.supports để kiểm tra.
const UNSAFE_VALUE_PATTERN = /[{}<]|\/\*/

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
    } = modules || {}

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
    if (!Array.isArray(excludeNames)) excludeNames = []
    if (!Array.isArray(excludePrefixes)) excludePrefixes = []
    if (!groupValues || typeof groupValues !== 'object') groupValues = {}
    if (!valueExt || typeof valueExt !== 'object') valueExt = {}
    const shouldHashOutputClassName = hashClassName !== false

    const cacheConfig = resolveCacheConfig(cacheOptions)
    const cacheKey = createCacheKey(cacheConfig)
    const keySyncKey = createKeySyncKey(cacheConfig)
    const keySyncChannelName = createKeySyncChannelName(cacheConfig)

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
    const isValidMediaKey = (mq?: string): boolean => !mq || mediaKeySet.has(mq)
    const shouldEnforceKnownProperties = dictionaryImport !== false
    const compositePropertyKeys = new Set(['mx', 'my', 'px', 'py', 'bdx', 'bdy'])
    let knownFullPropertyNames = new Set<string>()
    const isKnownPropertyKey = (prop: string): boolean => {
        if (!prop) return false
        if (!shouldEnforceKnownProperties) return true
        if (!PropertiesCss || Object.keys(PropertiesCss).length === 0) return true
        return !!PropertiesCss[prop] || compositePropertyKeys.has(prop) || knownFullPropertyNames.has(prop)
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

    if (dictionaryImport === false) {
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
        const browserStorage = browserWindow?.localStorage || null
        const cacheSupported = isBrowser && canUseCacheRuntime()
        const cacheEnabled = cacheConfig.loadOnInit && cacheSupported
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
        const keyRegistryKey = createKeyRegistryKey(cacheConfig)
        let sizeLast = cacheConfig.sizeLast;

        // Flag: lần render đầu tiên xử lý CSS đồng bộ để giảm CLS
        let isFirstRenderBatch = true;
        const syncSourceId = `xcss_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
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
        // microtask để chỉ cập nhật textContent một lần cho mỗi media sheet.
        const dirtyLegacyMediaKeys = new Set<string>()
        let legacyStyleFlushScheduled = false
        const flushLegacyStyleText = () => {
            legacyStyleFlushScheduled = false
            dirtyLegacyMediaKeys.forEach((mediaKey) => {
                const style = legacyStyleEls[mediaKey]
                if (style) style.textContent = getSheetText(mediaKey)
            })
            dirtyLegacyMediaKeys.clear()
        }
        const scheduleLegacyStyleText = (mediaKey: string) => {
            dirtyLegacyMediaKeys.add(mediaKey)
            if (legacyStyleFlushScheduled) return
            legacyStyleFlushScheduled = true
            queueMicrotask(flushLegacyStyleText)
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
                        if (mqStr && cssText) {
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

        // Init sheets & Finish Hydration
        if (isBrowser) {
            const rootSheet = createMediaSheet('root', '')
            if (rootSheet) cssStyleSheetsDom['root'] = rootSheet
        }

        const applySheetText = (mediaKey: string, text: string) => {
            setSheetText(mediaKey, text)
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

        applySheetText('root', baseCssText)

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
                    const txt = mergeRootCssText(baseCssText, cachedRoot)
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

        // Chèn 1 rule vào CSSStyleSheet — O(1), không parse lại toàn bộ.
        // Fallback về replaceSync nếu insertRule thất bại.
        const safeInsertRule = (
            sheet: CSSStyleSheet,
            rule: string,
            getFallbackText: () => string,
        ): void => {
            try {
                sheet.insertRule(rule, sheet.cssRules.length)
            } catch (_e) {
                // insertRule thất bại (rule không hợp lệ, etc.) → fallback replaceSync
                try {
                    sheet.replaceSync(getFallbackText())
                } catch (_e2) {
                    // Bỏ qua nếu cả hai đều thất bại
                }
            }
        }

        const updateRules = (txtCls: string, d: any) => {
            let { media, property, selector, layer, className } = d

            let cssTextStore = cssStyleSheetsText

            layer = Number(layer) || 0
            let cssExts = shouldHashOutputClassName ? CSS_KEYS.get(txtCls) : null
            let cssName = cssExts
                ? `.${cssExts}${selector}`
                : `.${className}${selector}`

            // CB4: trên thiết bị cảm ứng, chỉ áp :hover khi thiết bị thật sự hỗ trợ hover.
            let ruleBody = `${cssName}{${property}}`
            if (hoverMedia && selector && selector.indexOf(':hover') !== -1) {
                ruleBody = `@media (hover: hover){${ruleBody}}`
            }
            // CB2: bỏ bọc @layer trên trình duyệt thiếu hỗ trợ -> giữ thứ tự theo insertion order.
            var txtCss = supportsAtLayer ? `@layer l${layer}{${ruleBody}}` : ruleBody

            if (!cssStyleSheetsSet[media]) {
                cssStyleSheetsSet[media] = new Set()
            }

            let cssStyleSheetSet = cssStyleSheetsSet[media]

            if (!cssStyleSheetSet.has(txtCss)) {
                cssStyleSheetSet.add(txtCss)

                // Cập nhật text store cho cache persistence. Chỉ join khi thật sự
                // cần export/cache/fallback CSSOM để tránh sao chép toàn bộ sheet.
                if (!cssTextStore[media]) cssTextStore[media] = []
                cssTextStore[media].push(txtCss)

                if (!isBrowser) {
                    // SSR: chỉ cập nhật text store (đã làm ở trên)
                } else if (cssStyleSheetsDom[media]) {
                    // Browser hiện đại: insertRule O(1) — nhanh hơn replaceSync O(n)
                    safeInsertRule(
                        cssStyleSheetsDom[media],
                        txtCss,
                        () => getSheetText(media),
                    )
                } else if (legacyStyleEls[media]) {
                    scheduleLegacyStyleText(media)
                }

                triggerSave()
            }
        }

        const applyObservedItems = (items: string[]) => {
            items.forEach((cls) => {
                const sourceClassName = resolveSourceClassName(cls)
                let item = classToProp(sourceClassName)
                item && updateRules(sourceClassName, item)
            })
        }

        const processObservedItems = (items: string[]) => {
            if (items.length === 0) return

            const run = () => applyObservedItems(items)
            if (dictionaryReady) {
                run()
            } else {
                dictionaryReadyPromise.then(run)
            }
        }

        emitter.on('observeDom' as any, processObservedItems)

        const clsx = (...clsArrs: any[]) => {
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
            if (!isBrowser || isFirstRenderBatch) {
                emitter.emit('observeDom' as any, lsCss)
            } else {
                queueMicrotask(() => emitter.emit('observeDom' as any, lsCss))
            }

            return lsClassNew.join(' ')
        }

        const observe = () => {
            if (!isBrowser || !observeTarget || !docRoot) return
            if (disconnectObserver) return
            // Lần đầu: xử lý đồng bộ để CSS apply trước first paint
            disconnectObserver = observeDom(observeTarget, (items) => {
                if (isFirstRenderBatch) {
                    applyObservedItems(items)
                } else {
                    processObservedItems(items)
                }
            })
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
                if (mediaQueryStr) {
                    return `@media ${mediaQueryStr} {\n${css}\n}`
                }
                return css
            }).join('\n')
        }

        /**
         * Giải phóng tài nguyên của instance: ngắt MutationObserver, đóng BroadcastChannel,
         * huỷ timer debounce ghi cache, và xoá memo cache.
         * Dùng khi unmount ứng dụng, hot-reload, hoặc teardown test để tránh rò rỉ bộ nhớ.
         */
        const destroy = () => {
            if (disconnectObserver) {
                disconnectObserver()
                disconnectObserver = undefined
            }
            if (debounceTimer) {
                clearTimeout(debounceTimer)
                debounceTimer = null
            }
            dirtyLegacyMediaKeys.clear()
            legacyStyleFlushScheduled = false
            if (keySyncBroadcastChannel) {
                try {
                    keySyncBroadcastChannel.close()
                } catch (_error) {
                    // Bỏ qua lỗi đóng kênh đã bị đóng trước đó.
                }
                keySyncBroadcastChannel = null
            }
            emitter.all.clear()
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

    function propToValue(p: string, v: string): string | null {
        const cacheKey = p + ' ' + v
        const cached = propToValueCache.get(cacheKey)
        if (cached !== undefined) return cached
        const result = computePropToValue(p, v)
        setBounded(propToValueCache, cacheKey, result)
        return result
    }

    function computePropToValue(p: string, v: string): string | null {
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
            // Arbitrary Value: Strip brackets
            vx = vx.substring(1, vx.length - 1)
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
        if (typeof CSS === 'undefined' && UNSAFE_VALUE_PATTERN.test(vx)) return null

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
        if (!isBrowser || cssProp.every((x) => cssSupports(x))) {
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

    function computeClassToProp(txtClass: string) {
        if (!shouldProcessClass(txtClass)) return null

        const parseTarget = prefix ? txtClass.slice(prefix.length) : txtClass
        const className = typeof CSS !== 'undefined' ? CSS.escape(txtClass) : escapeCssIdentifier(txtClass)

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
                const checkSupport = `selector(${className}${selectorStr})`
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

        let { mq: m = 'default', layer: l = '0', prop: p, val: v, selector: s = '' } = parsed
        const cssPropItems: string[] = []

        const valStr = propToValue(p, v)
        if (valStr) cssPropItems.push(valStr)

        if (cssPropItems.length === 0) return null

        const selectorStr = s.replace(/(';|;)/g, (v: string) => (v == "';" ? ';' : ' '))
        const checkSupport = `selector(${className}${selectorStr})`
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

    const splitClassAttribute = (value: string): string[] => {
        const tokens: string[] = []
        let tokenStart = -1
        for (let index = 0; index <= value.length; index++) {
            const isBoundary =
                index === value.length || isClassWhitespace(value.charCodeAt(index))
            if (!isBoundary) {
                if (tokenStart === -1) tokenStart = index
                continue
            }
            if (tokenStart !== -1) {
                tokens.push(value.slice(tokenStart, index))
                tokenStart = -1
            }
        }
        return tokens
    }

    const getClassListTokens = (node: Element): string[] => {
        const classList = node.classList
        if (classList) {
            const tokens: string[] = []
            for (let index = 0; index < classList.length; index++) {
                const token = classList[index]
                if (token) tokens.push(token)
            }
            return tokens
        }
        return splitClassAttribute(node.getAttribute('class') || '')
    }

    const collectClassesInto = (node: Element, out: string[]): void => {
        const cls = node?.classList
        if (!cls) return
        for (let i = 0; i < cls.length; i++) {
            const f = cls[i]
            if (!f) continue
            const c = f.charCodeAt(0) === 45 ? f.charCodeAt(1) : f.charCodeAt(0)
            if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57)) out.push(f)
        }
    }

    const getClassAttrs = (el: Element): string[] => {
        const out: string[] = []
        if (!el) return out
        collectClassesInto(el, out)
        const descendants = el.querySelectorAll?.('[class]')
        if (descendants) {
            for (let i = 0; i < descendants.length; i++) {
                collectClassesInto(descendants[i] as Element, out)
            }
        }
        return out
    }

    const observeDom = (
        dom: Document | Element | ShadowRoot,
        cb: (items: string[]) => void,
    ): (() => void) | undefined => {
        if (typeof cb != 'function') {
            throw new Error('Callback is not a function')
        }
        if (!dom) return undefined
        let docx: Element | ShadowRoot | undefined = undefined

        // Type guards
        if ('documentElement' in dom) {
            docx = dom.documentElement
        } else if (dom instanceof Element || ('tagName' in dom)) { // Basic check for Element
            docx = dom as Element
        } else if ('host' in dom) { // Basic check for ShadowRoot
            docx = dom as ShadowRoot
        }

        if (!docx) return undefined

        if (docx instanceof Element) {
            cb(getClassAttrs(docx))
        } else {
            // ShadowRoot không phải Element nên nhánh cũ bỏ qua hoàn toàn lần quét
            // đầu tiên. Quét trực tiếp descendants để CSS có trước paint đầu.
            const initialClasses: string[] = []
            const elements = docx.querySelectorAll?.('[class]')
            if (elements) {
                for (let i = 0; i < elements.length; i++) {
                    collectClassesInto(elements[i] as Element, initialClasses)
                }
            }
            if (initialClasses.length) cb(initialClasses)
        }

        // B6: gom class từ một loạt mutation (burst) rồi flush 1 lần qua rAF/microtask,
        // tránh reparse đồng bộ trong từng callback gây jank (đặc biệt mobile/list ảo).
        let pendingClasses: Set<string> | null = null
        let animationFrameId: number | null = null
        let active = true
        const enqueue = (items: string[]): void => {
            if (!items.length) return
            if (!pendingClasses) {
                pendingClasses = new Set()
                const flush = () => {
                    animationFrameId = null
                    if (!active) return
                    const batch = pendingClasses!
                    pendingClasses = null
                    if (batch.size) cb([...batch])
                }
                if (typeof requestAnimationFrame !== 'undefined') {
                    animationFrameId = requestAnimationFrame(flush)
                } else {
                    queueMicrotask(flush)
                }
            }
            for (let i = 0; i < items.length; i++) pendingClasses.add(items[i])
        }

        // Tạo MutationObserver để theo dõi thay đổi class
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutationList) => {
                for (const mutation of mutationList) {
                    if (
                        mutation.type == 'attributes' &&
                        mutation.attributeName == 'class'
                    ) {
                        if (mutation.target.nodeType == 1) {
                            const target = mutation.target as Element
                            const currentClasses = getClassListTokens(target)
                            const oldClassSet = new Set(
                                splitClassAttribute(mutation.oldValue || ''),
                            )
                            if (currentClasses.length || oldClassSet.size) {
                                enqueue(currentClasses.filter((token) => !oldClassSet.has(token)))
                            }
                        }
                    } else {
                        if (mutation.type == 'childList' && mutation.addedNodes.length > 0) {
                            const vClass: string[] = []
                            for (let index = 0; index < mutation.addedNodes.length; index++) {
                                const node = mutation.addedNodes[index]
                                if (node.nodeType === 1) {
                                    vClass.push(...getClassAttrs(node as Element))
                                }
                            }

                            enqueue(vClass)
                        }
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
                if (
                    animationFrameId !== null &&
                    typeof cancelAnimationFrame !== 'undefined'
                ) {
                    cancelAnimationFrame(animationFrameId)
                    animationFrameId = null
                }
                observer.disconnect()
            }
        }

        return undefined
    }

    // API công khai để xuất cache cho build thủ công
    const exportCache = () => {
        if (!cacheConfig.loadOnInit || typeof window === 'undefined' || !window.localStorage) return lastKnownCacheData
        const data = parseCacheDataSync(window.localStorage.getItem(cacheKey))
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
