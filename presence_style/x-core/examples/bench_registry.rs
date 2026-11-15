//! Đo nhanh: cargo run --release -p presence-style-core --example bench_registry
use presence_style_core::{XCoreConfig, XCoreRegistry};
use std::time::Instant;

fn main() {
    let base = "dF aiC jcSp p12px;16px bdN bgcWhite bdra8px c#111827 fns14px tran0.2s opc0.8@:hover md:dG md:gtc[repeat(3,1fr)] lg:p24px cRed@:hover w100% h40px 2bgc#0a64e8";
    let mut lines = Vec::new();
    for i in 0..3000 {
        lines.push(format!("{base} w{}px mt{}px", i % 200, i % 50));
    }
    for hash in [true, false] {
        let mut config = XCoreConfig::default();
        config.hash_class_name = hash;
        let mut registry = XCoreRegistry::new(config);
        let t0 = Instant::now();
        for line in &lines {
            registry.clsx(line);
        }
        let first = t0.elapsed();
        let t1 = Instant::now();
        for _ in 0..20 {
            for line in &lines {
                registry.clsx(line);
            }
        }
        let repeat = t1.elapsed();
        let t2 = Instant::now();
        let mut total = 0;
        for _ in 0..200 {
            total += registry.css_text().len();
        }
        let css = t2.elapsed();
        println!(
            "hash={hash}: clsx 3000 dòng lần đầu {:?}; lặp 20x {:?}; css_text x200 {:?} ({} byte)",
            first, repeat, css, total / 200
        );
    }
}
