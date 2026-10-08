import pytest
from datetime import timedelta
from django.urls import reverse
from freezegun import freeze_time
from tests.factories import BalanceFactory, CategoryFactory, ReceiptFactory
from tests.utils import at

NOW = at(2026,10,7,12)  # Wednesday

@pytest.fixture(autouse=True)
def config(monkeypatch):
    # both are read from config.toml at import time; pin them so tests don't depend on local config
    monkeypatch.setattr('main.views.offset', 0)
    monkeypatch.setattr('main.views.fiscal_month_start', 15)

@pytest.mark.parametrize('now, offset, cutoff', [
    pytest.param(at(2026,10,7,12), 0, at(2026,10,5), id='wednesday'),
    pytest.param(at(2026,10,5,12), 0, at(2026,10,5), id='monday'),
    pytest.param(at(2026,10,4,12), 0, at(2026,9,28), id='sunday'),
    pytest.param(at(2026,10,7,12), 1, at(2026,10,4), id='sunday-start-wednesday'),
    pytest.param(at(2026,10,4,12), 1, at(2026,10,4), id='sunday-start-sunday'),
    pytest.param(at(2026,10,28,12), 1, at(2026,10,25), id='sunday-start-across-dst-change'),
])
def test_weekly_cutoff(api_client, user, monkeypatch, now, offset, cutoff):
    monkeypatch.setattr('main.views.offset', offset)
    ReceiptFactory(amount=10, date=cutoff)
    ReceiptFactory(amount=1, date=cutoff - timedelta(minutes=1))

    # log in under the frozen clock, else the session expires for far-future dates
    with freeze_time(now):
        api_client.force_login(user)
        response = api_client.get(reverse('overview'))

    assert response.status_code == 200
    assert response.data['weekly_spend'] == 10

@pytest.mark.parametrize('now, month_start, cutoff', [
    pytest.param(at(2026,10,7,12), 15, at(2026,9,15), id='before-month-start'),
    pytest.param(at(2026,10,15,12), 15, at(2026,10,15), id='on-month-start'),
    pytest.param(at(2026,10,20,12), 15, at(2026,10,15), id='after-month-start'),
    pytest.param(at(2027,1,7,12), 15, at(2026,12,15), id='january-rolls-back-year'),
    pytest.param(at(2026,10,7,12), 1, at(2026,10,1), id='calendar-month'),
])
def test_monthly_cutoff(api_client, user, monkeypatch, now, month_start, cutoff):
    monkeypatch.setattr('main.views.fiscal_month_start', month_start)
    ReceiptFactory(amount=10, date=cutoff)
    ReceiptFactory(amount=1, date=cutoff - timedelta(minutes=1))

    # log in under the frozen clock, else the session expires for far-future dates
    with freeze_time(now):
        api_client.force_login(user)
        response = api_client.get(reverse('overview'))

    assert response.status_code == 200
    assert response.data['monthly_spend'] == 10

@pytest.fixture
def overview_data(db):
    food = CategoryFactory(name='food', week_limit=500, month_limit=2000)
    misc = CategoryFactory(name='misc', is_misc=True)
    hidden = CategoryFactory(name='hidden', exclude_from_overview=True)
    ReceiptFactory(category=food, amount=100, date=at(2026,10,5))         # this week
    ReceiptFactory(category=food, amount=200, date=at(2026,10,4,23,59))   # last week, this month
    ReceiptFactory(category=food, amount=50, date=at(2026,9,15))          # first day of fiscal month
    ReceiptFactory(category=food, amount=400, date=at(2026,9,14,23,59))   # previous fiscal month
    ReceiptFactory(category=misc, amount=30, date=at(2026,10,6))
    ReceiptFactory(category=hidden, amount=1000, date=at(2026,10,6))

def test_overview(auth_client, overview_data):
    with freeze_time(NOW):
        data = auth_client.get(reverse('overview')).data

    # excluded categories are hidden from the breakdown but still count towards totals
    assert data['weekly_spend'] == 1130
    assert data['monthly_spend'] == 1380
    assert data['weekly_spend_categories'] == {
        'food': {'spend': 100, 'limit': 500, 'exclude': False, 'is_misc': False},
        'misc': {'spend': 30, 'limit': 1000, 'exclude': False, 'is_misc': True},
    }
    assert data['monthly_spend_categories'] == {
        'food': {'spend': 350, 'limit': 2000, 'exclude': False, 'is_misc': False},
        'misc': {'spend': 30, 'limit': 4000, 'exclude': False, 'is_misc': True},
    }
    assert data['other'] == {'week': 30, 'month': 30}
    assert data['balance'] == 0

def test_overview_without_data(auth_client, db):
    with freeze_time(NOW):
        data = auth_client.get(reverse('overview')).data

    assert data['weekly_spend'] == 0
    assert data['monthly_spend'] == 0
    assert data['weekly_spend_categories'] == {}
    assert data['other'] == {'week': 0, 'month': 0}
    assert data['balance'] == 0

def test_overview_balance(auth_client, db):
    with freeze_time(at(2026,10,6,12)):
        BalanceFactory(balance=1000)
    ReceiptFactory(amount=100, date=at(2026,10,7,1))

    with freeze_time(NOW):
        assert auth_client.get(reverse('overview')).data['balance'] == 900
