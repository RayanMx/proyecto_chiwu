from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def marketing_dashboard(request):
    return render(request, 'marketing/dashboard.html')