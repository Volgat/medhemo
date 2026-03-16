import os
from huggingface_hub import HfApi, create_repo
from dotenv import load_dotenv

load_dotenv()

def deploy():
    token = os.getenv("HF_TOKEN")
    if not token:
        print("HF_TOKEN missing in .env")
        return

    api = HfApi(token=token)
    
    # Get current user to build repo ID
    user = api.whoami()
    username = user["name"]
    repo_id = f"{username}/medhemo-backend"

    print(f"Initializing Hugging Face Space: {repo_id}")
    
    try:
        api.create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            private=False,
            exist_ok=True
        )
        print(f"Space created or already exists.")
    except Exception as e:
        print(f"Error creating repo: {e}")
        return

    # Files to upload
    files_to_upload = [
        "main.py",
        "earcp_orchestrator.py",
        "requirements.txt",
        "Dockerfile"
    ]
    
    # Also need the medhemo-earcp directory
    print(f"Uploading files...")
    
    for file in files_to_upload:
        if os.path.exists(file):
            api.upload_file(
                path_or_fileobj=file,
                path_in_repo=file,
                repo_id=repo_id,
                repo_type="space"
            )
            print(f"   - {file} uploaded.")

    # Deployment complete for core files

    # Set Secrets
    print("Setting Space Secrets...")
    try:
        api.add_space_secret(repo_id=repo_id, key="HF_TOKEN", value=token)
        api.add_space_secret(repo_id=repo_id, key="HF_MEDGEMMA_MODEL", value=os.getenv("HF_MEDGEMMA_MODEL"))
        api.add_space_secret(repo_id=repo_id, key="HF_WHISPER_MODEL", value=os.getenv("HF_WHISPER_MODEL"))
        print("   - Secrets configured.")
    except Exception as e:
        print(f"   - (Optional) Error setting secrets: {e}")

    print(f"\nDeployment started!")
    print(f"Link: https://huggingface.co/spaces/{repo_id}")
    print(f"API App URL: https://{username}-medhemo-backend.hf.space")

if __name__ == "__main__":
    deploy()
