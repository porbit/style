/** `@porbit/style/tailwind`: Tailwind migration helper tách riêng khỏi lõi runtime. */
export * from './tailwind'
export * from './tailwind-readiness'
export { compactClassToken, compactClasses, findClassConflicts } from './class-tools'
export { parseTailwindStylesheet, tailwindV4Dialect, TAILWIND_DATA_VERSION, type TailwindV4DialectOptions } from './tailwind-v4'
