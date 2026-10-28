const { obtenerConexion, sql } = require('../config/db');
async function listarVentas() {
    const pool = await obtenerConexion();
    const resultado = await pool.request().execute('dbo.usp_ListarVentas');
    return resultado.recordset;
}
async function buscarVentas({ estado, textoCliente, desde, hasta }) {
    const pool = await obtenerConexion();
    const resultado = await pool.request()
        .input('Estado', sql.NVarChar(12), estado ?? null)
        .input('TextoCliente', sql.NVarChar(80), textoCliente ?? null)
        .input('Desde', sql.Date, desde ?? null)
        .input('Hasta', sql.Date, hasta ?? null)
        .execute('dbo.usp_BuscarVentas');
    return resultado.recordset;
}
async function estadisticasVentas() {
    const pool = await obtenerConexion();
    const resultado = await pool.request().execute('dbo.usp_EstadisticasVentas');
    return resultado.recordset;
}
module.exports = { listarVentas, buscarVentas, estadisticasVentas };
