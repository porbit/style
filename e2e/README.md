# Cross-browser / mobile test matrix

Bộ test Playwright xác nhận PresenceStyle apply CSS đúng trên Chromium, Firefox,
WebKit (Safari engine) và emulation mobile (Pixel 5, iPhone 13).

## Chạy

```bash
# 1) cài Playwright + browser engines (một lần, cần mạng, vài trăm MB)
npm i -D @playwright/test
npx playwright install --with-deps

# 2) chạy matrix (tự build dist + bật static server qua python3)
npm run test:e2e
```

> Yêu cầu `python3` để phục vụ static (`python3 -m http.server`). Có thể thay
> `webServer.command` trong `playwright.config.ts` bằng server tĩnh khác.

## Bao phủ

| Spec | Kiểm tra |
|------|----------|
| utility cơ bản | `display/align-items/padding/color/background` áp đúng trên mọi engine |
| CB5 sticky | `position:sticky` hoạt động (Safari qua `-webkit-sticky`) |
| CB4 hover | `:hover` chỉ áp khi thiết bị có hover; mobile (`hover:none`) không đổi nền |
| responsive | breakpoint `md:` đổi theo viewport thật của từng device |

Fixture: [fixture.html](fixture.html) — khởi tạo engine với `hoverMedia` + `autoprefix`.
