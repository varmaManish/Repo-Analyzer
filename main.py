from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import re

app = FastAPI()

# Enable CORS for GitHub Pages frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For better security: replace "*" with "https://yourusername.github.io"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Repo Analyzer backend is working ✅"}

@app.get("/github/{owner}/{repo}")
async def get_repository_info(owner: str, repo: str, token: str = Query(None)):
    headers = {"Authorization": f"token {token}"} if token else {}
    base_url = f"https://api.github.com/repos/{owner}/{repo}"

    try:
        repo_response = requests.get(base_url, headers=headers)
        contributors_response = requests.get(f"{base_url}/contributors?per_page=10", headers=headers)
        languages_response = requests.get(f"{base_url}/languages", headers=headers)
        commits_response = requests.get(f"{base_url}/commits?per_page=50", headers=headers)

        for key, response in {
            "repository": repo_response,
            "contributors": contributors_response,
            "languages": languages_response,
            "commits": commits_response
        }.items():
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"{key} request failed: {response.text}"
                )

        return {
            "repository": repo_response.json(),
            "contributors": contributors_response.json(),
            "languages": languages_response.json(),
            "commits": commits_response.json()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/github/{owner}/{repo}/branch-commits")
async def get_branch_commit_counts(owner: str, repo: str, token: str = Query(None)):
    headers = {"Authorization": f"token {token}"} if token else {}
    branches_url = f"https://api.github.com/repos/{owner}/{repo}/branches"

    try:
        resp = requests.get(branches_url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch branches")

        branches = resp.json()
        results = []

        for branch in branches:
            name = branch["name"]
            commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?sha={name}&per_page=1"
            r = requests.get(commits_url, headers=headers)

            if r.status_code != 200:
                continue

            if "Link" in r.headers:
                match = re.search(r"&page=(\d+)>; rel=\"last\"", r.headers["Link"])
                count = int(match.group(1)) if match else 1
            else:
                count = len(r.json())

            results.append({
                "branch": name,
                "commits": count
            })

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
