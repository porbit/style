// Cấu hình TypeScript (`tailwind.config.ts`) kiểu v3: `import type`, chú thích kiểu, `as const`, `satisfies`.
// Viết `module.exports` (dự án CommonJS): bộ đo nạp phía Tailwind bằng `require` thẳng, không mở `.default`
// của module ESM như @tailwindcss/node. Dạng `export default` được kiểm bằng test đơn vị.
import type { Config } from 'tailwindcss'

const defaultTheme = require('tailwindcss/defaultTheme')

const brand: Record<string, string> = { DEFAULT: '#0a64e8', 50: '#eef5ff', 900: '#06306e' }

module.exports = {
  content: ['./**/*.html'],
  darkMode: 'class',
  prefix: 'tw',
  theme: {
    extend: {
      colors: { brand },
      fontFamily: { sans: ['Inter', ...defaultTheme.fontFamily.sans] },
      spacing: { 18: '4.5rem' } as const,
    },
  },
} satisfies Config
