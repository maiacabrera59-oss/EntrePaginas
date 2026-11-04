
// Toda la comunicación HTTP del frontend vive en este módulo.
const API_URL = 'http://localhost:3000/api';

async function solicitar(ruta, opciones = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);

  try {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...opciones.headers
      }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.mensaje || datos.error || 'No se pudo completar la operación.'
      );
    }

    return datos;

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado. Volvé a intentarlo.');
    }

    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con el servidor. Verificá la conexión y volvé a intentarlo.');
    }

    throw error;

  } finally {
    clearTimeout(timer);
  }
}

const consulta = filtros =>
  new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== '' && v != null)
  ).toString();

export const listarLibros = () => solicitar('/libros');

export const buscarLibros = filtros =>
  solicitar(`/libros/buscar?${consulta(filtros)}`);

export const listarCategorias = () => solicitar('/categorias');

export const listarClientes = () => solicitar('/clientes');

export const listarVentas = () => solicitar('/ventas');

export const buscarVentas = filtros =>
  solicitar(`/ventas/buscar?${consulta(filtros)}`);

export const estadisticasVentas = () =>
  solicitar('/estadisticas');

export const registrarVenta = (IdCliente, Detalle) =>
  solicitar('/ventas', {
    method: 'POST',
    body: JSON.stringify({ IdCliente, Detalle })
  });

export const cambiarEstado = (id, NuevoEstado) =>
  solicitar(`/ventas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ NuevoEstado })
  });
