import os
import urllib.request
import json
import base64
import numpy as np
import cv2
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="LYAM Biometrics AI Engine")

# Enable CORS for frontend and Node server access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model paths and download URLs
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

YUNET_PATH = "face_detection_yunet_2023mar.onnx"
SFACE_PATH = "face_recognition_sface_2021dec.onnx"
DB_FILE = "db.json"

# Global face detector and recognizer variables
detector = None
recognizer = None
roster_embeddings = {}  # Cache of key -> 128-D numpy array embeddings

def download_models():
    """Helper to download YuNet and SFace models if they are missing."""
    print("Checking model files...")
    for path, url in [(YUNET_PATH, YUNET_URL), (SFACE_PATH, SFACE_URL)]:
        if not os.path.exists(path):
            print(f"Downloading {path} from OpenCV Model Zoo...")
            try:
                # Add headers to avoid user-agent blocks
                opener = urllib.request.build_opener()
                opener.addheaders = [('User-agent', 'Mozilla/5.0')]
                urllib.request.install_opener(opener)
                urllib.request.urlretrieve(url, path)
                print(f"Successfully downloaded {path}.")
            except Exception as e:
                print(f"Error downloading {path}: {e}")
                # Fallback to local downloading if network errors occur
                raise RuntimeError(f"Could not download model {path}. Check internet connection. Error: {e}")

def init_models():
    global detector, recognizer
    download_models()
    print("Loading models into OpenCV DNN...")
    # Initialize YuNet Face Detector (size is dynamically updated during inference)
    detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (0, 0))
    # Initialize SFace Face Recognizer
    recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")
    print("Models loaded successfully.")

def decode_base64_image(base64_str: str) -> np.ndarray:
    """Decodes a base64 encoded image string into an OpenCV image matrix."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("cv2.imdecode returned None")
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")

def download_image_from_url(url: str) -> np.ndarray:
    """Downloads an image from a URL and converts to OpenCV format."""
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            img_bytes = response.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Failed to load image from URL {url}: {e}")
        return None

def extract_sface_embedding(img: np.ndarray):
    """Detects primary face, aligns/crops it, and extracts the 128-D feature vector."""
    if img is None:
        return None, None
        
    height, width = img.shape[:2]
    detector.setInputSize((width, height))
    
    # Detect faces: returns tuple of (status, faces_matrix)
    # faces_matrix contains bounding boxes (x, y, w, h) and landmarks
    _, faces = detector.detect(img)
    
    if faces is not None and len(faces) > 0:
        # Align and crop the first detected face
        face_aligned = recognizer.alignCrop(img, faces[0])
        # Extract features (128-D floating point embedding)
        feature = recognizer.feature(face_aligned)
        return feature, face_aligned
    return None, None

def calculate_confidence(cosine_score: float) -> float:
    """Maps raw cosine similarity [-1, 1] to a user-facing accuracy percentage."""
    if cosine_score < 0:
        return 0.0
    if cosine_score >= 0.85:
        return min(99.9, 95.0 + (cosine_score - 0.85) * 32.6)
        
    # Match threshold is 0.363
    # Score 0.363 maps to 72% confidence, score 0.6 maps to 90%
    if cosine_score < 0.363:
        return max(10.0, (cosine_score / 0.363) * 72.0)
    else:
        return 72.0 + ((cosine_score - 0.363) / (0.85 - 0.363)) * 23.0

def load_roster_embeddings():
    """Initializes embeddings cache by parsing db.json and processing employee avatars."""
    global roster_embeddings
    print("Pre-computing database face embeddings from roster...")
    if not os.path.exists(DB_FILE):
        print(f"Database file {DB_FILE} not found. Skipping initialization.")
        return
        
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            db_data = json.load(f)
            
        roster = db_data.get("roster", {})
        processed_count = 0
        
        for key, emp in roster.items():
            avatar = emp.get("avatar")
            if not avatar:
                continue
                
            img = None
            if avatar.startswith("data:image"):
                img = decode_base64_image(avatar)
            elif avatar.startswith("http"):
                img = download_image_from_url(avatar)
                
            if img is not None:
                emb, _ = extract_sface_embedding(img)
                if emb is not None:
                    roster_embeddings[key] = emb
                    processed_count += 1
                    print(f"Processed biometrics for: {emp.get('name')} (Key: {key})")
                else:
                    print(f"No face detected in avatar photo for: {emp.get('name')}")
            else:
                print(f"Could not load image for: {emp.get('name')}")
                
        print(f"Biometric indexing complete. Cached {processed_count} face profiles.")
    except Exception as e:
        print(f"Error loading database embeddings: {e}")

@app.on_event("startup")
def startup_event():
    init_models()
    load_roster_embeddings()

class ScanPayload(BaseModel):
    image: str

class RegisterPayload(BaseModel):
    key: str
    avatar: str

@app.post("/api/biometric/scan")
def scan_biometrics(payload: ScanPayload):
    """Receives a frame, validates quality/liveness, and matches against registered roster."""
    img = None
    if payload.image.startswith("data:image") or not payload.image.startswith("http"):
        img = decode_base64_image(payload.image)
    elif payload.image.startswith("http"):
        img = download_image_from_url(payload.image)
        
    if img is None:
        raise HTTPException(status_code=400, detail="Unable to load scan image.")
    
    # 1. Face Detection Check
    emb, face_crop = extract_sface_embedding(img)
    if emb is None:
        print("Scan result: No face detected in frame (e.g. wall/background).")
        return {"success": True, "match": False, "reason": "NO_FACE_DETECTED"}
        
    # 2. Liveness Check
    # Heuristic: Laplacian variance analysis to block low-contrast, flat, or blurred images
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    print(f"Liveness Check -> Laplacian Variance: {laplacian_var:.2f}")
    
    # Screen replays or paper printouts typically suffer from re-capturing blur/flatness
    if laplacian_var < 50:
        print(f"Scan result: Liveness rejected (variance {laplacian_var:.1f} < threshold 50.0).")
        return {"success": True, "match": False, "reason": "SPOOF_FAILED"}
        
    # 3. Vector Embeddings Cosine Matching
    best_match_key = None
    max_cosine = -1.0
    
    for key, registered_emb in roster_embeddings.items():
        # SFace match returns cosine similarity score using FR_COSINE
        score = recognizer.match(emb, registered_emb, cv2.FaceRecognizerSF_FR_COSINE)
        if score > max_cosine:
            max_cosine = score
            best_match_key = key
            
    confidence = calculate_confidence(max_cosine)
    print(f"Closest candidate: {best_match_key} | Cosine score: {max_cosine:.4f} | Confidence: {confidence:.1f}%")
    
    # SFace match threshold: >= 0.363 is considered a valid match
    if best_match_key and max_cosine >= 0.363:
        # Load name from db.json
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                db_data = json.load(f)
            name = db_data.get("roster", {}).get(best_match_key, {}).get("name", "Unknown")
            role = db_data.get("roster", {}).get(best_match_key, {}).get("role", "")
        except Exception:
            name = "Roster Member"
            role = ""
            
        print(f"Scan result: MATCH SUCCESSFUL for {name} ({confidence:.1f}%)")
        return {
            "success": True, 
            "match": True, 
            "employeeId": best_match_key, 
            "confidence": confidence,
            "name": name,
            "role": role
        }
    else:
        print(f"Scan result: Match failed (max similarity {max_cosine:.3f} < threshold 0.363).")
        return {"success": True, "match": False, "reason": "UNAUTHORIZED_STRANGER"}

@app.post("/api/biometric/register")
def register_biometrics(payload: RegisterPayload):
    """Extracts and saves embedding vector for newly enrolled candidates."""
    img = None
    if payload.avatar.startswith("data:image"):
        img = decode_base64_image(payload.avatar)
    elif payload.avatar.startswith("http"):
        img = download_image_from_url(payload.avatar)
        
    if img is None:
        raise HTTPException(status_code=400, detail="Unable to load registration image.")
        
    emb, _ = extract_sface_embedding(img)
    if emb is None:
        raise HTTPException(status_code=422, detail="No face detected in registration image.")
        
    roster_embeddings[payload.key] = emb
    print(f"Registered new face vector for key: {payload.key}")
    return {"success": True, "vector_length": int(emb.shape[1])}

@app.get("/api/biometric/status")
def get_status():
    return {
        "status": "online",
        "cached_profiles": len(roster_embeddings),
        "detector": "YuNet (ONNX)",
        "recognizer": "SFace (ONNX)"
    }
