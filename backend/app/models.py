from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


prompt_tags = Table(
    "prompt_tags",
    Base.metadata,
    Column("prompt_id", Integer, ForeignKey("prompts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

snippet_tags = Table(
    "snippet_tags",
    Base.metadata,
    Column("snippet_id", Integer, ForeignKey("snippets.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True)
    name = Column(String(64), unique=True, nullable=False)
    color = Column(String(16), default="#6366f1")


class Prompt(Base):
    __tablename__ = "prompts"
    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, default="")
    use_case = Column(String(64), default="general")  # dev / content / enterprise / general
    current_version_id = Column(Integer, ForeignKey("prompt_versions.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tags = relationship("Tag", secondary=prompt_tags, backref="prompts")
    versions = relationship(
        "PromptVersion",
        backref="prompt",
        cascade="all, delete-orphan",
        foreign_keys="PromptVersion.prompt_id",
    )
    current_version = relationship("PromptVersion", foreign_keys=[current_version_id], post_update=True)


class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    id = Column(Integer, primary_key=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False)
    parent_version_id = Column(Integer, ForeignKey("prompt_versions.id", ondelete="SET NULL"), nullable=True)
    branch = Column(String(64), default="main")
    version_no = Column(Integer, default=1)
    template = Column(Text, nullable=False, default="")
    variables_schema = Column(JSON, default=list)   # [{name, type, default, description}]
    commit_message = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class Snippet(Base):
    __tablename__ = "snippets"
    id = Column(Integer, primary_key=True)
    category = Column(String(64), default="general")  # lens / style / tone / keyword ...
    title = Column(String(128), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tags = relationship("Tag", secondary=snippet_tags, backref="snippets")


class DebugRun(Base):
    __tablename__ = "debug_runs"
    id = Column(Integer, primary_key=True)
    prompt_version_id = Column(Integer, ForeignKey("prompt_versions.id", ondelete="SET NULL"), nullable=True)
    rendered = Column(Text, nullable=False)
    model = Column(String(64), default="")
    params = Column(JSON, default=dict)
    output = Column(Text, default="")
    score = Column(Float, default=0.0)
    latency_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
