// Cấu hình kiểu Tailwind v3 điển hình (dự án nâng cấp lên v4 bằng `@config`).
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: ['./src/**/*.html'],
  darkMode: 'class',
  theme: {
    screens: { sm: '480px', md: '768px', lg: '1100px', xl: '1440px' },
    extend: {
      colors: {
        brand: { DEFAULT: '#0a64e8', 50: '#eef5ff', 100: '#d9e8ff', 500: '#0a64e8', 900: '#06306e' },
        accent: '#ff6a3d',
        surface: { DEFAULT: '#ffffff', muted: '#f4f5f7', dark: '#0f1115' },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['"Playfair Display"', 'serif'],
      },
      fontSize: {
        hero: ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        tiny: '0.625rem',
        lead: ['1.25rem', '1.75rem'],
      },
      spacing: { 18: '5rem', gutter: '1.5rem' },
      borderRadius: { blob: '2rem' },
      boxShadow: { soft: '0 2px 8px rgb(0 0 0 / 0.08)' },
      maxWidth: { prose2: '70ch' },
      letterSpacing: { loose: '0.08em' },
      // Namespace mà theme mặc định của v4 ít/không có khoá: Tailwind đặt tên kebab-case (`--z-index-modal`).
      aspectRatio: { wide: '3 / 1' },
      zIndex: { modal: '60' },
      gridTemplateColumns: { app: '200px 1fr' },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}
