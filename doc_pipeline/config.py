import os

# Google Drive folder to monitor
GOOGLE_DRIVE_FOLDER_ID = "1SuwqJXY1znzIMUvIVISC1IY2z-EfOyKM"

# Supabase configuration
SUPABASE_URL = "https://vqrkyepybgcieeypqimh.supabase.co"

SUPABASE_KEY = "sb_publishable_Z6iU-xfJQLOa5wpdm-mwsg_WVgqoo3T"

# Google Vision OCR credentials
GOOGLE_APPLICATION_CREDENTIALS = "google-vision-ocr.json"

# Set environment variable automatically
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

# Qwen API endpoint
QWEN_ENDPOINT = "http://localhost:8000/qwen"

# Local storage
UPLOAD_DIR = "uploads"
STATUS_FILE = "status.json"

# Translation settings
ENABLE_ODIA_TRANSLATION = False
TARGET_LANGUAGE = "or"

# Free tier safety limits

VISION_FREE_LIMIT = 1000        # Vision OCR pages per month
GEMINI_FREE_LIMIT = 500000      # tokens estimate

# Vertex AI configuration
PROJECT_ID = "aruedu"
LOCATION = "us-central1"

REGION = "us-central1"
PROJECT_ID = "aruedu"
API_KEY = "AQ.Ab8RN6JJ10IPiniP59l4e2x9NcseOxdeCjKEFWtS-659Ky2Sww"
GEMINI_MODEL = "gemini-2.5-flash-lite"





