from django.core.management.base import BaseCommand
from main.models import Category, Balance

class Command(BaseCommand):
    def handle(self, *args, **kwargs):

        Category.objects.get_or_create(name='A', week_limit=100, month_limit=400)
        Category.objects.get_or_create(name='B', week_limit=200, month_limit=800)

        Balance.objects.create(balance=1000)

        self.stdout.write('Seeded.')