from django.db import models
from django.contrib.auth.models import User
from sales.models import Sale, SaleItem

class KitchenOrder(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pendiente'),
        ('preparing', 'En preparación'),
        ('ready', 'Listo'),
        ('served', 'Servido'),
    )
    
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='kitchen_orders')
    items = models.ManyToManyField(SaleItem, related_name='kitchen_items')
    status = models.CharField('Estado', max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField('Notas', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Orden #{self.sale.id} - {self.status}"
    
    class Meta:
        verbose_name = 'Orden de cocina'
        verbose_name_plural = 'Órdenes de cocina'