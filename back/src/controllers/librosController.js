const service = require('../services/librosService');
const { errorHttp, enteroPositivo } = require('../middlewares/validaciones');
async function listarLibros(req, res) {
    res.json(await service.listarLibros());
}
async function buscarLibros(req, res) {
    const { texto, idCategoria, soloConStock } = req.query;
    const categoria = idCategoria === undefined || idCategoria === '' ? null : enteroPositivo(idCategoria, 'idCategoria');
    if (texto !== undefined && (typeof texto !== 'string' || texto.length > 80)) throw errorHttp(400, 'El texto de búsqueda no es válido.');
    if (soloConStock !== undefined && !['true','false','1','0'].includes(soloConStock)) throw errorHttp(400, 'soloConStock debe ser true o false.');
    res.json(await service.buscarLibros({
        texto: texto || null,
        idCategoria: categoria,
        soloConStock: soloConStock === undefined ? null : ['true','1'].includes(soloConStock)
    }));
}
module.exports = { listarLibros, buscarLibros };
