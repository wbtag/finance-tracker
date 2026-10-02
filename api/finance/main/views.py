from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .serializers import BalanceSerializer, ReceiptSerializer, ReceiptRequestSerializer, QueryRequestSerializer, IncomeRequestSerializer, BalanceRequestSerializer
from datetime import date, timedelta

from .models import Receipt, ReceiptItem, Tag, Category, Balance, Income
from django.conf import settings
from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django_otp import login as otp_login, match_token

fiscal_month_start = settings.FISCAL_MONTH_START
offset = 1 if settings.SUNDAY_WEEK_START else 0

def get_tags(names):
	return [Tag.objects.get_or_create(name=name)[0] for name in names]

def get_receipt(receipt_id):
	try:
		return Receipt.objects.get(id=int(receipt_id))
	except (TypeError, ValueError):
		raise ValidationError({ 'id': 'A numeric receipt id is required' })
	except Receipt.DoesNotExist:
		raise NotFound(f'Receipt {receipt_id} not found')

def validate_items_sum(receipt):
	if receipt.type != 'extended':
		return
	items_sum = receipt.items.aggregate(total=Sum('amount'))['total'] or 0
	if items_sum != receipt.amount:
		raise ValidationError({ 'items': f'Items sum ({items_sum}) does not match receipt amount ({receipt.amount})' })

@api_view(['GET'])
def config(request):
	return Response({
		'fiscalMonthStart': fiscal_month_start,
		'sundayWeekStart': settings.SUNDAY_WEEK_START,
	})

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
	now = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
	# Days since week start: weekday() is 0 on Monday, offset moves the start back to Sunday.
	cutoff = now - timedelta(days=(now.weekday() + offset) % 7)

	week_spend = Receipt.objects.filter(date__gte=cutoff).aggregate(Sum("amount"))
	month_cutoff = now.replace(day=fiscal_month_start)
	if now.day < fiscal_month_start:
		# Fiscal month has not begun yet this calendar month; step back one.
		if month_cutoff.month == 1:
			month_cutoff = month_cutoff.replace(year=month_cutoff.year - 1, month=12)
		else:
			month_cutoff = month_cutoff.replace(month=month_cutoff.month - 1)
	month_spend = Receipt.objects.filter(date__gte=month_cutoff).aggregate(Sum("amount"))

	week_category_spend = Category.objects.get_weekly_category_spend(cutoff)
	month_category_spend = Category.objects.get_monthly_category_spend(month_cutoff)

	balance_data = Balance.objects.get_current_balance()

	try:
		balance = balance_data[0][0]
	except IndexError:
		balance = 0

	data = {
		"weekly_spend": week_spend["amount__sum"] if week_spend["amount__sum"] else 0,
		"monthly_spend": month_spend["amount__sum"] if month_spend["amount__sum"] else 0,
		"balance": balance,
		"weekly_spend_categories": {k:v for (k,v) in week_category_spend.items() if not v['exclude']},
		"monthly_spend_categories": {k:v for (k,v) in month_category_spend.items() if not v['exclude']},
		"other": {
			'week': sum([v['spend'] for (k,v) in week_category_spend.items() if v['is_misc']]),
			'month': sum([v['spend'] for (k,v) in month_category_spend.items() if v['is_misc']]),
		}
	}

	return Response(data)

@api_view(['POST', 'PUT', 'DELETE'])
def receipt(request):
	if request.method == 'POST':

		validated_payload = ReceiptRequestSerializer(data=request.data)
		validated_payload.is_valid(raise_exception=True)

		payload = validated_payload.validated_data

		d = payload['date']
		iso = (d+ timedelta(days=offset)).isocalendar()

		receipt_date = timezone.now().isoformat() if d.date() == timezone.localdate() else d.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

		receipt_type = payload.get('type')
		category = payload['category']

		with transaction.atomic():
			new_receipt = Receipt.objects.create(
				date=receipt_date,
				category=category,
				type=receipt_type,
				description=payload['description'],
				amount=payload['amount'],
				week=iso[1],
				year=iso[0],
			)

			new_receipt.tags.set(get_tags(payload['tags']))

			if receipt_type == 'extended':
				for item in payload.get('items', []):
					receipt_item = ReceiptItem.objects.create(
						receipt=new_receipt,
						amount=item['amount']
					)
					receipt_item.tags.set(get_tags(item['tags']))

			validate_items_sum(new_receipt)

		return Response(new_receipt.id, status=201)
	elif request.method == 'PUT':
		receipt = get_receipt(request.data.get('id'))

		validated_payload = ReceiptRequestSerializer(data=request.data, partial=True)
		validated_payload.is_valid(raise_exception=True)

		with transaction.atomic():
			for k, v in validated_payload.validated_data.items():
				match k:
					case 'date':
						setattr(receipt, 'date', v)
						iso = (v + timedelta(days=offset)).isocalendar()
						if receipt.week != iso[1]:
							setattr(receipt, 'year', iso[0])
							setattr(receipt, 'week', iso[1])
					case 'items':
						sent_ids = [item['id'] for item in v if 'id' in item]
						receipt.items.exclude(id__in=sent_ids).delete()
						for item in v:
							if 'id' in item:
								try:
									db_item = receipt.items.get(id=item['id'])
								except ReceiptItem.DoesNotExist:
									raise ValidationError({ 'items': f'Item {item["id"]} does not belong to receipt {receipt.id}' })
								db_item.amount = item['amount']
								db_item.save()
							else:
								db_item = ReceiptItem.objects.create(receipt=receipt, amount=item['amount'])
							db_item.tags.set(get_tags(item.get('tags', [])))
					case 'tags':
						receipt.tags.set(get_tags(v))
					case 'category':
						setattr(receipt, 'category', v)
					case _:
						setattr(receipt, k, v)
			receipt.save()
			validate_items_sum(receipt)
		serializer = ReceiptSerializer(receipt)
		return Response(serializer.data, status=200)
	elif request.method == 'DELETE':
		get_receipt(request.query_params.get('id')).delete()
		return Response(status=204)
	else:
		return Response(status=405)

@api_view(['GET'])
def categories(request):
	categories = Category.objects.values_list('name', flat=True).distinct().order_by('-week_limit', 'name')
	return Response(categories)

@api_view(['GET'])
def tags(request):
	tags = Tag.objects.values_list('name', flat=True).distinct()
	return Response(tags)

@api_view(['GET','POST'])
def balance(request):

	if request.method == 'POST':
		if request.data.get('type') == 'income':
			payload = IncomeRequestSerializer(data=request.data)
			payload.is_valid(raise_exception=True)
			Income.objects.create(**payload.validated_data)
			return Response(payload.validated_data, status=201)
		elif request.data.get('type') == 'balance':
			payload = BalanceRequestSerializer(data=request.data)
			payload.is_valid(raise_exception=True)
			Balance.objects.create(**payload.validated_data)
			return Response(payload.validated_data, status=200)
		else:
			return Response({'error': 'Invalid type'}, status=400)
	else:
		balance_data = Balance.objects.get_current_balance()

		if balance_data:
			current_balance, income_since, spend_since, original_balance, balance_date = balance_data[0]
		else:
			current_balance = income_since = spend_since = original_balance = 0
			balance_date = timezone.localtime()

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
	payload = QueryRequestSerializer(data=request.data)
	payload.is_valid(raise_exception=True)
	data = payload.validated_data
	receipts = Receipt.objects.query_receipts(data['from'], data['to'], data['tags'])
	return Response(receipts)

@api_view(['GET'])
def weekly_summary(request):

	req_year = request.GET.get('year')
	if req_year is not None and not req_year.isdigit():
		raise ValidationError({ 'year': 'Expected a numeric year' })

	weeks = Receipt.objects.get_spend_by_week(req_year)
	years = Receipt.objects.values_list('year', flat=True).distinct()

	context = {
		"years": years,
		"weeks": weeks,
	}

	return Response(context)

@api_view(['GET'])
def week_detail(request, year, week):
	try:
		mon = date.fromisocalendar(year, week, 1)
	except ValueError:
		raise NotFound(f'Week {week} does not exist in {year}')
	start = mon - timedelta(days=offset)
	end = mon + timedelta(days=6 - offset)
	receipts = Receipt.objects.query_receipts(start, end, tags=[], ascending=True)
	return Response(receipts)
