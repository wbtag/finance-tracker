import pytest
from django.urls import reverse
from tests.factories import ReceiptFactory
from tests.utils import at

@pytest.fixture
def receipts(db):
    ReceiptFactory(description='sunday before', amount=1, date=at(2026,10,4,23,59))
    ReceiptFactory(description='monday', amount=10, date=at(2026,10,5))
    ReceiptFactory(description='saturday', amount=20, date=at(2026,10,10,12))
    ReceiptFactory(description='sunday', amount=30, date=at(2026,10,11,23,59))
    ReceiptFactory(description='monday after', amount=2, date=at(2026,10,12))
    ReceiptFactory(description='last year', amount=5, date=at(2025,6,1))

# weekly summary

def test_weekly_summary(auth_client, receipts):
    response = auth_client.get(reverse('weekly_summary'), query_params={'year': 2026})

    assert response.status_code == 200
    assert sorted(response.data['years']) == [2025, 2026]
    assert response.data['weeks'] == [
        {'amount': 2, 'number': 42},
        {'amount': 60, 'number': 41},
        {'amount': 1, 'number': 40},
    ]

def test_weekly_summary_without_year(auth_client, receipts):
    # the frontend always sends a year; without one, no weeks match
    response = auth_client.get(reverse('weekly_summary'))

    assert response.status_code == 200
    assert response.data['weeks'] == []

@pytest.mark.parametrize('year', ['abc', '-1', '2026.5'])
def test_weekly_summary_rejects_non_numeric_year(auth_client, year):
    response = auth_client.get(reverse('weekly_summary'), query_params={'year': year})

    assert response.status_code == 400
    assert 'year' in response.data

# week detail

def descriptions(response):
    return [row['description'] for row in response.data]

def test_week_detail(auth_client, receipts, monkeypatch):
    monkeypatch.setattr('main.views.offset', 0)
    response = auth_client.get(reverse('week_detail', kwargs={'year': 2026, 'week': 41}))

    assert response.status_code == 200
    assert descriptions(response) == ['monday', 'saturday', 'sunday']

def test_week_detail_sunday_week_start(auth_client, receipts, monkeypatch):
    monkeypatch.setattr('main.views.offset', 1)
    response = auth_client.get(reverse('week_detail', kwargs={'year': 2026, 'week': 41}))

    assert descriptions(response) == ['sunday before', 'monday', 'saturday']

@pytest.mark.parametrize('year, week', [
    pytest.param(2026, 0, id='week-zero'),
    pytest.param(2026, 54, id='week-54'),
    pytest.param(2025, 53, id='week-53-in-52-week-year'),
])
def test_week_detail_rejects_nonexistent_week(auth_client, year, week):
    response = auth_client.get(reverse('week_detail', kwargs={'year': year, 'week': week}))
    assert response.status_code == 404
