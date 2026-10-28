const { obtenerConexion } = require('../config/db');

async function listarCategorias() {
    const pool = await obtenerConexion();
    const resultado = await pool.request().execute('dbo.usp_ListarCategorias');
    return resultado.recordset;
}

module.exports = { listarCategorias };
