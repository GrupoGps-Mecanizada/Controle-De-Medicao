const Navigation = {
    init() {
        this.bindEvents();
        this.buildFilters();
    },

    bindEvents() {
        const menuBtn = document.getElementById('nav-menu-btn');
        const closeBtn = document.getElementById('nav-menu-close');
        const overlay = document.getElementById('nav-menu-overlay');

        if (menuBtn) menuBtn.addEventListener('click', () => overlay.classList.remove('hidden'));
        if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));

        document.querySelectorAll('.nav-menu-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                if (view) {
                    if (view === 'dashboard') {
                        ControlState.filters.cr = 'all';
                        const fCR = document.getElementById('filterCR');
                        if (fCR) fCR.value = 'all';
                    }
                    this.setView(view);
                    overlay.classList.add('hidden');
                }
            });
        });

        const filterCR = document.getElementById('filterCR');
        const filterStage = document.getElementById('filterStage');
        const filterMes = document.getElementById('filterMes');
        const searchInput = document.getElementById('searchInput');

        if (filterCR) filterCR.addEventListener('change', (e) => {
            ControlState.filters.cr = e.target.value;
            window.App.renderCurrentView();
        });

        if (filterStage) filterStage.addEventListener('change', (e) => {
            ControlState.filters.stage = e.target.value;
            window.App.renderCurrentView();
        });

        if (filterMes) filterMes.addEventListener('change', (e) => {
            ControlState.filters.mes = e.target.value;
            window.App.renderCurrentView();
        });

        if (searchInput) searchInput.addEventListener('input', (e) => {
            ControlState.filters.q = e.target.value;
            window.App.renderCurrentView();
        });

        const logoBase = document.getElementById('logo-home');
        if (logoBase) {
            logoBase.addEventListener('click', () => {
                ControlState.filters.cr = 'all';
                const fCR = document.getElementById('filterCR');
                if (fCR) fCR.value = 'all';
                this.setView('dashboard');
            });
        }
    },

    buildFilters() {
        const cr = document.getElementById('filterCR');
        const st = document.getElementById('filterStage');
        const ms = document.getElementById('filterMes');
        if (!cr || !st || !ms) return;

        const pc = ControlState.filters.cr;
        const ps = ControlState.filters.stage;
        const pm = ControlState.filters.mes;

        // Get unique CRs including fixed CRs, and handle empty CRs
        const recordCRs = (ControlState.records || []).map(r => r.cr ? r.cr.trim() : 'Sem CR');
        const crs = [...new Set([...recordCRs, ...(window.ControlState.fixedCRs || [])])].sort((a, b) => {
            if (a === 'Sem CR') return 1;
            if (b === 'Sem CR') return -1;
            return a.localeCompare(b);
        });

        const meses = [...new Set((ControlState.records || []).map(r => r.mes).filter(Boolean))].sort((a, b) => {
            const getD = (m) => {
                const parts = m.split('/');
                if (parts.length !== 2) return 0;
                const mlist = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const i = mlist.indexOf(parts[0]);
                return parseInt('20' + parts[1]) * 100 + i;
            };
            return getD(b) - getD(a); // Sort descending
        });

        const mkCrLabel = (c) => c === 'Sem CR' ? c : `CR ${c}`;
        cr.innerHTML = '<option value="all">Todos os CRs</option>' + crs.map(c => `<option value="${c}"${pc === String(c) ? ' selected' : ''}>${mkCrLabel(c)}</option>`).join('');
        st.innerHTML = '<option value="all">Todas as Etapas</option>' + STAGES.map(s => `<option value="${s.id}"${ps === s.id ? ' selected' : ''}>${s.label}</option>`).join('');
        ms.innerHTML = '<option value="all">Todos os Meses</option>' + meses.map(m => `<option value="${m}"${pm === String(m) ? ' selected' : ''}>${m}</option>`).join('');
    },

    updateTopBar() {
        const counts = {
            all: (ControlState.records || []).length,
            filtered: (typeof TableView !== 'undefined') ? TableView.getFiltered().length : 0
        };

        const sbCount = document.getElementById('sb-count');
        if (sbCount) sbCount.textContent = counts.all;

        const fbRight = document.getElementById('fb-right');
        if (fbRight) {
            if (counts.filtered !== counts.all && ControlState.currentView === 'table') {
                fbRight.innerHTML = `<strong>${counts.filtered}</strong> de ${counts.all} boletins`;
            } else {
                fbRight.innerHTML = `<strong>${counts.all}</strong> boletins`;
            }
        }
    },

    setView(view) {
        ControlState.currentView = view;

        // Update active state in menu
        document.querySelectorAll('.nav-menu-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Toggle search input visibility
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.style.display = (view === 'table') ? 'block' : 'none';
        }

        // Toggle Views
        ['dashboard', 'table', 'sla'].forEach(v => {
            const el = document.getElementById(`${v}-view`);
            if (el) {
                if (v === view) {
                    el.classList.remove('hidden');
                    // Add quick transition effect
                    el.style.opacity = '0';
                    el.style.transform = 'translateY(4px)';
                    requestAnimationFrame(() => {
                        el.style.transition = 'opacity .15s, transform .15s';
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                    });
                } else {
                    el.classList.add('hidden');
                }
            }
        });

        window.App.renderCurrentView();
    },

    drillCR(cr) {
        ControlState.filters.cr = cr;
        const filterCREl = document.getElementById('filterCR');
        if (filterCREl) filterCREl.value = cr;
        this.setView('table');
    }
};
