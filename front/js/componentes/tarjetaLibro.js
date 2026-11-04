import { escapar as e, moneda } from '../comun.js';
// Portadas tipográficas propias: no dependen de imágenes ni servicios externos.
export function tarjetaLibro(libro, cantidad = 0) {
 const disponible = libro.Stock > cantidad;
 return `<article class="book-card"><div class="cover cover-${Number(libro.IdLibro)%5}" aria-hidden="true"><span class="cover-category">${e(libro.Categoria)}</span><span class="cover-title">${e(libro.Titulo)}</span><span class="cover-ornament">✳</span><span class="cover-author">${e(libro.Autor)}</span></div><div class="book-info"><span class="category">${e(libro.Categoria)}</span><h3>${e(libro.Titulo)}</h3><p>${e(libro.Autor)} · ${e(libro.Editorial)}</p><div class="book-bottom"><strong>${moneda(libro.Precio)}</strong><span class="stock">${libro.Stock > 0 ? `${e(libro.Stock)} disponibles` : 'Sin stock'}</span></div><button class="button add" data-add="${Number(libro.IdLibro)}" ${disponible ? '' : 'disabled'}>${disponible ? '＋ Agregar a la venta' : 'Sin unidades disponibles'}</button></div></article>`;
}
