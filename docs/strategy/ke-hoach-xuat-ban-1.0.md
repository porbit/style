# Phương Án Tối Ưu Và Xuất Bản 1.0

Mục tiêu: đóng các điểm còn thua Tailwind (mục 13.4 của [đánh giá](./danh-gia-va-dinh-huong.md)), xuất bản bản 1.0 lên npm, và công bố một bản đánh giá mà **mọi con số đều chạy lại được**.

## 1. Hiện Trạng Trước Khi Làm (0.10.0)

| Hạn chế | Số đo | Ảnh hưởng tới người dùng |
| :--- | :--- | :--- |
| Gói npm nặng | 1,8 MB nén / **6,8 MB giải nén** (tailwindcss 4.3.5: 0,79 MB) — mỗi entry Node chép lại dữ liệu Tailwind | Cài chậm, "nặng gấp 8 lần Tailwind" là điểm trừ đầu tiên khi so sánh |
| Bản npm cũ | npm có **0.4.0**, mã nguồn đã là 0.10.0 | Người dùng thử hôm nay không có PostCSS, merge, Prettier, LSP |
| Plugin JS tuỳ ý | Chỉ 3 plugin đóng gói sẵn | Dự án dùng plugin riêng chưa chuyển được |
| Cấu hình v3 | `prefix`, `important`, `corePlugins`, file `.ts` chưa hỗ trợ | Một phần dự án v3 chưa chuyển được |
| Runtime chèn nhiều phần tử | 77–110 ms so với 70–83 ms của Tailwind (2.000 phần tử) | Điểm duy nhất runtime chậm hơn |
| Bản CDN | 62,9 KB gzip (Tailwind 75,3 KB) | Nhẹ hơn nhưng chưa "vượt hẳn" |
| Bộ đo dự án thật | 1 dự án v4 + 2 cấu hình v3; chưa ép `:hover`/`:focus`, một độ rộng | Bằng chứng còn mỏng để công bố |

## 2. Phân Công Song Song

Sáu luồng việc độc lập, mỗi luồng giữ nhóm file riêng (git worktree riêng), gộp vào `beta/xuat-ban-1.0`:

| Luồng | Việc | Mục tiêu đo được |
| :--- | :--- | :--- |
| A — đóng gói | Tách cấu hình build: entry trình duyệt tự chứa, entry Node dùng chung chunk; kiểm mọi `exports` bằng `require`/`import` | ≤ 1,5 MB giải nén; bước `package` trong `check:all` |
| B — plugin JS | API giả lập `addUtilities`/`matchUtilities`/`addVariant`/`matchVariant`/`addBase`/`theme()`, chạy plugin JS mà không cần cài `tailwindcss` | ≥ 99% class khớp trên các plugin phổ biến (`eval/tailwind-js-plugins.mjs`) |
| C — cấu hình v3 | `prefix`, `important`, `corePlugins`, cấu hình `.ts`, mô phỏng đúng `@config` của Tailwind v4 | Fixture v3 mới khớp 100% mọi trạng thái |
| D — runtime | Gom rule của một lượt mutation rồi chèn theo thứ tự; bench lặp lại được | Chèn 2.000 phần tử ≤ Tailwind (trung vị), `eval/runtime-bench.mjs` |
| E — CDN | Mã hoá dữ liệu gọn hơn, bỏ dữ liệu chỉ dùng cho công cụ, đo phân rã | ≤ 55 KB gzip nếu giữ khớp 100% |
| F — bằng chứng | Ép `:hover`/`:focus`/`:active`, nhiều độ rộng; thêm 2–3 dự án mã nguồn mở viết bằng Tailwind v4 | `eval/REAL-PROJECTS.md` tổng hợp |

Tích hợp: gộp từng nhánh, chạy `node scripts/check-all.cjs` đầy đủ sau mỗi lần gộp, thêm fixture mới của C và F vào bước `tailwind`.

## 3. Cổng Phát Hành 1.0

Chỉ xuất bản khi **tất cả** đạt (tự động bằng `npm run check:all`, `prepublishOnly` đã gọi):

1. `typecheck`, `unit`, `build`, `generated`, `rust`, `browser`, `eval` như hiện tại.
2. `tailwind`: 100% class/biến thể/runtime/theme/thứ tự, plugin đóng gói và plugin JS, shadcn/ui và mọi dự án mới (mọi trạng thái, mọi độ rộng, tổ hợp, PostCSS), cấu hình v3, Prettier giống hệt, gộp class 100%.
3. `size`: bản CDN, lõi, ngân sách mới của luồng E.
4. `package`: dung lượng giải nén ≤ ngân sách của luồng A; smoke test mọi `exports`.
5. Next.js thật (`bash eval/next-parity.sh`): 0 khác biệt — chạy tay trước khi phát hành vì cần mạng.

## 4. Quy Trình Xuất Bản

| Bước | Việc |
| :--- | :--- |
| 1 | Gộp `beta/xuat-ban-1.0` vào `main` sau khi cổng đạt |
| 2 | Nâng `version` lên `1.0.0`, CHANGELOG có mục "Chuyển từ Tailwind" (một dòng PostCSS, `cn`, Prettier, LSP) |
| 3 | `npm pack` rồi cài thử tarball vào ứng dụng Next.js/Vite mẫu (script `eval/next-parity.sh` đã làm việc này) |
| 4 | `npm publish --access public` (cần quyền npm của chủ gói; có thể kèm `--provenance` nếu xuất bản từ CI có OIDC) |
| 5 | Tag `v1.0.0`, GitHub Release đính kèm `eval/*.json` và báo cáo đánh giá |
| 6 | Kiểm `npm view @porbit/style version`, cài `npx @porbit/style@1.0.0 init --tailwind` trên máy sạch |

## 5. Bản Đánh Giá Công Bố

Nguyên tắc để bản đánh giá đứng vững khi người khác kiểm lại:

- **Chạy lại được:** mỗi con số trỏ tới một script trong `eval/` và một file JSON kết quả; ghi phiên bản Tailwind, Chromium, máy đo.
- **Chuẩn là Tailwind thật**, không phải mô tả: so computed style trên Chromium, ép trạng thái, nhiều độ rộng.
- **Dự án của người khác**, không chỉ fixture tự viết: shadcn/ui và các dự án mã nguồn mở của luồng F.
- **Ghi cả chỗ thua**: plugin chưa chạy, tuỳ chọn v3 chưa có, phép đo nào Tailwind nhanh hơn.

Cấu trúc bản đánh giá (sau tích hợp):

1. Tóm tắt một bảng: Ngang / Vượt / Thua theo từng trục.
2. Độ khớp hiển thị (class, biến thể, plugin, dự án thật, v3, Next.js).
3. Hiệu năng (CDN, runtime tải ban đầu và chèn phần tử, build, CSS ra, dung lượng gói).
4. Hệ sinh thái (PostCSS/Vite/CLI, merge, Prettier, LSP, class động).
5. Chỗ còn thua và kế hoạch.
6. Cách chạy lại toàn bộ.
