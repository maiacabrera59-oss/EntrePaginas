require('dotenv').config();

const express = require('express');
const path = require('path');

const categoriasRoutes = require('./routes/categoriasRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const librosRoutes = require('./routes/librosRoutes');
const gestionRoutes = require('./routes/gestionRoutes');
const ventasRoutes = require('./routes/ventasRoutes');

const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errores');

const app = express();

app.use(logger);
app.use(express.json({ limit: '100kb' }));

app.use('/api/categorias', categoriasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/libros', librosRoutes);
app.use('/api', gestionRoutes);
app.use('/api/ventas', ventasRoutes);

//app.use(express.static(path.join(__dirname, '../../front')));

app.use((req, res) => {
    res.status(404).json({
        mensaje: 'Ruta no encontrada.'
    });
});

app.use(errorHandler);

const puerto = Number(process.env.PORT || 3000);

app.listen(puerto, () => {
    console.log(`Servidor iniciado en http://localhost:${puerto}`);
});
