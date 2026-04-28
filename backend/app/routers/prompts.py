from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


def _attach_tags(prompt: models.Prompt, tag_ids: list[int], db: Session):
    if tag_ids is None:
        return
    tags = db.query(models.Tag).filter(models.Tag.id.in_(tag_ids)).all()
    prompt.tags = tags


@router.get("", response_model=list[schemas.PromptOut])
def list_prompts(
    q: str = Query("", description="关键词：匹配 name/description/模板/标签"),
    tag: str | None = None,
    use_case: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Prompt)
    if use_case:
        query = query.filter(models.Prompt.use_case == use_case)
    if tag:
        query = query.join(models.Prompt.tags).filter(models.Tag.name == tag)
    prompts = query.order_by(models.Prompt.updated_at.desc()).all()

    if q:
        kw = q.lower()
        result = []
        for p in prompts:
            hay = f"{p.name} {p.description} {' '.join(t.name for t in p.tags)}".lower()
            if p.current_version:
                hay += " " + (p.current_version.template or "").lower()
            if kw in hay:
                result.append(p)
        return result
    return prompts


@router.post("", response_model=schemas.PromptDetail)
def create_prompt(body: schemas.PromptCreate, db: Session = Depends(get_db)):
    p = models.Prompt(name=body.name, description=body.description, use_case=body.use_case)
    _attach_tags(p, body.tag_ids, db)
    db.add(p); db.flush()
    v = models.PromptVersion(
        prompt_id=p.id, branch="main", version_no=1,
        template=body.template, variables_schema=body.variables_schema,
        commit_message="initial",
    )
    db.add(v); db.flush()
    p.current_version_id = v.id
    db.commit(); db.refresh(p)
    return p


@router.get("/{prompt_id}", response_model=schemas.PromptDetail)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Prompt, prompt_id)
    if not p: raise HTTPException(404, "prompt not found")
    return p


@router.patch("/{prompt_id}", response_model=schemas.PromptDetail)
def update_prompt(prompt_id: int, body: schemas.PromptUpdate, db: Session = Depends(get_db)):
    p = db.get(models.Prompt, prompt_id)
    if not p: raise HTTPException(404, "prompt not found")
    for f in ("name", "description", "use_case"):
        v = getattr(body, f)
        if v is not None: setattr(p, f, v)
    if body.tag_ids is not None:
        _attach_tags(p, body.tag_ids, db)
    p.updated_at = datetime.utcnow()
    db.commit(); db.refresh(p)
    return p


@router.delete("/{prompt_id}")
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Prompt, prompt_id)
    if not p: raise HTTPException(404, "prompt not found")
    db.delete(p); db.commit()
    return {"ok": True}


# ---------- 版本 / 分支 ----------

@router.get("/{prompt_id}/versions", response_model=list[schemas.VersionOut])
def list_versions(prompt_id: int, db: Session = Depends(get_db)):
    versions = (
        db.query(models.PromptVersion)
        .filter(models.PromptVersion.prompt_id == prompt_id)
        .order_by(models.PromptVersion.id.asc())
        .all()
    )
    return versions


@router.post("/{prompt_id}/commit", response_model=schemas.VersionOut)
def commit_version(prompt_id: int, body: schemas.CommitIn, db: Session = Depends(get_db)):
    """在指定分支上做一次新提交，parent 默认为当前 current_version。"""
    p = db.get(models.Prompt, prompt_id)
    if not p: raise HTTPException(404, "prompt not found")

    parent_id = body.parent_version_id or p.current_version_id
    # 同一分支内的最大版本号 +1
    max_v = (
        db.query(models.PromptVersion)
        .filter(models.PromptVersion.prompt_id == prompt_id,
                models.PromptVersion.branch == body.branch)
        .order_by(models.PromptVersion.version_no.desc())
        .first()
    )
    next_no = (max_v.version_no + 1) if max_v else 1

    v = models.PromptVersion(
        prompt_id=prompt_id,
        parent_version_id=parent_id,
        branch=body.branch,
        version_no=next_no,
        template=body.template,
        variables_schema=body.variables_schema,
        commit_message=body.commit_message,
    )
    db.add(v); db.flush()
    p.current_version_id = v.id
    p.updated_at = datetime.utcnow()
    db.commit(); db.refresh(v)
    return v


@router.post("/{prompt_id}/branch", response_model=schemas.VersionOut)
def new_branch(prompt_id: int, body: schemas.BranchIn, db: Session = Depends(get_db)):
    base = db.get(models.PromptVersion, body.from_version_id)
    if not base or base.prompt_id != prompt_id:
        raise HTTPException(404, "base version not found")
    exists = (
        db.query(models.PromptVersion)
        .filter(models.PromptVersion.prompt_id == prompt_id,
                models.PromptVersion.branch == body.branch)
        .first()
    )
    if exists:
        raise HTTPException(400, f"branch '{body.branch}' already exists")
    v = models.PromptVersion(
        prompt_id=prompt_id,
        parent_version_id=base.id,
        branch=body.branch,
        version_no=1,
        template=base.template,
        variables_schema=base.variables_schema,
        commit_message=body.commit_message,
    )
    db.add(v); db.commit(); db.refresh(v)
    return v


@router.post("/{prompt_id}/checkout/{version_id}", response_model=schemas.PromptDetail)
def checkout(prompt_id: int, version_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Prompt, prompt_id)
    v = db.get(models.PromptVersion, version_id)
    if not p or not v or v.prompt_id != prompt_id:
        raise HTTPException(404, "not found")
    p.current_version_id = v.id
    p.updated_at = datetime.utcnow()
    db.commit(); db.refresh(p)
    return p
