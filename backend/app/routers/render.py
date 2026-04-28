"""变量渲染引擎：支持 {{var}} 语法，自动做缺失变量检测。"""
import re
from fastapi import APIRouter
from .. import schemas

router = APIRouter(prefix="/api/render", tags=["render"])

VAR_PATTERN = re.compile(r"\{\{\s*([a-zA-Z_][\w\.\-]*)\s*\}\}")


def extract_vars(template: str) -> list[str]:
    return list(dict.fromkeys(VAR_PATTERN.findall(template)))


def render(template: str, variables: dict) -> tuple[str, list[str]]:
    missing: list[str] = []

    def repl(m):
        name = m.group(1)
        if name in variables and variables[name] not in (None, ""):
            return str(variables[name])
        missing.append(name)
        return "{{" + name + "}}"

    out = VAR_PATTERN.sub(repl, template)
    # 去重
    missing = list(dict.fromkeys(missing))
    return out, missing


@router.post("", response_model=schemas.RenderOut)
def do_render(body: schemas.RenderIn):
    rendered, missing = render(body.template, body.variables)
    return {"rendered": rendered, "missing": missing}


@router.post("/extract")
def do_extract(body: schemas.RenderIn):
    return {"variables": extract_vars(body.template)}
