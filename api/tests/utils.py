from django.utils import timezone
from datetime import datetime

def at(*args):
    return timezone.make_aware(datetime(*args))