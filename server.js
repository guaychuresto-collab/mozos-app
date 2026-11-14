const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Datos iniciales
let state = {
  tablesCount: 10,
  tables: {},
  menu: [
    { id: 1, name: "Coca Cola 500ml", category: "bebida", price: 2500 },
    { id: 2, name: "Agua Mineral", category: "bebida", price: 1500 },
    { id: 3, name: "Cerveza Quilmes", category: "bebida", price: 3000 },
    { id: 4, name: "Milanesa con Papas", category: "comida", price: 8500 },
    { id: 5, name: "Hamburguesa Completa", category: "comida", price: 7500 },
    { id: 6, name: "Ensalada César", category: "comida", price: 6000 },
    { id: 7, name: "Café con Leche", category: "bebida", price: 2000 },
    { id: 8, name: "Tostado de Jamón y Queso", category: "comida", price: 4500 }
  ],
  nextMenuId: 9
};

// Lista fija de mesas según el salón
const SALON_TABLES = [
  1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,
  25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,
  50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67
];

// Inicializar mesas
function initTables() {
  const tables = {};
  SALON_TABLES.forEach(id => {
    tables[id] = {
      id: id,
      status: "libre",
      items: [],
      notes: "",
      openedAt: null,
      total: 0
    };
  });
  return tables;
}

// Cargar o crear datos
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const saved = JSON.parse(raw);
      state = { ...state, ...saved };
      if (!state.tables || Object.keys(state.tables).length === 0) {
        state.tables = initTables();
        state.tablesCount = SALON_TABLES.length;
      }
    } else {
      state.tables = initTables();
      state.tablesCount = SALON_TABLES.length;
      saveData();
    }
  } catch (e) {
    console.log("Error cargando datos, iniciando nuevo:", e.message);
    state.tables = initTables();
    state.tablesCount = SALON_TABLES.length;
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("Error guardando:", e);
  }
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

loadData();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API simple para exportar
app.get('/api/state', (req, res) => {
  res.json(state);
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  socket.emit('state', state);

  socket.on('setTablesCount', (count) => {
    count = parseInt(count);
    if (count < 1 || count > 50) return;
    state.tablesCount = count;
    // Mantener mesas existentes, agregar o quitar
    const newTables = {};
    for (let i = 1; i <= count; i++) {
      if (state.tables[i]) {
        newTables[i] = state.tables[i];
      } else {
        newTables[i] = {
          id: i,
          status: "libre",
          items: [],
          notes: "",
          openedAt: null,
          total: 0
        };
      }
    }
    state.tables = newTables;
    saveData();
    io.emit('state', state);
  });

  socket.on('addMenuItem', (item) => {
    if (!item.name || !item.category) return;
    const newItem = {
      id: state.nextMenuId++,
      name: item.name.trim(),
      category: item.category,
      price: parseFloat(item.price) || 0
    };
    state.menu.push(newItem);
    saveData();
    io.emit('state', state);
  });

  socket.on('deleteMenuItem', (id) => {
    state.menu = state.menu.filter(m => m.id !== id);
    saveData();
    io.emit('state', state);
  });

  socket.on('updateTable', (data) => {
    const { tableId, items, notes, status } = data;
    if (!state.tables[tableId]) return;
    const table = state.tables[tableId];
    if (items !== undefined) {
      table.items = items;
      table.total = calculateTotal(items);
    }
    if (notes !== undefined) table.notes = notes;
    if (status !== undefined) table.status = status;
    if (table.status === 'ocupada' && !table.openedAt) {
      table.openedAt = new Date().toISOString();
    }
    if (table.status === 'libre') {
      table.items = [];
      table.notes = "";
      table.total = 0;
      table.openedAt = null;
    }
    saveData();
    io.emit('state', state);
    io.emit('tableUpdated', { tableId, table });
  });

  socket.on('closeTable', (tableId) => {
    if (!state.tables[tableId]) return;
    const table = state.tables[tableId];
    table.status = 'libre';
    table.items = [];
    table.notes = "";
    table.total = 0;
    table.openedAt = null;
    saveData();
    io.emit('state', state);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  APP PARA MOZOS corriendo!`);
  console.log(`  Abre en el navegador: http://localhost:${PORT}`);
  console.log(`  Desde otros celulares en la misma WiFi:`);
  console.log(`  http://[IP-DE-ESTA-PC]:${PORT}`);
  console.log(`========================================\n`);
});
