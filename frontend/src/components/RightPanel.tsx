import { useEffect, useState } from 'react'
import type { Prompt, Version, VariableDef, DebugRun } from '../api'
import { Prompts, Render, Debug } from '../api'
import type { LLMSettings } from '../App'

interface Props {
  prompt: Prompt | null
  onChanged: () => void
  llm: LLMSettings
}

type Tab = 'params' | 'versions' | 'debug'

export default function RightPanel({ prompt, onChanged, llm }: Props) {
  const [tab, setTab] = useState<Tab>('params')
  if (!prompt) return <aside className="w-[380px] shrink-0 bg-ink-900" />

  return (
    <aside className="w-[420px] shrink-0 bg-ink-900 flex flex-col">
      <div className="flex border-b border-ink-800">
        {([
          ['params', '🧩 参数'],
          ['versions', '🌳 版本树'],
          ['debug', '🧪 调试台'],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 py-2 text-sm ${tab === k ? 'bg-ink-800 text-white border-b-2 border-indigo-500' : 'text-ink-400 hover:text-ink-200'}`}
          >{label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto scrollbar">
        {tab === 'params' && <ParamsPanel prompt={prompt} onChanged={onChanged} />}
        {tab === 'versions' && <VersionsPanel prompt={prompt} onChanged={onChanged} />}
        {tab === 'debug' && <DebugPanel prompt={prompt} llm={llm} />}
      </div>
    </aside>
  )
}

// ---- 参数面板 ----
function ParamsPanel({ prompt, onChanged }: { prompt: Prompt; onChanged: () => void }) {
  const v = prompt.current_version
  const [defs, setDefs] = useState<VariableDef[]>(v?.variables_schema || [])
  const [vals, setVals] = useState<Record<string, any>>({})
  const [preview, setPreview] = useState('')

  useEffect(() => {
    setDefs(v?.variables_schema || [])
    const init: Record<string, any> = {}
    for (const d of v?.variables_schema || []) init[d.name] = d.default ?? ''
    setVals(init)
  }, [v?.id])

  useEffect(() => {
    if (!v) return
    Render.render(v.template, vals).then(r => setPreview(r.rendered))
  }, [v?.id, vals, v?.template])

  const updateDef = (i: number, patch: Partial<VariableDef>) => {
    const next = [...defs]; next[i] = { ...next[i], ...patch }; setDefs(next)
  }

  const saveSchema = async () => {
    if (!v) return
    await Prompts.commit(prompt.id, {
      template: v.template, variables_schema: defs,
      commit_message: '更新变量 schema', branch: v.branch,
    })
    onChanged()
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-xs text-ink-500">
        编辑每个变量的默认值、类型、描述；右下「保存 schema」后会创建新版本。
      </div>
      {defs.length === 0 && <div className="text-sm text-ink-400">当前模板没有变量。使用 {'{{变量名}}'} 后，在编辑器点「识别变量」生成。</div>}
      {defs.map((d, i) => (
        <div key={d.name} className="card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="var-chip">{`{{${d.name}}}`}</span>
            <select
              value={d.type}
              onChange={(e) => updateDef(i, { type: e.target.value })}
              className="bg-ink-800 border border-ink-700 rounded text-xs px-1.5 py-0.5"
            >
              <option value="string">string</option>
              <option value="textarea">textarea</option>
              <option value="number">number</option>
              <option value="enum">enum</option>
            </select>
          </div>
          <input className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs"
            placeholder="描述"
            value={d.description || ''}
            onChange={(e) => updateDef(i, { description: e.target.value })} />
          {d.type === 'enum' && (
            <input className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs"
              placeholder="选项（逗号分隔）"
              value={(d.options || []).join(',')}
              onChange={(e) => updateDef(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
          )}
          <div>
            <div className="text-[11px] text-ink-500 mb-1">当前值</div>
            {d.type === 'textarea' ? (
              <textarea className="w-full bg-ink-800 border border-ink-700 rounded p-2 text-sm" rows={3}
                value={vals[d.name] ?? ''} onChange={(e) => setVals({ ...vals, [d.name]: e.target.value })} />
            ) : d.type === 'enum' ? (
              <select className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-sm"
                value={vals[d.name] ?? ''} onChange={(e) => setVals({ ...vals, [d.name]: e.target.value })}>
                <option value="">-- 请选择 --</option>
                {(d.options || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-sm"
                type={d.type === 'number' ? 'number' : 'text'}
                value={vals[d.name] ?? ''} onChange={(e) => setVals({ ...vals, [d.name]: e.target.value })} />
            )}
          </div>
        </div>
      ))}

      {defs.length > 0 && (
        <button className="btn btn-primary w-full" onClick={saveSchema}>💾 保存 schema（创建新版本）</button>
      )}

      <div className="card p-3">
        <div className="text-xs text-ink-500 mb-1">即时预览</div>
        <pre className="text-xs font-mono whitespace-pre-wrap text-ink-100 max-h-60 overflow-auto scrollbar">{preview}</pre>
        <button className="btn btn-ghost w-full mt-2" onClick={() => navigator.clipboard.writeText(preview)}>📋 复制</button>
      </div>
    </div>
  )
}

// ---- 版本树 ----
function VersionsPanel({ prompt, onChanged }: { prompt: Prompt; onChanged: () => void }) {
  const [versions, setVersions] = useState<Version[]>([])
  useEffect(() => { Prompts.versions(prompt.id).then(setVersions) }, [prompt.id, prompt.current_version_id])

  // 按分支分组
  const byBranch = versions.reduce<Record<string, Version[]>>((acc, v) => {
    (acc[v.branch] ||= []).push(v); return acc
  }, {})

  const checkout = async (vid: number) => {
    await Prompts.checkout(prompt.id, vid); onChanged()
  }

  return (
    <div className="p-3 space-y-4">
      {Object.keys(byBranch).length === 0 && <div className="text-sm text-ink-400">还没有版本记录</div>}
      {Object.entries(byBranch).map(([br, list]) => (
        <div key={br}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300">🌿 {br}</span>
            <span className="text-xs text-ink-500">{list.length} 个提交</span>
          </div>
          <div className="relative pl-4 border-l-2 border-ink-700 space-y-2">
            {list.slice().reverse().map(v => {
              const active = prompt.current_version_id === v.id
              return (
                <div key={v.id} className={`card p-2.5 ${active ? 'border-indigo-500' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-mono">v{v.version_no} · #{v.id}</div>
                    {active
                      ? <span className="text-xs text-indigo-400">● HEAD</span>
                      : <button className="text-xs text-indigo-400" onClick={() => checkout(v.id)}>切换到此版本</button>}
                  </div>
                  <div className="text-xs text-ink-300 mt-0.5">{v.commit_message || '(无说明)'}</div>
                  <div className="text-[10px] text-ink-500 mt-1">{new Date(v.created_at).toLocaleString()}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- 调试台 ----
function DebugPanel({ prompt, llm }: { prompt: Prompt; llm: LLMSettings }) {
  const v = prompt.current_version
  const [vals, setVals] = useState<Record<string, any>>({})
  const [rendered, setRendered] = useState('')
  const [configs, setConfigs] = useState<Array<{ model: string; temperature: number; max_tokens: number }>>([
    { model: llm.model || 'gpt-4o-mini', temperature: 0.7, max_tokens: 1024 },
  ])
  const [runs, setRuns] = useState<Record<number, DebugRun | 'loading' | undefined>>({})
  const [history, setHistory] = useState<DebugRun[]>([])

  useEffect(() => {
    const init: Record<string, any> = {}
    for (const d of v?.variables_schema || []) init[d.name] = d.default ?? ''
    setVals(init)
  }, [v?.id])

  useEffect(() => {
    if (!v) return
    Render.render(v.template, vals).then(r => setRendered(r.rendered))
  }, [v?.id, vals, v?.template])

  useEffect(() => {
    if (!v) return
    Debug.history(v.id).then(setHistory)
  }, [v?.id])

  const runOne = async (idx: number) => {
    if (!v) return
    const cfg = configs[idx]
    setRuns(prev => ({ ...prev, [idx]: 'loading' }))
    const r = await Debug.run({
      prompt_version_id: v.id,
      rendered,
      model: cfg.model,
      temperature: cfg.temperature,
      max_tokens: cfg.max_tokens,
      base_url: llm.base_url || undefined,
      api_key: llm.api_key || undefined,
    })
    setRuns(prev => ({ ...prev, [idx]: r }))
    Debug.history(v.id).then(setHistory)
  }

  const runAll = () => configs.forEach((_, i) => runOne(i))

  const addConfig = () => setConfigs([...configs, { model: llm.model || 'gpt-4o-mini', temperature: 0.7, max_tokens: 1024 }])
  const updateCfg = (i: number, patch: any) => setConfigs(configs.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  const removeCfg = (i: number) => setConfigs(configs.filter((_, idx) => idx !== i))

  return (
    <div className="p-3 space-y-3">
      {(v?.variables_schema || []).length > 0 && (
        <div className="card p-3 space-y-2">
          <div className="text-xs text-ink-500">快速填值</div>
          {(v?.variables_schema || []).map(d => (
            <div key={d.name}>
              <label className="text-xs text-ink-400">{d.name}</label>
              {d.type === 'textarea' ? (
                <textarea className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs" rows={2}
                  value={vals[d.name] ?? ''} onChange={(e) => setVals({ ...vals, [d.name]: e.target.value })} />
              ) : (
                <input className="w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs"
                  value={vals[d.name] ?? ''} onChange={(e) => setVals({ ...vals, [d.name]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card p-3">
        <div className="text-xs text-ink-500 mb-1">最终发送内容</div>
        <pre className="text-xs font-mono whitespace-pre-wrap text-ink-200 max-h-32 overflow-auto scrollbar">{rendered}</pre>
      </div>

      <div className="space-y-2">
        {configs.map((c, i) => (
          <div key={i} className="card p-2 space-y-2">
            <div className="flex items-center gap-2">
              <input className="flex-1 bg-ink-800 border border-ink-700 rounded px-2 py-1 text-xs font-mono"
                value={c.model} onChange={(e) => updateCfg(i, { model: e.target.value })} placeholder="模型名" />
              <label className="text-xs text-ink-400">T</label>
              <input type="number" step="0.1" min={0} max={2} className="w-14 bg-ink-800 border border-ink-700 rounded px-1 py-1 text-xs"
                value={c.temperature} onChange={(e) => updateCfg(i, { temperature: parseFloat(e.target.value) })} />
              <label className="text-xs text-ink-400">max</label>
              <input type="number" className="w-20 bg-ink-800 border border-ink-700 rounded px-1 py-1 text-xs"
                value={c.max_tokens} onChange={(e) => updateCfg(i, { max_tokens: parseInt(e.target.value || '0') })} />
              <button className="btn btn-ghost !px-2 !py-1 !text-xs" onClick={() => runOne(i)}>运行</button>
              {configs.length > 1 && <button className="text-rose-400 text-xs" onClick={() => removeCfg(i)}>✕</button>}
            </div>
            <div className="min-h-[60px] bg-ink-950/60 rounded p-2 text-xs whitespace-pre-wrap">
              {runs[i] === 'loading' && <span className="text-ink-400">⏳ 调用中...</span>}
              {runs[i] && runs[i] !== 'loading' && (
                <>
                  <div className="text-[10px] text-ink-500 mb-1">
                    ⏱ {(runs[i] as DebugRun).latency_ms}ms
                  </div>
                  <div className="text-ink-100">{(runs[i] as DebugRun).output}</div>
                </>
              )}
              {!runs[i] && <span className="text-ink-500">尚未运行</span>}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={addConfig}>+ 新增模型对比</button>
          <button className="btn btn-primary flex-1" onClick={runAll}>▶ 全部运行</button>
        </div>
      </div>

      {history.length > 0 && (
        <details className="card p-2">
          <summary className="text-xs text-ink-400 cursor-pointer">📜 历史运行（{history.length}）</summary>
          <div className="mt-2 space-y-2 max-h-60 overflow-auto scrollbar">
            {history.map(h => (
              <div key={h.id} className="text-xs border border-ink-800 rounded p-2">
                <div className="text-ink-400">{new Date(h.created_at).toLocaleString()} · {h.model} · {h.latency_ms}ms</div>
                <div className="mt-1 whitespace-pre-wrap line-clamp-4">{h.output}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
