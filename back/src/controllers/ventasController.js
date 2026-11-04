
const ventasService = require('../services/ventasService');

async function obtenerVentas(req, res) {
    const ventas = await ventasService.obtenerVentas(req.datosValidados);
    return res.json(ventas);
}

async function registrarVenta(req, res) {
    const venta = await ventasService.registrarVenta(req.datosValidados);
    return res.status(201).json(venta);
}

async function cambiarEstadoVenta(req, res) {
    const venta = await ventasService.cambiarEstadoVenta(req.datosValidados);
    return res.json(venta);
}

module.exports = {
    obtenerVentas,
    registrarVenta,
    cambiarEstadoVenta
};
