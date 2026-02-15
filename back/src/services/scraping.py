"""Web scraping utilities for fetching recipe content."""

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

from src.services.url_safety import validate_public_url

# Domains that require payment or login to access recipes
BLACKLISTED_DOMAINS = {
    "cooking.nytimes.com",
    "americastestkitchen.com",
    "cooksillustrated.com",
    "cookscountry.com",
    "milkstreet.com",
}

REQUEST_TIMEOUT_SECONDS = (5, 10)
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def is_blacklisted_domain(url: str) -> bool:
    """Check if URL belongs to a blacklisted domain."""
    try:
        domain = urlparse(url).netloc.lower()
        return any(
            domain == blacklisted or domain.endswith("." + blacklisted)
            for blacklisted in BLACKLISTED_DOMAINS
        )
    except Exception:
        return False


def get_website_text(url: str) -> str:
    """Fetch and extract text content from a URL."""
    validate_public_url(url)
    headers = {"User-Agent": USER_AGENT}
    response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    html_content = response.content
    soup = BeautifulSoup(html_content, "html.parser")
    element = soup.find("body")
    if element is None:
        return ""
    text = element.get_text()
    return re.sub(r"\n+", "\n", text)


def can_fetch_content(url: str) -> bool:
    """Check if a URL can be scraped (returns real content, not JS blocker)."""
    try:
        validate_public_url(url)
        headers = {"User-Agent": USER_AGENT}
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code != 200:
            return False

        soup = BeautifulSoup(response.content, "html.parser")
        body = soup.find("body")
        if not body:
            return False

        text = body.get_text()
        if len(text.strip()) < 200:
            return False

        return "enable javascript" not in text.lower()
    except Exception:
        return False


def filter_accessible_urls(results: list[dict], max_workers: int = 4) -> list[dict]:
    """Filter search results to only include accessible URLs."""
    accessible_with_index: list[tuple[int, dict]] = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_result = {
            executor.submit(can_fetch_content, r["url"]): (i, r)
            for i, r in enumerate(results)
        }
        for future in as_completed(future_to_result):
            index, result = future_to_result[future]
            if future.result():
                accessible_with_index.append((index, result))

    accessible_with_index.sort(key=lambda pair: pair[0])
    return [result for _, result in accessible_with_index]
