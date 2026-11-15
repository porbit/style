# Bộ Đánh Giá

Đo hai câu hỏi: (1) class do agent viết có sinh CSS thật không, (2) `fix_classes` sửa được bao nhiêu lỗi hay gặp.

```bash
npm run build
node eval/score.cjs
```

Nếu Playwright chưa tải trình duyệt: `CHROMIUM_PATH=/đường/dẫn/chrome node eval/score.cjs`. Kết quả ghi vào [RESULTS.md](./RESULTS.md).

## Thành Phần

| File | Nội dung |
| :--- | :--- |
| `tasks.json` | 8 nhiệm vụ giao diện (đăng nhập, navbar, bảng giá, hero, bảng, modal, lưới thẻ, form) |
| `runs/<lượt>/*.html` | Một lượt viết cho mọi nhiệm vụ. Lượt có tên bắt đầu bằng `tailwind` được chấm với phương ngữ Tailwind |
| `mistakes.json` | 38 lỗi hay gặp, **đã dùng để chỉnh** bộ sửa |
| `mistakes-tuning-v1.json` | 21 lỗi, ban đầu là tập độc lập (đạt 8/21), sau đó **đã dùng để chỉnh** |
| `mistakes-holdout.json` | 20 lỗi viết sau cùng, **không dùng để chỉnh**: đây là con số nên tin |

Một class được coi là hợp lệ khi engine sinh được CSS trên Chromium thật (có `CSS.supports`, nên giá trị sai như `w100p` bị loại). Một bản sửa được coi là đúng khi sinh cùng declaration với đáp án (không phân biệt hoa thường), vì nhiều cách viết x-css cho cùng một CSS.

## Kết Quả Chính (0.7.0)

| Chỉ số | Kết quả |
| :--- | :--- |
| x-css do agent viết, không tra công cụ | 99,1% class hợp lệ (4/452 lỗi: tự đoán alias `bdf`, `fvn`, `wbo`, giá trị `dBox`) |
| Sau `fix_classes` | 99,8% (còn `dBox`: `display:-webkit-box` không suy ra được) |
| Tailwind qua phương ngữ runtime | 98,6% trước khi bổ sung `ring`, `accent`, `tabular-nums`, `border-collapse`; 100% sau đó |
| `fix_classes` trên tập độc lập v2 | **18/20 (90%) ở lần chạy đầu**; 19/20 sau khi sửa lỗi `dinlineblock` → `dInlineblock` (sinh CSS sai) |
| `fix_classes` trên tập v1 trước khi chỉnh | 8/21 (38%): bộ sửa ban đầu khái quát kém |

## Giới Hạn (Đọc Trước Khi Trích Dẫn)

1. **Một agent, một lượt.** Hai lượt viết trong `runs/` do cùng một agent (đã đọc toàn bộ mã nguồn và tài liệu trong phiên làm việc) viết. Agent chưa từng thấy x-css sẽ có tỉ lệ lỗi cao hơn nhiều; con số 99% không đại diện cho "AI nói chung".
2. **Lượt Tailwind cũng do agent đó viết**, nên phần thiếu của bộ chuyển phản ánh thói quen của một người viết, không phải toàn bộ Tailwind.
3. **Tập lỗi do người chỉnh bộ sửa tự viết.** Tập độc lập v2 giảm thiên lệch nhưng không loại bỏ được: người viết đáp án biết bộ sửa hoạt động thế nào.
4. **Rủi ro đã biết**: `opacity-50` hợp lệ trong x-css (`opacity: -50`, hiển thị như 0) nên không được sửa, dù người viết gần như chắc chắn muốn `opc0.5`. Bật phương ngữ Tailwind thì class này được hiểu đúng.

Để có số liệu đại diện hơn: chạy nhiều mô hình khác nhau, mỗi mô hình một lượt có và không có MCP, rồi thêm thư mục vào `runs/`.
