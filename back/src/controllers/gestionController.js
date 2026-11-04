const gestionService = require('../services/gestionService');

async function listarVentas(req, res) {
    const ventas = await gestionService.listarVentas();
    res.json(ventas);
}

async function buscarVentas(req, res) {
    const ventas = await gestionService.buscarVentas(req.datosValidados);
    res.json(ventas);
}

async function estadisticasVentas(req, res) {
    const estadisticas = await gestionService.estadisticasVentas();
    res.json(estadisticas);
}

module.exports = {
    listarVentas,
    buscarVentas,
    estadisticasVentas
};

