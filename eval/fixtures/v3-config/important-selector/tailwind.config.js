// `important: '<selector>'`: Tailwind v4 (qua @config) bọc utility trong selector đó (`#app .p-2`,
// `:is(:where(.group):hover :is(#app .x))`...). Dự án thật hay dùng `#app`; ở đây dùng `body` để trang đo
// (nội dung đặt thẳng trong <body>) thật sự kiểm được selector bọc.
module.exports = {
  important: 'body',
  darkMode: 'class',
  theme: {
    extend: {
      colors: { brand: '#0a64e8' },
    },
  },
}
