from django.db import models

# ==================== CATEGORÍAS ====================
class Category(models.Model):
    name = models.CharField('Nombre', max_length=100)
    description = models.TextField('Descripción', blank=True)
    is_active = models.BooleanField('Activa', default=True)
    is_featured = models.BooleanField('Destacada', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['name']

    def __str__(self):
        return self.name


# ==================== PRODUCTOS ====================
class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    name = models.CharField('Nombre', max_length=200)
    description = models.TextField('Descripción', blank=True)
    price = models.DecimalField('Precio', max_digits=10, decimal_places=2)
    discount_price = models.DecimalField('Precio con descuento', max_digits=10, decimal_places=2, null=True, blank=True)
    cost = models.DecimalField('Costo', max_digits=10, decimal_places=2, default=0)
    stock = models.PositiveIntegerField('Stock', default=0)
    sku = models.CharField('Código SKU', max_length=50, unique=True, blank=True, null=True)
    barcode = models.CharField('Código de barras', max_length=50, blank=True, null=True)
    image = models.ImageField('Imagen', upload_to='products/', blank=True, null=True)
    
    # Estado
    is_active = models.BooleanField('Activo', default=True)
    is_featured = models.BooleanField('Destacado', default=False)
    is_visible = models.BooleanField('Visible en menú', default=True)
    is_kitchen = models.BooleanField('Requiere cocina', default=False)
    
    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['name']

    def __str__(self):
        return self.name


# ==================== VARIANTES ====================
class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField('Nombre', max_length=100)
    price = models.DecimalField('Precio', max_digits=10, decimal_places=2, default=0)
    discount_price = models.DecimalField('Precio con descuento', max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField('Stock', default=0)
    sku = models.CharField('Código SKU', max_length=50, blank=True, null=True)
    is_active = models.BooleanField('Activo', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Variante'
        verbose_name_plural = 'Variantes'
        ordering = ['name']

    def __str__(self):
        return f"{self.product.name} - {self.name}"


# ==================== CATEGORÍAS DE MODIFICADORES ====================
class ModifierCategory(models.Model):
    name = models.CharField('Nombre', max_length=100)
    description = models.TextField('Descripción', blank=True)
    is_active = models.BooleanField('Activo', default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Categoría de modificador'
        verbose_name_plural = 'Categorías de modificadores'
        ordering = ['name']

    def __str__(self):
        return self.name


# ==================== MODIFICADORES ====================
class Modifier(models.Model):
    CONDITION_CHOICES = (
        ('optional', 'Opcional'),
        ('required', 'Obligatorio'),
    )
    SELECTION_CHOICES = (
        ('single', 'Sólo uno'),
        ('multiple', 'Varios'),
    )
    
    category = models.ForeignKey(ModifierCategory, on_delete=models.CASCADE, related_name='modifiers')
    name = models.CharField('Nombre', max_length=100)
    price = models.DecimalField('Precio', max_digits=10, decimal_places=2, default=0)
    discount_price = models.DecimalField('Precio con descuento', max_digits=10, decimal_places=2, null=True, blank=True)
    condition = models.CharField('Condición', max_length=20, choices=CONDITION_CHOICES, default='optional')
    selection = models.CharField('Selección', max_length=20, choices=SELECTION_CHOICES, default='single')
    is_active = models.BooleanField('Activo', default=True)
    products = models.ManyToManyField(Product, related_name='modifiers', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Modificador'
        verbose_name_plural = 'Modificadores'
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.category.name} - {self.name}"


# ==================== ÁREAS DE COCINA ====================
class KitchenArea(models.Model):
    name = models.CharField('Nombre', max_length=100)
    description = models.TextField('Descripción', blank=True)
    is_active = models.BooleanField('Activo', default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Área de cocina'
        verbose_name_plural = 'Áreas de cocina'
        ordering = ['name']

    def __str__(self):
        return self.name


# ==================== PRODUCTO - ÁREA DE COCINA (relación) ====================
class ProductKitchenArea(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='kitchen_areas')
    kitchen_area = models.ForeignKey(KitchenArea, on_delete=models.CASCADE, related_name='products')
    is_primary = models.BooleanField('Principal', default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Producto - Área de cocina'
        verbose_name_plural = 'Productos - Áreas de cocina'
        unique_together = ['product', 'kitchen_area']

    def __str__(self):
        return f"{self.product.name} - {self.kitchen_area.name}"