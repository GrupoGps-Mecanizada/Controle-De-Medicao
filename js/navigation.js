const Navigation = {
    init() {
        this.bindEvents();
        this.buildFilters();
    },

    bindEvents() {
        const menuBtn = document.getElementById('nav-menu-btn');
        const overlay = document.getElementById('nav-menu-overlay');
        const panel   = overlay?.querySelector('.nav-menu-panel');

        if (menuBtn) menuBtn.addEventListener('click', () => overlay.classList.remove('hidden'));

        // Fechar ao clicar fora do painel (no overlay escuro)
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (!panel || !panel.contains(e.target)) {
                    overlay.classList.add('hidden');
                }
            });
        }

        document.querySelectorAll('.nav-menu-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                if (view) {
                    if (view === 'dashboard') {
                        ControlState.filters.crs = [];
                    }
                    this.setView(view);
                    overlay.classList.add('hidden');
                }
            });
        });

        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.addEventListener('input', (e) => {
            ControlState.filters.q = e.target.value;
            window.App.renderCurrentView();
        });

        const logoBase = document.getElementById('logo-home');
        if (logoBase) {
            logoBase.addEventListener('click', () => {
                ControlState.filters.crs = [];
                this.setView('dashboard');
            });
        }
    },

    buildFilters() {
        this.buildFilterDropdown();
    },

    buildFilterDropdown() {
        const body = document.getElementById('filter-dropdown-body');
        if (!body) return;

        const records = ControlState.records || [];

        const countBy = (field) => {
            const map = {};
            records.forEach(r => {
                let val = r[field];
                if (field === 'cr' && (!val || val.trim() === '')) val = 'Sem CR';
                if (val) map[val] = (map[val] || 0) + 1;
            });
            return map;
        };

        const mesesCounts = countBy('mes');
        const crCounts = countBy('cr');
        const stageCounts = countBy('stage');

        const recordCRs = records.map(r => r.cr ? r.cr.trim() : 'Sem CR');
        const allCRs = [...new Set([...recordCRs, ...(window.ControlState.fixedCRs || [])])].sort((a, b) => {
            if (a === 'Sem CR') return 1;
            if (b === 'Sem CR') return -1;
            return a.localeCompare(b);
        });

        const meses = [...new Set(records.map(r => r.mes).filter(Boolean))].sort((a, b) => {
            const getD = (m) => {
                const parts = m.split('/');
                if (parts.length !== 2) return 0;
                const mlist = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const i = mlist.indexOf(parts[0]);
                return parseInt('20' + parts[1]) * 100 + i;
            };
            return getD(b) - getD(a);
        });

        const chevronSvg = '<svg class="filter-accordion-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6l4 4 4-4"/></svg>';

        const makeAccordion = (title, type, options, defaultOpen) => {
            const activeCount = (ControlState.filters[type] || []).length;
            const badgeHtml = activeCount > 0 ? `<span class="filter-accordion-badge">${activeCount}</span>` : '';
            return `
                <div class="filter-accordion${defaultOpen ? ' open' : ''}">
                    <div class="filter-accordion-header">
                        ${chevronSvg}
                        <span class="filter-accordion-title">${title}</span>
                        ${badgeHtml}
                    </div>
                    <div class="filter-accordion-body">
                        ${options.map(opt => {
                const count = opt.count || 0;
                return `
                                <div class="filter-checkbox-item" data-type="${type}" data-value="${opt.value}">
                                    <div class="filter-checkbox"></div>
                                    <span class="filter-checkbox-label">${opt.label}</span>
                                    <span class="filter-checkbox-count">${count}</span>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        };

        const mesesOptions = meses.map(m => ({ value: m, label: m, count: mesesCounts[m] || 0 }));
        const crOptions = allCRs.map(c => ({ value: c, label: c === 'Sem CR' ? c : `CR ${c}`, count: crCounts[c] || 0 }));
        const stageOptions = STAGES.map(s => ({ value: s.id, label: s.label, count: stageCounts[s.id] || 0 }));

        body.innerHTML = [
            makeAccordion('Meses', 'meses', mesesOptions, false),
            makeAccordion('CRs', 'crs', crOptions, false),
            makeAccordion('Etapas', 'stages', stageOptions, false)
        ].join('');

        this.setupFilterDropdown();
        this.restoreFilters();
    },

    setupFilterDropdown() {
        const toggleBtn = document.getElementById('filter-toggle-btn');
        const panel = document.getElementById('filter-dropdown-panel');
        const body = document.getElementById('filter-dropdown-body');

        if (toggleBtn && panel) {
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                panel.classList.toggle('hidden');
            };
        }

        document.addEventListener('click', (e) => {
            if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && !toggleBtn.contains(e.target)) {
                panel.classList.add('hidden');
            }
        });

        if (!body) return;

        const newBody = body.cloneNode(true);
        body.parentNode.replaceChild(newBody, body);

        newBody.addEventListener('click', (e) => {
            const header = e.target.closest('.filter-accordion-header');
            if (header) {
                const accordion = header.closest('.filter-accordion');
                if (accordion) accordion.classList.toggle('open');
                return;
            }

            const item = e.target.closest('.filter-checkbox-item');
            if (!item) return;

            const type = item.dataset.type;
            const value = item.dataset.value;
            const checkbox = item.querySelector('.filter-checkbox');

            if (!ControlState.filters[type]) ControlState.filters[type] = [];

            const idx = ControlState.filters[type].indexOf(value);
            if (idx >= 0) {
                ControlState.filters[type].splice(idx, 1);
                checkbox.classList.remove('checked');
            } else {
                ControlState.filters[type].push(value);
                checkbox.classList.add('checked');
            }

            this.updateFilterBadge();

            // Render view first, then rebuild headers to show the badge inside accordion
            window.App.renderCurrentView();
            // Need to rebuild to update the badges in the headers
            this.buildFilterDropdown();
        });

        const clearBtn = document.getElementById('filter-clear-all');
        if (clearBtn) {
            clearBtn.onclick = () => {
                ControlState.filters.crs = [];
                ControlState.filters.stages = [];
                ControlState.filters.meses = [];
                newBody.querySelectorAll('.filter-checkbox').forEach(cb => cb.classList.remove('checked'));
                this.updateFilterBadge();
                window.App.renderCurrentView();
                this.buildFilterDropdown();
            };
        }
    },

    restoreFilters() {
        try {
            const body = document.getElementById('filter-dropdown-body');
            if (body) {
                ['crs', 'stages', 'meses'].forEach(type => {
                    const activeFilters = ControlState.filters[type] || [];
                    activeFilters.forEach(val => {
                        const item = body.querySelector(`.filter-checkbox-item[data-type="${type}"][data-value="${val}"]`);
                        if (item) {
                            item.querySelector('.filter-checkbox').classList.add('checked');
                            const accordion = item.closest('.filter-accordion');
                            if (accordion && !accordion.classList.contains('open')) {
                                accordion.classList.add('open');
                            }
                        }
                    });
                });
            }
            this.updateFilterBadge();
        } catch (e) { /* ignore */ }
    },

    updateFilterBadge() {
        const f = ControlState.filters;
        const total = (f.crs?.length || 0) + (f.stages?.length || 0) + (f.meses?.length || 0);

        const badge = document.getElementById('filter-count-badge');
        const btn = document.getElementById('filter-toggle-btn');
        if (badge) {
            badge.textContent = total;
            badge.classList.toggle('hidden', total === 0);
        }
        if (btn) {
            btn.classList.toggle('has-filters', total > 0);
            if (total > 0) {
                btn.style.color = 'var(--blue)';
            } else {
                btn.style.color = 'var(--text-3)';
            }
        }
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

        const tableToolbar = document.getElementById('table-toolbar');
        if (tableToolbar) {
            tableToolbar.style.display = ControlState.currentView === 'table' ? 'flex' : 'none';
        }
    },

    setView(view) {
        ControlState.currentView = view;

        document.querySelectorAll('.nav-menu-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.style.display = (view === 'table') ? 'block' : 'none';
        }

        const tableToolbar = document.getElementById('table-toolbar');
        if (tableToolbar) {
            tableToolbar.style.display = view === 'table' ? 'flex' : 'none';
        }

        ['dashboard', 'table', 'crs'].forEach(v => {
            const el = document.getElementById(`${v}-view`);
            if (el) {
                if (v === view) {
                    el.classList.remove('hidden');
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
        ControlState.filters.crs = [cr];
        this.updateFilterBadge();
        this.buildFilterDropdown();
        this.setView('table');
    }
};
