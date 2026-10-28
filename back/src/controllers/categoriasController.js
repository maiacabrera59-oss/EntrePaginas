const categoriasService = require('../services/categoriasService');

async function listarCategorias(req, res) {
    const categorias = await categoriasService.listarCategorias();
    res.json(categorias);
}

module.exports = { listarCategorias };
