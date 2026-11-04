const ventasService = require('../services/ventasService');

async function registrarVenta(req, res) {
    const venta = await ventasService.registrarVenta(req.datosValidados);
    res.status(201).json(venta);
}

async function cambiarEstadoVenta(req, res) {
    const venta = await ventasService.cambiarEstadoVenta(req.datosValidados);
    res.json(venta);
}

module.exports = {
    registrarVenta,
    cambiarEstadoVenta
};
