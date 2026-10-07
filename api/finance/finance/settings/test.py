from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]']
CORS_ALLOWED_ORIGINS = ['http://localhost:3000']
CSRF_TRUSTED_ORIGINS = ['http://localhost:3000']
OTP_REQUIRED = env.bool('OTP_REQUIRED', False)

REST_FRAMEWORK = {**REST_FRAMEWORK, 'TEST_REQUEST_DEFAULT_FORMAT': 'json'}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'test',
        'USER': env('DATABASE_USER'),
        'PASSWORD': env('DATABASE_PASSWORD'),
        'HOST': env('DATABASE_HOST'),
        'PORT': '5432'
    }
}