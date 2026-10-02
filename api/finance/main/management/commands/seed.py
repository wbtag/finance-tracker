from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from main.models import Category, Balance

class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('--categories', type=str, nargs='+', default=[])
        parser.add_argument('--balance', type=int)

    def handle(self, *args, **options):

        if not options['categories'] and options['balance'] is None:
            raise CommandError('Nothing to seed, pass --categories and/or --balance.')

        with transaction.atomic():
            for category in options['categories']:
                _, created = Category.objects.get_or_create(name=category, defaults={'week_limit': 0, 'month_limit': 0, 'exclude_from_overview': False, 'is_misc': False})
                self.stdout.write(f'Category "{category}": {"created" if created else "already exists"}.')

            if options['balance'] is not None:
                if Balance.objects.exists():
                    self.stdout.write('Balance: already set, skipped. Use the app to record a new balance.')
                else:
                    Balance.objects.create(balance=options['balance'])
                    self.stdout.write(f'Balance: set to {options["balance"]}.')

        self.stdout.write('Seeded.')
