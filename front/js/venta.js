import * as api from './api.js';
import { escapar, mensaje } from './comun.js';
import { tarjetaLibro } from './componentes/tarjetaLibro.js';
import { resumenVenta } from './componentes/resumenVenta.js';
// El pedido solo guarda identificadores y cantidades; los datos se derivan del catálogo.
let detalle = [], libros = [], visibles = [], enviando = false, secuencia = 0;
const catalogo = document.querySelector('#catalogo'), cliente = document.querySelector('#cliente'), registrar = document.querySelector('#registrar');
function pintar() {
 catalogo.innerHTML = visibles.map(l => tarjetaLibro(l, detalle.find(d => d.IdLibro === l.IdLibro)?.Cantidad || 0)).join('') || '<p class="empty">No encontramos libros con esos filtros.</p>';
 document.querySelector('#cantidad').textContent = `${visibles.length} títulos`;
 document.querySelector('#resumen').innerHTML = resumenVenta(detalle, libros);
 registrar.disabled = enviando || !detalle.length || !cliente.value;
 registrar.textContent = enviando ? 'Registrando…' : 'Registrar venta ↗';
}
async function cargar() {
 try {
  const [catalogoCompleto, categorias, clientes] = await Promise.all([api.listarLibros(), api.listarCategorias(), api.listarClientes()]);
  libros = catalogoCompleto; visibles = libros;
  document.querySelector('#categorias').innerHTML = '<option value="">Todas las categorías</option>' + categorias.map(c => `<option value="${Number(c.IdCategoria)}">${escapar(c.Nombre)}</option>`).join('');
  cliente.innerHTML = '<option value="">Seleccioná un cliente</option>' + clientes.map(c => `<option value="${Number(c.IdCliente)}">${escapar(c.Apellido)}, ${escapar(c.Nombre)} · ${escapar(c.DNI)}</option>`).join('');
  pintar();
 } catch(error) { catalogo.innerHTML = '<div class="empty"><h3>No pudimos cargar el catálogo</h3><p>Verificá que el servidor y la base de datos estén disponibles.</p><button class="button secondary" id="reintentar">Reintentar</button></div>'; mensaje(error.message, true); }
}
document.querySelector('#filtros').addEventListener('submit', async event => {
 event.preventDefault(); const actual = ++secuencia; catalogo.setAttribute('aria-busy','true');
 try { const resultado = await api.buscarLibros(Object.fromEntries(new FormData(event.currentTarget))); if(actual === secuencia) { visibles = resultado; pintar(); mensaje(''); } }
 catch(error) { if(actual === secuencia) mensaje(error.message,true); }
 finally { if(actual === secuencia) catalogo.removeAttribute('aria-busy'); }
});
document.addEventListener('click', event => {
 if(event.target.closest('#reintentar')) { cargar(); return; }
 if(enviando) return;
 const boton = event.target.closest('[data-add], [data-delta], [data-remove]'); if(!boton) return;
 const id = Number(boton.dataset.add || boton.dataset.id || boton.dataset.remove);
 const libro = libros.find(l => l.IdLibro === id), previo = detalle.find(d => d.IdLibro === id)?.Cantidad || 0;
 const cantidad = boton.dataset.remove ? 0 : previo + Number(boton.dataset.delta || 1);
 if(cantidad > (libro?.Stock ?? 0)) { mensaje('No hay más stock disponible de ese libro.', true); return; }
 detalle = [...detalle.filter(d => d.IdLibro !== id), ...(cantidad > 0 ? [{IdLibro:id,Cantidad:cantidad}] : [])]; pintar();
});
cliente.addEventListener('change', pintar);
registrar.addEventListener('click', async () => {
 if(enviando || !detalle.length || !cliente.value) return;
 enviando = true; cliente.disabled = true; pintar();
 try {
  const venta = await api.registrarVenta(Number(cliente.value), detalle);
  detalle = []; cliente.value = ''; mensaje(`Venta #${venta.IdVenta} registrada correctamente. Podés consultar su importe y estado en Gestión de ventas.`);
  // Una falla al refrescar no debe confundir una venta ya registrada con una fallida.
  try { libros = await api.listarLibros(); visibles = await api.buscarLibros(Object.fromEntries(new FormData(document.querySelector('#filtros')))); }
  catch { visibles = []; mensaje(`Venta #${venta.IdVenta} registrada. Actualizá la página para consultar el stock actualizado.`); }
 } catch(error) { mensaje(error.message, true); }
 finally { enviando = false; cliente.disabled = false; pintar(); }
});
document.querySelector('#resumen').innerHTML = resumenVenta(detalle, libros);
cargar();
