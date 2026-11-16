#!/usr/bin/env node
/**
 * Dựng bộ quét theo byte (wasm/scan/lib.rs, Rust -> WASM) và nhúng vào src/scan-wasm-generated.ts (base64).
 *
 *   node scripts/gen-scan-wasm.mjs           # dựng lại + ghi file sinh
 *   node scripts/gen-scan-wasm.mjs --check   # dựng lại, so với file sinh hiện có (mã thoát 1 nếu khác)
 *
 * Cần `cargo` và target `wasm32-unknown-unknown` (`rustup target add wasm32-unknown-unknown`). Bản dựng phụ thuộc
 * phiên bản rustc: khác phiên bản có thể ra byte khác mà vẫn cùng hành vi (test so với extractCandidates).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const crate = path.join(root, 'wasm/scan')
const out = path.join(root, 'src/scan-wasm-generated.ts')
const check = process.argv.includes('--check')

const build = spawnSync('cargo', ['build', '--release', '-q'], { cwd: crate, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)
const wasm = fs.readFileSync(path.join(crate, 'target/wasm32-unknown-unknown/release/presence_style_scan_wasm.wasm'))
const content = [
    '// File sinh tự động bởi scripts/gen-scan-wasm.mjs từ wasm/scan/lib.rs — không sửa tay.',
    `// Bộ quét class ứng viên theo byte (WASM, ${wasm.length} byte), xem src/scan-wasm.ts.`,
    `export const SCAN_WASM = '${wasm.toString('base64')}'`,
    '',
].join('\n')
if (check) {
    const same = fs.existsSync(out) && fs.readFileSync(out, 'utf8') === content
    console.log(same ? `scan wasm khớp (${wasm.length} byte)` : 'scan wasm KHÁC file sinh (chạy node scripts/gen-scan-wasm.mjs)')
    process.exit(same ? 0 : 1)
}
fs.writeFileSync(out, content)
console.log(`Đã ghi ${path.relative(root, out)} (${wasm.length} byte WASM)`)
