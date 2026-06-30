from django.urls import path
from . import views

app_name = 'sales'

urlpatterns = [
    path('', views.pos_view, name='pos'),
    path('api/create-sale/', views.create_sale, name='create_sale'),
    path('history/', views.order_history, name='history'),
    path('cajas/', views.cash_registers, name='cash_registers'),
    path('open-cash/', views.open_cash_register, name='open_cash'),
    path('close-cash/<int:pk>/', views.close_cash_register, name='close_cash'),
    path('reportes/', views.reports, name='reports'),
    path('table/<int:table_id>/', views.table_detail, name='table_detail'),
    path('assign-table/', views.assign_table, name='assign_table'),
    path('free-table/<int:table_id>/', views.free_table, name='free_table'),
    path('tables/', views.table_list, name='table_list'),
    path('table/create/', views.table_create, name='table_create'),
    path('table/delete/<int:pk>/', views.table_delete, name='table_delete'),
    path('table/update/<int:pk>/', views.table_update, name='table_update'),
    path('room/create/', views.room_create, name='room_create'),
    path('room/delete/<int:pk>/', views.room_delete, name='room_delete'),
    # ===== NUEVAS URLs =====
    path('sale/<int:sale_id>/', views.sale_detail, name='sale_detail'),
    path('sale/<int:sale_id>/ticket/', views.sale_ticket, name='sale_ticket'),
    path('sale/<int:sale_id>/pay/', views.process_payment, name='process_payment'),
    path('sale/<int:sale_id>/cancel/', views.cancel_sale, name='cancel_sale'),
    path('sale/<int:sale_id>/split/', views.split_bill, name='split_bill'),
    path('api/search/', views.search_products, name='search_products'),
    path('api/stats/', views.realtime_stats, name='realtime_stats'),
    path('api/notifications/', views.get_notifications, name='notifications'),
    path('table/<int:table_id>/detail/', views.get_table_details, name='table_detail'),
    path('tables/merge/', views.merge_tables, name='merge_tables'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('reports/export/<str:format>/', views.export_report, name='export_report'),
    path('api/product/<int:product_id>/', views.get_product_detail, name='product_detail'),
    path('api/delivery-orders/', views.get_delivery_orders, name='delivery_orders'),
    path('api/delivery-order/<int:order_id>/status/', views.update_delivery_status, name='update_delivery_status'),
    path('api/delivery-order/<int:order_id>/cancel/', views.cancel_delivery_order, name='cancel_delivery_order'),
    path('api/delivery-order/<int:order_id>/items/', views.get_delivery_order_items, name='delivery_order_items'),
    # ===== GESTIÓN DE SALAS Y MESAS (ADMIN) =====
    path('room/<int:pk>/update/', views.room_update, name='room_update'),
    path('room/<int:pk>/detail/', views.room_detail, name='room_detail'),
    path('table/<int:pk>/detail-api/', views.table_detail_api, name='table_detail_api'),
    path('cleanup-tables/', views.cleanup_tables, name='cleanup_tables'),
    path('table/delete/<int:pk>/', views.table_delete, name='table_delete'),
    path('api/table-order/<int:table_id>/', views.get_table_order, name='table_order_api'),
]