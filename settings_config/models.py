from django.db import models
from django.contrib.auth.models import User

class PaymentMethod(models.Model):
    PAYMENT_TYPES = (
        ('manual', 'Manual'),
        ('online', 'En línea'),
    )
    
    name = models.CharField('Nombre', max_length=100)
    type = models.CharField('Tipo', max_length=20, choices=PAYMENT_TYPES, default='manual')
    is_active = models.BooleanField('Activo', default=True)
    icon = models.CharField('Icono', max_length=50, blank=True, help_text='Nombre del icono Font Awesome')
    is_visible_pos = models.BooleanField('Visible en PDV', default=True)
    is_visible_menu = models.BooleanField('Visible en Menú digital', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = 'Método de pago'
        verbose_name_plural = 'Métodos de pago'