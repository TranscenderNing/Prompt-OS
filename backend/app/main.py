from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import prompts, tags, snippets, render, debug, ai, io as io_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PromptOS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prompts.router)
app.include_router(tags.router)
app.include_router(snippets.router)
app.include_router(render.router)
app.include_router(debug.router)
app.include_router(ai.router)
app.include_router(io_router.router)


@app.get("/api/health")
def health():
    return {"ok": True, "name": "PromptOS", "version": "0.1.0"}
