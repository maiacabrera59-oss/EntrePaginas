const { obtenerConexion, sql } = require('../config/db');
async function registrarVenta({ idCliente, detalle }) {
    const pool = await obtenerConexion();
    const resultado = await pool.request()
        .input('IdCliente', sql.Int, idCliente)
        .input('DetalleJson', sql.NVarChar(sql.MAX), JSON.stringify(detalle))
        .output('IdVenta', sql.Int)
        .execute('dbo.usp_RegistrarVenta');
    return { IdVenta: resultado.output.IdVenta };
}
async function cambiarEstadoVenta({ idVenta, nuevoEstado }) {
    const pool = await obtenerConexion();
    await pool.request()
        .input('IdVenta', sql.Int, idVenta)
        .input('NuevoEstado', sql.NVarChar(12), nuevoEstado)
        .execute('dbo.usp_CambiarEstadoVenta');
    return { IdVenta: idVenta, Estado: nuevoEstado };
}
module.exports = { registrarVenta, cambiarEstadoVenta };
