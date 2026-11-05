
import * as api from './api.js';

import {
    escapar,
    mensaje,
    marcarPaginaActiva
} from './componentes/comun.js';

import { tarjetaLibro } from './componentes/tarjetaLibro.js';
import { resumenVenta } from './componentes/resumenVenta.js';
import { filaVenta } from './componentes/filaVenta.js';
import { filaEstadistica } from './componentes/filaEstadistica.js';

// Identificamos la página actual y marcamos su opción en el menú.
marcarPaginaActiva();

const pagina = document.body.dataset.page;

// Iniciamos solamente las funciones de la página que está abierta.
if (pagina === 'venta') iniciarVenta();
if (pagina === 'tablero') iniciarTablero();
if (pagina === 'estadisticas') iniciarEstadisticas();


// ==================================================
// SECCIÓN 1: NUEVA VENTA
// ==================================================

function iniciarVenta() {

    // Variables que guardan los libros, el pedido y el estado de la venta.
    let detalle = [];
    let libros = [];
    let visibles = [];
    let enviando = false;
    let secuencia = 0;

    // Obtenemos los elementos del HTML que utiliza esta pantalla.
    const catalogo = document.querySelector('#catalogo');
    const cliente = document.querySelector('#cliente');
    const registrar = document.querySelector('#registrar');
    const formulario = document.querySelector('#filtros');
    const buscador = document.querySelector('#buscarLibro');
    const sugerencias = document.querySelector('#sugerenciasLibros');

    // Actualiza el catálogo, el resumen del pedido y el botón de registro.
    function pintar() {

        catalogo.innerHTML = visibles.map(libro =>
            tarjetaLibro(
                libro,
                detalle.find(d => d.IdLibro === libro.IdLibro)?.Cantidad || 0
            )
        ).join('') || '<p class="empty">No encontramos libros con esos filtros.</p>';

        document.querySelector('#cantidad').textContent =
            `${visibles.length} títulos`;

        document.querySelector('#resumen').innerHTML =
            resumenVenta(detalle, libros);

        // El botón solamente se habilita si hay cliente y libros seleccionados.
        registrar.disabled =
            enviando || !detalle.length || !cliente.value;

        registrar.textContent =
            enviando ? 'Registrando…' : 'Registrar venta ↗';
    }

    // Carga libros, categorías y clientes desde el backend.
    async function cargar() {

        try {

            // Las tres consultas son independientes, por eso se ejecutan en paralelo.
            const [catalogoCompleto, categorias, clientes] =
                await Promise.all([
                    api.listarLibros(),
                    api.listarCategorias(),
                    api.listarClientes()
                ]);

            libros = catalogoCompleto;
            visibles = libros;

            // Completamos el selector de categorías.
            document.querySelector('#categorias').innerHTML =
                '<option value="">Todas las categorías</option>' +
                categorias.map(c =>
                    `<option value="${Number(c.IdCategoria)}">${escapar(c.Nombre)}</option>`
                ).join('');

            // Completamos el selector de clientes.
            cliente.innerHTML =
                '<option value="">Seleccioná un cliente</option>' +
                clientes.map(c =>
                    `<option value="${Number(c.IdCliente)}">${escapar(c.Apellido)}, ${escapar(c.Nombre)} · ${escapar(c.DNI)}</option>`
                ).join('');

            pintar();

        } catch (error) {

            // Si el backend no responde, mostramos un mensaje y un botón para reintentar.
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

    // Busca coincidencias mientras el usuario escribe el nombre de un libro.
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

        // Si no hay resultados, informamos al usuario.
        if (!coincidencias.length) {

            sugerencias.innerHTML =
                '<div class="suggestion-empty">No encontramos coincidencias.</div>';

            sugerencias.hidden = false;
            return;
        }

        // Generamos las opciones de autocompletado.
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

    // Cada vez que se escribe, actualizamos las sugerencias.
    buscador.addEventListener('input', () => {
        mostrarSugerencias(buscador.value);
    });

    // Permite seleccionar un libro sugerido.
    sugerencias.addEventListener('click', event => {

        const opcion = event.target.closest('[data-sugerencia]');

        if (!opcion) return;

        const libro = libros.find(
            l => l.IdLibro === Number(opcion.dataset.sugerencia)
        );

        if (!libro) return;

        buscador.value = libro.Titulo;
        sugerencias.hidden = true;

        // Ejecuta el formulario de búsqueda con el libro seleccionado.
        formulario.requestSubmit();
    });

    // Oculta las sugerencias cuando se hace clic fuera del buscador.
    document.addEventListener('click', event => {

        if (!event.target.closest('.search')) {
            sugerencias.hidden = true;
        }
    });

    // Aplica los filtros de búsqueda de libros.
    formulario.addEventListener('submit', async event => {

        event.preventDefault();

        const actual = ++secuencia;

        sugerencias.hidden = true;
        catalogo.setAttribute('aria-busy', 'true');

        const filtros = Object.fromEntries(new FormData(formulario));

        try {

            const resultado = await api.buscarLibros(filtros);

            // Evitamos que una búsqueda anterior reemplace a otra más reciente.
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

    // Limpia los filtros y vuelve a mostrar todos los libros.
    formulario.addEventListener('reset', () => {

        ++secuencia;

        sugerencias.innerHTML = '';
        sugerencias.hidden = true;

        mensaje('');

        visibles = libros;
        pintar();

        catalogo.removeAttribute('aria-busy');
    });

    // Gestiona los botones para agregar, sumar, restar o quitar libros.
    document.addEventListener('click', event => {

        // Permite volver a cargar el catálogo si ocurrió un error.
        if (event.target.closest('#reintentar')) {
            cargar();
            return;
        }

        if (enviando) return;

        const boton = event.target.closest(
            '[data-add], [data-delta], [data-remove]'
        );

        if (!boton) return;

        const id = Number(
            boton.dataset.add ||
            boton.dataset.id ||
            boton.dataset.remove
        );

        const libro = libros.find(l => l.IdLibro === id);

        if (!libro) return;

        const previo =
            detalle.find(d => d.IdLibro === id)?.Cantidad || 0;

        // Calculamos la nueva cantidad del libro en el pedido.
        const cantidad = boton.hasAttribute('data-remove')
            ? 0
            : previo + Number(boton.dataset.delta || 1);

        // No permitimos agregar más unidades que las disponibles.
        if (cantidad > libro.Stock) {
            mensaje('No hay más stock disponible de ese libro.', true);
            return;
        }

        // Actualizamos el detalle de la venta.
        detalle = [
            ...detalle.filter(d => d.IdLibro !== id),
            ...(cantidad > 0 ? [{ IdLibro: id, Cantidad: cantidad }] : [])
        ];

        pintar();
    });

    // Actualiza el botón cuando se selecciona otro cliente.
    cliente.addEventListener('change', pintar);

    // Registra una nueva venta mediante la API.
    registrar.addEventListener('click', async () => {

        if (enviando || !detalle.length || !cliente.value) return;

        enviando = true;
        cliente.disabled = true;
        pintar();

        try {

            // Enviamos el cliente y los libros seleccionados al backend.
            const venta = await api.registrarVenta(
                Number(cliente.value),
                detalle
            );

            // Limpiamos el pedido una vez registrada la venta.
            detalle = [];
            cliente.value = '';

            mensaje(
                `Venta #${venta.IdVenta} registrada correctamente. Podés consultar su importe y estado en Gestión de ventas.`
            );

            try {

                // Consultamos nuevamente el catálogo para actualizar el stock.
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

    // Mostramos inicialmente el resumen vacío y cargamos los datos.
    document.querySelector('#resumen').innerHTML =
        resumenVenta(detalle, libros);

    cargar();
}


// ==================================================
// SECCIÓN 2: GESTIÓN DE VENTAS
// ==================================================

function iniciarTablero() {

    const formulario = document.querySelector('#filtros');
    const cuerpo = document.querySelector('#ventas');

    let secuencia = 0;
    let cambiando = false;

    // Obtiene las ventas desde la API y actualiza la tabla.
    async function cargar() {

        const actual = ++secuencia;
        const filtros = Object.fromEntries(new FormData(formulario));

        // Validamos que el rango de fechas sea correcto.
        if (
            filtros.desde &&
            filtros.hasta &&
            filtros.desde > filtros.hasta
        ) {
            mensaje(
                'La fecha inicial no puede ser posterior a la final.',
                true
            );
            return;
        }

        cuerpo.innerHTML =
            '<tr><td colspan="6" class="empty">Cargando ventas…</td></tr>';

        try {

            // Si hay filtros, buscamos ventas; si no, listamos todas.
            const datos = Object.values(filtros).some(Boolean)
                ? await api.buscarVentas(filtros)
                : await api.listarVentas();

            if (actual !== secuencia) return;

            cuerpo.innerHTML = datos.map(filaVenta).join('') ||
                '<tr><td colspan="6" class="empty">No hay ventas para mostrar. Creá una venta o cambiá los filtros.</td></tr>';

            document.querySelector('#cantidad').textContent =
                `${datos.length} ventas encontradas`;

        } catch (error) {

            if (actual === secuencia) {

                cuerpo.innerHTML =
                    '<tr><td colspan="6" class="empty">No se pudieron cargar las ventas. Volvé a intentar con Filtrar.</td></tr>';

                mensaje(error.message, true);
            }
        }
    }

    // Aplica los filtros del formulario sin recargar la página.
    formulario.addEventListener('submit', event => {
        event.preventDefault();
        mensaje('');
        cargar();
    });

    // Limpia los filtros y vuelve a cargar todas las ventas.
    formulario.addEventListener('reset', () => {
        setTimeout(() => {
            mensaje('');
            cargar();
        }, 0);
    });

    // Gestiona los cambios de estado de las ventas.
    cuerpo.addEventListener('click', async event => {

        const boton = event.target.closest('[data-estado]');

        if (!boton || cambiando) return;

        const { id, estado } = boton.dataset;

        // Antes de cancelar, pedimos confirmación con SweetAlert2.
        if (estado === 'cancelado') {

            const resultado = await Swal.fire({
                title: '¿Cancelar la venta?',
                text: `Se cancelará la venta #${id} y sus unidades volverán al stock.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, cancelar venta',
                cancelButtonText: 'Volver',
                confirmButtonColor: '#0b4d32',
                cancelButtonColor: '#777777',
                reverseButtons: true
            });

            // Si el usuario presiona Volver, no hacemos ningún cambio.
            if (!resultado.isConfirmed) return;
        }

        cambiando = true;

        // Deshabilitamos los botones mientras se procesa el cambio.
        cuerpo.querySelectorAll('button').forEach(b => {
            b.disabled = true;
        });

        try {

            // El backend se encarga de actualizar el estado.
            // Si corresponde cancelar, también devuelve el stock.
            await api.cambiarEstado(id, estado);

            await cargar();

            if (estado === 'cancelado') {
                mensaje(
                    `Venta #${id} cancelada. Stock devuelto correctamente.`
                );
            } else {
                mensaje(`Venta #${id} actualizada: ${estado}.`);
            }

        } catch (error) {

            mensaje(error.message, true);

        } finally {

            cambiando = false;

            cuerpo.querySelectorAll('button').forEach(b => {
                b.disabled = false;
            });
        }
    });

    // Cargamos las ventas al ingresar a la pantalla.
    cargar();
}


// ==================================================
// SECCIÓN 3: ESTADÍSTICAS
// ==================================================

function iniciarEstadisticas() {

    const cuerpo = document.querySelector('#estadisticas');
    const boton = document.querySelector('#actualizar');

    // Consulta las estadísticas del sistema y genera las filas de la tabla.
    async function cargar() {

        boton.disabled = true;
        mensaje('');

        cuerpo.innerHTML =
            '<tr><td colspan="4" class="empty">Cargando estadísticas…</td></tr>';

        try {

            // La API consulta las estadísticas calculadas por el backend.
            const datos = await api.estadisticasVentas();

            cuerpo.innerHTML = datos.map(filaEstadistica).join('') ||
                '<tr><td colspan="4" class="empty">Todavía no hay ventas registradas para mostrar estadísticas.</td></tr>';

        } catch (error) {

            cuerpo.innerHTML =
                '<tr><td colspan="4" class="empty">No se pudieron cargar las estadísticas. Volvé a intentar con Actualizar.</td></tr>';

            mensaje(error.message, true);

        } finally {

            // Volvemos a habilitar el botón al finalizar la consulta.
            boton.disabled = false;
        }
    }

    // Permite actualizar los resultados sin recargar toda la página.
    boton.addEventListener('click', cargar);

    // Mostramos las estadísticas al abrir la página.
    cargar();
}
