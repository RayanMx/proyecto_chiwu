from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User, Group

@login_required
def roles_list(request):
    users = User.objects.all()
    groups = Group.objects.all()
    return render(request, 'roles/list.html', {'users': users, 'groups': groups})