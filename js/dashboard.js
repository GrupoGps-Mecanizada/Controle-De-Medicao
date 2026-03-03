const Dashboard = {
    render() {
        const records = this.getFiltered() || [];
        const n = records.length;

        // KPI Calculations
        const totalGeral = records.reduce((s, r) => s + (Number(r.medir) || 0), 0);
        const totalFaturado = records.filter(r => r.stage === 'faturado').reduce((s, r) => s + (Number(r.medir) || 0), 0);
        const totalAndamento = totalGeral - totalFaturado;
        const totalGlosa = records.reduce((s, r) => s + (parseFloat(r.valorGlosa) || 0), 0);

        // Get unique CRs including fixed CRs, and handle empty CRs
        const recordCRs = records.map(r => r.cr ? r.cr.trim() : 'Sem CR');
        const crs = [...new Set([...recordCRs, ...(window.ControlState.fixedCRs || [])])].sort((a, b) => {
            if (a === 'Sem CR') return 1;
            if (b === 'Sem CR') return -1;
            return a.localeCompare(b);
        });


        const html = `<div class="kpi-row">
      <div class="kpi kb"><div class="klabel">Total Geral</div><div class="kvalue md">${fmt(totalGeral)}</div><div class="kfoot">${n} boletins cadastrados</div></div>
      <div class="kpi kw"><div class="klabel">Em Andamento</div><div class="kvalue md">${fmt(totalAndamento)}</div><div class="kfoot">${records.filter(r => r.stage !== 'faturado').length} BMs pendentes</div></div>
      <div class="kpi kg"><div class="klabel">Faturado</div><div class="kvalue md">${fmt(totalFaturado)}</div><div class="kfoot">${records.filter(r => r.stage === 'faturado').length} BMs faturados</div></div>
      <div class="kpi kr"><div class="klabel">Glosas</div><div class="kvalue md">${totalGlosa > 0 ? fmt(totalGlosa) : 'R$\u00a00,00'}</div><div class="kfoot">Valor glosado acumulado</div></div>
    </div>
    <div class="pipeline">${STAGES.map((s, i) => {
            const c = records.filter(r => r.stage === s.id).length;
            const p = n ? Math.round(c / n * 100) : 0;
            return `<div class="ps"><div class="ps-n" style="color:${s.color}">${c}</div><div class="ps-b"><div class="ps-f" style="width:${p}%;background:${s.color}"></div></div><div class="ps-l">${s.short}</div></div>`;
        }).join('')}</div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:10px;margin-top:20px;">Situação por CR</div>
    <div class="cr-grid">${crs.map(cr => {
            const rs = records.filter(r => (r.cr ? r.cr.trim() : 'Sem CR') === cr);
            const mTot = rs.reduce((s, r) => s + (Number(r.medir) || 0), 0);
            const mGl = rs.reduce((s, r) => s + (parseFloat(r.valorGlosa) || 0), 0);
            const fat = rs.filter(r => r.stage === 'faturado').length;
            const pct = rs.length ? Math.round(fat / rs.length * 100) : 0;

            const pills = STAGES.map(s => {
                const c = rs.filter(r => r.stage === s.id).length;
                if (c > 0) return `<span class="spill" style="background:${s.bg};color:${s.color}">${c} ${s.short}</span>`;
                return '';
            }).join('');

            return `<div class="crc" onclick="Navigation.drillCR('${cr}')">
        <div class="crc-h"><div class="crc-name">CR ${cr}</div><span class="crc-cnt">${rs.length} BMs</span></div>
        <div class="crc-tot">${fmt(mTot)}</div>
        ${mGl > 0 ? `<div class="crc-gl">Glosa: ${fmt(mGl)}</div>` : '<div class="crc-nogl"></div>'}
        <div class="prog-h"><span>Faturamento</span><span class="prog-pct">${pct}%</span></div>
        <div class="prog-bg"><div class="prog-f" style="width:${pct}%"></div></div>
        <div class="spills">${pills}</div>
      </div>`;
        }).join('')}</div>`;

        const container = document.getElementById('dashboard-view');
        if (container) container.innerHTML = html;
    },

    getFiltered() {
        const { cr, stage, mes, q } = ControlState.filters;
        const lowerQ = (q || '').toLowerCase();
        return (ControlState.records || []).filter(r => {
            const matchCR = !cr || cr === 'all' || r.cr === String(cr) || (cr === 'Sem CR' && (!r.cr || r.cr.trim() === ''));
            const matchStage = !stage || stage === 'all' || r.stage === String(stage);
            const matchMes = !mes || mes === 'all' || r.mes === String(mes);
            const matchQ = !lowerQ ||
                (r.descricao && r.descricao.toLowerCase().includes(lowerQ)) ||
                (r.pedido && r.pedido.includes(lowerQ)) ||
                (r.cr && r.cr.includes(lowerQ)) ||
                (r.mes && r.mes.toLowerCase().includes(lowerQ)) ||
                (r.folhaRegistro && r.folhaRegistro.includes(lowerQ));
            return matchCR && matchStage && matchMes && matchQ;
        });
    }
};
