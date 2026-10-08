import pytest
from django.urls import reverse

PROTECTED = [
    ('get', 'overview', {}),
    ('post', 'receipt', {}),
    ('put', 'receipt', {}),
    ('delete', 'receipt', {}),
    ('get', 'categories', {}),
    ('get', 'tags', {}),
    ('get', 'balance', {}),
    ('post', 'balance', {}),
    ('post', 'query', {}),
    ('get', 'weekly_summary', {}),
    ('get', 'week_detail', {'year': 2026, 'week': 40}),
]

protected_endpoints = pytest.mark.parametrize('method, name, kwargs', [
    pytest.param(method, name, kwargs, id=f'{method}-{name}') for method, name, kwargs in PROTECTED
])

@protected_endpoints
def test_anonymous_forbidden(api_client, db, method, name, kwargs):
    response = getattr(api_client, method)(reverse(name, kwargs=kwargs))
    assert response.status_code == 403

@protected_endpoints
def test_unverified_forbidden_when_otp_required(auth_client, settings, method, name, kwargs):
    settings.OTP_REQUIRED = True
    response = getattr(auth_client, method)(reverse(name, kwargs=kwargs))
    assert response.status_code == 403

@pytest.mark.parametrize('method, name', [
    pytest.param('get', 'session', id='get-session'),
    pytest.param('post', 'login', id='post-login'),
    pytest.param('post', 'verify', id='post-verify'),
])
def test_public_endpoints_not_forbidden(api_client, db, method, name):
    response = getattr(api_client, method)(reverse(name))
    assert response.status_code != 403
