import { describe, expect, it } from 'vitest'
import { minifyCss } from '../src/minify'

// Kết quả kỳ vọng lấy từ bản minifyCss trước khi tối ưu (duyệt từng ký tự, regex cho từng @property): bản mới phải
// cho đúng từng byte, kể cả với chuỗi trích dẫn chứa ngoặc, escape và chuỗi không đóng.
const CASES: Array<[string, string]> = [
    ["@layer l1{.a{content:\"}\"}}@layer l1{.b{content:'{'}}", "@layer l1{.a{content:\"}\"}.b{content:'{'}}"],
    ['@layer l0{.a{content:"\\"}"}}  @layer l0{.b{color:red}}', '@layer l0{.a{content:"\\"}"}.b{color:red}}'],
    ['@media (x){@layer l2{.a{b:c}}@layer l2{.d{e:f}}}', '@media (x){@layer l2{.a{b:c}.d{e:f}}}'],
    ['@supports (y:url("a;b{")){@layer l1{.a{b:c}}}', '@supports (y:url("a;b{")){@layer l1{.a{b:c}}}'],
    ['@layer l1{.a{content:"unterminated}}', '@layer l1{.a{content:"unterminated}}'],
    ['@layer l1{.a{content:"x\\', '@layer l1{.a{content:"x\\}}'],
    ['@property --tw-a{syntax:"*"}@property --tw-b{syntax:"*"}@layer l0{.a{x:var(--tw-b)}}', '@property --tw-b{syntax:"*"}@layer l0{.a{x:var(--tw-b)}}'],
    [
        '*, ::before, ::after, ::backdrop{--tw-a:0;--tw-b:1}@property --tw-a{syntax:"*"}@property --tw-b{syntax:"*"}@layer l0{.a{x:var(--x--tw-b)}}',
        '*, ::before, ::after, ::backdrop{--tw-b:1}@property --tw-b{syntax:"*"}@layer l0{.a{x:var(--x--tw-b)}}',
    ],
    ['@keyframes spin{to{rotate:1turn}}@keyframes ping{}@layer l0{.a{animation:spin 1s}}', '@keyframes spin{to{rotate:1turn}}@layer l0{.a{animation:spin 1s}}'],
    ['  @import "x;y";\n@layer l1 { .a { b: c } }\n', '@import "x;y";@layer l1{.a{b: c}}'],
]

describe('minifyCss', () => {
    it.each(CASES)('giữ nguyên kết quả: %s', (input, output) => {
        expect(minifyCss(input)).toBe(output)
    })
})
