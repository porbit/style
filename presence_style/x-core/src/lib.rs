use std::collections::BTreeMap;

mod dictionary_generated;
use dictionary_generated::{
    common_value, is_known_full_property, is_known_short_property, property_name, specific_value,
};

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

#[derive(Debug, Clone)]
pub struct XCoreRegistry {
    config: XCoreConfig,
    rules: BTreeMap<String, CssRule>,
}

impl Default for XCoreRegistry {
    fn default() -> Self {
        Self::new(XCoreConfig::default())
    }
}

impl XCoreRegistry {
    pub fn new(config: XCoreConfig) -> Self {
        Self {
            config,
            rules: BTreeMap::new(),
        }
    }

    pub fn clsx(&mut self, input: impl AsRef<str>) -> String {
        input
            .as_ref()
            .split_whitespace()
            .map(|token| self.register_token(token))
            .collect::<Vec<_>>()
            .join(" ")
    }

    pub fn register_token(&mut self, token: &str) -> String {
        let parse_target = match self.strip_prefix(token) {
            Some(value) => value,
            None => return token.to_string(),
        };

        let Some(parsed) = parse_class_name(parse_target) else {
            return token.to_string();
        };

        if parsed.prop.starts_with('[') {
            return token.to_string();
        }

        let Some(media_query) = self.resolve_media(&parsed.mq) else {
            return token.to_string();
        };

        // Gating "known property" (khớp isKnownPropertyKey của Node khi dictionary bật).
        if !is_known_property(&parsed.prop) {
            return token.to_string();
        }

        let Some(declarations) = to_declarations(&parsed.prop, &parsed.val) else {
            return token.to_string();
        };

        // Selector: thay ';'/"';" rồi validate (khớp isLikelyValidSelectorFallback ở chế độ không-DOM).
        let selector = replace_semicolons(&parsed.selector);
        if !is_likely_valid_selector(&selector) {
            return token.to_string();
        }

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

        self.rules.entry(class_name.clone()).or_insert(CssRule {
            class_name: class_name.clone(),
            media: media_query,
            layer: parsed.layer.parse::<u8>().unwrap_or(0),
            selector,
            declarations,
        });

        output_class_name
    }

    pub fn css_text(&self) -> String {
        let mut direct = Vec::new();
        let mut by_media: BTreeMap<&str, Vec<&CssRule>> = BTreeMap::new();

        for rule in self.rules.values() {
            if rule.media.is_empty() {
                direct.push(rule);
            } else {
                by_media.entry(&rule.media).or_default().push(rule);
            }
        }

        direct.sort_by_key(|rule| rule.layer);
        let mut output = direct
            .iter()
            .map(|rule| rule_to_css(rule))
            .collect::<Vec<_>>();

        for (media, mut rules) in by_media {
            rules.sort_by_key(|rule| rule.layer);
            let body = rules
                .iter()
                .map(|rule| rule_to_css(rule))
                .collect::<Vec<_>>()
                .join("");
            output.push(format!("@media {media}{{{body}}}"));
        }

        output.join("")
    }

    pub fn rules(&self) -> impl Iterator<Item = &CssRule> {
        self.rules.values()
    }

    fn strip_prefix<'a>(&self, token: &'a str) -> Option<&'a str> {
        match &self.config.prefix {
            Some(prefix) => token.strip_prefix(prefix),
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

    if start >= end || class_name.as_bytes()[start] == b'&' {
        return None;
    }

    if class_name.as_bytes()[start] == b'[' {
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

    let mut prop_end = start;
    while prop_end < end {
        let byte = class_name.as_bytes()[prop_end];
        if byte == b'-' || byte == b'.' {
            if prop_end + 1 < end {
                let next = class_name.as_bytes()[prop_end + 1];
                if byte == b'-' && next == b'-' && prop_end > start {
                    break;
                }
                if next.is_ascii_digit() {
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

    let declarations = match property_name {
        "mx" => vec![
            format!("margin-left:{value}"),
            format!("margin-right:{value}"),
        ],
        "my" => vec![
            format!("margin-top:{value}"),
            format!("margin-bottom:{value}"),
        ],
        "px" => vec![
            format!("padding-left:{value}"),
            format!("padding-right:{value}"),
        ],
        "py" => vec![
            format!("padding-top:{value}"),
            format!("padding-bottom:{value}"),
        ],
        "bdx" => vec![
            format!("border-left:{value}"),
            format!("border-right:{value}"),
        ],
        "bdy" => vec![
            format!("border-top:{value}"),
            format!("border-bottom:{value}"),
        ],
        other => vec![format!("{other}:{value}")],
    };

    Some(declarations.join(";"))
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
    let chars: Vec<char> = input.chars().collect();
    let len = chars.len();
    let first = chars.first().copied().unwrap_or('\0');
    let mut output = String::with_capacity(input.len());
    for (index, &ch) in chars.iter().enumerate() {
        let code = ch as u32;
        if code == 0 {
            output.push('\u{FFFD}');
            continue;
        }
        if (0x0001..=0x001f).contains(&code)
            || code == 0x007f
            || (index == 0 && (0x30..=0x39).contains(&code))
            || (index == 1 && (0x30..=0x39).contains(&code) && first == '-')
        {
            output.push('\\');
            output.push_str(&format!("{code:x} "));
            continue;
        }
        if index == 0 && len == 1 && ch == '-' {
            output.push('\\');
            output.push(ch);
            continue;
        }
        if code >= 0x0080
            || ch == '-'
            || ch == '_'
            || (0x30..=0x39).contains(&code)
            || (0x41..=0x5a).contains(&code)
            || (0x61..=0x7a).contains(&code)
        {
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
    } else if value.starts_with('[') && value.ends_with(']') {
        value[1..value.len() - 1].to_string()
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

    if important {
        normalized.push_str(" !important");
    }

    Some(normalized)
}

fn is_known_property(prop: &str) -> bool {
    is_known_short_property(prop)
        || matches!(prop, "mx" | "my" | "px" | "py" | "bdx" | "bdy")
        || is_known_full_property(prop)
}

/// Thay ';'/"';" trong value/selector y hệt regex `(';|;)` của Node:
/// "';" -> ';', ';' đơn -> khoảng trắng (một lượt duy nhất).
fn replace_semicolons(input: &str) -> String {
    let chars: Vec<char> = input.chars().collect();
    let mut out = String::with_capacity(input.len());
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '\'' && i + 1 < chars.len() && chars[i + 1] == ';' {
            out.push(';');
            i += 2;
        } else if chars[i] == ';' {
            out.push(' ');
            i += 1;
        } else {
            out.push(chars[i]);
            i += 1;
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
    if text.contains('{') || text.contains('}') {
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

fn rule_to_css(rule: &CssRule) -> String {
    format!(
        ".{}{}{{{}}}",
        rule.class_name, rule.selector, rule.declarations
    )
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
        out.push(DIGITS[(value % 36) as usize] as char);
        value /= 36;
    }
    out.iter().rev().collect()
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
