from datetime import datetime

from django.utils import timezone


def at(*args):
    return timezone.make_aware(datetime(*args))
