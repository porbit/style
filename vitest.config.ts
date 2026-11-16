import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // Unit test (vitest) chỉ trong tests/. E2E Playwright (e2e/) chạy riêng qua npm run test:e2e.
        include: ['tests/**/*.test.ts'],
        // Test khởi chạy tiến trình (LSP, CLI) từng quá 5 s mặc định khi máy bận (nhiều bộ đo chạy song song).
        testTimeout: 30_000,
        coverage: {
            provider: 'v8',
            include: ['src/**'],
            exclude: ['src/index-auto.ts', 'src/types.ts', '**/*.d.ts'],
            reporter: ['text', 'json', 'html'],
        },
    },
})
