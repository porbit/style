/*
 * Codegen: spec/dictionary.json -> x-core/src/dictionary_generated.rs
 *
 * Sinh dictionary Rust TỪ dictionary canonical của Node (single source of truth),
 * loại bỏ mọi sai lệch chép tay. KHÔNG sửa file này bằng tay — chạy lại:
 *   node scripts/gen-spec.cjs && node scripts/gen-rust-dict.cjs
 */
const fs = require('fs')
const path = require('path')

const dict = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'spec', 'dictionary.json'), 'utf8'),
)

const OUT = process.argv[2] || process.env.PRESENCE_STYLE_RUST_DICT_OUT
if (!OUT) {
    console.log('[gen-rust-dict] bỏ qua: chưa chỉ định đường dẫn đầu ra (đối số thứ nhất hoặc biến PRESENCE_STYLE_RUST_DICT_OUT).')
    process.exit(0)
}

// Escape một string thành Rust string literal (giữ trong "...").
const rs = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'

const { SHORT_PROPERTIES, COMMON_VALUES, SPECIFIC_VALUES } = dict

const shortKeys = Object.keys(SHORT_PROPERTIES).sort()
const commonKeys = Object.keys(COMMON_VALUES).sort()
const specProps = Object.keys(SPECIFIC_VALUES).sort()

let out = ''
out += '// @generated từ spec/dictionary.json bởi scripts/gen-rust-dict.cjs — KHÔNG sửa tay.\n'
out += '// Nguồn chân lý: PresenceNodejs/PresenceStyle/src/dictionary.ts\n\n'

// property_name: viết tắt -> tên CSS đầy đủ (mặc định trả về chính prop).
out += '/// Map prop viết tắt -> tên CSS đầy đủ. Không khớp -> trả về chính `prop`.\n'
out += 'pub fn property_name(prop: &str) -> &str {\n    match prop {\n'
for (const k of shortKeys) {
    out += `        ${rs(k)} => ${rs(SHORT_PROPERTIES[k])},\n`
}
out += '        other => other,\n    }\n}\n\n'

// common_value
out += '/// COMMON_VALUES: value alias dùng chung mọi property.\n'
out += 'pub fn common_value(key: &str) -> Option<&\'static str> {\n    match key {\n'
for (const k of commonKeys) {
    out += `        ${rs(k)} => Some(${rs(COMMON_VALUES[k])}),\n`
}
out += '        _ => None,\n    }\n}\n\n'

// specific_value(prop, key)
out += '/// SPECIFIC_VALUES: value alias riêng theo từng property.\n'
out += 'pub fn specific_value(prop: &str, key: &str) -> Option<&\'static str> {\n    match prop {\n'
for (const p of specProps) {
    const table = SPECIFIC_VALUES[p]
    if (!table || typeof table !== 'object') continue
    const keys = Object.keys(table).sort()
    if (keys.length === 0) continue
    out += `        ${rs(p)} => match key {\n`
    for (const k of keys) {
        out += `            ${rs(k)} => Some(${rs(table[k])}),\n`
    }
    out += '            _ => None,\n        },\n'
}
out += '        _ => None,\n    }\n}\n\n'

// is_known_short_property: prop là key trong SHORT_PROPERTIES.
out += '/// True nếu `prop` là key viết tắt đã biết trong SHORT_PROPERTIES.\n'
out += 'pub fn is_known_short_property(prop: &str) -> bool {\n    matches!(prop,\n'
out += '        ' + shortKeys.map(rs).join(' | ') + '\n'
out += '    )\n}\n\n'

// is_known_full_property: name là một tên CSS đầy đủ (giá trị của SHORT_PROPERTIES).
const fullNames = [...new Set(Object.values(SHORT_PROPERTIES))].sort()
out += '/// True nếu `name` là tên CSS đầy đủ (giá trị trong SHORT_PROPERTIES), vd "margin-top".\n'
out += 'pub fn is_known_full_property(name: &str) -> bool {\n    matches!(name,\n'
out += '        ' + fullNames.map(rs).join(' | ') + '\n'
out += '    )\n}\n'

fs.writeFileSync(OUT, out)
console.log(
    `[gen-rust-dict] -> ${OUT}\n` +
    `  short=${shortKeys.length} common=${commonKeys.length} specific-props=${specProps.length} full-names=${fullNames.length}`,
)
