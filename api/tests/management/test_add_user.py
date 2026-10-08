import re
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django_otp.plugins.otp_totp.models import TOTPDevice

pytestmark = pytest.mark.django_db
User = get_user_model()

@pytest.fixture
def passwords(monkeypatch):
    def _set(*answers):
        it = iter(answers)
        monkeypatch.setattr(
            'main.management.commands.create_user.getpass',
            lambda prompt='': next(it),
        )
    return _set

@pytest.fixture
def strong_password():
    return 'YMZN@7P}fhWVE5(t0L'

# create_user

def test_create_user_with_totp_device(passwords, strong_password):
    passwords(*[strong_password] * 2)
    out = StringIO()
    call_command('create_user', username='test', full_name='Test User', totp_name='test device', stdout=out)
    u = User.objects.get(username='test')
    assert u.check_password(strong_password)
    device = TOTPDevice.objects.get(user=u)
    assert device.name == 'test device'

def test_create_user_without_totp_device(passwords, strong_password):
    passwords(*[strong_password] * 2)
    call_command('create_user', username='test', full_name='Test User', user_only=True)
    u = User.objects.get(username='test')
    assert not TOTPDevice.objects.filter(user=u).exists()

def test_create_user_default_totp_name(passwords, strong_password):
    passwords(*[strong_password] * 2)
    call_command('create_user', username='test')
    assert TOTPDevice.objects.get(user__username='test').name == 'Device'

def test_create_user_with_complex_name(passwords, strong_password):
    passwords(*[strong_password] * 2)
    call_command('create_user', username='test', full_name='Ferdinand Zvonimir Maria Balthus Keith Michael Otto Antal Bahnam Leonhard Habsburg-Lothringen', user_only=True)
    u = User.objects.get(username='test')
    assert u.first_name == 'Ferdinand Zvonimir Maria Balthus Keith Michael Otto Antal Bahnam Leonhard'
    assert u.last_name == 'Habsburg-Lothringen'

@pytest.mark.parametrize(('full_name', 'first_name', 'last_name'), [
    pytest.param('Bob', 'Bob', '', id='name-single-word'),
    pytest.param(None, '', '', id='name-missing'),
])
def test_create_user_partial_name(passwords, strong_password, full_name, first_name, last_name):
    passwords(*[strong_password] * 2)
    kwargs = {'full_name': full_name} if full_name else {}
    call_command('create_user', username='test', user_only=True, **kwargs)
    u = User.objects.get(username='test')
    assert u.first_name == first_name
    assert u.last_name == last_name

# Messages are checked individually, the order they are joined in follows AUTH_PASSWORD_VALIDATORS
@pytest.mark.parametrize(('username', 'password', 'errors'), [
    pytest.param('test', '12345678', ['This password is entirely numeric.'], id='password-numeric'),
    pytest.param('test', 'pass', ['This password is too short. It must contain at least 8 characters.'], id='password-short'),
    pytest.param('test', 'pass1234', ['This password is too common.'], id='password-common'),
    pytest.param('ferdinand', 'ferdinand1', ['The password is too similar to the username.'], id='password-similar'),
    pytest.param('test', 'pass123', [
        'This password is too short. It must contain at least 8 characters.',
        'This password is too common.',
    ], id='password-multifail'),
])
def test_create_user_reject_weak_password(passwords, username, password, errors):
    passwords(password, password)
    with pytest.raises(CommandError) as exc_info:
        call_command('create_user', username=username)
    for error in errors:
        assert error in str(exc_info.value)
    assert not User.objects.exists()

def test_create_user_reject_no_username():
    with pytest.raises(CommandError, match='Username must be provided'):
        call_command('create_user')
    assert not User.objects.exists()

def test_create_user_reject_duplicate_user(passwords, strong_password):
    passwords(*[strong_password] * 4)
    call_command('create_user', username='test', full_name='Test User')
    with pytest.raises(CommandError, match=re.escape('A user with this username already exists.')):
        call_command('create_user', username='test', full_name='Test User 2')
    u = User.objects.get(username='test')
    assert u.last_name == 'User'
    assert TOTPDevice.objects.filter(user=u).count() == 1

def test_create_user_reject_password_mismatch(passwords, strong_password):
    passwords(strong_password, '12345')
    with pytest.raises(CommandError, match=re.escape('Passwords do not match.')):
        call_command('create_user', username='test', full_name='Test User')
    assert not User.objects.exists()

# add_totp

def test_add_totp_default_name(user):
    out = StringIO()
    call_command('add_totp', username=user.username, stdout=out)
    device = TOTPDevice.objects.get(user=user)
    assert device.name == 'Device'
    assert device.config_url in out.getvalue()

def test_add_totp_custom_name(user):
    call_command('add_totp', username=user.username, name='Phone', stdout=StringIO())
    assert TOTPDevice.objects.get(user=user).name == 'Phone'

def test_add_totp_reject_no_username():
    with pytest.raises(CommandError, match=re.escape('Username is required.')):
        call_command('add_totp')
    assert not TOTPDevice.objects.exists()

def test_add_totp_reject_unknown_user():
    with pytest.raises(CommandError, match="No user with username 'ghost'"):
        call_command('add_totp', username='ghost')
    assert not TOTPDevice.objects.exists()
