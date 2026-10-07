import factory
from django.utils import timezone
from main.models import Receipt, Category, Tag, ReceiptItem, Balance, Income

def set_tags(obj, create, extracted, **kwargs):
    if create and extracted:
        obj.tags.set(Tag.objects.get_or_create(name=n)[0] for n in extracted)

class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category
        django_get_or_create = ('name',)

    name = factory.Sequence(lambda n: f'category-{n}')
    week_limit = 1000
    month_limit = 4000

class ReceiptFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Receipt
        skip_postgeneration_save = True
    date = factory.LazyFunction(timezone.now)
    category = factory.SubFactory(CategoryFactory)
    type = 'simple'
    description = factory.Faker('sentence')
    amount = 100
    week = factory.LazyAttribute(lambda o: o.date.isocalendar()[1])
    year = factory.LazyAttribute(lambda o: o.date.isocalendar()[0])
    tags = factory.PostGeneration(set_tags)

class ReceiptItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ReceiptItem
        skip_postgeneration_save = True
    receipt = factory.SubFactory(ReceiptFactory, type="extended")
    amount = 50
    tags = factory.PostGeneration(set_tags)

class BalanceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Balance
    balance = 100
    created_at = factory.LazyFunction(timezone.now)

class IncomeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Income
    amount = 100
    description = factory.Faker('sentence')
