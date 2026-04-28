from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..llm import chat

router = APIRouter(prefix="/api/debug", tags=["debug"])


@router.post("/run", response_model=schemas.DebugOut)
def run(body: schemas.DebugIn, db: Session = Depends(get_db)):
    messages = [{"role": "user", "content": body.rendered}]
    output, latency = chat(
        messages,
        base_url=body.base_url,
        api_key=body.api_key,
        model=body.model,
        temperature=body.temperature,
        max_tokens=body.max_tokens,
    )
    run = models.DebugRun(
        prompt_version_id=body.prompt_version_id,
        rendered=body.rendered,
        model=body.model,
        params={"temperature": body.temperature, "max_tokens": body.max_tokens},
        output=output,
        latency_ms=latency,
    )
    db.add(run); db.commit(); db.refresh(run)
    return run


@router.get("/history/{version_id}")
def history(version_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(models.DebugRun)
        .filter(models.DebugRun.prompt_version_id == version_id)
        .order_by(models.DebugRun.id.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id, "model": r.model, "params": r.params,
            "output": r.output, "latency_ms": r.latency_ms,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
