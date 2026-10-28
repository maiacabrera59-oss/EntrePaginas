const service = require('../services/ventasService');
const { errorHttp, enteroPositivo } = require('../middlewares/validaciones');
async function registrarVenta(req, res) {
    const { IdCliente, Detalle } = req.body || {};
    const idCliente = enteroPositivo(IdCliente, 'IdCliente');
    if (!Array.isArray(Detalle) || Detalle.length === 0) throw errorHttp(400, 'Detalle debe contener al menos un libro.');
    const ids = new Set();
    const detalle = Detalle.map(item => {
        if (!item || typeof item !== 'object') throw errorHttp(400, 'Renglón de venta inválido.');
        const IdLibro = enteroPositivo(item.IdLibro, 'IdLibro');
        const Cantidad = enteroPositivo(item.Cantidad, 'Cantidad');
        if (ids.has(IdLibro)) throw errorHttp(400, 'El libro no puede aparecer repetido.');
        ids.add(IdLibro);
        return { IdLibro, Cantidad };
    });
    const venta = await service.registrarVenta({ idCliente, detalle });
    res.status(201).json(venta);
}
async function cambiarEstadoVenta(req, res) {
    const idVenta = enteroPositivo(req.params.id, 'id');
    const nuevoEstado = req.body?.NuevoEstado;
    if (!['listo', 'entregado', 'cancelado'].includes(nuevoEstado)) throw errorHttp(400, 'NuevoEstado inválido.');
    res.json(await service.cambiarEstadoVenta({ idVenta, nuevoEstado }));
}
module.exports = { registrarVenta, cambiarEstadoVenta };
