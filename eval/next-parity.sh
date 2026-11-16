#!/usr/bin/env bash
# So ứng dụng Next.js thật build bằng @porbit/style/postcss với chính nó build bằng @tailwindcss/postcss.
#   bash eval/next-parity.sh [thư-mục-tạm]
# Cần mạng để cài next/react. In số phần tử có computed style giống hệt và số khác biệt thật (ngoài làm tròn 0,05 px).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=${1:-$(mktemp -d)}
mkdir -p "$WORK"
npm run build --prefix "$ROOT" >/dev/null
PKG=$(cd "$ROOT" && npm pack --pack-destination "$WORK" | tail -1)
for side in ours tw; do
  rm -rf "$WORK/$side" && cp -r "$ROOT/eval/fixtures/nextjs-app" "$WORK/$side"
  (cd "$WORK/$side" && echo '{"private":true}' > package.json && npm install --no-audit --no-fund next@15 react@19 react-dom@19 typescript@^5 @types/react @types/node tw-animate-css "$WORK/$PKG" >/dev/null)
done
(cd "$WORK/tw" && echo "export default { plugins: { '@tailwindcss/postcss': {} } }" > postcss.config.mjs && npm install --no-audit --no-fund @tailwindcss/postcss@4.3.5 tailwindcss@4.3.5 @tailwindcss/typography >/dev/null)
for side in ours tw; do (cd "$WORK/$side" && NEXT_TELEMETRY_DISABLED=1 npx next build >/dev/null); done
(cd "$WORK/ours" && NEXT_TELEMETRY_DISABLED=1 npx next start -p 3123 >/dev/null 2>&1 &)
(cd "$WORK/tw" && NEXT_TELEMETRY_DISABLED=1 npx next start -p 3124 >/dev/null 2>&1 &)
trap 'pkill -f "next start -p 312[34]" || true' EXIT
for side in ours tw; do echo "$side: $(gzip -c "$WORK/$side"/.next/static/css/*.css | wc -c) byte CSS gzip"; done
NODE_PATH="$ROOT/node_modules" node "$ROOT/eval/next-compare.cjs"
