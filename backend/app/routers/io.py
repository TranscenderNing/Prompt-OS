"""导入 / 导出 —— JSON 全量 & Markdown 单条"""
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/io", tags=["io"])


@router.get("/export")
def export_all(db: Session = Depends(get_db)):
    data = {
        "tags": [{"name": t.name, "color": t.color} for t in db.query(models.Tag).all()],
        "prompts": [],
        "snippets": [
            {
                "category": s.category, "title": s.title, "content": s.content,
                "tags": [t.name for t in s.tags],
            }
            for s in db.query(models.Snippet).all()
        ],
    }
    for p in db.query(models.Prompt).all():
        versions = [
            {
                "id": v.id, "parent_version_id": v.parent_version_id,
                "branch": v.branch, "version_no": v.version_no,
                "template": v.template, "variables_schema": v.variables_schema,
                "commit_message": v.commit_message,
            }
            for v in p.versions
        ]
        data["prompts"].append({
            "name": p.name, "description": p.description, "use_case": p.use_case,
            "tags": [t.name for t in p.tags],
            "current_version_id": p.current_version_id,
            "versions": versions,
        })
    return JSONResponse(content=data, headers={"Content-Disposition": "attachment; filename=promptos-export.json"})


@router.post("/import")
async def import_all(file: UploadFile = File(...), db: Session = Depends(get_db)):
    raw = await file.read()
    try:
        data = json.loads(raw.decode("utf-8"))
    except Exception as e:
        raise HTTPException(400, f"invalid json: {e}")

    tag_map: dict[str, models.Tag] = {}
    for t in data.get("tags", []):
        existing = db.query(models.Tag).filter(models.Tag.name == t["name"]).first()
        if existing:
            tag_map[t["name"]] = existing
        else:
            n = models.Tag(name=t["name"], color=t.get("color", "#6366f1"))
            db.add(n); db.flush()
            tag_map[t["name"]] = n

    for pdata in data.get("prompts", []):
        p = models.Prompt(
            name=pdata["name"], description=pdata.get("description", ""),
            use_case=pdata.get("use_case", "general"),
        )
        p.tags = [tag_map[n] for n in pdata.get("tags", []) if n in tag_map]
        db.add(p); db.flush()
        old_to_new: dict[int, int] = {}
        for v in pdata.get("versions", []):
            nv = models.PromptVersion(
                prompt_id=p.id,
                parent_version_id=old_to_new.get(v.get("parent_version_id") or -1),
                branch=v.get("branch", "main"),
                version_no=v.get("version_no", 1),
                template=v.get("template", ""),
                variables_schema=v.get("variables_schema", []),
                commit_message=v.get("commit_message", ""),
            )
            db.add(nv); db.flush()
            old_to_new[v["id"]] = nv.id
        if pdata.get("current_version_id") in old_to_new:
            p.current_version_id = old_to_new[pdata["current_version_id"]]

    for s in data.get("snippets", []):
        ns = models.Snippet(category=s.get("category", "general"), title=s["title"], content=s["content"])
        ns.tags = [tag_map[n] for n in s.get("tags", []) if n in tag_map]
        db.add(ns)

    db.commit()
    return {"ok": True}


@router.get("/export/prompt/{prompt_id}/markdown", response_class=PlainTextResponse)
def export_prompt_md(prompt_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Prompt, prompt_id)
    if not p: raise HTTPException(404, "not found")
    v = p.current_version
    if not v: raise HTTPException(404, "no version")
    vars_md = "\n".join(
        f"- **{x.get('name')}** ({x.get('type','string')}) — {x.get('description','')}"
        for x in (v.variables_schema or [])
    ) or "_无_"
    md = f"""# {p.name}

> {p.description or ''}

**Use Case:** `{p.use_case}`  
**Tags:** {', '.join(t.name for t in p.tags) or '无'}  
**Branch:** {v.branch}  **Version:** {v.version_no}

## Variables

{vars_md}

## Template

```text
{v.template}
```
"""
    return md
