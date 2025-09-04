from typing import Any, Dict, List, Optional
import asyncio
from fastapi import HTTPException
from app.utils.http import github_headers, get
from app.utils.link_header import extract_last_page

# Mirrors your /github/{owner}/{repo} combined info call
def fetch_repository_info(owner: str, repo: str, token: Optional[str]) -> Dict[str, Any]:
    headers = github_headers(token)
    base_url = f"https://api.github.com/repos/{owner}/{repo}"

    repo_resp = get(base_url, headers)
    contrib_resp = get(f"{base_url}/contributors?per_page=10", headers)
    langs_resp = get(f"{base_url}/languages", headers)
    commits_resp = get(f"{base_url}/commits?per_page=50", headers)

    for key, resp in {
        "repository": repo_resp,
        "contributors": contrib_resp,
        "languages": langs_resp,
        "commits": commits_resp,
    }.items():
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"{key} request failed: {resp.text}")

    return {
        "repository": repo_resp.json(),
        "contributors": contrib_resp.json(),
        "languages": langs_resp.json(),
        "commits": commits_resp.json(),
    }

# Mirrors your branch-commit counting logic using Link header pagination
def fetch_branch_commit_counts(owner: str, repo: str, token: Optional[str]) -> List[Dict[str, Any]]:
    headers = github_headers(token)
    branches_url = f"https://api.github.com/repos/{owner}/{repo}/branches?per_page=100"

    resp = get(branches_url, headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text or "Failed to fetch branches")

    results: List[Dict[str, Any]] = []
    for branch in resp.json():
        name = branch.get("name")
        if not name:
            continue

        commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits"
        r = get(commits_url, headers, params={"sha": name, "per_page": 1})

        if r.status_code == 409:
            count = 0
        elif r.status_code != 200:
            results.append({"branch": name, "commits": 0})
            continue
        else:
            last_page = extract_last_page(r.headers.get("Link"))
            if last_page:
                count = last_page
            else:
                try:
                    data = r.json()
                    count = len(data) if isinstance(data, list) else 0
                except Exception:
                    count = 0

        results.append({"branch": name, "commits": count})

    return results

# Mirrors your repository contents endpoint with same response shape
def fetch_repository_contents(owner: str, repo: str, path: str, token: Optional[str]) -> Dict[str, Any]:
    headers = github_headers(token)
    contents_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"

    response = get(contents_url, headers)
    if response.status_code == 404:
        return {"error": "Path not found", "contents": [], "path": path}
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text or "Failed to fetch contents")

    contents = response.json()
    if not isinstance(contents, list):
        contents = [contents]

    processed = []
    for item in contents:
        processed.append({
            "name": item.get("name", ""),
            "path": item.get("path", ""),
            "type": item.get("type", "file"),
            "size": item.get("size", 0),
            "download_url": item.get("download_url"),
            "html_url": item.get("html_url"),
            "sha": item.get("sha", "")
        })

    processed.sort(key=lambda x: (x["type"] == "file", x["name"].lower()))
    return {"contents": processed, "path": path}

# Mirrors your user repos listing
def list_user_repositories(username: str, token: Optional[str]):
    headers = github_headers(token)
    url = f"https://api.github.com/users/{username}/repos?per_page=100"
    response = get(url, headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text or "Failed to fetch user repositories")
    return response.json()

# Mirrors your contributors-impact scoring and retry-on-202 behavior
async def compute_contributor_impact(username: str, repo: str, token: Optional[str]) -> Dict[str, Any]:
    headers = github_headers(token)
    stats_url = f"https://api.github.com/repos/{username}/{repo}/stats/contributors"

    max_retries = 5
    for attempt in range(max_retries):
        response = get(stats_url, headers)
        if response.status_code == 202:
            # GitHub is still generating stats
            await asyncio.sleep(2)
            continue
        if response.status_code == 200:
            break
        raise HTTPException(status_code=response.status_code, detail=response.text or "GitHub API Error")

    if response.status_code != 200:
        return {"impact": []}  # fallback gracefully

    contributors = response.json() or []
    impact_list = []
    for contrib in contributors[:10]:
        author = contrib.get("author") or {}
        login = author.get("login")
        avatar_url = author.get("avatar_url")
        commits = contrib.get("total", 0)
        weeks = contrib.get("weeks", [])
        additions = sum(week.get("a", 0) for week in weeks)
        deletions = sum(week.get("d", 0) for week in weeks)
        impact_score = round((commits * 1.0) + (additions * 0.5) - (deletions * 0.3), 2)

        impact_list.append({
            "login": login,
            "avatar_url": avatar_url,
            "commits": commits,
            "additions": additions,
            "deletions": deletions,
            "impact_score": impact_score
        })

    impact_list.sort(key=lambda x: x["impact_score"], reverse=True)
    return {"impact": impact_list}


# Mirrors your security-score logic and weights
def compute_security_score(owner: str, repo: str, token: Optional[str]) -> Dict[str, Any]:
    headers = github_headers(token)
    url = f"https://api.github.com/repos/{owner}/{repo}"
    response = get(url, headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Repository not found")

    repo_data = response.json() or {}
    security_analysis = repo_data.get("security_and_analysis", {}) or {}
    checks = {
        "security_policy": bool(repo_data.get("security_policy_url")),
        "code_scanning_configured": (security_analysis.get("code_scanning", {}) or {}).get("status") == "enabled",
        "dependabot_enabled": (security_analysis.get("dependabot_security_updates", {}) or {}).get("status") == "enabled",
        "branch_protection_rules": False
    }

    # check main branch protection
    branches_url = f"https://api.github.com/repos/{owner}/{repo}/branches/main/protection"
    branch_resp = get(branches_url, headers)
    checks["branch_protection_rules"] = branch_resp.status_code == 200

    score = sum(25 for passed in checks.values() if passed)
    return {"security_score": score, "checks": checks}
