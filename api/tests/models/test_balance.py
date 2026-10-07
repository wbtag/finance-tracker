import pytest
from freezegun import freeze_time
from main.models import Balance
from tests.utils import at
from ..factories import BalanceFactory, IncomeFactory, ReceiptFactory

@pytest.fixture
def balance_data(db):
    BalanceFactory.create(balance=10000)
    ReceiptFactory.create(amount=100)
    BalanceFactory.create(balance=1000)
    ReceiptFactory.create(amount=100)

def test_balance(balance_data):
    balance = getattr(Balance.objects, 'get_current_balance')()

    assert balance[0][0] == 900

@pytest.fixture
def recorded_balance(db):
    # Balance.created_at is auto_now_add, so freeze the clock to control it
    with freeze_time(at(2026,9,1,12)):
        BalanceFactory(balance=5000)  # older record, ignored
    with freeze_time(at(2026,10,1,12)):
        return BalanceFactory(balance=1000)

def test_current_balance_without_record(db):
    assert Balance.objects.get_current_balance() == []

def test_current_balance_uses_latest_record(recorded_balance):
    current, income, spend, balance, balance_date = Balance.objects.get_current_balance()[0]

    assert (current, income, spend, balance) == (1000, 0, 0, 1000)
    assert balance_date == at(2026,10,1,12)

def test_current_balance_counts_only_activity_after_record(recorded_balance):
    ReceiptFactory(amount=50, date=at(2026,10,1))  # midnight, before the record
    ReceiptFactory(amount=100, date=at(2026,10,2))
    with freeze_time(at(2026,9,30)):
        IncomeFactory(amount=300)  # before the record
    with freeze_time(at(2026,10,3)):
        IncomeFactory(amount=500)

    current, income, spend, balance, _ = Balance.objects.get_current_balance()[0]

    assert (current, income, spend, balance) == (1400, 500, 100, 1000)

def test_current_balance_ignores_receipt_at_record_time(recorded_balance):
    # comparison is strict (date > created_at)
    ReceiptFactory(amount=100, date=at(2026,10,1,12))

    assert Balance.objects.get_current_balance()[0][2] == 0
