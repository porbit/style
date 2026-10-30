# Vận Hành PresenceStyle

Tài liệu vận hành cho package `@porbit/style`. Thư mục làm việc giả định trong mọi lệnh dưới đây là thư mục gốc của repository.

## 1. Yêu Cầu Môi Trường

| Thành phần | Yêu cầu |
| :--- | :--- |
| Node.js | `>=20` (khai báo trong `engines`) |
| npm | Đi kèm Node 20 trở lên |
| Trình duyệt đích | Chrome 73+, Safari 15.4+, Firefox 101+ (có hạ cấp an toàn cho bản cũ hơn) |

## 2. Cài Đặt Và Build

```bash
git clone https://github.com/porbit/style.git
cd style
npm install
npm run build
```

Kết quả build nằm trong `dist/`:

| File | Vai trò |
| :--- | :--- |
| `dist/index.js` / `dist/index.mjs` | Entry chính (CommonJS / ESM). |
| `dist/index-auto.js` / `dist/index-auto.mjs` | Entry tự động observe khi import. |
| `dist/cli-bin.js` / `dist/cli-bin.mjs` | Thực thi CLI `presence-style`. |
| `dist/*.d.ts`, `dist/*.d.mts` | Khai báo kiểu TypeScript. |

## 3. Bảng Lệnh npm

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run build` | Build CJS + ESM + khai báo kiểu bằng `tsup`. |
| `npm run dev` | Build ở chế độ watch. |
| `npm run typecheck` | Kiểm tra kiểu bằng `tsc --noEmit`, không sinh file. |
| `npm test` | Chạy Vitest ở chế độ watch. |
| `npm run test:run` | Chạy toàn bộ unit test một lần. |
| `npm run test:coverage` | Chạy test kèm báo cáo độ phủ. |
| `npm run test:e2e` | Build rồi chạy Playwright cross-browser trong `e2e/`. |
| `npm run gen:spec` | Sinh lại `spec/dictionary.json` và `spec/conformance.core.json`. |
| `npm run gen:rust` | Sinh `dictionary_generated.rs` cho engine Rust; bỏ qua nếu chưa đặt `PRESENCE_STYLE_RUST_DICT_OUT` hoặc đối số đường dẫn. |
| `npm run gen` | Chạy cả `gen:spec` và `gen:rust`. |
| `npm run verify` | Cổng kiểm chứng: `typecheck` + `test:run` + `build`. |
| `npm run extract` | Gọi CLI trích xuất từ bản build trong `dist/`. |

## 4. CLI `presence-style`

Cú pháp:

```bash
presence-style extract <đường-dẫn...> [tuỳ chọn]
```

| Cờ | Mô tả | Mặc định |
| :--- | :--- | :--- |
| `--out <file>` | Ghi CSS ra file; không có thì in ra stdout. | stdout |
| `--config <file>` | File JSON `XCSSConfig`, hỗ trợ thêm khoá `safelist`. | không |
| `--map <file>` | Ghi map class nguồn -> class rút gọn ra JSON. | không |
| `--ext <danh-sách>` | Phần mở rộng cần quét khi đường dẫn là thư mục. | `html,htm,js,jsx,ts,tsx,vue,svelte,astro,mdx` |
| `--silent` | Không in thống kê ra stderr. | `false` |
| `-h`, `--help` | Hiển thị trợ giúp. | — |

Ví dụ đầy đủ:

```bash
npx presence-style extract src --out dist/presence.css --map dist/class-map.json
```

Kết quả mong đợi trên stderr:

```text
presence-style: 2 file, 14 class ứng viên, 10 class sinh CSS.
```

Mã thoát: `0` khi thành công, `1` khi sai tham số, thiếu nguồn, hoặc không tìm thấy file khớp.

Ví dụ file cấu hình `presence-style.config.json`:

```json
{
  "theme": { "brand": "#0a64e8" },
  "breakpoints": [{ "tablet": "screen and (min-width: 768px)" }],
  "safelist": ["md:dF", "cBrand"]
}
```

## 5. Quy Trình Phát Hành npm

Package phát hành công khai dưới scope `@porbit`. Các bước dưới đây thay đổi trạng thái công khai trên registry, nên cần thực hiện đúng thứ tự.

### Bước 1: Kiểm chứng cục bộ

```bash
npm run verify
```

Yêu cầu: typecheck sạch, toàn bộ unit test pass, build thành công. Không phát hành nếu bất kỳ bước nào thất bại.

### Bước 2: Kiểm tra nội dung gói

```bash
npm pack --dry-run
```

Xác nhận gói chỉ chứa `dist/`, `spec/dictionary.json`, `spec/SPEC.md`, `README.md`, `DICTIONARY.md`, `LICENSE`. Không được có `node_modules`, mã nguồn `src/`, hoặc file test.

### Bước 3: Xác thực tài khoản

```bash
npm whoami
```

Nếu trả về lỗi `E401 Unauthorized`, phải đăng nhập trước:

```bash
npm login
```

Tài khoản phải có quyền publish trên scope `@porbit`.

### Bước 4: Tăng version

```bash
npm version patch   # hoặc minor / major theo mức độ thay đổi; lệnh này cũng tạo commit và tag git
```

Quy ước: thay đổi hành vi engine hoặc thêm API công khai dùng `minor`; sửa lỗi tương thích ngược dùng `patch`.

### Bước 5: Phát hành

```bash
npm publish --access public
```

`prepublishOnly` sẽ tự chạy `npm run verify` một lần nữa trước khi đẩy lên registry.

### Bước 6: Xác minh sau phát hành

```bash
npm view @porbit/style version
npm view @porbit/style dist.tarball
```

Kiểm tra thêm đường dẫn CDN:

```text
https://unpkg.com/@porbit/style@latest/dist/index.mjs
https://cdn.jsdelivr.net/npm/@porbit/style@latest/dist/index.mjs
```

### Rollback khi phát hành sai

npm không cho phép ghi đè một version đã publish. Xử lý theo thứ tự ưu tiên:

1. **Ưu tiên nhất**: phát hành ngay version vá mới (ví dụ `0.3.1`) đã sửa lỗi. Đây là cách an toàn nhất và không phá vỡ người dùng đang cài bản lỗi.
2. Nếu bản lỗi nghiêm trọng, hạ nhãn `latest` về version ổn định trước đó:

   ```bash
   npm dist-tag add @porbit/style@0.2.1 latest
   ```

3. Chỉ dùng `npm deprecate` để cảnh báo, không xoá:

   ```bash
   npm deprecate @porbit/style@0.3.0 "Bản lỗi, hãy dùng 0.3.1 trở lên."
   ```

> Cảnh báo: `npm unpublish` phá vỡ mọi project đang phụ thuộc version đó và chỉ khả dụng trong 72 giờ đầu. Không dùng trừ khi bản phát hành làm lộ thông tin nhạy cảm.

## 6. Troubleshooting

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| :--- | :--- | :--- |
| Class không sinh CSS, giữ nguyên tên gốc | Token sai cú pháp, hoặc property không có trong dictionary | Đối chiếu `DICTIONARY.md`; kiểm tra thứ tự `[Media]:[Layer][Prop][Val][@Selector]` |
| Media custom không có tác dụng | Thiếu khai báo trong `breakpoints` | Thêm `breakpoints: [{ tablet: 'screen and (min-width: 768px)' }]` |
| CSS cũ vẫn áp dụng sau khi đổi cấu hình | Cache `localStorage` còn dữ liệu cũ | Tăng `cache.version`, hoặc xoá key `<styleId>_cache_<version>` |
| Rò rỉ bộ nhớ khi hot-reload hoặc chạy test | Không giải phóng `MutationObserver` | Gọi `destroy()` khi unmount hoặc teardown |
| Log cảnh báo trong bản production | Engine cảnh báo lỗi cache hoặc dictionary | Bật `silent: true` |
| Bộ nhớ tăng dần ở app sinh class động | Memo cache tích luỹ | Giảm `maxCacheEntries`, hoặc chuẩn hoá lại tập class |
| CLI báo `Không tìm thấy file nguồn nào khớp` | Sai đường dẫn hoặc phần mở rộng ngoài danh sách mặc định | Kiểm tra đường dẫn; thêm `--ext` |
| Class ghép chuỗi động không có CSS | Quét tĩnh không thấy token | Khai báo trong `safelist` |
| `npm publish` báo `E401` | Chưa đăng nhập npm | Chạy `npm login`, sau đó `npm whoami` để xác nhận |
| Conformance test thất bại sau khi sửa engine | Hợp đồng đa engine chưa cập nhật | Nếu thay đổi là có chủ đích, chạy `npm run gen` (kèm biến `PRESENCE_STYLE_RUST_*` nếu cần đồng bộ engine Rust) |

## 7. Kiểm Tra Sức Khoẻ Nhanh

```bash
npm run verify
node dist/cli-bin.js --help
node -e "const s=require('./dist/index.js'); console.log(typeof s.extract, typeof s.destroy)"
```

Kết quả mong đợi: `verify` pass toàn bộ, CLI in trợ giúp, lệnh cuối in `function function`.
