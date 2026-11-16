const { chromium } = require('playwright')
;(async () => {
  for (let i = 0; i < 30; i++) { try { await fetch('http://localhost:3123'); await fetch('http://localhost:3124'); break } catch { await new Promise(r => setTimeout(r, 500)) } }
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  const result = {}
  for (const [name, port] of [['ours', 3123], ['tw', 3124]]) {
    for (const width of [600, 1300]) {
      const p = await b.newPage({ viewport: { width, height: 900 } })
      await p.goto(`http://localhost:${port}/`)
      await p.hover('#b')
      result[name + width] = await p.evaluate(() => [...document.querySelectorAll('body, body *')].map(el => { const cs = getComputedStyle(el); return el.tagName + ':' + [...cs].filter(k => !k.startsWith('--')).map(k => k + '=' + cs.getPropertyValue(k)).join(';') }))
      await p.close()
    }
  }
  const near = (a, b) => { const na = a.match(/-?[\d.]+/g) || [], nb = b.match(/-?[\d.]+/g) || []; return na.length === nb.length && a.replace(/-?[\d.]+/g, '#') === b.replace(/-?[\d.]+/g, '#') && na.every((x, i) => Math.abs(Number(x) - Number(nb[i])) < 0.05) }
  let real = 0
  for (const w of [600, 1300]) result['ours' + w].forEach((s, i) => { const a = s.split(';'), t = result['tw' + w][i].split(';'); if (a.some((x, j) => x !== t[j] && !near(x, t[j]))) { real++; console.log('THẬT', a.filter((x, j) => x !== t[j] && !near(x, t[j])).slice(0, 3)) } })
  console.log('lệch thật (ngoài sai số làm tròn 0,05px):', real)
  let total = 0, diff = 0; const samples = []
  for (const w of [600, 1300]) result['ours' + w].forEach((s, i) => { total++; if (s !== result['tw' + w][i]) { diff++; const a = s.split(';'), t = result['tw' + w][i].split(';'); samples.push(a.filter((x, j) => x !== t[j]).slice(0, 3).join(' | ') + ' <> ' + t.filter((x, j) => x !== a[j]).slice(0, 3).join(' | ')) } })
  console.log(`Next.js: ${total - diff}/${total} phần tử (2 độ rộng, có hover) giống hệt`); samples.slice(0, 5).forEach(s => console.log('  ', s.slice(0, 300)))
  await b.close()
})()
