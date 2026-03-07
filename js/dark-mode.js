'use strict';

/**
 * Dark Mode Manager — Controle de Medição
 * Persiste preferência no localStorage e sincroniza ícones
 */
window.DarkMode = {
    STORAGE_KEY: 'CM_DARK_MODE',

    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        const prefersD = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = saved !== null ? saved === 'true' : prefersD;

        if (isDark) this._apply(true);

        const btn = document.getElementById('dark-mode-btn');
        if (btn) {
            btn.addEventListener('click', () => this.toggle());
        }

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (localStorage.getItem(this.STORAGE_KEY) === null) {
                    this._apply(e.matches);
                }
            });
        }
    },

    toggle() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this._apply(!isDark);
        localStorage.setItem(this.STORAGE_KEY, String(!isDark));
    },

    _apply(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

        const moon = document.getElementById('dark-mode-icon-moon');
        const sun = document.getElementById('dark-mode-icon-sun');
        if (moon) moon.style.display = dark ? 'none' : '';
        if (sun) sun.style.display = dark ? '' : 'none';

        // Atualizar gráficos Chart.js se existirem
        if (dark && window.Chart) {
            Chart.defaults.color = '#5e7a96';
            Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(22,27,34,0.95)';
            Chart.defaults.plugins.tooltip.titleColor = '#e6edf3';
            Chart.defaults.plugins.tooltip.bodyColor = '#9fb3c8';
        } else if (window.Chart) {
            Chart.defaults.color = '#8a95a5';
            Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(30,30,40,0.92)';
            Chart.defaults.plugins.tooltip.titleColor = '#2d3748';
            Chart.defaults.plugins.tooltip.bodyColor = '#5a6676';
        }

        // Re-renderizar dashboard se ativo
        if (window.ControlState && ControlState.currentView === 'dashboard' && typeof Dashboard !== 'undefined') {
            try { Dashboard.render(); } catch (e) { /* ignore */ }
        }
    },

    isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DarkMode.init());
} else {
    DarkMode.init();
}
