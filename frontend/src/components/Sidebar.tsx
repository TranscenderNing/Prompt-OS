import type { Prompt, Tag } from '../api'

interface Props {
  prompts: Prompt[]
  tags: Tag[]
  selectedId: number | null
  onSelect: (id: number) => void
  query: string
  onQuery: (q: string) => void
  useCase?: string
  onUseCase: (v?: string) => void
  onCreate: () => void
  onDelete: (id: number) => void
}

const CASES = [
  { key: undefined, label: '全部' },
  { key: 'general', label: '通用' },
  { key: 'dev', label: '开发' },
  { key: 'content', label: '创作' },
  { key: 'enterprise', label: '企业' },
]

export default function Sidebar({
  prompts, selectedId, onSelect, query, onQuery, useCase, onUseCase, onCreate, onDelete,
}: Props) {
  return (
    <aside className="w-72 shrink-0 border-r border-ink-800 bg-ink-900 flex flex-col">
      <div className="p-3 space-y-2 border-b border-ink-800">
        <button className="btn btn-primary w-full" onClick={onCreate}>+ 新建 Prompt</button>
        <input
          className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1.5 text-sm"
          placeholder="搜索 name / 描述 / 标签 / 模板..."
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {CASES.map(c => (
            <button
              key={c.label}
              onClick={() => onUseCase(c.key)}
              className={`px-2 py-0.5 rounded text-xs border ${useCase === c.key ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-ink-800 border-ink-700 text-ink-300'}`}
            >{c.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar">
        {prompts.length === 0 && (
          <div className="p-6 text-center text-sm text-ink-500">
            还没有 Prompt，点上面 + 新建，或用 AI 生成。
          </div>
        )}
        {prompts.map(p => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`group px-3 py-2.5 border-b border-ink-800 cursor-pointer ${selectedId === p.id ? 'bg-ink-800' : 'hover:bg-ink-800/50'}`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium truncate text-ink-100">{p.name}</div>
              <button
                className="opacity-0 group-hover:opacity-100 text-rose-400 text-xs"
                onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
                title="删除"
              >✕</button>
            </div>
            {p.description && (
              <div className="text-xs text-ink-400 truncate mt-0.5">{p.description}</div>
            )}
            <div className="flex gap-1 mt-1 flex-wrap">
              {p.tags.map(t => (
                <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: t.color + '33', color: t.color }}>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 text-xs text-ink-500 border-t border-ink-800">
        共 {prompts.length} 个
      </div>
    </aside>
  )
}
