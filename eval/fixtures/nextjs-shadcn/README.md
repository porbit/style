# Fixture: ứng dụng Next.js dùng shadcn/ui

Dùng cho `eval/next-short-classnames.sh` (đo `shortClassNames` của `@porbit/style/next` trên bản build Next.js thật).

- `app/page.tsx`: trang trưng bày ~30 component shadcn/ui (sáng và `.dark`), có `className` ghi đè qua `cn()` để kiểm tra
  tailwind-merge (`<Button size="sm" className="px-8 rounded-full">`...).
- `lib/utils.ts`, `hooks/use-mobile.ts`: như mẫu của shadcn/ui (MIT).
- Component (`components/ui/*.tsx`) và CSS (`app/globals.css`) được chép từ `eval/fixtures/shadcn-v4` lúc chạy.
