from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    path('', views.product_list, name='list'),
    path('create/', views.product_create, name='create'),
    path('edit/<int:pk>/', views.product_edit, name='edit'),
    path('delete/<int:pk>/', views.product_delete, name='delete'),
    path('inventario/', views.inventory_view, name='inventory'),
    path('category/create/', views.category_create, name='category_create'),
    path('category/delete/<int:pk>/', views.category_delete, name='category_delete'),
    path('toggle-featured/<int:pk>/', views.toggle_featured, name='toggle_featured'),
    path('detail/<int:pk>/', views.product_detail_json, name='detail_json'),
]