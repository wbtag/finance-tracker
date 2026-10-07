import pytest
from main.models import Category
from django.utils import timezone
from datetime import datetime
from tests.factories import ReceiptFactory, CategoryFactory
from tests.utils import at

cutoff = at(2026,10,5)

@pytest.fixture
def spend_data(db):
    groceries = CategoryFactory.create(name="groceries")
    misc = CategoryFactory.create(name="misc", is_misc=True)
    CategoryFactory.create(name="commute")

    ReceiptFactory.create(amount=20, date=cutoff, category=groceries)
    ReceiptFactory.create(amount=20, date=at(2026,10,3), category=groceries) # out of range
    ReceiptFactory.create(amount=20, date=at(2026,10,5,1), category=misc)
    ReceiptFactory.create(amount=20, date=at(2026,10,4,23,59), category=misc) # out of range

@pytest.mark.parametrize('method, limit', [
      ('get_weekly_category_spend', 1000),
      ('get_monthly_category_spend', 4000),
  ])
def test_category_spend(spend_data, method, limit):
    spend = getattr(Category.objects, method)(cutoff)

    assert spend['groceries']['spend'] == 20
    assert spend['groceries']['limit'] == limit
    assert spend['misc']['spend'] == 20
    assert spend['misc']['is_misc'] is True
    assert spend['commute']['spend'] == 0

