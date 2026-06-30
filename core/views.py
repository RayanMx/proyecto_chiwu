from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta, datetime
from sales.models import Sale, CashRegister
from products.models import Product

@login_required
def resumen_ejecutivo(request):
    # Obtener usuario actual
    usuario_actual = request.user
    nombre_usuario = usuario_actual.get_full_name() or usuario_actual.username
    
    # Calcular fecha de ayer
    ayer = timezone.now().date() - timedelta(days=1)
    inicio_ayer = timezone.make_aware(datetime.combine(ayer, datetime.min.time()))
    fin_ayer = timezone.make_aware(datetime.combine(ayer, datetime.max.time()))
    
    # 1. Ventas de ayer (completadas)
    ventas_ayer = Sale.objects.filter(
        created_at__range=(inicio_ayer, fin_ayer), 
        status='completed'
    )
    total_ventas_ayer = ventas_ayer.aggregate(total=Sum('total'))['total'] or 0
    total_pedidos_ayer = ventas_ayer.count()
    
    # 2. Cierre de caja del día anterior
    cierres_ayer = CashRegister.objects.filter(
        closed_at__date=ayer,
        is_open=False
    )
    total_caja_ayer = cierres_ayer.aggregate(total=Sum('closing_balance'))['total'] or 0
    ultimo_cierre = cierres_ayer.order_by('-closed_at').first()
    
    # 3. Verificar si hay caja abierta HOY para este usuario
    caja_abierta_hoy = CashRegister.objects.filter(
        user=request.user, 
        is_open=True,
        opened_at__date=timezone.now().date()
    ).first()
    
    # 4. INVENTARIO INTELIGENTE
    # Productos con stock crítico (0 unidades)
    stock_critico = Product.objects.filter(
        stock=0,
        is_active=True
    ).count()
    
    # Productos con stock bajo (1-5 unidades)
    stock_bajo = Product.objects.filter(
        stock__gte=1,
        stock__lte=5,
        is_active=True
    ).count()
    
    # Productos con stock medio (6-20 unidades) - alerta preventiva
    stock_medio = Product.objects.filter(
        stock__gte=6,
        stock__lte=20,
        is_active=True
    ).count()
    
    # Los 5 productos con menos stock (para mostrar nombres)
    productos_bajo_stock = Product.objects.filter(
        is_active=True
    ).order_by('stock')[:5]  # Los 5 con menos stock
    
    # Total de productos activos
    total_productos = Product.objects.filter(is_active=True).count()
    
    # 5. Últimas 5 ventas
    recent_sales = Sale.objects.filter(
        status='completed'
    ).order_by('-created_at')[:5]
    
    # 6. Calcular la variación con anteayer
    antier = ayer - timedelta(days=1)
    inicio_antier = timezone.make_aware(datetime.combine(antier, datetime.min.time()))
    fin_antier = timezone.make_aware(datetime.combine(antier, datetime.max.time()))
    
    ventas_antier = Sale.objects.filter(
        created_at__range=(inicio_antier, fin_antier),
        status='completed'
    ).aggregate(total=Sum('total'))['total'] or 0
    
    variacion = 0
    if ventas_antier > 0:
        variacion = ((total_ventas_ayer - ventas_antier) / ventas_antier) * 100
    
    context = {
        'nombre_usuario': nombre_usuario,
        'total_ventas_ayer': total_ventas_ayer,
        'total_pedidos_ayer': total_pedidos_ayer,
        'total_caja_ayer': total_caja_ayer,
        'ultimo_cierre': ultimo_cierre,
        'caja_abierta_hoy': caja_abierta_hoy,
        'recent_sales': recent_sales,
        'variacion_porcentual': round(variacion, 1),
        'fecha_ayer': ayer.strftime('%d/%m/%Y'),
        # Datos de inventario
        'stock_critico': stock_critico,
        'stock_bajo': stock_bajo,
        'stock_medio': stock_medio,
        'productos_bajo_stock': productos_bajo_stock,
        'total_productos': total_productos,
    }
    
    return render(request, 'dashboard/resumen_ejecutivo.html', context)