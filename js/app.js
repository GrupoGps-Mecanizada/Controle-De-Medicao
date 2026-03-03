window.App = {
    async init() {
        // 1. Initialize Particles (from Gestão Efetivo)
        if (window.ParticleSystem) {
            ParticleSystem.init('bg-canvas');
        }

        // 2. Load API data
        await API.loadRecords();

        // 3. Init Navigation
        Navigation.init();

        // 4. Bind Modal events
        this.bindModal();

        // 5. Initial Render
        this.renderCurrentView();

        // Hide loader
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 300);
        }
    },

    renderCurrentView() {
        Navigation.buildFilters();
        Navigation.updateTopBar();

        const view = ControlState.currentView;
        if (view === 'dashboard' && typeof Dashboard !== 'undefined') Dashboard.render();
        if (view === 'table' && typeof TableView !== 'undefined') TableView.render();
    },

    bindModal() {
        const btnNovo = document.getElementById('btn-novo-bm');
        if (btnNovo) btnNovo.addEventListener('click', () => this.openNew());

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        const overlay = document.getElementById('modal-overlay');
        const crOverlay = document.getElementById('cr-modal-overlay');

        const closeAllModals = () => {
            if (overlay) overlay.classList.add('hidden');
            if (crOverlay) crOverlay.classList.add('hidden');
        };

        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModal();
            });
        }
        if (crOverlay) {
            crOverlay.addEventListener('click', (e) => {
                if (e.target === crOverlay) this.closeCRModal();
            });
        }

        document.querySelectorAll('.close-cr-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeCRModal());
        });

        const btnManageCRs = document.getElementById('btn-manage-crs');
        if (btnManageCRs) btnManageCRs.addEventListener('click', () => {
            const navOverlay = document.getElementById('nav-menu-overlay');
            if (navOverlay) navOverlay.classList.add('hidden');
            this.openCRModal();
        });

        const addCrBtn = document.getElementById('add-cr-btn');
        if (addCrBtn) {
            addCrBtn.addEventListener('click', () => {
                const input = document.getElementById('new-cr-input');
                const val = input.value.trim();
                if (val) {
                    if (!ControlState.fixedCRs.includes(val)) {
                        ControlState.fixedCRs.push(val);
                        API.saveFixedCRs();
                        this.renderCRList();
                        this.renderCurrentView(); // Refresh dashboard
                    } else {
                        if (window.showToast) showToast('Este CR já está na lista.', 'warning');
                    }
                    input.value = '';
                }
            });
        }

        const saveBtn = document.getElementById('save-bm-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveRecord());

        const pInicio = document.getElementById('f-periodo-inicio');
        if (pInicio) {
            pInicio.addEventListener('change', (e) => {
                if (e.target.value) {
                    const envio = document.getElementById('f-envio');
                    if (envio) {
                        envio.value = addBusinessDays(e.target.value, 3);
                    }
                }
            });
        }
    },

    popStages() {
        const select = document.getElementById('f-stage');
        if (select) {
            select.innerHTML = STAGES.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
        }
    },

    popCRs() {
        const datalist = document.getElementById('cr-autofill-list');
        if (datalist) {
            const recordCRs = (ControlState.records || []).map(r => r.cr ? r.cr.trim() : '');
            const crs = [...new Set([...recordCRs, ...(window.ControlState.fixedCRs || [])])].filter(c => c !== '' && c !== 'Sem CR').sort();
            datalist.innerHTML = crs.map(c => `<option value="${c}"></option>`).join('');
        }
    },

    openNew() {
        document.getElementById('mtitle').textContent = 'Novo Boletim de Medição';
        document.getElementById('eid').value = '';
        ['cr', 'mes', 'periodo-inicio', 'periodo-fim', 'pedido', 'folha', 'descricao', 'medir', 'aprovacao', 'envio', 'valorBM', 'glosa', 'responsavel', 'motivo'].forEach(f => {
            const el = document.getElementById('f-' + f);
            if (el) el.value = '';
        });
        this.popStages();
        this.popCRs();
        document.getElementById('f-stage').value = 'enviado';
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    openEdit(id) {
        const r = ControlState.records.find(x => String(x.id) === String(id));
        if (!r) return;

        document.getElementById('mtitle').textContent = 'Editar Boletim';
        document.getElementById('eid').value = id;

        const m = {
            cr: r.cr,
            mes: parseBRMonthToYM(r.mes),
            'periodo-inicio': '',
            'periodo-fim': '',
            pedido: r.pedido, folha: r.folhaRegistro, descricao: r.descricao,
            medir: formatCurrencyInput(r.medir),
            aprovacao: parseDateToYMD(r.dataAprovacao),
            envio: parseDateToYMD(r.dataEnvio),
            valorBM: formatCurrencyInput(r.valorBM),
            glosa: formatCurrencyInput(r.valorGlosa),
            responsavel: r.responsavel, motivo: r.motivoGlosa
        };

        if (r.periodo) {
            const p = r.periodo.split(' à ');
            if (p.length === 2) {
                m['periodo-inicio'] = parseDateToYMD(p[0].trim());
                m['periodo-fim'] = parseDateToYMD(p[1].trim());
            }
        }

        Object.entries(m).forEach(([k, v]) => {
            const el = document.getElementById('f-' + k);
            if (el) el.value = v || '';
        });

        this.popStages();
        this.popCRs();
        document.getElementById('f-stage').value = r.stage;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    async saveRecord() {
        const id = document.getElementById('eid').value;
        const pIni = formatYMDToBR(document.getElementById('f-periodo-inicio').value);
        const pFim = formatYMDToBR(document.getElementById('f-periodo-fim').value);
        const pStr = (pIni && pFim) ? `${pIni} à ${pFim}` : '';

        const d = {
            cr: document.getElementById('f-cr').value,
            mes: formatMonthToBR(document.getElementById('f-mes').value),
            periodo: pStr,
            pedido: document.getElementById('f-pedido').value,
            folhaRegistro: document.getElementById('f-folha').value,
            descricao: document.getElementById('f-descricao').value,
            medir: parseCurrency(document.getElementById('f-medir').value),
            dataAprovacao: formatYMDToBR(document.getElementById('f-aprovacao').value),
            dataEnvio: formatYMDToBR(document.getElementById('f-envio').value),
            valorBM: parseCurrency(document.getElementById('f-valorBM').value),
            valorGlosa: parseCurrency(document.getElementById('f-glosa').value),
            responsavel: document.getElementById('f-responsavel').value,
            motivoGlosa: document.getElementById('f-motivo').value,
            stage: document.getElementById('f-stage').value
        };

        if (!id) {
            await API.addRecord(d);
            if (window.showToast) showToast('Boletim de Medição criado com sucesso!');
        } else {
            await API.updateRecord(id, d);
            if (window.showToast) showToast('Boletim de Medição atualizado com sucesso!');
        }

        this.closeModal();
        this.renderCurrentView();
    },

    async deleteRecord(id) {
        if (!confirm('Remover este boletim?')) return;
        await API.deleteRecord(id);
        if (window.showToast) showToast('Boletim de Medição removido.', 'error');
        this.renderCurrentView();
    },

    async advanceStage(id) {
        const ids = STAGES.map(s => s.id);
        const r = ControlState.records.find(x => String(x.id) === String(id));
        if (!r) return;

        const i = ids.indexOf(r.stage);
        if (i < ids.length - 1) {
            await API.updateRecord(id, { stage: ids[i + 1] });
            if (window.showToast) showToast(`Etapa avançada para: ${stageObj(ids[i + 1]).label}`);
            this.renderCurrentView();
        }
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    openCRModal() {
        this.renderCRList();
        document.getElementById('cr-modal-overlay').classList.remove('hidden');
    },

    closeCRModal() {
        document.getElementById('cr-modal-overlay').classList.add('hidden');
    },

    renderCRList() {
        const listContainer = document.getElementById('cr-list');
        if (!listContainer) return;

        if (!ControlState.fixedCRs || ControlState.fixedCRs.length === 0) {
            listContainer.innerHTML = `<div style="padding:10px;text-align:center;color:var(--text-3);font-size:12px;background:var(--bg-1);border-radius:6px;">Nenhum CR fixo cadastrado.</div>`;
            return;
        }

        listContainer.innerHTML = ControlState.fixedCRs.sort().map(cr => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg-1); border:1px solid var(--border); border-radius:6px;">
                <span style="font-weight:600; color:var(--text-1); font-size:13px;">${cr}</span>
                <button onclick="App.removeFixedCR('${cr}')" style="background:none;border:none;color:var(--danger);cursor:pointer;" title="Remover CR">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                </button>
            </div>
        `).join('');
    },

    removeFixedCR(cr) {
        if (!confirm(`Deseja remover o CR ${cr} da lista fixa?`)) return;
        ControlState.fixedCRs = ControlState.fixedCRs.filter(c => c !== cr);
        API.saveFixedCRs();
        this.renderCRList();
        this.renderCurrentView(); // Refresh dashboard
        if (window.showToast) showToast(`CR ${cr} removido da lista.`);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Let auth check logic decide when to call App.init()
    // Wait simply calling it for now, because auth might control this.
    // Assuming auth.js initializes on window.initApp()
});

// Since we copied auth.js from Gestao Efetivo, it hooks to window.initApp()
window.initApp = function () {
    App.init();
};
