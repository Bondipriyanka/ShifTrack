import sys
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

real_stdout = sys.stdout
sys.stdout = sys.stderr

try:
    import ai_server
    input_data = sys.stdin.read()
    if not input_data:
        real_stdout.write(json.dumps({"success": False, "reason": "EMPTY_PAYLOAD"}) + "\n")
        real_stdout.flush()
        sys.exit(0)
        
    payload = json.loads(input_data)
    scan_payload = ai_server.ScanPayload(image=payload.get("image", ""))
    result = ai_server.scan_biometrics(scan_payload)
    real_stdout.write(json.dumps(result) + "\n")
    real_stdout.flush()
except Exception as e:
    real_stdout.write(json.dumps({"success": False, "match": False, "reason": "CLI_ERROR", "detail": str(e)}) + "\n")
    real_stdout.flush()
