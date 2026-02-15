"""Recipe search functionality using DuckDuckGo."""

from ddgs import DDGS

from src.services.scraping import filter_accessible_urls, is_blacklisted_domain

PAGE_SIZE = 10


def search_recipes(query: str, page: int = 0) -> dict:
    """Search for recipes using DuckDuckGo with pagination.

    Filters out blacklisted domains and inaccessible URLs.
    Continues fetching more results if filtering reduces count below PAGE_SIZE.

    Returns a dict with 'results' (list of recipes) and 'has_more' (boolean).
    """
    target_count = (page + 1) * PAGE_SIZE  # Total results needed through current page
    max_fetch = 50  # Safety limit to avoid infinite fetching

    with DDGS() as ddgs:
        all_results = []
        seen_urls = set()

        for result in ddgs.text(f"{query} recipe", max_results=max_fetch):
            url = result["href"]

            # Skip duplicates
            if url in seen_urls:
                continue
            seen_urls.add(url)

            # Skip blacklisted domains
            if is_blacklisted_domain(url):
                continue

            all_results.append(
                {"title": result["title"], "url": url, "snippet": result["body"]}
            )

            # Stop early if we have enough candidates to potentially fill the page
            # (we still need to filter for accessibility)
            if len(all_results) >= target_count + PAGE_SIZE:
                break

    # Filter for accessible URLs
    accessible_results = filter_accessible_urls(all_results)

    # Paginate
    start_idx = page * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    page_results = accessible_results[start_idx:end_idx]

    # Check if there are more results beyond current page
    has_more = len(accessible_results) > end_idx

    return {"results": page_results, "has_more": has_more}
