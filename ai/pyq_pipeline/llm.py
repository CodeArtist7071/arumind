"""Optional provider adapter. LLM results are suggestions and are revalidated locally."""
from __future__ import annotations

import json
import os
import time

import httpx


class LLMError(RuntimeError):
    pass


class OpenRouterAdapter:
    def __init__(self, settings):
        self.settings = settings
        self.api_key = os.environ.get(settings.api_key_env, "").strip()
        if not self.api_key:
            raise LLMError(f"LLM enabled but environment variable {settings.api_key_env} is not set")
        if not settings.llm_model:
            raise LLMError("LLM enabled but llm.model is empty in settings.yaml")

    def extract(self, segment: str, context: str = "") -> list[dict]:
        prompt = """Extract only questions explicitly present in OWNED MARKDOWN. Surrounding context is only for split-boundary understanding. Never invent answers, metadata, or IDs. Preserve exact wording, equations and option order. Return JSON object {\"questions\":[{\"question_text\":string,\"options\":[{\"label\":string,\"text\":string}],\"correct_answers\":[string],\"explanation\":string|null,\"question_type\":string,\"question_number\":string|null,\"source_quote\":string}]} with no prose."""
        payload = {"model": self.settings.llm_model, "temperature": 0,
                   "messages": [{"role": "system", "content": prompt}, {"role": "user", "content": f"CONTEXT:\n{context}\n\nOWNED MARKDOWN:\n{segment}"}],
                   "response_format": {"type": "json_object"}}
        last = None
        for attempt in range(self.settings.retry_count):
            try:
                response = httpx.post(self.settings.api_base, headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}, json=payload, timeout=self.settings.timeout_seconds)
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                questions = parsed.get("questions")
                if not isinstance(questions, list):
                    raise ValueError("Response does not contain a questions array")
                return questions
            except (httpx.HTTPError, KeyError, ValueError, json.JSONDecodeError) as exc:
                last = exc
                if attempt + 1 < self.settings.retry_count:
                    time.sleep(min(2 ** attempt, 8))
        raise LLMError(f"LLM extraction failed after bounded retries: {last}")
