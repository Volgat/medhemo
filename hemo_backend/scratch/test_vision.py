import os
import sys
import base64
from dotenv import load_dotenv

# Load env
load_dotenv()

# Add parent path to import earcp_orchestrator
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from earcp_orchestrator import get_ensemble

def test():
    print("Testing process_vision...")
    ensemble = get_ensemble()
    
    # 1x1 transparent PNG in base64
    img_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    
    print("Calling process_vision...")
    try:
        res = ensemble.process_vision(img_b64, "Describe this image.")
        print("Result:", res)
    except Exception as e:
        print("EXCEPTION RAISED:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
