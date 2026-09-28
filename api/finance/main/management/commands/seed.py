from django.core.management.base import BaseCommand
from main.models import Category, Balance

class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('--categories', type=str, nargs='+')
        parser.add_argument('--balance', type=int)

    def handle(self, *args, **options):

        for category in options['categories']:
            Category.objects.get_or_create(name=category, week_limit=0, month_limit=0, exclude_from_overview=False, is_misc=False)

        Balance.objects.create(balance=options['balance'])

        self.stdout.write('Seeded.')