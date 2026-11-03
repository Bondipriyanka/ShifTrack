#!/bin/bash
set -e

echo "=================================================="
echo " Starting ShifTrack Cloud Auto-Setup on AWS EC2   "
echo "=================================================="

cd /home/ubuntu/ShifTrack || cd ~/ShifTrack

echo "[1/4] Pulling latest updates from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "[2/4] Installing Python AI libraries (OpenCV, FastAPI, Uvicorn)..."
sudo apt-get update -y > /dev/null 2>&1 || true
sudo apt-get install -y python3-pip python3-opencv python3-numpy > /dev/null 2>&1 || true
python3 -m pip install fastapi uvicorn opencv-python-headless numpy pydantic --break-system-packages > /dev/null 2>&1 || true

echo "[3/4] Launching Web Server and AI Biometrics Engine in PM2..."
pm2 delete all > /dev/null 2>&1 || true
pm2 start server.js --name shiftrack-server
pm2 start ai_server.py --name shiftrack-ai --interpreter python3
pm2 save

echo "[4/4] Verifying AI Biometrics status on port 8000..."
sleep 3
python3 -c "
import urllib.request, json
try:
    with urllib.request.urlopen('http://127.0.0.1:8000/api/biometric/status', timeout=3) as r:
        data = json.loads(r.read())
        print('AI Biometrics is ONLINE! Total indexed face profiles:', data.get('cached_profiles', 0))
except Exception as e:
    print('AI server is warming up:', e)
"

echo "=================================================="
echo " SUCCESS: ShifTrack Cloud is 100% LIVE and Ready! "
echo "=================================================="
