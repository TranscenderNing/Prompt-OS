import { useEffect, useState, useCallback } from 'react'
import type { Prompt, Tag } from './api'
import { Prompts, Tags } from './api'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import RightPanel from './components/RightPanel'
import TopBar from './components/TopBar'
import AIWizard from './components/AIWizard'
import SnippetDrawer from './components/SnippetDrawer'
import SettingsModal from './components/SettingsModal'

export interface LLMSettings {
  base_url: string
  api_key: string
  model: string
}

const DEFAULT_LLM: LLMSettings = {
  base_url: '',
  api_key: '',
  model: 'gpt-4o-mini',
}

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [current, setCurrent] = useState<Prompt | null>(null)
  const [query, setQuery] = useState('')
  const [useCase, setUseCase] = useState<string | undefined>(undefined)
  const [aiOpen, setAiOpen] = useState(false)
  const [snippetOpen, setSnippetOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [llm, setLlm] = useState<LLMSettings>(() => {
    const raw = localStorage.getItem('promptos.llm')
    return raw ? { ...DEFAULT_LLM, ...JSON.parse(raw) } : DEFAULT_LLM
  })

  const saveLlm = (v: LLMSettings) => {
    setLlm(v)
    localStorage.setItem('promptos.llm', JSON.stringify(v))
  }

  const loadList = useCallback(async () => {
    const ps = await Prompts.list(query, undefined, useCase)
    setPrompts(ps)
    if (!selectedId && ps.length) setSelectedId(ps[0].id)
  }, [query, useCase, selectedId])

  const loadTags = useCallback(async () => {
    setTags(await Tags.list())
  }, [])

  const loadCurrent = useCallback(async () => {
    if (!selectedId) return setCurrent(null)
    setCurrent(await Prompts.get(selectedId))
  }, [selectedId])

  useEffect(() => { loadList() }, [loadList])
  useEffect(() => { loadTags() }, [loadTags])
  useEffect(() => { loadCurrent() }, [loadCurrent])

  const handleCreate = async (data: { name: string; template: string; variables_schema: any[] }) => {
    const p = await Prompts.create({ ...data, use_case: useCase || 'general', tag_ids: [] })
    await loadList()
    setSelectedId(p.id)
  }

  const handleInsertSnippet = (text: string) => {
    window.dispatchEvent(new CustomEvent('promptos.insertSnippet', { detail: text }))
  }

  return (
    <div className="h-full flex flex-col bg-ink-950 text-ink-100">
      <TopBar
        onAI={() => setAiOpen(true)}
        onSnippets={() => setSnippetOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onRefresh={async () => { await loadList(); await loadCurrent() }}
      />
      <div className="flex-1 flex min-h-0">
        <Sidebar
          prompts={prompts}
          tags={tags}
          selectedId={selectedId}
          onSelect={setSelectedId}
          query={query}
          onQuery={setQuery}
          useCase={useCase}
          onUseCase={setUseCase}
          onCreate={() => {
            const name = prompt('新 Prompt 名称？')
            if (name) handleCreate({ name, template: '在这里写你的 Prompt，使用 {{变量}} 作为占位。', variables_schema: [] })
          }}
          onDelete={async (id) => {
            if (!confirm('确定删除此 Prompt 及全部版本？')) return
            await Prompts.del(id)
            if (selectedId === id) setSelectedId(null)
            await loadList()
          }}
        />
        <main className="flex-1 min-w-0 flex">
          <Editor
            prompt={current}
            allTags={tags}
            onChanged={async () => { await loadList(); await loadCurrent() }}
            llm={llm}
          />
          <RightPanel
            prompt={current}
            onChanged={async () => { await loadList(); await loadCurrent() }}
            llm={llm}
          />
        </main>
      </div>

      {aiOpen && (
        <AIWizard
          llm={llm}
          onClose={() => setAiOpen(false)}
          onCreated={async (p) => {
            setAiOpen(false)
            await loadList()
            setSelectedId(p.id)
          }}
        />
      )}
      {snippetOpen && (
        <SnippetDrawer
          onClose={() => setSnippetOpen(false)}
          onInsert={(text) => { handleInsertSnippet(text); setSnippetOpen(false) }}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          value={llm}
          onClose={() => setSettingsOpen(false)}
          onSave={(v) => { saveLlm(v); setSettingsOpen(false) }}
        />
      )}
    </div>
  )
}
