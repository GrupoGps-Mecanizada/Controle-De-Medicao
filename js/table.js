const TableView = {
  render() {
    const f = this.getFiltered();
    const tm = f.reduce((s, r) => s + (Number(r.medir) || 0), 0);
    const tg = f.reduce((s, r) => s + (parseFloat(r.valorGlosa) || 0), 0);

    let rows = '';
    if (f.length === 0) {
      rows = `<tr><td colspan="13" class="empty-td">Nenhum boletim encontrado para os filtros selecionados.</td></tr>`;
    } else {
      const matchMes = !mes || mes === 'all' || r.mes === String(mes);
      const matchQ = !lowerQ ||
        (r.descricao && r.descricao.toLowerCase().includes(lowerQ)) ||
        (r.pedido && r.pedido.includes(lowerQ)) ||
        (r.cr && r.cr.includes(lowerQ)) ||
        (r.mes && r.mes.toLowerCase().includes(lowerQ)) ||
        (r.folhaRegistro && r.folhaRegistro.includes(lowerQ));

      let lastMod = '—';
      if (r.updatedBy) {
        let dtStr = '';
        if (r.updatedAt) {
          const dt = new Date(r.updatedAt);
          if (!isNaN(dt.valueOf())) {
            dtStr = ` (${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')})`;
          }
        }
        lastMod = `<div title="${r.updatedAt || ''}" style="font-size:10px;line-height:1.2;color:var(--text-2)">${r.updatedBy}${dtStr}</div>`;
      }

      return `<tr>
        <td class="tc-cr">${r.cr}</td>
        <td class="tc-gray">${r.mes || '—'}</td>
        <td class="tc-gray">${r.periodo || '—'}</td>
        <td><div class="tc-desc" title="${r.descricao}">${r.descricao}</div></td>
        <td class="tc-mono">${r.pedido || '—'}</td>
        <td class="tc-mono">${r.folhaRegistro || '—'}</td>
        <td class="tc-val r">${fmt(r.medir)}</td>
        <td class="tc-gray">${r.dataEnvio || '—'}</td>
        <td class="${r.valorBM ? 'tc-val' : 'tc-zero'} r">${r.valorBM ? fmt(r.valorBM) : '—'}</td>
        <td class="${r.valorGlosa ? 'tc-red tc-zero' : 'tc-zero'} r">${r.valorGlosa ? fmt(r.valorGlosa) : '—'}</td>
        <td class="tc-gray">${r.dataAprovacao || '—'}</td>
        <td><span class="badge" style="background:${s ? s.bg : '#ccc'};color:${s ? s.color : '#333'}">${s ? s.label : 'Desconhecido'}</span></td>
        <td>${lastMod}</td>
        <td class="tc-act">
          <button class="btn bd bxs" onclick="window.App.openEdit('${r.id}')">Editar</button>
          <button class="bdel" onclick="window.App.deleteRecord('${r.id}')">✕</button>
        </td>
      </tr>`}).join('');
}

const html = `<div class="tcard">
      <div class="thead-bar">
        <div class="tsect">Boletins de Medição</div>
        <div style="font-size:11px;color:var(--text-3)">${f.length} registros</div>
      </div>
      <div class="tscroll">
        <table>
          <thead>
            <tr><th>CR</th><th>Mês</th><th>Período</th><th>Descrição</th><th>Pedido</th><th>Folha Reg.</th><th class="r">Medir (R$)</th><th>Dt. Envio</th><th class="r">Val. BM</th><th class="r">Glosa</th><th>Dt. Aprov.</th><th>Etapa</th><th>Última Mod.</th><th>Ações</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="tfoot">
        <div class="tfl"><strong>${f.length}</strong> boletins</div>
        <div class="tfl">Total a medir: <strong>${fmt(tm)}</strong></div>
        ${tg > 0 ? `<div class="tfl red">Glosas: <strong>${fmt(tg)}</strong></div>` : ''}
      </div>
    </div>`;

const container = document.getElementById('table-view');
if (container) container.innerHTML = html;
  },

getFiltered() {
  const { cr, stage, mes, q } = ControlState.filters;
  const lowerQ = (q || '').toLowerCase();
  return (ControlState.records || []).filter(r => {
    const matchCR = !cr || cr === 'all' || r.cr === String(cr);
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
