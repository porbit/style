//! Đọc class từ stdin, in CSS (không hash). Dùng để so sánh hiển thị với engine Node.
use presence_style_core::{XCoreConfig, XCoreRegistry};
use std::io::Read;

fn main() {
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input).expect("đọc stdin");
    let mut config = XCoreConfig::default();
    config.hash_class_name = false;
    let mut registry = XCoreRegistry::new(config);
    registry.clsx(&input);
    print!("{}", registry.css_text());
}
