#!/usr/bin/env node
/**
 * Chấm điểm bộ đánh giá: mỗi thư mục trong eval/runs là một lượt viết giao diện cho
 * các nhiệm vụ trong tasks.json. Mỗi class được kiểm tra trên Chromium thật (có CSS.supports).
 *
 *   npm run build && node eval/score.cjs
 *   CHROMIUM_PATH=/đường/dẫn/chrome node eval/score.cjs   # nếu Playwright chưa tải trình duyệt
 *
 * Tên thư mục bắt đầu bằng `tailwind` được chấm với phương ngữ Tailwind bật.
 * Kết quả ghi ra eval/RESULTS.md.
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const analyze = require(path.join(dist, 'analyze.js'))
// Giống MCP/CLI: gợi ý sửa theo nghĩa Tailwind.
analyze.setTailwindFallback(require(path.join(dist, 'tailwind.js')).tailwindFixFallback)
const runsDir = path.join(__dirname, 'runs')

// Class đánh dấu của Tailwind (dùng cho group-*/peer-*/dark:) không sinh CSS theo thiết kế.
const MARKERS = new Set(['group', 'peer', 'dark'])

const classAttrs = (html) => [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1])

const validateInBrowser = async (page, tokens, tailwind) =>
    page.evaluate(async ({ tokens, tailwind }) => {
        const core = (await import('/index.mjs')).default
        const dialects = tailwind ? [(await import('/tailwind.mjs')).tailwindDialect()] : []
        const result = {}
        for (const token of tokens) {
            const engine = core.css({ silent: true, dialects }).buildCss(undefined)
            result[token] = engine.clsx(token) !== token
            engine.destroy()
        }
        return result
    }, { tokens, tailwind })

const declarations = (token) =>
    analyze.generateCssFor([token]).replace(/\.[^{]+\{/g, '{').replace(/\s+/g, '').toLowerCase()

const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : '—')

;(async () => {
    // CHROMIUM_PATH: dùng khi bản Chromium đi kèm @playwright/test của dự án chưa được tải.
    let browser = null
    for (const executablePath of [process.env.CHROMIUM_PATH, undefined, '/opt/pw-browsers/chromium']) {
        try {
            browser = await chromium.launch(executablePath ? { executablePath } : {})
            break
        } catch (error) {
            if (executablePath === '/opt/pw-browsers/chromium') throw error
        }
    }
    const page = await browser.newPage()
    await page.route('http://eval.local/**', (route) => {
        const url = new URL(route.request().url())
        if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' })
        route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(dist, url.pathname)) })
    })
    await page.goto('http://eval.local/')

    const rows = []
    const details = {}
    for (const run of fs.readdirSync(runsDir).sort()) {
        const tailwind = run.startsWith('tailwind')
        const files = fs.readdirSync(path.join(runsDir, run)).filter((f) => f.endsWith('.html')).sort()
        const attrs = files.flatMap((f) => classAttrs(fs.readFileSync(path.join(runsDir, run, f), 'utf8')))
        const tokens = attrs.flatMap((a) => a.split(/\s+/).filter((t) => t && !(tailwind && MARKERS.has(t))))
        const unique = [...new Set(tokens)]
        const valid = await validateInBrowser(page, unique, tailwind)
        const invalidTokens = unique.filter((t) => !valid[t])
        const invalidCount = tokens.filter((t) => !valid[t]).length
        const conflicts = tailwind ? [] : attrs.flatMap((a) => analyze.findClassConflicts(a))
        const row = {
            run,
            files: files.length,
            classes: tokens.length,
            chars: attrs.join(' ').length,
            valid: pct(tokens.length - invalidCount, tokens.length),
            conflicts: conflicts.length,
        }

        if (!tailwind) {
            // Lượt sửa tự động bằng fix_classes rồi chấm lại.
            const fixedAttrs = attrs.map((a) => analyze.fixClasses(a, { compact: false }).output)
            const fixedTokens = fixedAttrs.flatMap((a) => a.split(/\s+/).filter(Boolean))
            const fixedValid = await validateInBrowser(page, [...new Set(fixedTokens)], false)
            const stillInvalid = fixedTokens.filter((t) => !fixedValid[t]).length
            row.validAfterFix = pct(fixedTokens.length - stillInvalid, fixedTokens.length)
            details[run] = { invalid: invalidTokens, invalidAfterFix: [...new Set(fixedTokens.filter((t) => !fixedValid[t]))], conflicts }
        } else {
            row.validAfterFix = '—'
            details[run] = { invalid: invalidTokens }
        }
        rows.push(row)
    }

    // Tập lỗi hay gặp: fix_classes sửa đúng bao nhiêu. `mistakes.json` và `mistakes-tuning-v1.json`
    // đã được dùng để chỉnh bộ sửa; `mistakes-holdout.json` viết sau cùng và KHÔNG dùng để chỉnh.
    const scoreMistakes = (file) =>
        JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8')).map(([input, expected]) => {
            const fixed = analyze.fixClasses(input, { compact: false })
            // Đúng khi bản sửa sinh cùng declaration với đáp án (không phân biệt hoa thường),
            // vì nhiều cách viết x-css cho cùng một CSS (`lsN` và `lsNone`).
            const ok = expected === null
                ? fixed.output === input && fixed.unresolved.includes(input)
                : fixed.output === expected || (declarations(fixed.output) !== '' && declarations(fixed.output) === declarations(expected))
            return { input, expected, got: fixed.output, ok }
        })
    const mistakeResults = scoreMistakes('mistakes.json')
    const mistakeOk = mistakeResults.filter((m) => m.ok).length
    const tuningResults = scoreMistakes('mistakes-tuning-v1.json')
    const tuningOk = tuningResults.filter((m) => m.ok).length
    const holdoutResults = scoreMistakes('mistakes-holdout.json')
    const holdoutOk = holdoutResults.filter((m) => m.ok).length
    await browser.close()

    const lines = [
        '# Kết Quả Đánh Giá',
        '',
        `Chạy: \`node eval/score.cjs\` (Chromium, phiên bản ${require(path.join(root, 'package.json')).version}). Mỗi class được coi là hợp lệ khi engine sinh được CSS và trình duyệt chấp nhận declaration/selector.`,
        '',
        '| Lượt | File | Class | Ký tự class | Hợp lệ | Hợp lệ sau `fix_classes` | Nhóm xung đột |',
        '| :--- | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...rows.map((r) => `| ${r.run} | ${r.files} | ${r.classes} | ${r.chars} | ${r.valid} | ${r.validAfterFix} | ${r.conflicts} |`),
        '',
        `Tập lỗi dùng để chỉnh bộ sửa (\`mistakes.json\`): \`fix_classes\` sửa đúng **${mistakeOk}/${mistakeResults.length}** (${pct(mistakeOk, mistakeResults.length)}).`,
        '',
        `Tập kiểm tra v1 (\`mistakes-tuning-v1.json\`; ban đầu độc lập, đạt 8/21 trước khi chỉnh, sau đó đã dùng để chỉnh): **${tuningOk}/${tuningResults.length}** (${pct(tuningOk, tuningResults.length)}).`,
        '',
        `Tập kiểm tra độc lập v2 (\`mistakes-holdout.json\`, viết sau cùng, không dùng khi chỉnh): **${holdoutOk}/${holdoutResults.length}** (${pct(holdoutOk, holdoutResults.length)}).`,
        '',
        '## Chi tiết',
        '',
        ...Object.entries(details).flatMap(([run, d]) => [
            `### ${run}`,
            '',
            `- Class không hợp lệ: ${d.invalid.length ? d.invalid.map((t) => '`' + t + '`').join(', ') : 'không có'}`,
            ...(d.invalidAfterFix ? [`- Còn lại sau sửa: ${d.invalidAfterFix.length ? d.invalidAfterFix.map((t) => '`' + t + '`').join(', ') : 'không có'}`] : []),
            ...(d.conflicts && d.conflicts.length ? [`- Xung đột: ${d.conflicts.map((c) => c.tokens.join(' ')).join('; ')}`] : []),
            '',
        ]),
        '### Tập lỗi chưa sửa đúng',
        '',
        ...mistakeResults.filter((m) => !m.ok).map((m) => `- \`${m.input}\` → \`${m.got}\` (mong đợi \`${m.expected}\`)`),
        '',
        '### Tập kiểm tra độc lập chưa sửa đúng',
        '',
        ...holdoutResults.filter((m) => !m.ok).map((m) => `- \`${m.input}\` → \`${m.got}\` (mong đợi \`${m.expected}\`)`),
        '',
    ]
    fs.writeFileSync(path.join(__dirname, 'RESULTS.md'), lines.join('\n'))
    // Số liệu dạng máy đọc cho cổng kiểm tra (scripts/check-all.cjs).
    const num = (text) => (typeof text === 'string' && text.endsWith('%') ? Number(text.slice(0, -1)) : null)
    const xcssRow = rows.find((r) => !r.run.startsWith('tailwind'))
    const tailwindRow = rows.find((r) => r.run.startsWith('tailwind'))
    fs.writeFileSync(
        path.join(__dirname, 'results.json'),
        JSON.stringify({
            xcssValid: num(xcssRow?.valid),
            xcssValidAfterFix: num(xcssRow?.validAfterFix),
            tailwindValid: num(tailwindRow?.valid),
            holdout: Number(((100 * holdoutOk) / holdoutResults.length).toFixed(1)),
            tuning: Number(((100 * mistakeOk) / mistakeResults.length).toFixed(1)),
        }, null, 2) + '\n',
    )
    console.log(lines.slice(4, 4 + rows.length + 8).join('\n'))
})().catch((error) => {
    console.error(error)
    process.exit(1)
})
