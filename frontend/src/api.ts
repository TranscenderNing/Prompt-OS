// 统一 API 客户端
const BASE = '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text() as unknown as T
}

export const api = {
  get: <T>(p: string) => req<T>(p),
  post: <T>(p: string, body?: any) => req<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(p: string, body?: any) => req<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => req<T>(p, { method: 'DELETE' }),
  upload: async <T>(p: string, file: File): Promise<T> => {
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch(BASE + p, { method: 'POST', body: fd })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
}

// ---- 类型 ----
export interface Tag { id: number; name: string; color: string }
export interface VariableDef { name: string; type: string; default?: any; description?: string; options?: string[] }
export interface Version {
  id: number; prompt_id: number; parent_version_id: number | null;
  branch: string; version_no: number; template: string;
  variables_schema: VariableDef[]; commit_message: string; created_at: string;
}
export interface Prompt {
  id: number; name: string; description: string; use_case: string;
  current_version_id: number | null; tags: Tag[];
  created_at: string; updated_at: string;
  current_version?: Version | null;
}
export interface Snippet {
  id: number; category: string; title: string; content: string;
  tags: Tag[]; created_at: string;
}
export interface DebugRun {
  id: number; model: string; output: string; latency_ms: number; created_at: string;
  params?: any;
}

// ---- 快捷方法 ----
export const Prompts = {
  list: (q = '', tag?: string, use_case?: string) => {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (tag) qs.set('tag', tag)
    if (use_case) qs.set('use_case', use_case)
    const s = qs.toString()
    return api.get<Prompt[]>('/prompts' + (s ? `?${s}` : ''))
  },
  get: (id: number) => api.get<Prompt>(`/prompts/${id}`),
  create: (body: any) => api.post<Prompt>('/prompts', body),
  patch: (id: number, body: any) => api.patch<Prompt>(`/prompts/${id}`, body),
  del: (id: number) => api.del(`/prompts/${id}`),
  versions: (id: number) => api.get<Version[]>(`/prompts/${id}/versions`),
  commit: (id: number, body: any) => api.post<Version>(`/prompts/${id}/commit`, body),
  branch: (id: number, body: any) => api.post<Version>(`/prompts/${id}/branch`, body),
  checkout: (id: number, vid: number) => api.post<Prompt>(`/prompts/${id}/checkout/${vid}`),
}

export const Tags = {
  list: () => api.get<Tag[]>('/tags'),
  create: (body: { name: string; color?: string }) => api.post<Tag>('/tags', body),
  del: (id: number) => api.del(`/tags/${id}`),
}

export const Snippets = {
  list: (category?: string, q = '') => {
    const qs = new URLSearchParams()
    if (category) qs.set('category', category)
    if (q) qs.set('q', q)
    const s = qs.toString()
    return api.get<Snippet[]>('/snippets' + (s ? `?${s}` : ''))
  },
  create: (body: any) => api.post<Snippet>('/snippets', body),
  del: (id: number) => api.del(`/snippets/${id}`),
}

export const Render = {
  render: (template: string, variables: Record<string, any>) =>
    api.post<{ rendered: string; missing: string[] }>('/render', { template, variables }),
  extract: (template: string) =>
    api.post<{ variables: string[] }>('/render/extract', { template, variables: {} }),
}

export const Debug = {
  run: (body: any) => api.post<DebugRun>('/debug/run', body),
  history: (version_id: number) => api.get<DebugRun[]>(`/debug/history/${version_id}`),
}

export const AI = {
  generate: (body: any) =>
    api.post<{ template: string; variables_schema: VariableDef[]; rationale: string }>('/ai/generate', body),
}

export const IO = {
  exportUrl: '/api/io/export',
  import: (file: File) => api.upload('/io/import', file),
  exportMdUrl: (id: number) => `/api/io/export/prompt/${id}/markdown`,
}
