from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/snippets", tags=["snippets"])


@router.get("", response_model=list[schemas.SnippetOut])
def list_snippets(
    category: str | None = None,
    q: str = "",
    db: Session = Depends(get_db),
):
    query = db.query(models.Snippet)
    if category:
        query = query.filter(models.Snippet.category == category)
    items = query.order_by(models.Snippet.id.desc()).all()
    if q:
        kw = q.lower()
        items = [s for s in items if kw in s.title.lower() or kw in s.content.lower()]
    return items


@router.post("", response_model=schemas.SnippetOut)
def create_snippet(body: schemas.SnippetIn, db: Session = Depends(get_db)):
    s = models.Snippet(category=body.category, title=body.title, content=body.content)
    if body.tag_ids:
        s.tags = db.query(models.Tag).filter(models.Tag.id.in_(body.tag_ids)).all()
    db.add(s); db.commit(); db.refresh(s)
    return s


@router.delete("/{snippet_id}")
def delete_snippet(snippet_id: int, db: Session = Depends(get_db)):
    s = db.get(models.Snippet, snippet_id)
    if not s: raise HTTPException(404, "not found")
    db.delete(s); db.commit()
    return {"ok": True}


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(models.Snippet.category).distinct().all()
    return sorted({r[0] for r in rows})
