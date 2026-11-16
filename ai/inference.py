import os
import json
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


# --------------------------------------------------
# 1. Load environment variables
# --------------------------------------------------

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")

if not API_KEY:
    raise ValueError(
        "OPENROUTER_API_KEY not found. "
        "Add it to your .env file."
    )


# --------------------------------------------------
# 2. OpenRouter client
# --------------------------------------------------

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_KEY,
)


# --------------------------------------------------
# 3. Configuration
# --------------------------------------------------

MODEL = "inclusionai/ling-3.0-flash-sante:free"
DATASET_PATH = Path("outputs/demo.jsonl")



# --------------------------------------------------
# 4. Load teaching examples
# --------------------------------------------------

def load_dataset(path):
    examples = []

    with open(path, "r", encoding="utf-8") as file:

        for line_number, line in enumerate(file, start=1):

            line = line.strip()

            if not line:
                continue

            try:
                data = json.loads(line)

                if "question" not in data or "answer" not in data:
                    print(
                        f"Skipping line {line_number}: "
                        "missing question or answer"
                    )
                    continue

                examples.append(data)

            except json.JSONDecodeError:
                print(
                    f"Skipping invalid JSON on line {line_number}"
                )

    return examples


# --------------------------------------------------
# 5. Build teaching-style prompt
# --------------------------------------------------

def build_prompt(examples, user_question):

    prompt = """
You are a History and Geography teacher.
Your job is not simply to provide the final answer.
You should explain concepts in the teaching style demonstrated
by the examples below.
Pay attention to:

- how the explanation starts
- how difficult concepts are simplified
- how information is organized
- use of examples and analogies
- explanation depth
- how important points are emphasized
- how the explanation concludes

Do not copy the examples literally.
Learn the teaching pattern demonstrated by them.

Here are examples of the teacher's style:

"""

    for example in examples:

        prompt += f"""
Student:
{example["question"]}

Teacher:
{example["answer"]}

---
"""

    prompt += f"""
Now answer this student's question using the same teaching style.
Student:
{user_question}
Teacher:
"""
    return prompt


# --------------------------------------------------
# 6. Send question to OpenRouter
# --------------------------------------------------

def ask_model(prompt):

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4,
    )

    return response.choices[0].message.content


# --------------------------------------------------
# 7. Main program
# --------------------------------------------------

def main():

    print("Loading teaching dataset...")

    examples = load_dataset(DATASET_PATH)

    print(f"Loaded {len(examples)} teaching examples.")

    if not examples:
        print("Dataset is empty.")
        return

    print("\nHistory/Geography Tutor")
    print("-----------------------")

    user_question = input("\nYou: ")

    if not user_question.strip():
        print("Please enter a question.")
        return

    prompt = build_prompt(
        examples,
        user_question
    )

    print("\nThinking...\n")

    answer = ask_model(prompt)

    print("Tutor:")
    print(answer)


if __name__ == "__main__":
    main()