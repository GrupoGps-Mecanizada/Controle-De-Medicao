'use strict';

window.Auth = {
    currentUser: null,

    async init() {
        if (!window.supabase) return false;

        const { data: { session } } = await supabase.auth.getSession();

        supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                this.updateCurrentUser(session.user);
            } else {
                this.currentUser = null;
            }
        });

        if (session) {
            this.updateCurrentUser(session.user);
            return true;
        }
        return false;
    },

    updateCurrentUser(user) {
        const email = user.email || '';
        let perfil = user.user_metadata?.perfil || 'VISAO';

        if (email.endsWith('@sge') || email.endsWith('@sge.com')) {
            perfil = 'ADM';
        } else if (email.endsWith('@gestaomecanizada.com')) {
            perfil = 'GESTAO';
        } else if (email.endsWith('@mecanizada.com')) {
            perfil = 'VISAO';
        }

        this.currentUser = {
            id: user.id,
            usuario: email.split('@')[0],
            email: email,
            nome: user.user_metadata?.full_name || email.split('@')[0],
            perfil: perfil
        };

        this.applyRoleUI(this.currentUser.perfil);
    },

    async login(email, password) {
        if (!window.supabase) return { success: false, error: 'Supabase não configurado' };

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            this.updateCurrentUser(data.user);
            return { success: true, user: this.currentUser };
        } catch (e) {
            return { success: false, error: 'Credenciais inválidas ou erro no login' };
        }
    },

    async register(email, password, name) {
        if (!window.supabase) return { success: false, error: 'Supabase não configurado' };

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        perfil: 'VISAO',
                        full_name: name
                    }
                }
            });

            if (error) throw error;

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message || 'Erro ao criar conta' };
        }
    },

    async logout() {
        if (window.supabase) await supabase.auth.signOut();
        window.location.reload();
    },

    hasRole(requiredRole) {
        if (!this.currentUser) return false;
        const role = this.currentUser.perfil;
        if (role === 'ADM') return true;
        if (requiredRole === 'GESTAO' && role === 'GESTAO') return true;
        if (requiredRole === 'VISAO') return true;
        return false;
    },

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
                    err.textContent = 'Conta criada com sucesso! Faça login.';
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
                toggleReg.textContent = 'Já tenho uma conta';
                document.getElementById('login-name').setAttribute('required', 'true');
            }
        });
    }

    // Attempt auto-login
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
