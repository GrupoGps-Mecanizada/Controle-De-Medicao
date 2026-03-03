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


        // Pareto
        const glosasPorMotivo = {};
        let totalGlosaValid = 0;
        records.forEach(r => {
            const v = parseFloat(r.valorGlosa) || 0;
            if (v > 0) {
                totalGlosaValid += v;
                const m = r.motivoGlosa || 'Não especificado';
                glosasPorMotivo[m] = (glosasPorMotivo[m] || 0) + v;
            }
        });
        const paretoGlosas = Object.entries(glosasPorMotivo)
            .map(([motivo, valor]) => ({ motivo, valor }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 5);

        let paretoHtml = `<div style="padding:15px;background:var(--bg-1);border:1px solid var(--border);border-radius:8px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:12px;">TOP 5 MOTIVOS DE GLOSA</div>`;
        if (paretoGlosas.length === 0) {
            paretoHtml += `<div style="font-size:12px;color:var(--text-3);text-align:center;padding:20px 0;">Nenhuma glosa registrada</div>`;
        } else {
            paretoHtml += `<div style="display:flex;flex-direction:column;gap:8px;">` + paretoGlosas.map(p => {
                const pct = totalGlosaValid > 0 ? Math.round((p.valor / totalGlosaValid) * 100) : 0;
                return `
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;">
                        <span style="color:var(--text-1);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:65%;" title="${p.motivo}">${p.motivo}</span>
                        <span style="color:var(--danger);font-weight:700;">${fmt(p.valor)} (${pct}%)</span>
                    </div>
                    <div style="background:var(--bg-2);height:6px;border-radius:3px;overflow:hidden;">
                        <div style="background:var(--danger);height:100%;width:${pct}%"></div>
                    </div>
                </div>`;
            }).join('') + `</div>`;
        }
        paretoHtml += `</div>`;

        // Evolução Mensal
        const dataMensal = {};
        records.forEach(r => {
            if (r.mes) {
                if (!dataMensal[r.mes]) dataMensal[r.mes] = { medir: 0, faturado: 0 };
                dataMensal[r.mes].medir += (Number(r.medir) || 0);
                if (r.stage === 'faturado') {
                    dataMensal[r.mes].faturado += (Number(r.medir) || 0);
                }
            }
        });

        const monthOrder = { 'Jan': 1, 'Fev': 2, 'Mar': 3, 'Abr': 4, 'Mai': 5, 'Jun': 6, 'Jul': 7, 'Ago': 8, 'Set': 9, 'Out': 10, 'Nov': 11, 'Dez': 12 };
        const mesesKey = Object.keys(dataMensal).sort((a, b) => {
            const [ma, ya] = a.split('/');
            const [mb, yb] = b.split('/');
            if (ya !== yb) return parseInt(ya || 0) - parseInt(yb || 0);
            return (monthOrder[ma] || 0) - (monthOrder[mb] || 0);
        });

        const maxVal = Math.max(...mesesKey.map(m => dataMensal[m].medir), 1000);

        let evolucaoHtml = `<div style="padding:15px;background:var(--bg-1);border:1px solid var(--border);border-radius:8px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:12px;">EVOLUÇÃO MENSAL (Medir vs Faturado)</div>`;
        if (mesesKey.length === 0) {
            evolucaoHtml += `<div style="font-size:12px;color:var(--text-3);text-align:center;padding:20px 0;">Sem dados para o período</div>`;
        } else {
            evolucaoHtml += `<div style="display:flex;gap:12px;align-items:flex-end;height:95px;padding-top:10px;overflow-x:auto;">`;
            mesesKey.forEach(m => {
                const d = dataMensal[m];
                const pctMedir = Math.max((d.medir / maxVal) * 100, 2);
                const pctFat = Math.max((d.faturado / maxVal) * 100, 0);
                evolucaoHtml += `
                 <div style="display:flex;flex-direction:column;align-items:center;min-width:36px;gap:4px;height:100%;justify-content:flex-end;">
                     <div style="position:relative;width:24px;height:100%;display:flex;align-items:flex-end;justify-content:center;">
                         <div style="position:absolute;bottom:0;width:100%;height:${pctMedir}%;background:var(--blue);opacity:0.3;border-radius:3px 3px 0 0;" title="A Medir: ${fmt(d.medir)}"></div>
                         <div style="position:absolute;bottom:0;width:100%;height:${pctFat}%;background:var(--success);border-radius:3px 3px 0 0;" title="Faturado: ${fmt(d.faturado)}"></div>
                     </div>
                     <span style="font-size:9px;color:var(--text-3);white-space:nowrap;">${m}</span>
                 </div>`;
            });
            evolucaoHtml += `</div>
             <div style="display:flex;gap:12px;margin-top:12px;font-size:10px;color:var(--text-3);justify-content:center;">
                <div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;background:var(--blue);opacity:0.3;border-radius:2px;"></div> A Medir</div>
                <div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;background:var(--success);border-radius:2px;"></div> Faturado</div>
             </div>`;
        }
        evolucaoHtml += `</div>`;

        // Quality and Ranking
        const respMap = {};
        records.forEach(r => {
            const res = r.responsavel || 'Não Atribuído';
            if (!respMap[res]) respMap[res] = { count: 0, valor: 0 };
            respMap[res].count++;
            respMap[res].valor += (Number(r.medir) || 0);
        });
        const respList = Object.entries(respMap).sort((a, b) => b[1].valor - a[1].valor);
        const maxRespVal = Math.max(...respList.map(x => x[1].valor), 1000);

        let respHtml = `<div style = "padding:15px;background:var(--bg-1);border:1px solid var(--border);border-radius:8px;" >
                <div style="font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:12px;">RANKING POR RESPONSÁVEL</div>`;
        if (respList.length === 0) {
            respHtml += `<div style = "font-size:12px;color:var(--text-3);text-align:center;padding:20px 0;" > Nenhum responsável encontrado</div>`;
        } else {
            respHtml += `<div style = "display:flex;flex-direction:column;gap:8px;" > ` + respList.slice(0, 5).map(p => {
                const pct = Math.round((p[1].valor / maxRespVal) * 100);
                return `
            <div style = "display:flex;flex-direction:column;gap:4px;" >
                    <div style="display:flex;justify-content:space-between;font-size:11px;">
                        <span style="color:var(--text-1);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:65%;" title="${p[0]}">${p[0]} (${p[1].count} BMs)</span>
                        <span style="color:var(--text-1);font-weight:700;">${fmt(p[1].valor)}</span>
                    </div>
                    <div style="background:var(--bg-2);height:6px;border-radius:3px;overflow:hidden;">
                        <div style="background:var(--blue);height:100%;width:${pct}%"></div>
                    </div>
                </div>`;
            }).join('') + `</div>`;
        }
        respHtml += `</div>`;

        const graphsRow = `<div style = "display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:15px;margin-bottom:20px;margin-top:15px;" >
    ${evolucaoHtml}
            ${paretoHtml}
            ${respHtml}
        </div>`;

        // Riscos & KPIs extras
        // Current workflow configuration doesn't have 'aguardando_aprovacao' anymore, just 'enviado'.
        const valRisco = records.filter(r => r.stage === 'enviado').reduce((s, r) => s + (Number(r.medir) || 0), 0);
        const completos = records.filter(r => r.dataEnvio && r.dataEnvio.trim() !== '' && r.valorBM && String(r.valorBM).trim() !== '').length;
        const completudePct = n ? Math.round((completos / n) * 100) : 0;

        const html = `<div class="kpi-row" style = "display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:10px;" >
      <div class="kpi kb"><div class="klabel">Volume Total (A Medir)</div><div class="kvalue md">${fmt(totalGeral)}</div><div class="kfoot">${n} boletins / pipeline</div></div>
      <div class="kpi kg"><div class="klabel">Faturado</div><div class="kvalue md">${fmt(totalFaturado)}</div><div class="kfoot">${records.filter(r => r.stage === 'faturado').length} BMs faturados</div></div>
      <div class="kpi kw"><div class="klabel">Em Andamento</div><div class="kvalue md">${fmt(totalAndamento)}</div><div class="kfoot">${records.filter(r => r.stage !== 'faturado').length} BMs pendentes</div></div>
      <div class="kpi kr"><div class="klabel">Glosas Total</div><div class="kvalue md">${totalGlosa > 0 ? fmt(totalGlosa) : 'R$\u00a00,00'}</div><div class="kfoot">Perdas financeiras</div></div>
    </div>
    
    <div class="kpi-row" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:20px;">
      <div class="kpi" style="background:var(--bg-2);border-color:var(--warning);"><div class="klabel">Receita em Risco</div><div class="kvalue md" style="color:var(--warning);">${fmt(valRisco)}</div><div class="kfoot">Não aprovados (Env./Ag.Aprov.)</div></div>
      <div class="kpi" style="background:var(--bg-2)"><div class="klabel">Taxa de Conversão</div><div class="kvalue md" style="color:var(--text-1)">${totalGeral > 0 ? Math.round((totalFaturado / totalGeral) * 100) : 0}%</div><div class="kfoot">Faturado vs Total</div></div>
      <div class="kpi" style="background:var(--bg-2)"><div class="klabel">Qualidade do Preenchimento</div><div class="kvalue md" style="color:var(--text-1)">${completudePct}%</div><div class="kfoot">Com Data Envio e Valor BM</div></div>
    </div>

    <div class="pipeline">${STAGES.map((s, i) => {
            const c = records.filter(r => r.stage === s.id).length;
            const p = n ? Math.round(c / n * 100) : 0;
            return `<div class="ps"><div class="ps-n" style="color:${s.color}">${c}</div><div class="ps-b"><div class="ps-f" style="width:${p}%;background:${s.color}"></div></div><div class="ps-l">${s.short}</div></div>`;
        }).join('')}</div>
    ${graphsRow}
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
