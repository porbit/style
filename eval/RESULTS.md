# Kết Quả Đánh Giá

Chạy: `node eval/score.cjs` (Chromium, phiên bản 1.0.0). Mỗi class được coi là hợp lệ khi engine sinh được CSS và trình duyệt chấp nhận declaration/selector.

| Lượt | File | Class | Ký tự class | Hợp lệ | Hợp lệ sau `fix_classes` | Nhóm xung đột |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| tailwind | 8 | 440 | 4505 | 100.0% | — | 0 |
| xcss-no-tools | 8 | 452 | 3824 | 99.1% | 99.8% | 0 |

Tập lỗi dùng để chỉnh bộ sửa (`mistakes.json`): `fix_classes` sửa đúng **38/38** (100.0%).

Tập kiểm tra v1 (`mistakes-tuning-v1.json`; ban đầu độc lập, đạt 8/21 trước khi chỉnh, sau đó đã dùng để chỉnh): **18/21** (85.7%).

Tập kiểm tra độc lập v2 (`mistakes-holdout.json`, viết sau cùng, không dùng khi chỉnh): **19/20** (95.0%).

## Chi tiết

### tailwind

- Class không hợp lệ: không có

### xcss-no-tools

- Class không hợp lệ: `fvn[tabular-nums]`, `bdf[blur(4px)]`, `dBox`, `wbo[vertical]`
- Còn lại sau sửa: `dBox`

### Tập lỗi chưa sửa đúng


### Tập kiểm tra độc lập chưa sửa đúng

- `opacity-50` → `opacity-50` (mong đợi `opc0.5`)
