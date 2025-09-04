from typing import Optional, Dict, Any
import requests
from app.core.config import settings

DEFAULT_TIMEOUT = 15

def github_headers(token: Optional[str]) -> Dict[str, str]:
    token = token or settings.GITHUB_TOKEN
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": settings.USER_AGENT
    }
    if token:
        headers["Authorization"] = f"token {token}"
    return headers

def get(url: str, headers: Dict[str, str], params: Optional[Dict[str, Any]] = None, timeout: int = DEFAULT_TIMEOUT):
    return requests.get(url, headers=headers, params=params, timeout=timeout)
