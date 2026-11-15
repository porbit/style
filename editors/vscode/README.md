# PresenceStyle cho VS Code

Hỗ trợ viết class `@porbit/style` (x-css) trong HTML, JSX/TSX, Vue, Svelte, Astro:

- Gạch vàng class không sinh CSS, kèm **quick fix** (`df` → `dF`, `fz14px` → `fns14px`, `hover:cRed` → `cRed@:hover`).
- Gạch xanh nhóm class **xung đột** (cùng property, cùng layer).
- **Hover** hiện CSS sinh ra và cách engine tách class (media, layer, property, value, selector).
- **Gợi ý** alias property và value khi gõ trong thuộc tính `class`/`className`.
- Lệnh **PresenceStyle: Sắp xếp class trong file**.

Đọc `presence-style.config.json` ở gốc workspace để nhận breakpoints, theme, aliases tuỳ chỉnh.

## Cài từ mã nguồn

```bash
cd editors/vscode
npm install
npx @vscode/vsce package
code --install-extension presence-style-vscode-0.1.0.vsix
```

Chỉ kiểm tra thuộc tính class tĩnh (`class="..."`, `className="..."`, `className={'...'}`); biểu thức động được bỏ qua.
