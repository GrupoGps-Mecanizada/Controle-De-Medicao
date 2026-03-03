window.ControlState = {
    records: [],
    fixedCRs: [],
    fixedCRsObjects: [],
    motivosGlosa: ["Quebra de equipamento", "Falta de efetivo", "Atestado", "Férias", "Posto vago"],
    currentView: 'dashboard',
    filters: {
        cr: 'all',
        stage: 'all',
        mes: 'all',
        q: '',
        cols: {} // { 'cr': ['18512'], 'stage': ['faturado'] }
    }
};
