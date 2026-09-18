"""Local development settings. Default for manage.py."""

from .base import *  # noqa: F403

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]']

# Next.js dev server proxies /api/* here, so its origin must be trusted.
CORS_ALLOWED_ORIGINS = ['http://localhost:3000']
CSRF_TRUSTED_ORIGINS = ['http://localhost:3000']

# Cookies stay non-Secure: dev runs over plain http.
