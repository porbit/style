export default function Page() {
  return (
    <main className="mx-auto max-w-3xl p-8 md:p-12">
      <h1 id="h" className="text-3xl font-bold tracking-tight text-brand">Xin chào</h1>
      <p id="p" className="p-2 pr-6 mt-4 text-sm/6 text-gray-600">Đoạn văn</p>
      <button id="b" className="btn">Nút</button>
      <div id="t" className="tab-8 data-open:fade-in-50" data-state="open">t</div>
      <article id="a" className="prose mt-8"><h2>Tiêu đề</h2><p>Nội dung</p></article>
      <div id="g" className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">x</div>
    </main>
  )
}
