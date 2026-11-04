export const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const moneda = valor => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(valor));
export const fecha = valor => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(new Date(valor));
export function mensaje(texto, error = false) {
 const el = document.querySelector('#mensaje'); el.hidden = !texto; el.className = error ? 'notice error' : 'notice'; el.textContent = texto;
}
// Identifica la página actual sin duplicar lógica de navegación.
document.querySelector(`nav [data-page="${document.body.dataset.page}"]`)?.setAttribute('aria-current','page');
