import os
import django
import pandas as pd
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import Category, Product, ProductVariant, Modifier
from products.models import ModifierCategory

def import_inventory(excel_path):
    print("📂 Leyendo archivo Excel...")
    
    # Leer las hojas
    df_products = pd.read_excel(excel_path, sheet_name='Productos')
    df_modifiers = pd.read_excel(excel_path, sheet_name='Modificadores')
    
    print(f"   - Productos encontrados: {len(df_products)}")
    print(f"   - Modificadores encontrados: {len(df_modifiers)}")
    
    # ==================== IMPORTAR MODIFICADORES ====================
    print("\n📦 Importando modificadores...")
    
    modifier_cache = {}  # Para evitar duplicados
    
    for _, row in df_modifiers.iterrows():
        cat_name = row['Nombre de Categoría de modificador']
        modifier_name = row['Nombre del modificador']
        price = float(row['Precio']) if pd.notna(row['Precio']) else 0
        condition = row['Condición'].lower() if pd.notna(row['Condición']) else 'optional'
        selection = row['Seleccionar'] if pd.notna(row['Seleccionar']) else 'Varios'
        
        # Mapear selección
        if 'Sólo uno' in selection:
            selection_type = 'single'
        else:
            selection_type = 'multiple'
        
        # Crear o obtener categoría de modificador
        modifier_cat, _ = ModifierCategory.objects.get_or_create(
            name=cat_name,
            defaults={'is_active': True}
        )
        
        # Crear modificador
        modifier, created = Modifier.objects.get_or_create(
            name=modifier_name,
            category=modifier_cat,
            defaults={
                'price': Decimal(str(price)),
                'condition': condition,
                'selection': selection_type,
                'is_active': True
            }
        )
        
        if created:
            print(f"   ✅ Modificador creado: {modifier_name} (${price})")
        else:
            print(f"   ℹ️ Modificador ya existe: {modifier_name}")
        
        # Guardar referencia para asignar a productos después
        key = f"{cat_name}|{modifier_name}"
        modifier_cache[key] = modifier
    
    # ==================== IMPORTAR CATEGORÍAS Y PRODUCTOS ====================
    print("\n📦 Importando categorías y productos...")
    
    # Diccionario para agrupar productos por categoría
    products_by_category = {}
    
    for _, row in df_products.iterrows():
        category_name = row['Categoría de producto']
        product_name = row['Nombre de producto']
        variant_name = row['Nombre de variante de producto'] if pd.notna(row['Nombre de variante de producto']) else ''
        description = row['Descripción'] if pd.notna(row['Descripción']) else ''
        price = float(row['Precio']) if pd.notna(row['Precio']) else 0
        discount_price = float(row['Precio con descuento']) if pd.notna(row['Precio con descuento']) else price
        
        # Agrupar productos por categoría
        if category_name not in products_by_category:
            products_by_category[category_name] = {}
        
        if product_name not in products_by_category[category_name]:
            products_by_category[category_name][product_name] = {
                'description': description,
                'price': price,
                'discount_price': discount_price,
                'variants': []
            }
        
        if variant_name:
            products_by_category[category_name][product_name]['variants'].append({
                'name': variant_name,
                'price': price,
                'discount_price': discount_price
            })
    
    # ==================== GUARDAR CATEGORÍAS Y PRODUCTOS ====================
    print("\n📦 Guardando categorías y productos...")
    
    for category_name, products in products_by_category.items():
        # Crear categoría
        category, _ = Category.objects.get_or_create(
            name=category_name,
            defaults={'is_active': True}
        )
        print(f"\n📁 Categoría: {category_name}")
        
        for product_name, product_data in products.items():
            # Crear producto
            product, created = Product.objects.get_or_create(
                name=product_name,
                category=category,
                defaults={
                    'description': product_data['description'],
                    'price': Decimal(str(product_data['price'])),
                    'is_active': True,
                    'is_visible': True,
                    'stock': 0
                }
            )
            
            if created:
                print(f"   ✅ Producto creado: {product_name}")
            else:
                print(f"   ℹ️ Producto ya existe: {product_name}")
            
            # Crear variantes
            for variant_data in product_data['variants']:
                variant, v_created = ProductVariant.objects.get_or_create(
                    product=product,
                    name=variant_data['name'],
                    defaults={
                        'price': Decimal(str(variant_data['price'])),
                        'stock': 0,
                        'is_active': True
                    }
                )
                if v_created:
                    print(f"      ✅ Variante creada: {variant_data['name']}")
    
    # ==================== ASIGNAR MODIFICADORES A PRODUCTOS ====================
    print("\n📦 Asignando modificadores a productos...")
    
    for _, row in df_products.iterrows():
        product_name = row['Nombre de producto']
        category_name = row['Categoría de producto']
        modifier_ids = row['Categorias de modificadores'] if pd.notna(row['Categorias de modificadores']) else ''
        
        if not modifier_ids:
            continue
        
        try:
            product = Product.objects.get(name=product_name, category__name=category_name)
            
            # Buscar modificadores por nombre (simplificado)
            # En el Excel, los modificadores están en la hoja de modificadores
            # Vamos a asignar todos los modificadores de las categorías que coinciden
            
            # Buscar categorías de modificadores por nombre
            modifier_cat_names = modifier_ids.split(',')
            for cat_name in modifier_cat_names:
                cat_name = cat_name.strip()
                try:
                    # Buscar la categoría de modificador por ID o nombre
                    modifier_cat = ModifierCategory.objects.filter(name__icontains=cat_name).first()
                    if modifier_cat:
                        modifiers = Modifier.objects.filter(category=modifier_cat, is_active=True)
                        for modifier in modifiers:
                            product.modifiers.add(modifier)
                        print(f"   ✅ Asignados modificadores de '{cat_name}' a {product_name}")
                except Exception as e:
                    print(f"   ⚠️ Error asignando modificadores a {product_name}: {e}")
        except Product.DoesNotExist:
            print(f"   ⚠️ Producto no encontrado: {product_name}")
    
    print("\n🎉 ¡Importación completada!")
    
    # Resumen final
    print("\n📊 Resumen:")
    print(f"   - Categorías: {Category.objects.count()}")
    print(f"   - Productos: {Product.objects.count()}")
    print(f"   - Variantes: {ProductVariant.objects.count()}")
    print(f"   - Modificadores: {Modifier.objects.count()}")

if __name__ == '__main__':
    # Cambiar la ruta a tu archivo Excel
    excel_path = r'C:\Users\Rayan\Downloads\OLACLICK+stock+de+productos (1).xlsx'
    
    # Verificar que el archivo existe
    if not os.path.exists(excel_path):
        print(f"❌ Archivo no encontrado: {excel_path}")
        print("   Asegúrate de que el archivo esté en la misma carpeta que este script")
    else:
        import_inventory(excel_path)