from django.urls import path
from . import views

app_name = 'roles'
urlpatterns = [
    path('', views.roles_list, name='list'),
]