"""Tests for SSRF URL safety checks."""

import socket
from unittest.mock import patch

import pytest

from src.services.url_safety import validate_public_url


class TestValidatePublicUrl:
    """Tests for validate_public_url."""

    def test_rejects_localhost(self):
        with pytest.raises(ValueError):
            validate_public_url("http://localhost:8000")

    def test_rejects_private_ip(self):
        with pytest.raises(ValueError):
            validate_public_url("http://192.168.1.10/recipe")

    def test_rejects_non_http_scheme(self):
        with pytest.raises(ValueError):
            validate_public_url("ftp://example.com/file")

    @patch("src.services.url_safety.socket.getaddrinfo")
    def test_accepts_public_host(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                socket.IPPROTO_TCP,
                "",
                ("93.184.216.34", 443),
            )
        ]
        validate_public_url("https://example.com")
