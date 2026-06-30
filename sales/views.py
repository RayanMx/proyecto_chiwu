from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Sale, SaleItem, CashRegister, Room, Table
from products.models import Product, Category, Modifier  
import logging
logger = logging.getLogger(__name__)

import json

# ==================== POS (PUNTO DE VENTA) ====================

@login_required
def pos_view(request):
    products = Product.objects.filter(is_active=True).select_related('category')
    cash_register = CashRegister.objects.filter(user=request.user, is_open=True).first()
    
    # Obtener salas y mesas
    rooms = Room.objects.filter(is_active=True).prefetch_related('tables')
    
    # Obtener el último número de pedido
    last_sale = Sale.objects.filter(user=request.user).order_by('-id').first()
    next_order_number = (last_sale.id + 1) if last_sale else 1
    
    # Obtener categorías para los tabs
    categories = Category.objects.filter(is_active=True)
    
    context = {
        'products': products,
        'cash_register': cash_register,
        'rooms': rooms,
        'categories': categories,
        'next_order_number': next_order_number,
    }
    return render(request, 'sales/pos.html', context)

@csrf_exempt
@login_required
def create_sale(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Crear la venta
            sale = Sale.objects.create(
                user=request.user,
                service_type=data.get('service_type', 'dine_in'),
                status='pending',
                payment_status='pending',
                total=data.get('total', 0),
                subtotal=data.get('total', 0),
                notes=f"Cliente: {data.get('client', '')}"
            )
            
            # Crear los items
            for item in data.get('items', []):
                product = Product.objects.get(id=item['id'])
                SaleItem.objects.create(
                    sale=sale,
                    product=product,
                    quantity=item['quantity'],
                    price=item['price'],
                    subtotal=item['price'] * item['quantity']
                )
            
            # Si es dine_in y hay table_id, asociar la mesa
            if data.get('service_type') == 'dine_in' and data.get('table_id'):
                table = Table.objects.get(id=data.get('table_id'))
                table.current_sale = sale
                table.status = 'occupied'
                table.save()
            
            return JsonResponse({'status': 'success', 'order_id': sale.id})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error'}, status=405)

# ==================== MESAS ====================



@login_required
def assign_table(request):
    if request.method == 'POST':
        table_id = request.POST.get('table_id')
        sale_id = request.POST.get('sale_id')
        table = get_object_or_404(Table, id=table_id)
        sale = get_object_or_404(Sale, id=sale_id)
        
        table.current_sale = sale
        table.status = 'occupied'
        table.save()
        
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def free_table(request, table_id):
    if request.method == 'POST':
        table = get_object_or_404(Table, id=table_id)
        
        # ===== NUEVO: Forzar liberación independientemente de los items =====
        # Si tiene una venta asociada, cancelarla
        if table.current_sale:
            # Si la venta tiene items, cancelarla también
            if table.current_sale.items.exists():
                # Cancelar la venta
                sale = table.current_sale
                sale.status = 'cancelled'
                sale.notes = f"{sale.notes}\nCancelada al liberar mesa {table.number}"
                sale.save()
                
                # Devolver stock si es necesario
                for item in sale.items.all():
                    product = item.product
                    product.stock += item.quantity
                    product.save()
            
            # Liberar la mesa
            table.current_sale = None
        
        # Cambiar estado a libre
        table.status = 'free'
        table.save()
        
        return JsonResponse({
            'status': 'success',
            'message': 'Mesa liberada correctamente'
        })
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=400)

# ==================== HISTORIAL DE PEDIDOS ====================

@login_required
def order_history(request):
    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')
    status = request.GET.get('status', '')
    service_type = request.GET.get('service_type', '')
    
    orders = Sale.objects.all().order_by('-created_at')
    
    if date_from:
        orders = orders.filter(created_at__date__gte=date_from)
    if date_to:
        orders = orders.filter(created_at__date__lte=date_to)
    if status:
        orders = orders.filter(status=status)
    if service_type:
        orders = orders.filter(service_type=service_type)
    
    total_orders = orders.count()
    total_amount = orders.aggregate(total=Sum('total'))['total'] or 0
    
    context = {
        'orders': orders[:50],
        'total_orders': total_orders,
        'total_amount': total_amount,
        'status_choices': Sale.STATUS_CHOICES,
        'service_choices': Sale.SERVICE_TYPES,
    }
    return render(request, 'sales/history.html', context)

# ==================== CAJAS ====================

@login_required
def cash_registers(request):
    cash_register = CashRegister.objects.filter(
        user=request.user,
        is_open=True
    ).first()
    
    registers = CashRegister.objects.filter(
        user=request.user
    ).order_by('-opened_at')
    
    context = {
        'cash_register': cash_register,
        'registers': registers[:25],
    }
    return render(request, 'sales/cash_registers.html', context)

@login_required
def open_cash_register(request):
    if request.method == 'POST':
        opening_balance = request.POST.get('opening_balance', 0)
        
        # Verificar si ya hay una caja abierta
        existing = CashRegister.objects.filter(user=request.user, is_open=True).first()
        if existing:
            return JsonResponse({'status': 'error', 'message': 'Ya tienes una caja abierta'}, status=400)
        
        cash_register = CashRegister.objects.create(
            user=request.user,
            branch=request.user.profile.branch if hasattr(request.user, 'profile') else None,
            opening_balance=opening_balance,
            is_open=True
        )
        
        # Para solicitudes AJAX devolver JSON
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'status': 'success', 
                'id': cash_register.id,
                'message': 'Caja abierta exitosamente'
            })
        
        # Para solicitudes normales, redirigir
        return redirect('sales:cash_registers')
    
    return render(request, 'sales/open_cash.html')

@login_required
def close_cash_register(request, pk):
    cash_register = get_object_or_404(CashRegister, pk=pk, user=request.user)
    if request.method == 'POST':
        closing_balance = request.POST.get('closing_balance', 0)
        cash_register.closing_balance = closing_balance
        cash_register.is_open = False
        cash_register.closed_at = timezone.now()
        cash_register.save()
        return JsonResponse({'status': 'success'})
    return render(request, 'sales/close_cash.html', {'cash_register': cash_register})

# ==================== REPORTES ====================

@login_required
def reports(request):
    today = timezone.now().date()
    start_date = today - timedelta(days=7)
    
    sales = Sale.objects.filter(
        created_at__date__gte=start_date,
        created_at__date__lte=today,
        status='completed'
    )
    
    total_orders = sales.count()
    total_sales = sales.aggregate(total=Sum('total'))['total'] or 0
    avg_ticket = total_sales / total_orders if total_orders > 0 else 0
    
    service_analysis = []
    for service_type, label in Sale.SERVICE_TYPES:
        service_sales = sales.filter(service_type=service_type)
        count = service_sales.count()
        total = service_sales.aggregate(total=Sum('total'))['total'] or 0
        if count > 0:
            service_analysis.append({
                'service_type': service_type,
                'get_service_type_display': label,
                'count': count,
                'total': total,
                'avg': total / count
            })
    
    daily_sales = []
    for i in range(7):
        day = today - timedelta(days=i)
        day_sales = sales.filter(created_at__date=day)
        daily_sales.append({
            'date': day.strftime('%d/%m'),
            'count': day_sales.count(),
            'total': day_sales.aggregate(total=Sum('total'))['total'] or 0
        })
    daily_sales.reverse()
    
    context = {
        'total_orders': total_orders,
        'total_sales': total_sales,
        'avg_ticket': avg_ticket,
        'service_analysis': service_analysis,
        'daily_sales': daily_sales,
        'start_date': start_date,
        'end_date': today,
    }
    return render(request, 'sales/reports.html', context)

# ==================== GESTIÓN DE MESAS (CRUD) ====================

@login_required
def table_list(request):
    rooms = Room.objects.filter(is_active=True).prefetch_related('tables')
    return render(request, 'sales/table_list.html', {'rooms': rooms})

@login_required
def table_create(request):
    if request.method == 'POST':
        room_id = request.POST.get('room_id')
        number = request.POST.get('number')
        capacity = request.POST.get('capacity', 4)
        
        room = get_object_or_404(Room, id=room_id)
        table = Table.objects.create(
            room=room,
            number=number,
            capacity=capacity,
            status='free',
            is_active=True
        )
        return JsonResponse({'status': 'success', 'id': table.id})
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def table_delete(request, pk):
    """Eliminar una mesa (soft delete)"""
    if request.method == 'POST':
        try:
            logger.info(f"🗑️ Intentando eliminar mesa ID: {pk}")
            table = get_object_or_404(Table, id=pk)
            logger.info(f"📋 Mesa encontrada: {table.number} - Estado: {table.status}")
            
            # Verificar si la mesa está ocupada
            if table.status == 'occupied':
                logger.warning(f"⚠️ Mesa {table.number} está ocupada, no se puede eliminar")
                return JsonResponse({
                    'status': 'error', 
                    'message': 'No se puede eliminar una mesa ocupada'
                }, status=400)
            
            # Eliminación REAL
            table.delete()
            logger.info(f"✅ Mesa {table.number} eliminada permanentemente")
            
            return JsonResponse({
                'status': 'success', 
                'message': f'Mesa eliminada correctamente'
            })
        except Exception as e:
            logger.error(f"❌ Error al eliminar mesa: {str(e)}")
            return JsonResponse({
                'status': 'error', 
                'message': str(e)
            }, status=400)
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=405)

@login_required
def table_update(request, pk):
    """Actualizar una mesa"""
    if request.method == 'POST':
        table = get_object_or_404(Table, id=pk)
        table.number = request.POST.get('number', table.number)
        table.capacity = request.POST.get('capacity', table.capacity)
        table.room_id = request.POST.get('room_id', table.room_id)
        table.save()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def room_create(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        branch = request.user.profile.branch if hasattr(request.user, 'profile') else None
        room = Room.objects.create(
            name=name,
            branch=branch,
            is_active=True
        )
        return JsonResponse({'status': 'success', 'id': room.id})
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def room_delete(request, pk):
    if request.method == 'POST':
        room = get_object_or_404(Room, id=pk)
        room.is_active = False
        room.save()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=400)

# sales/views.py - Añade estas funciones al final

# ==================== DETALLE DE VENTA ====================

@login_required
def sale_detail(request, sale_id):
    """Ver detalle de una venta específica"""
    sale = get_object_or_404(Sale, id=sale_id)
    items = sale.items.all()
    
    context = {
        'sale': sale,
        'items': items,
    }
    return render(request, 'sales/sale_detail.html', context)

@login_required
def sale_ticket(request, sale_id):
    """Generar ticket para imprimir"""
    sale = get_object_or_404(Sale, id=sale_id)
    items = sale.items.all()
    
    context = {
        'sale': sale,
        'items': items,
        'business_name': 'Chiwu Antojería',
        'business_phone': '555-123-4567',
        'business_address': 'Dirección del negocio',
    }
    return render(request, 'sales/ticket.html', context)

# ==================== PAGOS ====================

@login_required
def process_payment(request, sale_id):
    """Procesar pago de una venta"""
    sale = get_object_or_404(Sale, id=sale_id)
    
    if request.method == 'POST':
        payment_method = request.POST.get('payment_method')
        amount_received = request.POST.get('amount_received', 0)
        
        sale.payment_method = payment_method
        sale.payment_status = 'paid'
        sale.status = 'completed'
        sale.save()
        
        # Liberar mesa si tiene
        if hasattr(sale, 'table_orders') and sale.table_orders.exists():
            table = sale.table_orders.first()
            table.status = 'free'
            table.current_sale = None
            table.save()
        
        return redirect('sales:sale_detail', sale_id=sale.id)
    
    context = {
        'sale': sale,
        'payment_methods': [
            ('cash', 'Efectivo'),
            ('card', 'Tarjeta'),
            ('transfer', 'Transferencia'),
            ('qr', 'QR Code'),
            ('mix', 'Mixto'),
        ],
    }
    return render(request, 'sales/process_payment.html', context)

# ==================== CANCELAR ORDEN ====================

@login_required
def cancel_sale(request, sale_id):
    """Cancelar una venta"""
    if request.method == 'POST':
        sale = get_object_or_404(Sale, id=sale_id)
        reason = request.POST.get('reason', 'Cancelado por usuario')
        
        sale.status = 'cancelled'
        sale.notes = f"{sale.notes}\nCancelado: {reason}"
        sale.save()
        
        # Devolver stock
        for item in sale.items.all():
            product = item.product
            product.stock += item.quantity
            product.save()
        
        # Liberar mesa si tiene
        if hasattr(sale, 'table_orders') and sale.table_orders.exists():
            table = sale.table_orders.first()
            table.status = 'free'
            table.current_sale = None
            table.save()
        
        return JsonResponse({'status': 'success'})
    
    return JsonResponse({'status': 'error'}, status=400)

# ==================== BÚSQUEDA DE PRODUCTOS ====================

@login_required
def search_products(request):
    """API para buscar productos en tiempo real"""
    query = request.GET.get('q', '')
    if len(query) < 2:
        return JsonResponse({'results': []})
    
    products = Product.objects.filter(
        Q(name__icontains=query) | 
        Q(sku__icontains=query) |
        Q(category__name__icontains=query),
        is_active=True
    )[:20]
    
    results = [{
        'id': p.id,
        'name': p.name,
        'price': float(p.price),
        'stock': p.stock,
        'image': p.image.url if p.image else None,
        'category': p.category.name if p.category else '',
    } for p in products]
    
    return JsonResponse({'results': results})

# ==================== OBTENER DETALLES DE MESA ====================

@login_required
def get_table_details(request, table_id):
    """Obtener detalles de una mesa incluyendo su orden actual"""
    try:
        table = get_object_or_404(Table, id=table_id)
        
        data = {
            'id': table.id,
            'number': table.number,
            'status': table.status,
            'capacity': table.capacity,
            'room': table.room.name if table.room else 'Sin sala',
            'current_sale': None
        }
        
        if table.current_sale:
            sale = table.current_sale
            items = []
            for item in sale.items.all():
                items.append({
                    'id': item.id,
                    'product_name': item.product.name,
                    'product_id': item.product.id,
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'subtotal': float(item.subtotal)
                })
            
            data['current_sale'] = {
                'id': sale.id,
                'total': float(sale.total),
                'subtotal': float(sale.subtotal),
                'items': items,
                'status': sale.status
            }
        
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'status': 'error'
        }, status=400)

# ==================== UNIR MESAS ====================

@login_required
def merge_tables(request):
    """Unir dos mesas en una sola orden"""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads(request.body)
        source_table_id = data.get('source_table_id')
        target_table_id = data.get('target_table_id')
        
        source_table = get_object_or_404(Table, id=source_table_id)
        target_table = get_object_or_404(Table, id=target_table_id)
        
        # Verificar que ambas mesas tengan orden
        if not source_table.current_sale or not target_table.current_sale:
            return JsonResponse({
                'status': 'error', 
                'message': 'Ambas mesas deben tener órdenes activas'
            }, status=400)
        
        # Mover items de la orden fuente a la orden destino
        source_sale = source_table.current_sale
        target_sale = target_table.current_sale
        
        for item in source_sale.items.all():
            # Crear copia del item en la orden destino
            SaleItem.objects.create(
                sale=target_sale,
                product=item.product,
                variant=item.variant,
                quantity=item.quantity,
                price=item.price,
                subtotal=item.subtotal
            )
            # Opcional: copiar modifiers si los tiene
            if item.modifiers.exists():
                new_item = SaleItem.objects.get(id=item.id)  # Esto no funcionará, mejor manejar de otra forma
                # new_item.modifiers.add(*item.modifiers.all())
        
        # Actualizar totales de la orden destino
        target_sale.subtotal += source_sale.subtotal
        target_sale.total += source_sale.total
        target_sale.save()
        
        # Cancelar la orden fuente
        source_sale.status = 'cancelled'
        source_sale.notes = f"{source_sale.notes}\nUnida a mesa {target_table.number}"
        source_sale.save()
        
        # Liberar mesa fuente
        source_table.current_sale = None
        source_table.status = 'free'
        source_table.save()
        
        return JsonResponse({
            'status': 'success',
            'target_sale_id': target_sale.id,
            'message': f'Mesas unidas exitosamente a mesa {target_table.number}'
        })
        
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

# ==================== SPLIT DE CUENTA ====================

@login_required
def split_bill(request, sale_id):
    """Dividir la cuenta entre varios comensales"""
    sale = get_object_or_404(Sale, id=sale_id)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            splits = data.get('splits', [])
            
            # Crear órdenes separadas
            new_orders = []
            for split in splits:
                new_sale = Sale.objects.create(
                    user=request.user,
                    branch=sale.branch,
                    client=sale.client,
                    service_type=sale.service_type,
                    notes=f"Split de orden #{sale.id} - {split.get('name', 'Comensal')}"
                )
                
                # Agregar items seleccionados
                for item_id in split.get('item_ids', []):
                    original_item = get_object_or_404(SaleItem, id=item_id, sale=sale)
                    # Copiar el item
                    SaleItem.objects.create(
                        sale=new_sale,
                        product=original_item.product,
                        variant=original_item.variant,
                        quantity=original_item.quantity,
                        price=original_item.price,
                        subtotal=original_item.subtotal
                    )
                
                # Calcular totales
                new_sale.subtotal = new_sale.items.aggregate(total=Sum('subtotal'))['total'] or 0
                new_sale.total = new_sale.subtotal
                new_sale.save()
                new_orders.append(new_sale.id)
            
            # Marcar orden original como completada
            sale.status = 'completed'
            sale.notes = f"{sale.notes}\nCuenta dividida en {len(splits)} órdenes"
            sale.save()
            
            return JsonResponse({
                'status': 'success',
                'new_orders': new_orders,
                'message': 'Cuenta dividida exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    items = sale.items.all()
    context = {
        'sale': sale,
        'items': items,
    }
    return render(request, 'sales/split_bill.html', context)

# ==================== ESTADÍSTICAS EN TIEMPO REAL ====================

@login_required
def realtime_stats(request):
    """Obtener estadísticas en tiempo real para el dashboard"""
    today = timezone.now().date()
    start_of_day = timezone.make_aware(datetime.combine(today, datetime.min.time()))
    end_of_day = timezone.make_aware(datetime.combine(today, datetime.max.time()))
    
    # Órdenes del día
    today_orders = Sale.objects.filter(
        created_at__range=[start_of_day, end_of_day]
    )
    
    # Órdenes activas
    active_orders = Sale.objects.filter(
        status__in=['pending', 'preparing']
    )
    
    # Total del día
    total_today = today_orders.aggregate(total=Sum('total'))['total'] or 0
    
    # Promedio por orden
    order_count = today_orders.count()
    avg_ticket = total_today / order_count if order_count > 0 else 0
    
    # Productos más vendidos hoy
    top_products = SaleItem.objects.filter(
        sale__created_at__range=[start_of_day, end_of_day]
    ).values('product__name').annotate(
        total=Sum('quantity')
    ).order_by('-total')[:5]
    
    return JsonResponse({
        'total_today': float(total_today),
        'order_count': order_count,
        'avg_ticket': float(avg_ticket),
        'active_orders': active_orders.count(),
        'top_products': list(top_products),
        'tables_occupied': Table.objects.filter(status='occupied').count()
    })

# ==================== EXPORTAR REPORTES ====================

@login_required
def export_report(request, format='csv'):
    """Exportar reportes a CSV o Excel"""
    from django.http import HttpResponse
    import csv
    
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    
    sales = Sale.objects.filter(status='completed')
    
    if date_from:
        sales = sales.filter(created_at__date__gte=date_from)
    if date_to:
        sales = sales.filter(created_at__date__lte=date_to)
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="reporte_ventas.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Fecha', 'Orden', 'Cliente', 'Tipo', 'Subtotal', 
        'Descuento', 'Impuesto', 'Total', 'Estado', 'Método de Pago'
    ])
    
    for sale in sales:
        writer.writerow([
            sale.created_at.strftime('%Y-%m-%d %H:%M'),
            sale.id,
            sale.client.name if sale.client else 'Cliente general',
            sale.get_service_type_display(),
            float(sale.subtotal),
            float(sale.discount),
            float(sale.tax),
            float(sale.total),
            sale.get_status_display(),
            sale.payment_method or 'N/A'
        ])
    
    return response

# ==================== NOTIFICACIONES ====================

@login_required
def get_notifications(request):
    """Obtener notificaciones del sistema"""
    notifications = []
    
    # Alertas de stock bajo
    low_stock = Product.objects.filter(stock__lte=models.F('min_stock'), is_active=True)
    for product in low_stock[:5]:
        notifications.append({
            'type': 'warning',
            'icon': 'fa-exclamation-triangle',
            'message': f'Stock bajo: {product.name} ({product.stock} unidades)',
            'date': timezone.now().strftime('%H:%M'),
            'url': f'/products/{product.id}/edit/'
        })
    
    # Órdenes pendientes en cocina
    pending_kitchen = Sale.objects.filter(status='pending').count()
    if pending_kitchen > 0:
        notifications.append({
            'type': 'info',
            'icon': 'fa-utensils',
            'message': f'{pending_kitchen} órdenes pendientes en cocina',
            'date': timezone.now().strftime('%H:%M'),
            'url': '/kitchen/'
        })
    
    # Mesas ocupadas
    occupied_tables = Table.objects.filter(status='occupied').count()
    if occupied_tables > 3:
        notifications.append({
            'type': 'success',
            'icon': 'fa-chair',
            'message': f'{occupied_tables} mesas ocupadas',
            'date': timezone.now().strftime('%H:%M'),
            'url': '/tables/'
        })
    
    # Caja sin abrir
    has_open_cash = CashRegister.objects.filter(user=request.user, is_open=True).exists()
    if not has_open_cash:
        notifications.append({
            'type': 'danger',
            'icon': 'fa-money-bill',
            'message': 'Caja no abierta',
            'date': timezone.now().strftime('%H:%M'),
            'url': '/cash/open/'
        })
    
    return JsonResponse(notifications, safe=False)

# ==================== DASHBOARD ====================

@login_required
def dashboard_view(request):
    """Dashboard principal con estadísticas"""
    today = timezone.now().date()
    start_of_day = timezone.make_aware(datetime.combine(today, datetime.min.time()))
    end_of_day = timezone.make_aware(datetime.combine(today, datetime.max.time()))
    
    today_sales = Sale.objects.filter(created_at__range=[start_of_day, end_of_day])
    total_today = today_sales.aggregate(total=Sum('total'))['total'] or 0
    orders_today = today_sales.count()
    
    top_products = SaleItem.objects.values('product__name').annotate(
        total_sold=Sum('quantity'),
        total_revenue=Sum('subtotal')
    ).order_by('-total_sold')[:10]
    
    context = {
        'total_today': total_today,
        'orders_today': orders_today,
        'avg_ticket': total_today / orders_today if orders_today > 0 else 0,
        'top_products': top_products,
        'total_tables': Table.objects.filter(is_active=True).count(),
        'occupied_tables': Table.objects.filter(status='occupied').count(),
        'free_tables': Table.objects.filter(status='free').count(),
        'active_orders': Sale.objects.filter(status__in=['pending', 'preparing']),
        'recent_orders': today_sales[:10],
    }
    return render(request, 'dashboard/index.html', context)

@login_required
def get_product_detail(request, product_id):
    """Obtener detalles del producto para el personalizador"""
    product = get_object_or_404(Product, id=product_id)
    
    data = {
        'id': product.id,
        'name': product.name,
        'price': float(product.price),
        'image': product.image.url if product.image else None,
        'description': product.description,
        'variants': [],
        'modifiers': []
    }
    
    # Variantes - Usando el campo 'price' que ya existe
    if hasattr(product, 'variants'):
        for variant in product.variants.filter(is_active=True):
            # Calculamos el ajuste restando el precio base
            price_adjustment = float(variant.price or 0) - float(product.price)
            
            data['variants'].append({
                'id': variant.id,
                'name': variant.name,
                'price_adjustment': price_adjustment,
                'price': float(variant.price)  # Precio total de la variante
            })
    
    # Modificadores
    modifiers = Modifier.objects.filter(products=product, is_active=True)
    for modifier in modifiers:
        data['modifiers'].append({
            'id': modifier.id,
            'name': modifier.name,
            'price': float(modifier.price or 0),
            'condition': modifier.condition,
            'selection': modifier.selection,
            'category': modifier.category.name if modifier.category else ''
        })
    
    return JsonResponse(data)

@login_required
def get_tables_status(request):
    """Obtener estado de todas las mesas en tiempo real"""
    tables = Table.objects.filter(is_active=True)
    data = []
    for table in tables:
        data.append({
            'id': table.id,
            'status': table.status,
            'status_display': table.get_status_display(),
            'time': '00:00'  # Calcular desde created_at
        })
    return JsonResponse({'tables': data})

@login_required
def get_table_order(request, table_id):
    """Obtener la orden actual de una mesa"""
    try:
        table = get_object_or_404(Table, id=table_id)
        
        if table.current_sale:
            sale = table.current_sale
            items = []
            for item in sale.items.all():
                items.append({
                    'id': item.id,
                    'product_id': item.product.id,
                    'product_name': item.product.name,
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'subtotal': float(item.subtotal),
                    'variant': item.variant.name if item.variant else None,
                    'modifiers': [m.name for m in item.modifiers.all()]
                })
            
            return JsonResponse({
                'sale_id': sale.id,
                'items': items,
                'total': float(sale.total),
                'subtotal': float(sale.subtotal),
                'status': sale.status
            })
        else:
            # Crear una nueva orden para la mesa
            sale = Sale.objects.create(
                user=request.user,
                service_type='dine_in',
                status='pending',
                payment_status='pending',
                total=0,
                subtotal=0
            )
            table.current_sale = sale
            table.status = 'occupied'
            table.save()
            
            return JsonResponse({
                'sale_id': sale.id,
                'items': [],
                'total': 0,
                'subtotal': 0,
                'status': 'pending'
            })
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'status': 'error'
        }, status=400)
        
@login_required
def get_delivery_orders(request):
    """Obtener pedidos a domicilio activos"""
    try:
        orders = Sale.objects.filter(
            service_type='delivery',
            status__in=['pending', 'preparing', 'ready']
        ).order_by('-created_at')
        
        data = []
        for order in orders:
            # Obtener items del pedido
            items_count = order.items.count()
            
            # Obtener datos del cliente - USAR CAMPOS QUE EXISTEN EN TU MODELO
            client_name = 'Cliente'
            phone = 'N/A'
            address = 'N/A'
            
            # Si tiene cliente asociado
            if hasattr(order, 'client') and order.client:
                client_name = order.client.name or 'Cliente'
                phone = order.client.phone or 'N/A'
                address = order.client.address or 'N/A'
            else:
                # Si no tiene cliente, usar campos del modelo Sale (si existen)
                if hasattr(order, 'client_name') and order.client_name:
                    client_name = order.client_name
                if hasattr(order, 'phone') and order.phone:
                    phone = order.phone
                if hasattr(order, 'address') and order.address:
                    address = order.address
                # Si no hay datos, usar notas
                elif order.notes:
                    # Intentar extraer datos de notas
                    notes = order.notes
                    if 'Cliente:' in notes:
                        parts = notes.split('Cliente:')
                        if len(parts) > 1:
                            client_name = parts[1].split('\n')[0].strip()
            
            data.append({
                'id': order.id,
                'client': client_name,
                'phone': phone,
                'address': address,
                'status': order.status,
                'items': items_count,
                'created_at': order.created_at.strftime('%H:%M')
            })
        
        return JsonResponse({'orders': data})
    except Exception as e:
        print(f"❌ Error en get_delivery_orders: {e}")
        return JsonResponse({'orders': [], 'error': str(e)}, status=500)

@login_required
def get_delivery_order_items(request, order_id):
    """Obtener items de un pedido a domicilio"""
    try:
        order = get_object_or_404(Sale, id=order_id, service_type='delivery')
        
        items = []
        for item in order.items.all():
            items.append({
                'id': item.id,
                'product_id': item.product.id,
                'product_name': item.product.name,
                'price': float(item.price),
                'quantity': item.quantity,
                'subtotal': float(item.subtotal),
                'variant': item.variant.name if item.variant else None,
                'modifiers': [m.name for m in item.modifiers.all()],
                'notes': item.notes or ''
            })
        
        return JsonResponse({
            'success': True,
            'order_id': order.id,
            'items': items,
            'total': float(order.total),
            'status': order.status
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required
def update_delivery_status(request, order_id):
    """Actualizar estado de pedido a domicilio"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads(request.body)
        status = data.get('status')
        
        order = get_object_or_404(Sale, id=order_id, service_type='delivery')
        if status in ['pending', 'preparing', 'ready', 'delivered']:
            order.status = status
            order.save()
            return JsonResponse({'success': True})
        
        return JsonResponse({'error': 'Estado inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
    
@login_required
def cancel_delivery_order(request, order_id):
    """Cancelar pedido a domicilio"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        order = get_object_or_404(Sale, id=order_id, service_type='delivery')
        if order.status in ['pending', 'preparing']:
            order.status = 'cancelled'
            order.save()
            return JsonResponse({'success': True})
        return JsonResponse({'error': 'No se puede cancelar este pedido'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
    
# ==================== GESTIÓN DE SALAS (CRUD COMPLETO) ====================

@login_required
def room_detail(request, pk):
    """Obtener detalle de una sala para editar"""
    room = get_object_or_404(Room, id=pk)
    return JsonResponse({
        'id': room.id,
        'name': room.name,
        'branch': room.branch_id if room.branch else None,
        'is_active': room.is_active
    })

@login_required
def room_update(request, pk):
    """Actualizar una sala"""
    if request.method == 'POST':
        room = get_object_or_404(Room, id=pk)
        room.name = request.POST.get('name', room.name)
        room.save()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def table_detail(request, table_id):
    """Obtener estado de una mesa"""
    try:
        table = get_object_or_404(Table, id=table_id)
        
        # Si la mesa está ocupada pero no tiene venta o la venta no tiene items
        if table.status == 'occupied':
            if not table.current_sale or table.current_sale.items.count() == 0:
                # La mesa está ocupada sin productos - mantener ocupada pero sin items
                # Esto permite que el usuario siga agregando productos
                pass
        
        return JsonResponse({
            'id': table.id,
            'number': table.number,
            'status': table.status,
            'capacity': table.capacity,
            'has_sale': table.current_sale is not None,
            'sale_id': table.current_sale.id if table.current_sale else None,
            'items_count': table.current_sale.items.count() if table.current_sale else 0
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
    
@login_required
def cleanup_tables(request):
    """Limpiar mesas que están ocupadas pero no tienen venta o items"""
    if request.method == 'POST':
        try:
            # Buscar mesas con estado ocupado
            tables = Table.objects.filter(status='occupied')
            cleaned = 0
            errors = []
            
            for table in tables:
                try:
                    # Si no tiene venta
                    if not table.current_sale:
                        table.status = 'free'
                        table.save()
                        cleaned += 1
                        continue
                    
                    # Si la venta no tiene items
                    if table.current_sale.items.count() == 0:
                        # Cancelar la venta
                        sale = table.current_sale
                        sale.status = 'cancelled'
                        sale.notes = f"{sale.notes}\nCancelada automáticamente - sin items"
                        sale.save()
                        
                        table.current_sale = None
                        table.status = 'free'
                        table.save()
                        cleaned += 1
                        
                except Exception as e:
                    errors.append(f"Mesa {table.number}: {str(e)}")
            
            return JsonResponse({
                'status': 'success',
                'cleaned': cleaned,
                'errors': errors,
                'total_checked': tables.count()
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=400)
    
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=405)

@login_required
def table_detail_api(request, pk):
    """Obtener detalle de una mesa para editar (API)"""
    try:
        table = get_object_or_404(Table, id=pk)
        return JsonResponse({
            'id': table.id,
            'number': table.number,
            'capacity': table.capacity,
            'room': table.room_id,
            'room_name': table.room.name if table.room else 'Sin sala',
            'status': table.status,
            'is_active': table.is_active
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=400)