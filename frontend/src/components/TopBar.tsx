import { IO } from '../api'

interface Props {
  onAI: () => void
  onSnippets: () => void
  onSettings: () => void
  onRefresh: () => void
}

export default function TopBar({ onAI, onSnippets, onSettings, onRefresh }: Props) {
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    await IO.import(f)
    alert('导入完成')
    onRefresh()
    e.target.value = ''
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-ink-800 bg-ink-900">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center font-bold text-sm">P</div>
        <div>
          <div className="font-semibold text-ink-50">PromptOS</div>
          <div className="text-xs text-ink-400">Prompt 操作系统 · v0.1</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost" onClick={onSnippets}>📚 素材库</button>
        <button className="btn btn-primary" onClick={onAI}>✨ AI 生成 Prompt</button>
        <a className="btn btn-ghost" href={IO.exportUrl}>↓ 导出</a>
        <label className="btn btn-ghost cursor-pointer">
          ↑ 导入
          <input type="file" accept="application/json" className="hidden" onChange={onImport} />
        </label>
        <button className="btn btn-ghost" onClick={onSettings}>⚙ 设置</button>
      </div>
    </header>
  )
}
