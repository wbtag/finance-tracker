import json
import locale
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .serializers import BalanceSerializer, ReceiptSerializer
from datetime import date, datetime, timedelta

from .models import Receipt, ReceiptItem, Tag, Category, Balance, Income
from django.conf import settings
from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models import Sum
from django.utils import timezone
from django_otp import login as otp_login, match_token
from environs import env

env.read_env()

@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def session(request):
	user = request.user
	authenticated = bool(user and user.is_authenticated)
	return Response({
		'authenticated': authenticated,
		'verified': authenticated and (user.is_verified() or not settings.OTP_REQUIRED),
	})

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
	user = authenticate(
		request,
		username=request.data.get('username'),
		password=request.data.get('password'),
	)
	if user is None:
		return Response({'detail': 'Invalid credentials'}, status=401)

	login(request, user)
	return Response({'mfa_required': settings.OTP_REQUIRED})

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_view(request):
	user = request.user
	if not user.is_authenticated:
		return Response({'detail': 'Log in first'}, status=401)
	if user.is_verified() or not settings.OTP_REQUIRED:
		return Response({'username': user.get_username()})

	device = match_token(user, request.data.get('code', ''))
	if device is None:
		return Response({'detail': 'Invalid OTP token'}, status=401)

	otp_login(request, device)
	return Response({'username': user.get_username()})

@api_view(['GET'])
def overview(request):
	now = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
	cutoff = now
	if now.weekday() != 6:
		cutoff = now - timedelta(days=now.weekday()+1)

	fiscal_month_start = int(env("FISCAL_MONTH_START"))

	week_spend = Receipt.objects.filter(date__gte=cutoff).aggregate(Sum("amount"))
	month_cutoff = cutoff.replace(day=fiscal_month_start)
	if month_cutoff.day < fiscal_month_start:
		month_cutoff = month_cutoff.replace(month=month_cutoff.month - 1)
	month_spend = Receipt.objects.filter(date__gte=month_cutoff).aggregate(Sum("amount"))

	week_category_spend = Category.objects.get_weekly_category_spend(cutoff)
	month_category_spend = Category.objects.get_monthly_category_spend(month_cutoff)

	balance_data = Balance.objects.get_current_balance()
	balance = balance_data[0][0]

	excluded_categories = [cat for cat in env('SPEND_OVERVIEW_EXCLUDED_CATEGORIES', "").split(',')]

	data = {
		"weekly_spend": week_spend["amount__sum"] if week_spend["amount__sum"] else 0,
		"monthly_spend": month_spend["amount__sum"] if month_spend["amount__sum"] else 0,
		"balance": balance,
		"weekly_spend_categories": {k: v for (k, v) in week_category_spend.items() if k not in excluded_categories},
		"monthly_spend_categories": {k: v for (k, v) in month_category_spend.items() if k not in excluded_categories},
		"other": {'week': week_category_spend['Jiné']['spend'], 'month': month_category_spend['Jiné']['spend']}
	}

	return Response(data)

@api_view(['POST', 'PUT', 'DELETE'])
def receipt(request):
	offset = 1 if env.bool('SUNDAY_WEEK_START', default=False) else 0
	if request.method == 'POST':
		d = datetime.fromisoformat(request.data['date'])
		iso = (d+ timedelta(days=offset)).isocalendar()

		receipt_date = timezone.now().isoformat() if d.date() == timezone.now().date() else d.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

		receipt_type = request.data.get('type')
		category = Category.objects.get(name=request.data['category'])

		new_receipt = Receipt.objects.create(
			date=receipt_date,
			category=category,
			type=receipt_type,
			description=request.data['description'],
			amount=request.data['amount'],
			week=iso[1],
			year=iso[0],
		)

		tags_raw = request.data.get('tags', '')
		tag_names = []

		if tags_raw:
			try:
				tag_names = [t['value'] for t in json.loads(tags_raw)]
			except (ValueError, TypeError, KeyError):
				tag_names = [t.strip() for t in tags_raw.split(',') if t.strip()]
				print(f"receipt tag names {tag_names}")

		tags = [Tag.objects.get_or_create(name=name)[0] for name in tag_names]
		for tag in tags:
			new_receipt.tags.add(tag)

		if receipt_type == 'extended':
			for item in request.data.get('items'):
				receipt_item = ReceiptItem.objects.create(
					receipt=new_receipt,
					amount=item['amount']
				)

				item_tag_names = [t['value'] for t in json.loads(item['tags'])]

				tags = [Tag.objects.get_or_create(name=name)[0] for name in item_tag_names]

				for tag in tags:
					receipt_item.tags.add(tag)

		return Response(new_receipt.id, status=201)
	elif request.method == 'PUT':
		receipt = Receipt.objects.get(id=request.data['id'])
		for k, v in request.data.items():
			match k:
				case 'id':
					pass
				case 'date':
					date = datetime.fromisoformat(request.data['date'])
					setattr(receipt, 'date', date)
					iso = (date + timedelta(days=offset)).isocalendar()
					if receipt.week != iso[1]:
						setattr(receipt, 'year', iso[0])
						setattr(receipt, 'week', iso[1])
				case 'items':
					ids = [item.id for item in v]
					curr_items = [item for item in ReceiptItem.objects.filter(receipt=receipt)]
					for item in curr_items:
						if item.pk not in ids:
							ReceiptItem.objects.get(id=item.pk).delete()
					for item in v:
						db_item = ReceiptItem.objects.get(id=item.pk)
						db_item.amount = item.amount
						db_item.tags.clear()
						db_item.tags.set(item.tags)
				case 'tags':
					tags = [Tag.objects.get_or_create(name=tag['value'])[0] for tag in json.loads(v)]
					receipt.tags.clear()
					for tag in tags:
						receipt.tags.add(tag)
				case 'category':
					new_category = Category.objects.get(name=v)
					setattr(receipt, 'category', new_category)
				case _:
					setattr(receipt, k, v)
		receipt.save()
		serializer = ReceiptSerializer(receipt)
		return Response(serializer.data, status=200)
	elif request.method == 'DELETE':
		id = request.query_params.get('id')
		Receipt.objects.get(id=id).delete()
		return Response(status=204)
	else:
		return Response(status=405)

@api_view(['GET'])
def categories(request):
	categories = Category.objects.values_list('name', flat=True).distinct().order_by('week_limit')
	return Response(categories)

@api_view(['GET'])
def tags(request):
	tags = Tag.objects.values_list('name', flat=True).distinct()
	return Response(tags)

@api_view(['GET','POST'])
def balance(request):

	if request.method == 'POST':
		if request.data.get('type') == 'income':
			Income.objects.create(
			amount=request.data.get('amount'),
			description=request.data.get('description')
			)
			return Response(status=204)
		elif request.data.get('type') == 'balance':
			Balance.objects.create(
				balance=request.data.get('balance'),
			)
			return Response({'balance': request.data.get('balance')},  status=200)
		else:
			return Response({'error': 'Invalid type'}, status=400)
	else:
		balance_data = Balance.objects.get_current_balance()
		current_balance, income_since, spend_since, original_balance, balance_date = balance_data[0]

		locale.setlocale(locale.LC_TIME, 'cs_CZ.UTF-8')
		balance_date = balance_date.strftime('%x %H:%M')

		response_data = {
			"estimated_balance": current_balance,
			"income_since": income_since,
			"spend_since": spend_since,
			"balance": original_balance,
			"balance_date": balance_date,
		}

		serializer = BalanceSerializer(response_data)
		return Response(serializer.data)

@api_view(['POST'])
def query(request):
	date_from = date.fromisoformat(request.data.get('from'))
	date_to = date.fromisoformat(request.data.get('to'))
	try:
		tags = [tag['value'] for tag in json.loads(request.data.get('tags'))]
	except TypeError:
		tags = []
	receipts = Receipt.objects.query_receipts(date_from, date_to, tags)
	return Response(receipts)

@api_view(['GET'])
def weekly_summary(request):

	req_year = request.GET.get('year')

	weeks = Receipt.objects.get_spend_by_week(req_year)
	years = Receipt.objects.values_list('year', flat=True).distinct()

	context = {
		"years": years,
		"weeks": weeks,
	}

	return Response(context)

@api_view(['GET'])
def week_detail(request, year, week):
	mon = date.fromisocalendar(year, week, 1)
	start = mon - timedelta(days=1)  # Sunday
	end = mon + timedelta(days=5)
	receipts = Receipt.objects.query_receipts(start, end, tags=[], ascending=True)
	return Response(receipts)
