import { describe, expect, it } from 'vitest'
import { buildMergeTable, clsx, createMerge, splitVariantPrefix } from '../src/merge'
import { cn, twMerge } from '../src/merge-entry'
import { tailwindV4Dialect } from '../src/tailwind-v4'

describe('gộp class xung đột', () => {
    it('như tailwind-merge với class Tailwind mặc định', () => {
        expect(cn('px-2 py-1 bg-red-500', true && 'p-4 bg-blue-500')).toBe('p-4 bg-blue-500')
        expect(twMerge('p-4 px-2')).toBe('p-4 px-2')
        expect(twMerge('shadow-md shadow-red-500')).toBe('shadow-md shadow-red-500')
        expect(twMerge('text-sm text-lg text-red-500')).toBe('text-lg text-red-500')
        expect(twMerge('hover:bg-red-500 bg-blue-500 hover:bg-green-500')).toBe('bg-blue-500 hover:bg-green-500')
        expect(twMerge('md:hover:p-2 hover:md:p-4')).toBe('hover:md:p-4')
        expect(twMerge('border border-2 border-red-500')).toBe('border-2 border-red-500')
        expect(twMerge('rounded-md rounded')).toBe('rounded')
        expect(twMerge('top-2 inset-0')).toBe('inset-0')
        expect(twMerge('!p-2 p-4')).toBe('!p-2 p-4')
        // v4: `text-sm` đọc `--tw-leading` nên `leading-6` vẫn có tác dụng.
        expect(twMerge('leading-6 text-sm')).toBe('leading-6 text-sm')
        // Class lạ giữ nguyên.
        expect(twMerge('btn px-2 btn')).toBe('btn px-2 btn')
        // Class x-css.
        expect(cn('p16 p24')).toBe('p24')
    })

    it('đúng theo theme/@utility của dự án mà không cần cấu hình thêm', () => {
        const dialect = tailwindV4Dialect({ theme: { '--text-hero': '3rem', '--text-hero--line-height': '1', '--text-tiny': '0.5rem', '--color-brand': '#0a64e8', '--spacing-gutter': '1.5rem' }, utilities: { 'tab-*': 'tab-size: --value(integer)' } })
        const merge = createMerge({ dialect })
        expect(merge('text-sm text-hero')).toBe('text-hero')
        // `text-tiny` không có `--text-tiny--line-height`: line-height của `text-sm` vẫn có tác dụng (như Tailwind).
        expect(merge('text-sm text-tiny')).toBe('text-sm text-tiny')
        expect(merge('text-hero text-brand')).toBe('text-hero text-brand')
        expect(merge('px-gutter px-2')).toBe('px-2')
        expect(merge('tab-4 tab-8')).toBe('tab-8')
    })

    it('bản lite + bảng sinh lúc build cho cùng kết quả', () => {
        const dialect = tailwindV4Dialect()
        const classes = ['px-2', 'py-1', 'p-4', 'bg-red-500', 'bg-blue-500', 'hover:bg-red-500', 'md:p-2', 'shadow-md', 'shadow-red-500']
        const table = buildMergeTable(classes, dialect)
        const lite = createMerge({ table })
        expect(lite(clsx('px-2 py-1 bg-red-500', 'p-4 bg-blue-500'))).toBe('p-4 bg-blue-500')
        expect(lite('shadow-md shadow-red-500')).toBe('shadow-md shadow-red-500')
        // Biến thể tách lúc chạy: tổ hợp chưa gặp lúc build vẫn gộp đúng.
        expect(lite('focus:md:p-2 md:focus:p-4')).toBe('md:focus:p-4')
        expect(splitVariantPrefix('md:hover:!p-4')).toEqual(['hover:md', true, 'p-4'])
    })

    it('clsx', () => {
        expect(clsx('a', false, null, ['b', ['c']], { d: true, e: false }, 0, 1)).toBe('a b c d 0 1')
    })
})
