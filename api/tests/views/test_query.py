import pytest
from django.urls import reverse
from tests.factories import ReceiptFactory
from tests.utils import at

# Filtering logic is covered in tests/models/test_receipt_queries.py; these only check the view's input handling.

@pytest.fixture
def receipts(db):
    ReceiptFactory(description='food', date=at(2026,10,5), tags=['food'])
    ReceiptFactory(description='home', date=at(2026,10,6), tags=['home'])
    ReceiptFactory(description='out of range', date=at(2026,10,8), tags=['food'])

def test_query_by_tags(auth_client, receipts):
    response = auth_client.post(reverse('query'), data={'from': '2026-10-05', 'to': '2026-10-07', 'tags': ['food']})

    assert response.status_code == 200
    assert [row['description'] for row in response.data] == ['food']

def test_query_tags_optional(auth_client, receipts):
    response = auth_client.post(reverse('query'), data={'from': '2026-10-05', 'to': '2026-10-07'})

    assert response.status_code == 200
    assert sorted(row['description'] for row in response.data) == ['food', 'home']

@pytest.mark.parametrize('data, field', [
    pytest.param({'to': '2026-10-07'}, 'from', id='missing-from'),
    pytest.param({'from': '2026-10-05'}, 'to', id='missing-to'),
    pytest.param({'from': 'yesterday', 'to': '2026-10-07'}, 'from', id='invalid-from'),
    pytest.param({'from': '2026-10-05', 'to': '2026-13-01'}, 'to', id='invalid-to'),
    pytest.param({'from': '2026-10-05', 'to': '2026-10-07', 'tags': 'food'}, 'tags', id='tags-not-a-list'),
])
def test_query_rejects_invalid_input(auth_client, data, field):
    response = auth_client.post(reverse('query'), data=data)

    assert response.status_code == 400
    assert field in response.data
