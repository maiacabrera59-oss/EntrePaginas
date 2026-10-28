const { obtenerConexion } = require('../config/db');
async function listarClientes() {
    const pool = await obtenerConexion();
    const resultado = await pool.request().execute('dbo.usp_ListarClientes');
    return resultado.recordset;
}
module.exports = { listarClientes };
