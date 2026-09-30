from datetime import datetime, time, timedelta

from django.db import models, connection
from django.utils import timezone
from psycopg2.extras import RealDictCursor

class BalanceManager(models.Manager):
	def get_current_balance(self):
		with connection.cursor() as cursor:
			cursor.execute("""
				WITH latest_balance AS (
					SELECT *
					FROM main_balance b
					ORDER BY b.created_at DESC
					LIMIT 1
				), income AS (
					SELECT COALESCE(SUM(i.amount),0) as income
					FROM main_income i, latest_balance l
					WHERE i.created_at > COALESCE(l.created_at, NOW())
				), receipts AS (
					SELECT COALESCE(SUM(r.amount),0) as amount
					FROM main_receipt r, latest_balance l
					WHERE r.date > COALESCE(l.created_at, NOW())
				)
				SELECT
					lb.balance + i.income - r.amount AS current_balance,
					i.income AS income_since,
					r.amount AS spend_since,
					lb.balance AS balance,
					lb.created_at AS balance_date
				FROM latest_balance lb, receipts r, income i
			"""
		   )
			return cursor.fetchall()

class ReceiptManager(models.Manager):
	def get_weekly_spend(self, datetime):
		with connection.cursor() as cursor:
			cursor.execute('SELECT SUM(r.amount) FROM main_receipt r WHERE r.date >= %(date)s', { 'date': datetime })
			return cursor.fetchall()

	def get_weekly_receipts(self, week):
		with connection.cursor() as cursor:
			cursor = connection.connection.cursor(cursor_factory=RealDictCursor)
			cursor.execute("""
				SELECT *
				FROM main_receipt
				WHERE week = %s
			""")

	def get_spend_by_week(self, year):
		with connection.cursor() as cursor:
			cursor = connection.connection.cursor(cursor_factory=RealDictCursor)
			cursor.execute("""
				SELECT COALESCE(SUM(r.amount),0) as amount, r.week as number
				FROM main_receipt r
				WHERE r.year = %s
				GROUP BY r.week
				ORDER BY r.week DESC
			""", [year])
			return [dict(row) for row in cursor.fetchall()]

	def query_receipts(self, date_from, date_to, tags, ascending=False):
		order = 'ASC' if ascending else 'DESC'
		start = timezone.make_aware(datetime.combine(date_from, time.min))
		end = timezone.make_aware(datetime.combine(date_to + timedelta(days=1), time.min))
		with connection.cursor() as cursor:
			cursor = connection.connection.cursor(cursor_factory=RealDictCursor)
			cursor.execute(f"""
				WITH receipt_items AS (
					SELECT
					i.amount, i.id, receipt_id,
					array_agg(t.name) AS tags,
					CASE WHEN array_agg(t.name)::text[] @> %(tags)s THEN 1 ELSE 0 END AS has_query_tags
					FROM main_receiptitem i
					LEFT JOIN main_receiptitem_tags it ON i.id = it.receiptitem_id
					LEFT JOIN main_tag t ON it.tag_id = t.id
					GROUP BY i.id
				), receipts AS (
					SELECT r.id, r.date, r.type, c.name, r.description, r.amount, r.created_at,
						   array_agg(t.name) AS tags,
						   CASE WHEN array_agg(t.name)::text[] @> %(tags)s THEN 1 ELSE 0 END AS has_query_tags
					FROM main_receipt r
					LEFT JOIN main_receipt_tags rt ON r.id = rt.receipt_id
					LEFT JOIN main_tag t ON rt.tag_id = t.id
					LEFT JOIN main_category c ON r.category_id = c.id
					GROUP BY r.id, c.name
				) SELECT
					r.id, r.date, r.type, r.name AS category, r.description,
					CASE WHEN r.type = 'extended' THEN COALESCE(SUM(ri.amount), 0) ELSE r.amount END AS amount,
					r.tags,
					COALESCE(json_agg(
						json_build_object('id', ri.id, 'amount', ri.amount, 'tags', ri.tags)
					) FILTER (WHERE ri.id IS NOT NULL), '[]') AS items
				FROM receipts r
				LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
				WHERE
					r.date >= %(from)s AND r.date < %(to)s AND
					CASE
						WHEN r.has_query_tags = 1 THEN TRUE
						ELSE ri.has_query_tags = 1 END
				GROUP BY r.id, r.type, r.amount, r.date, r.name, r.description, r.tags
				ORDER BY r.date {order}
			""", {'tags': tags, 'from': start, 'to': end })
			return [dict(row) for row in cursor.fetchall()]

class CategoryManager(models.Manager):
	def get_weekly_category_spend(self, cutoff):
		with connection.cursor() as cursor:
			cursor = connection.connection.cursor(cursor_factory=RealDictCursor)
			cursor.execute("""
				SELECT c.id, c.name, c.week_limit, c.is_misc, c.exclude_from_overview as exclude, COALESCE(SUM(r.amount),0) as amount
				FROM main_receipt r
				RIGHT JOIN main_category c ON r.category_id = c.id AND r.date >= %s
				GROUP BY c.name, c.id, c.week_limit
				ORDER BY c.week_limit DESC, c.name ASC
				""", [cutoff])
			output = [dict(row) for row in cursor.fetchall()]
			return {row['name']: {
				'spend': row['amount'],
				'limit': row['week_limit'],
				'exclude': row['exclude'],
				'is_misc': row['is_misc']
			} for row in output}

	def get_monthly_category_spend(self, cutoff):
		with connection.cursor() as cursor:
			cursor = connection.connection.cursor(cursor_factory=RealDictCursor)
			cursor.execute("""
					SELECT c.id, c.name, c.month_limit, c.is_misc, c.exclude_from_overview as exclude, COALESCE(SUM(r.amount),0) as amount
					FROM main_receipt r
					RIGHT JOIN main_category c ON r.category_id = c.id AND r.date >= %s
					GROUP BY c.name, c.id, c.month_limit
					ORDER BY c.month_limit DESC, c.name ASC
				""", [cutoff])
			output = [dict(row) for row in cursor.fetchall()]
			return {row['name']: {
				'spend': row['amount'],
				'limit': row['month_limit'],
				'exclude': row['exclude'],
				'is_misc': row['is_misc']
			} for row in output}

class Tag(models.Model):
	name = models.CharField(max_length=50)

class Category(models.Model):
	name = models.CharField(max_length=255)
	exclude_from_overview = models.BooleanField(default=False)
	is_misc = models.BooleanField(default=False)
	week_limit = models.IntegerField()
	month_limit = models.IntegerField()

	objects = CategoryManager()

class Receipt(models.Model):
	types = [
		('simple', 'Simple'),
		('extended', 'Extended'),
		('mandatory', 'Mandatorní'),
	]

	date = models.DateTimeField()
	category = models.ForeignKey(Category, on_delete=models.CASCADE)
	type = models.CharField(max_length=255, choices=types)
	description = models.CharField(max_length=255)
	amount = models.IntegerField()
	tags = models.ManyToManyField(Tag, related_name='receipts', blank=True)
	week = models.IntegerField()
	year = models.IntegerField()
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	objects = ReceiptManager()

class ReceiptItem(models.Model):
	receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name='items')
	tags = models.ManyToManyField(Tag, related_name='receiptItems', blank=True)
	amount = models.IntegerField()

class Balance(models.Model):
	balance = models.IntegerField()
	created_at = models.DateTimeField(auto_now_add=True)

	objects = BalanceManager()

class Income(models.Model):
	amount = models.IntegerField()
	description = models.CharField(max_length=255)
	created_at = models.DateTimeField(auto_now_add=True)


