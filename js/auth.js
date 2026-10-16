'use strict';

/**
 * Controle de Medição — Login (via SGE.acesso do sge-core)
 * Usa a sessão real do login da Central (Supabase Auth). Sem sessão, vai para o login da Central.
 * Na dúvida (erro, rede), não entra.
 */

const SLUG_SISTEMA = 'controle_medicao_adm';

// Régua única → nomes antigos (ver "Régua única de acesso - especificação" no cofre).
const PERFIL_POR_PAPEL = { ADMIN: 'ADM', GESTOR: 'GESTAO' };

window.Auth = {
    currentUser: null,

    async init() {
        const core = window.SGECore;
        if (!core || !core.acesso) {
            // Sem o sge-core (falha ao baixar) não dá para conferir o login: não entra.
            const status = document.getElementById('loading-status');
            if (status) status.textContent = 'Não consegui carregar o login. Confira a internet e recarregue a página.';
            await new Promise(() => {});
        }

        // Só continua se a pessoa estiver logada e tiver acesso a este sistema.
        const r = await core.acesso.entrar(SLUG_SISTEMA);
        this.updateCurrentUser({
            id: r.usuario.id,
            email: r.usuario.email,
            nome: r.usuario.nome,
            perfil: PERFIL_POR_PAPEL[r.papel] || 'VISAO'
        });
        return true;
    },

    /**
     * Update internal state based on user data (JWT payload ou Supabase session)
     */
    updateCurrentUser(user) {
        this.currentUser = {
            id: user.id || null,
            usuario: user.email ? user.email.split('@')[0] : 'Desconhecido',
            email: user.email || '',
            nome: user.nome || 'Usuario',
            perfil: user.perfil || 'VISAO'
        };

        console.log('[MEDICAO AUTH] Perfil aplicado:', this.currentUser.perfil);
        this.applyRoleUI(this.currentUser.perfil);
    },

    // O login agora é só pela Central.
    async login() { return { success: false, error: 'Entre pela Central do SGE.' }; },
    async register() { return { success: false, error: 'O cadastro é feito pela Central do SGE.' }; },

    async logout() {
        window.SGECore.acesso.sair(SLUG_SISTEMA);
    },

    /**
     * Check role hierarchy: ADM > GESTAO > VISAO
     */
    hasRole(requiredRole) {
        if (!this.currentUser) return false;
        const role = this.currentUser.perfil;
        if (role === 'ADM') return true;
        if (requiredRole === 'GESTAO' && role === 'GESTAO') return true;
        if (requiredRole === 'VISAO') return true;
        return false;
    },

    /**
     * Apply CSS classes and UI logic based on role
     */
    applyRoleUI(role) {
        document.body.classList.remove('role-adm', 'role-gestao', 'role-visao');
        document.body.classList.add(`role-${role.toLowerCase()}`);

        const menuUser = document.getElementById('nav-menu-user');
        if (menuUser && this.currentUser) {
            menuUser.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                  <span style="color:var(--text-3); font-size:11px;">Bem-vindo(a),</span>
                  <strong style="color:var(--text-1); font-weight:700; font-size:13px;">${this.currentUser.usuario}</strong>
                  <span style="color:var(--text-3); font-size:10px;">${this.currentUser.perfil}</span>
                </div>
            `;
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.logout();
        }
    }
};

// Hook into login form
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-submit');
            const err = document.getElementById('login-error');
            const email = document.getElementById('login-user').value;
            const pass = document.getElementById('login-pass').value;
            const isReg = document.getElementById('group-name').style.display !== 'none' && document.getElementById('group-name').style.display !== '';
            const name = document.getElementById('login-name').value;

            btn.disabled = true;
            btn.innerHTML = '<div class="spinner"></div>';
            err.textContent = '';

            let res;
            if (isReg) {
                res = await Auth.register(email, pass, name);
                if (res.success) {
                    err.style.color = 'var(--success)';
                    err.textContent = 'Conta criada com sucesso! Faca login.';
                    document.getElementById('toggle-register').click();
                } else {
                    err.textContent = res.error;
                }
            } else {
                res = await Auth.login(email, pass);
                if (res.success) {
                    document.getElementById('login-screen').classList.add('hidden');
                    if (window.initApp) window.initApp();
                } else {
                    err.textContent = res.error;
                }
            }

            btn.disabled = false;
            btn.textContent = isReg ? 'Criar Conta' : 'Entrar';
        });
    }

    const toggleReg = document.getElementById('toggle-register');
    if (toggleReg) {
        toggleReg.addEventListener('click', (e) => {
            e.preventDefault();
            const grp = document.getElementById('group-name');
            const btn = document.getElementById('login-submit');
            const isReg = grp.style.display !== 'none';
            if (isReg) {
                grp.style.display = 'none';
                btn.textContent = 'Entrar';
                toggleReg.textContent = 'Criar uma conta';
                document.getElementById('login-name').removeAttribute('required');
            } else {
                grp.style.display = 'block';
                btn.textContent = 'Criar Conta';
                toggleReg.textContent = 'Ja tenho uma conta';
                document.getElementById('login-name').setAttribute('required', 'true');
            }
        });
    }

    // Attempt auto-login (SSO first, then fallback)
    Auth.init().then(isLoggedIn => {
        if (isLoggedIn) {
            document.getElementById('login-screen').classList.add('hidden');
            if (window.initApp) window.initApp();
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
            const loader = document.getElementById('loading-screen');
            if (loader) loader.style.display = 'none';
        }
    });
});
