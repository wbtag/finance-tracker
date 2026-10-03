from datetime import datetime

from rest_framework import serializers
from .models import Receipt, Category

class ReceiptRequestItemsSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    amount = serializers.IntegerField(min_value=1)
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False, default=list)

class ReceiptRequestSerializer(serializers.Serializer):
    date = serializers.CharField()
    category = serializers.CharField()
    amount = serializers.IntegerField(min_value=1)
    type = serializers.ChoiceField(choices=['simple', 'extended'])
    description = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False, default=list)
    items = ReceiptRequestItemsSerializer(many=True, required=False)

    def validate_date(self, value):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            raise serializers.ValidationError('Expected an ISO 8601 date.')

    def validate_category(self, value):
        try:
            return Category.objects.get(name=value)
        except Category.DoesNotExist:
            raise serializers.ValidationError(f'Unknown category "{value}".')

class QueryRequestSerializer(serializers.Serializer):
    to = serializers.DateField()
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def get_fields(self):
        # "from" is a Python keyword, so it can't be declared as a class attribute.
        fields = super().get_fields()
        fields['from'] = serializers.DateField()
        return fields

class IncomeRequestSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    description = serializers.CharField(max_length=255)

class BalanceRequestSerializer(serializers.Serializer):
    balance = serializers.IntegerField()

class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = '__all__'

class BalanceSerializer(serializers.Serializer):
    estimated_balance = serializers.IntegerField()
    income_since = serializers.IntegerField()
    spend_since = serializers.IntegerField()
    balance = serializers.IntegerField()
    balance_date = serializers.DateTimeField()
