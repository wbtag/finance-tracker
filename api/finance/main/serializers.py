from rest_framework import serializers
from .models import Receipt

class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = '__all__'

class BalanceSerializer(serializers.Serializer):
    estimated_balance = serializers.IntegerField()
    income_since = serializers.IntegerField()
    spend_since = serializers.IntegerField()
    balance = serializers.IntegerField()
    balance_date = serializers.CharField()
