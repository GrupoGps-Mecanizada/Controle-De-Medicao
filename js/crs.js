const CrsView = {
    render() {
        const container = document.getElementById('crs-view');
        if (!container) return;

        let html = `
        <div style="background:var(--bg-1); border:1px solid var(--border); border-radius:8px; padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <h2 style="margin:0; font-size:18px; color:var(--text-1); font-weight:700;">Gerenciamento de CRs</h2>
                    <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-2);">Adicione ou remova Centros de Resultado fixos para visualização global.</p>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px; background:var(--bg-2); padding:16px; border-radius:8px; border:1px solid var(--border);">
                <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-3); margin-bottom:4px;">
                    Adicionar Novo CR
                </div>
                
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:200px;">
                        <label style="display:block; font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-3); margin-bottom:4px;">Nº do CR</label>
                        <input type="text" id="view-new-cr-id" class="finp" style="width:100%" placeholder="Ex: 88888" />
                    </div>
                    <div style="flex:2; min-width:200px;">
                        <label style="display:block; font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-3); margin-bottom:4px;">Nome do Contrato</label>
                        <input type="text" id="view-new-cr-contrato" class="finp" style="width:100%" placeholder="Nome do Contrato" />
                    </div>
                </div>

                <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
                    <div style="flex:1; min-width:200px;">
                        <label style="display:block; font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-3); margin-bottom:4px;">Cliente</label>
                        <input type="text" id="view-new-cr-cliente" class="finp" style="width:100%" placeholder="Nome do Cliente" />
                    </div>
                    <div style="flex:1; min-width:200px;">
                        <label style="display:block; font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-3); margin-bottom:4px;">Responsável</label>
                        <input type="text" id="view-new-cr-responsavel" class="finp" style="width:100%" placeholder="Nome do Responsável" />
                    </div>
                    <div style="flex:0 0 auto;">
                        <button id="view-add-cr-btn" class="btn btn-primary" style="height:34px; padding:0 20px; font-weight:600;">Adicionar CR</button>
                    </div>
                </div>
            </div>

            <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-3); margin-bottom:12px;">
                CRs Cadastrados
            </div>
            
            <div id="view-cr-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:12px;">
                <!-- Rendered by JS -->
            </div>
        </div>`;

        container.innerHTML = html;

        // Bind Add Action
        const btnAdd = document.getElementById('view-add-cr-btn');
        if (btnAdd) {
            btnAdd.addEventListener('click', async () => this.handleAddCR());
        }

        this.renderList();
    },

    renderList() {
        const listContainer = document.getElementById('view-cr-list');
        if (!listContainer) return;

        if (!ControlState.fixedCRsObjects || ControlState.fixedCRsObjects.length === 0) {
            listContainer.innerHTML = `<div style="grid-column:1/-1; padding:20px; text-align:center; color:var(--text-3); font-size:13px; background:var(--bg-2); border-radius:6px; border:1px dashed var(--border);">Nenhum CR fixo cadastrado localmente. Adicione abaixo para controlar no Dashboard.</div>`;
            return;
        }

        listContainer.innerHTML = ControlState.fixedCRsObjects.sort((a, b) => a.cr_id.localeCompare(b.cr_id)).map(obj => `
            <div style="display:flex; flex-direction:column; padding:16px; background:var(--bg-1); border:1px solid var(--border); border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.02); transition:transform 0.1s, box-shadow 0.1s;" class="cr-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div>
                        <div style="font-weight:700; color:var(--text-1); font-size:15px;">CR ${obj.cr_id}</div>
                        ${obj.nome_contrato ? `<div style="font-size:12px; color:var(--text-2); margin-top:2px;">${obj.nome_contrato}</div>` : ''}
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button onclick="CrsView.editCR('${obj.cr_id}')" style="background:var(--bg-2); border:1px solid var(--border); color:var(--text-2); cursor:pointer; width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" title="Editar CR">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </button>
                        <button onclick="CrsView.handleRemoveCR('${obj.cr_id}')" style="background:var(--danger-light, #fee2e2); border:none; color:var(--danger); cursor:pointer; width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:background 0.2s;" title="Remover CR">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                        </button>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--text-3); margin-top:auto; padding-top:12px; border-top:1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        <span>${obj.cliente || 'Sem cliente'}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        <span>${obj.responsavel || 'Sem responsável'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    async handleAddCR() {
        const idInput = document.getElementById('view-new-cr-id');
        const contratoInput = document.getElementById('view-new-cr-contrato');
        const clienteInput = document.getElementById('view-new-cr-cliente');
        const responsavelInput = document.getElementById('view-new-cr-responsavel');
        const btnAdd = document.getElementById('view-add-cr-btn');

        const cr_id = idInput.value.trim();
        const nome_contrato = contratoInput.value.trim();
        const cliente = clienteInput.value.trim();
        const responsavel = responsavelInput.value.trim();

        if (cr_id) {
            const isEditMode = btnAdd.textContent.includes('Atualizar');

            const crData = {
                cr_id, nome_contrato, cliente, responsavel
            };

            try {
                if (isEditMode) {
                    await API.updateCR(cr_id, crData);
                    if (window.showToast) showToast('CR Atualizado com sucesso!');
                } else {
                    if (!ControlState.fixedCRs.includes(cr_id)) {
                        await API.addCR(crData);
                        if (window.showToast) showToast('CR Adicionado com sucesso!');
                    } else {
                        if (window.showToast) showToast('Este CR já está na lista.', 'warning');
                        return; // do not clear form if failed
                    }
                }

                this.renderList();

                // Clear and reset form
                idInput.value = '';
                idInput.disabled = false;
                contratoInput.value = '';
                clienteInput.value = '';
                responsavelInput.value = '';
                btnAdd.textContent = 'Adicionar CR';

            } catch (e) {
                if (window.showToast) showToast(`Erro ao ${isEditMode ? 'atualizar' : 'adicionar'} CR.`, 'error');
            }
        } else {
            if (window.showToast) showToast('O ID do CR é obrigatório.', 'warning');
        }
    },

    editCR(cr_id) {
        const crObj = ControlState.fixedCRsObjects.find(c => String(c.cr_id) === String(cr_id));
        if (!crObj) return;

        // Populate fields
        const idInput = document.getElementById('view-new-cr-id');
        idInput.value = crObj.cr_id;
        idInput.disabled = true; // Cannot edit the ID, only other properties

        document.getElementById('view-new-cr-contrato').value = crObj.nome_contrato || '';
        document.getElementById('view-new-cr-cliente').value = crObj.cliente || '';
        document.getElementById('view-new-cr-responsavel').value = crObj.responsavel || '';

        // Change button layout
        const btnAdd = document.getElementById('view-add-cr-btn');
        btnAdd.textContent = 'Atualizar CR';

        // Scroll to top
        document.getElementById('main').scrollIntoView({ behavior: 'smooth' });
    },

    async handleRemoveCR(cr) {
        if (!confirm(`Deseja remover o CR ${cr} da lista fixa?`)) return;
        try {
            await API.deleteCR(cr);
            this.renderList();
            if (window.showToast) showToast(`CR ${cr} removido da lista.`);
        } catch (e) {
            if (window.showToast) showToast('Erro ao remover CR.', 'error');
        }
    }
};
