const express = require('express');
const db = require('./database');

const app = express();
const port = process.env.PORT || 3000;

// middleware para reportes (log simple en consola)
app.use((req, res, next) => {
  const time = new Date().toISOString();
  console.log(`[${time}] consulta a la ruta: ${req.method} ${req.originalUrl}`);
  // aquí podría escribirse a un fichero o una tabla de informes
  next();
});

// ruta GET /joyas con paginación, orden y HATEOAS
app.get('/joyas', async (req, res) => {
  try {
    const limits = parseInt(req.query.limits, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const order_by = req.query.order_by || 'id_ASC';

    // descomponer order_by (columna_dirección)
    let [column, direction] = order_by.split('_');
    direction = direction && direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const offset = (page - 1) * limits;

    // contar totales para HATEOAS
    db.get('SELECT COUNT(*) AS total FROM joyas', (err, countRow) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error de base de datos' });
      }

      const total = countRow.total;
      const totalPages = Math.ceil(total / limits);

      const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
      const makeLink = (p) =>
        `${baseUrl}?limits=${limits}&page=${p}&order_by=${order_by}`;

      const links = {
        self: makeLink(page),
        first: makeLink(1),
        last: makeLink(totalPages),
      };
      if (page > 1) links.prev = makeLink(page - 1);
      if (page < totalPages) links.next = makeLink(page + 1);

      db.all(
        `SELECT * FROM joyas ORDER BY ${column} ${direction} LIMIT ? OFFSET ?`,
        [limits, offset],
        (err2, rows) => {
          if (err2) {
            console.error(err2);
            return res.status(500).json({ error: 'Error de base de datos' });
          }

          res.json({
            _links: links,
            page,
            totalPages,
            total,
            data: rows,
          });
        }
      );
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ruta GET /joyas/filtros con parámetros en query
app.get('/joyas/filtros', async (req, res) => {
  try {
    const { precio_max, precio_min, categoria, metal } = req.query;

    const conditions = [];
    const params = [];

    if (precio_min) {
      conditions.push('precio >= ?');
      params.push(precio_min);
    }
    if (precio_max) {
      conditions.push('precio <= ?');
      params.push(precio_max);
    }
    if (categoria) {
      conditions.push('categoria = ?');
      params.push(categoria);
    }
    if (metal) {
      conditions.push('metal = ?');
      params.push(metal);
    }

    let sql = 'SELECT * FROM joyas';
    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error de base de datos' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// arranca el servidor
app.listen(port, () => {
  console.log(`API de joyas escuchando en http://localhost:${port}`);
});
