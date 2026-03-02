const Dashboard = {
    render() {
        const records = ControlState.records || [];
        const tot = records.reduce((s, r) => s + (Number(r.medir) || 0), 0);
        const gl = records.reduce((s, r) => s + (parseFloat(r.valorGlosa) || 0), 0);
        const apv = records.filter(r => r.stage === 'aprovado' || r.stage === 'concluido').length;
        const cnl = records.filter(r => r.stage === 'concluido').length;
        const n = records.length;

        // Get unique CRs
        const crs = [...new Set(records.map(r => r.cr))].sort();

        const html = `<div class="kpi-row">
      <div class="kpi kb"><div class="klabel">Total a Medir</div><div class="kvalue md">${fmt(tot)}</div><div class="kfoot">${n} boletins cadastrados</div></div>
      <div class="kpi kr"><div class="klabel">Total de Glosas</div><div class="kvalue md">${gl > 0 ? fmt(gl) : 'R$\u00a00,00'}</div><div class="kfoot">Valor glosado acumulado</div></div>
      <div class="kpi kg"><div class="klabel">BMs Aprovados</div><div class="kvalue n">${apv}</div><div class="kfoot">de ${n} total · ${n ? Math.round(apv / n * 100) : 0}%</div></div>
      <div class="kpi kt"><div class="klabel">Concluídos</div><div class="kvalue n">${cnl}</div><div class="kfoot">${n ? Math.round(cnl / n * 100) : 0}% do pipeline total</div></div>
    </div>
    <div class="pipeline">${STAGES.map((s, i) => {
            const c = records.filter(r => r.stage === s.id).length;
            const p = n ? Math.round(c / n * 100) : 0;
            return `<div class="ps"><div class="ps-n" style="color:${s.color}">${c}</div><div class="ps-b"><div class="ps-f" style="width:${p}%;background:${s.color}"></div></div><div class="ps-l">${s.short}</div></div>`;
        }).join('')}</div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:10px;margin-top:20px;">Situação por CR</div>
    <div class="cr-grid">${crs.map(cr => {
            const rs = records.filter(r => r.cr === cr);
            const mTot = rs.reduce((s, r) => s + (Number(r.medir) || 0), 0);
            const mGl = rs.reduce((s, r) => s + (parseFloat(r.valorGlosa) || 0), 0);
            const cl = rs.filter(r => r.stage === 'concluido').length;
            const pct = rs.length ? Math.round(cl / rs.length * 100) : 0;

            const pills = STAGES.map(s => {
                const c = rs.filter(r => r.stage === s.id).length;
                if (c > 0) return `<span class="spill" style="background:${s.bg};color:${s.color}">${c} ${s.short}</span>`;
                return '';
            }).join('');

            return `<div class="crc" onclick="Navigation.drillCR('${cr}')">
        <div class="crc-h"><div class="crc-name">CR ${cr}</div><span class="crc-cnt">${rs.length} BMs</span></div>
        <div class="crc-tot">${fmt(mTot)}</div>
        ${mGl > 0 ? `<div class="crc-gl">Glosa: ${fmt(mGl)}</div>` : '<div class="crc-nogl"></div>'}
        <div class="prog-h"><span>Conclusão</span><span class="prog-pct">${pct}%</span></div>
        <div class="prog-bg"><div class="prog-f" style="width:${pct}%"></div></div>
        <div class="spills">${pills}</div>
      </div>`;
        }).join('')}</div>`;

        const container = document.getElementById('dashboard-view');
        if (container) container.innerHTML = html;
    }
};
