const socket = io();
let state = { tables: {}, menu: [], tablesCount: 10 };
let currentTableId = null;
let currentOrder = []; // items temporales en edición

const statusEl = document.getElementById('status');
const tablesGrid = document.getElementById('tables-grid');
const tableDetail = document.getElementById('table-detail');
const detailTableNum = document.getElementById('detail-table-num');
const currentOrderEl = document.getElementById('current-order');
const searchMenu = document.getElementById('search-menu');
const menuResults = document.getElementById('menu-results');
const tableNotes = document.getElementById('table-notes');
const cajaList = document.getElementById('caja-list');
const cajaSummary = document.getElementById('caja-summary');
const menuList = document.getElementById('menu-list');

// Navegación
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'mesas') showTables();
    if (btn.dataset.view === 'caja') renderCaja();
    if (btn.dataset.view === 'menu') renderMenu();
  });
});

// Conexión
socket.on('connect', () => {
  statusEl.textContent = 'Conectado ✓';
  statusEl.className = 'connection-status connected';
});

socket.on('disconnect', () => {
  statusEl.textContent = 'Desconectado - Reintentando...';
  statusEl.className = 'connection-status disconnected';
});

socket.on('state', (newState) => {
  state = newState;
  renderAll();
});

socket.on('tableUpdated', () => {
  renderAll();
});

function renderAll() {
  const activeView = document.querySelector('.view.active')?.id;
  if (activeView === 'view-mesas') showTables();
  if (activeView === 'view-caja') renderCaja();
  if (activeView === 'view-menu') renderMenu();
  updateConfig();
}

// ===== MESAS =====
// Posiciones aproximadas según el salón (en %)
const TABLE_POSITIONS = {
  24: {left: 2, top: 4}, 25: {left: 12, top: 4}, 28: {left: 20, top: 4}, 29: {left: 28, top: 4},
  31: {left: 36, top: 4}, 34: {left: 44, top: 4}, 35: {left: 52, top: 4}, 37: {left: 60, top: 4},
  39: {left: 68, top: 4}, 41: {left: 76, top: 4}, 64: {left: 86, top: 4}, 50: {left: 92, top: 4}, 59: {left: 98, top: 4},

  23: {left: 2, top: 14}, 26: {left: 12, top: 14}, 27: {left: 20, top: 14}, 30: {left: 28, top: 14},
  32: {left: 36, top: 14}, 33: {left: 44, top: 14}, 36: {left: 52, top: 14}, 38: {left: 60, top: 14},
  40: {left: 68, top: 14}, 42: {left: 76, top: 14}, 63: {left: 86, top: 14}, 51: {left: 92, top: 14}, 58: {left: 98, top: 14},

  22: {left: 2, top: 24},

  5: {left: 2, top: 38}, 6: {left: 12, top: 38}, 13: {left: 22, top: 38}, 14: {left: 32, top: 38}, 21: {left: 42, top: 38},
  4: {left: 2, top: 48}, 7: {left: 12, top: 48}, 12: {left: 22, top: 48}, 15: {left: 32, top: 48}, 20: {left: 42, top: 48},
  3: {left: 2, top: 58}, 8: {left: 12, top: 58}, 11: {left: 22, top: 58}, 16: {left: 32, top: 58}, 19: {left: 42, top: 58},
  2: {left: 2, top: 68}, 9: {left: 12, top: 68}, 10: {left: 22, top: 68}, 17: {left: 32, top: 68}, 18: {left: 42, top: 68},
  1: {left: 2, top: 78},

  60: {left: 52, top: 48}, 65: {left: 62, top: 40}, 66: {left: 62, top: 50}, 67: {left: 62, top: 60},

  62: {left: 78, top: 38}, 52: {left: 86, top: 38}, 57: {left: 94, top: 38},
  61: {left: 78, top: 48}, 53: {left: 86, top: 48}, 56: {left: 94, top: 48},
  54: {left: 86, top: 58}, 55: {left: 94, top: 58}
};

let currentFilter = 'todos';
const WAITER_COLORS = ['#42a5f5', '#ab47bc', '#26a69a', '#ffa726', '#ef5350', '#7e57c2', '#66bb6a', '#ff7043'];

function getWaiterColor(name) {
  if (!name) return null;
  const idx = (state.waiters || []).indexOf(name);
  return WAITER_COLORS[idx % WAITER_COLORS.length] || '#90a4ae';
}

function renderFilters() {
  const container = document.getElementById('waiter-filters');
  if (!container) return;
  const waiters = state.waiters || [];
  container.innerHTML = `
    <button class="filter-btn ${currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>
    ${waiters.map(w => `<button class="filter-btn ${currentFilter === w ? 'active' : ''}" data-filter="${w}" style="border-color:${getWaiterColor(w)}">${w}</button>`).join('')}
  `;
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      showTables();
    });
  });
}

function showTables() {
  tablesGrid.classList.remove('hidden');
  tableDetail.classList.add('hidden');
  tablesGrid.innerHTML = '';
  tablesGrid.classList.add('salon-layout');
  renderFilters();

  const tables = Object.values(state.tables);
  tables.forEach(table => {
    if (currentFilter !== 'todos' && table.waiter !== currentFilter) return;

    const pos = TABLE_POSITIONS[table.id] || {left: 50, top: 50};
    const card = document.createElement('div');
    let statusClass = 'libre';
    if (table.items && table.items.length > 0) {
      statusClass = 'con-pedido';
    } else if (table.status === 'ocupada') {
      statusClass = 'ocupada';
    }
    card.className = `table-card ${statusClass}`;
    card.style.left = pos.left + '%';
    card.style.top = pos.top + '%';

    const color = getWaiterColor(table.waiter);
    if (color) {
      card.style.background = color;
      card.style.borderColor = color;
      card.style.color = '#fff';
    }

    card.innerHTML = `
      <div class="table-number">${table.id}</div>
      ${table.waiter ? `<div class="table-waiter">${table.waiter.split(' ')[0]}</div>` : ''}
      ${table.total > 0 ? `<div class="table-total">$${Math.round(table.total/1000)}k</div>` : ''}
    `;
    card.addEventListener('click', () => openTable(table.id));
    tablesGrid.appendChild(card);
  });
}

function openTable(id) {
  currentTableId = id;
  const table = state.tables[id];
  currentOrder = JSON.parse(JSON.stringify(table.items || []));
  detailTableNum.textContent = id;
  tableNotes.value = table.notes || '';

  // Botones grandes de mozos
  const buttonsDiv = document.getElementById('waiter-buttons');
  const waiters = state.waiters || [];
  buttonsDiv.innerHTML = `
    <button class="waiter-btn ${!table.waiter ? 'selected' : ''}" data-waiter="">Sin asignar</button>
    ${waiters.map(w => `
      <button class="waiter-btn ${table.waiter === w ? 'selected' : ''}" data-waiter="${w}" style="background:${getWaiterColor(w)}">
        ${w}
      </button>
    `).join('')}
  `;
  buttonsDiv.querySelectorAll('.waiter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      buttonsDiv.querySelectorAll('.waiter-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      // Guardar inmediatamente la asignación
      socket.emit('updateTable', {
        tableId: currentTableId,
        waiter: btn.dataset.waiter,
        items: currentOrder,
        notes: tableNotes.value,
        status: currentOrder.length > 0 ? 'ocupada' : (btn.dataset.waiter ? 'ocupada' : 'libre')
      });
    });
  });

  tablesGrid.classList.add('hidden');
  tableDetail.classList.remove('hidden');
  renderCurrentOrder();
  searchMenu.value = '';
  menuResults.innerHTML = '';
}

document.getElementById('back-to-tables').addEventListener('click', () => {
  showTables();
});

function renderCurrentOrder() {
  if (currentOrder.length === 0) {
    currentOrderEl.innerHTML = '<div class="empty-order">Sin productos aún</div>';
    return;
  }
  let html = '';
  let total = 0;
  currentOrder.forEach((item, idx) => {
    const sub = item.price * item.qty;
    total += sub;
    html += `
      <div class="order-item">
        <span class="qty">${item.qty}x</span>
        <span class="name">${item.name}</span>
        <span class="price">$${sub.toLocaleString('es-AR')}</span>
        <button class="remove" data-idx="${idx}">×</button>
      </div>
    `;
  });
  html += `<div class="order-item" style="border:none;font-weight:700;justify-content:flex-end;">Total: $${total.toLocaleString('es-AR')}</div>`;
  currentOrderEl.innerHTML = html;

  currentOrderEl.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      currentOrder.splice(idx, 1);
      renderCurrentOrder();
    });
  });
}

// Búsqueda de menú
searchMenu.addEventListener('input', () => {
  const q = searchMenu.value.toLowerCase().trim();
  if (q.length < 1) {
    menuResults.innerHTML = '';
    return;
  }
  const filtered = state.menu.filter(m => m.name.toLowerCase().includes(q));
  menuResults.innerHTML = filtered.map(m => `
    <div class="menu-result-item" data-id="${m.id}">
      <div>
        <span class="cat">${m.category}</span>
        ${m.name}
      </div>
      <strong>$${m.price.toLocaleString('es-AR')}</strong>
    </div>
  `).join('') || '<div style="padding:12px;color:#888;">No se encontró</div>';

  menuResults.querySelectorAll('.menu-result-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.id);
      const menuItem = state.menu.find(m => m.id === id);
      if (!menuItem) return;
      const existing = currentOrder.find(i => i.name === menuItem.name && i.price === menuItem.price);
      if (existing) {
        existing.qty++;
      } else {
        currentOrder.push({
          name: menuItem.name,
          price: menuItem.price,
          qty: 1,
          category: menuItem.category
        });
      }
      renderCurrentOrder();
      searchMenu.value = '';
      menuResults.innerHTML = '';
      searchMenu.focus();
    });
  });
});

document.getElementById('save-order').addEventListener('click', () => {
  if (!currentTableId) return;
  const selectedBtn = document.querySelector('#waiter-buttons .waiter-btn.selected');
  const waiter = selectedBtn ? selectedBtn.dataset.waiter : '';
  socket.emit('updateTable', {
    tableId: currentTableId,
    items: currentOrder,
    notes: tableNotes.value,
    waiter: waiter,
    status: currentOrder.length > 0 ? 'ocupada' : (waiter ? 'ocupada' : 'libre')
  });
  alert('Pedido guardado ✓');
  showTables();
});

document.getElementById('close-table').addEventListener('click', () => {
  if (!currentTableId) return;
  if (confirm('¿Cerrar esta mesa y limpiar el pedido?')) {
    socket.emit('closeTable', currentTableId);
    showTables();
  }
});

// ===== CAJA =====
function renderCaja() {
  const active = Object.values(state.tables)
    .filter(t => t.items && t.items.length > 0)
    .sort((a, b) => a.id - b.id);

  if (active.length === 0) {
    cajaList.innerHTML = '<div class="empty-order">No hay pedidos activos</div>';
    cajaSummary.innerHTML = '';
    return;
  }

  let grandTotal = 0;
  cajaList.innerHTML = active.map(table => {
    grandTotal += table.total || 0;
    const itemsHtml = table.items.map(i => 
      `<div>${i.qty}x ${i.name} — $${(i.price * i.qty).toLocaleString('es-AR')}</div>`
    ).join('');
    return `
      <div class="caja-table">
        <h3>Mesa ${table.id} <span style="font-size:0.8rem;font-weight:normal;color:#666;">${table.openedAt ? new Date(table.openedAt).toLocaleTimeString('es-AR', {hour:'2-digit',minute:'2-digit'}) : ''}</span></h3>
        <div class="caja-items">${itemsHtml}</div>
        ${table.notes ? `<div style="margin-top:6px;font-style:italic;color:#555;">📝 ${table.notes}</div>` : ''}
        <div class="caja-total">Total: $${(table.total || 0).toLocaleString('es-AR')}</div>
        <div class="caja-actions">
          <button class="btn primary" onclick="closeFromCaja(${table.id})">Cobrar / Cerrar</button>
        </div>
      </div>
    `;
  }).join('');

  cajaSummary.innerHTML = `Total general de mesas activas: $${grandTotal.toLocaleString('es-AR')}`;
}

window.closeFromCaja = function(id) {
  if (confirm(`¿Cerrar mesa ${id}?`)) {
    socket.emit('closeTable', id);
  }
};

// ===== MENÚ =====
function renderMenu() {
  menuList.innerHTML = state.menu.map(m => `
    <div class="menu-item">
      <div class="info">
        <span class="cat-badge ${m.category}">${m.category}</span>
        <strong>${m.name}</strong>
        <span style="float:right;font-weight:700;">$${m.price.toLocaleString('es-AR')}</span>
      </div>
      <button class="delete-menu" data-id="${m.id}">Eliminar</button>
    </div>
  `).join('') || '<div class="empty-order">No hay productos en el menú</div>';

  menuList.querySelectorAll('.delete-menu').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('¿Eliminar este producto del menú?')) {
        socket.emit('deleteMenuItem', parseInt(btn.dataset.id));
      }
    });
  });
}

document.getElementById('add-menu-item').addEventListener('click', () => {
  const name = document.getElementById('new-item-name').value.trim();
  const category = document.getElementById('new-item-category').value;
  const price = parseFloat(document.getElementById('new-item-price').value) || 0;
  if (!name) {
    alert('Escribí el nombre del producto');
    return;
  }
  socket.emit('addMenuItem', { name, category, price });
  document.getElementById('new-item-name').value = '';
  document.getElementById('new-item-price').value = '';
});

// ===== CONFIG =====
function updateConfig() {
  const input = document.getElementById('tables-count');
  if (input && document.activeElement !== input) {
    input.value = state.tablesCount || 10;
  }
}

document.getElementById('tables-minus').addEventListener('click', () => {
  const input = document.getElementById('tables-count');
  input.value = Math.max(1, parseInt(input.value) - 1);
});

document.getElementById('tables-plus').addEventListener('click', () => {
  const input = document.getElementById('tables-count');
  input.value = Math.min(50, parseInt(input.value) + 1);
});

document.getElementById('apply-tables').addEventListener('click', () => {
  const count = parseInt(document.getElementById('tables-count').value);
  if (count >= 1 && count <= 50) {
    socket.emit('setTablesCount', count);
    alert(`Se configuraron ${count} mesas`);
  }
});

// ===== MOZOS =====
function renderWaiters() {
  const list = document.getElementById('waiters-list');
  if (!list) return;
  list.innerHTML = (state.waiters || []).map(w => `
    <div class="menu-item">
      <div class="info"><strong>${w}</strong></div>
      <button class="delete-menu" data-name="${w}">Eliminar</button>
    </div>
  `).join('') || '<div class="empty-order">No hay mozos cargados</div>';

  list.querySelectorAll('.delete-menu').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('¿Eliminar este mozo?')) {
        socket.emit('deleteWaiter', btn.dataset.name);
      }
    });
  });
}

document.getElementById('add-waiter').addEventListener('click', () => {
  const name = document.getElementById('new-waiter-name').value.trim();
  if (!name) return;
  socket.emit('addWaiter', name);
  document.getElementById('new-waiter-name').value = '';
});

// Actualizar renderAll para incluir waiters
const originalRenderAll = renderAll;
renderAll = function() {
  originalRenderAll();
  if (document.getElementById('view-config')?.classList.contains('active')) {
    renderWaiters();
  }
};

// Inicial
showTables();
if (state.waiters) renderWaiters();
