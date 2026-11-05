
export const escapar = valor =>
    String(valor ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));

export const moneda = valor =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(Number(valor));

export const fecha = valor =>
    new Intl.DateTimeFormat('es-AR', {
        timeZone: 'UTC'
    }).format(new Date(valor));

export function mensaje(texto, error = false) {
    const el = document.querySelector('#mensaje');

    if (el) {
        el.hidden = true;
        el.textContent = '';
    }

    if (!texto) return;

    if (typeof Swal === 'undefined') {
        if (el) {
            el.hidden = false;
            el.className = error ? 'notice error' : 'notice';
            el.textContent = texto;
        }
        return;
    }

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: error ? 'error' : 'success',
        title: texto,
        showConfirmButton: false,
        timer: error ? 4000 : 3000,
        timerProgressBar: true
    });
}

export function marcarPaginaActiva() {
    document.querySelector(
        `nav [data-page="${document.body.dataset.page}"]`
    )?.setAttribute('aria-current', 'page');
}
