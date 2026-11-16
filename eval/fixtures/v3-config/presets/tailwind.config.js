// Dự án v3 dùng preset (design system dùng chung) + blocklist + theme.container. Tailwind v4 đọc qua @config:
// preset lồng trước, rồi preset, rồi chính cấu hình; `theme.x` sau thay trước, `theme.extend` cộng dồn; plugin của
// preset chạy trước; `darkMode`/`blocklist` lấy cấu hình cuối có khai báo (blocklist của preset nền bị thay).
const plugin = require('tailwindcss/plugin')

const foundation = {
  theme: {
    extend: {
      spacing: { 13: '3.25rem', 15: '3.75rem' },
      borderRadius: { pill: '999px' },
    },
  },
  blocklist: ['p-1'],
}

const brand = {
  presets: [foundation],
  darkMode: 'selector',
  theme: {
    colors: {
      transparent: 'transparent',
      white: '#ffffff',
      ink: { DEFAULT: '#111827', soft: '#4b5563' },
      paper: '#fafaf9',
      brand: { DEFAULT: '#0a64e8', 600: '#0850c0', 900: '#06306e' },
    },
    fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['"JetBrains Mono"', 'monospace'] },
    extend: {
      borderRadius: { blob: '2rem' },
      // Tự tham chiếu (`theme('colors.brand.600')` trong `extend.colors`): Tailwind không thấy giá trị (khoá đang giải).
      colors: ({ theme }) => ({ accent: theme('colors.brand.600') ?? '#ff6a3d' }),
    },
  },
  plugins: [
    plugin(({ addUtilities, theme }) => {
      addUtilities({ '.text-shadow-brand': { textShadow: `0 1px 2px ${theme('colors.brand.DEFAULT')}` } })
    }),
  ],
}

module.exports = {
  presets: [brand],
  theme: {
    extend: {
      colors: { brand: { 50: '#eef5ff' }, danger: '#dc2626' },
      container: {
        center: true,
        padding: { DEFAULT: '1rem', sm: '2rem', lg: '4rem', '2xl': '6rem' },
      },
    },
  },
  blocklist: ['p-2', 'dark:bg-ink', 'text-danger'],
  plugins: [
    plugin(({ addComponents }) => {
      addComponents({
        '.chip': { '@apply inline-flex items-center rounded-pill bg-brand px-3 py-1 text-white': {}, '&:hover': { '@apply bg-brand-900': {} } },
      })
    }),
  ],
}
