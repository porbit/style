// Tailwind v4 không đọc `corePlugins`, `separator`, `safelist` từ @config: preflight vẫn chạy, `p-*`/`float`
// vẫn sinh CSS, biến thể vẫn viết bằng `:` (`md_p-4` không sinh gì), safelist không thêm class.
module.exports = {
  corePlugins: { preflight: false, padding: false, float: false },
  separator: '_',
  safelist: ['m-7'],
  theme: {
    extend: {
      colors: { brand: '#0a64e8' },
    },
  },
}
