
const gestionService = require('../services/gestionService');

async function listarVentas(req, res) {
    const ventas = await gestionService.listarVentas();
    return res.json(ventas);
}

async function buscarVentas(req, res) {
    const ventas = await gestionService.buscarVentas(req.datosValidados);
    return res.json(ventas);
}

async function estadisticasVentas(req, res) {
    const estadisticas = await gestionService.estadisticasVentas();
    return res.json(estadisticas);
}

module.exports = {
    listarVentas,
    buscarVentas,
    estadisticasVentas
};
