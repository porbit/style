// Plugin JS tự viết của dự án v3: `matchVariant` (giá trị có tên, giá trị tuỳ ý `name-[x]:`, modifier, `sort`),
// `@apply` trong CSS-in-JS của `addComponents`/`addUtilities`/`addBase`, plugin có `config.theme`.
const plugin = require('tailwindcss/plugin')

module.exports = {
  darkMode: 'class',
  theme: { extend: { colors: { brand: { DEFAULT: '#0a64e8', 900: '#06306e' } } } },
  plugins: [
    plugin(({ matchVariant }) => {
      // `nth-[2n_+_1]:`, `nth-odd:`
      matchVariant('nth', (value) => `&:nth-child(${value})`, { values: { odd: 'odd', even: 'even', 3: '3' } })
      // Biến thể tổ tiên có modifier: `state-[open]:`, `state-[open]/menu:` -> `.menu[data-state=open] &`.
      matchVariant('state', (value, { modifier }) => (modifier ? `.${modifier}[data-state="${value}"] &` : `[data-state="${value}"] &`), { values: { on: 'on' } })
      // At-rule theo giá trị, thứ tự theo `sort`: `mq-[900px]:`, `mq-small:`, `mq-big:`.
      matchVariant('mq', (value) => `@media (min-width: ${value})`, { values: { big: '1200px', small: '600px' }, sort: (a, b) => parseInt(a.value) - parseInt(b.value) })
    }),
    plugin(({ addComponents, addUtilities, addBase }) => {
      addBase({ 'h6': { '@apply text-sm font-semibold': {} } })
      addComponents({
        '.btn': { '@apply rounded px-4 py-2 font-bold': {}, color: 'white', '&:hover': { '@apply bg-brand-900 underline': {} } },
        '.btn-brand': { '@apply bg-brand': {} },
        '.card': { '@apply p-6 md:p-10 shadow dark:bg-brand-900': {} },
      })
      addUtilities({ '.stack': { '@apply flex flex-col gap-2': {} } })
    }),
    plugin(
      ({ matchUtilities, theme }) => {
        matchUtilities({ 'glow': (value) => ({ boxShadow: `0 0 12px ${value}` }) }, { values: theme('glow') })
      },
      { theme: { glow: { DEFAULT: '#0a64e8', soft: 'rgb(10 100 232 / 0.3)' } } },
    ),
  ],
}
