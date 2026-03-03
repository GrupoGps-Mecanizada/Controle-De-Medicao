const Dashboard = {
    currentTab: 'p1',
    activeCr: null,
    charts: {},

    STAGES: [
        { id: "enviado", label: "Enviado", short: "Enviado", color: "#2563eb", bg: "rgba(37,99,235,.1)", sla: 5 },
        { id: "aguardando_aprovacao", label: "Ag. Aprovação", short: "Ag.Aprov.", color: "#f59e0b", bg: "rgba(245,158,11,.1)", sla: 10 },
        { id: "aprovado", label: "Aprovado", short: "Aprovado", color: "#22c55e", bg: "rgba(34,197,94,.1)", sla: 5 },
        { id: "faturado", label: "Faturado", short: "Faturado", color: "#14b8a6", bg: "rgba(20,184,166,.1)", sla: null }
    ],

    // Chart Defaults
    initCharts() {
        if (!window.Chart) return;
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = 11;
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.padding = 12;
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.cornerRadius = 6;
        Chart.defaults.plugins.tooltip.boxPadding = 4;
    },

    setTab(tab) {
        this.currentTab = tab;
        this.render();
    },

    render() {
        const container = document.getElementById('dashboard-view');
        if (!container) return;

        this.initCharts();

        let html = `
        <div class="dash-nav">
          <button class="dtb ${this.currentTab === 'p1' ? 'on' : ''}" onclick="Dashboard.setTab('p1')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Visão Executiva
          </button>
          <button class="dtb ${this.currentTab === 'p2' ? 'on' : ''}" onclick="Dashboard.setTab('p2')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/></svg>
            SLA & Workflow
          </button>
          <button class="dtb ${this.currentTab === 'p3' ? 'on' : ''}" onclick="Dashboard.setTab('p3')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Financeiro por CR
          </button>
        </div>
        <div id="dash-panel" style="animation: fadeIn 0.2s ease-out;"></div>
        `;

        // Only override if not already mounted with tabs
        if (!container.querySelector('.dash-nav')) {
            container.innerHTML = html;
        } else {
            // Just update tabs class implicitly or rewrite. For safety, rewrite full
            container.innerHTML = html;
        }

        const panel = document.getElementById('dash-panel');
        if (!panel) return;

        // Clean up old charts
        Object.keys(this.charts).forEach(k => {
            this.charts[k].destroy();
        });
        this.charts = {};

        const records = this.getFiltered() || [];

        if (this.currentTab === 'p1') this.renderD1(panel, records);
        else if (this.currentTab === 'p2') this.renderD2(panel, records);
        else if (this.currentTab === 'p3') this.renderD3(panel, records);
    },

    // HELPERS
    fmtR: v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(+v || 0),
    fmtN: (v, d = 0) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(+v || 0),
    getSlaDef: id => Dashboard.STAGES.find(s => s.id === id) || Dashboard.STAGES[0],

    parsePtDate(s) {
        if (!s) return null;
        // Check if YYYY-MM-DD
        if (s.includes('-')) {
            const p = s.split('-');
            const d = new Date(+p[0], +p[1] - 1, +p[2]);
            return isNaN(d) ? null : d;
        }
        // DD.MM.YYYY or DD/MM/YYYY
        const p = s.includes('.') ? s.split('.') : s.split('/');
        if (p.length !== 3) return null;
        const d = new Date(+p[2], +p[1] - 1, +p[0]);
        return isNaN(d) ? null : d;
    },

    slaCalc(r) {
        const s = this.getSlaDef(r.stage);
        if (r.stage === 'faturado') return { status: 'ok', days: 0, max: null, pct: 100, label: 'Faturado' };
        if (!s.sla) return { status: 'nt', days: null, max: null, pct: null, label: '—' };

        // Using "data_aprovacao" logic as base, or created_at if non-existent
        const ap = this.parsePtDate(r.dataAprovacao || r.data_aprovacao);
        if (!ap) return { status: 'nt', days: null, max: null, pct: null, label: 'Sem data' };

        const idx = this.STAGES.findIndex(x => x.id === r.stage);
        let off = 0;
        for (let i = 0; i < idx; i++) off += (this.STAGES[i].sla || 0);

        const entry = new Date(ap);
        entry.setDate(entry.getDate() + off);

        const tod = new Date(); tod.setHours(0, 0, 0, 0);
        const days = Math.max(0, Math.round((tod - entry) / 86400000));

        const max = s.sla;
        const pct = Math.min(100, Math.round((days / max) * 100));

        let status = 'ok';
        if (pct >= 100) status = 'dn';
        else if (pct >= 75) status = 'wn';

        return { status, days, max, pct, label: days === 0 ? 'Hoje' : days === 1 ? '1 dia' : `${days} dias` };
    },

    computeData(records) {
        const d = {
            totalMedir: 0,
            totalFaturado: 0,
            totalGlosa: 0,
            active: [],
            slad: [],
            nOK: 0, nWN: 0, nDN: 0, conf: 100,
            mth: {},
            meses: [],
            CRS: [],
            crd: {}
        };

        d.totalMedir = records.reduce((s, r) => s + (+r.medir || 0), 0);
        d.totalFaturado = records.filter(r => r.stage === 'faturado').reduce((s, r) => s + (+r.medir || 0), 0);
        d.totalGlosa = records.reduce((s, r) => s + (+r.valorGlosa || 0), 0);
        d.taxaConv = d.totalMedir > 0 ? (d.totalFaturado / d.totalMedir * 100) : 0;

        d.active = records.filter(r => r.stage !== 'faturado');
        d.slad = d.active.map(r => ({ ...r, sla: this.slaCalc(r) }));
        d.nOK = d.slad.filter(r => r.sla.status === 'ok').length;
        d.nWN = d.slad.filter(r => r.sla.status === 'wn').length;
        d.nDN = d.slad.filter(r => r.sla.status === 'dn').length;
        d.conf = d.active.length > 0 ? Math.round((d.nOK / d.active.length) * 100) : 100;

        // Monthly
        records.forEach(r => {
            if (!r.mes) return;
            if (!d.mth[r.mes]) d.mth[r.mes] = { medir: 0, fat: 0, bm: 0 };
            d.mth[r.mes].medir += (+r.medir || 0);
            if (r.stage === 'faturado') d.mth[r.mes].fat += (+r.medir || 0);
            d.mth[r.mes].bm += (+r.valorBM || 0);
        });

        const monthOrder = { 'Jan': 1, 'Fev': 2, 'Mar': 3, 'Abr': 4, 'Mai': 5, 'Jun': 6, 'Jul': 7, 'Ago': 8, 'Set': 9, 'Out': 10, 'Nov': 11, 'Dez': 12 };
        d.meses = Object.keys(d.mth).sort((a, b) => {
            const [ma, ya] = a.split('/');
            const [mb, yb] = b.split('/');
            if (ya !== yb) return parseInt(ya || 0) - parseInt(yb || 0);
            return (monthOrder[ma] || 0) - (monthOrder[mb] || 0);
        });

        // CRs (all unique in list + fixed)
        const recordCRs = records.map(r => r.cr ? r.cr.trim() : 'Sem CR');
        d.CRS = [...new Set([...recordCRs, ...(window.ControlState.fixedCRs || [])])].sort((a, b) => {
            if (a === 'Sem CR') return 1; if (b === 'Sem CR') return -1;
            return a.localeCompare(b);
        });

        d.CRS.forEach(cr => {
            const rs = records.filter(r => (r.cr ? r.cr.trim() : 'Sem CR') === cr);
            d.crd[cr] = {
                count: rs.length,
                medir: rs.reduce((s, r) => s + (+r.medir || 0), 0),
                glosa: rs.reduce((s, r) => s + (+r.valorGlosa || 0), 0),
                bm: rs.reduce((s, r) => s + (+r.valorBM || 0), 0),
                fat: rs.filter(r => r.stage === 'faturado').reduce((s, r) => s + (+r.medir || 0), 0),
                fatCount: rs.filter(r => r.stage === 'faturado').length,
                stages: {}
            };
            this.STAGES.forEach(s => {
                d.crd[cr].stages[s.id] = rs.filter(r => r.stage === s.id).length;
            });
        });

        return d;
    },

    createChart(id, cfg) {
        if (this.charts[id]) { this.charts[id].destroy(); }
        const c = document.getElementById(id);
        if (!c) return null;
        this.charts[id] = new Chart(c, cfg);
    },

    /* ── D1: VISÃO EXECUTIVA ── */
    renderD1(el, records) {
        const d = this.computeData(records);

        const pipelineHtml = this.STAGES.map(s => {
            const c = records.filter(r => r.stage === s.id).length;
            const p = records.length ? Math.round(c / records.length * 100) : 0;
            const v = records.filter(r => r.stage === s.id).reduce((a, r) => a + (+r.medir || 0), 0);
            return `<div class="ps"><div class="psn" style="color:${s.color}">${c}</div><div class="psbar"><div class="psfill" style="width:${p}%;background:${s.color}"></div></div><div class="psl">${s.label}</div><div class="psv">${this.fmtR(v)}</div></div>`;
        }).join('');

        const crCardsHtml = d.CRS.map(cr => {
            const cd = d.crd[cr];
            const pct = cd.count > 0 ? Math.round(cd.fatCount / cd.count * 100) : 0;
            const pills = this.STAGES.map(s => {
                const c = cd.stages[s.id];
                if (!c) return '';
                return `<span class="spill" style="background:${s.bg};color:${s.color}">${c} ${s.short}</span>`;
            }).join('');

            return `<div class="crc" onclick="Navigation.drillCR('${cr}')">
              <div class="crch"><div class="crcn" style="color:var(--blue)">CR ${cr}</div><span class="crcc">${cd.count} BMs</span></div>
              <div class="crcv">${this.fmtR(cd.medir)}</div>
              ${cd.glosa > 0 ? `<div class="crcg">Glosa: ${this.fmtR(cd.glosa)}</div>` : '<div class="crcng"></div>'}
              <div class="ph"><span>Faturamento</span><span class="pp">${pct}%</span></div>
              <div class="pb"><div class="pf" style="width:${pct}%"></div></div>
              <div class="spills">${pills}</div>
            </div>`;
        }).join('');

        const tcol = d.taxaConv >= 80 ? 'var(--success)' : d.taxaConv >= 40 ? 'var(--warning)' : 'var(--danger)';

        el.innerHTML = `
        <div class="g5">
            <div class="kpi kb"><div class="kl">Volume Total a Medir</div><div class="kv sm">${this.fmtR(d.totalMedir)}</div><div class="kf">${records.length} boletins cadastrados</div></div>
            <div class="kpi kt"><div class="kl">Faturado</div><div class="kv sm">${this.fmtR(d.totalFaturado)}</div><div class="kf">${records.filter(r => r.stage === 'faturado').length} BMs concluídos</div></div>
            <div class="kpi kw"><div class="kl">Em Andamento</div><div class="kv sm">${this.fmtR(d.totalMedir - d.totalFaturado)}</div><div class="kf">${d.active.length} BMs pendentes</div></div>
            <div class="kpi kr"><div class="kl">Glosas Registradas</div><div class="kv sm">${this.fmtR(d.totalGlosa)}</div><div class="kf">${records.filter(r => +r.valorGlosa > 0).length} BM(s) com glosa</div></div>
            <div class="kpi kg"><div class="kl">Taxa de Conversão</div><div class="kv lg" style="color:${tcol}">${this.fmtN(d.taxaConv, 1)}%</div><div class="kf">Faturado / Volume total</div></div>
        </div>
        <div class="st"><span>Pipeline de Workflow — Distribuição de BMs por Etapa</span><span class="stb">${records.length} BMs total · ${this.fmtR(d.totalMedir)}</span></div>
        <div class="pipeline">${pipelineHtml}</div>
        <div class="g2">
            <div class="card"><div class="ch"><div class="ct">Evolução Mensal — Volume a Medir vs. Faturado</div></div><div class="cb"><div class="cw" style="height:230px"><canvas id="dc-monthly"></canvas></div></div></div>
            <div class="card"><div class="ch"><div class="ct">Volume por Centro de Resultado</div></div><div class="cb"><div class="cw" style="height:230px"><canvas id="dc-crv"></canvas></div></div></div>
        </div>
        <div class="st"><span>Situação por CR</span><span class="stb">${d.CRS.length} centros de resultado monitorados</span></div>
        <div class="cr-grid">${crCardsHtml}</div>
        `;

        if (window.Chart) {
            this.createChart('dc-monthly', {
                type: 'bar',
                data: {
                    labels: d.meses,
                    datasets: [
                        { label: 'A Medir', data: d.meses.map(m => d.mth[m]?.medir || 0), backgroundColor: 'rgba(37,99,235,.72)', borderRadius: 4, borderSkipped: false },
                        { label: 'Faturado', data: d.meses.map(m => d.mth[m]?.fat || 0), backgroundColor: 'rgba(20,184,166,.72)', borderRadius: 4, borderSkipped: false }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => ' ' + this.fmtR(ctx.raw) } } },
                    scales: { y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { callback: v => 'R$' + this.fmtN(v / 1e6, 1) + 'M' }, border: { display: false } }, x: { grid: { display: false } } }
                }
            });

            this.createChart('dc-crv', {
                type: 'bar',
                data: {
                    labels: d.CRS.map(c => 'CR ' + c),
                    datasets: [{ label: 'A Medir', data: d.CRS.map(c => d.crd[c].medir), backgroundColor: ['rgba(37,99,235,.75)', 'rgba(139,94,201,.75)', 'rgba(14,165,233,.7)', 'rgba(245,158,11,.75)'], borderRadius: 4, borderSkipped: false }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + this.fmtR(ctx.raw) } } },
                    scales: { x: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { callback: v => 'R$' + this.fmtN(v / 1e6, 1) + 'M' }, border: { display: false } }, y: { grid: { display: false } } }
                }
            });
        }
    },

    /* ── D2: SLA E WORKFLOW ── */
    renderD2(el, records) {
        const d = this.computeData(records);

        const hmRows = d.CRS.map(cr => {
            const cells = this.STAGES.map(s => {
                const c = records.filter(r => (r.cr ? r.cr.trim() : 'Sem CR') === cr && r.stage === s.id).length;
                const bg = c > 0 ? s.bg : 'transparent';
                const col = c > 0 ? s.color : 'var(--text-3)';
                return `<td><span class="hmcell" style="background:${bg};color:${col}">${c || '—'}</span></td>`;
            }).join('');
            return `<tr><td>${cr}</td>${cells}</tr>`;
        }).join('');

        const blocksHtml = this.STAGES.filter(s => s.id !== 'faturado').map(s => {
            const items = d.slad.filter(r => r.stage === s.id).sort((a, b) => b.sla.pct - a.sla.pct);
            if (!items.length) return '';

            const late = items.filter(r => r.sla.status === 'dn').length;
            const rows = items.map(r => {
                const { status, days, max, pct, label } = r.sla;
                const bc = status === 'ok' ? 'var(--success)' : status === 'wn' ? 'var(--warning)' : 'var(--danger)';
                return `<tr>
                    <td class="mono" style="font-weight:600">CR ${r.cr || 'Sem CR'}</td>
                    <td class="mono" style="font-size:10.5px;color:var(--text-3)">${r.id.substring(0, 8)}</td>
                    <td class="r">${this.fmtR(r.medir)}</td>
                    <td style="font-size:11px;color:var(--text-3)">${r.dataAprovacao || '—'}</td>
                    <td style="text-align:center"><span class="sbadge s-${status}">${label}</span></td>
                    <td>${max ? `<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--bg-3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${bc};border-radius:3px"></div></div><span class="mono" style="font-size:10px;color:var(--text-3);white-space:nowrap">${days}/${max}d</span></div>` : '—'}</td>
                </tr>`;
            }).join('');

            return `<div class="card" style="margin-bottom:16px">
              <div class="ch">
                <div style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${s.color};"></span><div class="ct">${s.label}</div></div>
                <div style="display:flex;align-items:center;gap:8px"><span style="font-size:10.5px;color:var(--text-3)">${items.length} BMs · SLA ${s.sla}d</span><span class="badge" style="background:${late > 0 ? 'rgba(239,68,68,.1)' : s.bg};color:${late > 0 ? 'var(--danger)' : s.color}">${late > 0 ? late + ' atrasado(s)' : 'Dentro do prazo'}</span></div>
              </div>
              <div style="overflow-x:auto">
                <table class="dt">
                  <thead><tr><th>CR</th><th>ID</th><th class="r">A Medir</th><th>Dt. Aprov.</th><th style="text-align:center">Dias na Etapa</th><th>Progresso SLA</th></tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>`;
        }).join('');

        const fat = records.filter(r => r.stage === 'faturado');

        el.innerHTML = `
        <div class="g4">
            <div class="kpi kg"><div class="kl">Conformidade SLA</div><div class="kv lg" style="color:${d.conf >= 80 ? 'var(--success)' : d.conf >= 60 ? 'var(--warning)' : 'var(--danger)'}">${d.conf}%</div><div class="kf">${d.nOK} de ${d.active.length} BMs no prazo</div></div>
            <div class="kpi kt"><div class="kl">Dentro do Prazo</div><div class="kv lg" style="color:var(--teal)">${d.nOK}</div><div class="kf">BMs com SLA OK</div></div>
            <div class="kpi kw"><div class="kl">Em Alerta</div><div class="kv lg" style="color:var(--warning)">${d.nWN}</div><div class="kf">≥ 75% do prazo consumido</div></div>
            <div class="kpi kr"><div class="kl">Fora do Prazo</div><div class="kv lg" style="color:var(--danger)">${d.nDN}</div><div class="kf">SLA expirado</div></div>
        </div>
        
        <div class="g21">
            <div class="card">
              <div class="ch"><div class="ct">Heatmap CR × Etapa</div><span style="font-size:10px;color:var(--text-3)">Qtd. de BMs por combinação</span></div>
              <div class="cb" style="overflow-x:auto; padding:12px;">
                <table class="hm"><thead><tr><th>CR ↓ Etapa →</th>${this.STAGES.map(s => `<th style="color:${s.color}">${s.short}</th>`).join('')}</tr></thead><tbody>${hmRows}</tbody></table>
              </div>
            </div>
            <div class="card">
              <div class="ch"><div class="ct">Distribuição por Etapa</div></div>
              <div class="cb"><div class="cw" style="height:200px"><canvas id="dc-stage-d"></canvas></div></div>
            </div>
        </div>
        
        <div class="st"><span>Detalhe SLA — Boletins Ativos</span><span class="stb">${d.active.length} BMs ativos</span></div>
        ${blocksHtml}
        ${fat.length > 0 ? `<div class="card" style="padding:16px;display:flex;align-items:center;gap:12px"><span style="width:8px;height:8px;border-radius:50%;background:#14b8a6;flex-shrink:0"></span><div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#14b8a6">Faturados</div><div style="font-size:12px;color:var(--text-3);margin-top:2px">${fat.length} boletins · ${this.fmtR(fat.reduce((s, r) => s + (+r.medir || 0), 0))}</div></div><span class="badge" style="background:rgba(20,184,166,.1);color:#14b8a6;margin-left:auto">SLA Encerrado</span></div>` : ''}
        `;

        if (window.Chart) {
            this.createChart('dc-stage-d', {
                type: 'doughnut',
                data: {
                    labels: this.STAGES.map(s => s.label),
                    datasets: [{ data: this.STAGES.map(s => records.filter(r => r.stage === s.id).length), backgroundColor: this.STAGES.map(s => s.color), borderWidth: 2, borderColor: '#fff' }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '60%',
                    plugins: { legend: { position: 'bottom', labels: { padding: 8, font: { size: 10 } } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} BMs` } } }
                }
            });
        }
    },

    /* ── D3: FINANCEIRO POR CR ── */
    renderD3(el, records) {
        const d = this.computeData(records);

        if (!this.activeCr || !d.CRS.includes(this.activeCr)) {
            this.activeCr = d.CRS.length > 0 ? d.CRS[0] : null;
        }

        if (!this.activeCr) {
            el.innerHTML = `<div style="text-align:center; padding: 40px; color:var(--text-3);">Nenhum CR selecionado ou encontrado.</div>`;
            return;
        }

        const cr = this.activeCr;
        const cd = d.crd[cr];
        const rs = records.filter(r => (r.cr ? r.cr.trim() : 'Sem CR') === cr);

        const wfMax = cd.medir;
        const wf = [
            { label: 'Volume a Medir', val: cd.medir, color: '#2563eb' },
            { label: 'Valor BM Enviado', val: cd.bm, color: '#22c55e', empty: !cd.bm },
            { label: '(−) Glosas', val: cd.glosa, color: '#ef4444', empty: !cd.glosa },
            { label: 'Líquido Estimado', val: cd.medir - cd.glosa, color: '#14b8a6' }
        ];

        const crTabsHtml = d.CRS.map(c => `<button class="crtab${c === this.activeCr ? ' on' : ''}" onclick="Dashboard.activeCr='${c}'; Dashboard.render();">${c}</button>`).join('');
        const trowsHtml = rs.map(r => `<tr><td style="font-size:11px;color:var(--text-3)">${r.mes || '—'}</td><td class="mono" style="font-size:10.5px;color:var(--text-3)">ID ${r.id.substring(0, 6)}</td><td class="r mono" style="font-weight:600">${this.fmtR(r.medir)}</td><td class="r mono" style="color:${+r.valorBM > 0 ? 'var(--text-1)' : 'var(--text-3)'}">${+r.valorBM > 0 ? this.fmtR(r.valorBM) : '—'}</td><td class="r mono" style="color:${+r.valorGlosa > 0 ? 'var(--danger)' : 'var(--text-3)'}">${+r.valorGlosa > 0 ? this.fmtR(r.valorGlosa) : '—'}</td><td><span class="badge" style="background:${this.getSlaDef(r.stage).bg};color:${this.getSlaDef(r.stage).color}">${this.getSlaDef(r.stage).label}</span></td></tr>`).join('');

        el.innerHTML = `
        <div class="st" style="margin-bottom:12px"><span>Selecione o Centro de Resultado</span></div>
        <div class="cr-tabs">${crTabsHtml}</div>
        
        <div class="g4">
            <div class="kpi kb"><div class="kl">Volume a Medir</div><div class="kv sm">${this.fmtR(cd.medir)}</div><div class="kf">${cd.count} boletins</div></div>
            <div class="kpi kt"><div class="kl">Faturado</div><div class="kv sm">${this.fmtR(cd.fat)}</div><div class="kf">${cd.fatCount} BMs faturados</div></div>
            <div class="kpi kr"><div class="kl">Glosas</div><div class="kv sm">${cd.glosa > 0 ? this.fmtR(cd.glosa) : 'R$ 0,00'}</div><div class="kf">${rs.filter(r => +r.valorGlosa > 0).length} BM(s) glosado(s)</div></div>
            <div class="kpi kw"><div class="kl">Em Andamento</div><div class="kv sm">${this.fmtR(cd.medir - cd.fat)}</div><div class="kf">${cd.count - cd.fatCount} BMs pendentes</div></div>
        </div>

        <div class="g21">
            <div class="card">
              <div class="ch"><div class="ct">Waterfall Financeiro — CR ${cr}</div><span style="font-size:10px;color:var(--text-3)">Medir → BM Enviado → (−) Glosa → Líquido</span></div>
              <div class="cb" style="padding:10px 16px;">
                ${wf.map(w => {
            const p = wfMax > 0 ? Math.max(Math.round(w.val / wfMax * 100), w.val > 0 ? 3 : 0) : 0;
            return `<div class="wfi"><div class="wfl">${w.label}</div><div class="wft">${w.val > 0 ? `<div class="wff" style="width:${p}%;background:${w.color}"><span>${this.fmtR(w.val)}</span></div>` : `<div style="display:flex;align-items:center;padding:0 12px;height:100%;font-size:11px;color:var(--text-3)">Não preenchido</div>`}</div><div class="wfv" style="color:${w.val > 0 ? 'var(--text-1)' : 'var(--text-3)'}">${w.val > 0 ? this.fmtR(w.val) : '—'}</div></div>`;
        }).join('')}
              </div>
            </div>
            <div class="card">
                <div class="ch"><div class="ct">BMs por Etapa</div></div>
                <div class="cb"><div class="cw" style="height:220px"><canvas id="dc-cr-stage"></canvas></div></div>
            </div>
        </div>

        <div class="card">
            <div class="ch"><div class="ct">Detalhe dos BMs — CR ${cr}</div><span style="font-size:10.5px;color:var(--text-3)">${rs.length} registros</span></div>
            <div style="overflow-x:auto">
                <table class="dt">
                    <thead><tr><th>Mês</th><th>ID BM</th><th class="r">A Medir</th><th class="r">Valor BM</th><th class="r">Glosa</th><th>Etapa</th></tr></thead>
                    <tbody>${trowsHtml || '<tr><td colspan="6" style="text-align:center">Nenhum registro.</td></tr>'}</tbody>
                </table>
            </div>
            <div class="tfoot"><div class="tfl">${rs.length} boletins</div><div class="tfl">Total a medir: <strong>${this.fmtR(cd.medir)}</strong></div>${cd.fat > 0 ? `<div class="tfl">Faturado: <strong>${this.fmtR(cd.fat)}</strong></div>` : ''}</div>
        </div>
        `;

        if (window.Chart) {
            const sdist = this.STAGES.map(s => rs.filter(r => r.stage === s.id).length);
            this.createChart('dc-cr-stage', {
                type: 'doughnut',
                data: {
                    labels: this.STAGES.map(s => s.label),
                    datasets: [{ data: sdist, backgroundColor: this.STAGES.map(s => s.color), borderWidth: 2, borderColor: '#ffffff' }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '60%',
                    plugins: { legend: { position: 'bottom', labels: { padding: 8, font: { size: 10 }, filter: (item, d) => d.datasets[0].data[item.index] > 0 } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} BMs` } } }
                }
            });
        }
    },

    getFiltered() {
        const { crs, stages, meses, q } = ControlState.filters;
        const lowerQ = (q || '').toLowerCase();
        return (ControlState.records || []).filter(r => {
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
            return matchCR && matchStage && matchMes && matchQ;
        });
    }
};
