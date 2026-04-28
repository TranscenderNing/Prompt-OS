import { useEffect, useMemo, useRef, useState } from 'react'
import type { Prompt, Tag, VariableDef } from '../api'
import { Prompts, Tags, Render, IO } from '../api'
import type { LLMSettings } from '../App'

interface Props {
  prompt: Prompt | null
  allTags: Tag[]
  onChanged: () => void
  llm: LLMSettings
}

export default function Editor({ prompt, allTags, onChanged }: Props) {
  const [template, setTemplate] = useState('')
  const [variables, setVariables] = useState<VariableDef[]>([])
  const [rendered, setRendered] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const [values, setValues] = useState<Record<string, any>>({})
  const [commitMsg, setCommitMsg] = useState('')
  const [branch, setBranch] = useState('main')
  const taRef = useRef<HTMLTextAreaElement>(null)

  // 当切换 Prompt 时，重置编辑器
  useEffect(() => {
    if (!prompt?.current_version) {
      setTemplate(''); setVariables([]); setValues({}); setRendered(''); setBranch('main')
      return
    }
    const v = prompt.current_version
    setTemplate(v.template)
    setVariables(v.variables_schema || [])
    setBranch(v.branch)
    const vals: Record<string, any> = {}
    for (const def of v.variables_schema || []) vals[def.name] = def.default ?? ''
    setValues(vals)
  }, [prompt?.id, prompt?.current_version_id])

  // 自动渲染
  useEffect(() => {
    let live = true
    Render.render(template, values).then(r => {
      if (!live) return
      setRendered(r.rendered); setMissing(r.missing)
    }).catch(() => {})
    return () => { live = false }
  }, [template, values])

  // 监听素材插入
  useEffect(() => {
    const h = (e: any) => {
      const t = e.detail as string
      const el = taRef.current
      if (!el) { setTemplate(s => s + '\n' + t); return }
      const start = el.selectionStart, end = el.selectionEnd
      const next = template.slice(0, start) + t + template.slice(end)
      setTemplate(next)
      requestAnimationFrame(() => {
        el.focus()
        const pos = start + t.length
        el.setSelectionRange(pos, pos)
      })
    }
    window.addEventListener('promptos.insertSnippet', h)
    return () => window.removeEventListener('promptos.insertSnippet', h)
  }, [template])

  const highlightedTemplate = useMemo(() => {
    // 仅用于展示：在只读层上渲染 chip
    return template.replace(/\{\{\s*([a-zA-Z_][\w\.\-]*)\s*\}\}/g, (_m, name) =>
      `<span class="var-chip">{{${name}}}</span>`
    ).replace(/\n/g, '<br/>')
  }, [template])

  const extractVars = async () => {
    const r = await Render.extract(template)
    const known = new Map(variables.map(v => [v.name, v]))
    const next: VariableDef[] = r.variables.map(n => known.get(n) || { name: n, type: 'string', default: '', description: '' })
    setVariables(next)
    const nv: Record<string, any> = { ...values }
    for (const d of next) if (!(d.name in nv)) nv[d.name] = d.default ?? ''
    setValues(nv)
  }

  const commit = async () => {
    if (!prompt) return
    await Prompts.commit(prompt.id, {
      template, variables_schema: variables,
      commit_message: commitMsg || '更新',
      branch,
    })
    setCommitMsg('')
    onChanged()
  }

  const createBranch = async () => {
    if (!prompt?.current_version_id) return
    const name = window.prompt('新分支名（例如 dev/v2-试验）：')
    if (!name) return
    await Prompts.branch(prompt.id, {
      from_version_id: prompt.current_version_id,
      branch: name,
      commit_message: `从 ${branch} 创建`,
    })
    setBranch(name)
    onChanged()
  }

  const copy = () => {
    navigator.clipboard.writeText(rendered)
  }

  const toggleTag = async (t: Tag) => {
    if (!prompt) return
    const ids = new Set(prompt.tags.map(x => x.id))
    if (ids.has(t.id)) ids.delete(t.id); else ids.add(t.id)
    await Prompts.patch(prompt.id, { tag_ids: Array.from(ids) })
    onChanged()
  }

  const renameTitle = async () => {
    if (!prompt) return
    const name = window.prompt('新名称', prompt.name)
    if (!name) return
    await Prompts.patch(prompt.id, { name })
    onChanged()
  }

  const editDescription = async () => {
    if (!prompt) return
    const d = window.prompt('描述', prompt.description)
    if (d === null) return
    await Prompts.patch(prompt.id, { description: d })
    onChanged()
  }

  const addTag = async () => {
    const name = window.prompt('新标签名')
    if (!name) return
    await Tags.create({ name })
    onChanged()
  }

  if (!prompt) {
    return (
      <section className="flex-1 flex items-center justify-center text-ink-500">
        从左侧选一个 Prompt，或新建一个 👉
      </section>
    )
  }

  return (
    <section className="flex-1 min-w-0 flex flex-col border-r border-ink-800">
      <div className="p-3 border-b border-ink-800 flex items-center gap-3">
        <h2 className="font-semibold text-lg cursor-pointer" onClick={renameTitle} title="点击重命名">{prompt.name}</h2>
        <div className="text-sm text-ink-400 cursor-pointer" onClick={editDescription} title="点击编辑描述">
          {prompt.description || '点击添加描述'}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a className="btn btn-ghost" href={IO.exportMdUrl(prompt.id)} target="_blank" rel="noreferrer">导出 Markdown</a>
        </div>
      </div>

      {/* tags */}
      <div className="px-3 py-2 border-b border-ink-800 flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-ink-500">标签:</span>
        {allTags.map(t => {
          const active = prompt.tags.some(x => x.id === t.id)
          return (
            <button key={t.id}
              onClick={() => toggleTag(t)}
              className={`text-xs px-2 py-0.5 rounded border transition ${active ? 'text-white border-transparent' : 'text-ink-300 border-ink-700'}`}
              style={active ? { background: t.color } : { background: t.color + '22' }}
            >{t.name}</button>
          )
        })}
        <button className="text-xs text-indigo-400 ml-1" onClick={addTag}>+ 新标签</button>
      </div>

      {/* 编辑器 + 预览 */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-0">
        <div className="flex flex-col border-r border-ink-800 min-h-0">
          <div className="px-3 py-1.5 text-xs text-ink-400 flex items-center justify-between border-b border-ink-800">
            <span>模板（用 {'{{变量名}}'} 插入变量）</span>
            <button onClick={extractVars} className="text-indigo-400">⟳ 识别变量</button>
          </div>
          <textarea
            ref={taRef}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="flex-1 bg-ink-950 p-3 font-mono text-sm leading-relaxed resize-none scrollbar"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col min-h-0">
          <div className="px-3 py-1.5 text-xs text-ink-400 flex items-center justify-between border-b border-ink-800">
            <span>预览（已带变量高亮 / 渲染）</span>
            <button onClick={copy} className="text-indigo-400">📋 复制渲染结果</button>
          </div>
          <div className="flex-1 overflow-auto scrollbar p-3 space-y-3">
            <div className="card p-3 text-sm">
              <div className="text-xs text-ink-500 mb-2">模板高亮</div>
              <div className="font-mono whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightedTemplate }} />
            </div>
            <div className="card p-3 text-sm">
              <div className="text-xs text-ink-500 mb-2 flex items-center justify-between">
                <span>渲染结果</span>
                {missing.length > 0 && <span className="text-amber-400">缺失: {missing.join(', ')}</span>}
              </div>
              <pre className="font-mono whitespace-pre-wrap text-ink-100">{rendered || '（空）'}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* 提交栏 */}
      <div className="p-3 border-t border-ink-800 flex items-center gap-2 bg-ink-900">
        <span className="text-xs text-ink-400">分支</span>
        <input className="bg-ink-800 border border-ink-700 rounded px-2 py-1 text-sm w-40"
          value={branch} onChange={(e) => setBranch(e.target.value)} />
        <button className="btn btn-ghost" onClick={createBranch}>＋ 新分支</button>
        <input className="flex-1 bg-ink-800 border border-ink-700 rounded px-2 py-1 text-sm"
          placeholder="提交说明（例如：优化输出结构）"
          value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} />
        <button className="btn btn-primary" onClick={commit}>💾 提交新版本</button>
      </div>
    </section>
  )
}
