from django.urls import path
from . import views

app_name = 'printers'
urlpatterns = [
    path('', views.printers_list, name='list'),
]