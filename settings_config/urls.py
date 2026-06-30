from django.urls import path
from . import views

app_name = 'settings'

urlpatterns = [
    path('payment-methods/', views.payment_methods, name='payment_methods'),
    path('toggle-payment/<int:pk>/', views.toggle_payment_method, name='toggle_payment'),
    path('business-info/', views.business_info, name='business_info'),
]