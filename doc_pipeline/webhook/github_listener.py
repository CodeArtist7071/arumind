from flask import Flask, request
import subprocess

app = Flask(__name__)

@app.route("/webhook", methods=["POST"])
def webhook():

    data = request.json

    pdf_path = data.get("pdf")

    subprocess.run(["python","main.py", pdf_path])

    return {"status":"started"}

app.run(port=5000)