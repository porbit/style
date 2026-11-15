//! Kiểm chứng engine Rust khớp "ground truth" sinh từ engine Node.
//! Dữ liệu: tests/conformance.core.json (do `npm run gen:spec` ở repo Node sinh ra).
//! So khớp theo tuple ngữ nghĩa {accepted, media, layer, selector, declarations} — KHÔNG so tên class.

use presence_style_core::XCoreRegistry;
use std::fs;

fn run_rust(input: &str) -> (bool, String, u8, String, String) {
    let mut reg = XCoreRegistry::default();
    reg.register_token(input);
    let captured = reg.rules().next().map(|rule| {
        (
            rule.media.clone(),
            rule.layer,
            rule.selector.clone(),
            rule.declarations.clone(),
        )
    });
    match captured {
        Some((media, layer, sel, decl)) => (true, media, layer, sel, decl),
        None => (false, String::new(), 0, String::new(), String::new()),
    }
}

#[test]
fn matches_node_ground_truth() {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/conformance.core.json");
    let raw = fs::read_to_string(path).expect("read conformance.core.json");
    let cases: serde_json::Value = serde_json::from_str(&raw).expect("parse json");
    let arr = cases.as_array().expect("array");
    // Chống pass rỗng: corpus phải đủ lớn (đồng bộ với scripts/gen-spec.cjs).
    assert!(arr.len() > 1000, "corpus quá nhỏ ({}) — kiểm tra gen-spec", arr.len());
    let accepted_count = arr.iter().filter(|c| c["accepted"].as_bool() == Some(true)).count();
    assert!(accepted_count > 500, "quá ít case accepted ({accepted_count})");

    let mut mismatches: Vec<String> = Vec::new();
    for case in arr {
        let input = case["input"].as_str().unwrap();
        let accepted = case["accepted"].as_bool().unwrap();
        let (r_acc, r_media, r_layer, r_sel, r_decl) = run_rust(input);

        if r_acc != accepted {
            mismatches.push(format!("{input:?}: accepted node={accepted} rust={r_acc}"));
            continue;
        }
        if !accepted {
            continue;
        }
        let media = case["media"].as_str().unwrap_or("");
        let layer = case["layer"].as_u64().unwrap_or(0) as u8;
        let sel = case["selector"].as_str().unwrap_or("");
        let decl = case["declarations"].as_str().unwrap_or("");

        if r_media != media || r_layer != layer || r_sel != sel || r_decl != decl {
            mismatches.push(format!(
                "{input:?}: node{{media:{media:?},layer:{layer},sel:{sel:?},decl:{decl:?}}} \
                 rust{{media:{r_media:?},layer:{r_layer},sel:{r_sel:?},decl:{r_decl:?}}}"
            ));
        }
    }

    if !mismatches.is_empty() {
        eprintln!("MISMATCHES: {} / {}", mismatches.len(), arr.len());
        for m in mismatches.iter().take(40) {
            eprintln!("  {m}");
        }
    }
    assert!(mismatches.is_empty(), "{} mismatches", mismatches.len());
}
