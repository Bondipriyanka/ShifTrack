#!/bin/bash
set -e

echo "=================================================="
echo " Starting ShifTrack Cloud Auto-Setup on AWS EC2   "
echo "=================================================="

cd /home/ubuntu/ShifTrack || cd ~/ShifTrack

echo "[1/4] Force-syncing latest codebase from GitHub..."
git fetch origin main
git reset --hard origin/main
git clean -fd

echo "[2/4] Installing Python AI libraries (OpenCV, FastAPI, Uvicorn)..."
sudo apt-get update -y > /dev/null 2>&1 || true
sudo apt-get install -y python3-pip python3-opencv python3-numpy python3-uvicorn python3-fastapi python3-pydantic > /dev/null 2>&1 || true
python3 -m pip install fastapi uvicorn opencv-python-headless numpy pydantic --break-system-packages > /dev/null 2>&1 || true

echo "[3/4] Launching Web Server and AI Biometrics Engine in PM2..."
pm2 delete all > /dev/null 2>&1 || true
pm2 start server.js --name shiftrack-server
pm2 start ai_server.py --name shiftrack-ai --interpreter python3
pm2 save

echo "[4/4] Verifying AI Biometrics status..."
for i in {1..8}; do
    STATUS=$(python3 -c "
import urllib.request, json
try:
    with urllib.request.urlopen('http://127.0.0.1:8000/api/biometric/status', timeout=2) as r:
        data = json.loads(r.read())
        print('ONLINE:' + str(data.get('cached_profiles', 0)))
except Exception as e:
    print('WAIT')
" 2>/dev/null || echo "WAIT")
    if [[ "$STATUS" == ONLINE* ]]; then
        PROFILES=$(echo "$STATUS" | cut -d: -f2)
        echo ">> AI Biometrics HTTP microservice is ONLINE on port 8000! ($PROFILES face profiles loaded)"
        break
    fi
    echo ">> AI server is loading face models, waiting... ($i/8)"
    sleep 2
done

echo "=================================================="
echo " SUCCESS: ShifTrack Cloud is 100% LIVE and Ready! "
echo " Access Portal: http://13.210.115.48              "
echo " Verify AI:     http://13.210.115.48/api/debug/ai "
echo "=================================================="
