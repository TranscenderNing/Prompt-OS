"""LLM 调用封装 —— 兼容 OpenAI / DeepSeek / 通义 / Moonshot 等。
默认从环境变量读取 PROMPTOS_LLM_BASE_URL、PROMPTOS_LLM_API_KEY、PROMPTOS_LLM_MODEL。
调用方也可在请求体里覆盖。
"""
import os
import time
import httpx
from typing import Optional, Tuple


def _cfg(base_url: Optional[str], api_key: Optional[str], model: Optional[str]) -> Tuple[str, str, str]:
    base = base_url or os.environ.get("PROMPTOS_LLM_BASE_URL", "https://api.openai.com/v1")
    key = api_key or os.environ.get("PROMPTOS_LLM_API_KEY", "")
    m = model or os.environ.get("PROMPTOS_LLM_MODEL", "gpt-4o-mini")
    return base.rstrip("/"), key, m


def chat(messages, base_url=None, api_key=None, model=None,
         temperature: float = 0.7, max_tokens: int = 1024) -> Tuple[str, int]:
    """返回 (text, latency_ms)。若未配置 api_key，则返回占位内容以便离线调试。"""
    base, key, mdl = _cfg(base_url, api_key, model)
    started = time.time()
    if not key:
        # 离线 fallback：便于前端联调
        last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        return (
            f"[离线模拟输出] 未配置 LLM API Key。\n"
            f"模型: {mdl}\n"
            f"输入摘要: {last_user[:200]}...\n"
            f"👉 请在「设置」里填入 API Key 后再次运行。",
            int((time.time() - started) * 1000),
        )
    url = f"{base}/chat/completions"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {
        "model": mdl,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()
            text = data["choices"][0]["message"]["content"]
            return text, int((time.time() - started) * 1000)
    except Exception as e:
        return f"[调用失败] {type(e).__name__}: {e}", int((time.time() - started) * 1000)
