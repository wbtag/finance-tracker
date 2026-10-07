import pytest
from datetime import datetime
from django.urls import reverse
from freezegun import freeze_time
from main.models import Balance, Income
from tests.factories import BalanceFactory, IncomeFactory, ReceiptFactory
from tests.utils import at

# GET

def test_get_without_balance_record(auth_client, db):
    with freeze_time(at(2026,10,7,12)):
        data = auth_client.get(reverse('balance')).data

    assert data['estimated_balance'] == 0
    assert data['income_since'] == 0
    assert data['spend_since'] == 0
    assert data['balance'] == 0
    assert datetime.fromisoformat(data['balance_date']) == at(2026,10,7,12)

def test_get_with_activity(auth_client, db):
    with freeze_time(at(2026,10,1,12)):
        BalanceFactory(balance=1000)
    with freeze_time(at(2026,10,2,12)):
        IncomeFactory(amount=500)
    ReceiptFactory(amount=100, date=at(2026,10,3))

    data = auth_client.get(reverse('balance')).data

    assert data['estimated_balance'] == 1400
    assert data['income_since'] == 500
    assert data['spend_since'] == 100
    assert data['balance'] == 1000
    assert datetime.fromisoformat(data['balance_date']) == at(2026,10,1,12)

# POST income

def test_post_income(auth_client):
    response = auth_client.post(reverse('balance'), data={'type': 'income', 'amount': 500, 'description': 'salary'})

    assert response.status_code == 201
    assert response.data == {'amount': 500, 'description': 'salary'}
    income = Income.objects.get()
    assert (income.amount, income.description) == (500, 'salary')

@pytest.mark.parametrize('override', [
    pytest.param({'amount': 0}, id='zero-amount'),
    pytest.param({'amount': -1}, id='negative-amount'),
    pytest.param({'amount': None}, id='null-amount'),
    pytest.param({'description': ''}, id='empty-description'),
    pytest.param({'description': 'x' * 256}, id='description-too-long'),
])
def test_post_income_rejects_invalid_field(auth_client, override):
    data = {'type': 'income', 'amount': 500, 'description': 'salary', **override}
    response = auth_client.post(reverse('balance'), data=data)

    assert response.status_code == 400
    assert set(override) <= set(response.data)
    assert Income.objects.count() == 0

# POST balance

def test_post_balance(auth_client):
    response = auth_client.post(reverse('balance'), data={'type': 'balance', 'balance': 2000})

    assert response.status_code == 200
    assert Balance.objects.get().balance == 2000
    assert auth_client.get(reverse('balance')).data['estimated_balance'] == 2000

@pytest.mark.parametrize('value', [
    pytest.param(None, id='null-balance'),
    pytest.param('abc', id='non-numeric-balance'),
])
def test_post_balance_rejects_invalid_value(auth_client, value):
    response = auth_client.post(reverse('balance'), data={'type': 'balance', 'balance': value})

    assert response.status_code == 400
    assert 'balance' in response.data
    assert Balance.objects.count() == 0

@pytest.mark.parametrize('data', [
    pytest.param({'type': 'other', 'amount': 500}, id='unknown-type'),
    pytest.param({'amount': 500}, id='missing-type'),
])
def test_post_rejects_invalid_type(auth_client, data):
    response = auth_client.post(reverse('balance'), data=data)

    assert response.status_code == 400
    assert response.data == {'error': 'Invalid type'}
