
import * as api from './api.js';
import { escapar, mensaje } from './comun.js';
import { tarjetaLibro } from './componentes/tarjetaLibro.js';
import { resumenVenta } from './componentes/resumenVenta.js';

// El pedido solo guarda identificadores y cantidades.
let detalle = [], libros = [], visibles = [], enviando = false, secuencia = 0;

const catalogo = document.querySelector('#catalogo');
const cliente = document.querySelector('#cliente');
const registrar = document.querySelector('#registrar');
const formulario = document.querySelector('#filtros');
const buscador = document.querySelector('#buscarLibro');
const sugerencias = document.querySelector('#sugerenciasLibros');

function pintar() {
    catalogo.innerHTML = visibles.map(l =>
        tarjetaLibro(
            l,
            detalle.find(d => d.IdLibro === l.IdLibro)?.Cantidad || 0
        )
    ).join('') || '<p class="empty">No encontramos libros con esos filtros.</p>';

    document.querySelector('#cantidad').textContent = `${visibles.length} títulos`;
    document.querySelector('#resumen').innerHTML = resumenVenta(detalle, libros);

    registrar.disabled = enviando || !detalle.length || !cliente.value;
    registrar.textContent = enviando ? 'Registrando…' : 'Registrar venta ↗';
}

// Carga inicial de libros, categorías y clientes.
async function cargar() {
    try {
        const [catalogoCompleto, categorias, clientes] = await Promise.all([
            api.listarLibros(),
            api.listarCategorias(),
            api.listarClientes()
        ]);

        libros = catalogoCompleto;
        visibles = libros;

        document.querySelector('#categorias').innerHTML =
            '<option value="">Todas las categorías</option>' +
            categorias.map(c =>
                `<option value="${Number(c.IdCategoria)}">${escapar(c.Nombre)}</option>`
            ).join('');

        cliente.innerHTML =
            '<option value="">Seleccioná un cliente</option>' +
            clientes.map(c =>
                `<option value="${Number(c.IdCliente)}">${escapar(c.Apellido)}, ${escapar(c.Nombre)} · ${escapar(c.DNI)}</option>`
            ).join('');

        pintar();

    } catch (error) {
        catalogo.innerHTML = `
            <div class="empty">
                <h3>No pudimos cargar el catálogo</h3>
                <p>Verificá que el servidor y la base de datos estén disponibles.</p>
                <button class="button secondary" id="reintentar">Reintentar</button>
            </div>
        `;

        mensaje(error.message, true);
    }
}

// Muestra sugerencias mientras se escribe.
function mostrarSugerencias(texto) {
    const busqueda = texto.trim().toLowerCase();

    if (busqueda.length < 2) {
        sugerencias.innerHTML = '';
        sugerencias.hidden = true;
        return;
    }

    const coincidencias = libros.filter(libro => {
        const contenido = [
            libro.Titulo,
            libro.Autor,
            libro.Categoria,
            libro.Editorial,
            libro.IdLibro
        ].join(' ').toLowerCase();

        return contenido.includes(busqueda);
    }).slice(0, 8);

    if (!coincidencias.length) {
        sugerencias.innerHTML =
            '<div class="suggestion-empty">No encontramos coincidencias.</div>';

        sugerencias.hidden = false;
        return;
    }

    sugerencias.innerHTML = coincidencias.map(libro => `
        <button
            type="button"
            class="suggestion-item"
            role="option"
            data-sugerencia="${Number(libro.IdLibro)}"
        >
            <span>
                <strong>${escapar(libro.Titulo)}</strong>
                <small>${escapar(libro.Autor)} · ${escapar(libro.Categoria)}</small>
            </span>
        </button>
    `).join('');

    sugerencias.hidden = false;
}

// Autocompletado al escribir.
buscador.addEventListener('input', () => {
    mostrarSugerencias(buscador.value);
});

// Seleccionar una sugerencia.
sugerencias.addEventListener('click', event => {
    const opcion = event.target.closest('[data-sugerencia]');

    if (!opcion) return;

    const libro = libros.find(
        l => l.IdLibro === Number(opcion.dataset.sugerencia)
    );

    if (!libro) return;

    buscador.value = libro.Titulo;
    sugerencias.hidden = true;

    formulario.requestSubmit();
});

// Cerrar sugerencias al hacer clic fuera del buscador.
document.addEventListener('click', event => {
    if (!event.target.closest('.search')) {
        sugerencias.hidden = true;
    }
});

// Aplicar filtros del catálogo.
formulario.addEventListener('submit', async event => {
    event.preventDefault();

    const actual = ++secuencia;

    sugerencias.hidden = true;
    catalogo.setAttribute('aria-busy', 'true');

    const filtros = Object.fromEntries(new FormData(formulario));

    try {
        const resultado = await api.buscarLibros(filtros);

        if (actual === secuencia) {
            visibles = resultado;
            pintar();
            mensaje('');
        }

    } catch (error) {
        if (actual === secuencia) {
            mensaje(error.message, true);
        }

    } finally {
        if (actual === secuencia) {
            catalogo.removeAttribute('aria-busy');
        }
    }
});

// Limpiar los filtros y mostrar nuevamente todos los libros.
formulario.addEventListener('reset', () => {
    ++secuencia;

    sugerencias.innerHTML = '';
    sugerencias.hidden = true;

    mensaje('');

    visibles = libros;
    pintar();

    catalogo.removeAttribute('aria-busy');
});

// Agregar, modificar o quitar libros de la venta.
document.addEventListener('click', event => {
    if (event.target.closest('#reintentar')) {
        cargar();
        return;
    }

    if (enviando) return;

    const boton = event.target.closest('[data-add], [data-delta], [data-remove]');

    if (!boton) return;

    const id = Number(
        boton.dataset.add || boton.dataset.id || boton.dataset.remove
    );

    const libro = libros.find(l => l.IdLibro === id);
    const previo = detalle.find(d => d.IdLibro === id)?.Cantidad || 0;

    const cantidad = boton.dataset.remove
        ? 0
        : previo + Number(boton.dataset.delta || 1);

    if (cantidad > (libro?.Stock ?? 0)) {
        mensaje('No hay más stock disponible de ese libro.', true);
        return;
    }

    detalle = [
        ...detalle.filter(d => d.IdLibro !== id),
        ...(cantidad > 0 ? [{ IdLibro: id, Cantidad: cantidad }] : [])
    ];

    pintar();
});

cliente.addEventListener('change', pintar);

// Registrar venta.
registrar.addEventListener('click', async () => {
    if (enviando || !detalle.length || !cliente.value) return;

    enviando = true;
    cliente.disabled = true;
    pintar();

    try {
        const venta = await api.registrarVenta(
            Number(cliente.value),
            detalle
        );

        detalle = [];
        cliente.value = '';

        mensaje(
            `Venta #${venta.IdVenta} registrada correctamente. Podés consultar su importe y estado en Gestión de ventas.`
        );

        try {
            libros = await api.listarLibros();

            visibles = await api.buscarLibros(
                Object.fromEntries(new FormData(formulario))
            );

        } catch {
            visibles = [];

            mensaje(
                `Venta #${venta.IdVenta} registrada. Actualizá la página para consultar el stock actualizado.`
            );
        }

    } catch (error) {
        mensaje(error.message, true);

    } finally {
        enviando = false;
        cliente.disabled = false;
        pintar();
    }
});

document.querySelector('#resumen').innerHTML = resumenVenta(detalle, libros);

cargar();
