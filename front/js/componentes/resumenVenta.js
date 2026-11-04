import { escapar as e } from '../comun.js';
export function resumenVenta(detalle, libros) {
 if (!detalle.length) return '<div class="empty basket"><span>▤</span><h3>Una historia por elegir</h3><p>Agregá libros del catálogo<br>para comenzar la venta.</p></div>';
 const unidades = detalle.reduce((n, item) => n + item.Cantidad, 0);
 return `<div class="order-items">${detalle.map(item => {
 const libro = libros.find(l => l.IdLibro === item.IdLibro);
 return `<div class="order-item"><h3>${e(libro?.Titulo || 'Libro no disponible')}</h3><div class="quantity"><button data-delta="-1" data-id="${item.IdLibro}" aria-label="Quitar una unidad de ${e(libro?.Titulo)}">−</button><span>${item.Cantidad}</span><button data-delta="1" data-id="${item.IdLibro}" aria-label="Agregar una unidad de ${e(libro?.Titulo)}" ${item.Cantidad >= (libro?.Stock ?? 0) ? 'disabled' : ''}>＋</button><button class="remove" data-remove="${item.IdLibro}">Quitar</button></div></div>`;
 }).join('')}</div><div class="order-count"><span>Libros seleccionados</span><strong>${unidades}</strong></div>`;
}
