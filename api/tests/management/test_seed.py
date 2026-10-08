import re
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from main.models import Balance, Category

pytestmark = pytest.mark.django_db

def test_seed_categories_and_balance():
    out = StringIO()
    call_command('seed', categories=['A', 'B'], balance=100, stdout=out)
    assert set(Category.objects.values_list('name', flat=True)) == {'A', 'B'}
    assert Balance.objects.get().balance == 100
    assert 'Category "A": created.' in out.getvalue()
    assert 'Category "B": created.' in out.getvalue()
    assert 'Balance: set to 100.' in out.getvalue()
    assert out.getvalue().rstrip().endswith('Seeded.')

def test_seed_cli_arguments():
    call_command('seed', '--categories', 'A', 'B', '--balance', '100')
    assert set(Category.objects.values_list('name', flat=True)) == {'A', 'B'}
    assert Balance.objects.get().balance == 100

def test_seed_categories_only():
    call_command('seed', categories=['A'])
    category = Category.objects.get(name='A')
    assert category.week_limit == 0
    assert category.month_limit == 0
    assert category.exclude_from_overview is False
    assert category.is_misc is False
    assert not Balance.objects.exists()

def test_seed_existing_category_untouched():
    Category.objects.create(name='A', week_limit=500, month_limit=2000, is_misc=True)
    out = StringIO()
    call_command('seed', categories=['A', 'B'], stdout=out)
    category = Category.objects.get(name='A')
    assert category.week_limit == 500
    assert category.month_limit == 2000
    assert category.is_misc is True
    assert Category.objects.count() == 2
    assert 'Category "A": already exists.' in out.getvalue()
    assert 'Category "B": created.' in out.getvalue()

def test_seed_duplicate_category_in_args():
    out = StringIO()
    call_command('seed', categories=['A', 'A'], stdout=out)
    assert Category.objects.filter(name='A').count() == 1
    assert 'Category "A": created.' in out.getvalue()
    assert 'Category "A": already exists.' in out.getvalue()

def test_seed_balance_only():
    call_command('seed', balance=100)
    assert Balance.objects.get().balance == 100
    assert not Category.objects.exists()

def test_seed_zero_balance():
    # 0 is falsy, the command must still treat it as provided
    out = StringIO()
    call_command('seed', balance=0, stdout=out)
    assert Balance.objects.get().balance == 0
    assert 'Balance: set to 0.' in out.getvalue()

def test_seed_existing_balance_skipped():
    Balance.objects.create(balance=100)
    out = StringIO()
    call_command('seed', balance=500, stdout=out)
    assert Balance.objects.get().balance == 100
    assert 'Balance: already set, skipped.' in out.getvalue()

def test_seed_reject_no_arguments():
    with pytest.raises(CommandError, match=re.escape('Nothing to seed, pass --categories and/or --balance.')):
        call_command('seed')
    assert not Category.objects.exists()
    assert not Balance.objects.exists()
