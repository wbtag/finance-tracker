import pytest
from django.contrib.auth import get_user_model
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient

@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username='tester', password='secret-pass-123')

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client(api_client, user):
    # force_login (not force_authenticate) so the request passes through
    # OTPMiddleware, which installs user.is_verified() used by IsOTPVerified
    api_client.force_login(user)
    return api_client


@pytest.fixture
def otp_device(user):
    return TOTPDevice.objects.create(user=user, name='default', confirmed=True)


@pytest.fixture
def otp_client(auth_client, otp_device):
    # Same session state django_otp.login() writes after a successful token check
    session = auth_client.session
    session[DEVICE_ID_SESSION_KEY] = otp_device.persistent_id
    session.save()
    return auth_client
