from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime


class TagOut(BaseModel):
    id: int
    name: str
    color: str
    class Config: from_attributes = True


class TagIn(BaseModel):
    name: str
    color: str = "#6366f1"


class VariableDef(BaseModel):
    name: str
    type: str = "string"           # string / number / enum / textarea
    default: Any = ""
    description: str = ""
    options: Optional[List[str]] = None


class VersionOut(BaseModel):
    id: int
    prompt_id: int
    parent_version_id: Optional[int]
    branch: str
    version_no: int
    template: str
    variables_schema: List[Dict[str, Any]] = []
    commit_message: str
    created_at: datetime
    class Config: from_attributes = True


class PromptOut(BaseModel):
    id: int
    name: str
    description: str
    use_case: str
    current_version_id: Optional[int]
    tags: List[TagOut] = []
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


class PromptDetail(PromptOut):
    current_version: Optional[VersionOut] = None


class PromptCreate(BaseModel):
    name: str
    description: str = ""
    use_case: str = "general"
    template: str = ""
    variables_schema: List[Dict[str, Any]] = []
    tag_ids: List[int] = []


class PromptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    use_case: Optional[str] = None
    tag_ids: Optional[List[int]] = None


class CommitIn(BaseModel):
    template: str
    variables_schema: List[Dict[str, Any]] = []
    commit_message: str = ""
    branch: str = "main"
    parent_version_id: Optional[int] = None  # 不传则基于 current


class BranchIn(BaseModel):
    from_version_id: int
    branch: str
    commit_message: str = "new branch"


class SnippetIn(BaseModel):
    category: str = "general"
    title: str
    content: str
    tag_ids: List[int] = []


class SnippetOut(BaseModel):
    id: int
    category: str
    title: str
    content: str
    tags: List[TagOut] = []
    created_at: datetime
    class Config: from_attributes = True


class RenderIn(BaseModel):
    template: str
    variables: Dict[str, Any] = {}


class RenderOut(BaseModel):
    rendered: str
    missing: List[str] = []


class DebugIn(BaseModel):
    prompt_version_id: Optional[int] = None
    rendered: str
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 1024
    base_url: Optional[str] = None
    api_key: Optional[str] = None


class DebugOut(BaseModel):
    id: int
    model: str
    output: str
    latency_ms: int
    created_at: datetime
    class Config: from_attributes = True


class AIGenerateIn(BaseModel):
    goal: str
    audience: str = ""
    constraints: str = ""
    examples: str = ""
    style: str = ""
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model: str = "gpt-4o-mini"


class AIGenerateOut(BaseModel):
    template: str
    variables_schema: List[Dict[str, Any]]
    rationale: str
