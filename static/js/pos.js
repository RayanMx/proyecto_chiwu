/* ============================================
   POS - VERSIÓN CORREGIDA
   ============================================ */

// ==================== VARIABLES GLOBALES ====================
let currentModule = 'counter';
let currentTableId = null;
let currentTableNumber = null;

// Carritos independientes por módulo
let carts = {
    counter: [],
    delivery: [],
    tables: {}  // <-- CAMBIO: Ahora es un objeto, no un arreglo
};

// Cada mesa tendrá su propio carrito: carts.tables[tableId] = []
// Ejemplo: carts.tables[1] = [item1, item2]
//          carts.tables[2] = [item3, item4]

let orderNumbers = {
    counter: 1,
    delivery: 1,
    tables: 1
};

let currentProductData = null;
let deliveryData = {};

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 PDV Iniciado');
    
    // Restaurar carritos guardados
    restoreCart();
    
    // ===== NUEVO: Actualizar todos los badges después de restaurar =====
    setTimeout(function() {
        actualizarTodosLosBadges();
    }, 500);
    
    // Actualizar badges de mesas
    if (currentModule === 'tables') {
        for (const tableId in carts.tables) {
            if (carts.tables[tableId].length > 0) {
                updateTableBadge(tableId);
            }
        }
    }
    
    switchModule('counter');
});

// ==================== CSRF TOKEN ====================
function getCsrfToken() {
    // 1. Primero intentar con la variable global (MÁS CONFIABLE)
    if (window.CSRF_TOKEN && window.CSRF_TOKEN !== '' && window.CSRF_TOKEN !== 'None') {
        console.log('🔑 Token CSRF obtenido de window.CSRF_TOKEN');
        return window.CSRF_TOKEN;
    }
    
    // 2. Buscar en el input oculto
    const inputToken = document.getElementById('csrfToken');
    if (inputToken && inputToken.value && inputToken.value !== '') {
        console.log('🔑 Token CSRF obtenido de input#csrfToken');
        return inputToken.value;
    }
    
    // 3. Buscar en el meta tag
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken && metaToken.getAttribute('content')) {
        console.log('🔑 Token CSRF obtenido de meta tag');
        return metaToken.getAttribute('content');
    }
    
    // 4. Buscar en el formulario
    const formToken = document.querySelector('[name=csrfmiddlewaretoken]');
    if (formToken && formToken.value) {
        console.log('🔑 Token CSRF obtenido de form input');
        return formToken.value;
    }
    
    console.error('❌ Token CSRF no encontrado en ninguna fuente');
    console.log('🔍 window.CSRF_TOKEN:', window.CSRF_TOKEN);
    console.log('🔍 input#csrfToken:', document.getElementById('csrfToken')?.value);
    console.log('🔍 meta[name="csrf-token"]:', document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'));
    
    return null;
}
// ==================== CAMBIAR MÓDULO ====================
// ==================== CAMBIAR MÓDULO ====================
// ==================== CAMBIAR MÓDULO ====================
function switchModule(module) {
    console.log('📌 Cambiando a módulo:', module);
    currentModule = module;
    
    // Actualizar tabs
    document.querySelectorAll('.module-tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`[data-module="${module}"]`);
    if (tab) tab.classList.add('active');
    
    // Ocultar todos los contenidos
    document.querySelectorAll('.module-content').forEach(c => c.classList.remove('active'));
    
    // Mostrar el contenido seleccionado
    const contentMap = {
        'counter': 'counterContent',
        'delivery': 'deliveryContent',
        'tables': 'tablesContent'
    };
    const content = document.getElementById(contentMap[module]);
    if (content) content.classList.add('active');
    
    // Actualizar título
    const titles = {
        'counter': 'Mostrador',
        'delivery': 'Domicilio',
        'tables': 'Mesas'
    };
    const titleEl = document.getElementById('moduleTitle');
    if (titleEl) titleEl.textContent = titles[module];
    
    // ===== NUEVO: Guardar carrito actual antes de cambiar =====
    if (module !== 'tables' && currentTableId) {
        // Guardar carrito de la mesa actual
        const currentCart = carts.tables[currentTableId] || [];
        if (currentCart.length > 0) {
            try {
                localStorage.setItem(`cart_table_${currentTableId}`, JSON.stringify(currentCart));
                console.log(`💾 Carrito guardado para mesa ${currentTableId}: ${currentCart.length} items`);
            } catch(e) {}
        }
    }
    
    // Controlar visibilidad del botón de asignar
    const assignBtn = document.getElementById('assignDeliveryBtn');
    const hideBtn = document.getElementById('hideCartBtn');
    
    if (assignBtn) {
        if (module === 'delivery') {
            assignBtn.style.display = 'flex';
        } else {
            assignBtn.style.display = 'none';
        }
    }
    
    if (hideBtn) {
        if (module === 'counter') {
            hideBtn.style.display = 'none';
        } else {
            hideBtn.style.display = 'flex';
        }
    }
    
    // Ocultar badge de mesa si no estamos en mesas
    const badge = document.getElementById('moduleBadge');
    if (badge) {
        if (module !== 'tables') {
            badge.style.display = 'none';
        }
    }
    
    // Si estamos en mesas, mostrar el selector de mesas
    if (module === 'tables') {
        const selector = document.getElementById('tableSelector');
        const menu = document.getElementById('menuContentTables');
        if (selector) selector.style.display = 'block';
        if (menu) menu.style.display = 'none';
        
        // ===== NUEVO: Al volver a mesas, restaurar la mesa seleccionada =====
        if (currentTableId) {
            const cart = carts.tables[currentTableId] || [];
            if (cart.length > 0) {
                const card = document.querySelector(`[data-table-id="${currentTableId}"]`);
                if (card) {
                    card.className = 'table-card occupied selected';
                    const statusEl = card.querySelector('.table-status');
                    if (statusEl) {
                        statusEl.textContent = 'Ocupada';
                        statusEl.className = 'table-status occupied';
                    }
                    updateTableBadge(currentTableId);
                }
            }
        }
        
        // ===== NUEVO: Actualizar badges de TODAS las mesas al volver =====
        console.log('🔄 Actualizando badges de todas las mesas...');
        for (const tableId in carts.tables) {
            if (carts.tables[tableId].length > 0) {
                updateTableBadge(tableId);
                console.log(`📦 Badge actualizado para mesa ${tableId}: ${carts.tables[tableId].length} items`);
            }
        }
    }
    
    // Actualizar carrito
    updateCart();
    updateModuleBadges();
}

// ==================== INICIAR NUEVO PEDIDO (Mostrador) ====================
function startCounterOrder() {
    console.log('🆕 Iniciando pedido en Mostrador');
    
    if (carts.counter.length > 0) {
        if (!confirm('¿Quieres iniciar un nuevo pedido? Se perderá el carrito actual.')) {
            return;
        }
        carts.counter = [];
    }
    
    // Mostrar el carrito
    const cartContainer = document.querySelector('.pos-cart');
    if (cartContainer) cartContainer.style.display = 'flex';
    
    // Generar número de orden
    const orderNum = orderNumbers.counter;
    const orderNumberEl = document.getElementById('orderNumber');
    const cartOrderInfo = document.getElementById('cartOrderInfo');
    
    if (orderNumberEl) orderNumberEl.textContent = orderNum;
    if (cartOrderInfo) cartOrderInfo.innerHTML = `<i class="fas fa-receipt"></i> #${orderNum} - Mostrador`;
    
    updateCart();
    updateModuleBadges();
    showNotification('success', `✅ Nuevo pedido #${orderNum} iniciado`);
}

// ==================== INICIAR NUEVO PEDIDO (Domicilio) ====================
function startDeliveryOrder() {
    console.log('🆕 Iniciando pedido en Domicilio');
    
    const client = document.getElementById('deliveryClient')?.value.trim();
    const phone = document.getElementById('deliveryPhone')?.value.trim();
    const address = document.getElementById('deliveryAddress')?.value.trim();
    
    if (!client || !phone || !address) {
        showNotification('warning', '⚠️ Completa los datos del cliente');
        return;
    }
    
    if (carts.delivery.length > 0) {
        if (!confirm('¿Quieres iniciar un nuevo pedido? Se perderá el carrito actual.')) {
            return;
        }
        carts.delivery = [];
    }
    
    // Mostrar el carrito
    const cartContainer = document.querySelector('.pos-cart');
    if (cartContainer) cartContainer.style.display = 'flex';
    
    // Generar número de orden
    const orderNum = orderNumbers.delivery;
    const orderNumberEl = document.getElementById('orderNumber');
    const cartOrderInfo = document.getElementById('cartOrderInfo');
    
    if (orderNumberEl) orderNumberEl.textContent = orderNum;
    if (cartOrderInfo) cartOrderInfo.innerHTML = `<i class="fas fa-receipt"></i> #${orderNum} - Domicilio`;
    
    deliveryData = { client, phone, address };
    updateCart();
    updateModuleBadges();
    showNotification('success', `✅ Nuevo pedido #${orderNum} iniciado`);
}

// ==================== SELECCIÓN DE MESA ====================
// ==================== SELECCIÓN DE MESA ====================
function selectTable(tableId) {
    console.log('🪑 Seleccionando mesa:', tableId);
    
    // ===== NUEVO: Guardar carrito de la mesa actual antes de cambiar =====
    if (currentTableId && currentTableId !== tableId) {
        // Guardar el carrito actual en localStorage
        const currentCart = carts.tables[currentTableId] || [];
        if (currentCart.length > 0) {
            try {
                localStorage.setItem(`cart_table_${currentTableId}`, JSON.stringify(currentCart));
                console.log(`💾 Carrito guardado para mesa ${currentTableId}: ${currentCart.length} items`);
            } catch(e) {}
        }
    }
    
    currentTableId = tableId;
    const card = document.querySelector(`[data-table-id="${tableId}"]`);
    if (!card) {
        console.error('❌ Mesa no encontrada:', tableId);
        return;
    }
    
    currentTableNumber = card.dataset.tableNumber;
    
    // Ocultar selector y mostrar menú
    const selector = document.getElementById('tableSelector');
    const menu = document.getElementById('menuContentTables');
    
    if (selector) selector.style.display = 'none';
    if (menu) menu.style.display = 'block';
    
    // Actualizar badge
    const badge = document.getElementById('moduleBadge');
    const badgeText = document.getElementById('moduleBadgeText');
    
    if (badge) badge.style.display = 'block';
    if (badgeText) {
        badgeText.innerHTML = `<i class="fas fa-chair"></i> Mesa ${currentTableNumber}`;
    }
    
    // Marcar mesa como seleccionada
    document.querySelectorAll('.table-card').forEach(el => el.classList.remove('selected'));
    card.classList.add('selected');
    
    // ===== NUEVO: Inicializar carrito de esta mesa si no existe =====
    if (!carts.tables[tableId]) {
        carts.tables[tableId] = [];
        console.log(`📦 Carrito inicializado para mesa ${tableId}`);
    }
    
    // ===== NUEVO: Cargar carrito desde localStorage para esta mesa =====
    let cargadosDesdeLocal = false;
    try {
        const savedCart = localStorage.getItem(`cart_table_${tableId}`);
        if (savedCart) {
            const items = JSON.parse(savedCart);
            if (items.length > 0) {
                carts.tables[tableId] = items;
                cargadosDesdeLocal = true;
                showNotification('info', `📦 Carrito restaurado (${items.length} productos)`);
                console.log(`📦 Carrito cargado desde localStorage para mesa ${tableId}: ${items.length} items`);
            }
        }
    } catch(e) {
        console.error('❌ Error cargando localStorage:', e);
    }
    
    // Mostrar u ocultar carrito según si hay items
    const cartContainer = document.querySelector('.pos-cart');
    const cart = carts.tables[tableId] || [];
    
    if (cart.length > 0) {
        if (cartContainer) cartContainer.style.display = 'flex';
        // Actualizar badge
        updateTableBadge(tableId);
    } else {
        if (cartContainer) cartContainer.style.display = 'none';
    }
    
    // Actualizar carrito
    const cartOrderInfo = document.getElementById('cartOrderInfo');
    const orderNumberEl = document.getElementById('orderNumber');
    
    if (cartOrderInfo) cartOrderInfo.innerHTML = `<i class="fas fa-chair"></i> Mesa ${currentTableNumber}`;
    
    // Generar número de orden para mesa
    const orderNum = orderNumbers.tables;
    if (orderNumberEl) orderNumberEl.textContent = orderNum;
    
    // ===== NUEVO: Si no se cargó desde localStorage, cargar del servidor =====
    if (!cargadosDesdeLocal) {
        loadTableOrder(tableId);
    } else {
        // Si se cargó desde localStorage, solo actualizar UI
        updateCart();
        updateModuleBadges();
    }
    
    showNotification('success', `✅ Mesa ${currentTableNumber} seleccionada`);
}

// ==================== VOLVER A MESAS (Después de agregar producto) ====================

function returnToTables() {
    console.log('🔄 Volviendo a vista de mesas');
    
    // Ocultar carrito
    const cartContainer = document.querySelector('.pos-cart');
    if (cartContainer) cartContainer.style.display = 'none';
    
    // Mostrar selector de mesas
    const selector = document.getElementById('tableSelector');
    const menu = document.getElementById('menuContentTables');
    
    if (selector) selector.style.display = 'block';
    if (menu) menu.style.display = 'none';
    
    // Ocultar badge
    const badge = document.getElementById('moduleBadge');
    if (badge) badge.style.display = 'none';
    
    // Mantener la mesa seleccionada visualmente
    if (currentTableId) {
        const cart = carts.tables[currentTableId] || [];
        document.querySelectorAll('.table-card').forEach(el => {
            if (el.dataset.tableId == currentTableId) {
                el.classList.add('selected');
                if (cart.length > 0) {
                    el.className = 'table-card occupied selected';
                    const statusEl = el.querySelector('.table-status');
                    if (statusEl) {
                        statusEl.textContent = 'Ocupada';
                        statusEl.className = 'table-status occupied';
                    }
                }
            } else {
                el.classList.remove('selected');
            }
        });
        
        // Actualizar badge de items en la mesa
        updateTableBadge(currentTableId);
    }
    
    showNotification('info', '📋 Producto agregado. Haz clic en la mesa para continuar.');
}

// ==================== VER DETALLE DE MESA (Para modificar o cobrar) ====================
function viewTableDetail(tableId) {
    console.log('🔍 Viendo detalle de mesa:', tableId);
    
    // Seleccionar la mesa nuevamente
    selectTable(tableId);
    
    // Mostrar el carrito con los items
    const cartContainer = document.querySelector('.pos-cart');
    if (cartContainer) cartContainer.style.display = 'flex';
    
    // Cargar los items de la mesa
    loadTableOrder(tableId);
}

function loadTableOrder(tableId) {
    console.log('📋 Cargando orden de mesa desde servidor:', tableId);
    
    // Inicializar carrito de esta mesa si no existe
    if (!carts.tables[tableId]) {
        carts.tables[tableId] = [];
    }
    
    // ===== NUEVO: Si ya hay items en el carrito local, NO sobrescribir =====
    if (carts.tables[tableId].length > 0) {
        console.log(`📦 Mesa ${tableId} ya tiene ${carts.tables[tableId].length} items locales, no se sobrescribe`);
        updateCart();
        updateModuleBadges();
        return;
    }
    
    fetch(`/pos/api/table-order/${tableId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📦 Datos de la mesa desde servidor:', data);
            
            if (data.items && data.items.length > 0) {
                // Convertir items al formato del carrito
                carts.tables[tableId] = data.items.map(item => ({
                    id: item.product_id || item.id,
                    name: item.product_name || item.name,
                    price: parseFloat(item.price),
                    quantity: item.quantity,
                    variant: item.variant || null,
                    modifiers: item.modifiers || [],
                    notes: item.notes || ''
                }));
                
                // Guardar en localStorage
                try {
                    localStorage.setItem(`cart_table_${tableId}`, JSON.stringify(carts.tables[tableId]));
                } catch(e) {}
                
                updateCart();
                updateModuleBadges();
                
                // Mostrar el carrito
                const cartContainer = document.querySelector('.pos-cart');
                if (cartContainer) cartContainer.style.display = 'flex';
                
                showNotification('success', `📋 ${data.items.length} productos cargados del servidor`);
            } else {
                // No tiene items en el servidor, mantener carrito vacío
                carts.tables[tableId] = [];
                updateCart();
                updateModuleBadges();
                
                // Mostrar carrito vacío
                const cartContainer = document.querySelector('.pos-cart');
                if (cartContainer) cartContainer.style.display = 'flex';
                
                // Actualizar el badge de la mesa
                updateTableBadge(tableId);
            }
        })
        .catch(error => {
            console.error('❌ Error cargando orden:', error);
            
            // Si hay error, mantener carrito local si existe
            if (carts.tables[tableId] && carts.tables[tableId].length > 0) {
                console.log(`📦 Manteniendo carrito local de ${carts.tables[tableId].length} items`);
                updateCart();
                updateModuleBadges();
            } else {
                showNotification('info', '📋 Nueva orden para esta mesa');
                carts.tables[tableId] = [];
                updateCart();
                updateModuleBadges();
                
                // Mostrar carrito vacío
                const cartContainer = document.querySelector('.pos-cart');
                if (cartContainer) cartContainer.style.display = 'flex';
            }
        });
}

function clearTableSelection(confirmChange = true) {
    // Si la mesa tiene items, preguntar
    const cart = currentTableId ? (carts.tables[currentTableId] || []) : [];
    if (cart.length > 0 && confirmChange) {
        if (!confirm('La mesa tiene productos pendientes. ¿Seguro que quieres cerrarla?')) {
            return;
        }
    }
    
    // Restaurar la mesa a estado libre
    if (currentTableId) {
        const card = document.querySelector(`[data-table-id="${currentTableId}"]`);
        if (card) {
            card.className = 'table-card free';
            const statusEl = card.querySelector('.table-status');
            if (statusEl) {
                statusEl.textContent = 'Libre';
                statusEl.className = 'table-status free';
            }
            // Eliminar badge de items
            const badge = card.querySelector('.table-badge-items');
            if (badge) badge.remove();
        }
        
        // Limpiar carrito de esta mesa
        if (confirmChange) {
            delete carts.tables[currentTableId];
            try {
                localStorage.removeItem(`cart_table_${currentTableId}`);
            } catch(e) {}
        }
    }
    
    currentTableId = null;
    currentTableNumber = null;
    
    const selector = document.getElementById('tableSelector');
    const menu = document.getElementById('menuContentTables');
    const badge = document.getElementById('moduleBadge');
    
    if (selector) selector.style.display = 'block';
    if (menu) menu.style.display = 'none';
    if (badge) badge.style.display = 'none';
    
    const cartContainer = document.querySelector('.pos-cart');
    if (cartContainer) cartContainer.style.display = 'none';
    
    document.querySelectorAll('.table-card').forEach(el => el.classList.remove('selected'));
    updateCart();
    updateModuleBadges();
}

function clearModuleSelection() {
    if (currentModule === 'tables') {
        clearTableSelection(true);
    } else {
        if (carts[currentModule].length > 0) {
            if (confirm('¿Cancelar el pedido actual?')) {
                carts[currentModule] = [];
                const cartContainer = document.querySelector('.pos-cart');
                if (cartContainer) cartContainer.style.display = 'none';
                updateCart();
                updateModuleBadges();
                showNotification('info', 'Pedido cancelado');
            }
        } else {
            const cartContainer = document.querySelector('.pos-cart');
            if (cartContainer) cartContainer.style.display = 'none';
        }
    }
}

// ==================== CARRITO ====================


// ===== NUEVA FUNCIÓN: Actualizar badge de items en la mesa =====
function updateTableBadge(tableId) {
    const card = document.querySelector(`[data-table-id="${tableId}"]`);
    if (!card) return;
    
    // Obtener carrito de esta mesa específica
    const cart = carts.tables[tableId] || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    let badge = card.querySelector('.table-badge-items');
    if (totalItems > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'table-badge-items badge bg-danger';
            card.appendChild(badge);
        }
        badge.textContent = `🛒 ${totalItems}`;
    } else {
        if (badge) badge.remove();
    }
}

// ==================== ACTUALIZAR BADGES DE MÓDULOS ====================
function updateModuleBadges() {
    // Contar items en mostrador
    const counterCount = (carts.counter || []).reduce((sum, i) => sum + i.quantity, 0);
    
    // Contar items en delivery
    const deliveryCount = (carts.delivery || []).reduce((sum, i) => sum + i.quantity, 0);
    
    // Contar items en TODAS las mesas
    let tablesCount = 0;
    for (const tableId in carts.tables) {
        const items = carts.tables[tableId] || [];
        tablesCount += items.reduce((sum, i) => sum + i.quantity, 0);
    }
    
    const counterBadge = document.getElementById('counterBadge');
    const deliveryBadge = document.getElementById('deliveryBadge');
    const tablesBadge = document.getElementById('tablesBadge');
    
    if (counterBadge) counterBadge.textContent = counterCount || '0';
    if (deliveryBadge) deliveryBadge.textContent = deliveryCount || '0';
    if (tablesBadge) tablesBadge.textContent = tablesCount || '0';
}

function changeQuantity(index, delta) {
    let cart;
    if (currentModule === 'tables') {
        if (!currentTableId || !carts.tables[currentTableId]) return;
        cart = carts.tables[currentTableId];
    } else {
        cart = carts[currentModule];
    }
    
    if (cart && cart[index]) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        updateCart();
        updateModuleBadges();
    }
}

function removeItem(index) {
    let cart;
    if (currentModule === 'tables') {
        if (!currentTableId || !carts.tables[currentTableId]) return;
        cart = carts.tables[currentTableId];
    } else {
        cart = carts[currentModule];
    }
    
    if (cart) {
        cart.splice(index, 1);
        updateCart();
        updateModuleBadges();
    }
}

// ==================== PERSONALIZADOR ====================
function openProductCustomizer(productId) {
    console.log('🔍 Abriendo producto:', productId);
    
    if (currentModule === 'tables' && !currentTableId) {
        showNotification('warning', '⚠️ Primero selecciona una mesa');
        return;
    }
    
    fetch(`/pos/api/product/${productId}/`)
        .then(response => response.json())
        .then(data => {
            currentProductData = data;
            showCustomizerModal(data);
        })
        .catch(error => {
            console.error('❌ Error:', error);
            showNotification('error', '❌ Error al cargar el producto');
        });
}

function showCustomizerModal(product) {
    const modal = new bootstrap.Modal(document.getElementById('productCustomizerModal'));
    const body = document.getElementById('customizerBody');
    const title = document.getElementById('customizerTitle');
    
    if (title) title.textContent = `Personalizar - ${product.name}`;
    
    let html = `
        <div class="row">
            <div class="col-md-4 text-center">
                ${product.image ? `<img src="${product.image}" class="img-fluid rounded" style="max-height:200px;">` : 
                 `<div class="bg-light rounded p-5"><i class="fas fa-utensils fa-4x text-muted"></i></div>`}
                <h5 class="mt-3">${product.name}</h5>
                <h4 class="text-primary">$${product.price}</h4>
            </div>
            <div class="col-md-8">
    `;
    
    if (product.variants && product.variants.length > 0) {
        html += `
            <div class="mb-3">
                <label class="fw-bold">Variantes</label>
                <div class="d-flex flex-wrap gap-2">
        `;
        product.variants.forEach(v => {
            html += `
                <button class="btn btn-outline-primary variant-btn" data-variant-id="${v.id}" data-price="${v.price}">
                    ${v.name} ${v.price > 0 ? `$${v.price}` : ''}
                </button>
            `;
        });
        html += `</div></div>`;
    }
    
    if (product.modifiers && product.modifiers.length > 0) {
        html += `
            <div class="mb-3">
                <label class="fw-bold">Extras</label>
                <div class="d-flex flex-wrap gap-2">
        `;
        product.modifiers.forEach(m => {
            html += `
                <button class="btn btn-outline-secondary modifier-btn" data-modifier-id="${m.id}" data-price="${m.price || 0}">
                    ${m.name} ${m.price > 0 ? `+$${m.price}` : ''}
                </button>
            `;
        });
        html += `</div></div>`;
    }
    
    html += `
        <div class="mb-3">
            <label class="fw-bold">Comentarios</label>
            <textarea class="form-control" id="productNotes" rows="2" placeholder="Instrucciones especiales..."></textarea>
        </div>
        <div class="mb-3">
            <label class="fw-bold">Cantidad</label>
            <div class="d-flex align-items-center gap-3">
                <button class="btn btn-outline-secondary" onclick="changeCustomizerQty(-1)">−</button>
                <span class="h4 mb-0" id="customizerQty">1</span>
                <button class="btn btn-outline-secondary" onclick="changeCustomizerQty(1)">+</button>
            </div>
        </div>
        <button class="btn btn-primary w-100" onclick="addCustomizedProduct()">
            <i class="fas fa-plus"></i> Agregar al carrito
        </button>
    `;
    
    html += `</div></div>`;
    if (body) body.innerHTML = html;
    
    window.customizerData = { quantity: 1, selectedVariant: null, selectedModifiers: [] };
    
    document.querySelectorAll('.variant-btn').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            window.customizerData.selectedVariant = {
                id: this.dataset.variantId,
                price: parseFloat(this.dataset.price) || 0
            };
        };
    });
    
    document.querySelectorAll('.modifier-btn').forEach(btn => {
        btn.onclick = function() {
            this.classList.toggle('active');
            const id = parseInt(this.dataset.modifierId);
            const price = parseFloat(this.dataset.price) || 0;
            const idx = window.customizerData.selectedModifiers.findIndex(m => m.id === id);
            if (idx > -1) {
                window.customizerData.selectedModifiers.splice(idx, 1);
            } else {
                window.customizerData.selectedModifiers.push({ id, name: this.textContent.trim(), price });
            }
        };
    });
    
    modal.show();
}

function changeCustomizerQty(delta) {
    const el = document.getElementById('customizerQty');
    if (!el) return;
    let qty = parseInt(el.textContent) + delta;
    if (qty < 1) qty = 1;
    el.textContent = qty;
    window.customizerData.quantity = qty;
}
function addCustomizedProduct() {
    const product = currentProductData;
    if (!product) {
        showNotification('error', '❌ Error: Producto no encontrado');
        return;
    }
    
    const qty = parseInt(document.getElementById('customizerQty')?.textContent || 1);
    const notes = document.getElementById('productNotes')?.value || '';
    
    let variantPrice = 0;
    let variantName = null;
    const activeVariant = document.querySelector('.variant-btn.active');
    if (activeVariant) {
        variantName = activeVariant.textContent.trim();
        variantPrice = parseFloat(activeVariant.dataset.price) || 0;
    }
    
    const modifiers = [];
    document.querySelectorAll('.modifier-btn.active').forEach(btn => {
        modifiers.push({ name: btn.textContent.trim(), price: parseFloat(btn.dataset.price) || 0 });
    });
    
    let finalPrice = parseFloat(product.price) || 0;
    if (variantPrice > 0) finalPrice = variantPrice;
    modifiers.forEach(m => finalPrice += m.price);
    
    const cartItem = {
        id: product.id,
        name: product.name,
        price: finalPrice,
        quantity: qty,
        variant: variantName,
        modifiers: modifiers.map(m => m.name),
        notes: notes
    };
    
    addToCart(cartItem);
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('productCustomizerModal'));
    if (modal) modal.hide();
    showNotification('success', `✅ ${qty}x ${product.name} agregado`);
}

// ==================== PROCESAR PAGO ====================
// ==================== PROCESAR PAGO ====================
function processCheckout() {
    let cart;
    if (currentModule === 'tables') {
        if (!currentTableId || !carts.tables[currentTableId]) {
            showNotification('warning', '⚠️ No hay productos en esta mesa');
            return;
        }
        cart = carts.tables[currentTableId];
    } else {
        cart = carts[currentModule];
    }
    
    if (cart.length === 0) {
        showNotification('warning', '⚠️ No hay productos');
        return;
    }
    
    const total = parseFloat(document.getElementById('cartTotal')?.textContent.replace('$', '') || 0);
    const subtotal = parseFloat(document.getElementById('cartSubtotal')?.textContent.replace('$', '') || 0);
    
    let serviceType = 'dine_in';
    let clientName = 'Cliente general';
    let extraData = {};
    
    if (currentModule === 'delivery') {
        serviceType = 'delivery';
        clientName = document.getElementById('deliveryClient')?.value || 'Cliente sin nombre';
        extraData = {
            address: document.getElementById('deliveryAddress')?.value || '',
            phone: document.getElementById('deliveryPhone')?.value || ''
        };
    } else if (currentModule === 'counter') {
        serviceType = 'takeaway';
        clientName = 'Cliente mostrador';
    } else if (currentModule === 'tables') {
        serviceType = 'dine_in';
        clientName = `Mesa ${currentTableNumber}`;
    }
    
    if (!confirm(`¿Cobrar $${total.toFixed(2)}?`)) return;
    
    const orderData = {
        items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            variant: item.variant || null,
            modifiers: item.modifiers || [],
            notes: item.notes || ''
        })),
        service_type: serviceType,
        table_id: currentTableId || null,
        total: total,
        subtotal: subtotal,
        client: clientName,
        ...extraData
    };
    
    const btn = document.getElementById('checkoutBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    }
    
    // Obtener CSRF token
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
        showNotification('error', '❌ Error: Token CSRF no encontrado');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-credit-card"></i> Cobrar';
        }
        return;
    }
    
    // Primero crear la venta
    fetch('/pos/api/create-sale/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('success', `✅ Pedido #${data.order_id} completado`);
            orderNumbers[currentModule]++;
            
            // Limpiar localStorage
            try {
                if (currentModule === 'tables' && currentTableId) {
                    localStorage.removeItem(`cart_table_${currentTableId}`);
                } else {
                    localStorage.removeItem(`cart_${currentModule}`);
                }
            } catch(e) {}
            
            // ===== NUEVO: Liberar mesa con FormData =====
            if (currentModule === 'tables' && currentTableId) {
                const formData = new FormData();
                formData.append('table_id', currentTableId);
                
                return fetch(`/pos/free-table/${currentTableId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken
                        // NO incluir 'Content-Type' - el navegador lo establece automáticamente
                    },
                    body: formData
                });
            }
            return null;
        } else {
            throw new Error(data.message || 'Error al crear orden');
        }
    })
    .then(response => {
        if (response) {
            return response.json();
        }
        return null;
    })
    .then(data => {
        if (data && data.status === 'success') {
            console.log('✅ Mesa liberada correctamente');
        } else if (data && data.status === 'error') {
            console.warn('⚠️ Error liberando mesa:', data.message);
        }
        
        // Limpiar carrito del módulo actual
        if (currentModule === 'tables' && currentTableId) {
            carts.tables[currentTableId] = [];
        } else {
            carts[currentModule] = [];
        }
        
        updateCart();
        updateModuleBadges();
        
        const cartContainer = document.querySelector('.pos-cart');
        if (cartContainer) cartContainer.style.display = 'none';
        
        if (currentModule === 'tables') {
            const card = document.querySelector(`[data-table-id="${currentTableId}"]`);
            if (card) {
                card.className = 'table-card free';
                const statusEl = card.querySelector('.table-status');
                if (statusEl) {
                    statusEl.textContent = 'Libre';
                    statusEl.className = 'table-status free';
                }
                const badge = card.querySelector('.table-badge-items');
                if (badge) badge.remove();
            }
            
            // Volver a la vista de mesas
            const selector = document.getElementById('tableSelector');
            const menu = document.getElementById('menuContentTables');
            const badge = document.getElementById('moduleBadge');
            
            if (selector) selector.style.display = 'block';
            if (menu) menu.style.display = 'none';
            if (badge) badge.style.display = 'none';
            
            document.querySelectorAll('.table-card').forEach(el => el.classList.remove('selected'));
            currentTableId = null;
            currentTableNumber = null;
        }
        
        if (currentModule === 'delivery') {
            const clientInput = document.getElementById('deliveryClient');
            const phoneInput = document.getElementById('deliveryPhone');
            const addressInput = document.getElementById('deliveryAddress');
            if (clientInput) clientInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (addressInput) addressInput.value = '';
            loadDeliveryOrders();
        }
        
        showNotification('success', '✅ Pedido completado exitosamente');
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showNotification('error', '❌ Error: ' + error.message);
    })
    .finally(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-credit-card"></i> Cobrar';
        }
    });
}

// ==================== NOTIFICACIONES ====================
function showNotification(type, message) {
    let container = document.querySelector('.toast-container-custom');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container-custom';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-custom ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== FILTROS ====================
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.onclick = function() {
            const container = this.closest('.module-content');
            if (!container) return;
            container.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filterProducts(container);
        };
    });
    
    document.querySelectorAll('.product-search').forEach(input => {
        input.oninput = function() {
            const container = this.closest('.module-content');
            if (container) filterProducts(container);
        };
    });
});

function filterProducts(container) {
    const search = container.querySelector('.product-search')?.value.toLowerCase() || '';
    const activeCategory = container.querySelector('.category-tab.active')?.dataset.category || '';
    
    container.querySelectorAll('.product-card').forEach(card => {
        const category = card.dataset.category;
        const name = card.dataset.name || '';
        const matchCategory = !activeCategory || category === activeCategory;
        const matchSearch = name.includes(search);
        card.style.display = (matchCategory && matchSearch) ? '' : 'none';
    });
}

// ==================== CERRAR CARRITO ====================
// ==================== CERRAR CARRITO ====================
function closeCart() {
    let cart;
    if (currentModule === 'tables') {
        if (!currentTableId || !carts.tables[currentTableId]) {
            cart = [];
        } else {
            cart = carts.tables[currentTableId];
        }
    } else {
        cart = carts[currentModule];
    }
    
    // Si hay items en el carrito, preguntar
    if (cart.length > 0) {
        if (!confirm('¿Cancelar el pedido actual? Se perderán los productos agregados.')) {
            return;
        }
    }
    
    // Obtener CSRF token
    const csrfToken = getCsrfToken();
    
    // ===== Liberar la mesa si estamos en módulo mesas =====
    if (currentModule === 'tables' && currentTableId) {
        const card = document.querySelector(`[data-table-id="${currentTableId}"]`);
        if (card) {
            card.className = 'table-card free';
            const statusEl = card.querySelector('.table-status');
            if (statusEl) {
                statusEl.textContent = 'Libre';
                statusEl.className = 'table-status free';
            }
            const badge = card.querySelector('.table-badge-items');
            if (badge) badge.remove();
        }
        
        // Notificar al servidor con FormData
        if (csrfToken) {
            const formData = new FormData();
            formData.append('table_id', currentTableId);
            
            fetch(`/pos/free-table/${currentTableId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    console.log('✅ Mesa liberada correctamente');
                }
            })
            .catch(e => console.error('Error liberando mesa:', e));
        }
    }
    
    // Limpiar el carrito del módulo actual
    if (currentModule === 'tables' && currentTableId) {
        carts.tables[currentTableId] = [];
        try {
            localStorage.removeItem(`cart_table_${currentTableId}`);
        } catch(e) {}
    } else {
        carts[currentModule] = [];
        try {
            localStorage.removeItem(`cart_${currentModule}`);
        } catch(e) {}
    }
    
    // Ocultar el carrito
    const cartContainer = document.querySelector('.pos-cart');
    if (cartContainer) cartContainer.style.display = 'none';
    
    // Actualizar UI
    updateCart();
    updateModuleBadges();
    
    // Si estamos en mesas, volver a la vista de mesas
    if (currentModule === 'tables') {
        const selector = document.getElementById('tableSelector');
        const menu = document.getElementById('menuContentTables');
        const badge = document.getElementById('moduleBadge');
        
        if (selector) selector.style.display = 'block';
        if (menu) menu.style.display = 'none';
        if (badge) badge.style.display = 'none';
        
        document.querySelectorAll('.table-card').forEach(el => el.classList.remove('selected'));
        currentTableId = null;
        currentTableNumber = null;
    }
    
    showNotification('info', '🗑️ Carrito cancelado');
}
// ==================== PEDIDOS A DOMICILIO ====================
let deliveryOrders = [];

// Cargar pedidos a domicilio activos
function loadDeliveryOrders() {
    console.log('🔄 Cargando pedidos a domicilio...');
    
    const container = document.getElementById('deliveryOrdersContainer');
    const countBadge = document.getElementById('deliveryCount');
    
    if (!container) {
        console.warn('⚠️ Container de pedidos no encontrado, esperando...');
        // Intentar de nuevo después de 1 segundo
        setTimeout(loadDeliveryOrders, 1000);
        return;
    }
    
    // Mostrar estado de carga
    container.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="text-muted mt-2">Cargando pedidos...</p>
        </div>
    `;
    
    fetch('/pos/api/delivery-orders/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📦 Pedidos recibidos:', data);
            deliveryOrders = data.orders || [];
            renderDeliveryOrders();
        })
        .catch(error => {
            console.error('❌ Error cargando pedidos:', error);
            if (container) {
                container.innerHTML = `
                    <div class="text-danger text-center py-3">
                        <i class="fas fa-exclamation-circle fa-2x d-block mb-2"></i>
                        <p>Error cargando pedidos</p>
                        <button class="btn btn-sm btn-outline-danger" onclick="loadDeliveryOrders()">
                            <i class="fas fa-sync"></i> Reintentar
                        </button>
                    </div>
                `;
            }
            if (countBadge) countBadge.textContent = '0';
        });
}

// Renderizar pedidos a domicilio
// Renderizar pedidos a domicilio
function renderDeliveryOrders() {
    const container = document.getElementById('deliveryOrdersContainer');
    const countBadge = document.getElementById('deliveryCount');
    
    if (!container) {
        console.error('❌ Container de pedidos no encontrado');
        return;
    }
    
    if (deliveryOrders.length === 0) {
        container.innerHTML = `
            <div class="text-muted text-center py-3">
                <i class="fas fa-inbox fa-2x d-block mb-2"></i>
                No hay pedidos a domicilio activos
            </div>
        `;
        if (countBadge) countBadge.textContent = '0';
        return;
    }
    
    if (countBadge) countBadge.textContent = deliveryOrders.length;
    
    let html = '';
    deliveryOrders.forEach(order => {
        const statusColors = {
            'pending': 'pending',
            'preparing': 'preparing',
            'ready': 'ready',
            'delivered': 'delivered',
            'cancelled': 'cancelled'
        };
        const statusLabels = {
            'pending': '⏳ Pendiente',
            'preparing': '🔪 Preparando',
            'ready': '✅ Listo',
            'delivered': '📦 Entregado',
            'cancelled': '❌ Cancelado'
        };
        
        const statusClass = statusColors[order.status] || 'pending';
        const statusLabel = statusLabels[order.status] || 'Pendiente';
        
        // Mostrar datos del cliente
        const clientDisplay = order.client || 'Cliente';
        const phoneDisplay = order.phone || 'N/A';
        const addressDisplay = order.address || 'N/A';
        
        html += `
            <div class="delivery-order-card" data-order-id="${order.id}">
                <div class="order-info">
                    <div class="client-name">${clientDisplay}</div>
                    <div class="order-details">
                        <i class="fas fa-phone"></i> ${phoneDisplay} | 
                        <i class="fas fa-map-marker-alt"></i> ${addressDisplay}
                        <br>
                        <span class="text-muted">#${order.id} - ${order.items || 0} productos</span>
                        <span class="text-muted ms-2">🕐 ${order.created_at || ''}</span>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="order-status ${statusClass}">
                        ${statusLabel}
                    </span>
                    <div class="order-actions">
                        <!-- Botón Ver (Ojo) -->
                        <button class="btn btn-sm btn-outline-primary" onclick="viewDeliveryOrder(${order.id})" title="Ver pedido">
                            <i class="fas fa-eye"></i>
                        </button>
                        
                        <!-- Botón Preparar (Solo si está pendiente) -->
                        ${order.status === 'pending' ? `
                        <button class="btn btn-sm btn-outline-warning" onclick="updateDeliveryStatus(${order.id}, 'preparing')" title="Marcar en preparación">
                            <i class="fas fa-utensils"></i>
                        </button>
                        ` : ''}
                        
                        <!-- Botón Listo (Solo si está en preparación) -->
                        ${order.status === 'preparing' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="updateDeliveryStatus(${order.id}, 'ready')" title="Marcar como listo">
                            <i class="fas fa-check"></i>
                        </button>
                        ` : ''}
                        
                        <!-- Botón Entregar (Solo si está listo) -->
                        ${order.status === 'ready' ? `
                        <button class="btn btn-sm btn-outline-info" onclick="updateDeliveryStatus(${order.id}, 'delivered')" title="Marcar como entregado">
                            <i class="fas fa-truck"></i>
                        </button>
                        ` : ''}
                        
                        <!-- Botón Cancelar (X) - Visible en todos excepto entregado/cancelado) -->
                        ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="cancelDeliveryOrder(${order.id})" title="Cancelar pedido">
                            <i class="fas fa-times"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}


function viewDeliveryOrder(orderId) {
    console.log('👁️ Viendo pedido:', orderId);
    
    // Buscar el pedido en la lista
    const order = deliveryOrders.find(o => o.id === orderId);
    if (!order) {
        showNotification('warning', '⚠️ Pedido no encontrado');
        return;
    }
    
    // Cambiar al módulo de delivery
    currentModule = 'delivery';
    switchModule('delivery');
    
    // Mostrar el carrito
    const cartContainer = document.querySelector('.pos-cart');
    if (cartContainer) cartContainer.style.display = 'flex';
    
    // Cargar los items del pedido desde el servidor
    fetch(`/pos/api/delivery-order/${orderId}/items/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar items');
            }
            return response.json();
        })
        .then(data => {
            console.log('📦 Items del pedido:', data);
            
            if (data.items && data.items.length > 0) {
                // Convertir items al formato del carrito
                carts.delivery = data.items.map(item => ({
                    id: item.product_id || item.id,
                    name: item.product_name || item.name,
                    price: parseFloat(item.price),
                    quantity: item.quantity,
                    variant: item.variant || null,
                    modifiers: item.modifiers || [],
                    notes: item.notes || ''
                }));
                
                // Actualizar UI
                document.getElementById('orderNumber').textContent = orderId;
                document.getElementById('cartOrderInfo').innerHTML = `<i class="fas fa-truck"></i> Pedido #${orderId} - ${order.client}`;
                
                updateCart();
                updateModuleBadges();
                
                showNotification('success', `📋 Pedido #${orderId} cargado (${carts.delivery.length} productos)`);
            } else {
                showNotification('warning', '⚠️ Este pedido no tiene productos');
                carts.delivery = [];
                updateCart();
            }
        })
        .catch(error => {
            console.error('❌ Error cargando items:', error);
            showNotification('error', '❌ Error al cargar los productos del pedido');
            
            // Intentar cargar desde los datos locales si existen
            if (order.items_data) {
                try {
                    const items = JSON.parse(order.items_data);
                    carts.delivery = items;
                    updateCart();
                    showNotification('info', '📦 Productos cargados desde caché');
                } catch(e) {
                    // Si no hay datos, mostrar carrito vacío
                    carts.delivery = [];
                    updateCart();
                }
            }
        });
}

// Actualizar estado de pedido a domicilio

// Actualizar estado de pedido a domicilio
function updateDeliveryStatus(orderId, status) {
    const statusLabels = {
        'pending': 'pendiente',
        'preparing': 'preparación',
        'ready': 'listo',
        'delivered': 'entregado',
        'cancelled': 'cancelado'
    };
    
    const statusEmojis = {
        'pending': '⏳',
        'preparing': '🔪',
        'ready': '✅',
        'delivered': '📦',
        'cancelled': '❌'
    };
    
    // Verificar si el pedido existe en la lista local
    const order = deliveryOrders.find(o => o.id === orderId);
    if (!order) {
        showNotification('warning', '⚠️ Pedido no encontrado');
        return;
    }
    
    // Si ya está entregado o cancelado, no permitir cambios
    if (order.status === 'delivered' || order.status === 'cancelled') {
        showNotification('warning', `⚠️ Este pedido ya está ${statusLabels[order.status]}`);
        return;
    }
    
    if (!confirm(`¿Marcar pedido #${orderId} de "${order.client}" como "${statusLabels[status] || status}"?`)) {
        return;
    }
    
    // Obtener el token CSRF
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
        showNotification('error', '❌ Error: Token CSRF no encontrado. Recarga la página.');
        return;
    }
    
    console.log(`🔄 Actualizando pedido #${orderId} a ${status}`);
    
    fetch(`/pos/api/delivery-order/${orderId}/status/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ status: status })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification('success', `${statusEmojis[status] || '✅'} Pedido #${orderId} actualizado a ${statusLabels[status] || status}`);
            
            // Actualizar la lista local
            const localOrder = deliveryOrders.find(o => o.id === orderId);
            if (localOrder) {
                localOrder.status = status;
                // Recargar la lista visual
                renderDeliveryOrders();
            } else {
                // Recargar completa
                loadDeliveryOrders();
            }
            
            // Si el pedido fue entregado o cancelado, limpiar carrito
            if (status === 'delivered' || status === 'cancelled') {
                carts.delivery = [];
                updateCart();
                // Ocultar carrito
                const cartContainer = document.querySelector('.pos-cart');
                if (cartContainer) cartContainer.style.display = 'none';
                showNotification('info', `📦 Pedido #${orderId} finalizado`);
            }
        } else {
            showNotification('error', '❌ Error: ' + (data.error || 'Desconocido'));
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showNotification('error', '❌ Error de conexión: ' + error.message);
    });
}


// ==================== OCULTAR CARRITO ====================
function hideCart() {
    const cart = carts[currentModule];
    
    // Si estamos en mesas y el carrito tiene items, guardar y volver a mesas
    if (currentModule === 'tables') {
        // Guardar el carrito en localStorage
        if (cart.length > 0) {
            try {
                localStorage.setItem(`cart_${currentModule}`, JSON.stringify(cart));
            } catch(e) {}
        }
        
        // Ocultar el carrito
        const cartContainer = document.querySelector('.pos-cart');
        if (cartContainer) cartContainer.style.display = 'none';
        
        // Volver a la vista de mesas
        const selector = document.getElementById('tableSelector');
        const menu = document.getElementById('menuContentTables');
        const badge = document.getElementById('moduleBadge');
        
        if (selector) selector.style.display = 'block';
        if (menu) menu.style.display = 'none';
        if (badge) badge.style.display = 'none';
        
        // Mantener la mesa seleccionada pero sin el menú
        document.querySelectorAll('.table-card').forEach(el => {
            if (el.dataset.tableId == currentTableId) {
                el.classList.add('selected');
                // Si tiene items, mantener estado ocupado
                if (cart.length > 0) {
                    el.className = 'table-card occupied selected';
                    const statusEl = el.querySelector('.table-status');
                    if (statusEl) {
                        statusEl.textContent = 'Ocupada';
                        statusEl.className = 'table-status occupied';
                    }
                    // Actualizar badge
                    updateTableBadge(currentTableId);
                }
            }
        });
        
        showNotification('info', '📦 Carrito ocultado. Haz clic en la mesa para continuar.');
        return;
    }
    
    // Para domicilio, solo ocultar
    if (currentModule === 'delivery') {
        if (cart.length > 0) {
            try {
                localStorage.setItem(`cart_${currentModule}`, JSON.stringify(cart));
            } catch(e) {}
        }
        const cartContainer = document.querySelector('.pos-cart');
        if (cartContainer) cartContainer.style.display = 'none';
        showNotification('info', '📦 Carrito ocultado. Puedes continuar agregando productos.');
        return;
    }
    
    // Para mostrador, NO debe ocultarse (el botón no está visible)
    // Pero si se llama, mostrar advertencia
    if (currentModule === 'counter') {
        showNotification('warning', '⚠️ En Mostrador no se puede ocultar el carrito. Usa "Cancelar Pedido" si deseas limpiarlo.');
    }
}

// ==================== RESTAURAR CARRITO GUARDADO ====================

// ==================== RESTAURAR CARRITO GUARDADO ====================
function restoreCart() {
    try {
        // Restaurar carritos de mesas desde localStorage
        let mesasRestauradas = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cart_table_')) {
                const tableId = key.replace('cart_table_', '');
                try {
                    const items = JSON.parse(localStorage.getItem(key));
                    if (items && items.length > 0) {
                        if (!carts.tables[tableId]) {
                            carts.tables[tableId] = [];
                        }
                        // Solo restaurar si el carrito actual está vacío
                        if (carts.tables[tableId].length === 0) {
                            carts.tables[tableId] = items;
                            mesasRestauradas++;
                            console.log(`📦 Carrito restaurado para mesa ${tableId}: ${items.length} items`);
                            
                            // ===== NUEVO: Actualizar badge inmediatamente =====
                            if (currentModule === 'tables') {
                                updateTableBadge(tableId);
                            }
                        }
                    }
                } catch(e) {}
            }
        }
        
        // Restaurar carrito del módulo actual
        const module = localStorage.getItem('cart_module');
        if (module && carts[module]) {
            const savedCart = localStorage.getItem(`cart_${module}`);
            if (savedCart) {
                const items = JSON.parse(savedCart);
                if (items.length > 0 && carts[module].length === 0) {
                    carts[module] = items;
                    if (currentModule === module) {
                        updateCart();
                        updateModuleBadges();
                        const cartContainer = document.querySelector('.pos-cart');
                        if (cartContainer) cartContainer.style.display = 'flex';
                        showNotification('info', `📦 Carrito restaurado (${items.length} productos)`);
                    }
                }
            }
        }
        
        // Si estamos en mesas, actualizar badges
        if (currentModule === 'tables') {
            console.log(`🔄 Actualizando badges de ${mesasRestauradas} mesas restauradas...`);
            for (const tableId in carts.tables) {
                if (carts.tables[tableId].length > 0) {
                    updateTableBadge(tableId);
                }
            }
            updateModuleBadges();
        }
    } catch(e) {
        console.error('❌ Error restaurando carritos:', e);
    }
}

// ==================== ACTUALIZAR TODOS LOS BADGES ====================
function actualizarTodosLosBadges() {
    console.log('🔄 Actualizando todos los badges...');
    
    // Actualizar badges de todas las mesas
    for (const tableId in carts.tables) {
        if (carts.tables[tableId].length > 0) {
            updateTableBadge(tableId);
        }
    }
    
    // Actualizar badges de módulos
    updateModuleBadges();
    
    console.log('✅ Badges actualizados');
}

// ==================== CANCELAR PEDIDO (Completo) ====================
// ==================== CANCELAR PEDIDO (Completo) ====================
function cancelOrder() {
    // Obtener el carrito según el módulo
    let cart;
    if (currentModule === 'tables') {
        if (!currentTableId || !carts.tables[currentTableId]) {
            showNotification('warning', '⚠️ No hay productos para cancelar');
            return;
        }
        cart = carts.tables[currentTableId];
    } else {
        cart = carts[currentModule];
    }
    
    if (cart.length === 0) {
        showNotification('warning', '⚠️ No hay productos para cancelar');
        return;
    }
    
    if (!confirm('¿Estás seguro de cancelar este pedido? Se perderán todos los productos agregados.')) {
        return;
    }
    
    // Obtener CSRF token
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
        showNotification('error', '❌ Error: Token CSRF no encontrado');
        return;
    }
    
    // ===== Si es mesa, liberarla con FormData =====
    if (currentModule === 'tables' && currentTableId) {
        const card = document.querySelector(`[data-table-id="${currentTableId}"]`);
        if (card) {
            card.className = 'table-card free';
            const statusEl = card.querySelector('.table-status');
            if (statusEl) {
                statusEl.textContent = 'Libre';
                statusEl.className = 'table-status free';
            }
            const badge = card.querySelector('.table-badge-items');
            if (badge) badge.remove();
        }
        
        // Notificar al servidor con FormData
        const formData = new FormData();
        formData.append('table_id', currentTableId);
        
        fetch(`/pos/free-table/${currentTableId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('✅ Mesa liberada correctamente');
            } else {
                console.error('❌ Error liberando mesa:', data.message);
            }
        })
        .catch(e => console.error('Error liberando mesa:', e));
    }
    
    // ===== Si es domicilio, marcar como cancelado =====
    if (currentModule === 'delivery') {
        const orderId = document.getElementById('orderNumber')?.textContent;
        if (orderId && parseInt(orderId) > 0) {
            fetch(`/pos/api/delivery-order/${orderId}/cancel/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('✅ Pedido de delivery cancelado');
                }
            })
            .catch(e => console.error('Error cancelando pedido:', e));
        }
    }
    
    // Limpiar carrito
    if (currentModule === 'tables' && currentTableId) {
        carts.tables[currentTableId] = [];
        try {
            localStorage.removeItem(`cart_table_${currentTableId}`);
        } catch(e) {}
    } else {
        carts[currentModule] = [];
        try {
            localStorage.removeItem(`cart_${currentModule}`);
        } catch(e) {}
    }
    
    // Ocultar carrito
    const cartContainer = document.querySelector('.pos-cart');
    if (cartContainer) cartContainer.style.display = 'none';
    
    // Actualizar UI
    updateCart();
    updateModuleBadges();
    
    // Si estamos en mesas, volver a la vista de mesas
    if (currentModule === 'tables') {
        const selector = document.getElementById('tableSelector');
        const menu = document.getElementById('menuContentTables');
        const badge = document.getElementById('moduleBadge');
        
        if (selector) selector.style.display = 'block';
        if (menu) menu.style.display = 'none';
        if (badge) badge.style.display = 'none';
        
        document.querySelectorAll('.table-card').forEach(el => el.classList.remove('selected'));
        currentTableId = null;
        currentTableNumber = null;
    }
    
    // Si es domicilio, limpiar formulario
    if (currentModule === 'delivery') {
        const clientInput = document.getElementById('deliveryClient');
        const phoneInput = document.getElementById('deliveryPhone');
        const addressInput = document.getElementById('deliveryAddress');
        if (clientInput) clientInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (addressInput) addressInput.value = '';
        loadDeliveryOrders();
    }
    
    showNotification('danger', '🗑️ Pedido cancelado');
}

// ==================== MODIFICAR addToCart PARA GUARDAR EN LOCALSTORAGE ====================

function addToCart(product) {
    console.log('🛒 Agregando al carrito:', product);
    
    // Obtener el carrito correcto según el módulo
    let cart;
    if (currentModule === 'tables') {
        // Para mesas, usar el carrito de la mesa específica
        if (!currentTableId) {
            showNotification('warning', '⚠️ Primero selecciona una mesa');
            return;
        }
        
        // Inicializar carrito de esta mesa si no existe
        if (!carts.tables[currentTableId]) {
            carts.tables[currentTableId] = [];
        }
        cart = carts.tables[currentTableId];
    } else {
        cart = carts[currentModule];
    }
    
    // Validar según módulo
    if (currentModule === 'tables' && !currentTableId) {
        showNotification('warning', '⚠️ Primero selecciona una mesa');
        return;
    }
    
    if (currentModule === 'delivery') {
        const client = document.getElementById('deliveryClient')?.value.trim();
        const phone = document.getElementById('deliveryPhone')?.value.trim();
        const address = document.getElementById('deliveryAddress')?.value.trim();
        
        if (!client || !phone || !address) {
            showNotification('warning', '⚠️ Completa los datos del cliente');
            return;
        }
    }
    
    // Si es mesa, marcarla como ocupada
    if (currentModule === 'tables' && currentTableId) {
        const card = document.querySelector(`[data-table-id="${currentTableId}"]`);
        if (card) {
            card.className = 'table-card occupied selected';
            const statusEl = card.querySelector('.table-status');
            if (statusEl) {
                statusEl.textContent = 'Ocupada';
                statusEl.className = 'table-status occupied';
            }
        }
        // Actualizar badge
        updateTableBadge(currentTableId);
    }
    
    // Si el carrito está vacío, iniciar automáticamente
    if (cart.length === 0) {
        const cartContainer = document.querySelector('.pos-cart');
        if (cartContainer) cartContainer.style.display = 'flex';
        
        const orderNum = orderNumbers[currentModule];
        const orderNumberEl = document.getElementById('orderNumber');
        const cartOrderInfo = document.getElementById('cartOrderInfo');
        
        if (orderNumberEl) orderNumberEl.textContent = orderNum;
        
        if (currentModule === 'tables') {
            if (cartOrderInfo) cartOrderInfo.innerHTML = `<i class="fas fa-chair"></i> Mesa ${currentTableNumber}`;
        } else {
            const names = {'counter':'Mostrador','delivery':'Domicilio','tables':'Mesa'};
            if (cartOrderInfo) cartOrderInfo.innerHTML = `<i class="fas fa-receipt"></i> #${orderNum} - ${names[currentModule]}`;
        }
    }
    
    // Buscar si ya existe
    const existingIndex = cart.findIndex(item => 
        item.id === product.id && 
        item.variant === product.variant &&
        JSON.stringify(item.modifiers) === JSON.stringify(product.modifiers || [])
    );
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += product.quantity || 1;
    } else {
        cart.push({
            ...product,
            quantity: product.quantity || 1
        });
    }
    
    // Guardar en localStorage para esta mesa específica
    if (currentModule === 'tables' && currentTableId) {
        try {
            localStorage.setItem(`cart_table_${currentTableId}`, JSON.stringify(cart));
        } catch(e) {}
    } else {
        try {
            localStorage.setItem(`cart_${currentModule}`, JSON.stringify(cart));
        } catch(e) {}
    }
    
    updateCart();
    updateModuleBadges();
    
    // Si es módulo mesas, después de agregar volver a la vista de mesas
    if (currentModule === 'tables') {
        
    }
}

// ==================== ACTUALIZAR updateCart PARA GUARDAR ====================
// Modifica la función updateCart para que guarde en localStorage cuando hay cambios
// Agrega esta línea al final de updateCart, después de actualizar la UI:

function updateCart() {
    // Obtener el carrito correcto según el módulo
    let cart;
    if (currentModule === 'tables') {
        if (!currentTableId || !carts.tables[currentTableId]) {
            cart = [];
        } else {
            cart = carts.tables[currentTableId];
        }
    } else {
        cart = carts[currentModule] || [];
    }
    
    const cartDiv = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    const taxEl = document.getElementById('cartTax');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const assignBtn = document.getElementById('assignDeliveryBtn');
    
    if (!cartDiv) {
        console.error('❌ cartDiv no encontrado');
        return;
    }
    
    // Guardar en localStorage para esta mesa específica
    if (currentModule === 'tables' && currentTableId) {
        try {
            localStorage.setItem(`cart_table_${currentTableId}`, JSON.stringify(cart));
        } catch(e) {}
    } else {
        try {
            localStorage.setItem(`cart_${currentModule}`, JSON.stringify(cart));
        } catch(e) {}
    }
    
    if (!cart || cart.length === 0) {
        cartDiv.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>${currentModule === 'tables' && !currentTableId ? 'Selecciona una mesa' : 'Agrega productos al carrito'}</p>
            </div>
        `;
        if (subtotalEl) subtotalEl.textContent = '$0.00';
        if (taxEl) taxEl.textContent = '$0.00';
        if (totalEl) totalEl.textContent = '$0.00';
        if (checkoutBtn) checkoutBtn.disabled = true;
        if (assignBtn) assignBtn.disabled = true;
        return;
    }
    
    let subtotal = 0;
    let html = '';
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        html += `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-details">
                        <span>$${item.price} x ${item.quantity}</span>
                        ${item.variant ? `<span class="text-muted">🔹 ${item.variant}</span>` : ''}
                        ${item.notes ? `<span class="text-muted">📝 ${item.notes}</span>` : ''}
                    </div>
                </div>
                <div class="item-price">$${itemTotal.toFixed(2)}</div>
                <div class="item-actions">
                    <button class="qty-btn" onclick="changeQuantity(${index}, -1)">−</button>
                    <span class="qty-number">${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
                    <button class="remove-btn" onclick="removeItem(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartDiv.innerHTML = html;
    const tax = subtotal * 0.16;
    const total = subtotal + tax;
    
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    
    if (checkoutBtn) checkoutBtn.disabled = false;
    if (assignBtn) assignBtn.disabled = false;

    updateModuleBadges(); 
}
// ==================== ASIGNAR PEDIDO A DOMICILIO ====================
// ==================== ASIGNAR PEDIDO A DOMICILIO ====================
function assignDeliveryOrder() {
    const cart = carts.delivery;
    
    if (cart.length === 0) {
        showNotification('warning', '⚠️ No hay productos en el carrito');
        return;
    }
    
    const client = document.getElementById('deliveryClient')?.value.trim();
    const phone = document.getElementById('deliveryPhone')?.value.trim();
    const address = document.getElementById('deliveryAddress')?.value.trim();
    
    if (!client || !phone || !address) {
        showNotification('warning', '⚠️ Completa los datos del cliente');
        return;
    }
    
    const total = parseFloat(document.getElementById('cartTotal')?.textContent.replace('$', '') || 0);
    const subtotal = parseFloat(document.getElementById('cartSubtotal')?.textContent.replace('$', '') || 0);
    
    if (!confirm(`¿Asignar pedido a ${client} por $${total.toFixed(2)}?`)) {
        return;
    }
    
    const orderData = {
        items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            variant: item.variant || null,
            modifiers: item.modifiers || [],
            notes: item.notes || ''
        })),
        service_type: 'delivery',
        total: total,
        subtotal: subtotal,
        client: client,
        phone: phone,
        address: address,
        status: 'pending'
    };
    
    const btn = document.getElementById('assignDeliveryBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Asignando...';
    }
    
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
        showNotification('error', '❌ Error: Token CSRF no encontrado');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Asignar Pedido';
        return;
    }
    
    fetch('/pos/api/create-sale/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('success', `✅ Pedido #${data.order_id} asignado a ${client}`);
            orderNumbers.delivery++;
            
            // Limpiar carrito y formulario
            carts.delivery = [];
            document.getElementById('deliveryClient').value = '';
            document.getElementById('deliveryPhone').value = '';
            document.getElementById('deliveryAddress').value = '';
            
            updateCart();
            updateModuleBadges();
            
            // Ocultar carrito
            const cartContainer = document.querySelector('.pos-cart');
            if (cartContainer) cartContainer.style.display = 'none';
            
            // Recargar lista de pedidos
            loadDeliveryOrders();
            
            showNotification('success', `📦 Pedido #${data.order_id} en espera de preparación`);
        } else {
            throw new Error(data.message || 'Error al asignar pedido');
        }
    })
    .catch(error => {
        showNotification('error', '❌ Error: ' + error.message);
    })
    .finally(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Asignar Pedido';
        }
    });
}


// ==================== CANCELAR PEDIDO A DOMICILIO ====================
function cancelDeliveryOrder(orderId) {
    const order = deliveryOrders.find(o => o.id === orderId);
    if (!order) {
        showNotification('warning', '⚠️ Pedido no encontrado');
        return;
    }
    
    if (order.status === 'delivered') {
        showNotification('warning', '⚠️ Este pedido ya fue entregado, no se puede cancelar');
        return;
    }
    
    if (order.status === 'cancelled') {
        showNotification('warning', '⚠️ Este pedido ya está cancelado');
        return;
    }
    
    if (!confirm(`¿Estás seguro de cancelar el pedido #${orderId} de "${order.client}"?`)) {
        return;
    }
    
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
        showNotification('error', '❌ Error: Token CSRF no encontrado. Recarga la página.');
        return;
    }
    
    console.log('🔑 Token CSRF usado para cancelar:', csrfToken);
    
    fetch(`/pos/api/delivery-order/${orderId}/cancel/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification('danger', `❌ Pedido #${orderId} cancelado`);
            
            // Actualizar la lista local
            const localOrder = deliveryOrders.find(o => o.id === orderId);
            if (localOrder) {
                localOrder.status = 'cancelled';
                renderDeliveryOrders();
            } else {
                loadDeliveryOrders();
            }
            
            // Si estamos viendo este pedido en el carrito, limpiar
            if (carts.delivery.length > 0) {
                carts.delivery = [];
                updateCart();
                const cartContainer = document.querySelector('.pos-cart');
                if (cartContainer) cartContainer.style.display = 'none';
            }
        } else {
            showNotification('error', '❌ Error: ' + (data.error || 'Desconocido'));
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showNotification('error', '❌ Error de conexión: ' + error.message);
    });
}

// ==================== PAGO Y TICKET ====================

// Variables globales para pago
let currentSaleId = null;
let currentClientId = null;

// Abrir modal de pago
// Abrir modal de pago
function openPaymentModal() {
    console.log('🔄 Abriendo modal de pago...');
    
    // Obtener el carrito
    let cart;
    if (currentModule === 'tables') {
        if (!currentTableId || !carts.tables[currentTableId]) {
            showNotification('warning', '⚠️ No hay productos en esta mesa');
            return;
        }
        cart = carts.tables[currentTableId];
    } else {
        cart = carts[currentModule];
    }
    
    if (cart.length === 0) {
        showNotification('warning', '⚠️ No hay productos');
        return;
    }
    
    // Calcular totales
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let tax = subtotal * 0.16;
    let total = subtotal + tax;
    
    // Actualizar modal
    const subtotalEl = document.getElementById('paymentSubtotal');
    const taxEl = document.getElementById('paymentTax');
    const totalEl = document.getElementById('paymentTotal');
    const cashInput = document.getElementById('cashAmount');
    const cardInput = document.getElementById('cardAmount');
    const changeEl = document.getElementById('changeAmount');
    const totalPaidEl = document.getElementById('totalPaidAmount');
    const alertEl = document.getElementById('paymentAlert');
    const btn = document.querySelector('#paymentModal .btn-success');
    
    if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
    if (taxEl) taxEl.textContent = '$' + tax.toFixed(2);
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
    
    // Inicializar campos de pago
    if (cashInput) cashInput.value = total.toFixed(2);
    if (cardInput) cardInput.value = '0.00';
    if (changeEl) changeEl.textContent = '$0.00';
    if (totalPaidEl) totalPaidEl.textContent = '$' + total.toFixed(2);
    
    // Ocultar alerta
    if (alertEl) alertEl.style.display = 'none';
    
    // Habilitar botón de confirmar
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Pago';
    }
    
    // Limpiar cliente
    const selectedClientId = document.getElementById('selectedClientId');
    const selectedClientName = document.getElementById('selectedClientName');
    const clientSearch = document.getElementById('clientSearch');
    const clientResults = document.getElementById('clientResults');
    const newClientForm = document.getElementById('newClientForm');
    
    if (selectedClientId) selectedClientId.value = '';
    if (selectedClientName) selectedClientName.style.display = 'none';
    if (clientSearch) clientSearch.value = '';
    if (clientResults) clientResults.style.display = 'none';
    if (newClientForm) newClientForm.style.display = 'none';
    
    // ===== NUEVO: Inicializar método de pago =====
    // Seleccionar "Efectivo" por defecto
    selectPaymentMethod('cash');
    
    // ===== NUEVO: Actualizar total pagado después de un pequeño delay =====
    setTimeout(function() {
        updateTotalPaid();
        // Forzar cálculo de cambio
        calculateChange();
    }, 200);
    
    // Mostrar modal
    const modalElement = document.getElementById('paymentModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        showNotification('error', '❌ Modal de pago no encontrado');
    }
}

// Buscar cliente
function searchClient() {
    const query = document.getElementById('clientSearch').value.trim();
    if (query.length < 2) {
        showNotification('warning', 'Escribe al menos 2 caracteres');
        return;
    }
    
    fetch(`/clients/api/search/?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            const results = document.getElementById('clientResults');
            if (data.results && data.results.length > 0) {
                results.innerHTML = data.results.map(client => `
                    <div class="client-result-item p-2 border-bottom" onclick="selectClient(${client.id}, '${client.name}')">
                        <strong>${client.name}</strong>
                        <span class="text-muted"> - ${client.phone || 'Sin teléfono'}</span>
                    </div>
                `).join('');
                results.style.display = 'block';
            } else {
                results.innerHTML = '<div class="text-muted p-2">No se encontraron clientes</div>';
                results.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('error', 'Error al buscar clientes');
        });
}

// Seleccionar cliente
function selectClient(id, name) {
    document.getElementById('selectedClientId').value = id;
    document.getElementById('selectedClientName').textContent = 'Cliente: ' + name;
    document.getElementById('selectedClientName').style.display = 'inline-block';
    document.getElementById('clientResults').style.display = 'none';
    document.getElementById('clientSearch').value = '';
}

// Mostrar formulario nuevo cliente
function showNewClientForm() {
    document.getElementById('newClientForm').style.display = 'block';
    document.getElementById('clientResults').style.display = 'none';
}

// Ocultar formulario nuevo cliente
function hideNewClientForm() {
    document.getElementById('newClientForm').style.display = 'none';
    document.getElementById('newClientName').value = '';
    document.getElementById('newClientPhone').value = '';
    document.getElementById('newClientAddress').value = '';
}

// Guardar nuevo cliente
function saveNewClient() {
    const name = document.getElementById('newClientName').value.trim();
    const phone = document.getElementById('newClientPhone').value.trim();
    const address = document.getElementById('newClientAddress').value.trim();
    
    if (!name) {
        showNotification('warning', 'El nombre es obligatorio');
        return;
    }
    
    const csrfToken = getCsrfToken();
    
    fetch('/clients/api/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ name, phone, address })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            selectClient(data.id, name);
            hideNewClientForm();
            showNotification('success', 'Cliente creado correctamente');
        } else {
            showNotification('error', 'Error al crear cliente: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('error', 'Error al crear cliente');
    });
}

// Procesar pago
// Procesar pago
function processPayment() {
    // Obtener método de pago
    const methodBtn = document.querySelector('.payment-method-btn.active');
    if (!methodBtn) {
        showNotification('warning', 'Selecciona un método de pago');
        return;
    }
    const paymentMethod = methodBtn.dataset.method;
    
    // Obtener cliente
    const clientId = document.getElementById('selectedClientId')?.value || null;
    const clientName = document.getElementById('selectedClientName')?.textContent.replace('Cliente: ', '') || 'Cliente general';
    
    // Obtener carrito
    let cart;
    let serviceType = 'takeaway';
    let tableId = null;
    
    if (currentModule === 'tables') {
        cart = carts.tables[currentTableId];
        serviceType = 'dine_in';
        tableId = currentTableId;
    } else if (currentModule === 'delivery') {
        cart = carts.delivery;
        serviceType = 'delivery';
    } else {
        cart = carts.counter;
        serviceType = 'takeaway';
    }
    
    if (!cart || cart.length === 0) {
        showNotification('warning', '⚠️ No hay productos');
        return;
    }
    
    // Calcular totales
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let tax = subtotal * 0.16;
    let total = subtotal + tax;
    
    // Obtener montos según método de pago
    let amountReceived = null;
    let cardAmount = null;
    let cashAmount = null;
    
    if (paymentMethod === 'cash') {
        cashAmount = parseFloat(document.getElementById('cashAmount')?.value) || total;
        amountReceived = cashAmount;
    } else if (paymentMethod === 'card') {
        cardAmount = parseFloat(document.getElementById('cardAmount')?.value) || total;
        amountReceived = cardAmount;
    } else if (paymentMethod === 'mix') {
        cashAmount = parseFloat(document.getElementById('cashAmount')?.value) || 0;
        cardAmount = parseFloat(document.getElementById('cardAmount')?.value) || 0;
        amountReceived = cashAmount + cardAmount;
    } else if (paymentMethod === 'transfer' || paymentMethod === 'qr') {
        amountReceived = total; // Pago completo
    }
    
    // Validar que el pago cubra el total
    if (amountReceived < total) {
        showNotification('warning', `⚠️ El monto pagado ($${amountReceived.toFixed(2)}) es menor al total ($${total.toFixed(2)})`);
        return;
    }
    
    const csrfToken = getCsrfToken();
    
    const orderData = {
        items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            variant: item.variant || null,
            modifiers: item.modifiers || [],
            notes: item.notes || ''
        })),
        service_type: serviceType,
        table_id: tableId,
        total: total,
        subtotal: subtotal,
        client: clientId,
        client_name: clientName,
        payment_method: paymentMethod,
        amount_received: amountReceived,
        cash_amount: cashAmount,
        card_amount: cardAmount
    };
    
    const btn = document.querySelector('#paymentModal .btn-success');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    }
    
    fetch('/pos/api/create-sale/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            currentSaleId = data.order_id;
            
            // Cerrar modal de pago
            const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
            paymentModal.hide();
            
            // Limpiar carrito
            if (currentModule === 'tables' && currentTableId) {
                carts.tables[currentTableId] = [];
                localStorage.removeItem(`cart_table_${currentTableId}`);
                const card = document.querySelector(`[data-table-id="${currentTableId}"]`);
                if (card) {
                    card.className = 'table-card free';
                    const statusEl = card.querySelector('.table-status');
                    if (statusEl) {
                        statusEl.textContent = 'Libre';
                        statusEl.className = 'table-status free';
                    }
                    const badge = card.querySelector('.table-badge-items');
                    if (badge) badge.remove();
                }
            } else {
                carts[currentModule] = [];
                localStorage.removeItem(`cart_${currentModule}`);
            }
            
            updateCart();
            updateModuleBadges();
            
            // Mostrar ticket
            showTicket(data.order_id);
            
            showNotification('success', '✅ Pedido #' + data.order_id + ' completado');
        } else {
            throw new Error(data.message || 'Error al crear orden');
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showNotification('error', '❌ Error: ' + error.message);
    })
    .finally(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Pago';
        }
    });
}

// Mostrar ticket
function showTicket(saleId) {
    fetch(`/pos/sale/${saleId}/ticket-data/`)
        .then(response => response.json())
        .then(data => {
            const content = document.getElementById('ticketContent');
            content.innerHTML = generateTicketHTML(data);
            
            const modal = new bootstrap.Modal(document.getElementById('ticketModal'));
            modal.show();
        })
        .catch(error => {
            console.error('❌ Error:', error);
            showNotification('error', 'Error al generar ticket');
        });
}

// Generar HTML del ticket
function generateTicketHTML(data) {
    const itemsHtml = data.items.map(item => `
        <tr>
            <td>${item.quantity}x</td>
            <td>${item.product_name}</td>
            <td style="text-align:right;">$${item.subtotal.toFixed(2)}</td>
        </tr>
    `).join('');
    
    // ===== NUEVO: Generar desglose de pago =====
    let paymentBreakdownHtml = '';
    if (data.sale.payment_breakdown && data.sale.payment_breakdown.length > 0) {
        paymentBreakdownHtml = `
            <div style="display: flex; flex-direction: column; font-size: 12px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ccc;">
                <span style="font-weight: 600;">Desglose de pago:</span>
                ${data.sale.payment_breakdown.map(item => `
                    <div style="display: flex; justify-content: space-between; padding: 1px 0;">
                        <span>${item.split(':')[0]}:</span>
                        <span>${item.split(':')[1]}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    return `
        <div class="ticket" style="font-family: monospace; padding: 10px; max-width: 300px; margin: 0 auto;">
            <div style="text-align: center; border-bottom: 1px dashed #ccc; padding-bottom: 10px;">
                <h4 style="margin: 0;">${data.business_name || 'Chiwu Antojería'}</h4>
                <p style="font-size: 11px; margin: 2px 0;">${data.business_address || ''}</p>
                <p style="font-size: 11px; margin: 2px 0;">Tel: ${data.business_phone || ''}</p>
                <p style="font-size: 11px; margin: 2px 0;">RUC: ${data.business_ruc || ''}</p>
            </div>
            
            <div style="padding: 8px 0; border-bottom: 1px dashed #ccc; font-size: 12px;">
                <p style="margin: 2px 0;"><strong>Orden #${data.sale.id}</strong></p>
                <p style="margin: 2px 0;">Fecha: ${data.sale.created_at}</p>
                <p style="margin: 2px 0;">Cliente: ${data.sale.client || 'Cliente general'}</p>
                ${data.sale.table ? `<p style="margin: 2px 0;">Mesa: ${data.sale.table}</p>` : ''}
            </div>
            
            <div style="padding: 8px 0; border-bottom: 1px dashed #ccc;">
                <table style="width: 100%; font-size: 12px;">
                    <thead>
                        <tr>
                            <th style="text-align:left;">Cant</th>
                            <th style="text-align:left;">Producto</th>
                            <th style="text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>
            
            <div style="padding: 8px 0; font-size: 13px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Subtotal:</span>
                    <span>$${data.sale.subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>IVA (16%):</span>
                    <span>$${data.sale.tax.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; font-size: 15px;">
                    <span>TOTAL:</span>
                    <span>$${data.sale.total.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 5px;">
                    <span>Método de pago:</span>
                    <span>${data.sale.payment_method || 'Efectivo'}</span>
                </div>
                ${data.sale.amount_received ? `
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>Recibido:</span>
                    <span>$${data.sale.amount_received.toFixed(2)}</span>
                </div>
                ` : ''}
                ${data.sale.change_amount && data.sale.change_amount > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>Cambio:</span>
                    <span>$${data.sale.change_amount.toFixed(2)}</span>
                </div>
                ` : ''}
                ${paymentBreakdownHtml}
            </div>
            
            <div style="text-align: center; border-top: 1px dashed #ccc; padding-top: 8px; font-size: 11px;">
                <p style="margin: 2px 0;">¡Gracias por su compra!</p>
                <p style="margin: 2px 0; color: #999;">${data.sale.created_at}</p>
            </div>
        </div>
    `;
}

// Imprimir ticket
function printTicket() {
    const content = document.getElementById('ticketContent');
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
        <html>
            <head>
                <title>Ticket</title>
                <style>
                    body { font-family: monospace; padding: 10px; }
                    .ticket { max-width: 300px; margin: 0 auto; }
                </style>
            </head>
            <body>
                ${content.innerHTML}
                <script>
                    window.onload = function() { window.print(); }
                <\/script>
            </body>
        </html>
    `);
    win.document.close();
}

// Descargar PDF del ticket
function downloadTicket() {
    const content = document.getElementById('ticketContent');
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
        <html>
            <head>
                <title>Ticket</title>
                <style>
                    body { font-family: monospace; padding: 10px; }
                    .ticket { max-width: 300px; margin: 0 auto; }
                </style>
            </head>
            <body>
                ${content.innerHTML}
                <script>
                    window.onload = function() { 
                        window.print(); 
                    }
                <\/script>
            </body>
        </html>
    `);
    win.document.close();
}

// ==================== SELECCIONAR MÉTODO DE PAGO ====================
function selectPaymentMethod(method) {
    console.log('💰 Seleccionando método de pago:', method);
    
    // Desactivar todos los botones
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activar el botón seleccionado
    const selectedBtn = document.querySelector(`.payment-method-btn[data-method="${method}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Mostrar/ocultar campos según el método
    const cashField = document.getElementById('cashAmountField');
    const cardField = document.getElementById('cardAmountField');
    const cashInput = document.getElementById('cashAmount');
    const cardInput = document.getElementById('cardAmount');
    const total = parseFloat(document.getElementById('paymentTotal')?.textContent.replace('$', '')) || 0;
    
    // Ocultar todos los campos primero
    if (cashField) cashField.style.display = 'none';
    if (cardField) cardField.style.display = 'none';
    
    // Mostrar campos según el método
    if (method === 'cash') {
        // Solo efectivo - mostrar campo de efectivo
        if (cashField) {
            cashField.style.display = 'block';
            if (cashInput) cashInput.value = total.toFixed(2);
        }
        // Calcular cambio
        calculateChange();
        
    } else if (method === 'card') {
        // Solo tarjeta - mostrar campo de tarjeta
        if (cardField) {
            cardField.style.display = 'block';
            if (cardInput) cardInput.value = total.toFixed(2);
        }
        if (cashField) cashField.style.display = 'none';
        
    } else if (method === 'transfer' || method === 'qr') {
        // Transferencia o QR - sin campos de monto (pago completo)
        if (cashField) cashField.style.display = 'none';
        if (cardField) cardField.style.display = 'none';
        
    } else if (method === 'mix') {
        // Mixto - mostrar ambos campos
        if (cashField) cashField.style.display = 'block';
        if (cardField) cardField.style.display = 'block';
        if (cashInput) cashInput.value = '0.00';
        if (cardInput) cardInput.value = '0.00';
    }
}

// ==================== CALCULAR CAMBIO ====================
function calculateChange() {
    const total = parseFloat(document.getElementById('paymentTotal')?.textContent.replace('$', '')) || 0;
    const cashAmount = parseFloat(document.getElementById('cashAmount')?.value) || 0;
    const change = cashAmount - total;
    const changeEl = document.getElementById('changeAmount');
    if (changeEl) {
        changeEl.textContent = '$' + (change > 0 ? change.toFixed(2) : '0.00');
    }
}



// ==================== EVENTOS DE INPUT ====================
document.addEventListener('DOMContentLoaded', function() {
    // Calcular cambio al escribir en efectivo
    const cashInput = document.getElementById('cashAmount');
    if (cashInput) {
        cashInput.addEventListener('input', function() {
            calculateChange();
            updateTotalPaid();
        });
    }
    
    // Validar pago al escribir en tarjeta
    const cardInput = document.getElementById('cardAmount');
    if (cardInput) {
        cardInput.addEventListener('input', function() {
            updateTotalPaid();
        });
    }
    
    // También actualizar cuando cambie el método de pago
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setTimeout(updateTotalPaid, 100);
        });
    });
});

// ==================== VALIDAR PAGO ====================
function validatePayment() {
    const methodBtn = document.querySelector('.payment-method-btn.active');
    if (!methodBtn) return;
    
    const method = methodBtn.dataset.method;
    const total = parseFloat(document.getElementById('paymentTotal')?.textContent.replace('$', '')) || 0;
    let totalPaid = 0;
    
    if (method === 'cash') {
        totalPaid = parseFloat(document.getElementById('cashAmount')?.value) || 0;
    } else if (method === 'card') {
        totalPaid = parseFloat(document.getElementById('cardAmount')?.value) || 0;
    } else if (method === 'mix') {
        const cash = parseFloat(document.getElementById('cashAmount')?.value) || 0;
        const card = parseFloat(document.getElementById('cardAmount')?.value) || 0;
        totalPaid = cash + card;
    } else if (method === 'transfer' || method === 'qr') {
        totalPaid = total; // Pago completo
    }
    
    const btn = document.querySelector('#paymentModal .btn-success');
    if (btn) {
        if (totalPaid >= total) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Pago';
        } else {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Faltan $${(total - totalPaid).toFixed(2)}`;
        }
    }
}

// ==================== ACTUALIZAR TOTAL PAGADO ====================
function updateTotalPaid() {
    const methodBtn = document.querySelector('.payment-method-btn.active');
    if (!methodBtn) return;
    
    const method = methodBtn.dataset.method;
    const total = parseFloat(document.getElementById('paymentTotal')?.textContent.replace('$', '')) || 0;
    let totalPaid = 0;
    let cashAmount = 0;
    let cardAmount = 0;
    
    if (method === 'cash') {
        cashAmount = parseFloat(document.getElementById('cashAmount')?.value) || 0;
        totalPaid = cashAmount;
    } else if (method === 'card') {
        cardAmount = parseFloat(document.getElementById('cardAmount')?.value) || 0;
        totalPaid = cardAmount;
    } else if (method === 'mix') {
        cashAmount = parseFloat(document.getElementById('cashAmount')?.value) || 0;
        cardAmount = parseFloat(document.getElementById('cardAmount')?.value) || 0;
        totalPaid = cashAmount + cardAmount;
    } else if (method === 'transfer' || method === 'qr') {
        totalPaid = total; // Pago completo
    }
    
    // Actualizar total pagado
    const totalPaidEl = document.getElementById('totalPaidAmount');
    if (totalPaidEl) {
        totalPaidEl.textContent = '$' + totalPaid.toFixed(2);
    }
    
    // Mostrar/ocultar campo de total pagado
    const totalPaidField = document.getElementById('totalPaidField');
    if (totalPaidField) {
        totalPaidField.style.display = 'block';
    }
    
    // Validar y mostrar alerta
    const alertEl = document.getElementById('paymentAlert');
    const alertMsg = document.getElementById('paymentAlertMessage');
    const btn = document.querySelector('#paymentModal .btn-success');
    
    if (totalPaid < total) {
        if (alertEl) {
            alertEl.style.display = 'block';
            if (alertMsg) {
                alertMsg.textContent = `Faltan $${(total - totalPaid).toFixed(2)} para completar el pago`;
            }
        }
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Faltan $${(total - totalPaid).toFixed(2)}`;
        }
    } else {
        if (alertEl) {
            alertEl.style.display = 'none';
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Pago';
        }
    }
}