from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def integrations_list(request):
    integrations = [
        {'name': 'Rappi', 'icon': 'fa-shopping-bag', 'connected': False},
        {'name': 'Pedidos Ya', 'icon': 'fa-motorcycle', 'connected': False},
        {'name': 'Uber Eats', 'icon': 'fa-car', 'connected': False},
        {'name': 'Didi Food', 'icon': 'fa-taxi', 'connected': False},
    ]
    return render(request, 'integrations/list.html', {'integrations': integrations})