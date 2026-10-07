import pytest
from freezegun import freeze_time
from datetime import datetime
from django.urls import reverse
from tests.utils import at

from main.models import Receipt, ReceiptItem, Tag
from tests.factories import CategoryFactory, ReceiptFactory, ReceiptItemFactory

@pytest.fixture(autouse=True)
def frozen_time():
    with freeze_time('2026-10-01 12:00'):
        yield

@pytest.fixture
def category(db):
    return CategoryFactory.create(name='test category')

@pytest.fixture
def receipt_base():
    return {
        'amount': 100,
        'date': datetime.now(),
        'description': 'test receipt',
        'type': 'simple',
        'tags': ['test tag'],
        'category': 'test category',
    }

# POST tests

def test_post_create_basic_receipt(auth_client, category, receipt_base):
    response = auth_client.post(reverse('receipt'), data=receipt_base)
    assert response.status_code == 201
    receipt = Receipt.objects.get(id=response.data)

    assert receipt.amount == 100
    assert receipt.description == 'test receipt'
    assert receipt.type == 'simple'
    assert receipt.category == category
    assert set(receipt.tags.values_list('name', flat=True)) == {'test tag'}

def test_post_create_extended_receipts(auth_client, category, receipt_base):
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'type': 'extended',
        'items': [{'amount': 50, 'tags': ['item_a']}, {'amount': 50, 'tags': ['item_b']}]
    })
    assert response.status_code == 201

    receipt = Receipt.objects.get(id=response.data)

    assert receipt.amount == 100
    assert receipt.description == 'test receipt'
    assert receipt.type == 'extended'
    assert receipt.category == category
    assert set(receipt.tags.values_list('name', flat=True)) == {'test tag'}
    items = [(item.amount, list(item.tags.values_list('name', flat=True))) for item in receipt.items.order_by('id')]
    assert items == [(50, ['item_a']), (50, ['item_b'])]

def test_post_reuses_existing_tags(auth_client, category, receipt_base):
    assert auth_client.post(reverse('receipt'), data=receipt_base).status_code == 201
    assert auth_client.post(reverse('receipt'), data=receipt_base).status_code == 201
    assert Tag.objects.filter(name='test tag').count() == 1

def test_post_simple_receipt_ignores_items(auth_client, category, receipt_base):
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'items': [{'amount': 100, 'tags': ['item_a']}]
    })
    assert response.status_code == 201
    assert ReceiptItem.objects.count() == 0

@freeze_time('2026-10-01 12:21+02:00')
def test_post_current_day_receipt_time(auth_client, category, receipt_base):
    response = auth_client.post(reverse('receipt'), data=receipt_base)
    receipt = Receipt.objects.get(id=response.data)
    assert receipt.date == at(2026,10,1,12,21)

@freeze_time('2026-10-01 12:21+02:00')
def test_post_other_day_receipt_time(auth_client, category, receipt_base):
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'date': at(2026,9,30)
    })
    receipt = Receipt.objects.get(id=response.data)
    assert receipt.date == at(2026,9,30,0)

def test_post_correct_week_year_boundary(auth_client, category, receipt_base):
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'date': at(2027,1,1)
    })
    receipt = Receipt.objects.get(id=response.data)
    assert receipt.week == 53
    assert receipt.year == 2026

def test_post_date_normalised_to_local_day(auth_client, category, receipt_base):
    # 22:30 UTC on Sep 29 is already Sep 30 in Prague
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'date': '2026-09-29T22:30:00+00:00'
    })
    receipt = Receipt.objects.get(id=response.data)
    assert receipt.date == at(2026,9,30)

@pytest.mark.parametrize('offset, week', [
    pytest.param(0, 40, id='monday-week-start'),
    pytest.param(1, 41, id='sunday-week-start'),
])
def test_post_sunday_week_start(auth_client, category, receipt_base, monkeypatch, offset, week):
    # offset is read from settings at import time, so patch the module value
    monkeypatch.setattr('main.views.offset', offset)
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'date': at(2026,10,4)  # Sunday
    })
    receipt = Receipt.objects.get(id=response.data)
    assert receipt.week == week

@pytest.mark.parametrize('override', [
    pytest.param({'amount': -1}, id='negative-amount'),
    pytest.param({'amount': 0}, id='zero-amount'),
    pytest.param({'amount': None}, id='null-amount'),
    pytest.param({'date': 'date'}, id='invalid-date'),
    pytest.param({'date': None}, id='null-date'),
    pytest.param({'description': ''}, id='empty-description'),
    pytest.param({'description': None}, id='null-description'),
    pytest.param({'category': ''}, id='empty-category'),
    pytest.param({'category': None}, id='null-category'),
    pytest.param({'category': 'nonexistent'}, id='unknown-category'),
    pytest.param({'type': ''}, id='empty-type'),
    pytest.param({'type': None}, id='null-type'),
])
def test_post_reject_invalid_param(auth_client, category, receipt_base, override):
    response = auth_client.post(reverse('receipt'), data={**receipt_base, **override})

    assert response.status_code == 400
    assert set(override) <= set(response.data)

def test_post_reject_extended_receipt_no_items(auth_client, receipt_base, category):
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'type': 'extended'
    })
    assert response.status_code == 400
    assert {'items'} <= set(response.data)
    assert Receipt.objects.count() == 0
    assert ReceiptItem.objects.count() == 0

def test_post_reject_extended_receipt_item_amount_mismatch(auth_client, receipt_base, category):
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'type': 'extended',
        'items': [{'amount': 10, 'tags': ['item_a']}, {'amount': 20, 'tags': ['item_b']}]
    })
    assert response.status_code == 400
    assert {'items'} <= set(response.data)
    assert Receipt.objects.count() == 0
    assert ReceiptItem.objects.count() == 0


@pytest.mark.parametrize('amount', [
    pytest.param(-1, id='negative-amount'),
    pytest.param(0, id='zero-amount'),
    pytest.param(None, id='none-amount'),
])
def test_post_reject_extended_receipt_invalid_item_amount(auth_client, receipt_base, category, amount):
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'type': 'extended',
        'items': [{'amount': amount, 'tags': ['item_a']}]
    })
    assert response.status_code == 400
    assert {'items'} <= set(response.data)
    assert Receipt.objects.count() == 0
    assert ReceiptItem.objects.count() == 0

@pytest.mark.xfail(strict=True, reason='Known bug: API does not require item tags')
def test_post_reject_extended_receipt_item_no_tags(auth_client, receipt_base, category):
    response = auth_client.post(reverse('receipt'), data={
        **receipt_base,
        'type': 'extended',
        'items': [{'amount': 80, 'tags': ['item_a']}, {'amount': 20}]
    })
    assert response.status_code == 400
    assert {'items'} <= set(response.data)

# PUT tests

@pytest.fixture
def existing_receipt(category):
    return ReceiptFactory(category=category)

@pytest.mark.parametrize('field', [
    pytest.param(('description', 'edited receipt'), id='edited-description'),
    pytest.param(('amount', 150), id='edited-amount'),
    pytest.param(('date', at(2026,9,28)), id='edited-date'),
])
def test_put_amend_valid_field(auth_client, existing_receipt, category, field):
    response = auth_client.put(reverse('receipt'), data={ 'id': existing_receipt.id, field[0]: field[1] })
    assert response.status_code == 200
    assert getattr(Receipt.objects.get(id=existing_receipt.id), field[0]) == field[1]

def test_put_replace_tags(auth_client, category):
    receipt = ReceiptFactory(category=category, tags=['old tag', 'kept tag'])
    response = auth_client.put(reverse('receipt'), data={ 'id': receipt.id, 'tags': ['kept tag', 'new tag'] })
    assert response.status_code == 200
    assert set(receipt.tags.values_list('name', flat=True)) == {'kept tag', 'new tag'}

def test_put_change_category(auth_client, existing_receipt, category):
    other = CategoryFactory(name='other category')
    response = auth_client.put(reverse('receipt'), data={ 'id': existing_receipt.id, 'category': 'other category' })
    assert response.status_code == 200
    existing_receipt.refresh_from_db()
    assert existing_receipt.category == other

@pytest.fixture
def existing_extended_receipt(category):
    receipt = ReceiptFactory(category=category, type='extended', amount=100)
    ReceiptItemFactory(receipt=receipt, amount=60, tags=['item_a'])
    ReceiptItemFactory(receipt=receipt, amount=40, tags=['item_b'])
    return receipt

def item_state(receipt):
    return [(item.amount, sorted(item.tags.values_list('name', flat=True))) for item in receipt.items.order_by('id')]

def test_put_extended_update_items(auth_client, existing_extended_receipt):
    item_a, item_b = existing_extended_receipt.items.order_by('id')
    response = auth_client.put(reverse('receipt'), data={
        'id': existing_extended_receipt.id,
        'items': [
            {'id': item_a.id, 'amount': 70, 'tags': ['item_a']},
            {'id': item_b.id, 'amount': 30, 'tags': ['item_c']},
        ],
    })
    assert response.status_code == 200
    assert list(existing_extended_receipt.items.order_by('id').values_list('id', flat=True)) == [item_a.id, item_b.id]
    assert item_state(existing_extended_receipt) == [(70, ['item_a']), (30, ['item_c'])]

def test_put_extended_add_and_remove_items(auth_client, existing_extended_receipt):
    item_a, item_b = existing_extended_receipt.items.order_by('id')
    response = auth_client.put(reverse('receipt'), data={
        'id': existing_extended_receipt.id,
        'items': [
            {'id': item_a.id, 'amount': 60, 'tags': ['item_a']},
            {'amount': 40, 'tags': ['item_new']},
        ],
    })
    assert response.status_code == 200
    assert not ReceiptItem.objects.filter(id=item_b.id).exists()
    assert item_state(existing_extended_receipt) == [(60, ['item_a']), (40, ['item_new'])]

def test_put_extended_change_amount_with_items(auth_client, existing_extended_receipt):
    item_a, item_b = existing_extended_receipt.items.order_by('id')
    response = auth_client.put(reverse('receipt'), data={
        'id': existing_extended_receipt.id,
        'amount': 150,
        'items': [
            {'id': item_a.id, 'amount': 100, 'tags': ['item_a']},
            {'id': item_b.id, 'amount': 50, 'tags': ['item_b']},
        ],
    })
    assert response.status_code == 200
    existing_extended_receipt.refresh_from_db()
    assert existing_extended_receipt.amount == 150

def test_put_extended_reject_amount_without_items(auth_client, existing_extended_receipt):
    response = auth_client.put(reverse('receipt'), data={ 'id': existing_extended_receipt.id, 'amount': 150 })
    assert response.status_code == 400
    assert {'items'} <= set(response.data)
    existing_extended_receipt.refresh_from_db()
    assert existing_extended_receipt.amount == 100

def test_put_extended_reject_items_sum_mismatch(auth_client, existing_extended_receipt):
    item_a, _ = existing_extended_receipt.items.order_by('id')
    response = auth_client.put(reverse('receipt'), data={
        'id': existing_extended_receipt.id,
        'items': [{'id': item_a.id, 'amount': 10, 'tags': ['item_a']}],
    })
    assert response.status_code == 400
    assert {'items'} <= set(response.data)
    # the removed item and the amount change are rolled back
    assert item_state(existing_extended_receipt) == [(60, ['item_a']), (40, ['item_b'])]

@pytest.mark.parametrize('foreign', [
    pytest.param(True, id='item-of-other-receipt'),
    pytest.param(False, id='nonexistent-item'),
])
def test_put_extended_reject_foreign_item_id(auth_client, existing_extended_receipt, category, foreign):
    item_id = ReceiptItemFactory(receipt__category=category).id if foreign else 999999
    item_a, _ = existing_extended_receipt.items.order_by('id')
    response = auth_client.put(reverse('receipt'), data={
        'id': existing_extended_receipt.id,
        'items': [
            {'id': item_a.id, 'amount': 60, 'tags': ['item_a']},
            {'id': item_id, 'amount': 40, 'tags': ['item_b']},
        ],
    })
    assert response.status_code == 400
    assert {'items'} <= set(response.data)
    assert item_state(existing_extended_receipt) == [(60, ['item_a']), (40, ['item_b'])]

@pytest.mark.parametrize('item', [
    pytest.param({'amount': 0, 'tags': ['item_a']}, id='zero-amount'),
    pytest.param({'amount': -1, 'tags': ['item_a']}, id='negative-amount'),
    pytest.param({'amount': None, 'tags': ['item_a']}, id='null-amount'),
    pytest.param({'amount': 100, 'tags': ['']}, id='blank-tag'),
])
def test_put_extended_reject_invalid_item(auth_client, existing_extended_receipt, item):
    response = auth_client.put(reverse('receipt'), data={ 'id': existing_extended_receipt.id, 'items': [item] })
    assert response.status_code == 400
    assert {'items'} <= set(response.data)
    assert item_state(existing_extended_receipt) == [(60, ['item_a']), (40, ['item_b'])]

@pytest.mark.xfail(strict=True, reason='Known bug: misconfigured validator')
def test_put_extended_reject_item_without_amount(auth_client, existing_extended_receipt):
    item_a, item_b = existing_extended_receipt.items.order_by('id')
    response = auth_client.put(reverse('receipt'), data={
        'id': existing_extended_receipt.id,
        'items': [{'id': item_a.id, 'tags': ['item_a']}, {'id': item_b.id, 'amount': 40, 'tags': ['item_b']}],
    })
    assert response.status_code == 400
    assert {'items'} <= set(response.data)


@pytest.mark.parametrize('receipt_id, expected', [
    pytest.param('', 400, id='empty-id'),
    pytest.param(None, 400, id='id-none'),
    pytest.param('abc', 400, id='non-numeric-id'),
    pytest.param(0, 404, id='id-zero'),
    pytest.param(999999, 404, id='unknown-id'),
])
def test_put_reject_invalid_id(auth_client, existing_receipt, receipt_id, expected):
    response = auth_client.put(reverse('receipt'), data={'id': receipt_id})
    assert response.status_code == expected

@pytest.mark.parametrize('field', [
    pytest.param(('description', ''), id='edited-description-empty'),
    pytest.param(('description', None), id='edited-description-none'),
    pytest.param(('amount', -1), id='edited-amount-negative'),
    pytest.param(('amount', 0), id='edited-amount-zero'),
    pytest.param(('amount', None), id='edited-amount-none'),
    pytest.param(('date', ''), id='edited-date-empty'),
    pytest.param(('date', None), id='edited-date-none'),
    pytest.param(('tags', 'not a list'), id='edited-tags-string'),
    pytest.param(('tags', None), id='edited-tags-none'),
    pytest.param(('tags', ['']), id='edited-tags-blank'),
    pytest.param(('tags', ['x' * 51]), id='edited-tags-too-long'),
    pytest.param(('category', ''), id='edited-category-empty'),
    pytest.param(('category', None), id='edited-category-none'),
    pytest.param(('category', 'nonexistent'), id='edited-category-unknown'),
])
def test_put_reject_invalid_field(auth_client, existing_receipt, category, field):
    response = auth_client.put(reverse('receipt'), data={ 'id': existing_receipt.id, field[0]: field[1] })
    assert response.status_code == 400
    assert {field[0]} <= set(response.data)

def test_put_recalculate_week_year(auth_client, existing_receipt, category):

    response = auth_client.put(reverse('receipt'), data={ 'id': existing_receipt.id, 'date': at(2028,1,1) })
    assert response.status_code == 200
    receipt = Receipt.objects.get(id=existing_receipt.id)
    assert receipt.week == 52
    assert receipt.year == 2027

def test_put_today_date_stored_at_midnight(auth_client, existing_receipt, category):
    # Unlike POST, PUT does not keep the current time for today's date
    response = auth_client.put(reverse('receipt'), data={ 'id': existing_receipt.id, 'date': at(2026,10,1,9) })
    assert response.status_code == 200
    assert Receipt.objects.get(id=existing_receipt.id).date == at(2026,10,1)

# DELETE tests

def test_delete_existing_basic_receipt(auth_client, existing_receipt, category):
    response = auth_client.delete(reverse('receipt', query={'id': existing_receipt.id}))
    assert response.status_code == 204
    assert Receipt.objects.count() == 0

@pytest.mark.parametrize('receipt_id, expected', [
    pytest.param(None, 400, id='missing-id'),
    pytest.param('', 400, id='empty-id'),
    pytest.param('abc', 400, id='non-numeric-id'),
    pytest.param(999999, 404, id='unknown-id'),
])
def test_delete_reject_invalid_id(auth_client, existing_receipt, receipt_id, expected):
    query = {} if receipt_id is None else {'id': receipt_id}
    response = auth_client.delete(reverse('receipt', query=query))
    assert response.status_code == expected
    assert Receipt.objects.count() == 1

def test_delete_existing_extended_receipt(auth_client, existing_extended_receipt):
    response = auth_client.delete(reverse('receipt', query={'id': existing_extended_receipt.id}))
    assert response.status_code == 204
    assert Receipt.objects.count() == 0
    assert ReceiptItem.objects.count() == 0

# Disallowed methods

def test_get_disallowed(auth_client):
    response = auth_client.get(reverse('receipt'))
    assert response.status_code == 405

def test_patch_disallowed(auth_client):
    response = auth_client.patch(reverse('receipt'))
    assert response.status_code == 405