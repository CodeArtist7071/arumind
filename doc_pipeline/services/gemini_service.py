import json
import logging
from config import PROJECT_ID, REGION, API_KEY, GEMINI_MODEL
from google import genai
from google.genai import types

class GeminiModel:
    def __init__(self, use_vertexai=True, project=PROJECT_ID, location=REGION, async_mode=False):
        self.async_mode = async_mode
        self.model_id = GEMINI_MODEL

        if use_vertexai:
            self.client = genai.Client(
                vertexai=True,
                project=project,
                location=location,
                http_options=types.HttpOptions(api_version='v1')
            ).aio if async_mode else genai.Client(
                vertexai=True,
                project=project,
                location=location,
                http_options=types.HttpOptions(api_version='v1')
            )
            print("[MODEL] Gemini initialized via Vertex AI")
        else:
            self.client = genai.Client(
                api_key=API_KEY,
                http_options=types.HttpOptions(api_version='v1alpha')
            ).aio if async_mode else genai.Client(
                api_key=API_KEY,
                http_options=types.HttpOptions(api_version='v1alpha')
            )
            print("[MODEL] Gemini initialized via Gemini Developer API")

    def generate(self, prompt, response_mime_type="text/plain"):
        try:
            if self.async_mode:
                import asyncio
                async def async_generate():
                    response = await self.client.models.generate_content(
                        model=self.model_id,
                        contents=prompt,
                        config=types.GenerateContentConfig(response_mime_type=response_mime_type)
                    )
                    return response.text
                return asyncio.run(async_generate())
            else:
                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type=response_mime_type)
                )
                return response.text
        except Exception as e:
            print("[MODEL ERROR]", e)
            return ""
