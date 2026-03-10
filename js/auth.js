'use strict';

/**
 * Controle de Medicao — Authentication Module (Via Central SGE SSO com fallback local)
 * Handles token recovery, session management, and role-based permissions
 *
 * BYPASS ativo para rollout gradual — login local via Supabase Auth continua funcionando.
 * Quando a Central SSO estiver 100%, basta comentar a linha SGE_SSO_BYPASS = true.
 */

// ========== SSO MODE ==========
// BYPASS ativo para rollout gradual — login local continua funcionando
window.SGE_SSO_BYPASS = true;

// Instancia o SDK passando o slug do sistema
const ssoClient = new window.SgeAuthSDK('controle_medicao_adm');

window.Auth = {
    currentUser: null,

    /**
     * Initialize Auth — tenta SSO, senao fallback para Supabase local
     */
    async init() {
        // 1. Tenta autenticacao via SSO Token
        const userData = await ssoClient.checkAuth();

        if (userData) {
            console.log('[MEDICAO AUTH] Autenticado via SSO:', userData.nome);
            this.updateCurrentUser({
                id: userData.id,
                email: userData.email,
                nome: userData.nome,
                perfil: userData.perfil || 'VISAO'
            });

            // Recuperar access_token da sessao Supabase (necessario para RLS)
            let token = null;
            try {
                if (window.supabase) {
                    const { data: { session } } = await window.supabase.auth.getSession();
                    token = session?.access_token || null;
                }
            } catch (e) {
                console.warn('[MEDICAO AUTH] Nao foi possivel recuperar token Supabase:', e);
            }

            await this.registerSession(userData.id, token);
            return true;
        }

        if (ssoClient.isBypass()) {
            // BYPASS: tenta autenticacao via sessao Supabase local
            console.log('[MEDICAO AUTH] BYPASS ativo — verificando sessao Supabase local...');
            try {
                if (window.supabase) {
                    const { data: { session } } = await window.supabase.auth.getSession();

                    // Listen for auth state changes (local mode)
                    supabase.auth.onAuthStateChange((_event, session) => {
                        if (session) {
                            this._updateFromSupabaseUser(session.user);
                        } else {
                            this.currentUser = null;
                        }
                    });

                    if (session && session.user) {
                        console.log('[MEDICAO AUTH] Sessao Supabase local encontrada:', session.user.email);
                        this._updateFromSupabaseUser(session.user);
                        await this.registerSession(session.user.id, session.access_token);
                        return true;
                    }
                }
            } catch (e) {
                console.warn('[MEDICAO AUTH] Erro ao verificar sessao Supabase:', e);
            }

            console.log('[MEDICAO AUTH] Sem sessao — exibindo login local');
            return false;
        }

        // SSO ativo mas sem token — ssoClient ja redirecionou
        return false;
    },

    /**
     * Popula currentUser a partir de user do Supabase Auth (modo local/bypass)
     * Preserva a logica original de roles por dominio de e-mail
     */
    _updateFromSupabaseUser(user) {
        const email = user.email || '';
        let perfil = user.user_metadata?.perfil || 'VISAO';

        if (email.endsWith('@sge') || email.endsWith('@sge.com')) {
            perfil = 'ADM';
        } else if (email.endsWith('@gestaomecanizada.com')) {
            perfil = 'GESTAO';
        } else if (email.endsWith('@mecanizada.com')) {
            perfil = 'VISAO';
        }

        this.updateCurrentUser({
            id: user.id,
            email: email,
            nome: user.user_metadata?.full_name || email.split('@')[0],
            perfil: perfil
        });
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

    /**
     * Register session in sge_central_sessoes for the Radar
     */
    async registerSession(userId, accessToken) {
        try {
            const existingId = localStorage.getItem('sge_session_id');
            if (existingId) {
                console.log('[MEDICAO AUTH] Sessao ja registrada:', existingId);
                return;
            }

            if (!accessToken) {
                try {
                    if (window.supabase) {
                        const { data: { session } } = await window.supabase.auth.getSession();
                        accessToken = session?.access_token || null;
                    }
                } catch (e) { /* ignore */ }
            }

            if (!accessToken) {
                console.warn('[MEDICAO AUTH] Sem token autenticado — sessao nao sera registrada (RLS bloqueia anon)');
                return;
            }

            const SUPABASE_URL = window.SUPABASE_URL || window.Auth._getSupabaseUrl();
            const ANON_KEY = window.SUPABASE_KEY || window.Auth._getAnonKey();
            if (!SUPABASE_URL || !ANON_KEY) return;

            const headers = {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Profile': 'gps_compartilhado',
                'Accept-Profile': 'gps_compartilhado',
                'Prefer': 'return=representation'
            };

            // Get sistema_id for this app slug
            const sysResp = await fetch(
                `${SUPABASE_URL}/rest/v1/sge_central_sistemas?slug=eq.controle_medicao_adm&select=id`,
                { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Accept-Profile': 'gps_compartilhado', 'Accept': 'application/vnd.pgrst.object+json' } }
            );

            if (!sysResp.ok) {
                console.warn('[MEDICAO AUTH] Nao conseguiu buscar sistema para sessao');
                return;
            }

            const sysData = await sysResp.json();
            if (!sysData?.id) return;

            // Insert session
            const sessResp = await fetch(`${SUPABASE_URL}/rest/v1/sge_central_sessoes`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    usuario_id: userId,
                    sistema_id: sysData.id,
                    ip_address: '0.0.0.0',
                    user_agent: navigator.userAgent.substring(0, 200),
                    expira_em: new Date(Date.now() + (1000 * 60 * 60 * 8)).toISOString()
                })
            });

            if (sessResp.ok) {
                const sessData = await sessResp.json();
                const sessionId = Array.isArray(sessData) ? sessData[0]?.id : sessData?.id;
                if (sessionId) {
                    localStorage.setItem('sge_session_id', sessionId);
                    localStorage.setItem('sge_session_user_id', userId);
                    localStorage.setItem('sge_session_token', accessToken);
                    localStorage.setItem('sge_session_user_name', this.currentUser?.nome || 'Usuario');
                    localStorage.setItem('sge_session_user_email', this.currentUser?.email || '');
                    localStorage.setItem('sge_session_app_slug', 'controle_medicao_adm');
                    localStorage.setItem('sge_session_app_name', 'Controle de Medicao');
                    console.log('[MEDICAO AUTH] Sessao registrada para Radar:', sessionId);
                    if (window.SGE_SESSION_PING) window.SGE_SESSION_PING.start();
                }
            } else {
                const errText = await sessResp.text().catch(() => '');
                console.warn('[MEDICAO AUTH] Falha ao registrar sessao:', sessResp.status, errText);
            }
        } catch (err) {
            console.warn('[MEDICAO AUTH] Erro ao registrar sessao:', err);
        }
    },

    /**
     * Helper: resolve Supabase URL from config or supabase client
     */
    _getSupabaseUrl() {
        try {
            if (window.supabase?.supabaseUrl) return window.supabase.supabaseUrl;
            if (window.CONFIG?.SUPABASE_URL) return window.CONFIG.SUPABASE_URL;
        } catch (e) { }
        return null;
    },

    _getAnonKey() {
        try {
            if (window.supabase?.supabaseKey) return window.supabase.supabaseKey;
            if (window.CONFIG?.SUPABASE_KEY) return window.CONFIG.SUPABASE_KEY;
        } catch (e) { }
        return null;
    },

    /**
     * Login local via Supabase Auth (usado em BYPASS mode)
     */
    async login(email, password) {
        if (!window.supabase) return { success: false, error: 'Supabase nao configurado' };

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            this._updateFromSupabaseUser(data.user);
            await this.registerSession(data.user.id, data.session?.access_token);
            return { success: true, user: this.currentUser };
        } catch (e) {
            return { success: false, error: 'Credenciais invalidas ou erro no login' };
        }
    },

    /**
     * Register local via Supabase Auth (usado em BYPASS mode)
     */
    async register(email, password, name) {
        if (!window.supabase) return { success: false, error: 'Supabase nao configurado' };

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

    /**
     * Logout
     */
    async logout() {
        console.log('[MEDICAO AUTH] Logout');

        // Clean up session data
        try {
            localStorage.removeItem('sge_session_id');
            localStorage.removeItem('sge_session_user_id');
            localStorage.removeItem('sge_session_token');
            localStorage.removeItem('sge_session_user_name');
            localStorage.removeItem('sge_session_user_email');
            localStorage.removeItem('sge_session_app_slug');
            localStorage.removeItem('sge_session_app_name');
        } catch (e) { }

        // Stop ping
        if (window.SGE_SESSION_PING) window.SGE_SESSION_PING.stop();

        if (ssoClient.isBypass()) {
            if (window.supabase) await supabase.auth.signOut();
            window.location.reload();
            return;
        }

        ssoClient.logout();
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
