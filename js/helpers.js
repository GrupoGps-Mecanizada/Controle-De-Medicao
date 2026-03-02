function fmt(v) {
    if (v === '' || v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
}

function fmtN(v, d = 0) {
    if (!v && v !== 0) return '—';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v));
}

function stageObj(id) {
    return STAGES.find(s => s.id === id) || STAGES[0];
}

function parsePtDate(s) {
    if (!s) return null;
    const p = s.split('.');
    if (p.length !== 3) return null;
    const d = new Date(+p[2], +p[1] - 1, +p[0]);
    return isNaN(d) ? null : d;
}

function daysBetween(a, b) {
    return Math.round((b - a) / (86400000));
}

function today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

// UI Helpers (Toast from Gestão Efetivo)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icon = type === 'success'
        ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4l-8 8-4-4"/></svg>'
        : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 1v14M8 11.5v2M1.5 8h13"/></svg>';
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-icon">${icon}</div><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.style.transform = 'translateY(0)');
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => toast.remove(), 200);
    }, 3500);
}
