import pytest
from datetime import date
from main.models import Receipt
from tests.factories import CategoryFactory, ReceiptFactory, ReceiptItemFactory
from tests.utils import at

# get_spend_by_week

@pytest.fixture
def weekly_data(db):
    ReceiptFactory(amount=10, date=at(2026,10,1))   # week 40
    ReceiptFactory(amount=20, date=at(2026,10,2))   # week 40
    ReceiptFactory(amount=5, date=at(2026,9,22))    # week 39
    ReceiptFactory(amount=99, date=at(2025,12,1))   # other year

@pytest.mark.parametrize('year', [
    pytest.param(2026, id='int-year'),
    pytest.param('2026', id='string-year'),  # the view passes the raw query param
])
def test_spend_by_week(weekly_data, year):
    assert Receipt.objects.get_spend_by_week(year) == [
        {'amount': 30, 'number': 40},
        {'amount': 5, 'number': 39},
    ]

def test_spend_by_week_without_year(weekly_data):
    assert Receipt.objects.get_spend_by_week(None) == []

# query_receipts

@pytest.fixture
def query_data(db):
    category = CategoryFactory(name='groceries')
    ReceiptFactory(description='simple food', amount=30, date=at(2026,10,5,10), tags=['food'], category=category)
    ReceiptFactory(description='simple untagged', amount=20, date=at(2026,10,5,11), category=category)
    extended = ReceiptFactory(description='extended mixed', type='extended', amount=100, date=at(2026,10,6), tags=['shop'], category=category)
    ReceiptItemFactory(receipt=extended, amount=60, tags=['food'])
    ReceiptItemFactory(receipt=extended, amount=40, tags=['home'])
    ReceiptFactory(description='last day', amount=15, date=at(2026,10,7,23,59), tags=['food'], category=category)
    ReceiptFactory(description='before range', amount=10, date=at(2026,10,4,23,59), tags=['food'], category=category)
    ReceiptFactory(description='after range', amount=10, date=at(2026,10,8), tags=['food'], category=category)

def query(tags, ascending=False):
    rows = Receipt.objects.query_receipts(date(2026,10,5), date(2026,10,7), tags, ascending)
    return {row['description']: row for row in rows}

def test_query_without_tags_returns_whole_range(query_data):
    rows = query([])

    assert set(rows) == {'simple food', 'simple untagged', 'extended mixed', 'last day'}
    assert all(row['filtered_amount'] == row['amount'] for row in rows.values())

def test_query_by_item_tag_counts_matching_items(query_data):
    rows = query(['food'])

    assert set(rows) == {'simple food', 'extended mixed', 'last day'}
    assert rows['simple food']['filtered_amount'] == 30
    assert rows['extended mixed']['amount'] == 100
    assert rows['extended mixed']['filtered_amount'] == 60

def test_query_by_receipt_tag_counts_whole_receipt(query_data):
    rows = query(['shop'])

    assert set(rows) == {'extended mixed'}
    assert rows['extended mixed']['filtered_amount'] == 100

def test_query_tags_combine_receipt_and_item_tags(query_data):
    # all query tags must match; item tags are combined with the receipt's tags
    rows = query(['food', 'shop'])

    assert set(rows) == {'extended mixed'}
    assert rows['extended mixed']['filtered_amount'] == 60

def test_query_unknown_tag_returns_nothing(query_data):
    assert query(['nonexistent']) == {}

@pytest.mark.parametrize('ascending, expected', [
    pytest.param(False, ['last day', 'extended mixed', 'simple untagged', 'simple food'], id='descending'),
    pytest.param(True, ['simple food', 'simple untagged', 'extended mixed', 'last day'], id='ascending'),
])
def test_query_ordering(query_data, ascending, expected):
    assert list(query([], ascending)) == expected

def test_query_row_shape(query_data):
    rows = query([])

    simple = rows['simple food']
    assert simple['type'] == 'simple'
    assert simple['category'] == 'groceries'
    assert simple['tags'] == ['food']
    assert simple['items'] == []

    extended = rows['extended mixed']
    assert extended['tags'] == ['shop']
    assert sorted((item['amount'], item['tags']) for item in extended['items']) == [(40, ['home']), (60, ['food'])]
