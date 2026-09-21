from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from environs import env
import tomllib

env.read_env()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SECRET_KEY = env('DJANGO_SECRET_KEY')

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    'django.contrib.sites',
    'django.contrib.admin',
    'django.contrib.admindocs',
    'django_otp',
    'django_otp.plugins.otp_totp',
    'main',
    'rest_framework',
    'corsheaders'
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django_otp.middleware.OTPMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'main.permissions.IsOTPVerified',
    ],
}

# Hardcoded on purpose: only dev.py may relax this, so no prod env var can
# turn off the second factor.
OTP_REQUIRED = True

ROOT_URLCONF = 'finance.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'finance.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DATABASE_NAME'),
        'USER': env('DATABASE_USER'),
        'PASSWORD': env('DATABASE_PASSWORD'),
        'HOST': env('DATABASE_HOST'),
        'PORT': '5432'
    }
}

LANGUAGE_CODE = 'cs-cz'
TIME_ZONE = 'Europe/Prague'
USE_I18N = False
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

CONFIG_PATH = Path(env("CONFIG_PATH", default=str(BASE_DIR.parent.parent / "config.toml")))

try:
    with CONFIG_PATH.open("rb") as f:
        _config = tomllib.load(f)
except FileNotFoundError:
    raise ImproperlyConfigured(f"No config file at {CONFIG_PATH}. Copy config.example.toml to config.toml.")
except tomllib.TOMLDecodeError as e:
    raise ImproperlyConfigured(f"Malformed TOML in {CONFIG_PATH}: {e}")

try:
    FISCAL_MONTH_START = _config['Budgets']['month_start']
    SUNDAY_WEEK_START = _config['Budgets']['sunday_week_start']
except KeyError as e:
    raise ImproperlyConfigured(f"Missing key {e} in {CONFIG_PATH}")

if not 1 <= FISCAL_MONTH_START <= 28:
    raise ImproperlyConfigured(f"month_start must be between 1 and 28, got {FISCAL_MONTH_START}")

SITE_ID = 1
