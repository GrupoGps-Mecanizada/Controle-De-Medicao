const API = {
    async loadRecords() {
        // For now try Supabase, if missing/fail fallback to INIT
        if (window.supabase) {
            try {
                const { data, error } = await supabase.from('boletins_medicao').select('*');
                if (error) throw error;
                if (data && data.length > 0) {
                    ControlState.records = data.map(this.mapFromDB);
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
                const { data: inserted, error } = await supabase.from('boletins_medicao').insert([dbRow]).select();
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
                await supabase.from('boletins_medicao').update(this.mapToDB(data)).eq('id', id);
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
                await supabase.from('boletins_medicao').delete().eq('id', id);
            } catch (e) { console.error('Supabase DB error', e); }
        }
        ControlState.records = ControlState.records.filter(r => String(r.id) !== String(id));
        this.saveRecords();
    },

    // Helpers
    mapToDB(r) {
        return {
            cr: r.cr,
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
            stage: r.stage
        };
    },
    mapFromDB(r) {
        return {
            id: r.id,
            cr: r.cr,
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
            stage: r.stage
        };
    }
};
