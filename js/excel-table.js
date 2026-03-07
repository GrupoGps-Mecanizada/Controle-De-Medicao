'use strict';

/**
 * Excel Table Pro — Controle de Medição
 * Filtros flutuantes por coluna, seleção múltipla, paginação,
 * export XLSX, fullscreen, busca com highlight.
 * Mantém compatibilidade com TableView.getFiltered() e TableView.render()
 */
window.TableView = {

    /* ─── Estado interno ──────────────────────────────────────────── */
    _state: {
        page: 1,
        pageSize: 100,
        sortCol: 'mes',
        sortAsc: false,
        selected: new Set(),
        highlightText: '',
        hiddenCols: new Set(['motivoGlosa', 'responsavel', 'updatedBy']),
        showColPicker: false,
        expanded: false,
        filterPanel: null, // { col, x, y }
    },

    _docClickCB: null,
    _fpClickCB: null,

    /* ─── Definição de colunas ────────────────────────────────────── */
    _columns: [
        { key: '__checkbox',     label: '',               type: 'checkbox',  filterable: false, editable: false, sortable: false, alwaysVisible: true },
        { key: 'cr',             label: 'CR',             type: 'text',      filterable: true,  editable: false, sortable: true  },
        { key: 'mes',            label: 'Mês',            type: 'text',      filterable: true,  editable: false, sortable: true  },
        { key: 'periodo',        label: 'Período',        type: 'text',      filterable: false, editable: false, sortable: false },
        { key: 'descricao',      label: 'Descrição',      type: 'text',      filterable: false, editable: true,  sortable: true  },
        { key: 'pedido',         label: 'Pedido',         type: 'text',      filterable: true,  editable: false, sortable: true  },
        { key: 'folhaRegistro',  label: 'Folha Reg.',     type: 'text',      filterable: true,  editable: false, sortable: true  },
        { key: 'medir',          label: 'Medir (R$)',     type: 'currency',  filterable: false, editable: true,  sortable: true  },
        { key: 'dataAprovacao',  label: 'Dt. Aprov.',     type: 'date',      filterable: false, editable: false, sortable: true  },
        { key: 'dataEnvio',      label: 'Dt. Envio',      type: 'date',      filterable: false, editable: false, sortable: true  },
        { key: 'valorBM',        label: 'Val. BM (R$)',   type: 'currency',  filterable: false, editable: true,  sortable: true  },
        { key: 'valorGlosa',     label: 'Glosa (R$)',     type: 'currency',  filterable: false, editable: true,  sortable: true  },
        { key: 'totalFaturado',  label: 'Total Fat. (R$)',type: 'computed',  filterable: false, editable: false, sortable: true  },
        { key: 'motivoGlosa',    label: 'Motivo Glosa',   type: 'text',      filterable: true,  editable: false, sortable: true  },
        { key: 'responsavel',    label: 'Responsável',    type: 'text',      filterable: true,  editable: true,  sortable: true  },
        { key: 'stage',          label: 'Etapa',          type: 'select',    filterable: true,  editable: false, sortable: true  },
        { key: 'updatedBy',      label: 'Última Mod.',    type: 'info',      filterable: false, editable: false, sortable: false },
        { key: '__actions',      label: '',               type: 'actions',   filterable: false, editable: false, sortable: false, alwaysVisible: true },
    ],

    /* ─── Helpers ─────────────────────────────────────────────────── */
    _visibleColumns() {
        return this._columns.filter(c => c.alwaysVisible || !this._state.hiddenCols.has(c.key));
    },

    _isFiltered(colKey) {
        const cols = ControlState.filters.cols || {};
        const v = cols[colKey];
        if (!v) return false;
        if (Array.isArray(v)) return v.length > 0;
        return v !== '';
    },

    _activeColFiltersCount() {
        const cols = ControlState.filters.cols || {};
        return Object.keys(cols).filter(k => this._isFiltered(k)).length;
    },

    _getStageOptions() {
        return (typeof STAGES !== 'undefined') ? STAGES.map(s => s.id) : [];
    },

    _hl(text) {
        const s = this._state;
        if (!s.highlightText || !s.highlightText.trim() || !text) return text || '';
        const re = new RegExp(`(${s.highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return String(text).replace(re, '<mark class="et-hl">$1</mark>');
    },

    _cleanupDocListeners() {
        if (this._docClickCB) { document.removeEventListener('click', this._docClickCB); this._docClickCB = null; }
        if (this._fpClickCB)  { document.removeEventListener('click', this._fpClickCB);  this._fpClickCB = null; }
    },

    _saveSearchFocus() {
        const el = document.activeElement;
        if (el && el.id === 'et-highlight-input') return { pos: el.selectionStart || 0 };
        return null;
    },

    _restoreSearchFocus(saved) {
        if (!saved) return;
        requestAnimationFrame(() => {
            const el = document.getElementById('et-highlight-input');
            if (el) { el.focus(); try { el.setSelectionRange(saved.pos, saved.pos); } catch(e) {} }
        });
    },

    /* ─── Dados filtrados (compat. com Navigation) ────────────────── */
    getFiltered() {
        const { crs, stages, meses, q, cols } = ControlState.filters;
        const lowerQ = (q || '').toLowerCase();

        return (ControlState.records || []).filter(r => {
            const crVal = r.cr && r.cr.trim() !== '' ? String(r.cr) : 'Sem CR';
            const matchCR    = !crs    || crs.length    === 0 || crs.includes(crVal);
            const matchStage = !stages || stages.length === 0 || stages.includes(String(r.stage));
            const matchMes   = !meses  || meses.length  === 0 || meses.includes(String(r.mes));
            const matchQ = !lowerQ ||
                (r.descricao     && r.descricao.toLowerCase().includes(lowerQ)) ||
                (r.pedido        && r.pedido.includes(lowerQ)) ||
                (r.cr            && r.cr.includes(lowerQ)) ||
                (r.mes           && r.mes.toLowerCase().includes(lowerQ)) ||
                (r.folhaRegistro && r.folhaRegistro.includes(lowerQ));

            if (!(matchCR && matchStage && matchMes && matchQ)) return false;

            if (cols) {
                for (const colId in cols) {
                    const selectedValues = cols[colId];
                    if (selectedValues && selectedValues.length > 0) {
                        let val;
                        if (colId === 'cr') {
                            val = r.cr && r.cr.trim() !== '' ? r.cr : 'Sem CR';
                        } else {
                            val = String(r[colId] || '');
                        }
                        if (!selectedValues.includes(val)) return false;
                    }
                }
            }

            return true;
        });
    },

    /* Retorna registros filtrados por tudo EXCETO a coluna alvo (para popular o painel de filtros) */
    _getFilteredForCol(targetColId) {
        const { crs, stages, meses, q, cols } = ControlState.filters;
        const lowerQ = (q || '').toLowerCase();

        return (ControlState.records || []).filter(r => {
            const crVal = r.cr && r.cr.trim() !== '' ? String(r.cr) : 'Sem CR';
            const matchCR    = !crs    || crs.length    === 0 || crs.includes(crVal);
            const matchStage = !stages || stages.length === 0 || stages.includes(String(r.stage));
            const matchMes   = !meses  || meses.length  === 0 || meses.includes(String(r.mes));
            const matchQ = !lowerQ ||
                (r.descricao     && r.descricao.toLowerCase().includes(lowerQ)) ||
                (r.pedido        && r.pedido.includes(lowerQ)) ||
                (r.cr            && r.cr.includes(lowerQ)) ||
                (r.mes           && r.mes.toLowerCase().includes(lowerQ)) ||
                (r.folhaRegistro && r.folhaRegistro.includes(lowerQ));

            if (!(matchCR && matchStage && matchMes && matchQ)) return false;

            if (cols) {
                for (const colId in cols) {
                    if (colId === targetColId) continue;
                    const selectedValues = cols[colId];
                    if (selectedValues && selectedValues.length > 0) {
                        let val;
                        if (colId === 'cr') {
                            val = r.cr && r.cr.trim() !== '' ? r.cr : 'Sem CR';
                        } else {
                            val = String(r[colId] || '');
                        }
                        if (!selectedValues.includes(val)) return false;
                    }
                }
            }

            return true;
        });
    },

    /* ─── Dados com sort + highlight filter ───────────────────────── */
    _getData() {
        const s = this._state;
        let rows = this.getFiltered();

        // Filtro de highlight text
        if (s.highlightText && s.highlightText.trim()) {
            const ht = s.highlightText.toLowerCase();
            rows = rows.filter(r => Object.values(r).some(v => v && v.toString().toLowerCase().includes(ht)));
        }

        // Ordenação
        if (s.sortCol) {
            const currencyKeys = ['medir', 'valorBM', 'valorGlosa', 'totalFaturado'];
            rows = [...rows].sort((a, b) => {
                let aVal = s.sortCol === 'totalFaturado'
                    ? (parseFloat(a.valorBM) || 0) - (parseFloat(a.valorGlosa) || 0)
                    : a[s.sortCol] ?? '';
                let bVal = s.sortCol === 'totalFaturado'
                    ? (parseFloat(b.valorBM) || 0) - (parseFloat(b.valorGlosa) || 0)
                    : b[s.sortCol] ?? '';
                if (currencyKeys.includes(s.sortCol)) {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                    return s.sortAsc ? aVal - bVal : bVal - aVal;
                }
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
                return s.sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
        }

        return rows;
    },

    /* ─── Render principal ────────────────────────────────────────── */
    render() {
        const container = document.getElementById('table-view');
        if (!container) return;

        const focusSaved = this._saveSearchFocus();
        this._cleanupDocListeners();

        const s = this._state;
        const allData   = this._getData();
        const total     = allData.length;
        const totalPages = Math.max(1, Math.ceil(total / s.pageSize));
        if (s.page > totalPages) s.page = totalPages;

        const start    = (s.page - 1) * s.pageSize;
        const pageData = allData.slice(start, start + s.pageSize);
        const selCount = s.selected.size;
        const visCols  = this._visibleColumns();
        const actFilts = this._activeColFiltersCount();
        const globalFilts = (ControlState.filters.crs?.length || 0) + (ControlState.filters.stages?.length || 0) + (ControlState.filters.meses?.length || 0);

        const allSel  = pageData.length > 0 && pageData.every(r => s.selected.has(String(r.id)));
        const someSel = pageData.some(r => s.selected.has(String(r.id)));

        // Totais do conjunto filtrado
        const totalMedir = allData.reduce((acc, r) => acc + (parseFloat(r.medir) || 0), 0);
        const totalGlosa = allData.reduce((acc, r) => acc + (parseFloat(r.valorGlosa) || 0), 0);
        const fmtV = typeof fmt === 'function' ? fmt : v => v;

        container.innerHTML = `
        <div class="excel-wrap${s.expanded ? ' et-expanded' : ''}" id="excel-wrap">

            <!-- TOOLBAR -->
            <div class="et-toolbar">
                <div class="excel-search-wrap et-toolbar-search">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" class="et-search-icon"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
                    <input type="text" id="et-highlight-input" class="et-search-input" placeholder="Buscar e destacar…" value="${s.highlightText}" autocomplete="off">
                    ${s.highlightText ? `<button id="et-clear-hl" class="et-search-clear">×</button>` : ''}
                </div>

                <span class="et-toolbar-sep"></span>

                <button class="excel-btn ${actFilts > 0 ? 'has-value' : ''}" id="et-clear-col-filters" title="Limpar filtros de coluna">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    <span>Filtros</span>
                    ${actFilts > 0 ? `<em class="et-badge">${actFilts}</em>` : ''}
                </button>

                <span class="et-toolbar-sep"></span>

                <!-- Column picker -->
                <div style="position:relative">
                    <button class="excel-btn ${s.showColPicker ? 'active' : ''}" id="et-col-picker" title="Colunas visíveis">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
                        <span>Colunas</span>
                    </button>
                    <div class="et-col-picker-panel ${s.showColPicker ? 'open' : ''}" id="et-col-picker-panel">
                        <div class="et-col-picker-title">Colunas Visíveis</div>
                        ${this._columns.filter(c => !c.alwaysVisible).map(c => `
                            <label class="et-col-picker-item">
                                <input type="checkbox" class="et-col-toggle" data-col="${c.key}" ${!s.hiddenCols.has(c.key) ? 'checked' : ''}>
                                <span>${c.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <!-- Fullscreen -->
                <button class="excel-btn ${s.expanded ? 'active' : ''}" id="et-expand" title="${s.expanded ? 'Recolher' : 'Tela cheia'}">
                    ${s.expanded
                        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/></svg>`
                        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`}
                    <span>${s.expanded ? 'Recolher' : 'Expandir'}</span>
                </button>

                <span style="flex:1"></span>

                ${selCount > 0 ? `
                <button class="excel-btn has-value" id="et-select-all-vis" title="Selecionar todos (${total})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Todos (${total})</span>
                </button>
                <button class="excel-btn" id="et-deselect-all" title="Desmarcar tudo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <span class="et-toolbar-sep"></span>` : ''}

                <button class="excel-btn" id="et-export-xlsx" title="Exportar Excel">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                    <span>Excel</span>
                </button>
                ${selCount > 0 ? `
                <button class="excel-btn" id="et-export-sel" title="Exportar selecionados (${selCount})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Sel. (${selCount})</span>
                </button>` : ''}

                <span class="et-toolbar-sep"></span>
                <select class="page-size-select" id="et-page-size" title="Linhas por página">
                    ${[50, 100, 200, 500].map(n => `<option value="${n}" ${s.pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
            </div>

            <!-- STATUS BAR -->
            <div class="excel-status-bar">
                <span class="status-chip"><strong>${total}</strong> boletim(ns)</span>
                ${actFilts > 0  ? `<span class="status-chip" style="color:var(--orange)">· ${actFilts} filtro(s) de coluna</span>` : ''}
                ${globalFilts > 0 ? `<span class="status-chip" style="color:var(--accent)">· ${globalFilts} filtro(s) globais</span>` : ''}
                ${s.highlightText ? `<span class="status-chip" style="color:var(--accent)">· Busca: <strong>"${s.highlightText}"</strong></span>` : ''}
                ${selCount > 0  ? `<span class="status-chip" style="color:var(--accent)">· <strong>${selCount}</strong> selecionado(s)</span>` : ''}
                <span style="flex:1"></span>
                <span class="status-chip" style="color:var(--text-3)">Total a medir: <strong style="color:var(--text-1)">${fmtV(totalMedir)}</strong></span>
                ${totalGlosa > 0 ? `<span class="status-chip" style="color:var(--red)">Glosas: <strong>${fmtV(totalGlosa)}</strong></span>` : ''}
                <span class="status-chip" style="color:var(--text-3);font-size:10px">
                    ${total === 0 ? '0' : `${start + 1}–${Math.min(start + pageData.length, total)}`} de ${total}
                    ${totalPages > 1 ? `· pág ${s.page}/${totalPages}` : ''}
                </span>
            </div>

            <!-- MASS EDIT BAR -->
            <div class="mass-edit-bar ${selCount > 0 ? 'visible' : ''}" id="mass-edit-bar">
                <span class="mass-count">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="20 6 9 17 4 12"/></svg>
                    ${selCount} selecionado(s)
                </span>
                <button class="mass-edit-btn" id="mass-btn-export">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>Exportar Selecionados</span>
                </button>
                <button class="mass-edit-btn mass-cancel-btn" id="mass-btn-cancel" title="Cancelar seleção">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <!-- TABLE -->
            <div class="excel-table-container" id="et-container">
                <table class="excel-table" id="et-table">
                    <thead>
                        <tr>${visCols.map((col, i) => this._renderTH(col, i, allSel, someSel)).join('')}</tr>
                    </thead>
                    <tbody>
                        ${pageData.length === 0
                            ? `<tr><td colspan="${visCols.length}" style="padding:0">
                                <div class="excel-empty">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                    <h3>Nenhum boletim encontrado</h3>
                                    <p>Ajuste os filtros ou a busca.</p>
                                </div></td></tr>`
                            : pageData.map((row, idx) => this._renderRow(row, start + idx)).join('')}
                    </tbody>
                </table>
            </div>

            <!-- PAGINATION -->
            <div class="excel-pagination">
                <span class="page-info">
                    ${total === 0 ? 'Nenhum registro' : `${start + 1}–${Math.min(start + pageData.length, total)} de <strong>${total}</strong>`}
                </span>
                <div class="page-controls">${this._renderPagination(s.page, totalPages)}</div>
            </div>

            <!-- FILTER PANEL (flutuante, posicionado por JS) -->
            ${s.filterPanel ? this._renderFilterPanel(allData) : ''}
        </div>`;

        this._bindEvents(pageData, allData);
        this._restoreSearchFocus(focusSaved);

        if (s.filterPanel) this._positionFilterPanel();
    },

    /* ─── Render de cabeçalho ─────────────────────────────────────── */
    _renderTH(col, idx, allSel, someSel) {
        const s = this._state;

        if (col.key === '__checkbox') {
            const ind = !allSel && someSel;
            return `<th class="col-checkbox">
                <div style="display:flex;justify-content:center;align-items:center;height:100%;padding:8px 0">
                    <span class="excel-checkbox ${allSel ? 'checked' : ''} ${ind ? 'indeterminate' : ''}" id="et-select-all-cb"></span>
                </div>
            </th>`;
        }
        if (col.key === '__actions') {
            return `<th class="col-actions"><div class="th-inner"><div class="th-header" style="cursor:default;justify-content:center"><span class="th-label">Ações</span></div></div></th>`;
        }
        if (col.type === 'info') {
            return `<th><div class="th-inner"><div class="th-header" style="cursor:default"><span class="th-label">${col.label}</span></div></div></th>`;
        }

        const isFiltered = this._isFiltered(col.key);
        const isSorted   = s.sortCol === col.key;

        let sortIcon;
        if (isSorted && s.sortAsc)  sortIcon = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3v10M3 8l5-5 5 5"/></svg>`;
        else if (isSorted)           sortIcon = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3v10M3 8l5 5 5-5"/></svg>`;
        else                         sortIcon = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"><path d="M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3"/></svg>`;

        return `
        <th class="${isSorted ? 'sorted' : ''} ${isFiltered ? 'filter-active' : ''}">
            <div class="th-inner">
                <div class="th-header" data-sort="${col.sortable ? col.key : ''}">
                    <span class="th-label">${col.label}</span>
                    ${col.sortable ? `<span class="th-sort">${sortIcon}</span>` : ''}
                    ${col.filterable ? `
                    <button class="th-filter-btn ${isFiltered ? 'active' : ''}" data-filter-open="${col.key}" title="Filtrar por ${col.label}">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="14 2 2 2 7 8.46 7 13 9 14 9 8.46 14 2"/></svg>
                    </button>` : ''}
                </div>
            </div>
        </th>`;
    },

    /* ─── Render de linha ─────────────────────────────────────────── */
    _renderRow(row, rowIndex) {
        const s    = this._state;
        const isSel = s.selected.has(String(row.id));
        const hl   = t => this._hl(t);
        const fmtV = typeof fmt === 'function' ? fmt : v => v || '—';

        const cells = this._visibleColumns().map(col => {
            if (col.key === '__checkbox') {
                return `<td class="td-checkbox"><span class="excel-checkbox ${isSel ? 'checked' : ''}" data-sel="${row.id}"></span></td>`;
            }
            if (col.key === '__actions') {
                return `<td class="td-actions">
                    <button class="row-action-btn" data-action="edit" data-id="${row.id}" title="Editar">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11.5 2.5a2.121 2.121 0 1 1 3 3L5 15H2v-3z"/></svg>
                    </button>
                    <button class="row-action-btn" data-action="delete" data-id="${row.id}" title="Remover" style="margin-left:2px;color:var(--red)">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M13 4l-1 9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L3 4"/></svg>
                    </button>
                </td>`;
            }
            if (col.key === 'cr') {
                const val = row.cr && row.cr.trim() !== '' ? row.cr : 'Sem CR';
                const isEmpty = !row.cr || row.cr.trim() === '';
                return `<td style="font-weight:${isEmpty ? '400' : '600'};${isEmpty ? 'color:var(--text-3);font-style:italic;' : ''}">${hl(val)}</td>`;
            }
            if (col.key === 'stage') {
                const stg = typeof stageObj === 'function' ? stageObj(row.stage) : null;
                if (stg) {
                    return `<td><span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:600;background:${stg.bg};color:${stg.color};white-space:nowrap;">${stg.label}</span></td>`;
                }
                return `<td>${row.stage || '—'}</td>`;
            }
            if (col.key === 'medir' || col.key === 'valorBM') {
                const val = row[col.key];
                const isZero = !val || parseFloat(val) === 0;
                const content = `<span style="${isZero ? 'color:var(--text-3)' : 'font-weight:600;font-family:var(--font-mono);font-size:11px'}">${isZero ? '—' : hl(fmtV(val))}</span>`;
                return this._cellWrap(col, row, content);
            }
            if (col.key === 'valorGlosa') {
                const val = row.valorGlosa;
                const isZero = !val || parseFloat(val) === 0;
                const motivo = row.motivoGlosa ? `Motivo: ${row.motivoGlosa}` : '';
                const content = `<span style="${isZero ? 'color:var(--text-3)' : 'color:var(--red);font-weight:600;font-family:var(--font-mono);font-size:11px'}" title="${motivo}">${isZero ? '—' : hl(fmtV(val))}</span>`;
                return this._cellWrap(col, row, content);
            }
            if (col.key === 'totalFaturado') {
                const total = (parseFloat(row.valorBM) || 0) - (parseFloat(row.valorGlosa) || 0);
                const isZero = total === 0;
                return `<td><span style="${isZero ? 'color:var(--text-3)' : 'font-weight:700;font-family:var(--font-mono);font-size:11px;color:var(--green,#16a34a)'}">${isZero ? '—' : fmtV(total)}</span></td>`;
            }
            if (col.key === 'descricao') {
                const content = `<span style="display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${(row.descricao || '').replace(/"/g, '&quot;')}">${hl(row.descricao || '—')}</span>`;
                return this._cellWrap(col, row, content);
            }
            if (col.key === 'updatedBy') {
                if (!row.updatedBy) return `<td style="color:var(--text-3)">—</td>`;
                let dtStr = '';
                if (row.updatedAt) {
                    const dt = new Date(row.updatedAt);
                    if (!isNaN(dt.valueOf())) {
                        dtStr = ` (${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')})`;
                    }
                }
                return `<td style="font-size:10px;color:var(--text-2);white-space:nowrap">${hl(row.updatedBy)}${dtStr}</td>`;
            }
            if (col.key === 'responsavel') {
                return this._cellWrap(col, row, hl(row.responsavel || '—'));
            }
            if (col.key === 'pedido' || col.key === 'folhaRegistro') {
                return `<td style="font-family:var(--font-mono);font-size:11px;color:var(--text-2)">${hl(row[col.key] || '—')}</td>`;
            }
            return `<td>${hl((row[col.key] ?? '—').toString())}</td>`;
        }).join('');

        return `<tr data-id="${row.id}" class="${isSel ? 'selected' : ''}">${cells}</tr>`;
    },

    /* Wrapper para células editáveis (com ícone lápis) */
    _cellWrap(col, row, content, extraClass = '') {
        if (!col.editable) return `<td class="${extraClass}">${content}</td>`;
        return `<td class="cell-with-edit ${extraClass}" data-edit="${row.id}|${col.key}">
            <div class="cell-content">
                <span class="cell-val">${content}</span>
                <button class="cell-edit-icon" data-edit-trigger="${row.id}|${col.key}" title="Editar ${col.label}">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11.5 2.5a2.121 2.121 0 1 1 3 3L5 15H2v-3z"/></svg>
                </button>
            </div>
        </td>`;
    },

    /* ─── Filter panel flutuante ──────────────────────────────────── */
    _renderFilterPanel(allData) {
        const s   = this._state;
        const col = this._columns.find(c => c.key === s.filterPanel.col);
        if (!col) return '';

        const cols       = ControlState.filters.cols || {};
        const activeVals = Array.isArray(cols[col.key]) ? cols[col.key] : [];
        const isSorted   = s.sortCol === col.key;

        // Valores distintos para este campo
        let baseRecs = this._getFilteredForCol(col.key);
        let distinct = [];
        if (col.key === 'stage' && typeof STAGES !== 'undefined') {
            distinct = STAGES.map(st => st.id);
        } else if (col.key === 'cr') {
            distinct = [...new Set(baseRecs.map(r => r.cr && r.cr.trim() !== '' ? r.cr : 'Sem CR'))].sort((a, b) => {
                if (a === 'Sem CR') return 1;
                if (b === 'Sem CR') return -1;
                return a.localeCompare(b);
            });
        } else {
            distinct = [...new Set(baseRecs.map(r => String(r[col.key] || '')))].sort();
        }

        const sortHtml = `
            <div class="et-fp-sort">
                <button class="et-fp-sort-btn ${isSorted && s.sortAsc ? 'active' : ''}" data-fp-sort="asc">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v12M3 7l5-5 5 5"/></svg> A → Z
                </button>
                <button class="et-fp-sort-btn ${isSorted && !s.sortAsc ? 'active' : ''}" data-fp-sort="desc">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v12M3 9l5 5 5-5"/></svg> Z → A
                </button>
            </div>`;

        const searchId  = `et-fp-search-${col.key}`;
        const optionsHtml = `
            <div class="et-fp-text-wrap">
                <input type="text" id="${searchId}" class="et-fp-text" placeholder="Buscar opções…" autocomplete="off">
            </div>
            <div class="et-fp-options" id="et-fp-options">
                ${distinct.map(v => {
                    const label = col.key === 'stage' && typeof stageObj === 'function'
                        ? (stageObj(v)?.label || v)
                        : v;
                    const isChecked = activeVals.includes(v);
                    return `<div class="et-fp-option ${isChecked ? 'selected' : ''}" data-fp-val="${v.replace(/"/g, '&quot;')}">
                        <span class="et-fp-check"></span>
                        <span>${label}</span>
                    </div>`;
                }).join('')}
                ${distinct.length === 0 ? '<div style="padding:10px;text-align:center;color:var(--text-3);font-size:12px">Sem opções</div>' : ''}
            </div>`;

        return `
        <div class="et-filter-panel" id="et-filter-panel">
            <div class="et-fp-header">
                <span class="et-fp-title">${col.label}</span>
                <button class="et-fp-close" id="et-fp-close">×</button>
            </div>
            ${sortHtml}
            <div class="et-fp-divider"></div>
            ${optionsHtml}
            <div class="et-fp-footer">
                <button class="et-fp-btn-clear" id="et-fp-clear">Limpar</button>
                <button class="et-fp-btn-apply" id="et-fp-apply">Aplicar</button>
            </div>
        </div>`;
    },

    _positionFilterPanel() {
        const s     = this._state;
        if (!s.filterPanel) return;
        const panel = document.getElementById('et-filter-panel');
        if (!panel) return;

        const { x, y } = s.filterPanel;
        const pw = panel.offsetWidth  || 240;
        const ph = panel.offsetHeight || 320;

        let left = x;
        let top  = y;
        if (left + pw > window.innerWidth  - 8) left = window.innerWidth  - pw - 8;
        if (top  + ph > window.innerHeight - 8) top  = y - ph - 4;
        if (left < 8) left = 8;
        if (top  < 8) top  = 8;

        panel.style.left = left + 'px';
        panel.style.top  = top  + 'px';

        // Focus search
        setTimeout(() => document.getElementById(`et-fp-search-${s.filterPanel.col}`)?.focus(), 0);
    },

    /* ─── Paginação ───────────────────────────────────────────────── */
    _renderPagination(current, total) {
        if (total <= 1) return '';
        let html = `<button class="page-btn" id="et-first" ${current===1?'disabled':''} title="Primeira"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><path d="M11 12l-4-4 4-4M5 4v8"/></svg></button>
        <button class="page-btn" id="et-prev" ${current===1?'disabled':''} title="Anterior"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><path d="M10 12l-4-4 4-4"/></svg></button>`;

        const delta = 2;
        const range = [];
        for (let i = Math.max(2, current-delta); i <= Math.min(total-1, current+delta); i++) range.push(i);
        const items = [...new Set([1, ...range, total])].sort((a,b) => a-b);
        let prev = null;
        for (const p of items) {
            if (prev && p - prev > 1) html += `<span class="page-ellipsis">…</span>`;
            html += `<button class="page-btn ${p===current?'active':''}" data-page="${p}">${p}</button>`;
            prev = p;
        }
        html += `<button class="page-btn" id="et-next" ${current===total?'disabled':''} title="Próxima"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><path d="M6 4l4 4-4 4"/></svg></button>
        <button class="page-btn" id="et-last" ${current===total?'disabled':''} title="Última"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><path d="M5 4l4 4-4 4M11 4v8"/></svg></button>`;
        return html;
    },

    /* ─── Export XLSX ─────────────────────────────────────────────── */
    _exportXLSX(selectedOnly = false) {
        if (typeof XLSX === 'undefined') {
            if (typeof showToast === 'function') showToast('Biblioteca XLSX não carregada.', 'error');
            return;
        }
        const s = this._state;
        let data = this._getData();
        if (selectedOnly) data = data.filter(r => s.selected.has(String(r.id)));
        if (data.length === 0) {
            if (typeof showToast === 'function') showToast('Nenhum registro para exportar.', 'error');
            return;
        }

        const fmtNum = v => parseFloat(v) || 0;
        const getStageLabel = (stageId) => {
            if (typeof stageObj === 'function') return stageObj(stageId)?.label || stageId || '';
            return stageId || '';
        };

        const headers = ['CR', 'Mês', 'Período', 'Descrição', 'Pedido', 'Folha Reg.', 'Medir (R$)', 'Dt. Aprov.', 'Dt. Envio', 'Val. BM (R$)', 'Glosa (R$)', 'Motivo Glosa', 'Responsável', 'Etapa', 'Última Mod.'];
        const rows = data.map(r => [
            r.cr || 'Sem CR',
            r.mes || '',
            r.periodo || '',
            r.descricao || '',
            r.pedido || '',
            r.folhaRegistro || '',
            fmtNum(r.medir),
            r.dataAprovacao || '',
            r.dataEnvio || '',
            fmtNum(r.valorBM),
            fmtNum(r.valorGlosa),
            r.motivoGlosa || '',
            r.responsavel || '',
            getStageLabel(r.stage),
            r.updatedBy || '',
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        // Formatar colunas de moeda
        const currencyCols = [6, 9, 10]; // medir, valorBM, valorGlosa
        const fmt = '#,##0.00';
        rows.forEach((_, ri) => {
            currencyCols.forEach(ci => {
                const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
                if (cell) cell.z = fmt;
            });
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Medições');
        const fileName = `controle-medicao-${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        if (typeof showToast === 'function') showToast(`Exportado: ${fileName}`);
    },

    /* ─── Bind events ─────────────────────────────────────────────── */
    _bindEvents(pageData, allData) {
        const s = this._state;

        // Expand
        document.getElementById('et-expand')?.addEventListener('click', () => {
            s.expanded = !s.expanded;
            this.render();
        });

        // Limpar filtros de coluna
        document.getElementById('et-clear-col-filters')?.addEventListener('click', () => {
            ControlState.filters.cols = {};
            s.page = 1;
            this.render();
        });

        // Column picker toggle
        document.getElementById('et-col-picker')?.addEventListener('click', (e) => {
            e.stopPropagation();
            s.showColPicker = !s.showColPicker;
            this.render();
        });

        if (s.showColPicker) {
            setTimeout(() => {
                this._docClickCB = (e) => {
                    if (!e.target.closest('#et-col-picker-panel') && !e.target.closest('#et-col-picker')) {
                        s.showColPicker = false;
                        if (this._docClickCB) { document.removeEventListener('click', this._docClickCB); this._docClickCB = null; }
                        this.render();
                    }
                };
                document.addEventListener('click', this._docClickCB);
            }, 0);
        }

        // Col toggle
        document.querySelectorAll('.et-col-toggle').forEach(cb => {
            cb.addEventListener('change', () => {
                const col = cb.dataset.col;
                if (cb.checked) s.hiddenCols.delete(col);
                else            s.hiddenCols.add(col);
                this.render();
            });
            cb.addEventListener('click', e => e.stopPropagation());
        });

        // Highlight search
        const hlInput = document.getElementById('et-highlight-input');
        if (hlInput) {
            let hlTimer;
            hlInput.addEventListener('input', () => {
                clearTimeout(hlTimer);
                hlTimer = setTimeout(() => {
                    s.highlightText = hlInput.value.trim();
                    s.page = 1;
                    this.render();
                }, 200);
            });
        }
        document.getElementById('et-clear-hl')?.addEventListener('click', () => { s.highlightText = ''; s.page = 1; this.render(); });

        // Filter panel open (th-filter-btn)
        document.querySelectorAll('.th-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const col  = btn.dataset.filterOpen;
                const rect = btn.getBoundingClientRect();
                if (s.filterPanel && s.filterPanel.col === col) {
                    s.filterPanel = null;
                } else {
                    s.filterPanel = { col, x: rect.left, y: rect.bottom + 6 };
                }
                this.render();
            });
        });

        // Filter panel events
        if (s.filterPanel) {
            const applyFilter = () => {
                const colKey = s.filterPanel?.col;
                if (!colKey) return;
                if (!ControlState.filters.cols) ControlState.filters.cols = {};

                const selected = [...document.querySelectorAll('.et-fp-option.selected')].map(el => el.dataset.fpVal);
                if (selected.length === 0) {
                    delete ControlState.filters.cols[colKey];
                } else {
                    ControlState.filters.cols[colKey] = selected;
                }
                s.page = 1;
                s.filterPanel = null;
                this.render();
                // Atualizar badge global de filtros
                if (typeof Navigation !== 'undefined' && Navigation.updateFilterBadge) {
                    Navigation.updateFilterBadge();
                }
            };

            document.getElementById('et-fp-apply')?.addEventListener('click', applyFilter);
            document.getElementById('et-fp-clear')?.addEventListener('click', () => {
                const colKey = s.filterPanel?.col;
                if (colKey && ControlState.filters.cols) delete ControlState.filters.cols[colKey];
                s.filterPanel = null;
                s.page = 1;
                this.render();
                if (typeof Navigation !== 'undefined' && Navigation.updateFilterBadge) Navigation.updateFilterBadge();
            });
            document.getElementById('et-fp-close')?.addEventListener('click', () => { s.filterPanel = null; this.render(); });

            // Options toggle
            document.getElementById('et-fp-options')?.addEventListener('click', (e) => {
                const opt = e.target.closest('.et-fp-option');
                if (opt) opt.classList.toggle('selected');
            });

            // Search within options
            const fpSearchKey = s.filterPanel.col;
            document.getElementById(`et-fp-search-${fpSearchKey}`)?.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                document.querySelectorAll('#et-fp-options .et-fp-option').forEach(opt => {
                    const txt = opt.textContent.toLowerCase();
                    opt.style.display = txt.includes(q) ? '' : 'none';
                });
            });

            // Sort from filter panel
            document.querySelectorAll('[data-fp-sort]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const colKey = s.filterPanel?.col;
                    if (!colKey) return;
                    s.sortCol = colKey;
                    s.sortAsc = btn.dataset.fpSort === 'asc';
                    applyFilter();
                });
            });

            // Enter on search
            document.getElementById(`et-fp-search-${s.filterPanel.col}`)?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') applyFilter();
                if (e.key === 'Escape') { s.filterPanel = null; this.render(); }
            });

            // Fechar ao clicar fora
            setTimeout(() => {
                this._fpClickCB = (e) => {
                    if (!e.target.closest('#et-filter-panel') && !e.target.closest('.th-filter-btn')) {
                        s.filterPanel = null;
                        if (this._fpClickCB) { document.removeEventListener('click', this._fpClickCB); this._fpClickCB = null; }
                        this.render();
                    }
                };
                document.addEventListener('click', this._fpClickCB);
            }, 0);
        }

        // Sort por header
        document.querySelectorAll('.th-header[data-sort]').forEach(th => {
            th.addEventListener('click', (e) => {
                if (e.target.closest('.th-filter-btn')) return;
                const col = th.dataset.sort;
                if (!col) return;
                if (s.sortCol === col) s.sortAsc = !s.sortAsc;
                else { s.sortCol = col; s.sortAsc = true; }
                this.render();
            });
        });

        // Checkbox header
        document.getElementById('et-select-all-cb')?.addEventListener('click', () => {
            const allSelected = pageData.every(r => s.selected.has(String(r.id)));
            pageData.forEach(r => allSelected ? s.selected.delete(String(r.id)) : s.selected.add(String(r.id)));
            this.render();
        });

        // Checkbox por linha
        document.querySelectorAll('.excel-checkbox[data-sel]').forEach(cb => {
            cb.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = String(cb.dataset.sel);
                s.selected.has(id) ? s.selected.delete(id) : s.selected.add(id);
                this.render();
            });
        });

        document.getElementById('et-select-all-vis')?.addEventListener('click', () => { allData.forEach(r => s.selected.add(String(r.id))); this.render(); });
        document.getElementById('et-deselect-all')?.addEventListener('click', () => { s.selected.clear(); this.render(); });

        // Row actions
        document.querySelectorAll('.row-action-btn[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.App && App.openEdit) App.openEdit(btn.dataset.id);
            });
        });
        document.querySelectorAll('.row-action-btn[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.App && App.deleteRecord) App.deleteRecord(btn.dataset.id);
            });
        });

        // Pencil icon → inline edit (abre o modal de edição)
        document.querySelectorAll('.cell-edit-icon[data-edit-trigger]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const [id] = btn.dataset.editTrigger.split('|');
                if (window.App && App.openEdit) App.openEdit(id);
            });
        });

        // Export
        document.getElementById('et-export-xlsx')?.addEventListener('click', () => this._exportXLSX(false));
        document.getElementById('et-export-sel')?.addEventListener('click', () => this._exportXLSX(true));
        document.getElementById('mass-btn-export')?.addEventListener('click', () => this._exportXLSX(true));

        // Mass cancel
        document.getElementById('mass-btn-cancel')?.addEventListener('click', () => { s.selected.clear(); this.render(); });

        // Page size
        document.getElementById('et-page-size')?.addEventListener('change', (e) => {
            s.pageSize = parseInt(e.target.value); s.page = 1; this.render();
        });

        // Paginação
        document.getElementById('et-first')?.addEventListener('click', () => { s.page = 1; this.render(); });
        document.getElementById('et-prev')?.addEventListener('click',  () => { if (s.page > 1) { s.page--; this.render(); } });
        document.getElementById('et-next')?.addEventListener('click',  () => { const tp = Math.ceil(allData.length/s.pageSize); if (s.page < tp) { s.page++; this.render(); } });
        document.getElementById('et-last')?.addEventListener('click',  () => { s.page = Math.ceil(allData.length/s.pageSize) || 1; this.render(); });
        document.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => { s.page = parseInt(btn.dataset.page); this.render(); });
        });
    },
};
