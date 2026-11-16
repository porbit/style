# Thay đổi

## 0.2.0

- Viết lại thành client LSP (`vscode-languageclient`) của `presence-style lsp`: mọi tính năng do language server của `@porbit/style` cung cấp, dùng chung với Neovim, Zed, Helix.
- Ưu tiên `@porbit/style` cài trong dự án, không có thì dùng server đóng gói kèm extension; chọn bằng `presenceStyle.server`/`presenceStyle.serverPath`.
- Gợi ý class Tailwind v4 (cả `@theme`/`@utility` của dự án) và biến thể, ô màu (`documentColor`), CSS khi chọn mục gợi ý, hover trong `cn()`/`clsx()`/`cva()` và hàm ở `presenceStyle.tailwindFunctions`.
- Thiết lập mới: `languages`, `tailwindFunctions`, `tailwindStylesheet`, `server`, `serverPath`, `nodePath`, `trace.server`. Lệnh mới: khởi động lại server, mở nhật ký.
- Mỗi thư mục của workspace nhiều gốc có một server riêng.
- Không chạy trong workspace chưa tin cậy.

## 0.1.0

- Bản đầu (không dùng LSP): gạch lỗi class x-css, quick fix, hover, gợi ý alias, sắp xếp class.
