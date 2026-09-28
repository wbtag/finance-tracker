from rest_framework import serializers
from .models import Receipt

class ReceiptRequestItemsSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    amount = serializers.IntegerField()
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)

class ReceiptRequestSerializer(serializers.Serializer):
    date = serializers.CharField()
    category = serializers.CharField()
    amount = serializers.IntegerField()
    type = serializers.CharField()
    description = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    items = ReceiptRequestItemsSerializer(many=True, required=False)

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
