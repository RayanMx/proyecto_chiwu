from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import PaymentMethod

@login_required
def payment_methods(request):
    methods = PaymentMethod.objects.all()
    return render(request, 'settings/payment_methods.html', {'methods': methods})

@login_required
def toggle_payment_method(request, pk):
    method = get_object_or_404(PaymentMethod, pk=pk)
    method.is_active = not method.is_active
    method.save()
    return JsonResponse({'status': 'success', 'is_active': method.is_active})

@login_required
def business_info(request):
    profile = request.user.profile
    if request.method == 'POST':
        profile.business_name = request.POST.get('business_name', profile.business_name)
        profile.whatsapp = request.POST.get('whatsapp', profile.whatsapp)
        profile.address = request.POST.get('address', profile.address)
        profile.currency = request.POST.get('currency', profile.currency)
        profile.language = request.POST.get('language', profile.language)
        profile.hide_address = request.POST.get('hide_address') == 'on'
        profile.business_type = request.POST.get('business_type', profile.business_type)
        profile.food_style = request.POST.get('food_style', profile.food_style)
        profile.is_pos_main = request.POST.get('is_pos_main') == 'on'
        profile.save()
        return redirect('settings:business_info')
    
    context = {
        'profile': profile,
        'business_types': [
            ('food_truck', 'Food truck'),
            ('restaurant', 'Restaurante'),
            ('cafe', 'Cafetería'),
            ('bar', 'Bar'),
            ('fast_food', 'Comida rápida'),
            ('other', 'Otro'),
        ],
        'food_styles': [
            ('asian', 'Asiática'),
            ('mexican', 'Mexicana'),
            ('italian', 'Italiana'),
            ('american', 'Americana'),
            ('fusion', 'Fusión'),
            ('other', 'Otro'),
        ],
        'currencies': [
            ('MXN', 'MXN - Peso Mexicano'),
            ('USD', 'USD - Dólar Americano'),
            ('EUR', 'EUR - Euro'),
        ],
        'languages': [
            ('Spanish', 'Español'),
            ('English', 'Inglés'),
        ],
    }
    return render(request, 'settings/business_info.html', context)