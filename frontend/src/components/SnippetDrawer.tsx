import { useEffect, useState } from 'react'
import type { Snippet } from '../api'
import { Snippets } from '../api'

interface Props {
  onClose: () => void
  onInsert: (text: string) => void
}

export default function SnippetDrawer({ onClose, onInsert }: Props) {
  const [items, setItems] = useState<Snippet[]>([])
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [q, setQ] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [nf, setNf] = useState({ category: 'lens', title: '', content: '' })

  const load = async () => setItems(await Snippets.list(category, q))
  useEffect(() => { load() }, [category, q])

  const categories = Array.from(new Set(items.map(i => i.category)))

  const create = async () => {
    if (!nf.title || !nf.content) return
    await Snippets.create({ ...nf, tag_ids: [] })
    setNf({ category: 'lens', title: '', content: '' })
    setShowNew(false)
    await load()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="w-[480px] h-full bg-ink-900 border-l border-ink-800 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-3 border-b border-ink-800 flex items-center justify-between">
          <h3 className="font-semibold">📚 素材库</h3>
          <button onClick={onClose} className="text-ink-400">✕</button>
        </div>
        <div className="p-3 space-y-2 border-b border-ink-800">
          <input className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1.5 text-sm"
            placeholder="搜索..."
            value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setCategory(undefined)}
              className={`text-xs px-2 py-0.5 rounded border ${!category ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-ink-800 border-ink-700 text-ink-300'}`}>全部</button>
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`text-xs px-2 py-0.5 rounded border ${category === c ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-ink-800 border-ink-700 text-ink-300'}`}>{c}</button>
            ))}
          </div>
          <button className="btn btn-ghost w-full" onClick={() => setShowNew(!showNew)}>
            {showNew ? '收起' : '＋ 新建素材'}
          </button>
          {showNew && (
            <div className="space-y-2 border-t border-ink-800 pt-2">
              <input className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs"
                placeholder="category（如 lens / style / tone / keyword）"
                value={nf.category} onChange={(e) => setNf({ ...nf, category: e.target.value })} />
              <input className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs"
                placeholder="标题" value={nf.title} onChange={(e) => setNf({ ...nf, title: e.target.value })} />
              <textarea className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs" rows={3}
                placeholder="内容" value={nf.content} onChange={(e) => setNf({ ...nf, content: e.target.value })} />
              <button className="btn btn-primary w-full" onClick={create}>保存</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto scrollbar p-3 space-y-2">
          {items.map(s => (
            <div key={s.id} className="card p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{s.title}</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-800 text-ink-400">{s.category}</span>
              </div>
              <pre className="mt-1 text-xs font-mono whitespace-pre-wrap text-ink-300">{s.content}</pre>
              <div className="mt-2 flex gap-2">
                <button className="btn btn-primary !py-1 !text-xs" onClick={() => onInsert(s.content)}>插入到编辑器</button>
                <button className="btn btn-ghost !py-1 !text-xs" onClick={() => navigator.clipboard.writeText(s.content)}>复制</button>
                <button className="btn btn-danger !py-1 !text-xs ml-auto" onClick={async () => {
                  if (confirm('删除？')) { await Snippets.del(s.id); load() }
                }}>删除</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-ink-500 text-sm text-center py-10">暂无素材</div>}
        </div>
      </div>
    </div>
  )
}
