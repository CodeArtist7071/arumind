from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"status": "server running"}

@app.post("/qwen")
def qwen(data: dict):
    prompt = data.get("prompt", "")
    return {"response": f"Received prompt: {prompt}"}