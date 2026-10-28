const service = require('../services/clientesService');
async function listarClientes(req, res) {
    res.json(await service.listarClientes());
}
module.exports = { listarClientes };
