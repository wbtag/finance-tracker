import pytest
from django.db.models.deletion import ProtectedError
from main.models import Category

from tests.factories import CategoryFactory, ReceiptFactory


def test_fail_category_deletion_with_receipt_dependencies(auth_client):
    category = CategoryFactory.create(name='Category to delete')
    ReceiptFactory(category=category)
    with pytest.raises(ProtectedError):
        Category.objects.get(name=category.name).delete()
