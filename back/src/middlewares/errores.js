
const fs = require("fs");
const path = require("path");

const NO_EXISTE = [50002, 50007, 50010];

const CARPETA_LOGS = path.join(__dirname, "../../logs");
const ARCHIVO_ERRORES = path.join(CARPETA_LOGS, "errores.log");

function errorHttp(estado, mensaje) {
    const error = new Error(mensaje);
    error.status = estado;
    return error;
}

function registrarError(error, req) {
    const numero = Number(
        error.originalError?.info?.number ?? error.number
    );

    const linea = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
        + ` -> ${numero || "sin código"} | ${error.message}\n`;

    try {
        fs.mkdirSync(CARPETA_LOGS, { recursive: true });
        fs.appendFileSync(ARCHIVO_ERRORES, linea);
    } catch (errorDeLog) {
        console.error("No se pudo escribir el log:", errorDeLog.message);
    }
}

function enteroPositivo(valor, campo) {
    const numero = Number(valor);

    if (
        valor === undefined ||
        valor === null ||
        typeof valor === "boolean" ||
        (typeof valor !== "string" && typeof valor !== "number") ||
        (typeof valor === "string" && !/^\d+$/.test(valor)) ||
        !Number.isSafeInteger(numero) ||
        numero <= 0 ||
        numero > 2147483647
    ) {
        throw errorHttp(400, `${campo} debe ser un entero positivo.`);
    }

    return numero;
}

function textoOpcional(valor, campo, maximo) {
    if (valor === undefined || valor === "") {
        return null;
    }

    if (typeof valor !== "string" || valor.length > maximo) {
        throw errorHttp(400, `${campo} no es válido.`);
    }

    return valor;
}

function fechaOpcional(valor, campo) {
    if (valor === undefined || valor === "") {
        return null;
    }

    if (
        typeof valor !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(valor)
    ) {
        throw errorHttp(400, `${campo} debe tener formato AAAA-MM-DD.`);
    }

    const fecha = new Date(`${valor}T00:00:00Z`);

    if (
        Number.isNaN(fecha.getTime()) ||
        fecha.toISOString().slice(0, 10) !== valor ||
        Number(valor.slice(0, 4)) < 1
    ) {
        throw errorHttp(400, `${campo} no es una fecha válida.`);
    }

    return valor;
}

function validarBusquedaVentas(req, res, next) {
    const { estado, textoCliente, desde, hasta } = req.query;

    const estados = [
        "preparación",
        "listo",
        "entregado",
        "cancelado"
    ];

    if (
        estado !== undefined &&
        estado !== "" &&
        (typeof estado !== "string" || !estados.includes(estado))
    ) {
        throw errorHttp(400, "El estado de venta no es válido.");
    }

    req.datosValidados = {
        estado: estado || null,
        textoCliente: textoOpcional(textoCliente, "textoCliente", 80),
        desde: fechaOpcional(desde, "desde"),
        hasta: fechaOpcional(hasta, "hasta")
    };

    next();
}

// Validación de búsqueda de libros
function validarBusquedaLibros(req, res, next) {
    const { texto, idCategoria, soloConStock } = req.query;

    let categoria = null;
    let stock = null;

    if (idCategoria !== undefined && idCategoria !== "") {
        categoria = enteroPositivo(idCategoria, "idCategoria");
    }

    if (soloConStock !== undefined && soloConStock !== "") {
        if (soloConStock !== "true" && soloConStock !== "false") {
            throw errorHttp(400, "soloConStock debe ser true o false.");
        }

        stock = soloConStock === "true";
    }

    req.datosValidados = {
        texto: textoOpcional(texto, "texto", 80),
        idCategoria: categoria,
        soloConStock: stock
    };

    next();
}

function validarRegistroVenta(req, res, next) {
    const { IdCliente, Detalle } = req.body || {};

    const idCliente = enteroPositivo(IdCliente, "IdCliente");

    if (!Array.isArray(Detalle)) {
        throw errorHttp(400, "Detalle debe ser un arreglo de libros.");
    }

    const detalle = Detalle.map(item => {
        if (
            item === null ||
            typeof item !== "object" ||
            Array.isArray(item)
        ) {
            throw errorHttp(400, "El detalle contiene un renglón inválido.");
        }

        return {
            IdLibro: enteroPositivo(item.IdLibro, "IdLibro"),
            Cantidad: enteroPositivo(item.Cantidad, "Cantidad")
        };
    });

    req.datosValidados = {
        idCliente,
        detalle
    };

    next();
}

function validarCambioEstado(req, res, next) {
    const idVenta = enteroPositivo(req.params.id, "IdVenta");
    const nuevoEstado = req.body?.NuevoEstado;

    if (!["listo", "entregado", "cancelado"].includes(nuevoEstado)) {
        throw errorHttp(400, "El nuevo estado no es válido.");
    }

    req.datosValidados = {
        idVenta,
        nuevoEstado
    };

    next();
}

function manejadorErrores(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    registrarError(error, req);

    console.error(error);

    const numero = Number(
        error.originalError?.info?.number ?? error.number
    );

    let estado = Number(error.status || error.statusCode);

    if (!Number.isInteger(estado) || estado < 400 || estado > 599) {
        if (NO_EXISTE.includes(numero)) {
            estado = 404;
        } else if (numero >= 50001 && numero <= 50012) {
            estado = 400;
        } else if (numero === 50020) {
            estado = 500;
        } else if ([2601, 2627, 547].includes(numero)) {
            estado = 409;
        } else if (error.type === "entity.parse.failed") {
            estado = 400;
        } else if (error.type === "entity.too.large") {
            estado = 413;
        } else {
            estado = 500;
        }
    }

    let mensaje = error.message;

    if (estado === 500) {
        mensaje = "Error interno del servidor.";
    } else if (error.type === "entity.parse.failed") {
        mensaje = "El cuerpo de la solicitud debe contener un JSON válido.";
    } else if (error.type === "entity.too.large") {
        mensaje = "El cuerpo de la solicitud supera el tamaño permitido.";
    } else if ([2601, 2627, 547].includes(numero)) {
        mensaje = "La operación no cumple las restricciones de la base de datos.";
    }

    return res.status(estado).json({ mensaje });
}

function rutaNoEncontrada(req, res) {
    res.status(404).json({
        mensaje: `No existe la ruta ${req.method} ${req.originalUrl}.`
    });
}

module.exports = {
    validarBusquedaLibros,
    validarBusquedaVentas,
    validarRegistroVenta,
    validarCambioEstado,
    manejadorErrores,
    rutaNoEncontrada
};
