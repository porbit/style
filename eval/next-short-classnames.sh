#!/usr/bin/env bash
# Đo `shortClassNames` của `@porbit/style/next` trên ứng dụng Next.js thật: build production có và không rút gọn tên
# class, so computed style toàn trang bằng Chromium (eval/next-short-compare.cjs) và kích thước CSS/JS/HTML/RSC.
#   bash eval/next-short-classnames.sh [thư-mục-tạm]
#   NEXT_VERSION=15.5 BUNDLERS=webpack bash eval/next-short-classnames.sh
# Biến môi trường:
#   NEXT_VERSION  phiên bản next cài vào thư mục tạm (mặc định `latest`; không thêm vào package.json của gói)
#   BUNDLERS      bundler cần đo, cách nhau bởi dấu cách (mặc định "turbopack webpack"). Next 16+: `next build` là
#                 Turbopack, `next build --webpack`; Next 15: `next build` là webpack, `next build --turbopack`.
#   VARIANTS      biến thể so với bản gốc (mặc định "short nomerge")
#   APPS          ứng dụng (mặc định "nextjs-app shadcn")
# Cần mạng để cài next/react và thư viện của shadcn/ui. Hai ứng dụng:
#   nextjs-app    eval/fixtures/nextjs-app (CSS có @apply, @utility, @plugin typography, tw-animate-css)
#   shadcn        eval/fixtures/nextjs-shadcn + component của eval/fixtures/shadcn-v4 (dùng tailwind-merge)
# Mỗi ứng dụng × bundler ba bản: gốc, rút gọn (mặc định: bảo vệ tailwind-merge), rút gọn với `merge: false` (để thấy
# vì sao phải bảo vệ: class ghi đè qua `cn()` bị tailwind-merge xử lý khác khi tên đã đổi).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=${1:-$(mktemp -d)}
WORK=$(mkdir -p "$WORK" && cd "$WORK" && pwd)
NEXT_VERSION=${NEXT_VERSION:-latest}
BUNDLERS=${BUNDLERS:-turbopack webpack}
VARIANTS=${VARIANTS:-short nomerge}
APPS=${APPS:-nextjs-app shadcn}
npm run build --prefix "$ROOT" >/dev/null 2>&1
PKG=$(cd "$ROOT" && npm pack --pack-destination "$WORK" 2>/dev/null | tail -1)
DEPS="$WORK/deps"
mkdir -p "$DEPS"
(cd "$DEPS" && echo '{"private":true}' > package.json && npm install --no-audit --no-fund "next@$NEXT_VERSION" react@19 react-dom@19 typescript@^5 @types/react @types/node \
  tw-animate-css radix-ui lucide-react class-variance-authority clsx tailwind-merge cmdk vaul sonner react-resizable-panels \
  react-hook-form react-day-picker next-themes input-otp embla-carousel-react recharts "$WORK/$PKG" >/dev/null)
NEXT_MAJOR=$(node -p "require('$DEPS/node_modules/next/package.json').version.split('.')[0]")
echo "Next.js $(node -p "require('$DEPS/node_modules/next/package.json').version")"

build_flag() { # build_flag <bundler>: cờ `next build` chọn bundler theo phiên bản
  if [ "$1" = turbopack ]; then [ "$NEXT_MAJOR" -ge 16 ] || echo --turbopack
  else [ "$NEXT_MAJOR" -lt 16 ] || echo --webpack
  fi
}

prepare() { # prepare <ứng-dụng> <đích>
  rm -rf "$2" && mkdir -p "$2"
  if [ "$1" = nextjs-app ]; then
    cp -r "$ROOT/eval/fixtures/nextjs-app/." "$2/"
  else
    cp -r "$ROOT/eval/fixtures/nextjs-shadcn/." "$2/" && rm "$2/README.md"
    mkdir -p "$2/components/ui"
    cp "$ROOT/eval/fixtures/shadcn-v4/app.css" "$2/app/globals.css"
    cp "$ROOT/eval/fixtures/shadcn-v4/shadcn-tailwind.css" "$2/app/"
    for f in "$ROOT"/eval/fixtures/shadcn-v4/ui/*.tsx; do
      sed -e 's#from "cn"#from "@/lib/utils"#' -e 's#@/registry/new-york-v4/ui/#@/components/ui/#' -e 's#@/registry/new-york-v4/hooks/#@/hooks/#' "$f" > "$2/components/ui/$(basename "$f")"
    done
    echo '{"compilerOptions":{"target":"ES2017","lib":["dom","dom.iterable","esnext"],"allowJs":true,"skipLibCheck":true,"strict":false,"noEmit":true,"esModuleInterop":true,"module":"esnext","moduleResolution":"bundler","resolveJsonModule":true,"isolatedModules":true,"jsx":"preserve","incremental":true,"plugins":[{"name":"next"}],"paths":{"@/*":["./*"]}},"include":["next-env.d.ts","**/*.ts","**/*.tsx"],"exclude":["node_modules"]}' > "$2/tsconfig.json"
    echo "export default { plugins: { '@porbit/style/postcss': {} } }" > "$2/postcss.config.mjs"
  fi
  echo '{"private":true}' > "$2/package.json"
  ln -s "$DEPS/node_modules" "$2/node_modules"
  # node_modules là liên kết ra ngoài ứng dụng: Turbopack chỉ đọc file dưới `turbopack.root`.
  printf "export default { turbopack: { root: '%s' } }\n" "$WORK" > "$2/next.config.mjs"
}

serve_compare() { # serve_compare <gốc> <biến-thể> <tên>
  (cd "$1" && NEXT_TELEMETRY_DISABLED=1 exec npx next start -p 3201 >/dev/null 2>&1) &
  (cd "$2" && NEXT_TELEMETRY_DISABLED=1 exec npx next start -p 3202 >/dev/null 2>&1) &
  local code=0
  NODE_PATH="$ROOT/node_modules" node "$ROOT/eval/next-short-compare.cjs" --a=http://localhost:3201 --b=http://localhost:3202 --dir-a="$1/.next" --dir-b="$2/.next" --json="$WORK/$3.json" || code=$?
  pkill -f next-server || true
  sleep 1
  return $code
}
trap 'pkill -f next-server || true' EXIT

STATUS=0
for app in $APPS; do
  for bundler in $BUNDLERS; do
    flag=$(build_flag "$bundler")
    for variant in plain $VARIANTS; do
      dir="$WORK/$app-$bundler-$variant"
      prepare "$app" "$dir"
      case $variant in
        short) config='{ shortClassNames: true }' ;;
        nomerge) config='{ shortClassNames: { merge: false } }' ;;
      esac
      if [ "$variant" != plain ]; then
        printf "import { withPresenceStyle } from '@porbit/style/next'\nexport default withPresenceStyle({ turbopack: { root: '%s' } }, %s)\n" "$WORK" "$config" > "$dir/next.config.mjs"
        echo "export default { plugins: { '@porbit/style/postcss': { shortClassNames: true } } }" > "$dir/postcss.config.mjs"
      fi
      (cd "$dir" && NEXT_TELEMETRY_DISABLED=1 npx next build $flag >"$dir/build.log" 2>&1) || { echo "✗ build lỗi: $dir (xem build.log)"; tail -20 "$dir/build.log"; exit 1; }
    done
    for variant in $VARIANTS; do
      echo "== $app ($bundler): gốc vs $variant"
      if [ "$variant" = short ]; then
        serve_compare "$WORK/$app-$bundler-plain" "$WORK/$app-$bundler-$variant" "$app-$bundler-$variant" || STATUS=1
      else
        serve_compare "$WORK/$app-$bundler-plain" "$WORK/$app-$bundler-$variant" "$app-$bundler-$variant" || true
      fi
    done
  done
done
exit $STATUS
