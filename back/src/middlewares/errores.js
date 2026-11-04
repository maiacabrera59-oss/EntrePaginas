const fs = require("fs");
const path = require("path");


const NO_EXISTE = [50017, 50018, 50022, 50024];

const CARPETA_LOGS = path.join(__dirname, "../../logs");
const ARCHIVO_ERRORES = path.join(CARPETA_LOGS, "errores.log");

const MAX_TAMANO = 1024 * 1024; // 1 MB


function rotarLogSiEsNecesario() {
    if (!fs.existsSync(ARCHIVO_ERRORES)) {
        return;
    }

    const estadisticas = fs.statSync(ARCHIVO_ERRORES);

    if (estadisticas.size < MAX_TAMANO) {
        return;
    }

    const fecha = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\..+/, "");

    const nuevoNombre = path.join(
        CARPETA_LOGS,
        `errores-${fecha}.log`
    );

    fs.renameSync(ARCHIVO_ERRORES, nuevoNombre);
}


function registrarError(error, req) {
    const linea = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
        + ` -> ${error.number || "sin código"} | ${error.message}\n`;

    try {
        if (!fs.existsSync(CARPETA_LOGS)) {
            fs.mkdirSync(CARPETA_LOGS);
        }

        rotarLogSiEsNecesario();

        fs.appendFileSync(ARCHIVO_ERRORES, linea);
    } catch (errorDeLog) {

        console.error("No se pudo escribir el log:", errorDeLog.message);
    }
}


function manejadorErrores(err, req, res, next) {
    registrarError(err, req);


    if (NO_EXISTE.includes(err.number)) {
        return res.status(404).json({ mensaje: err.message });
    }


    if (err.number >= 50000) {
        return res.status(400).json({ mensaje: err.message });
    }


    console.error("Error inesperado:", err);
    return res.status(500).json({ mensaje: "Error interno del servidor." });
}


function rutaNoEncontrada(req, res) {
    res.status(404).json({ mensaje: `No existe la ruta ${req.method} ${req.originalUrl}.` });
}

module.exports = { manejadorErrores, rutaNoEncontrada };