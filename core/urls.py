from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.resumen_ejecutivo, name='resumen'),
    path('pos/', include('sales.urls')),
    path('productos/', include('products.urls')),
    path('cocina/', include('kitchen.urls')),
    path('clientes/', include('clients.urls')),
    path('marketing/', include('marketing.urls')),
    path('integraciones/', include('integrations.urls')),
    path('roles/', include('roles.urls')),
    path('impresoras/', include('printers.urls')),
    path('settings/', include('settings_config.urls')),
    path('accounts/', include('allauth.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)