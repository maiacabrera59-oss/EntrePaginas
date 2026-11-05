import { escapar } from './comun.js';
export function estadoVenta(estado) {
 const clases = { 'preparación': 'preparacion', listo: 'listo', entregado: 'entregado', cancelado: 'cancelado' };
 return `<span class="badge ${clases[estado] || ''}">${estado === 'preparación' ? 'En preparación' : escapar(estado)}</span>`;
}
