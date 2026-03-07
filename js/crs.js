'use strict';

const CrsView = {

    /* ─── Render principal ─────────────────────────────────── */
    render() {
        const container = document.getElementById('crs-view');
        if (!container) return;

        container.innerHTML = `
        <div style="background:var(--bg-1); border:1px solid var(--border); border-radius:10px; overflow:hidden;">

            <!-- HEADER -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-bottom:1px solid var(--border); background:var(--bg-2);">
                <div>
                    <h2 style="margin:0; font-size:17px; color:var(--text-1); font-weight:700;">Centros de Resultado</h2>
                    <p style="margin:4px 0 0; font-size:12px; color:var(--text-3);">Gerencie os CRs fixos utilizados no sistema de medição.</p>
                </div>
                <button id="cr-new-btn" style="display:flex;align-items:center;gap:6px;background:var(--blue);color:#fff;border:none;border-radius:7px;padding:8px 16px;font-weight:600;font-size:13px;cursor:pointer;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                    Novo CR
                </button>
            </div>

            <!-- BUSCA -->
            <div style="padding:14px 24px; border-bottom:1px solid var(--border);">
                <div style="position:relative; max-width:360px;">
                    <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-3);" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input type="text" id="cr-search-input" class="finp"
                        placeholder="Buscar por CR, contrato, cliente…"
                        style="width:100%;padding-left:32px;font-size:12px;" />
                </div>
            </div>

            <!-- LISTA DE CRs -->
            <div id="view-cr-list" style="padding:20px 24px; display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:14px; min-height:120px;">
                <!-- Rendered by renderList() -->
            </div>

            <!-- RODAPÉ -->
            <div id="cr-footer" style="padding:10px 24px; border-top:1px solid var(--border); background:var(--bg-2); font-size:11px; color:var(--text-3);">
                — CRs cadastrados
            </div>
        </div>`;

        document.getElementById('cr-new-btn').addEventListener('click', () => this.openModal());

        const searchEl = document.getElementById('cr-search-input');
        if (searchEl) searchEl.addEventListener('input', () => this.renderList());

        this._bindModalEvents();
        this.renderList();
    },

    /* ─── Lista de cards ───────────────────────────────────── */
    renderList() {
        const listContainer = document.getElementById('view-cr-list');
        const footer        = document.getElementById('cr-footer');
        if (!listContainer) return;

        const q = (document.getElementById('cr-search-input')?.value || '').trim().toLowerCase();

        const items = (ControlState.fixedCRsObjects || [])
            .slice()
            .sort((a, b) => String(a.cr_id).localeCompare(String(b.cr_id)))
            .filter(obj => {
                if (!q) return true;
                return (
                    String(obj.cr_id).includes(q) ||
                    (obj.nome_contrato || '').toLowerCase().includes(q) ||
                    (obj.cliente      || '').toLowerCase().includes(q) ||
                    (obj.responsavel  || '').toLowerCase().includes(q)
                );
            });

        if (footer) footer.textContent = `${items.length} CR${items.length !== 1 ? 's' : ''} cadastrado${items.length !== 1 ? 's' : ''}`;

        if (items.length === 0) {
            listContainer.innerHTML = `
            <div style="grid-column:1/-1; padding:40px 20px; text-align:center; color:var(--text-3);">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:.35;margin-bottom:10px;"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                <div style="font-weight:600; margin-bottom:4px;">${q ? 'Nenhum CR encontrado' : 'Nenhum CR cadastrado'}</div>
                <div style="font-size:12px;">${q ? 'Tente outros termos.' : 'Clique em "Novo CR" para adicionar.'}</div>
            </div>`;
            return;
        }

        listContainer.innerHTML = items.map(obj => {
            // Contar BMs relacionados a este CR
            const bmCount = (ControlState.records || []).filter(r => String(r.cr) === String(obj.cr_id)).length;
            const totalMedir = (ControlState.records || [])
                .filter(r => String(r.cr) === String(obj.cr_id))
                .reduce((acc, r) => acc + (parseFloat(r.medir) || 0), 0);
            const fmtVal = typeof fmt === 'function' ? fmt : v => v;

            return `
            <div class="cr-card" style="display:flex;flex-direction:column;background:var(--bg-1);border:1px solid var(--border);border-radius:9px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);transition:box-shadow .15s,transform .15s;" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';this.style.transform='translateY(-1px)'" onmouseleave="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';this.style.transform=''">

                <!-- TOP COLOR BAR -->
                <div style="height:4px;background:linear-gradient(90deg,var(--blue),#2563eb88);"></div>

                <div style="padding:16px 16px 12px;">
                    <!-- HEADER CARD -->
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                        <div>
                            <div style="font-weight:800;color:var(--text-1);font-size:15px;font-family:var(--font-mono,monospace);">CR ${obj.cr_id}</div>
                            ${obj.nome_contrato ? `<div style="font-size:12px;color:var(--text-2);margin-top:2px;font-weight:500;">${obj.nome_contrato}</div>` : ''}
                        </div>
                        <div style="display:flex;gap:5px;flex-shrink:0;">
                            <button onclick="CrsView.openModal('${obj.cr_id}')"
                                style="background:var(--bg-2);border:1px solid var(--border);color:var(--text-2);cursor:pointer;width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;transition:all .15s;"
                                onmouseenter="this.style.background='var(--blue)';this.style.color='#fff';this.style.borderColor='var(--blue)'"
                                onmouseleave="this.style.background='var(--bg-2)';this.style.color='var(--text-2)';this.style.borderColor='var(--border)'"
                                title="Editar CR">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button onclick="CrsView.handleRemoveCR('${obj.cr_id}')"
                                style="background:#fee2e2;border:none;color:var(--danger,#dc2626);cursor:pointer;width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;transition:background .15s;"
                                onmouseenter="this.style.background='#fca5a5'"
                                onmouseleave="this.style.background='#fee2e2'"
                                title="Remover CR">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- DADOS -->
                    <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--text-3);">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                            <span style="color:var(--text-2)">${obj.cliente || '<em style="opacity:.6">Sem cliente</em>'}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            <span style="color:var(--text-2)">${obj.responsavel || '<em style="opacity:.6">Sem responsável</em>'}</span>
                        </div>
                    </div>
                </div>

                <!-- ESTATÍSTICAS -->
                <div style="border-top:1px solid var(--border);padding:10px 16px;background:var(--bg-2);display:flex;gap:16px;align-items:center;">
                    <div style="text-align:center;">
                        <div style="font-size:16px;font-weight:800;color:var(--text-1);font-family:var(--font-mono,monospace);">${bmCount}</div>
                        <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em;">Boletim${bmCount !== 1 ? 's' : ''}</div>
                    </div>
                    ${bmCount > 0 ? `
                    <div style="width:1px;height:28px;background:var(--border);"></div>
                    <div>
                        <div style="font-size:12px;font-weight:700;color:var(--text-1);font-family:var(--font-mono,monospace);">${fmtVal(totalMedir)}</div>
                        <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em;">Total a medir</div>
                    </div>` : ''}
                </div>
            </div>`;
        }).join('');
    },

    /* ─── Modal ────────────────────────────────────────────── */
    openModal(cr_id = null) {
        const overlay = document.getElementById('cr-modal-overlay');
        const title   = document.getElementById('cr-modal-title');
        const editId  = document.getElementById('cr-modal-editing-id');
        const idInput = document.getElementById('cr-modal-id');
        if (!overlay) return;

        if (cr_id) {
            const crObj = (ControlState.fixedCRsObjects || []).find(c => String(c.cr_id) === String(cr_id));
            if (!crObj) return;
            title.textContent = `Editar CR ${crObj.cr_id}`;
            editId.value = crObj.cr_id;
            idInput.value = crObj.cr_id;
            idInput.disabled = true;
            document.getElementById('cr-modal-contrato').value    = crObj.nome_contrato || '';
            document.getElementById('cr-modal-cliente').value     = crObj.cliente       || '';
            document.getElementById('cr-modal-responsavel').value = crObj.responsavel   || '';
        } else {
            title.textContent = 'Novo Centro de Resultado';
            editId.value      = '';
            idInput.value     = '';
            idInput.disabled  = false;
            document.getElementById('cr-modal-contrato').value    = '';
            document.getElementById('cr-modal-cliente').value     = '';
            document.getElementById('cr-modal-responsavel').value = '';
        }

        overlay.classList.remove('hidden');
        setTimeout(() => idInput.disabled ? document.getElementById('cr-modal-contrato').focus() : idInput.focus(), 50);
    },

    closeModal() {
        const overlay = document.getElementById('cr-modal-overlay');
        if (overlay) overlay.classList.add('hidden');
    },

    _bindModalEvents() {
        const overlay = document.getElementById('cr-modal-overlay');
        if (!overlay || overlay._crBound) return;
        overlay._crBound = true;

        document.getElementById('cr-modal-close')?.addEventListener('click',  () => this.closeModal());
        document.getElementById('cr-modal-cancel')?.addEventListener('click', () => this.closeModal());
        overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });

        document.getElementById('cr-modal-save')?.addEventListener('click', () => this.handleSave());

        overlay.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.closeModal();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) this.handleSave();
        });
    },

    async handleSave() {
        const editingId   = document.getElementById('cr-modal-editing-id').value.trim();
        const cr_id       = document.getElementById('cr-modal-id').value.trim();
        const nome_contrato = document.getElementById('cr-modal-contrato').value.trim();
        const cliente     = document.getElementById('cr-modal-cliente').value.trim();
        const responsavel = document.getElementById('cr-modal-responsavel').value.trim();
        const saveBtn     = document.getElementById('cr-modal-save');

        if (!cr_id) {
            if (window.showToast) showToast('O Nº do CR é obrigatório.', 'warning');
            document.getElementById('cr-modal-id').focus();
            return;
        }

        const isEdit = !!editingId;

        if (!isEdit && (ControlState.fixedCRs || []).includes(cr_id)) {
            if (window.showToast) showToast('Este CR já está cadastrado.', 'warning');
            return;
        }

        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Salvando…'; }

        try {
            const crData = { cr_id, nome_contrato, cliente, responsavel };

            if (isEdit) {
                await API.updateCR(editingId, crData);
                if (window.showToast) showToast(`CR ${cr_id} atualizado com sucesso!`);
            } else {
                await API.addCR(crData);
                if (window.showToast) showToast(`CR ${cr_id} adicionado com sucesso!`);
            }

            this.closeModal();
            this.renderList();
        } catch (e) {
            if (window.showToast) showToast(`Erro ao ${isEdit ? 'atualizar' : 'adicionar'} CR.`, 'error');
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salvar CR'; }
        }
    },

    async handleRemoveCR(cr) {
        if (!confirm(`Deseja remover o CR ${cr} da lista fixa?\n\nEssa ação não remove os boletins vinculados a ele.`)) return;
        try {
            await API.deleteCR(cr);
            this.renderList();
            if (window.showToast) showToast(`CR ${cr} removido.`);
        } catch (e) {
            if (window.showToast) showToast('Erro ao remover CR.', 'error');
        }
    }
};
