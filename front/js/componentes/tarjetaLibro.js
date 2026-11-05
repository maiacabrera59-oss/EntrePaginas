import { escapar as e, moneda } from './comun.js';

export function tarjetaLibro(libro, cantidad = 0) {
  const disponible = libro.Stock > cantidad;
  const stockClase = libro.Stock <= 0 ? 'sin' : libro.Stock <= 5 ? 'bajo' : 'ok';
  const stockTexto = libro.Stock > 0
    ? `${e(libro.Stock)} ${Number(libro.Stock) === 1 ? 'unidad' : 'unidades'}`
    : 'Sin stock';

  return `<article class="book-card">
   

    <h3 class="book-title">${e(libro.Titulo)}</h3>

    <dl class="book-data">
      <div>
        <dt>Autor</dt>
        <dd>${e(libro.Autor)}</dd>
      </div>
      <div>
        <dt>Editorial</dt>
        <dd>${e(libro.Editorial)}</dd>
      </div>
    </dl>

    <div class="book-bottom">
      <div class="price-box">
        <span class="label">Precio</span>
        <strong>${moneda(libro.Precio)}</strong>
      </div>
      <div class="stock-box">
        <span class="label">Disponibilidad</span>
        <span class="stock stock-${stockClase}">${stockTexto}</span>
      </div>
    </div>

    <button class="button add" data-add="${Number(libro.IdLibro)}" ${disponible ? '' : 'disabled'}>
      ${disponible ? '＋ Agregar a la venta' : 'Sin unidades disponibles'}
    </button>
  </article>`;
}