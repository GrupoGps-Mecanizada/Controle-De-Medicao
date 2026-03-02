const SLAView = {
    render() {
        const records = ControlState.records || [];
        const active = records.filter(r => r.stage !== 'concluido');
        const sd = active.map(r => ({ ...r, sla: this.slaCalc(r) }));
        const okN = sd.filter(r => r.sla.status === 'ok').length;
        const wN = sd.filter(r => r.sla.status === 'warn').length;
        const dN = sd.filter(r => r.sla.status === 'danger').length;
        const cp = active.length ? Math.round(okN / active.length * 100) : 100;

        const kpis = `<div class="kpi-row">
      <div class="kpi kg"><div class="klabel">Conformidade SLA</div><div class="kvalue n" style="color:var(--success)">${cp}%</div><div class="kfoot">${okN} de ${active.length} BMs ativos no prazo</div></div>
      <div class="kpi kt"><div class="klabel">Dentro do Prazo</div><div class="kvalue n" style="color:var(--teal)">${okN}</div><div class="kfoot">BMs com SLA OK</div></div>
      <div class="kpi kw"><div class="klabel">Em Alerta</div><div class="kvalue n" style="color:var(--warning)">${wN}</div><div class="kfoot">≥ 75% do prazo consumido</div></div>
      <div class="kpi kr"><div class="klabel">Fora do Prazo</div><div class="kvalue n" style="color:var(--danger)">${dN}</div><div class="kfoot">SLA expirado</div></div>
    </div>`;

        const blocks = STAGES.filter(s => s.id !== 'concluido').map(s => {
            const items = sd.filter(r => r.stage === s.id); if (!items.length) return '';
            const late = items.filter(r => r.sla.status === 'danger').length;

            const rows = items.map(r => {
                const { status, days, max, pct, label } = r.sla;
                const barC = status === 'ok' ? 'var(--success)' : status === 'warn' ? 'var(--warning)' : 'var(--danger)';
                return `<tr>
          <td class="tc-cr">${r.cr}</td>
          <td><div class="tc-desc" title="${r.descricao}">${r.descricao}</div></td>
          <td class="tc-mono" style="font-size:11.5px">${r.pedido}</td>
          <td class="tc-val r">${fmt(r.medir)}</td>
          <td class="tc-gray">${r.dataAprovacao || '—'}</td>
          <td style="text-align:center"><span class="sla-days sla-${status}">${label}</span></td>
          <td>${max ? `<div style="display:flex;align-items:center;gap:8px"><div class="sla-bar-bg" style="flex:1"><div class="sla-bar-f" style="width:${pct}%;background:${barC}"></div></div><span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text-3);white-space:nowrap">${days}/${max}d</span></div>` : '—'}</td>
          <td class="tc-act">
            <button class="btn bd bxs" onclick="window.App.openEdit('${r.id}')">Editar</button>
            <button class="btn bd bxs" onclick="window.App.advanceStage('${r.id}')">Avançar →</button>
          </td>
        </tr>`;
            }).join('');

            return `<div class="tcard" style="margin-bottom:14px">
        <div class="thead-bar">
          <div style="display:flex;align-items:center;gap:8px"><span style="width:7px;height:7px;border-radius:50%;background:${s.color};display:inline-block"></span><div class="tsect">${s.label}</div></div>
          <div style="display:flex;align-items:center;gap:10px"><span style="font-size:11px;color:var(--text-3)">${items.length} boletins · SLA ${s.sla}d</span><span class="badge" style="background:${late > 0 ? 'rgba(239,68,68,0.1)' : s.bg};color:${late > 0 ? 'var(--danger)' : s.color}">${late > 0 ? late + ' atrasado(s)' : 'Dentro do prazo'}</span></div>
        </div>
        <div class="tscroll"><table><thead><tr><th>CR</th><th>Descrição</th><th>Pedido</th><th class="r">Valor</th><th>Dt. Aprov.</th><th style="text-align:center">Dias na Etapa</th><th>Progresso SLA</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
        }).join('');

        const cnl = records.filter(r => r.stage === 'concluido');
        let cBox = '';
        if (cnl.length > 0) {
            cBox = `<div class="tcard" style="padding:13px 18px;display:flex;align-items:center;gap:14px;margin-bottom:14px;">
        <span style="width:7px;height:7px;border-radius:50%;background:var(--teal);flex-shrink:0"></span>
        <div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--teal)">Planilhas Concluídas</div><div style="font-size:12px;color:var(--text-3);margin-top:2px">${cnl.length} boletins · ${fmt(cnl.reduce((s, r) => s + (Number(r.medir) || 0), 0))}</div></div>
        <span class="badge" style="background:rgba(20,184,166,0.1);color:var(--teal);margin-left:auto">SLA Encerrado</span>
      </div>`;
        }

        const container = document.getElementById('sla-view');
        if (container) container.innerHTML = kpis + blocks + cBox;
    },

    slaCalc(r) {
        const s = stageObj(r.stage);
        if (r.stage === 'concluido') return { status: 'ok', days: 0, max: null, pct: 100, label: 'Concluído' };
        if (!s.sla) return { status: 'neut', days: null, max: null, pct: null, label: '—' };
        const apDate = parsePtDate(r.dataAprovacao);
        if (!apDate) return { status: 'neut', days: null, max: null, pct: null, label: 'Sem data' };

        // In legacy, it used apDate plus some offsets for calculating entry date
        const offsets = [10, 7, 5, 3, 1, 0];
        const sIdx = STAGES.findIndex(st => st.id === r.stage);
        const entry = new Date(apDate); entry.setDate(entry.getDate() + (offsets[sIdx] || 0));

        const days = Math.max(0, daysBetween(entry, today()));
        const max = s.sla, pct = Math.min(100, Math.round(days / max * 100));

        let status = 'ok';
        if (pct >= 100) status = 'danger';
        else if (pct >= 75) status = 'warn';

        return { status, days, max, pct, label: days === 0 ? 'Hoje' : days === 1 ? '1 dia' : `${days} dias` };
    }
};
