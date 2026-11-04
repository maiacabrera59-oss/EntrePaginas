const fs = require("fs");
const path = require("path");

const CARPETA_LOGS = path.join(__dirname, "../../logs");
const ARCHIVO_ACCESO = path.join(CARPETA_LOGS, "acceso.log");

function logger(req, res, next) {
  const inicio = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - inicio;
    const linea = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
      + ` -> ${res.statusCode} (${ms} ms)`;

    console.log(linea);

    try {
      if (!fs.existsSync(CARPETA_LOGS)) {
        fs.mkdirSync(CARPETA_LOGS);
      }
      fs.appendFileSync(ARCHIVO_ACCESO, linea + "\n");
    } catch (errorDeLog) {
      console.error("No se pudo escribir el log:", errorDeLog.message);
    }
  });

  next();
}

module.exports = logger;