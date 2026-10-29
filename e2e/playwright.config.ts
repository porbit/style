import { defineConfig, devices } from '@playwright/test'

// Cross-browser + mobile matrix cho PresenceStyle.
// Chạy: npm run build && npx playwright install && npm run test:e2e
export default defineConfig({
    testDir: '.',
    testMatch: '**/*.spec.ts',
    timeout: 30_000,
    fullyParallel: true,
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:5173',
    },
    // Static server phục vụ repo root để fixture import được /dist/index.mjs.
    webServer: {
        command: 'python3 -m http.server 5173',
        cwd: '..',
        port: 5173,
        reuseExistingServer: true,
        timeout: 20_000,
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
        { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    ],
})
