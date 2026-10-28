const service = require('../services/gestionService');
const { errorHttp } = require('../middlewares/validaciones');
function fechaValida(valor) {
    if (valor === undefined || valor === '') return null;
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw errorHttp(400, 'Las fechas deben tener formato AAAA-MM-DD.');
    const fecha = new Date(valor + 'T00:00:00Z');
    if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0,10) !== valor) throw errorHttp(400, 'La fecha indicada no existe.');
    return valor;
}
async function listarVentas(req, res) {
    res.json(await service.listarVentas());
}
async function buscarVentas(req, res) {
    const { estado, textoCliente, desde, hasta } = req.query;
    if (estado && !['preparación','listo','entregado','cancelado'].includes(estado)) throw errorHttp(400, 'Estado de venta inválido.');
    if (textoCliente !== undefined && (typeof textoCliente !== 'string' || textoCliente.length > 80)) throw errorHttp(400, 'Filtro de cliente inválido.');
    res.json(await service.buscarVentas({
        estado: estado || null,
        textoCliente: textoCliente || null,
        desde: fechaValida(desde),
        hasta: fechaValida(hasta)
    }));
}
async function estadisticasVentas(req, res) {
    res.json(await service.estadisticasVentas());
}
module.exports = { listarVentas, buscarVentas, estadisticasVentas };
