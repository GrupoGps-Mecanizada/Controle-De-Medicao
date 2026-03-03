const API = {
    async loadRecords() {
        await this.loadMotivosGlosa();
        await this.loadFixedCRs();

        // For now try Supabase, if missing/fail fallback to INIT
        if (window.supabase) {
            try {
                const { data, error } = await supabase.schema('gps_mec').from('adm_gps_mec_boletins_medicao').select('*');
                if (error) throw error;
                if (data && data.length > 0) {
                    ControlState.records = data.map(r => {
                        let parsed = this.mapFromDB(r);
                        // Migrate old stages to current standard
                        if (['coleta', 'bm_preenchimento', 'bm_enviado'].includes(parsed.stage)) {
                            parsed.stage = 'enviado';
                        }
                        if (parsed.stage === 'concluido') {
                            parsed.stage = 'faturado';
                        }
                        return parsed;
                    });
                    return;
                }
            } catch (e) {
                console.warn('Supabase not ready or empty for boletins_medicao, using INIT / LocalStorage');
            }
        }

        try {
            const d = localStorage.getItem('bm-v4');
            if (d) {
                ControlState.records = JSON.parse(d);
                return;
            }
        } catch (e) { }

        ControlState.records = INIT.map(r => ({ ...r }));
        this.saveRecords();
    },

    async loadFixedCRs() {
        if (window.supabase) {
            try {
                // Fetch from the new 'gps_centros_resultado' table
                const { data, error } = await supabase.schema('gps_compartilhado').from('gps_centros_resultado').select('*').order('cr_id', { ascending: true });
                if (!error && data) {
                    ControlState.fixedCRsObjects = data; // Keep full payload
                    ControlState.fixedCRs = data.map(c => c.cr_id); // Compatibility with old string array code
                    return;
                }
            } catch (e) {
                console.warn('Supabase not ready or empty for crs table', e);
            }
        }

        try {
            const d = localStorage.getItem('fixed-crs-v1');
            if (d) {
                ControlState.fixedCRs = JSON.parse(d);
                ControlState.fixedCRsObjects = ControlState.fixedCRs.map(c => ({ cr_id: c, nome_contrato: '', cliente: '', responsavel: '' }));
                return;
            }
        } catch (e) { }

        // Default CRs as requested
        ControlState.fixedCRsObjects = [
            { cr_id: '18512', nome_contrato: '', cliente: '', responsavel: '' },
            { cr_id: '18515', nome_contrato: '', cliente: '', responsavel: '' },
            { cr_id: '18521', nome_contrato: '', cliente: '', responsavel: '' }
        ];
        ControlState.fixedCRs = ControlState.fixedCRsObjects.map(c => c.cr_id);
    },

    async loadMotivosGlosa() {
        if (window.supabase) {
            try {
                const { data, error } = await supabase.schema('gps_compartilhado').from('gps_configuracoes_sistema').select('valor').eq('sistema', 'MEDICAO').eq('setor', 'MEC').eq('chave', 'motivos_glosa').single();
                if (!error && data && data.valor) {
                    ControlState.motivosGlosa = data.valor;
                    return;
                }
            } catch (e) {
                console.warn('Supabase not ready or empty for app_config motivos_glosa', e);
            }
        }

        try {
            const d = localStorage.getItem('motivos-glosa-v1');
            if (d) {
                ControlState.motivosGlosa = JSON.parse(d);
                return;
            }
        } catch (e) { }
    },

    async saveMotivosGlosa() {
        if (window.supabase) {
            try {
                // The upsert needs all the unique keys
                const { error } = await supabase.schema('gps_compartilhado').from('gps_configuracoes_sistema').upsert({ sistema: 'MEDICAO', setor: 'MEC', chave: 'motivos_glosa', valor: ControlState.motivosGlosa, updated_at: new Date().toISOString() });
                if (error) throw error;
            } catch (e) {
                console.error('Supabase save motivos_glosa error', e);
            }
        }

        try {
            localStorage.setItem('motivos-glosa-v1', JSON.stringify(ControlState.motivosGlosa));
        } catch (e) { }
    },

    async saveFixedCRs() {
        // Kept for local fallback only. Individual CRUD happens via API endpoints
        try {
            localStorage.setItem('fixed-crs-v1', JSON.stringify(ControlState.fixedCRs));
        } catch (e) { }
    },

    async saveRecords() {
        try {
            localStorage.setItem('bm-v4', JSON.stringify(ControlState.records));
        } catch (e) { }
    },

    async addRecord(data) {
        const localId = Date.now().toString();
        const newRecord = { ...data, id: localId };
        if (window.supabase) {
            try {
                const dbRow = this.mapToDB(newRecord);
                delete dbRow.id;
                const { data: inserted, error } = await supabase.schema('gps_mec').from('adm_gps_mec_boletins_medicao').insert([dbRow]).select();
                if (!error && inserted && inserted[0]) {
                    newRecord.id = inserted[0].id;
                }
            } catch (e) { console.error('Supabase DB error', e); }
        }
        ControlState.records.push(newRecord);
        this.saveRecords();
    },

    async updateRecord(id, data) {
        if (window.supabase) {
            try {
                await supabase.schema('gps_mec').from('adm_gps_mec_boletins_medicao').update(this.mapToDB(data)).eq('id', id);
            } catch (e) { console.error('Supabase DB error', e); }
        }
        const idx = ControlState.records.findIndex(r => String(r.id) === String(id));
        if (idx >= 0) {
            ControlState.records[idx] = { ...ControlState.records[idx], ...data };
            this.saveRecords();
        }
    },

    async deleteRecord(id) {
        if (window.supabase) {
            try {
                await supabase.schema('gps_mec').from('adm_gps_mec_boletins_medicao').delete().eq('id', id);
            } catch (e) { console.error('Supabase DB error', e); }
        }
        ControlState.records = ControlState.records.filter(r => String(r.id) !== String(id));
        this.saveRecords();
    },

    // --- CR Management API ---
    async addCR(crData) {
        if (window.supabase) {
            try {
                const { error } = await supabase.schema('gps_compartilhado').from('gps_centros_resultado').insert([crData]);
                if (error) throw error;
            } catch (e) { console.error('Supabase DB error adding CR', e); throw e; }
        }

        // Update local state
        ControlState.fixedCRsObjects.push(crData);
        ControlState.fixedCRs.push(crData.cr_id);
        this.saveFixedCRs();
    },

    async updateCR(cr_id, crData) {
        if (window.supabase) {
            try {
                const { error } = await supabase.schema('gps_compartilhado').from('gps_centros_resultado').update(crData).eq('cr_id', cr_id);
                if (error) throw error;
            } catch (e) { console.error('Supabase DB error updating CR', e); throw e; }
        }

        // Update local state
        const objIndex = ControlState.fixedCRsObjects.findIndex(c => String(c.cr_id) === String(cr_id));
        if (objIndex >= 0) {
            ControlState.fixedCRsObjects[objIndex] = { ...ControlState.fixedCRsObjects[objIndex], ...crData };
        }
    },

    async deleteCR(cr_id) {
        if (window.supabase) {
            try {
                const { error } = await supabase.schema('gps_compartilhado').from('gps_centros_resultado').delete().eq('cr_id', cr_id);
                if (error) throw error;
            } catch (e) { console.error('Supabase DB error deleting CR', e); throw e; }
        }

        // Update local state
        ControlState.fixedCRsObjects = ControlState.fixedCRsObjects.filter(c => String(c.cr_id) !== String(cr_id));
        ControlState.fixedCRs = ControlState.fixedCRs.filter(c => String(c) !== String(cr_id));
        this.saveFixedCRs();
    },

    // Helpers
    mapToDB(r) {
        return {
            cr: r.cr,
            mes: r.mes,
            periodo: r.periodo,
            pedido: r.pedido,
            folha_registro: r.folhaRegistro,
            descricao: r.descricao,
            valor_medir: r.medir,
            data_aprovacao: r.dataAprovacao,
            data_envio: r.dataEnvio,
            valor_bm: r.valorBM,
            valor_glosa: r.valorGlosa,
            motivo_glosa: r.motivoGlosa,
            responsavel: r.responsavel,
            stage: r.stage,
            updated_at: new Date().toISOString(),
            updated_by: window.Auth && window.Auth.currentUser ? window.Auth.currentUser.nome : 'Sistema'
        };
    },
    mapFromDB(r) {
        return {
            id: r.id,
            cr: r.cr,
            mes: r.mes,
            periodo: r.periodo,
            pedido: r.pedido,
            folhaRegistro: r.folha_registro,
            descricao: r.descricao,
            medir: r.valor_medir,
            dataAprovacao: r.data_aprovacao,
            dataEnvio: r.data_envio,
            valorBM: r.valor_bm,
            valorGlosa: r.valor_glosa,
            motivoGlosa: r.motivo_glosa,
            responsavel: r.responsavel,
            stage: r.stage,
            updatedAt: r.updated_at,
            updatedBy: r.updated_by
        };
    }
};
