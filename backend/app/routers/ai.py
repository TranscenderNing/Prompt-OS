"""AI 辅助生成 Prompt：传入目标/受众/约束等，产出 template + 变量 schema。"""
import json
import re
from fastapi import APIRouter
from .. import schemas
from ..llm import chat

router = APIRouter(prefix="/api/ai", tags=["ai"])


SYSTEM = """你是 Prompt 工程师。根据用户的目标，产出一个结构化、可复用、带变量占位符的 Prompt 模板。

要求：
1. 用 {{变量名}} 表达可填参数；变量名用下划线小写英文。
2. 模板结构清晰，建议包含：角色、目标、上下文、输入、输出要求、风格约束。
3. 输出严格 JSON，禁止多余文字。格式：
{
  "template": "...带 {{变量}} 的 Prompt 模板...",
  "variables_schema": [
    {"name": "topic", "type": "string", "default": "", "description": "主题"}
  ],
  "rationale": "一句话说明为什么这样设计"
}
"""


def _extract_json(text: str) -> dict:
    # 去掉 markdown code fence
    t = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    # 粗暴提取第一个 JSON 块
    m = re.search(r"\{[\s\S]*\}", t)
    if not m:
        raise ValueError("LLM 没有返回 JSON")
    return json.loads(m.group(0))


@router.post("/generate", response_model=schemas.AIGenerateOut)
def generate(body: schemas.AIGenerateIn):
    user_msg = f"""【目标】{body.goal}
【受众】{body.audience or '未指定'}
【约束】{body.constraints or '无'}
【风格】{body.style or '无'}
【示例】{body.examples or '无'}

请生成 Prompt 模板 JSON。"""

    text, _ = chat(
        [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user_msg}],
        base_url=body.base_url, api_key=body.api_key, model=body.model,
        temperature=0.4, max_tokens=1500,
    )

    try:
        data = _extract_json(text)
        return schemas.AIGenerateOut(
            template=data.get("template", ""),
            variables_schema=data.get("variables_schema", []),
            rationale=data.get("rationale", ""),
        )
    except Exception:
        # 离线或失败时给出一个兜底模板，保证前端能正常联调
        return schemas.AIGenerateOut(
            template=(
                "你是一名{{role}}。\n\n"
                "# 目标\n" + (body.goal or "{{goal}}") + "\n\n"
                "# 输入\n{{input}}\n\n"
                "# 约束\n- 输出语言：中文\n- 风格：" + (body.style or "{{style}}") + "\n\n"
                "# 输出要求\n用结构化 Markdown 输出，先总结再分点。"
            ),
            variables_schema=[
                {"name": "role", "type": "string", "default": "资深顾问", "description": "扮演角色"},
                {"name": "input", "type": "textarea", "default": "", "description": "用户输入"},
                {"name": "style", "type": "string", "default": body.style or "", "description": "风格"},
                {"name": "goal", "type": "string", "default": body.goal or "", "description": "目标"},
            ],
            rationale="离线兜底：已根据表单生成基础结构，可在编辑器中继续打磨。",
        )
