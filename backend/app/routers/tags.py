from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[schemas.TagOut])
def list_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).order_by(models.Tag.name).all()


@router.post("", response_model=schemas.TagOut)
def create_tag(body: schemas.TagIn, db: Session = Depends(get_db)):
    existing = db.query(models.Tag).filter(models.Tag.name == body.name).first()
    if existing:
        return existing
    tag = models.Tag(name=body.name, color=body.color)
    db.add(tag); db.commit(); db.refresh(tag)
    return tag


@router.delete("/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(models.Tag, tag_id)
    if not tag: raise HTTPException(404, "tag not found")
    db.delete(tag); db.commit()
    return {"ok": True}
