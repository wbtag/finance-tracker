from django.conf import settings
from rest_framework.permissions import BasePermission


class IsOTPVerified(BasePermission):
	def has_permission(self, request, view):
		user = request.user
		if not (user and user.is_authenticated):
			return False
		return user.is_verified() or not settings.OTP_REQUIRED
