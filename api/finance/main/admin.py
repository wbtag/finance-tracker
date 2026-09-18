from django.contrib import admin

from .models import Balance, Category, Income, Receipt, ReceiptItem, Tag

admin.site.register(Tag)
admin.site.register(Category)
admin.site.register(Receipt)
admin.site.register(ReceiptItem)
admin.site.register(Balance)
admin.site.register(Income)
