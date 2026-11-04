import * as api from './api.js';
import { mensaje } from './comun.js';
import { filaVenta } from './componentes/filaVenta.js';
const formulario = document.querySelector('#filtros'), cuerpo = document.querySelector('#ventas');
let secuencia = 0, cambiando = false;
async function cargar() {
 const actual = ++secuencia;
 const filtros = Object.fromEntries(new FormData(formulario));
 if(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) { mensaje('La fecha inicial no puede ser posterior a la final.',true); return; }
 cuerpo.innerHTML = '<tr><td colspan="6" class="empty">Cargando ventas…</td></tr>';
 try {
  const datos = Object.values(filtros).some(Boolean) ? await api.buscarVentas(filtros) : await api.listarVentas();
  if(actual !== secuencia) return;
  cuerpo.innerHTML = datos.map(filaVenta).join('') || '<tr><td colspan="6" class="empty">No hay ventas para mostrar. Creá una venta o cambiá los filtros.</td></tr>';
  document.querySelector('#cantidad').textContent = `${datos.length} ventas encontradas`;
 } catch(error) { if(actual === secuencia) { cuerpo.innerHTML = '<tr><td colspan="6" class="empty">No se pudieron cargar las ventas. Volvé a intentar con Filtrar.</td></tr>'; mensaje(error.message,true); } }
}
formulario.addEventListener('submit', e => { e.preventDefault(); mensaje(''); cargar(); });
formulario.addEventListener('reset', () => { setTimeout(() => { mensaje(''); cargar(); },0); });
cuerpo.addEventListener('click', async e => {
 const boton = e.target.closest('[data-estado]'); if(!boton || cambiando) return;
 const { id, estado } = boton.dataset;
 if(estado === 'cancelado' && !confirm(`¿Cancelar la venta #${id}? Se devolverán sus unidades al stock.`)) return;
 cambiando = true; cuerpo.querySelectorAll('button').forEach(b => b.disabled = true);
 try { await api.cambiarEstado(id,estado); mensaje(`Venta #${id} actualizada: ${estado}.`); await cargar(); }
 catch(error) { mensaje(error.message,true); }
 finally { cambiando = false; cuerpo.querySelectorAll('button').forEach(b => b.disabled = false); }
});
cargar();
