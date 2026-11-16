// Thay hẳn bảng màu và breakpoint (không extend), dark mode theo thuộc tính.
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent',
      white: '#fff',
      ink: { DEFAULT: '#111827', soft: { DEFAULT: '#374151', faint: '#9ca3af' } },
      primary: { 50: '#f0f9ff', 600: '#0284c7' },
    },
    screens: { tablet: '640px', laptop: { min: '1024px' } },
    extend: { spacing: { 13: '3.25rem' } },
  },
}
