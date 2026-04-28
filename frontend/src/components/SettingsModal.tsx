import { useState } from 'react'
import type { LLMSettings } from '../App'

interface Props {
  value: LLMSettings
  onClose: () => void
  onSave: (v: LLMSettings) => void
}

const PRESETS = [
  { name: 'OpenAI', base_url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'Moonshot', base_url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: '通义千问', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: '智谱', base_url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
]

export default function SettingsModal({ value, onClose, onSave }: Props) {
  const [s, setS] = useState(value)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="card w-[520px] p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">⚙ 模型设置</h3>
          <button onClick={onClose} className="text-ink-400">✕</button>
        </div>
        <div className="text-xs text-ink-400">
          支持任何兼容 OpenAI Chat Completions 协议的 API（OpenAI / DeepSeek / 通义 / 智谱 / Moonshot / 自部署 vLLM 等）。<br/>
          设置保存在浏览器本地，调用时作为参数传给后端，后端不持久化。
        </div>

        <div>
          <div className="text-xs text-ink-500 mb-1">快速填充</div>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map(p => (
              <button key={p.name} className="btn btn-ghost !py-1 !text-xs"
                onClick={() => setS({ ...s, base_url: p.base_url, model: p.model })}>{p.name}</button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs text-ink-400">Base URL</span>
          <input className="mt-1 w-full bg-ink-800 border border-ink-700 rounded px-2 py-1.5 text-sm font-mono"
            value={s.base_url} onChange={(e) => setS({ ...s, base_url: e.target.value })}
            placeholder="https://api.openai.com/v1" />
        </label>
        <label className="block">
          <span className="text-xs text-ink-400">API Key</span>
          <input className="mt-1 w-full bg-ink-800 border border-ink-700 rounded px-2 py-1.5 text-sm font-mono"
            type="password"
            value={s.api_key} onChange={(e) => setS({ ...s, api_key: e.target.value })}
            placeholder="sk-..." />
        </label>
        <label className="block">
          <span className="text-xs text-ink-400">默认模型</span>
          <input className="mt-1 w-full bg-ink-800 border border-ink-700 rounded px-2 py-1.5 text-sm font-mono"
            value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })}
            placeholder="gpt-4o-mini" />
        </label>

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(s)}>保存</button>
        </div>
      </div>
    </div>
  )
}
