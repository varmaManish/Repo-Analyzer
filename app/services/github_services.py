import re
from typing import Optional, Dict, Any, List
import httpx
from fastapi import HTTPException
from app.core.config import settings

GITHUB_API = "https://api.github.com"


def _auth_headers(token: Optional[str]) -> Dict[str, str]:
    # Prefer an explicit token sent from client; fall back to env default (optional)
    final_token = token or ""
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Repo-Analyzer/1.0"
    }
    if final_token:
        headers["Authorization"] = f"token {final_token}"
    return headers


async def _raise_if_not_200(resp: httpx.Response, label: str):
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"{label} failed: {resp.text}")


async def fetch_repository_info(owner: str, repo: str, token: Optional[str]) -> Dict[str, Any]:
    headers = _auth_headers(token)
    base_url = f"{GITHUB_API}/repos/{owner}/{repo}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        repo_response = await client.get(base_url, headers=headers)
        await _raise_if_not_200(repo_response, "repository")

        contributors_response = await client.get(f"{base_url}/contributors?per_page=10", headers=headers)
        await _raise_if_not_200(contributors_response, "contributors")

        languages_response = await client.get(f"{base_url}/languages", headers=headers)
        await _raise_if_not_200(languages_response, "languages")

        commits_response = await client.get(f"{base_url}/commits?per_page=50", headers=headers)
        await _raise_if_not_200(commits_response, "commits")

        return {
            "repository": repo_response.json(),
            "contributors": contributors_response.json(),
            "languages": languages_response.json(),
            "commits": commits_response.json(),
        }


async def list_user_repositories(username: str, token: Optional[str]) -> List[Dict[str, Any]]:
    headers = _auth_headers(token)
    url = f"{GITHUB_API}/users/{username}/repos?per_page=100"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=headers)
        await _raise_if_not_200(resp, "user repos")
        return resp.json()


async def branch_commit_counts(owner: str, repo: str, token: Optional[str]) -> List[Dict[str, Any]]:
    headers = _auth_headers(token)
    branches_url = f"{GITHUB_API}/repos/{owner}/{repo}/branches"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(branches_url, headers=headers)
        await _raise_if_not_200(resp, "branches")
        branches = resp.json()

        results = []
        for branch in branches:
            name = branch["name"]
            commits_url = f"{GITHUB_API}/repos/{owner}/{repo}/commits?sha={name}&per_page=1"
            r = await client.get(commits_url, headers=headers)
            if r.status_code != 200:
                # skip this branch but don't fail the entire response
                continue

            # Count commits via pagination Link header
            link = r.headers.get("Link", "")
            match = re.search(r'&page=(\d+)>; rel="last"', link)
            count = int(match.group(1)) if match else len(r.json())
            results.append({"branch": name, "commits": count})

        return results


async def contributor_impact(owner: str, repo: str, token: Optional[str]) -> Dict[str, Any]:
    """
    NOTE: GitHub /commits list does NOT include stats by default.
    You normally need to hit each commit's detail or use /stats endpoints (which are cached and may be slow).
    We'll keep your original logic but add guards.
    """
    headers = _auth_headers(token)
    url = f"{GITHUB_API}/repos/{owner}/{repo}/contributors?per_page=100"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(url, headers=headers)
        await _raise_if_not_200(response, "contributors")

        contributors = response.json()
        impact_list = []

        # We will *estimate* additions/deletions since /commits list doesn't include stats
        # (You can extend this by fetching each commit sha detail to get real stats)
        for contributor in contributors:
            login = contributor["login"]
            commits = contributor.get("contributions", 0)

            # simple heuristic score
            impact_score = round(commits * 1.0, 2)

            impact_list.append({
                "login": login,
                "avatar_url": contributor.get("avatar_url"),
                "commits": commits,
                "additions": 0,
                "deletions": 0,
                "impact_score": impact_score
            })

        impact_list.sort(key=lambda x: x["impact_score"], reverse=True)
        return {"impact": impact_list}


async def security_score(owner: str, repo: str, token: Optional[str]) -> Dict[str, Any]:
    headers = _auth_headers(token)
    url = f"{GITHUB_API}/repos/{owner}/{repo}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Repository not found")

        repo_data = response.json()
        security_analysis = repo_data.get("security_and_analysis", {}) or {}

        checks = {
            "security_policy": bool(repo_data.get("security_policy_url")),
            "code_scanning_configured": (security_analysis.get("code_scanning", {}) or {}).get("status") == "enabled",
            "dependabot_enabled": (security_analysis.get("dependabot_security_updates", {}) or {}).get("status") == "enabled",
            "branch_protection_rules": False  # TODO: query /branches or /branch_protection
        }

        score = sum([25 for passed in checks.values() if passed])
        return {"security_score": score, "checks": checks}
