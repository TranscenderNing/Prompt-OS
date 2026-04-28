"""生成演示数据，方便第一次启动时有内容可看。"""
from app.database import Base, engine, SessionLocal
from app import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(models.Prompt).count() > 0:
    print("Seed data already exists, skip.")
    db.close()
    raise SystemExit(0)

# Tags
tag_objs = {}
for name, color in [
    ("开发", "#3b82f6"), ("内容创作", "#ec4899"), ("企业", "#f59e0b"),
    ("Agent", "#10b981"), ("小红书", "#ef4444"), ("绘图", "#8b5cf6"),
]:
    t = models.Tag(name=name, color=color)
    db.add(t); db.flush(); tag_objs[name] = t

# Prompts
p1 = models.Prompt(name="代码 Review 助手", description="把 diff 粘进来，它会给结构化的评审意见",
                   use_case="dev")
p1.tags = [tag_objs["开发"]]
db.add(p1); db.flush()
v1 = models.PromptVersion(
    prompt_id=p1.id, branch="main", version_no=1,
    template=(
        "你是资深 {{language}} 工程师。请对以下 Diff 做 Code Review。\n\n"
        "# 关注点\n- 正确性\n- 可读性\n- 性能\n- 安全\n\n"
        "# Diff\n```\n{{diff}}\n```\n\n"
        "请用中文，以 Markdown 表格列出「问题 | 严重度 | 建议」。"
    ),
    variables_schema=[
        {"name": "language", "type": "string", "default": "Python", "description": "语言"},
        {"name": "diff", "type": "textarea", "default": "", "description": "代码 diff"},
    ],
    commit_message="initial",
)
db.add(v1); db.flush(); p1.current_version_id = v1.id

p2 = models.Prompt(name="小红书爆款文案", description="输入主题，生成带 emoji 和话题标签的小红书文案",
                   use_case="content")
p2.tags = [tag_objs["内容创作"], tag_objs["小红书"]]
db.add(p2); db.flush()
v2 = models.PromptVersion(
    prompt_id=p2.id, branch="main", version_no=1,
    template=(
        "你是小红书爆款博主，擅长 {{niche}} 赛道。\n\n"
        "请就【{{topic}}】写一篇小红书笔记：\n"
        "- 标题吸睛（带 emoji，≤20 字）\n"
        "- 正文 3 段，每段不超 4 行\n"
        "- 结尾给出 5 个 # 话题\n"
        "- 语气：{{tone}}"
    ),
    variables_schema=[
        {"name": "niche", "type": "string", "default": "美妆", "description": "赛道"},
        {"name": "topic", "type": "string", "default": "", "description": "主题"},
        {"name": "tone", "type": "enum", "default": "亲切", "options": ["亲切", "种草", "专业", "幽默"], "description": "语气"},
    ],
    commit_message="initial",
)
db.add(v2); db.flush(); p2.current_version_id = v2.id

p3 = models.Prompt(name="Midjourney 镜头助手", description="根据关键词组合出高质量 MJ prompt",
                   use_case="content")
p3.tags = [tag_objs["绘图"], tag_objs["内容创作"]]
db.add(p3); db.flush()
v3 = models.PromptVersion(
    prompt_id=p3.id, branch="main", version_no=1,
    template=(
        "Create a Midjourney prompt:\n"
        "Subject: {{subject}}\n"
        "Style: {{style}}\n"
        "Lens: {{lens}}\n"
        "Lighting: {{lighting}}\n"
        "Mood: {{mood}}\n"
        "--ar {{ratio}} --v 6"
    ),
    variables_schema=[
        {"name": "subject", "type": "string", "default": "a cyberpunk cat", "description": "主体"},
        {"name": "style", "type": "string", "default": "Studio Ghibli", "description": "风格"},
        {"name": "lens", "type": "string", "default": "85mm portrait", "description": "镜头"},
        {"name": "lighting", "type": "string", "default": "cinematic rim light", "description": "光线"},
        {"name": "mood", "type": "string", "default": "dreamy", "description": "氛围"},
        {"name": "ratio", "type": "string", "default": "16:9", "description": "画幅"},
    ],
    commit_message="initial",
)
db.add(v3); db.flush(); p3.current_version_id = v3.id

# Snippets（素材库）
snippets = [
    ("lens", "微距特写", "extreme macro, shallow depth of field, f/1.4, bokeh"),
    ("lens", "电影级广角", "cinematic wide angle, 24mm, anamorphic lens flare"),
    ("style", "吉卜力", "Studio Ghibli style, soft watercolor, warm palette"),
    ("style", "赛博朋克", "cyberpunk, neon rain, blade runner aesthetic"),
    ("tone", "亲切博主", "像闺蜜一样唠嗑，多用疑问句和感叹号，适度 emoji"),
    ("tone", "严谨技术", "措辞客观，先结论后论证，引用关键指标"),
    ("keyword", "高转化小红书开头", "姐妹们！！今天要分享一个绝绝子的..."),
    ("keyword", "代码 Review 结构", "- 正确性 / 边界条件\n- 可读性 / 命名\n- 性能 / 复杂度\n- 安全 / 注入"),
]
for cat, title, content in snippets:
    s = models.Snippet(category=cat, title=title, content=content)
    db.add(s)

db.commit()
db.close()
print("✅ Seed data created.")
