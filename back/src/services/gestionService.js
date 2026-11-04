
const { obtenerConexion, sql } = require('../config/db');

async function listarVentas() {
    const pool = await obtenerConexion();

    const resultado = await pool.request()
        .execute('dbo.usp_ListarVentas');

    return resultado.recordset;
}

async function buscarVentas({ estado, textoCliente, desde, hasta }) {
    const pool = await obtenerConexion();

    const resultado = await pool.request()
        .input('Estado', sql.NVarChar(12), estado)
        .input('TextoCliente', sql.NVarChar(80), textoCliente)
        .input('Desde', sql.Date, desde)
        .input('Hasta', sql.Date, hasta)
        .execute('dbo.usp_BuscarVentas');

    return resultado.recordset;
}

async function estadisticasVentas() {
    const pool = await obtenerConexion();

    const resultado = await pool.request()
        .execute('dbo.usp_EstadisticasVentas');

    return resultado.recordset;
}

module.exports = {
    listarVentas,
    buscarVentas,
    estadisticasVentas
};
