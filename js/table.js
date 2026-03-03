const TableView = {
  render() {
    const f = this.getFiltered();
    const tm = f.reduce((s, r) => s + (Number(r.medir) || 0), 0);
    const tg = f.reduce((s, r) => s + (parseFloat(r.valorGlosa) || 0), 0);

    let rows = '';
    if (f.length === 0) {
      rows = `<tr><td colspan="14" class="empty-td">Nenhum boletim encontrado para os filtros selecionados.</td></tr>`;
    } else {
      rows = f.map(r => {
        const s = stageObj(r.stage);

        let lastMod = '—';
        if (r.updatedBy) {
          let dtStr = '';
          if (r.updatedAt) {
            const dt = new Date(r.updatedAt);
            if (!isNaN(dt.valueOf())) {
              dtStr = ` (${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')})`;
            }
          }
          lastMod = `<div title="${r.updatedAt || ''}" style="font-size:10px;line-height:1.2;color:var(--text-2);white-space:nowrap;">${r.updatedBy}${dtStr}</div>`;
        }

        return `<tr>
        <td class="tc-cr">${(r.cr && r.cr.trim() !== '') ? r.cr : 'Sem CR'}</td>
        <td class="tc-gray">${r.mes || '—'}</td>
        <td class="tc-gray">${r.periodo || '—'}</td>
        <td><div class="tc-desc" title="${r.descricao}">${r.descricao}</div></td>
        <td class="tc-mono">${r.pedido || '—'}</td>
        <td class="tc-mono">${r.folhaRegistro || '—'}</td>
        <td class="tc-val r">${fmt(r.medir)}</td>
        <td class="tc-gray">${r.dataEnvio || '—'}</td>
        <td class="${r.valorBM ? 'tc-val' : 'tc-zero'} r">${r.valorBM ? fmt(r.valorBM) : '—'}</td>
        <td class="${r.valorGlosa ? 'tc-red tc-zero' : 'tc-zero'} r" title="${r.motivoGlosa || ''}">${r.valorGlosa ? fmt(r.valorGlosa) : '—'} ${r.motivoGlosa ? `<br/><span style="font-size:9px;color:var(--text-3);">${r.motivoGlosa}</span>` : ''}</td>
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
            <tr>
              ${this.th('CR', 'cr')}
              ${this.th('Mês', 'mes')}
              ${this.th('Período', 'periodo')}
              ${this.th('Descrição', 'descricao')}
              ${this.th('Pedido', 'pedido')}
              ${this.th('Folha Reg.', 'folhaRegistro')}
              ${this.th('Medir (R$)', '', 'r')}
              ${this.th('Dt. Envio', 'dataEnvio')}
              ${this.th('Val. BM', '', 'r')}
              ${this.th('Glosa', 'motivoGlosa', 'r')}
              ${this.th('Dt. Aprov.', 'dataAprovacao')}
              ${this.th('Etapa', 'stage')}
              ${this.th('Última Mod.', 'updatedBy')}
              ${this.th('Ações')}
            </tr>
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

  th(label, colId = '', classes = '') {
    const isActive = colId && ControlState.filters.cols && ControlState.filters.cols[colId] && ControlState.filters.cols[colId].length > 0;
    const iconColor = isActive ? 'var(--blue)' : 'currentColor';
    const btnClass = isActive ? 'col-filter-btn active' : 'col-filter-btn';

    let btn = '';
    if (colId) {
      btn = `<button class="${btnClass}" onclick="TableView.openColFilter(event, '${colId}')" title="Filtrar ${label}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5h14.25M6 9.75h8.25M9.75 15h0"/></svg>
      </button>`;
    }

    return `<th class="${classes}">
      <div class="th-wrap">
        <span>${label}</span>
        ${btn}
      </div>
    </th>`;
  },

  getFiltered() {
    const { crs, stages, meses, q, cols } = ControlState.filters;
    const lowerQ = (q || '').toLowerCase();

    return (ControlState.records || []).filter(r => {
      // Global top-bar filters
      const crVal = r.cr && r.cr.trim() !== '' ? String(r.cr) : 'Sem CR';
      const matchCR = !crs || crs.length === 0 || crs.includes(crVal);
      const matchStage = !stages || stages.length === 0 || stages.includes(String(r.stage));
      const matchMes = !meses || meses.length === 0 || meses.includes(String(r.mes));
      const matchQ = !lowerQ ||
        (r.descricao && r.descricao.toLowerCase().includes(lowerQ)) ||
        (r.pedido && r.pedido.includes(lowerQ)) ||
        (r.cr && r.cr.includes(lowerQ)) ||
        (r.mes && r.mes.toLowerCase().includes(lowerQ)) ||
        (r.folhaRegistro && r.folhaRegistro.includes(lowerQ));

      if (!(matchCR && matchStage && matchMes && matchQ)) return false;

      // Custom Excel-like column filters
      if (cols) {
        for (const colId in cols) {
          const selectedValues = cols[colId];
          if (selectedValues && selectedValues.length > 0) {
            const val = String(r[colId] || '');
            if (!selectedValues.includes(val)) return false;
          }
        }
      }

      return true;
    });
  },

  getFilteredForCol(targetColId) {
    const { crs, stages, meses, q, cols } = ControlState.filters;
    const lowerQ = (q || '').toLowerCase();

    return (ControlState.records || []).filter(r => {
      // Global top-bar filters
      const crVal = r.cr && r.cr.trim() !== '' ? String(r.cr) : 'Sem CR';
      const matchCR = !crs || crs.length === 0 || crs.includes(crVal);
      const matchStage = !stages || stages.length === 0 || stages.includes(String(r.stage));
      const matchMes = !meses || meses.length === 0 || meses.includes(String(r.mes));
      const matchQ = !lowerQ ||
        (r.descricao && r.descricao.toLowerCase().includes(lowerQ)) ||
        (r.pedido && r.pedido.includes(lowerQ)) ||
        (r.cr && r.cr.includes(lowerQ)) ||
        (r.mes && r.mes.toLowerCase().includes(lowerQ)) ||
        (r.folhaRegistro && r.folhaRegistro.includes(lowerQ));

      if (!(matchCR && matchStage && matchMes && matchQ)) return false;

      // Custom Excel-like column filters (EXCEPT targetColId)
      if (cols) {
        for (const colId in cols) {
          if (colId === targetColId) continue;
          const selectedValues = cols[colId];
          if (selectedValues && selectedValues.length > 0) {
            const val = String(r[colId] || '');
            if (!selectedValues.includes(val)) return false;
          }
        }
      }

      return true;
    });
  },

  openColFilter(e, colId) {
    e.stopPropagation();

    const existing = document.getElementById('cf-menu');
    if (existing) existing.remove();

    // Get distinct values for this column based on records ALREADY filtered by OTHER filters
    const baseRecs = this.getFilteredForCol(colId);
    let distinct = [...new Set(baseRecs.map(r => String(r[colId] || '')))].sort();

    if (colId === 'cr') {
      distinct = [...new Set(baseRecs.map(r => r.cr ? r.cr.trim() : 'Sem CR'))].sort((a, b) => {
        if (a === 'Sem CR') return 1;
        if (b === 'Sem CR') return -1;
        return a.localeCompare(b);
      });
    }

    const selected = (ControlState.filters.cols && ControlState.filters.cols[colId]) || [];

    const mx = e.clientX;
    const my = e.clientY + 15;

    const menu = document.createElement('div');
    menu.id = 'cf-menu';
    menu.className = 'col-filter-menu';
    menu.style.left = mx + 'px';
    menu.style.top = my + 'px';

    // Keep it on screen
    setTimeout(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 10) + 'px';
    }, 0);

    const searchId = `cfs-${colId}`;
    const listId = `cfl-${colId}`;

    menu.innerHTML = `
      <input type="text" id="${searchId}" class="cf-search" placeholder="Buscar..." />
      <div class="cf-list" id="${listId}">
        ${distinct.map((v) => {
      const chk = selected.includes(v) ? 'checked' : '';
      const label = v === '' ? '(Vazio)' : (colId === 'stage' ? stageObj(v).label : v);
      return '<label class="cf-item" title="' + label.replace(/"/g, '&quot;') + '">' +
        '<input type="checkbox" value="' + v.replace(/"/g, '&quot;') + '" ' + chk + ' />' +
        '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + label + '</span>' +
        '</label>';
    }).join('')}
      </div>
      <div class="cf-actions">
        <button class="cf-btn" onclick="TableView.clearColFilter('${colId}')">Limpar</button>
        <button class="cf-btn primary" onclick="TableView.applyColFilter('${colId}')">Aplicar</button>
      </div>
    `;

    document.body.appendChild(menu);

    // Focus Search and Bind Search Event
    const searchEl = document.getElementById(searchId);
    const listEl = document.getElementById(listId);
    if (searchEl && listEl) {
      searchEl.focus();
      searchEl.addEventListener('input', (ev) => {
        const q = ev.target.value.toLowerCase();
        const items = listEl.querySelectorAll('.cf-item');
        items.forEach(item => {
          const txt = item.textContent.toLowerCase();
          item.style.display = txt.includes(q) ? 'flex' : 'none';
        });
      });
    }

    // Close on outside click
    const closeHandler = (ev) => {
      if (!menu.contains(ev.target) && !ev.target.closest('.col-filter-btn')) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  },

  applyColFilter(colId) {
    const menu = document.getElementById('cf-menu');
    if (!menu) return;

    const checkboxes = menu.querySelectorAll('.cf-item input[type="checkbox"]:checked');
    const totalCheckboxes = menu.querySelectorAll('.cf-item input[type="checkbox"]').length;

    const vals = Array.from(checkboxes).map(c => c.value);

    if (!ControlState.filters.cols) ControlState.filters.cols = {};

    if (vals.length === totalCheckboxes || vals.length === 0) {
      // All selected or None selected = no filter
      ControlState.filters.cols[colId] = [];
    } else {
      ControlState.filters.cols[colId] = vals;
    }

    menu.remove();
    window.App.renderCurrentView();
  },

  clearColFilter(colId) {
    if (ControlState.filters.cols && ControlState.filters.cols[colId]) {
      ControlState.filters.cols[colId] = [];
    }
    const menu = document.getElementById('cf-menu');
    if (menu) menu.remove();
    window.App.renderCurrentView();
  }
};
