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

// === New Input Helpers ===
function maskCurrency(input) {
    let value = input.value.replace(/\D/g, '');
    if (!value) {
        input.value = '';
        return;
    }
    value = (parseInt(value) / 100).toFixed(2);
    value = value.replace('.', ',');
    value = value.replace(/(\d)(\d{3})(?=\,)/g, "$1.$2");
    value = value.replace(/(\d)(\d{3})\./g, "$1.$2.");
    input.value = value;
}

function parseCurrency(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatCurrencyInput(val) {
    if (!val && val !== 0) return '';
    let str = Number(val).toFixed(2).replace('.', ',');
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function addBusinessDays(dateStr, days) {
    if (!dateStr) return '';
    let d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.valueOf())) return '';
    let added = 0;
    while (added < days) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
            added++;
        }
    }
    return d.toISOString().split('T')[0];
}

function formatYMDToBR(s) {
    if (!s) return '';
    const p = s.split('-');
    if (p.length !== 3) return '';
    return `${p[2]}.${p[1]}.${p[0]}`;
}

function parseDateToYMD(s) {
    if (!s) return '';
    // Handle both DD.MM.YYYY and DD/MM/YYYY
    const p = s.replace(/\//g, '.').split('.');
    if (p.length !== 3) return '';
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
}

function formatMonthToBR(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
}

function parseBRMonthToYM(str) {
    if (!str) return '';
    const p = str.split('/');
    if (p.length !== 2) return '';
    let [mStr, yStr] = p;
    mStr = mStr.toLowerCase().trim();
    yStr = yStr.trim();
    if (yStr.length === 2) yStr = '20' + yStr;
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    let mIndex = months.findIndex(x => mStr.startsWith(x)) + 1;
    if (mIndex === 0) mIndex = parseInt(mStr) || 1; // Fallback
    return `${yStr}-${String(mIndex).padStart(2, '0')}`;
}
