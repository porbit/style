// Dự án v3 có tiền tố `tw-`. Tailwind v4 đọc qua @config: bỏ `-` cuối (cảnh báo), class viết `tw:flex`
// (tiền tố là biến thể đứng đầu); `tw-flex` kiểu v3 không còn sinh CSS.
module.exports = {
  prefix: 'tw-',
  darkMode: 'class',
  theme: {
    extend: {
      colors: { brand: { DEFAULT: '#0a64e8', 50: '#eef5ff', 900: '#06306e' } },
      spacing: { 18: '4.5rem' },
      borderRadius: { blob: '2rem' },
    },
  },
}
