const { obtenerConexion, sql } = require('../config/db');
async function listarLibros() {
    const pool = await obtenerConexion();
    const resultado = await pool.request().execute('dbo.usp_ListarLibros');
    return resultado.recordset;
}
async function buscarLibros({ texto, idCategoria, soloConStock }) {
    const pool = await obtenerConexion();
    const resultado = await pool.request()
        .input('Texto', sql.NVarChar(80), texto ?? null)
        .input('IdCategoria', sql.Int, idCategoria ?? null)
        .input('SoloConStock', sql.Bit, soloConStock ?? null)
        .execute('dbo.usp_BuscarLibros');
    return resultado.recordset;
}
module.exports = { listarLibros, buscarLibros };
