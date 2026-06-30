from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import KitchenOrder

@login_required
def kitchen_dashboard(request):
    orders = KitchenOrder.objects.filter(status__in=['pending', 'preparing']).order_by('created_at')
    completed = KitchenOrder.objects.filter(status='served').order_by('-updated_at')[:20]
    
    context = {
        'orders': orders,
        'completed': completed,
    }
    return render(request, 'kitchen/dashboard.html', context)