const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// use a file in the project root
const dbPath = path.join(__dirname, 'joyas.db');
const db = new sqlite3.Database(dbPath);

// inicializa la tabla y algunos registros de ejemplo si no existen
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS joyas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      precio REAL,
      stock INTEGER,
      categoria TEXT,
      metal TEXT
    )
  `);

  // crear tabla clientes y cargar datos de clientes.sql si existe
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      email TEXT
    )
  `);
  const fs = require('fs');
  const clientesSqlPath = path.join(__dirname, 'clientes.sql');
  if (fs.existsSync(clientesSqlPath)) {
    const sqlCommands = fs.readFileSync(clientesSqlPath, 'utf-8');
    db.exec(sqlCommands, (err) => {
      if (err) console.error('Error cargando clientes.sql:', err);
    });
  }

  db.get('SELECT COUNT(*) AS cnt FROM joyas', (err, row) => {
    if (err) {
      console.error('Error comprobando joyas:', err);
      return;
    }
    if (row.cnt === 0) {
      const stmt = db.prepare(
        'INSERT INTO joyas (nombre, precio, stock, categoria, metal) VALUES (?, ?, ?, ?, ?)' 
      );
      stmt.run('Collar Oro', 300.0, 10, 'Collares', 'oro');
      stmt.run('Anillo Plata', 100.0, 25, 'Anillos', 'plata');
      stmt.run('Pulsera Oro', 200.0, 5, 'Pulseras', 'oro');
      stmt.run('Arete Diamante', 1500.0, 2, 'Aretes', 'oro');
      stmt.finalize();
    }
  });
});

module.exports = db;
