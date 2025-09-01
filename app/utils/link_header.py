from typing import Optional

def extract_last_page(link_header: Optional[str]) -> int:
    """
    Parse GitHub Link header to get last page number.
    Mirrors your logic that searches for rel="last". 0 if none.
    """
    if not link_header:
        return 0
    last_url = None
    for part in link_header.split(","):
        part = part.strip()
        if 'rel="last"' in part:
            last_url = part.split(";")[0].strip(" <>")
            break
    if not last_url:
        return 0
    # page=N in query
    try:
        from urllib.parse import urlparse, parse_qs
        qs = parse_qs(urlparse(last_url).query)
        page_vals = qs.get("page")
        return int(page_vals[0]) if page_vals else 0
    except Exception:
        return 0
