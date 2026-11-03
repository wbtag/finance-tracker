from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django_otp.plugins.otp_totp.models import TOTPDevice
from environs import env
from main.models import Balance, Category

env.read_env()


class Command(BaseCommand):
    def handle(self, *args, **options):

        test_user_username = env('DATABASE_USER', None)
        test_user_password = env('DATABASE_PASSWORD', None)

        if not test_user_username or not test_user_password:
            raise CommandError(
                'One or more of the following environment variables not set: DATABASE_USER, DATABASE_PASSWORD.'
            )

        User = get_user_model()
        test_user = User(username=test_user_username)

        print(test_user_password)

        test_user.set_password(test_user_password)
        test_user.save()

        # Hex-encoded TOTP secret shared with Cypress, which generates the codes for the OTP-on run.
        test_user_totp_key = env('TEST_USER_TOTP_KEY', None)

        if test_user_totp_key:
            TOTPDevice.objects.create(
                user=test_user, name='E2E', key=test_user_totp_key
            )

        Category.objects.get_or_create(
            name='Groceries',
            week_limit=3500,
            month_limit=14000,
            exclude_from_overview=False,
            is_misc=False,
        )

        Category.objects.get_or_create(
            name='Leisure',
            week_limit=2000,
            month_limit=8000,
            exclude_from_overview=False,
            is_misc=False,
        )

        Category.objects.get_or_create(
            name='Miscellaneous',
            week_limit=0,
            month_limit=0,
            exclude_from_overview=True,
            is_misc=True,
        )

        Balance.objects.get_or_create(balance=9999)
