from django.contrib import admin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'business_name', 'phone', 'created_at')
    search_fields = ('business_name', 'user__email', 'phone')
    list_filter = ('created_at',)