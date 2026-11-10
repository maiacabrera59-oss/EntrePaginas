
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const categoriasRoutes = require('./routes/categoriasRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const librosRoutes = require('./routes/librosRoutes');
const gestionRoutes = require('./routes/gestionRoutes');
const ventasRoutes = require('./routes/ventasRoutes');

const logger = require('./middlewares/logger');

const {
    manejadorErrores,
    rutaNoEncontrada
} = require('./middlewares/errores');

const app = express();

// Middlewares
app.use(logger);
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Rutas de la API
app.use('/api/categorias', categoriasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/libros', librosRoutes);
app.use('/api', gestionRoutes);
app.use('/api/ventas', ventasRoutes);

// Archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../../front')));

// Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../front/index.html'));
});

// Manejo de rutas inexistentes
app.use(rutaNoEncontrada);

// Manejo centralizado de errores
app.use(manejadorErrores);

// Inicio del servidor
const puerto = Number(process.env.PORT || 3000);

app.listen(puerto, () => {
    console.log(`Servidor iniciado en http://localhost:${puerto}`);
});
