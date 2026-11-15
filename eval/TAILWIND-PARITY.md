# Độ Khớp Với Tailwind Thật

Sinh bởi `node eval/tailwind-parity.mjs` với tailwindcss@4.3.5, Chromium. So TOÀN BỘ computed style của phần tử và hai phần tử con giữa CSS Tailwind sinh và CSS @porbit/style (phương ngữ v4) sinh.

| Phần | Khớp | Tỉ lệ |
| :--- | ---: | ---: |
| A. Mọi class trong danh sách của Tailwind | 23285/23286 | 100% |
| B. Biến thể, độ mờ, !important, giá trị tuỳ ý | 680/680 | 100% |
| D. Theme tuỳ chỉnh, `@utility`, `@apply` (`<style type="text/tailwindcss">`) | 28/28 | 100.0% |
| C. Đường runtime trong trình duyệt (tailwind-auto.mjs, mẫu 1/7 danh sách) | 3327/3327 | 100% |

## Phần B theo kịch bản

| Kịch bản | Khớp |
| :--- | ---: |
| sm/md/lg/xl/2xl ở 1300px | 60/60 |
| sm/md/lg ở 700px | 36/36 |
| max-* ở 700px | 48/48 |
| khoảng md:max-lg ở 900px | 12/12 |
| dark (media) | 12/12 |
| hover/focus/active (ép trạng thái) | 48/48 |
| md:hover ở 1000px | 12/12 |
| group-hover / peer-focus | 24/24 |
| aria-checked / data-[state=open] | 24/24 |
| first/last/odd (con) | 12/12 |
| before/after | 24/24 |
| not-/nth-/odd/even giữa anh em | 84/84 |
| has-checked / has-[input:checked] | 24/24 |
| group-has-checked / peer-checked/name / group-hover/item | 36/36 |
| rtl / ltr | 24/24 |
| container query @md/@lg/@2xl/@max-lg | 60/60 |
| container có tên @md/main | 24/24 |
| supports-[display:grid] / not-supports | 36/36 |
| print | 12/12 |
| not-dark ở chế độ sáng / not-md ở 700px | 24/24 |
| in-focus / in-[.x] | 24/24 |
| độ mờ /50 và !important | 6/6 |
| giá trị tuỳ ý | 14/14 |

## Lệch (tối đa 60 dòng)

- `container`: `max-inline-size: tw=1024px | ours=none`; `max-width: tw=1024px | ours=none`
