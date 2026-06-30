from django.db import models
from django.contrib.auth.models import User

class Branch(models.Model):
    """Sucursal del negocio"""
    name = models.CharField('Nombre', max_length=255)
    address = models.TextField('Dirección')
    phone = models.CharField('Teléfono', max_length=20)
    email = models.EmailField('Email', blank=True)
    is_active = models.BooleanField('Activa', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = 'Sucursal'
        verbose_name_plural = 'Sucursales'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    business_name = models.CharField('Nombre del negocio', max_length=255)
    phone = models.CharField('Teléfono', max_length=20, blank=True)
    address = models.TextField('Dirección', blank=True)
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    is_owner = models.BooleanField('Es propietario', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    whatsapp = models.CharField('WhatsApp', max_length=20, blank=True)
    currency = models.CharField('Moneda', max_length=10, default='MXN')
    language = models.CharField('Idioma', max_length=20, default='Spanish')
    business_type = models.CharField('Tipo de negocio', max_length=50, blank=True)
    food_style = models.CharField('Estilo de comida', max_length=50, blank=True)
    is_pos_main = models.BooleanField('¿Olaclick es su POS principal?', default=True)
    hide_address = models.BooleanField('Ocultar dirección en menú digital', default=False)
    
    # Horarios (en JSON o campos separados)
    opening_time = models.TimeField('Hora de apertura', null=True, blank=True)
    closing_time = models.TimeField('Hora de cierre', null=True, blank=True)

    def __str__(self):
        return self.business_name or self.user.email

    class Meta:
        verbose_name = 'Perfil de usuario'
        verbose_name_plural = 'Perfiles de usuarios'