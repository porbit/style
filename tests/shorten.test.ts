import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
    collectCssClasses,
    createShortClassNames,
    escapeCssIdent,
    findShortenableClassRanges,
    renameCssClasses,
    shortClassName,
    shortenClasses,
    unescapeCss,
} from '../src/shorten'
import presenceStyle from '../src/vite'
import { runCli } from '../src/cli'
import { tailwindV4Dialect } from '../src/tailwind-v4'

const rule = (name: string, decl = 'color:red') => `.${escapeCssIdent(name)}{${decl}}`

describe('tên ngắn và escape', () => {
    it('sinh tên theo thứ tự a..z, aa..z9, aaa...', () => {
        expect([0, 1, 25, 26, 27, 61, 62, 961, 962].map(shortClassName)).toEqual(['a', 'b', 'z', 'aa', 'ab', 'a9', 'ba', 'z9', 'aaa'])
        const all = new Set(Array.from({ length: 5000 }, (_, i) => shortClassName(i)))
        expect(all.size).toBe(5000)
        for (const name of all) expect(name).toMatch(/^[a-z][a-z0-9]*$/)
    })

    it('escape/giải escape tên class kiểu Tailwind', () => {
        for (const name of ['hover:bg-red-500/50', '[&_svg]:size-4', 'w-1/2', 'p-0.5', '@container/main', '-mt-2', "content-['x']", '2xl:p-4', '*:p-2']) {
            const escaped = escapeCssIdent(name)
            expect(unescapeCss(escaped)).toBe(name)
            expect(collectCssClasses(`.${escaped}{color:red}`).classes.has(name)).toBe(true)
        }
        expect(unescapeCss('\\32 xl\\:p-4')).toBe('2xl:p-4')
    })
})

describe('đổi tên trong CSS', () => {
    const map = new Map([
        ['group', 'g'],
        ['peer', 'p'],
        ['x', 'a'],
        ['group-hover:bg-red', 'b'],
        ['group/item', 'c'],
        ['@container/main', 'd'],
        ['[&_.x]:p-4', 'e'],
        ['in-[.x]:p-4', 'f'],
        ['has-[.x]:p-4', 'h'],
        ['*:p-2', 'i'],
    ])

    it('selector phức: group/peer, :is/:where/:has/:not, kết hợp, lồng, @media/@container/@supports', () => {
        const css = [
            '.group-hover\\:bg-red:is(:where(.group):hover *){color:red}',
            '.peer:checked~.x,.x+.peer{color:blue}',
            '.group\\/item:hover .x:not(.peer){color:green}',
            '.\\[\\&_\\.x\\]\\:p-4 .x{padding:1rem}',
            ':where(.x) .in-\\[\\.x\\]\\:p-4{padding:1rem}',
            '.has-\\[\\.x\\]\\:p-4:has(.x){padding:1rem}',
            ':is(.\\*\\:p-2>*){padding:.5rem}',
            '@media (width>=40rem){@supports selector(.x){.x{color:red}}}',
            '.\\@container\\/main{container:main/inline-size}@container main (width>=20rem){.x{color:red}}',
            '.x{&:hover{color:red}& .peer{color:blue}}',
            '@layer utilities{.x::before{content:".x .group"}}',
            '.x[data-a=".x"]{color:red}#x.x{color:red}div.x{color:red}',
        ].join('')
        const out = renameCssClasses(css, map)
        expect(out).toBe(
            [
                '.b:is(:where(.g):hover *){color:red}',
                '.p:checked~.a,.a+.p{color:blue}',
                '.c:hover .a:not(.p){color:green}',
                '.e .a{padding:1rem}',
                ':where(.a) .f{padding:1rem}',
                '.h:has(.a){padding:1rem}',
                ':is(.i>*){padding:.5rem}',
                '@media (width>=40rem){@supports selector(.a){.a{color:red}}}',
                '.d{container:main/inline-size}@container main (width>=20rem){.a{color:red}}',
                '.a{&:hover{color:red}& .p{color:blue}}',
                '@layer utilities{.a::before{content:".x .group"}}',
                '.a[data-a=".x"]{color:red}#x.a{color:red}div.a{color:red}',
            ].join(''),
        )
    })

    it('không đụng @keyframes, @font-face, @property, giá trị khai báo, chú thích', () => {
        const css = '@keyframes x{0%{opacity:0}12.5%{opacity:1}}@property --x{syntax:"*";inherits:false}.x{background:url(a.x.png);--y:.x}/* .x */'
        expect(renameCssClasses(css, map)).toBe('@keyframes x{0%{opacity:0}12.5%{opacity:1}}@property --x{syntax:"*";inherits:false}.a{background:url(a.x.png);--y:.x}/* .x */')
    })

    it('thu selector thuộc tính trên class', () => {
        const info = collectCssClasses(".\\[\\&_svg\\:not\\(\\[class\\*\\=\\'size-\\'\\]\\)\\]\\:size-4 svg:not([class*='size-']){width:1rem}[class^=\"col-\" i]{x:y}")
        expect(info.attributes).toEqual([
            { operator: '*=', value: 'size-' },
            { operator: '^=', value: 'col-' },
        ])
        expect([...info.classes.keys()]).toEqual(["[&_svg:not([class*='size-'])]:size-4"])
    })
})

describe('chuỗi class nhận diện được', () => {
    const values = (code: string) => findShortenableClassRanges(code).map((r) => r.value)

    it('thuộc tính class/className, cn/clsx/cva, khoá object của clsx, prop *ClassName/classNames', () => {
        const code = `
const v = cva("base p-4", { variants: { size: { sm: "h-8", lg: "h-10" } }, defaultVariants: { size: "sm" }, compoundVariants: [{ size: "lg", class: "px-6" }] })
export const A = ({ variant }) => (
  <div className="flex gap-2">
    <p className={cn("text-sm", variant === "outline" && "border", buttonVariants({ variant: "ghost" }), { "h-2.5 w-2.5": on })} />
    <Icon iconClassName="size-4" classNames={{ root: "p-2", day: cn("rounded", x) }} />
    <i className={styles["hidden"]} />
  </div>
)`
        expect(values(code)).toEqual(['base p-4', 'h-8', 'h-10', 'px-6', 'flex gap-2', 'text-sm', 'border', 'h-2.5 w-2.5', 'size-4', 'p-2', 'rounded'])
    })

    it('bỏ :class, data-class, template có ${}, và tách phần {...} của template', () => {
        const code = `<div :class="{ x: a }" data-class="y" class="p-4 {cond ? 'a' : 'b'} m-{size} {{ extra }}"></div><b className={\`p-2 \${x}\`} />`
        const ranges = findShortenableClassRanges(code)
        expect(ranges.map((r) => r.value)).toEqual([`p-4 {cond ? 'a' : 'b'} m-{size} {{ extra }}`])
        expect(ranges[0].tokens.map((t) => t.token)).toEqual(['p-4'])
    })
})

describe('bảng ánh xạ và an toàn', () => {
    const css = ['flex', 'p-4', 'hidden', 'bg-red-500', 'bg-blue-500', 'text-sm', 'card', 'active', 'group', 'group-hover:underline', 'dark', 'x-keep', 'size-4', 'size-6'].map((n) => rule(n)).join('') +
        "svg:not([class*='size-']){width:1rem}"

    it('xác định, ưu tiên class dùng nhiều, cùng đầu vào cùng kết quả', () => {
        const sources = ['<a class="p-4 flex"></a><b class="p-4"></b><i class="p-4 text-sm"></i>', '<c class="flex"></c>']
        const a = createShortClassNames({ css, sources })
        const b = createShortClassNames({ css, sources: [...sources].reverse() })
        expect(Object.fromEntries(a.map)).toEqual(Object.fromEntries(b.map))
        expect(a.map.get('p-4')).toBe('a')
        expect(a.map.get('flex')).toBe('b')
        expect(a.map.get('text-sm')).toBe('c')
    })

    it('class xuất hiện ngoài chuỗi class (biến, querySelector, classList, khoá object, Svelte class:) giữ nguyên ở mọi nơi', () => {
        const sources = [
            `<div className="flex hidden card active group p-4 bg-red-500 text-sm" />`,
            `const c = cond ? 'hidden' : 'p-4 x'`,
            `document.querySelector('.card')`,
            `el.classList.toggle("active")`,
            `<p class:group={x}></p>`,
        ]
        const short = createShortClassNames({ css, sources })
        expect(short.skipped.get('hidden')).toBe('unrecognized')
        expect(short.skipped.get('p-4')).toBe('unrecognized')
        expect(short.skipped.get('card')).toBe('unrecognized')
        expect(short.skipped.get('active')).toBe('unrecognized')
        expect(short.skipped.get('group')).toBe('directive')
        expect(short.map.has('flex')).toBe(true)
        expect(short.map.has('bg-red-500')).toBe(true)
        // Không còn tên gốc của class đã đổi ở ngoài chuỗi class.
        for (const code of sources) expect(short.findUnrecognized(short.rewriteSource(code))).toEqual([])
    })

    it('mẩu ghép động: bg-${x}, "bg-" + x, p-{size}', () => {
        for (const dynamic of ['const c = `bg-${color}-500`', "const c = 'bg-' + color", '<div class="bg-{color}-500"></div>', "const prefix = 'bg-'"]) {
            const short = createShortClassNames({ css, sources: ['<div class="bg-red-500 bg-blue-500 flex"></div>', dynamic] })
            expect(short.skipped.get('bg-red-500')).toBe('dynamic')
            expect(short.skipped.get('bg-blue-500')).toBe('dynamic')
            expect(short.map.has('flex')).toBe(true)
        }
        // `${n}px`, `${t}s` là giá trị CSS: không chặn class.
        const short = createShortClassNames({ css, sources: ['<div class="text-sm flex"></div>', 'const s = `${n}px ${t}s`'] })
        expect(short.map.has('text-sm')).toBe(true)
    })

    it('exclude (tên, RegExp), mặc định giữ dark, prefix', () => {
        const sources = ['<div class="dark flex x-keep card text-sm"></div>']
        const short = createShortClassNames({ css, sources, exclude: ['card', /^x-/], prefix: 'q' })
        expect(short.skipped.get('dark')).toBe('exclude')
        expect(short.skipped.get('card')).toBe('exclude')
        expect(short.skipped.get('x-keep')).toBe('exclude')
        expect([...short.map.values()].every((n) => n.startsWith('q'))).toBe(true)
        expect(() => createShortClassNames({ css, sources, prefix: '1x' })).toThrow(/prefix/)
    })

    it('selector [class*="size-"]: tên mới giữ chuỗi con, tên khác không chứa nó', () => {
        const short = createShortClassNames({ css, sources: ['<div class="size-4 size-6 flex p-4"></div>'] })
        expect(short.map.get('size-4')).toMatch(/^size-[a-z][a-z0-9]*$/)
        expect(short.map.get('size-6')).toMatch(/^size-/)
        for (const name of ['flex', 'p-4']) expect(short.map.get(name)).not.toContain('size-')
    })

    it('tên mới không trùng class/token đang có, không dùng ad*', () => {
        const sources = ['<div class="flex p-4 text-sm card"></div><span class="a b"></span>', "const x = 'c'"]
        const short = createShortClassNames({ css: css + rule('a') + rule('b'), sources })
        const used = new Set(short.map.values())
        for (const reserved of ['a', 'b', 'c']) expect(used.has(reserved)).toBe(false)
        for (const name of used) expect(name).not.toMatch(/^ad/)
    })

    it('biến đổi mã chỉ trong chuỗi class, giữ khoảng trắng', () => {
        const code = `export const A = () => <div className={cn(\n  "flex   p-4",\n  on && 'text-sm'\n)} data-x="flex">flex</div>`
        const out = shortenClasses({ css, sources: { 'a.tsx': code } })
        const m = out.map
        // `data-x="flex"` và chữ `flex` trong nội dung làm `flex` không an toàn -> giữ nguyên.
        expect(m.flex).toBeUndefined()
        expect(out.sources['a.tsx']).toBe(`export const A = () => <div className={cn(\n  "flex   ${m['p-4']}",\n  on && '${m['text-sm']}'\n)} data-x="flex">flex</div>`)
        expect(out.css).toContain(`.${m['p-4']}{`)
    })
})

describe('sourcemap', () => {
    it('cột sau token đã thay trỏ đúng cột gốc', async () => {
        const { TraceMap, originalPositionFor } = await import('@jridgewell/trace-mapping')
        const css = rule('flex') + rule('items-center') + rule('justify-between')
        const code = 'const a = 1\nexport const A = () => <div className="flex items-center justify-between" id="x" />\n'
        const short = createShortClassNames({ css, sources: [code] })
        const out = short.rewriteSourceWithMap(code, 'a.tsx')
        const trace = new TraceMap(out.map as never)
        const line = out.code.split('\n')[1]
        const original = code.split('\n')[1]
        for (const needle of ['id="x"', 'export', '/>']) {
            const pos = originalPositionFor(trace, { line: 2, column: line.indexOf(needle) })
            expect(pos.line).toBe(2)
            expect(pos.column).toBe(original.indexOf(needle))
        }
        expect(short.rewriteSourceWithMap('const x = 1', 'b.ts').map).toBeNull()
    })
})

describe('tích hợp', () => {
    let dir = ''
    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true })
        dir = ''
    })

    it('plugin Vite: CSS ảo, transform, index.html và CSS của bundle dùng cùng bảng; dev không đổi', async () => {
        dir = mkdtempSync(join(tmpdir(), 'ps-short-'))
        mkdirSync(join(dir, 'src'))
        const app = `export const App = () => <div className="flex gap-2"><span className={cn("hidden", on && "block")} /></div>`
        writeFileSync(join(dir, 'src/App.tsx'), app)
        writeFileSync(join(dir, 'index.html'), '<div class="flex block"></div>')
        const plugin = presenceStyle({ shortClassNames: true, dialects: [tailwindV4Dialect()] })
        plugin.configResolved({ root: dir, command: 'build' })
        const css = (await plugin.load(plugin.resolveId('virtual:presence-style.css')!)) as string
        const out = (await plugin.transform(app, join(dir, 'src/App.tsx'))) as { code: string }
        const html = await plugin.transformIndexHtml.handler('<div class="flex block"></div>', { filename: join(dir, 'index.html') })
        const names = [...out.code.matchAll(/className=\{?(?:cn\()?"([^"]+)"/g)].map((m) => m[1])
        expect(names[0]).not.toContain('flex')
        expect(html).not.toContain('flex')
        for (const token of names[0].split(' ')) expect(css).toMatch(new RegExp(`\\.${token}[{,:\\s]`))
        const bundle = { 'a.css': { type: 'asset', fileName: 'a.css', source: '.flex .gap-2{color:red}' } }
        await plugin.generateBundle({}, bundle)
        expect(bundle['a.css'].source).toBe(`.${names[0].split(' ')[0]} .${names[0].split(' ')[1]}{color:red}`)

        // Module ngoài include dùng class đã đổi tên: không sửa, nhưng cảnh báo.
        const warnings: string[] = []
        const lib = 'export const Lib = () => h("div", { className: "flex gap-2" })'
        expect(await plugin.transform.call({ warn: (m: string) => warnings.push(m) }, lib, join(dir, 'node_modules/lib/index.js'))).toBeNull()
        expect(warnings[0]).toMatch(/node_modules\/lib\/index\.js.*flex, gap-2/)

        const dev = presenceStyle({ shortClassNames: true, dialects: [tailwindV4Dialect()] })
        dev.configResolved({ root: dir, command: 'serve' })
        expect(await dev.transform(app, join(dir, 'src/App.tsx'))).toBeNull()
        expect((await dev.load(dev.resolveId('virtual:presence-style.css')!)) as string).toContain('.flex')
    })

    it('CLI shorten ghi CSS, mã và bảng ánh xạ', async () => {
        dir = mkdtempSync(join(tmpdir(), 'ps-short-cli-'))
        writeFileSync(join(dir, 'app.css'), '.flex{display:flex}.p-4{padding:1rem}.card{color:red}')
        writeFileSync(join(dir, 'a.html'), '<div class="flex p-4 card"></div><script>document.querySelector(".card")</script>')
        const cwd = process.cwd()
        process.chdir(dir)
        const stderr = process.stderr.write
        process.stderr.write = (() => true) as typeof process.stderr.write
        try {
            const code = await runCli(['shorten', 'a.html', '--css', 'app.css', '--out-css', 'out/app.css', '--out-dir', 'out', '--map', 'out/map.json'])
            expect(code).toBe(0)
        } finally {
            process.stderr.write = stderr
            process.chdir(cwd)
        }
        const { map } = JSON.parse(readFileSync(join(dir, 'out/map.json'), 'utf8'))
        expect(Object.keys(map).sort()).toEqual(['flex', 'p-4'])
        expect(readFileSync(join(dir, 'out/a.html'), 'utf8')).toBe(`<div class="${map.flex} ${map['p-4']} card"></div><script>document.querySelector(".card")</script>`)
        expect(readFileSync(join(dir, 'out/app.css'), 'utf8')).toBe(`.${map.flex}{display:flex}.${map['p-4']}{padding:1rem}.card{color:red}`)
    })

    it('CLI shorten biên dịch file Tailwind (@import "tailwindcss") trước khi rút gọn', async () => {
        dir = mkdtempSync(join(tmpdir(), 'ps-short-tw-'))
        writeFileSync(join(dir, 'app.css'), '@import "tailwindcss";\n')
        writeFileSync(join(dir, 'a.html'), '<div class="flex p-4 hover:bg-red-500"></div>')
        const cwd = process.cwd()
        process.chdir(dir)
        const stderr = process.stderr.write
        process.stderr.write = (() => true) as typeof process.stderr.write
        try {
            expect(await runCli(['shorten', 'a.html', '--css', 'app.css', '--out-css', 'out/app.css', '--write'])).toBe(0)
        } finally {
            process.stderr.write = stderr
            process.chdir(cwd)
        }
        const html = readFileSync(join(dir, 'a.html'), 'utf8')
        const [flex, p4, hover] = /class="(\S+) (\S+) (\S+)"/.exec(html)!.slice(1)
        expect([flex, p4, hover].every((n) => /^[a-z][a-z0-9]*$/.test(n))).toBe(true)
        const css = readFileSync(join(dir, 'out/app.css'), 'utf8')
        expect(css).toMatch(new RegExp(`\\.${flex}\\s*\\{\\s*display:\\s*flex`))
        expect(css).toMatch(new RegExp(`\\.${hover}:hover`))
        expect(css).not.toContain('.flex')
    })
})
