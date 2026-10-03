import io

import qrcode
from django.core.management.base import BaseCommand, CommandError
from django_otp.plugins.otp_totp.models import TOTPDevice
from django.contrib.auth import get_user_model

class Command(BaseCommand):

    def get_user(self, username):
        User = get_user_model()
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f"No user with username '{username}'")

    def add_arguments(self, parser):
        parser.add_argument('--username', '-u')
        parser.add_argument('--name', '-n', type=str, default='Device')

    def handle(self, *args, **options):

        if not options['username']:
            raise CommandError("Username is required.")

        user = self.get_user(options['username'])

        device = TOTPDevice.objects.create(user=user, name=options['name'])

        # Rendered locally: the URL contains the TOTP secret, so it must not go to a QR web service.
        # Buffered because self.stdout appends a newline to every write().
        qr = qrcode.QRCode(border=2)
        qr.add_data(device.config_url)
        buf = io.StringIO()
        qr.print_ascii(out=buf, invert=True)

        self.stdout.write(f"Use the following URL to add device to your TOTP app: {device.config_url}")
        self.stdout.write("Or scan this QR code:")
        self.stdout.write(buf.getvalue())
