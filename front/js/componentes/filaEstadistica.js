import { escapar as e, moneda } from './comun.js';
export const filaEstadistica = dato => `<tr><td><strong>${e(dato.Categoria)}</strong></td><td>${e(dato.CantidadVentas)}</td><td>${e(dato.UnidadesVendidas)}</td><td class="money">${moneda(dato.TotalVendido)}</td></tr>`;
