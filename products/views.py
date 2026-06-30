from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import FileSystemStorage
from .models import Category, Product, ProductVariant, Modifier
import json
import os

@login_required
def product_list(request):
    categories = Category.objects.filter(is_active=True)
    products = Product.objects.filter(is_active=True)
    
    context = {
        'categories': categories,
        'products': products,
    }
    return render(request, 'products/list.html', context)

@login_required
def product_create(request):
    if request.method == 'POST':
        # Obtener datos del formulario
        name = request.POST.get('name')
        category_id = request.POST.get('category')
        description = request.POST.get('description', '')
        price = request.POST.get('price', 0)
        cost = request.POST.get('cost', 0)
        stock = request.POST.get('stock', 0)
        is_visible = request.POST.get('is_visible') == 'on'
        is_featured = request.POST.get('is_featured') == 'on'
        is_kitchen = request.POST.get('is_kitchen') == 'on'
        
        # Crear producto
        product = Product.objects.create(
            name=name,
            category_id=category_id if category_id else None,
            description=description,
            price=price,
            cost=cost,
            stock=stock,
            is_visible=is_visible,
            is_featured=is_featured,
            is_kitchen=is_kitchen,
            is_active=True
        )
        
        # Procesar imagen
        if request.FILES.get('image'):
            product.image = request.FILES['image']
            product.save()
        
        # Procesar variantes
        variant_names = request.POST.getlist('variant_name[]')
        variant_prices = request.POST.getlist('variant_price[]')
        variant_stocks = request.POST.getlist('variant_stock[]')
        
        for i in range(len(variant_names)):
            if variant_names[i].strip():
                ProductVariant.objects.create(
                    product=product,
                    name=variant_names[i],
                    price=float(variant_prices[i]) if variant_prices[i] else product.price,
                    stock=int(variant_stocks[i]) if variant_stocks[i] else 0,
                    is_active=True
                )
        
        return JsonResponse({'status': 'success', 'id': product.id})
    
    categories = Category.objects.filter(is_active=True)
    return render(request, 'products/form.html', {'categories': categories})

@login_required
def product_edit(request, pk):
    product = get_object_or_404(Product, pk=pk)
    
    if request.method == 'POST':
        # Actualizar producto
        product.name = request.POST.get('name', product.name)
        product.category_id = request.POST.get('category') or None
        product.description = request.POST.get('description', product.description)
        product.price = request.POST.get('price', product.price)
        product.cost = request.POST.get('cost', product.cost)
        product.stock = request.POST.get('stock', product.stock)
        product.is_visible = request.POST.get('is_visible') == 'on'
        product.is_featured = request.POST.get('is_featured') == 'on'
        product.is_kitchen = request.POST.get('is_kitchen') == 'on'
        
        if request.FILES.get('image'):
            # Eliminar imagen anterior si existe
            if product.image:
                try:
                    os.remove(product.image.path)
                except:
                    pass
            product.image = request.FILES['image']
        
        product.save()
        
        return JsonResponse({'status': 'success'})
    
    categories = Category.objects.filter(is_active=True)
    return render(request, 'products/form.html', {
        'product': product,
        'categories': categories
    })

@login_required
def product_delete(request, pk):
    product = get_object_or_404(Product, pk=pk)
    product.is_active = False
    product.save()
    return JsonResponse({'status': 'success'})

@login_required
def toggle_featured(request, pk):
    product = get_object_or_404(Product, pk=pk)
    product.is_featured = not product.is_featured
    product.save()
    return JsonResponse({'status': 'success', 'is_featured': product.is_featured})

@login_required
def category_create(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        category = Category.objects.create(
            name=name,
            description=description,
            is_active=True
        )
        return JsonResponse({'status': 'success', 'id': category.id})
    return render(request, 'products/category_form.html')

@login_required
def category_delete(request, pk):
    category = get_object_or_404(Category, pk=pk)
    category.is_active = False
    category.save()
    return JsonResponse({'status': 'success'})

@login_required
def inventory_view(request):
    categories = Category.objects.filter(is_active=True)
    products = Product.objects.filter(is_active=True).prefetch_related('variants')
    
    context = {
        'categories': categories,
        'products': products,
    }
    return render(request, 'products/inventory.html', context)

@login_required
def product_detail_json(request, pk):
    product = get_object_or_404(Product, pk=pk)
    data = {
        'id': product.id,
        'name': product.name,
        'description': product.description,
        'price': str(product.price),
        'cost': str(product.cost),
        'stock': product.stock,
        'is_active': product.is_active,
        'is_featured': product.is_featured,
        'is_visible': product.is_visible,
        'is_kitchen': product.is_kitchen,
        'category': product.category.id if product.category else None,
        'category_name': product.category.name if product.category else 'Sin categoría',
        'image': product.image.url if product.image else None,
        'variants': [{
            'id': v.id,
            'name': v.name,
            'price': str(v.price),
            'stock': v.stock
        } for v in product.variants.filter(is_active=True)],
        'modifiers': [{
            'id': m.id,
            'name': m.name,
            'price': str(m.price)
        } for m in product.modifiers.all()],
    }
    return JsonResponse(data)