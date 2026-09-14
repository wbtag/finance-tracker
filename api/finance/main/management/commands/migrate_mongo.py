from datetime import datetime, timezone
from django.core.management.base import BaseCommand
from django.db import transaction
from pymongo import MongoClient
from main.models import Category, Tag, Receipt, ReceiptItem, Balance, Income

def ts(ms):
  return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)

class Command(BaseCommand):
  def handle(self, *args, **kwargs):
      db = MongoClient('mongodb://127.0.0.1').get_database('finances')

      with transaction.atomic():
          def get_tags(names):
              return [Tag.objects.get_or_create(name=n)[0] for n in names]

          for doc in db.receipts.find():
              category, _ = Category.objects.get_or_create(
                  name=doc['category'],
                  defaults={'week_limit': 0, 'month_limit': 0, 'has_limit': False},
              )
              receipt = Receipt.objects.create(
                  date=ts(doc['date']),
                  category=category,
                  type=doc['type'],
                  description=doc['description'],
                  amount=doc['amount'],
                  week=doc['week'],
                  year=doc['year'],
              )
              receipt.tags.set(get_tags(doc.get('tags', [])))
              # created_at is auto_now_add — override after insert
              Receipt.objects.filter(pk=receipt.pk).update(created_at=ts(doc['dateCreated']))

              for item in doc.get('items') or []:
                  ri = ReceiptItem.objects.create(receipt=receipt, amount=item['amount'])
                  ri.tags.set(get_tags(item.get('tags', [])))

          for doc in db.balances.find():
              b = Balance.objects.create(balance=doc['balance'])
              Balance.objects.filter(pk=b.pk).update(created_at=ts(doc['createdAt']))

          for doc in db.income.find():
              i = Income.objects.create(amount=doc['amount'], description=doc['description'])
              Income.objects.filter(pk=i.pk).update(created_at=ts(doc['createdAt']))

      self.stdout.write('Done.')