import { estadisticasVentas } from './api.js';
import { mensaje } from './comun.js';
import { filaEstadistica } from './componentes/filaEstadistica.js';
const cuerpo = document.querySelector('#estadisticas'), boton = document.querySelector('#actualizar');
async function cargar() {
 boton.disabled = true; mensaje(''); cuerpo.innerHTML = '<tr><td colspan="4" class="empty">Cargando estadísticas…</td></tr>';
 try { const datos = await estadisticasVentas(); cuerpo.innerHTML = datos.map(filaEstadistica).join('') || '<tr><td colspan="4" class="empty">Todavía no hay ventas registradas para mostrar estadísticas.</td></tr>'; }
 catch(error) { cuerpo.innerHTML = '<tr><td colspan="4" class="empty">No se pudieron cargar las estadísticas. Volvé a intentar con Actualizar.</td></tr>'; mensaje(error.message,true); }
 finally { boton.disabled = false; }
}
boton.addEventListener('click', cargar); cargar();
