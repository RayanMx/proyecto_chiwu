from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def printers_list(request):
    return render(request, 'printers/list.html')