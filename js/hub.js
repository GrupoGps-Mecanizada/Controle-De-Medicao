'use strict';

window.Hub = {
    sectors: [
        { id: 'mecanizada', label: 'MECANIZADA', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', color: '#0a2fa8' },
        { id: 'urbana', label: 'URBANA', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>', color: '#0369a1' },
        { id: 'tecnica', label: 'TÉCNICA', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>', color: '#0369a1' },
        { id: 'administrativo', label: 'ADMINISTRATIVO', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>', color: '#0f766e' },
    ],

    sectorData: {
        mecanizada: [
            {
                id: 'log', category: 'LOGÍSTICA', color: '#d97706',
                items: [
                    { name: 'Almoxarifado', url: 'https://grupogps-mecanizada.github.io/Almoxarifado/' },
                ]
            },
            {
                id: 'admin_mec', category: 'ADMINISTRATIVO', color: '#2563eb',
                items: [
                    { name: 'Controle Efetivo', url: 'https://grupogps-mecanizada.github.io/Gest-o-Efetivo/' },
                    { name: 'Controle Presença', url: 'https://grupogps-mecanizada.github.io/Controle-De-Presen-a/' },
                    { name: 'Relatório Turno', url: 'https://grupogps-mecanizada.github.io/Relat-rio-Turno---Oficial/' },
                    { name: 'Horas Extras', url: 'https://grupogps-mecanizada.github.io/CLASSIFICAR-HORAS/' },
                ]
            },
            {
                id: 'seg', category: 'SEGURANÇA', color: '#059669',
                items: [
                    { name: 'Etilômetro Digital', url: 'https://grupogps-mecanizada.github.io/Sistema-Etilometro/' },
                ]
            },
            {
                id: 'frota', category: 'FROTA', color: '#9333ea',
                items: [
                    { name: 'Controle de Frota', url: 'https://grupogps-mecanizada.github.io/Gest-o-De-Frotas---2/' },
                    { name: 'Manutenções', url: 'https://grupogps-mecanizada.github.io/Manuten-o-/' },
                    { name: 'Apontamentos', url: 'https://grupogps-mecanizada.github.io/Apontamento-Dos-Tablets/' },
                ]
            },
        ],
        administrativo: [
            {
                id: 'medicao', category: 'MEDIÇÃO', color: '#0f766e',
                items: [
                    { name: 'Controle Medição', url: '#', current: true },
                ]
            },
        ],
        urbana: [],
        tecnica: [],
    },

    init() {
        const body = document.getElementById('hub-tree-body');
        if (!body) return;

        let html = '';
        this.sectors.forEach(s => {
            const data = this.sectorData[s.id] || [];
            const isOpen = s.id === 'administrativo' ? ' open' : '';

            html += `
                <div class="hub-sector${isOpen}">
                    <div class="hub-sector-header" data-sector="${s.id}">
                        <div class="hub-sector-title" style="color: ${s.color}">${s.label}</div>
                        <svg class="hub-sector-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </div>
                    <div class="hub-sector-body">
            `;

            if (data.length === 0) {
                html += `<div style="font-size:12px; color:#94a3b8; padding: 10px 0;">Em desenvolvimento</div>`;
            } else {
                data.forEach(cat => {
                    html += `
                        <div class="hub-category">
                            <div class="hub-category-title" style="color: ${cat.color}">
                                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${cat.color}"></span>
                                ${cat.category}
                            </div>
                            <ul class="hub-links">
                    `;
                    cat.items.forEach(item => {
                        const isCurrent = item.current === true;
                        const linkStyle = isCurrent ? 'font-weight:700; color:#0f766e; pointer-events:none;' : '';
                        const badge = isCurrent ? '<span style="margin-left:auto;font-size:9px;background:#ccfbf1;color:#0f766e;padding:1px 6px;border-radius:8px;font-weight:700">ATUAL</span>' : '';
                        const target = (item.url === '#' || isCurrent) ? '_self' : '_blank';
                        const icon = (!isCurrent && item.url !== '#') ? '<svg style="margin-left:auto;color:#cbd5e1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>' : '';
                        html += `
                            <li class="hub-link-item">
                                <a href="${item.url}" class="hub-link" target="${target}" style="${linkStyle}">
                                    ${item.name}
                                    ${badge}
                                    ${icon}
                                </a>
                            </li>
                        `;
                    });
                    html += `
                            </ul>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
            `;
        });

        body.innerHTML = html;

        // Accordion toggle
        body.querySelectorAll('.hub-sector-header').forEach(h => {
            h.addEventListener('click', () => {
                const sector = h.closest('.hub-sector');
                const wasOpen = sector.classList.contains('open');
                body.querySelectorAll('.hub-sector').forEach(s => s.classList.remove('open'));
                if (!wasOpen) sector.classList.add('open');
            });
        });

        // Overlay controls
        const btn = document.getElementById('hub-menu-btn');
        const overlay = document.getElementById('hub-dropdown-overlay');
        const closeBtn = document.getElementById('hub-close-btn');

        if (btn && overlay) {
            btn.addEventListener('click', () => overlay.classList.add('show'));
        }
        if (closeBtn && overlay) {
            closeBtn.addEventListener('click', () => overlay.classList.remove('show'));
        }
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('show');
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Hub.init();
});
