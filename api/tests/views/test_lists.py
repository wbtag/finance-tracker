from django.urls import reverse
from main.models import Tag
from tests.factories import CategoryFactory

def test_categories_ordered_by_week_limit_then_name(auth_client):
    CategoryFactory(name='b', week_limit=100)
    CategoryFactory(name='a', week_limit=100)
    CategoryFactory(name='c', week_limit=500)

    response = auth_client.get(reverse('categories'))

    assert response.status_code == 200
    assert list(response.data) == ['c', 'a', 'b']

def test_tags(auth_client):
    Tag.objects.create(name='food')
    Tag.objects.create(name='home')

    response = auth_client.get(reverse('tags'))

    assert response.status_code == 200
    assert sorted(response.data) == ['food', 'home']

def test_empty_lists(auth_client):
    assert list(auth_client.get(reverse('categories')).data) == []
    assert list(auth_client.get(reverse('tags')).data) == []
