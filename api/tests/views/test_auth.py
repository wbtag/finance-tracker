import pytest
from django.urls import reverse
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient

CREDENTIALS = {'username': 'tester', 'password': 'secret-pass-123'}

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

def current_token(device):
    token = totp(device.bin_key, step=device.step, t0=device.t0, digits=device.digits, drift=device.drift)
    return str(token).zfill(device.digits)

# session

class TestSession:
    def test_anonymous(self, api_client, db):
        response = api_client.get(reverse('session'))
        assert response.status_code == 200
        assert response.data == {'authenticated': False, 'verified': False}

    def test_sets_csrf_cookie(self, api_client, db):
        response = api_client.get(reverse('session'))
        assert 'csrftoken' in response.cookies

    @pytest.mark.parametrize('otp_required, verified', [
        pytest.param(False, True, id='otp-not-required'),
        pytest.param(True, False, id='otp-required'),
    ])
    def test_logged_in(self, auth_client, settings, otp_required, verified):
        settings.OTP_REQUIRED = otp_required
        response = auth_client.get(reverse('session'))
        assert response.data == {'authenticated': True, 'verified': verified}

    def test_otp_verified(self, otp_client, settings):
        settings.OTP_REQUIRED = True
        response = otp_client.get(reverse('session'))
        assert response.data == {'authenticated': True, 'verified': True}

# login

class TestLogin:
    @pytest.mark.parametrize('otp_required', [True, False])
    def test_valid_credentials(self, api_client, user, settings, otp_required):
        settings.OTP_REQUIRED = otp_required
        response = api_client.post(reverse('login'), data=CREDENTIALS)

        assert response.status_code == 200
        assert response.data == {'mfa_required': otp_required}
        assert api_client.get(reverse('session')).data['authenticated'] is True

    @pytest.mark.parametrize('data', [
        pytest.param({**CREDENTIALS, 'password': 'wrong'}, id='wrong-password'),
        pytest.param({**CREDENTIALS, 'username': 'nobody'}, id='unknown-user'),
        pytest.param({}, id='missing-credentials'),
    ])
    def test_rejects_invalid_credentials(self, api_client, user, data):
        response = api_client.post(reverse('login'), data=data)

        assert response.status_code == 401
        assert api_client.get(reverse('session')).data['authenticated'] is False

    def test_rejects_missing_csrf_token(self, user):
        client = APIClient(enforce_csrf_checks=True)
        response = client.post(reverse('login'), data=CREDENTIALS)
        assert response.status_code == 403

    def test_accepts_csrf_token_from_session_cookie(self, user):
        client = APIClient(enforce_csrf_checks=True)
        client.get(reverse('session'))
        token = client.cookies['csrftoken'].value

        response = client.post(reverse('login'), data=CREDENTIALS, HTTP_X_CSRFTOKEN=token)
        assert response.status_code == 200

# verify

class TestVerify:
    def test_rejects_anonymous(self, api_client, db):
        response = api_client.post(reverse('verify'), data={'code': '123456'})
        assert response.status_code == 401

    def test_skips_token_when_otp_not_required(self, auth_client, settings):
        settings.OTP_REQUIRED = False
        response = auth_client.post(reverse('verify'), data={})
        assert response.status_code == 200
        assert response.data == {'username': 'tester'}

    def test_skips_token_when_already_verified(self, otp_client, settings):
        settings.OTP_REQUIRED = True
        response = otp_client.post(reverse('verify'), data={})
        assert response.status_code == 200

    def test_accepts_valid_token(self, auth_client, otp_device, settings):
        settings.OTP_REQUIRED = True
        response = auth_client.post(reverse('verify'), data={'code': current_token(otp_device)})

        assert response.status_code == 200
        assert response.data == {'username': 'tester'}
        assert auth_client.get(reverse('session')).data['verified'] is True

    @pytest.mark.parametrize('code', [
        pytest.param('invalid', id='non-numeric'),
        pytest.param('', id='empty'),
        pytest.param(None, id='missing'),
    ])
    def test_rejects_invalid_token(self, auth_client, otp_device, settings, code):
        settings.OTP_REQUIRED = True
        data = {} if code is None else {'code': code}
        response = auth_client.post(reverse('verify'), data=data)

        assert response.status_code == 401
        assert auth_client.get(reverse('session')).data['verified'] is False

def test_full_login_flow_with_otp(api_client, otp_device, settings):
    settings.OTP_REQUIRED = True

    assert api_client.post(reverse('login'), data=CREDENTIALS).data == {'mfa_required': True}
    assert api_client.get(reverse('tags')).status_code == 403

    assert api_client.post(reverse('verify'), data={'code': current_token(otp_device)}).status_code == 200
    assert api_client.get(reverse('tags')).status_code == 200
