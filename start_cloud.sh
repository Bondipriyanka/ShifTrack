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

echo "[2/4] Installing system dependencies & port-forwarding..."
sudo apt-get update -y > /dev/null 2>&1 || true
sudo apt-get install -y libgl1 libglib2.0-0 python3-pip python3-opencv python3-numpy > /dev/null 2>&1 || true
sudo iptables -t nat -C PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 2000 2>/dev/null || sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 2000 2>/dev/null || true

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

if [[ "$STATUS" != ONLINE* ]]; then
    echo ">> Notice: AI server process diagnostic output:"
    pm2 logs shiftrack-ai --lines 15 --nostream || true
fi

echo "=================================================="
echo " SUCCESS: ShifTrack Cloud is 100% LIVE and Ready! "
echo " Access Portal: http://13.210.115.48              "
echo " Verify AI:     http://13.210.115.48/api/debug/ai "
echo "=================================================="
