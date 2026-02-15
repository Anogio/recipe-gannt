"""URL safety checks to mitigate SSRF attacks."""

import ipaddress
import socket
from urllib.parse import urlparse


def _is_public_ip_address(address: str) -> bool:
    """Return True when the IP address is globally routable."""
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False

    return ip.is_global


def validate_public_url(url: str) -> None:
    """Validate that URL is public and safe to fetch.

    Raises:
        ValueError: if URL is invalid or resolves to non-public addresses.
    """
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("URL must use http or https")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL hostname is missing")

    normalized = hostname.lower().strip(".")
    if normalized in {"localhost"} or normalized.endswith(".local"):
        raise ValueError("Localhost and local domains are not allowed")

    try:
        addr_info = socket.getaddrinfo(hostname, parsed.port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise ValueError("Unable to resolve hostname") from exc

    resolved_ips = {
        addr[4][0] for addr in addr_info if addr and len(addr) > 4 and addr[4]
    }
    if not resolved_ips:
        raise ValueError("Hostname did not resolve to an IP address")

    if any(not _is_public_ip_address(ip) for ip in resolved_ips):
        raise ValueError("URL resolves to a non-public network")
