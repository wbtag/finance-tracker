from django.urls import path
from . import views

urlpatterns = [
	path('overview/', views.overview, name='overview'),
	path('receipt/', views.receipt, name='receipt'),
	path('categories/', views.categories, name='categories'),
	path('tags/', views.tags, name='tags'),
	path('balance/', views.balance, name='balance'),
	path('query/', views.query, name='query'),
	path('weekly-summary/', views.weekly_summary, name='weekly_summary'),
	path('weekly-summary/<int:year>/<int:week>/', views.week_detail, name='week_detail'),
]
