import { useState } from 'react'
import { AI, Prompts } from '../api'
import type { Prompt } from '../api'
import type { LLMSettings } from '../App'

interface Props {
  llm: LLMSettings
  onClose: () => void
  onCreated: (p: Prompt) => void
}

const STEPS = [
  { key: 'goal', label: '你希望 Prompt 达到什么目标？', placeholder: '例如：帮我写一份小红书种草文案' },
  { key: 'audience', label: '面向谁？', placeholder: '例如：25-35 岁女性，关注美妆护肤' },
  { key: 'style', label: '想要什么风格？', placeholder: '例如：亲切、种草、带 emoji' },
  { key: 'constraints', label: '有什么约束 / 禁忌？', placeholder: '例如：不超 500 字，必须含 5 个话题' },
  { key: 'examples', label: '有参考示例吗？（可选）', placeholder: '粘贴一段你喜欢的风格样例' },
] as const

export default function AIWizard({ llm, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ template: string; variables_schema: any[]; rationale: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  const cur = STEPS[step]
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (isLast) generate()
    else setStep(step + 1)
  }

  const generate = async () => {
    setLoading(true)
    try {
      const r = await AI.generate({
        ...answers,
        base_url: llm.base_url || undefined,
        api_key: llm.api_key || undefined,
        model: llm.model || 'gpt-4o-mini',
      })
      setResult(r)
      if (!name) setName(answers.goal?.slice(0, 30) || '新 Prompt')
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (!result) return
    const p = await Prompts.create({
      name: name || '新 Prompt',
      description: answers.goal || '',
      use_case: 'general',
      template: result.template,
      variables_schema: result.variables_schema,
      tag_ids: [],
    })
    onCreated(p)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-[640px] max-h-[90vh] overflow-auto scrollbar p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">✨ AI 辅助生成 Prompt</h3>
          <button className="text-ink-400" onClick={onClose}>✕</button>
        </div>

        {!result && (
          <>
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-indigo-500' : 'bg-ink-800'}`} />
              ))}
            </div>
            <div>
              <label className="text-sm text-ink-300">{cur.label}</label>
              <textarea
                className="mt-2 w-full bg-ink-800 border border-ink-700 rounded p-2 text-sm"
                rows={4}
                placeholder={cur.placeholder}
                value={answers[cur.key] || ''}
                onChange={(e) => setAnswers({ ...answers, [cur.key]: e.target.value })}
              />
            </div>
            <div className="flex justify-between">
              <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(step - 1) : onClose()}>
                {step > 0 ? '← 上一步' : '取消'}
              </button>
              <button className="btn btn-primary" disabled={loading} onClick={next}>
                {loading ? '生成中...' : isLast ? '🚀 生成 Prompt' : '下一步 →'}
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            <div className="text-xs text-ink-400">💡 {result.rationale}</div>
            <div>
              <label className="text-xs text-ink-400">名称</label>
              <input className="mt-1 w-full bg-ink-800 border border-ink-700 rounded px-2 py-1 text-sm"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-ink-400">生成的模板</label>
              <textarea className="mt-1 w-full bg-ink-800 border border-ink-700 rounded p-2 font-mono text-xs"
                rows={10}
                value={result.template}
                onChange={(e) => setResult({ ...result, template: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-ink-400">变量 schema</label>
              <div className="mt-1 space-y-1">
                {result.variables_schema.map((v: any, i: number) => (
                  <div key={i} className="text-xs bg-ink-800 rounded p-2">
                    <span className="var-chip">{`{{${v.name}}}`}</span>
                    <span className="text-ink-400 ml-2">{v.type}</span>
                    <span className="text-ink-300 ml-2">{v.description}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <button className="btn btn-ghost" onClick={() => setResult(null)}>← 重新生成</button>
              <button className="btn btn-primary" onClick={save}>💾 保存为新 Prompt</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
