from fastapi import APIRouter, Query
from app.services.github_service import (
    fetch_repository_info,
    fetch_branch_commit_counts,
    fetch_repository_contents,
    list_user_repositories,
    compute_contributor_impact,
    compute_security_score,
)

router = APIRouter()

@router.get("/github/{owner}/{repo}")
async def get_repository_info(owner: str, repo: str, token: str = Query(None)):
    return fetch_repository_info(owner, repo, token)

@router.get("/github/{owner}/{repo}/branch-commits")
async def get_branch_commit_counts(owner: str, repo: str, token: str = Query(None)):
    return fetch_branch_commit_counts(owner, repo, token)

@router.get("/github/{owner}/{repo}/contents")
async def get_repository_contents(owner: str, repo: str, path: str = Query(""), token: str = Query(None)):
    return fetch_repository_contents(owner, repo, path, token)

@router.get("/github/user/{username}/repos")
async def list_user_repos(username: str, token: str = Query(None)):
    return list_user_repositories(username, token)

@router.get("/repo/{username}/{repo}/contributors-impact")
async def contributors_impact(username: str, repo: str, token: str = Query(None)):
    return await compute_contributor_impact(username, repo, token)

@router.get("/repo/{owner}/{repo}/security-score")
def security_score(owner: str, repo: str, token: str = Query(None)):
    return compute_security_score(owner, repo, token)
