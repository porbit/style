/**
 * Quy tắc rút gọn cho agent AI viết class @porbit/style. Dùng chung cho:
 * `presence-style init --agents` (AGENTS.md), `llms.txt` và prompt MCP `build_ui`.
 */
export const AGENT_RULES = `## Viết class @porbit/style (x-css)

Cú pháp: \`[media:][layer]property value[@selector]\`, ví dụ \`md:2bgc#0a64e8@:hover\`.

1. Property là alias chữ thường liền nhau (\`bgc\`, \`fns\`, \`bdra\`) hoặc tên CSS đầy đủ (\`view-transition-name[hero]\`, \`--brand[#fff]\`).
2. Value dạng chữ viết hoa ký tự đầu: \`dF\` (flex), \`aiC\` (center), \`posA\` (absolute), \`jcSp\` (space-between). Không viết \`df\`.
3. Khoảng trắng trong value: \`;\` (\`p8px;16px\`) hoặc \`_\` trong \`[]\` (\`w[calc(100%_-_2rem)]\`, \`bxsh[0_1px_2px_rgba(0,0,0,.1)]\`).
4. Trạng thái là hậu tố: \`cRed@:hover\`, \`opc.5@:disabled\`, \`c#999@::placeholder\`. Không viết \`hover:cRed\`.
5. Breakpoint mobile-first: \`sm: md: lg: xl: 2xl:\` (min-width); \`sma: mda: lga: xla:\` (max-width).
6. Biến CSS: \`bgc--brand\` → \`background-color: var(--brand)\`.
7. Ưu tiên bằng layer (số trước property): \`2bdra999px\` thắng \`bdra8px\` ở mọi thứ tự. Không đặt hai class cùng property, cùng layer, cùng media trên một phần tử.

Alias hay nhầm: font-size \`fns\` (không phải \`fz\`/\`fs\`), font-weight \`fnw\`, opacity \`opc\` (\`op\` là object-position), transition \`tran\`, min-height \`mih\`, max-height \`mh\`, max-width \`mw\`, z-index \`z\`, cursor \`cr\` (\`crP\` = pointer), text-transform \`ttr\`, border-radius \`bdra\`, box-shadow \`bxsh\`, outline \`oli\`.

Hay dùng: \`dF dG dN dB dIF\` · \`fxdC fxw[wrap] fx1\` · \`aiC jcC jcSp gap16px\` · \`gtc[repeat(3,minmax(0,1fr))]\` · \`w100% mw1200px h40px mih100vh\` · \`m0;auto p16px px16px py8px\` · \`posR posA t0 l0 i0 z10\` · \`c#0f172a bgc#fff bd[1px_solid_#e2e8f0] bdra8px\` · \`fns14px fnw600 lh1.5 taC\` · \`bxsh[...] opc.8 tran[all_.15s] crP oflH\`.

Nếu dự án bật phương ngữ Tailwind (\`dialects: [tailwindDialect()]\`), class Tailwind như \`flex items-center p-4 hover:bg-slate-50\` cũng chạy.

Có MCP server \`presence-style\`: gọi \`fix_classes\` cho mọi chuỗi class tự viết trước khi trả code; tra alias bằng \`lookup_dictionary\`; lấy component mẫu bằng \`get_component\`. Không có MCP: chạy \`npx presence-style check <thư-mục>\` để soát lỗi.
`
