from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.core.security import get_current_user
from app.services import github_services

router = APIRouter()

# If you want them public, remove `current_user: dict = Depends(get_current_user)`
# and also remove it from handler signatures.


@router.get("/{owner}/{repo}")
async def get_repository_info(
    owner: str,
    repo: str,
    token: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return await github_services.fetch_repository_info(owner, repo, token)


@router.get("/{owner}/{repo}/branch-commits")
async def get_branch_commit_counts(
    owner: str,
    repo: str,
    token: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return await github_services.branch_commit_counts(owner, repo, token)


@router.get("/user/{username}/repos")
async def list_user_repositories(
    username: str,
    token: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return await github_services.list_user_repositories(username, token)


@router.get("/repo/{owner}/{repo}/contributors-impact")
async def get_contributor_impact(
    owner: str,
    repo: str,
    token: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return await github_services.contributor_impact(owner, repo, token)


@router.get("/repo/{owner}/{repo}/security-score")
async def get_security_score(
    owner: str,
    repo: str,
    token: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return await github_services.security_score(owner, repo, token)
