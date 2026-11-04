const librosService = require('../services/librosService');

async function listarLibros(req, res) {
    const libros = await librosService.listarLibros();
    res.json(libros);
}

async function buscarLibros(req, res) {
    const libros = await librosService.buscarLibros(req.datosValidados);
    res.json(libros);
}

module.exports = {
    listarLibros,
    buscarLibros
};
