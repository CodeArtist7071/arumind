import json
import vertexai
from vertexai.generative_models import GenerativeModel
from config import PROJECT_ID, LOCATION

vertexai.init(project=PROJECT_ID, location=LOCATION)

model = GenerativeModel("gemini-2.5-flash-lite")


def translate_questions_batch(questions):

    prompt = f"""
Translate the following exam questions JSON into Odia.

Rules:
- Keep JSON structure identical
- Translate only text fields
- Return valid JSON only

JSON:
{json.dumps(questions, indent=2)}
"""

    response = model.generate_content(prompt)

    try:
        return json.loads(response.text)
    except:
        return []