// `important: true`: Tailwind v4 (qua @config) thêm `!important` vào mọi khai báo utility
// (như `@import "tailwindcss" important`); `@apply` không bị ảnh hưởng.
module.exports = {
  important: true,
  darkMode: 'selector',
  theme: {
    extend: {
      colors: { brand: '#0a64e8' },
    },
  },
}
