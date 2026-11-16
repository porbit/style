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

## Đo Trên Dự Án Thật

`real-project.mjs` so computed style giữa Tailwind thật (biên dịch từ chính file CSS của dự án) và @porbit/style
trên mã nguồn của dự án Tailwind v4 có sẵn, ở 11 lượt: mặc định (1280 px), mở/đóng (`data-*`/`aria-*` trên
phần tử, cha `.group`, anh `.peer`), `.dark`, ép `:hover`/`:focus`/`:focus-visible`/`:active` (CDP
`CSS.forcePseudoState`, `transition-*` được tua tới cuối trước khi đo), và độ rộng 375/768/1600 px; cùng
các tổ hợp chuỗi class thật của component. Hai chế độ: "không build" và plugin PostCSS.

```bash
npm run build
node eval/real-project.mjs                    # shadcn/ui v4 -> REAL-PROJECT.md, real-project.json
node eval/real-project.mjs --fixture=hyperui  # fixtures/<tên>/fixture.json -> REAL-PROJECT-<tên>.md/.json
node eval/real-project.mjs --all              # mọi fixture + hai fixture v3, rồi tổng hợp REAL-PROJECTS.md
node eval/real-project.mjs --summary          # chỉ dựng lại REAL-PROJECTS.md từ các file JSON
node eval/real-project.mjs --fixture=daisyui --browser=firefox  # firefox/webkit (cần `npx playwright install <tên>`)
```

`--browser=chromium|firefox|webkit` (mặc định chromium): trình duyệt chưa cài thì dừng và báo lệnh cài. Lượt ép
`:hover`/`:focus`... dùng CDP nên chỉ chạy trên Chromium; kết quả trình duyệt khác ghi file riêng
(`real-project-<tên>.firefox.json`, `REAL-PROJECT-<tên>.firefox.md`, `REAL-PROJECTS.firefox.md`), không đụng mốc của
`check:all`. Trên Chromium, dòng thời gian animation được đóng băng (CDP `Animation.setPlaybackRate` 0) trước khi nạp
trang để animation ngắn không kịp chạy xong trước lúc đo.

| Fixture | Nguồn | Giấy phép |
| :--- | :--- | :--- |
| `fixtures/shadcn-v4` | shadcn/ui `new-york-v4/ui` | MIT |
| `fixtures/hyperui` | HyperUI `public/examples/{application,neobrutalism}` (HTML) | MIT |
| `fixtures/magicui` | Magic UI `apps/www/registry/magicui` | MIT |
| `fixtures/coss-ui` | coss ui / Origin UI `packages/ui/src/components` (Base UI) | MIT |
| `fixtures/daisyui` | trang HTML tự viết theo tài liệu daisyUI 5, `@plugin "daisyui"` (`daisyui@5.8.1`) | MIT (daisyUI) |
| `fixtures/tailadmin` | TailAdmin Vue (dashboard) qua npm `@dynamia-tools/tailadmin-vue` `src/components` + `theme.css` | MIT |
| `fixtures/v3-config` | cấu hình `tailwind.config.js` kiểu v3 (tự viết) | — |

Thêm dự án: tạo `fixtures/<tên>/` với file CSS, thư mục nguồn và `fixture.json`
(`{ "label", "source", "license", "css", "src", "imports": { "gói": "đường/dẫn/tương/đối.css" }, "dark": "data-theme=\"dark\"" }`;
`dark` tuỳ chọn: thuộc tính đặt trên `<html>` ở lượt tối thay cho `class="dark"`). Plugin JS chưa đóng gói sẵn
(`@plugin "daisyui"`) chạy qua API giả lập ở cả hai chế độ.
Kết quả tổng hợp: [REAL-PROJECTS.md](./REAL-PROJECTS.md).

## Lệch Còn Lại So Với Tailwind 4.3.5

Mọi bộ so với Tailwind thật (`check:all` bước `tailwind` và `projects`) đòi khớp 100%: class, biến thể, runtime, theme,
plugin đóng gói và plugin JS, dự án thật, thứ tự cascade, chế độ lai. Không còn lệch đo được; phần duy nhất không đo
là chỗ chính Tailwind không xác định:

- **Thứ tự `state-[open]` và `state-[open]/menu`** (`matchVariant` có `sort`, cùng giá trị khác modifier): `sort` của plugin
  không nhận modifier nên phép so của Tailwind trả 1 cả hai chiều, thứ tự rule theo thứ tự Tailwind gặp class trong mã
  nguồn (đổi khi đổi thứ tự file). `tailwind-order.mjs` vì vậy bỏ cặp này khỏi tập đo.

## Thời Gian Build Tĩnh

`build-bench.mjs` đo plugin PostCSS (`compileTailwindCss`) so với Tailwind CLI v4 (`@tailwindcss/node` `compile()` +
`@tailwindcss/oxide` `Scanner` + Lightning CSS `optimize()`, đúng như `@tailwindcss/cli --minify`) trên hai bộ: `mixed`
(~6.000 file nhân bản từ `fixtures/{hyperui,coss-ui,magicui,shadcn-v4}`) và `html` (369 trang HTML của HyperUI nhân bản
17 lần, `--html-copies=`). Chế độ: cold (tiến trình mới, bộ nhớ đệm quét trên đĩa rỗng), cold+cache (tiến trình mới, bộ
nhớ đệm từ lần trước, không file nào đổi; Tailwind không có nên dùng số cold), warm (cùng tiến trình, mọi file đổi
mtime trước mỗi lượt). Hai phía chạy xen kẽ, báo trung vị; kèm thời gian từng pha (liệt kê file, đọc + trích ứng viên,
sinh CSS) và kiểm CSS của các bản build ta trùng byte. Gói Tailwind không có trong `devDependencies`: cài riêng
(`npm i @tailwindcss/cli` vào một thư mục) rồi trỏ `--tw=`.

```bash
npm run build
node eval/build-bench.mjs --tw=/thư/mục/có/node_modules                    # -> build-bench.json
node eval/build-bench.mjs --tw=... --sets=html --ours=dist,trước=/đường/dẫn/dist-cũ
```

Máy bận (tải 1 phút ghi trong JSON) làm số đo dao động mạnh: chỉ so các phía trong cùng một lần chạy.
