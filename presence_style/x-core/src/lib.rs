use std::cell::RefCell;
use std::collections::HashMap;

mod dictionary_generated;
use dictionary_generated::{
    common_value, is_known_full_property, is_known_short_property, property_name, specific_value,
};

/// Khai báo thứ tự cascade layer `l0` (thấp) .. `l23` (cao). Phải đứng trước mọi rule
/// `@layer lN{...}`, nếu không trình duyệt xếp layer theo lần xuất hiện đầu tiên.
pub const LAYER_ORDER_STATEMENT: &str = "@layer l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19, l20, l21, l22, l23;";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedClass {
    pub mq: String,
    pub layer: String,
    pub prop: String,
    pub val: String,
    pub selector: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CssRule {
    pub class_name: String,
    pub media: String,
    pub layer: u8,
    pub selector: String,
    pub declarations: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Breakpoint {
    pub key: String,
    pub query: String,
}

#[derive(Debug, Clone)]
pub struct XCoreConfig {
    pub breakpoints: Vec<Breakpoint>,
    pub prefix: Option<String>,
    pub hash_class_name: bool,
}

impl Default for XCoreConfig {
    fn default() -> Self {
        Self {
            breakpoints: default_breakpoints(),
            prefix: None,
            hash_class_name: true,
        }
    }
}

/// Registry: token x-css -> tên class xuất + rule CSS.
///
/// - Mỗi token chỉ được phân tích một lần (memo), nên gọi `clsx` lặp ở mỗi lần render rẻ.
/// - Rule giữ thứ tự chèn (giống engine Node) để class cùng layer, cùng độ ưu tiên
///   cho cùng kết quả ở hai engine.
/// - `css_text()` được cache và chỉ dựng lại khi có rule mới.
#[derive(Debug, Clone)]
pub struct XCoreRegistry {
    config: XCoreConfig,
    rules: Vec<CssRule>,
    rule_index: HashMap<String, usize>,
    memo: HashMap<String, String>,
    css_cache: RefCell<Option<String>>,
}

impl Default for XCoreRegistry {
    fn default() -> Self {
        Self::new(XCoreConfig::default())
    }
}

/// Kết quả phân giải một token thành rule (chưa gắn tên class).
struct Resolved {
    media: String,
    layer: u8,
    selector: String,
    declarations: String,
}

impl XCoreRegistry {
    pub fn new(config: XCoreConfig) -> Self {
        Self {
            config,
            rules: Vec::new(),
            rule_index: HashMap::new(),
            memo: HashMap::new(),
            css_cache: RefCell::new(None),
        }
    }

    pub fn config(&self) -> &XCoreConfig {
        &self.config
    }

    pub fn clsx(&mut self, input: impl AsRef<str>) -> String {
        let input = input.as_ref();
        let mut output = String::with_capacity(input.len());
        for token in input.split_whitespace() {
            if !output.is_empty() {
                output.push(' ');
            }
            if let Some(cached) = self.memo.get(token) {
                output.push_str(cached);
                continue;
            }
            let out = self.register_uncached(token);
            output.push_str(&out);
            self.memo.insert(token.to_string(), out);
        }
        output
    }

    pub fn register_token(&mut self, token: &str) -> String {
        if let Some(cached) = self.memo.get(token) {
            return cached.clone();
        }
        let out = self.register_uncached(token);
        self.memo.insert(token.to_string(), out.clone());
        out
    }

    fn register_uncached(&mut self, token: &str) -> String {
        let Some(parse_target) = self.strip_prefix(token) else {
            return token.to_string();
        };
        let Some(resolved) = self.resolve(parse_target) else {
            return token.to_string();
        };

        let class_name = if self.config.hash_class_name {
            stable_class_name(parse_target)
        } else {
            escape_css_identifier(token)
        };
        let output_class_name = if self.config.hash_class_name {
            class_name.clone()
        } else {
            token.to_string()
        };

        if !self.rule_index.contains_key(&class_name) {
            self.rule_index.insert(class_name.clone(), self.rules.len());
            self.rules.push(CssRule {
                class_name,
                media: resolved.media,
                layer: resolved.layer,
                selector: resolved.selector,
                declarations: resolved.declarations,
            });
            self.css_cache.replace(None);
        }

        output_class_name
    }

    /// Phân giải token (đã bỏ prefix): đơn lẻ hoặc chuỗi `&` (`md:dF&aiC@:hover`).
    fn resolve(&self, target: &str) -> Option<Resolved> {
        if target.contains('&') && !target.starts_with('&') {
            if let Some(resolved) = self.resolve_chain(target) {
                return Some(resolved);
            }
            // Một đoạn sau khi tách: rơi xuống nhánh đơn lẻ như engine Node.
            let (body, _) = split_selector_suffix(target);
            if split_outside_brackets(body, b'&').iter().filter(|s| !s.trim().is_empty()).count() > 1 {
                return None;
            }
        }

        let parsed = parse_class_name(target)?;
        let media = self.resolve_media(&parsed.mq)?;
        if parsed.prop.starts_with('[') || !is_known_property(&parsed.prop) {
            return None;
        }
        // Custom property chỉ hợp lệ ở dạng `--ten[gia-tri]`.
        if parsed.prop.starts_with("--") && !parsed.val.starts_with('[') {
            return None;
        }
        let declarations = to_declarations(&parsed.prop, &parsed.val)?;
        let selector = replace_semicolons(&parsed.selector);
        if !is_likely_valid_selector(&selector) {
            return None;
        }
        Some(Resolved {
            media,
            layer: parsed.layer.parse::<u8>().unwrap_or(0),
            selector,
            declarations,
        })
    }

    fn resolve_chain(&self, target: &str) -> Option<Resolved> {
        let (body, selector) = split_selector_suffix(target);
        let prefix = self.config.prefix.as_deref().unwrap_or("");
        let segments: Vec<&str> = split_outside_brackets(body, b'&')
            .into_iter()
            .map(str::trim)
            .filter(|seg| !seg.is_empty())
            .map(|seg| if !prefix.is_empty() { seg.strip_prefix(prefix).unwrap_or(seg) } else { seg })
            .collect();
        if segments.len() < 2 {
            return None;
        }

        let mut root_media: Option<String> = None;
        let mut root_layer = String::new();
        let mut declarations = Vec::with_capacity(segments.len());
        for seg in segments {
            let seg_class = if selector.is_empty() { seg.to_string() } else { format!("{seg}@{selector}") };
            let mut parsed = parse_class_name(&seg_class)?;
            self.resolve_media(&parsed.mq)?;
            // Nhóm alias `[ten]` cần cấu hình aliases (chưa có ở engine Rust).
            if parsed.prop.starts_with('[') || !is_known_property(&parsed.prop) {
                return None;
            }
            match &root_media {
                None => {
                    root_media = Some(parsed.mq.clone());
                    root_layer = parsed.layer.clone();
                }
                Some(media) => {
                    if parsed.mq.is_empty() {
                        parsed.mq = media.clone();
                    }
                    if parsed.layer.is_empty() {
                        parsed.layer = root_layer.clone();
                    }
                }
            }
            if Some(&parsed.mq) != root_media.as_ref() || parsed.layer != root_layer || parsed.selector != selector {
                return None;
            }
            declarations.push(to_declarations(&parsed.prop, &parsed.val)?);
        }

        let selector = replace_semicolons(selector);
        if !is_likely_valid_selector(&selector) {
            return None;
        }
        Some(Resolved {
            media: self.resolve_media(root_media.as_deref().unwrap_or(""))?,
            layer: root_layer.parse::<u8>().unwrap_or(0),
            selector,
            declarations: declarations.join(";"),
        })
    }

    /// CSS đầy đủ: khai báo thứ tự layer, rule không media, rồi từng khối `@media` theo
    /// thứ tự breakpoint (xs, sm, md, lg, ... rồi breakpoint tự khai báo). Mỗi rule bọc
    /// `@layer lN{...}` nên layer cao luôn thắng, kể cả khi layer thấp nằm trong media.
    pub fn css_text(&self) -> String {
        if let Some(cached) = self.css_cache.borrow().as_ref() {
            return cached.clone();
        }

        let order = self.media_order();
        let mut groups: Vec<Vec<&CssRule>> = vec![Vec::new(); order.len() + 1];
        let mut unknown: Vec<(&str, Vec<&CssRule>)> = Vec::new();
        for rule in &self.rules {
            if rule.media.is_empty() {
                groups[0].push(rule);
            } else if let Some(index) = order.iter().position(|query| *query == rule.media) {
                groups[index + 1].push(rule);
            } else if let Some(entry) = unknown.iter_mut().find(|(query, _)| *query == rule.media) {
                entry.1.push(rule);
            } else {
                unknown.push((&rule.media, vec![rule]));
            }
        }

        let mut output = String::from(LAYER_ORDER_STATEMENT);
        for rule in &groups[0] {
            push_rule(&mut output, rule);
        }
        let media_groups = order
            .iter()
            .zip(groups.iter().skip(1))
            .map(|(query, rules)| (*query, rules))
            .chain(unknown.iter().map(|(query, rules)| (*query, rules)));
        for (query, rules) in media_groups {
            if rules.is_empty() {
                continue;
            }
            output.push_str("@media ");
            output.push_str(query);
            output.push('{');
            for rule in rules {
                push_rule(&mut output, rule);
            }
            output.push('}');
        }

        self.css_cache.replace(Some(output.clone()));
        output
    }

    /// Rule theo thứ tự chèn.
    pub fn rules(&self) -> impl Iterator<Item = &CssRule> {
        self.rules.iter()
    }

    /// Thứ tự media hiệu lực: mỗi key lấy khai báo SAU CÙNG và nằm ở vị trí đó (giống Node).
    fn media_order(&self) -> Vec<&str> {
        let list = &self.config.breakpoints;
        list.iter()
            .enumerate()
            .filter(|(index, item)| !list[index + 1..].iter().any(|later| later.key == item.key))
            .map(|(_, item)| item.query.as_str())
            .collect()
    }

    fn strip_prefix<'a>(&self, token: &'a str) -> Option<&'a str> {
        match &self.config.prefix {
            Some(prefix) => token.strip_prefix(prefix.as_str()),
            None => Some(token),
        }
    }

    fn resolve_media(&self, key: &str) -> Option<String> {
        if key.is_empty() {
            return Some(String::new());
        }

        self.config
            .breakpoints
            .iter()
            .rev()
            .find(|item| item.key == key)
            .map(|item| item.query.clone())
    }
}

fn push_rule(output: &mut String, rule: &CssRule) {
    output.push_str("@layer l");
    output.push_str(&rule.layer.to_string());
    output.push_str("{.");
    output.push_str(&rule.class_name);
    output.push_str(&rule.selector);
    output.push('{');
    output.push_str(&rule.declarations);
    output.push_str("}}");
}

pub fn default_breakpoints() -> Vec<Breakpoint> {
    vec![
        bp("xs", "screen and (max-width: 575px)"),
        bp("sm", "screen and (min-width: 576px)"),
        bp("md", "screen and (min-width: 768px)"),
        bp("lg", "screen and (min-width: 992px)"),
        bp("xl", "screen and (min-width: 1200px)"),
        bp("2xl", "screen and (min-width: 1400px)"),
        bp("sma", "screen and (max-width: 768px)"),
        bp("mda", "screen and (max-width: 992px)"),
        bp("lga", "screen and (max-width: 1200px)"),
        bp("xla", "screen and (max-width: 1400px)"),
    ]
}

pub fn bp(key: &str, query: &str) -> Breakpoint {
    Breakpoint {
        key: key.to_string(),
        query: query.to_string(),
    }
}

pub fn parse_class_name(class_name: &str) -> Option<ParsedClass> {
    if class_name.len() < 2 || !has_balanced_square_brackets(class_name, 0, class_name.len()) {
        return None;
    }
    let bytes = class_name.as_bytes();

    let mut start = 0;
    let mut end = class_name.len();

    let mut selector = String::new();
    if let Some(at_index) = find_last_at_outside_brackets(class_name, start, end) {
        if at_index > start {
            selector = class_name[at_index + 1..end].to_string();
            end = at_index;
        }
    }

    let mut mq = String::new();
    if let Some(colon_index) = find_first_colon_outside_brackets(class_name, start, end) {
        if colon_index > 0 && colon_index < end {
            mq = class_name[start..colon_index].to_string();
            start = colon_index + 1;
        }
    }

    let digit_end = scan_while(class_name, start, end, |byte| byte.is_ascii_digit());
    let layer = if digit_end > start {
        let value = class_name[start..digit_end].to_string();
        start = digit_end;
        value
    } else {
        String::new()
    };

    if start >= end || bytes[start] == b'&' {
        return None;
    }

    if bytes[start] == b'[' {
        if let Some(close_index) = class_name[start..end].find(']') {
            let close_index = start + close_index;
            if close_index > start {
                return Some(ParsedClass {
                    mq,
                    layer,
                    prop: class_name[start..=close_index].to_string(),
                    val: String::new(),
                    selector,
                });
            }
        }
    }

    // Custom property `--ten[gia-tri]`: tên có thể chứa số/gạch nên dừng ở `[` đầu tiên.
    if bytes[start] == b'-' && start + 1 < end && bytes[start + 1] == b'-' {
        if let Some(open) = class_name[start..].find('[').map(|i| start + i) {
            if open > start + 2 && open < end && is_custom_property_name(&class_name[start..open]) {
                return Some(ParsedClass {
                    mq,
                    layer,
                    prop: class_name[start..open].to_string(),
                    val: class_name[open..end].to_string(),
                    selector,
                });
            }
        }
    }

    let mut prop_end = start;
    while prop_end < end {
        let byte = bytes[prop_end];
        if byte == b'-' || byte == b'.' {
            if prop_end + 1 < end {
                let next = bytes[prop_end + 1];
                if byte == b'-' && next == b'-' && prop_end > start {
                    break;
                }
                if next.is_ascii_digit() {
                    break;
                }
                // `-.5rem`: dấu chấm theo sau là chữ số cũng mở đầu value.
                if byte == b'-' && next == b'.' && prop_end + 2 < end && bytes[prop_end + 2].is_ascii_digit() {
                    break;
                }
            }
            prop_end += 1;
            continue;
        }

        if !byte.is_ascii_lowercase() {
            break;
        }
        prop_end += 1;
    }

    if prop_end == start {
        return None;
    }

    Some(ParsedClass {
        mq,
        layer,
        prop: class_name[start..prop_end].to_string(),
        val: class_name[prop_end..end].to_string(),
        selector,
    })
}

pub fn to_declarations(prop: &str, value: &str) -> Option<String> {
    let property_name = property_name(prop);
    let value = normalize_value(prop, value)?;

    let pair = |a: &str, b: &str| format!("{a}:{value};{b}:{value}");
    Some(match property_name {
        "mx" => pair("margin-left", "margin-right"),
        "my" => pair("margin-top", "margin-bottom"),
        "px" => pair("padding-left", "padding-right"),
        "py" => pair("padding-top", "padding-bottom"),
        "bdx" => pair("border-left", "border-right"),
        "bdy" => pair("border-top", "border-bottom"),
        other => format!("{other}:{value}"),
    })
}

pub fn stable_class_name(input: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in input.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }

    format!("D{}", to_base36(hash))
}

/// Port của CSS.escape (CSSOM) — khớp escapeCssIdentifier của Node (xử lý chữ số đầu, '-' đơn...).
pub fn escape_css_identifier(input: &str) -> String {
    let mut chars = input.chars();
    let first = chars.next().unwrap_or('\0');
    let single = chars.next().is_none();
    let mut output = String::with_capacity(input.len() + 4);
    for (index, ch) in input.chars().enumerate() {
        let code = ch as u32;
        if code == 0 {
            output.push('\u{FFFD}');
            continue;
        }
        if (0x0001..=0x001f).contains(&code)
            || code == 0x007f
            || (index == 0 && ch.is_ascii_digit())
            || (index == 1 && ch.is_ascii_digit() && first == '-')
        {
            output.push('\\');
            output.push_str(&format!("{code:x} "));
            continue;
        }
        if index == 0 && single && ch == '-' {
            output.push('\\');
            output.push(ch);
            continue;
        }
        if code >= 0x0080 || ch == '-' || ch == '_' || ch.is_ascii_alphanumeric() {
            output.push(ch);
            continue;
        }
        output.push('\\');
        output.push(ch);
    }
    output
}

fn normalize_value(prop: &str, value: &str) -> Option<String> {
    let mut important = false;
    let mut value = value;

    if let Some(rest) = value.strip_prefix('!') {
        important = true;
        value = rest;
    }

    let mut normalized = if value.starts_with("--") {
        format!("var({value})")
    } else if value.len() >= 2 && value.starts_with('[') && value.ends_with(']') {
        // Giá trị tuỳ ý: `_` là khoảng trắng (khớp decodeArbitraryUnderscore của Node).
        decode_arbitrary_underscore(&value[1..value.len() - 1])
    } else if value.is_empty() {
        // Node: val rỗng không resolve được -> reject (KHÔNG có shorthand mặc định).
        String::new()
    } else {
        // Thứ tự khớp Node: mỗi lượt specific TRƯỚC common.
        // lượt 1 = lowercaseFirst(val), lượt 2 = toLowerCase(val).
        let lookup_key = lowercase_first(value);
        let lower = value.to_ascii_lowercase();
        specific_value(prop, &lookup_key)
            .or_else(|| common_value(&lookup_key))
            .or_else(|| specific_value(prop, &lower))
            .or_else(|| common_value(&lower))
            .map(|s| s.to_string())
            .unwrap_or_else(|| value.to_string())
    };

    normalized = replace_semicolons(&normalized);
    if normalized.is_empty() {
        return None;
    }

    // Sinh CSS không có CSS.supports: chặn giá trị có thể thoát khối rule hoặc thẻ <style>.
    if is_unsafe_text(&normalized) || !has_balanced_structure(&normalized) {
        return None;
    }

    if important {
        normalized.push_str(" !important");
    }

    Some(normalized)
}

fn is_known_property(prop: &str) -> bool {
    is_known_short_property(prop)
        || matches!(prop, "mx" | "my" | "px" | "py" | "bdx" | "bdy")
        || is_known_full_property(prop)
        || is_vendor_property_name(prop)
        || is_custom_property_name(prop)
}

/// `-webkit-line-clamp`, `-moz-...`, `-ms-...`, `-o-...` (khớp VENDOR_PREFIXED của Node).
fn is_vendor_property_name(name: &str) -> bool {
    let rest = ["-webkit-", "-moz-", "-ms-", "-o-"].iter().find_map(|p| name.strip_prefix(p));
    match rest {
        Some(rest) => {
            let mut bytes = rest.bytes();
            matches!(bytes.next(), Some(b'a'..=b'z'))
                && bytes.all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        }
        None => false,
    }
}

/// `--ten-bien` (khớp CUSTOM_PROPERTY của Node).
fn is_custom_property_name(name: &str) -> bool {
    name.len() > 2
        && name.starts_with("--")
        && name[2..].bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

/// `{`, `}`, `<`, `/*`: ký tự có thể thoát khỏi khối rule hoặc thẻ `<style>`.
fn is_unsafe_text(text: &str) -> bool {
    text.contains(['{', '}', '<']) || text.contains("/*")
}

/// Ngoặc `(` `[` đóng đúng, nháy đóng đủ, không có `\` ở cuối (khớp hasBalancedStructure).
fn has_balanced_structure(text: &str) -> bool {
    let chars: Vec<char> = text.chars().collect();
    let mut stack: Vec<char> = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        if ch == '\\' {
            if i + 1 >= chars.len() {
                return false;
            }
            i += 2;
            continue;
        }
        if ch == '"' || ch == '\'' {
            let mut j = i + 1;
            while j < chars.len() && chars[j] != ch {
                if chars[j] == '\\' {
                    j += 1;
                }
                j += 1;
            }
            if j >= chars.len() {
                return false;
            }
            i = j + 1;
            continue;
        }
        match ch {
            '(' | '[' => stack.push(ch),
            ')' => {
                if stack.pop() != Some('(') {
                    return false;
                }
            }
            ']' => {
                if stack.pop() != Some('[') {
                    return false;
                }
            }
            _ => {}
        }
        i += 1;
    }
    stack.is_empty()
}

/// `_` -> khoảng trắng trong giá trị tuỳ ý; `\_` giữ gạch dưới; chuỗi trong nháy,
/// `url(...)` và `attr(...)` giữ nguyên (khớp decodeArbitraryUnderscore của Node).
fn decode_arbitrary_underscore(input: &str) -> String {
    if !input.contains('_') {
        return input.to_string();
    }
    let chars: Vec<char> = input.chars().collect();
    let mut out = String::with_capacity(input.len());
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        if ch == '\\' && chars.get(i + 1) == Some(&'_') {
            out.push('_');
            i += 2;
            continue;
        }
        if ch == '"' || ch == '\'' {
            let mut j = i + 1;
            while j < chars.len() && chars[j] != ch {
                if chars[j] == '\\' {
                    j += 1;
                }
                j += 1;
            }
            let end = (j + 1).min(chars.len());
            out.extend(&chars[i..end]);
            i = end;
            continue;
        }
        let head: String = chars[i..(i + 5).min(chars.len())].iter().collect::<String>().to_ascii_lowercase();
        if head.starts_with("url(") || head.starts_with("attr(") {
            let end = chars[i..].iter().position(|&c| c == ')').map(|p| i + p + 1).unwrap_or(chars.len());
            out.extend(&chars[i..end]);
            i = end;
            continue;
        }
        out.push(if ch == '_' { ' ' } else { ch });
        i += 1;
    }
    out
}

/// Thay ';'/"';" trong value/selector y hệt regex `(';|;)` của Node:
/// "';" -> ';', ';' đơn -> khoảng trắng (một lượt duy nhất).
fn replace_semicolons(input: &str) -> String {
    if !input.contains(';') {
        return input.to_string();
    }
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\'' && chars.peek() == Some(&';') {
            chars.next();
            out.push(';');
        } else if ch == ';' {
            out.push(' ');
        } else {
            out.push(ch);
        }
    }
    out
}

/// Khớp isLikelyValidSelectorFallback của Node (chế độ không-DOM).
fn is_likely_valid_selector(selector: &str) -> bool {
    let text = selector.trim();
    if text.is_empty() {
        return true;
    }
    if is_unsafe_text(text) || !has_balanced_structure(text) {
        return false;
    }
    if matches!(text, "#" | "(" | ")" | "," | ">" | "+" | "~") {
        return false;
    }
    if text.starts_with('(') || text.starts_with(')') {
        return false;
    }
    let mut depth = 0i32;
    for ch in text.chars() {
        if ch == '(' {
            depth += 1;
        } else if ch == ')' {
            if depth == 0 {
                return false;
            }
            depth -= 1;
        }
    }
    depth == 0
}

/// Tách hậu tố selector: phần sau `@` cuối cùng nằm ngoài `[]`.
fn split_selector_suffix(input: &str) -> (&str, &str) {
    match find_last_at_outside_brackets(input, 0, input.len()) {
        Some(index) => (&input[..index], &input[index + 1..]),
        None => (input, ""),
    }
}

fn split_outside_brackets(input: &str, delimiter: u8) -> Vec<&str> {
    let mut parts = Vec::new();
    let mut depth = 0usize;
    let mut start = 0;
    for (index, byte) in input.bytes().enumerate() {
        match byte {
            b'[' => depth += 1,
            b']' => depth = depth.saturating_sub(1),
            b if b == delimiter && depth == 0 => {
                parts.push(&input[start..index]);
                start = index + 1;
            }
            _ => {}
        }
    }
    parts.push(&input[start..]);
    parts
}

fn find_first_colon_outside_brackets(input: &str, start: usize, end: usize) -> Option<usize> {
    let mut bracket_depth = 0usize;
    for index in start..end {
        match input.as_bytes()[index] {
            b'[' => bracket_depth += 1,
            b']' => bracket_depth = bracket_depth.saturating_sub(1),
            b':' if bracket_depth == 0 => return Some(index),
            _ => {}
        }
    }
    None
}

fn find_last_at_outside_brackets(input: &str, start: usize, end: usize) -> Option<usize> {
    let mut bracket_depth = 0usize;
    for index in (start..end).rev() {
        match input.as_bytes()[index] {
            b']' => bracket_depth += 1,
            b'[' => bracket_depth = bracket_depth.saturating_sub(1),
            b'@' if bracket_depth == 0 => return Some(index),
            _ => {}
        }
    }
    None
}

fn has_balanced_square_brackets(input: &str, start: usize, end: usize) -> bool {
    let mut bracket_depth = 0usize;
    for index in start..end {
        match input.as_bytes()[index] {
            b'[' => bracket_depth += 1,
            b']' => {
                if bracket_depth == 0 {
                    return false;
                }
                bracket_depth -= 1;
            }
            _ => {}
        }
    }
    bracket_depth == 0
}

fn scan_while(input: &str, mut start: usize, end: usize, predicate: impl Fn(u8) -> bool) -> usize {
    while start < end && predicate(input.as_bytes()[start]) {
        start += 1;
    }
    start
}

fn lowercase_first(input: &str) -> String {
    let mut chars = input.chars();
    let Some(first) = chars.next() else {
        return String::new();
    };
    first.to_lowercase().collect::<String>() + chars.as_str()
}

fn to_base36(mut value: u64) -> String {
    const DIGITS: &[u8; 36] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if value == 0 {
        return "0".to_string();
    }

    let mut out = Vec::new();
    while value > 0 {
        out.push(DIGITS[(value % 36) as usize]);
        value /= 36;
    }
    out.reverse();
    String::from_utf8(out).expect("base36 là ASCII")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_current_contract_vectors() {
        assert_eq!(
            parse_class_name("sm:3bgWhite"),
            Some(ParsedClass {
                mq: "sm".into(),
                layer: "3".into(),
                prop: "bg".into(),
                val: "White".into(),
                selector: "".into(),
            })
        );
        assert_eq!(
            parse_class_name("w[calc(100%;-;10px)]").unwrap().val,
            "[calc(100%;-;10px)]"
        );
        assert!(parse_class_name("&span").is_none());
        assert!(parse_class_name("w[calc(100%;-;10px)").is_none());
    }

    #[test]
    fn resolves_declarations() {
        assert_eq!(to_declarations("m", "10px").as_deref(), Some("margin:10px"));
        assert_eq!(to_declarations("d", "F").as_deref(), Some("display:flex"));
        assert_eq!(
            to_declarations("fxd", "C").as_deref(),
            Some("flex-direction:column")
        );
        assert_eq!(
            to_declarations("bgc", "--brand").as_deref(),
            Some("background-color:var(--brand)")
        );
        assert_eq!(
            to_declarations("c", "!#0a64e8").as_deref(),
            Some("color:#0a64e8 !important")
        );
        assert_eq!(
            to_declarations("w", "[calc(100%;-;10px)]").as_deref(),
            Some("width:calc(100% - 10px)")
        );
    }

    #[test]
    fn registry_returns_stable_classes_and_css() {
        let mut registry = XCoreRegistry::default();
        let classes = registry.clsx("dF aiC jcC p10px;16px bgc#0a64e8 cWhite");
        assert_eq!(classes.split_whitespace().count(), 6);

        let css = registry.css_text();
        assert!(css.contains("display:flex"));
        assert!(css.contains("align-items:center"));
        assert!(css.contains("justify-content:center"));
        assert!(css.contains("padding:10px 16px"));
        assert!(css.contains("background-color:#0a64e8"));
        assert!(css.contains("color:White"));
    }

    #[test]
    fn registry_respects_media_and_prefix() {
        let mut config = XCoreConfig::default();
        config.prefix = Some("fk-".into());
        config
            .breakpoints
            .push(bp("tablet", "screen and (min-width: 900px)"));

        let mut registry = XCoreRegistry::new(config);
        assert_eq!(registry.register_token("m10px"), "m10px");
        assert_ne!(
            registry.register_token("fk-tablet:m10px"),
            "fk-tablet:m10px"
        );
        assert_eq!(registry.register_token("fk-phone:m10px"), "fk-phone:m10px");
        assert!(registry
            .css_text()
            .contains("@media screen and (min-width: 900px)"));
    }

    #[test]
    fn css_text_declares_layer_order_and_orders_media_by_breakpoint() {
        let mut config = XCoreConfig::default();
        config.hash_class_name = false;
        let mut registry = XCoreRegistry::new(config);
        registry.clsx("2cRed cBlue xl:p1px sm:p2px md:5m0");
        let css = registry.css_text();

        assert!(css.starts_with(LAYER_ORDER_STATEMENT));
        assert!(css.contains("@layer l2{.\\32 cRed{color:Red}}"));
        assert!(css.contains("@layer l0{.cBlue{color:Blue}}"));
        // sm (576px) phải đứng trước md (768px) và xl (1200px), không theo bảng chữ cái.
        let sm = css.find("min-width: 576px").unwrap();
        let md = css.find("min-width: 768px").unwrap();
        let xl = css.find("min-width: 1200px").unwrap();
        assert!(sm < md && md < xl, "{css}");
        assert!(css.contains("@media screen and (min-width: 768px){@layer l5{.md\\:5m0{margin:0}}}"));
    }

    #[test]
    fn custom_breakpoint_override_keeps_last_position() {
        let mut config = XCoreConfig::default();
        config.hash_class_name = false;
        config.breakpoints.push(bp("sm", "screen and (min-width: 600px)"));
        let mut registry = XCoreRegistry::new(config);
        registry.clsx("sm:p1px lg:p2px");
        let css = registry.css_text();
        assert!(css.find("min-width: 992px").unwrap() < css.find("min-width: 600px").unwrap());
        assert!(!css.contains("576px"));
    }

    #[test]
    fn memo_and_css_cache_are_consistent() {
        let mut registry = XCoreRegistry::default();
        let first = registry.clsx("dF aiC bogus-x");
        let css_a = registry.css_text();
        assert_eq!(registry.clsx("dF aiC bogus-x"), first);
        assert_eq!(registry.css_text(), css_a);
        registry.clsx("p4px");
        let css_b = registry.css_text();
        assert_ne!(css_a, css_b);
        assert!(css_b.contains("padding:4px"));
        assert_eq!(registry.rules().count(), 3);
    }

    #[test]
    fn chains_open_vocabulary_and_unsafe_values() {
        let mut config = XCoreConfig::default();
        config.hash_class_name = false;
        let mut registry = XCoreRegistry::new(config);
        assert_eq!(registry.clsx("md:dF&aiC@:hover"), "md:dF&aiC@:hover");
        assert_eq!(registry.clsx("content-visibility[auto] --brand[#fff] m-.5rem w[calc(100%_-_1rem)]").split(' ').count(), 4);
        let css = registry.css_text();
        assert!(css.contains("display:flex;align-items:center"));
        assert!(css.contains("content-visibility:auto"));
        assert!(css.contains("--brand:#fff"));
        assert!(css.contains("margin:-.5rem"));
        assert!(css.contains("width:calc(100% - 1rem)"));

        let before = registry.css_text();
        registry.clsx("c[red}body{color:blue] content[\"a] cRed@:is(a dF&md:aiC");
        assert_eq!(registry.css_text(), before);
    }

    #[test]
    fn registry_can_preserve_raw_class_names() {
        let mut config = XCoreConfig::default();
        config.hash_class_name = false;
        config
            .breakpoints
            .push(bp("tablet", "screen and (min-width: 900px)"));

        let mut registry = XCoreRegistry::new(config);
        assert_eq!(
            registry.clsx("m10px dF@:hover tablet:p8px"),
            "m10px dF@:hover tablet:p8px"
        );

        let css = registry.css_text();
        assert!(css.contains(".m10px{margin:10px}"));
        assert!(css.contains(".dF\\@\\:hover:hover{display:flex}"));
        assert!(css.contains("@media screen and (min-width: 900px)"));
        assert!(css.contains(".tablet\\:p8px{padding:8px}"));
        assert!(!css.contains(".D"));
    }
}
