use presence_style_core::{XCoreConfig, XCoreRegistry};
fn main() {
    let mut c = XCoreConfig::default();
    c.hash_class_name = false;
    let mut r = XCoreRegistry::new(c);
    r.clsx("2cRed cBlue xl:p1px sm:p2px md:5m0");
    println!("{}", r.css_text());
}
