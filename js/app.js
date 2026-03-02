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
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModal();
            });
        }

        const saveBtn = document.getElementById('save-bm-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveRecord());
    },

    popStages() {
        const select = document.getElementById('f-stage');
        if (select) {
            select.innerHTML = STAGES.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
        }
    },

    openNew() {
        document.getElementById('mtitle').textContent = 'Novo Boletim de Medição';
        document.getElementById('eid').value = '';
        ['cr', 'periodo', 'pedido', 'folha', 'descricao', 'medir', 'aprovacao', 'envio', 'valorBM', 'glosa', 'responsavel', 'motivo'].forEach(f => {
            const el = document.getElementById('f-' + f);
            if (el) el.value = '';
        });
        this.popStages();
        document.getElementById('f-stage').value = 'coleta';
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    openEdit(id) {
        const r = ControlState.records.find(x => String(x.id) === String(id));
        if (!r) return;

        document.getElementById('mtitle').textContent = 'Editar Boletim';
        document.getElementById('eid').value = id;

        const m = {
            cr: r.cr, periodo: r.periodo, pedido: r.pedido, folha: r.folhaRegistro, descricao: r.descricao,
            medir: r.medir, aprovacao: r.dataAprovacao, envio: r.dataEnvio, valorBM: r.valorBM,
            glosa: r.valorGlosa, responsavel: r.responsavel, motivo: r.motivoGlosa
        };

        Object.entries(m).forEach(([k, v]) => {
            const el = document.getElementById('f-' + k);
            if (el) el.value = v || '';
        });

        this.popStages();
        document.getElementById('f-stage').value = r.stage;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    async saveRecord() {
        const id = document.getElementById('eid').value;
        const d = {
            cr: document.getElementById('f-cr').value,
            periodo: document.getElementById('f-periodo').value,
            pedido: document.getElementById('f-pedido').value,
            folhaRegistro: document.getElementById('f-folha').value,
            descricao: document.getElementById('f-descricao').value,
            medir: parseFloat(document.getElementById('f-medir').value) || 0,
            dataAprovacao: document.getElementById('f-aprovacao').value,
            dataEnvio: document.getElementById('f-envio').value,
            valorBM: document.getElementById('f-valorBM').value,
            valorGlosa: document.getElementById('f-glosa').value,
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
