from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.utils import IntegrityError
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from getpass import getpass

class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('-u', '--username', type=str)
        parser.add_argument('-n', '--full-name', type=str)
        parser.add_argument('-t', '--totp-name', type=str)
        parser.add_argument('--user-only', default=False, action='store_true')

    def handle(self, *args, **options):

        if not options['username']:
            raise CommandError("Username must be provided.")

        with transaction.atomic():

            password = getpass('Password: ')
            password_confirm = getpass('Confirm password: ')

            if password != password_confirm:
                raise CommandError('Passwords do not match.')

            name_parts = (options['full_name'] or '').rsplit(' ', 1)
            first_name, last_name = name_parts if len(name_parts) == 2 else (name_parts[0], '')

            User = get_user_model()
            tentative_user = User(
                username=options['username'],
                first_name=first_name,
                last_name=last_name
            )

            try:
                validate_password(password, tentative_user)
            except ValidationError as e:
                raise CommandError('\n'.join(e.messages))

            try:
                tentative_user.set_password(password)
                tentative_user.save()
            except IntegrityError:
                raise CommandError('A user with this username already exists.')

            if not options['user_only']:
                kwargs = { 'name': options['totp_name'] } if options['totp_name'] else {}
                call_command('add_totp', username=options['username'], **kwargs)