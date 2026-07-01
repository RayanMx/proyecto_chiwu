from django.db import models
from django.contrib.auth.models import User
from products.models import Product, ProductVariant, Modifier

class Sale(models.Model):
    SERVICE_TYPES = (
        ('dine_in', 'En sala'),
        ('takeaway', 'Para llevar'),
        ('delivery', 'Delivery'),
        ('online', 'Pedido online'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pendiente'),
        ('preparing', 'En preparación'),
        ('ready', 'Listo'),
        ('completed', 'Completado'),
        ('cancelled', 'Cancelado'),
    )
    
    PAYMENT_STATUS = (
        ('pending', 'Pendiente'),
        ('partial', 'Parcial'),
        ('paid', 'Pagado'),
        ('refunded', 'Reembolsado'),
    )
    
    # En sales/models.py, dentro de la clase Sale:
    cash_amount = models.DecimalField(
        'Monto en efectivo', 
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )

    card_amount = models.DecimalField(
        'Monto con tarjeta', 
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sales')
    branch = models.ForeignKey('accounts.Branch', on_delete=models.PROTECT, related_name='sales', null=True)
    client = models.ForeignKey('clients.Client', on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    
    total = models.DecimalField('Total', max_digits=12, decimal_places=2, default=0)
    subtotal = models.DecimalField('Subtotal', max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField('Descuento', max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField('Impuesto', max_digits=12, decimal_places=2, default=0)
    
    service_type = models.CharField('Tipo de servicio', max_length=20, choices=SERVICE_TYPES, default='dine_in')
    status = models.CharField('Estado', max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField('Estado de pago', max_length=20, choices=PAYMENT_STATUS, default='pending')
    payment_method = models.CharField('Método de pago', max_length=50, blank=True)
    
    order_source = models.CharField('Fuente de pedido', max_length=50, default='pos')
    notes = models.TextField('Notas', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # ===== NUEVO: Asociar venta a caja =====
    cash_register = models.ForeignKey(
        'CashRegister', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='sales'
    )
    
    # ===== NUEVO: Monto recibido para cambio =====
    amount_received = models.DecimalField(
        'Monto recibido', 
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    change_amount = models.DecimalField(
        'Cambio', 
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )

    class Meta:
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'

    def __str__(self):
        return f"Venta #{self.id} - {self.get_service_type_display()}"

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField('Cantidad')
    price = models.DecimalField('Precio unitario', max_digits=10, decimal_places=2)
    subtotal = models.DecimalField('Subtotal', max_digits=12, decimal_places=2)
    modifiers = models.ManyToManyField(Modifier, blank=True)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

class CashRegister(models.Model):
    """Caja registradora"""
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='cash_registers')
    branch = models.ForeignKey('accounts.Branch', on_delete=models.PROTECT, related_name='cash_registers', null=True, blank=True)
    opening_balance = models.DecimalField('Saldo inicial', max_digits=12, decimal_places=2, default=0)
    closing_balance = models.DecimalField('Saldo final', max_digits=12, decimal_places=2, null=True, blank=True)
    is_open = models.BooleanField('Abierta', default=False)
    opened_at = models.DateTimeField('Apertura', auto_now_add=True)
    closed_at = models.DateTimeField('Cierre', null=True, blank=True)
    
    def __str__(self):
        return f"Caja {self.id} - {self.user.username}"
    
class Room(models.Model):
    """Salas del restaurante"""
    name = models.CharField('Nombre de la sala', max_length=100)
    branch = models.ForeignKey('accounts.Branch', on_delete=models.CASCADE, related_name='rooms')
    is_active = models.BooleanField('Activa', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = 'Sala'
        verbose_name_plural = 'Salas'

class Table(models.Model):
    STATUS_CHOICES = (
        ('free', 'Libre'),
        ('occupied', 'Ocupada'),
        ('reserved', 'Reservada'),
        ('paying', 'Pagando'),
    )
    
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='tables')
    number = models.PositiveIntegerField('Número de mesa')
    capacity = models.PositiveIntegerField('Capacidad', default=4)
    status = models.CharField('Estado', max_length=20, choices=STATUS_CHOICES, default='free')  # <-- default='free'
    current_sale = models.ForeignKey('Sale', on_delete=models.SET_NULL, null=True, blank=True, related_name='table_orders')
    is_active = models.BooleanField('Activa', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Mesa {self.number} - {self.room.name}"
    
    class Meta:
        verbose_name = 'Mesa'
        verbose_name_plural = 'Mesas'
        unique_together = ['room', 'number']
    
    # En sales/models.py, agrega esto a la clase Table:

    def delete(self, *args, **kwargs):
        """Sobrescribir delete para debugging"""
        print(f"🗑️ Eliminando mesa {self.number} - ID: {self.id}")
        super().delete(*args, **kwargs)