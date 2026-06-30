from django.db import models
from django.contrib.auth.models import User
from accounts.models import Branch

class Client(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='clients', null=True, blank=True)
    name = models.CharField('Nombre', max_length=255)
    email = models.EmailField('Email', blank=True)
    phone = models.CharField('Teléfono', max_length=20)
    address = models.TextField('Dirección', blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='clients')
    notes = models.TextField('Notas', blank=True)
    total_purchases = models.DecimalField('Total compras', max_digits=12, decimal_places=2, default=0)
    total_orders = models.PositiveIntegerField('Total pedidos', default=0)
    last_purchase = models.DateTimeField('Última compra', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'