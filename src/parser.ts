export type ParsedClass = {
    mq: string         // Media Query prefix (sm, md, lg...)
    layer: string      // Layer priority (0-9...)
    prop: string       // Property name (m, p, fx...)
    val: string        // Value part (10px, Red, #fff...)
    selector: string   // Selector modifier (&:hover, @...)
}

/**
 * Finds the first ":" outside bracketed arbitrary values.
 * Example: "w[calc(var(--x:y))]" -> no media colon found.
 */
function findFirstColonOutsideBrackets(input: string, start: number, end: number): number {
    let bracketDepth = 0

    for (let i = start; i < end; i++) {
        const code = input.charCodeAt(i)

        if (code === 91) { // [
            bracketDepth++
            continue
        }

        if (code === 93) { // ]
            if (bracketDepth > 0) bracketDepth--
            continue
        }

        if (code === 58 && bracketDepth === 0) { // :
            return i
        }
    }

    return -1
}

/**
 * Finds the last "@" outside bracketed arbitrary values.
 * Example: "cRed@[data-x=\"a:b\"]" -> selector starts at that "@".
 */
function findLastAtOutsideBrackets(input: string, start: number, end: number): number {
    let bracketDepth = 0

    for (let i = end - 1; i >= start; i--) {
        const code = input.charCodeAt(i)

        if (code === 93) { // ]
            bracketDepth++
            continue
        }

        if (code === 91) { // [
            if (bracketDepth > 0) bracketDepth--
            continue
        }

        if (code === 64 && bracketDepth === 0) { // @
            return i
        }
    }

    return -1
}

/**
 * Validates square brackets are balanced in a range.
 * Rejects both missing closing bracket and stray closing bracket.
 */
function hasBalancedSquareBrackets(input: string, start: number, end: number): boolean {
    let bracketDepth = 0
    for (let i = start; i < end; i++) {
        const code = input.charCodeAt(i)
        if (code === 91) { // [
            bracketDepth++
            continue
        }
        if (code === 93) { // ]
            if (bracketDepth === 0) return false
            bracketDepth--
        }
    }
    return bracketDepth === 0
}

/**
 * Fast checking if a char code is a valid property character (a-z).
 * Note: Dash (-) is treated as start of Value (negative or separator).
 */
function isLowerAlpha(code: number): boolean {
    // a-z: 97-122
    return (code >= 97 && code <= 122)
}

/**
 * Parses a CSS class string into its components.
 * Format: [Layer][MediaQuery:]PropertyValue[@Selector]
 * Example: 
 *   - m10px
 *   - sm:cRed
 *   - 1sm:w100p
 *   - hover:bgBlue -> mapped to sm (no, modifiers are usually @hover style in this lib, but mq is prefix)
 *   - bgRed@hover
 */
export function parseClassName(className: string): ParsedClass | null {
    if (!className || className.length < 2) return null
    if (!hasBalancedSquareBrackets(className, 0, className.length)) return null

    let start = 0
    let end = className.length

    // 1. Extract Selector Modifier (@...) from the end
    // Use lastIndexOf to find @
    // Note: Some values might contain @ (unlikely in this syntax unless escaped, but let's assume @ starts selector)
    // The regex used @(?<s>.*)$ so it takes everything after last @? Or first @? 
    // Regex: (@(?<s>.*))?$ -> It matches @ at the end group.

    // Scan for selector "@" outside [] from right to left.
    let selector = ''
    let atIndex = findLastAtOutsideBrackets(className, start, end)
    if (atIndex > start) {
        selector = className.substring(atIndex + 1, end)
        end = atIndex
    }

    // 2. Extract Media Query / Layer Prefix
    // Look for first ':' outside [] only.
    let mq = ''
    let layer = ''
    const colonIndex = findFirstColonOutsideBrackets(className, start, end)

    if (colonIndex > 0 && colonIndex < end) {
        let prefix = className.substring(start, colonIndex)
        start = colonIndex + 1

        // Check for Layer Priority in Prefix (e.g. '1sm', '9lg', 'sm')
        // Regex was: ((?<m>xs|sm...):)?(?<l>[0-9]*)?
        // Wait, current Regex allows Layer AFTER MQ? 'sm:9m10px'?
        // Regex: (?<m>...:)? (?<l>[0-9]*)? (?<p>...)
        // So layer is distinct number prefix immediately before property.

        // But what if 'sm:' is present?
        // Regex structure: `^((?<m>...):)?(?<l>[0-9]*)?(?<p>...)...`
        // So MQ comes first with colon. THEN Layer number.

        mq = prefix
    }

    // 3. Extract Layer (Digits at current start)
    // Scan digits
    let digitEnd = start
    while (digitEnd < end) {
        const code = className.charCodeAt(digitEnd)
        if (code >= 48 && code <= 57) { // 0-9
            digitEnd++
        } else {
            break
        }
    }

    if (digitEnd > start) {
        layer = className.substring(start, digitEnd)
        start = digitEnd
    }

    // 4. Extract Property and Value
    // Property must start with lowercase a-z or dash
    // If it starts with anything else, it's invalid (or handled by special cases)
    // Exception: &... (group 2/3 in regex)

    if (start >= end) return null

    // Leading "&..." is invalid by class syntax rules.
    if (className.charCodeAt(start) === 38) return null

    // Check for Alias/Group Syntax: [name]
    // If it starts with [, we capture the whole [...] part as property
    if (className.charCodeAt(start) === 91) { // '['
        const closeIndex = className.indexOf(']', start)
        if (closeIndex > start) {
             return {
                mq,
                layer,
                prop: className.substring(start, closeIndex + 1), // includes [ and ]
                val: '', // Value is empty for alias
                selector
            }
        }
    }

    // Scan for Property end
    // Property ends checking isLowerAlphaOrDash.
    // BUT we need to stop when we hit UpperCase, Digit, or specific symbols (!, ., [, ', {)

    let propEnd = start
    while (propEnd < end) {
        const code = className.charCodeAt(propEnd)

        // Check if current char is dash (-) or dot (.)
        if (code === 45 || code === 46) {
            // Check next char
            if (propEnd + 1 < end) {
                const nextCode = className.charCodeAt(propEnd + 1)
                // `--` indicates a CSS variable value start (e.g. bgc--red)
                if (code === 45 && nextCode === 45 && propEnd > start) {
                    break
                }
                // If next valid char is digit (0-9: 48-57), break as it is value start
                if (nextCode >= 48 && nextCode <= 57) {
                    break
                }
            }
            // Otherwise, treat dash/dot as part of property and continue
            propEnd++
            continue
        }

        // Stop if not a-z
        if (!isLowerAlpha(code)) {
            break
        }
        propEnd++
    }

    // If no property part found (and not & case), invalid
    if (propEnd === start) return null

    const prop = className.substring(start, propEnd)
    const val = className.substring(propEnd, end)

    // Optimization: If val is empty, it might be a flag property? 
    // Or invalid? 'flex' (prop=flex, val="") -> valid if display:flex
    // 'red' (prop=red, val="") -> valid color? No, usually prop is 'c', val is 'Red'.
    // If 'red' is passed, prop='red', val=''. Dictionary common lookup 'red' -> 'color: red'.
    // So empty value is valid.

    return {
        mq,
        layer,
        prop,
        val,
        selector
    }
}
