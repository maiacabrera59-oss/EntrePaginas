import { escapar as e, moneda, fecha } from './comun.js';
import { estadoVenta } from './estadoVenta.js';
export function filaVenta(v) {
 const siguiente = v.Estado === 'preparación' ? 'listo' : v.Estado === 'listo' ? 'entregado' : null;
 return `<tr><td><strong>#${Number(v.IdVenta)}</strong></td><td>${e(v.Nombre)} ${e(v.Apellido)}</td><td>${fecha(v.Fecha)}</td><td class="money">${moneda(v.Total)}</td><td>${estadoVenta(v.Estado)}</td><td class="actions">${siguiente ? `<button class="button small secondary" data-id="${Number(v.IdVenta)}" data-estado="${siguiente}">${siguiente === 'listo' ? 'Marcar listo' : 'Entregar'}</button>` : '<span class="muted">Finalizada</span>'}${v.Estado === 'preparación' ? `<button class="text-button" data-id="${Number(v.IdVenta)}" data-estado="cancelado">Cancelar</button>` : ''}</td></tr>`;
}
