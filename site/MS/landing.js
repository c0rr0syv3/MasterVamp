// ==========================================
// LANDING.JS — Vampiro: A Máscara
// ==========================================

const API_URL = '/api';
let currentAuthMode = 'login';
let _fichasCache = [];       // cache das fichas carregadas
let _modalFichaId = null;    // id da ficha aberta no modal
let _currentModalTab = 'desc';

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {

    try {
        const res = await fetch(`${API_URL}?action=check_auth`, { credentials: 'include' });
        const data = await res.json();
        if (data.logged_in) {
            await mostrarDashboard(data.username);
        } else {
            mostrarActionsIniciais();
        }
    } catch(e) {
        mostrarActionsIniciais();
    }

    // Import de JSON
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const jsonContent = event.target.result;
                    JSON.parse(jsonContent);
                    localStorage.removeItem('vtm_current_editing_char');
                    localStorage.setItem('vtm_import_data', jsonContent);
                    window.location.href = 'sheet/ficha.html';
                } catch(err) {
                    mostrarToast('Arquivo inválido. Use um .json exportado da ficha.', false);
                }
            };
            reader.readAsText(file);
        });
    }
});

// ==========================================
// ESTADOS DA UI
// ==========================================
function mostrarActionsIniciais() {
    document.getElementById('main-actions').style.display = 'flex';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'none';
}

async function mostrarDashboard(username) {
    document.getElementById('main-actions').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('display-user').textContent = username;
    await carregarFichas(username);
}

function showLogin() {
    document.getElementById('main-actions').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('dashboard-section').style.display = 'none';
    switchTab('login');
}
function hideLogin() { mostrarActionsIniciais(); }

// ==========================================
// TABS LOGIN / CADASTRO
// ==========================================
function switchTab(mode) {
    currentAuthMode = mode;
    document.getElementById('tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('tab-register').classList.toggle('active', mode === 'register');
    document.getElementById('master-checkbox-container').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('btn-auth-action').innerHTML = mode === 'login'
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Acessar`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Criar Conta`;
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================
async function handleAuth() {
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value;
    const isMaster = document.getElementById('is-master-check').checked;
    if (!username || !password) { mostrarToast('Preencha usuário e senha.', false); return; }

    const btn = document.getElementById('btn-auth-action');
    btn.disabled = true;

    try {
        const action = currentAuthMode === 'login' ? 'login' : 'register';
        const body = { username, password };
        if (currentAuthMode === 'register') body.isMaster = isMaster;

        const res = await fetch(`${API_URL}?action=${action}`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.success) {
            mostrarToast(currentAuthMode === 'login' ? 'Bem-vindo de volta!' : 'Conta criada!', true);
            setTimeout(() => window.location.reload(), 800);
        } else {
            mostrarToast(data.error || 'Erro ao autenticar.', false);
            btn.disabled = false;
        }
    } catch(e) {
        mostrarToast('Servidor indisponível.', false);
        btn.disabled = false;
    }
}

// ==========================================
// CARREGAR FICHAS DO USUÁRIO
// ==========================================
async function carregarFichas(username) {
    const list = document.getElementById('fichas-list');
    list.innerHTML = '<div class="fichas-loading">Invocando pergaminhos...</div>';

    try {
        const res = await fetch(`${API_URL}?action=get_all`, { credentials: 'include' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const all = await res.json();

        if (!Array.isArray(all)) throw new Error('Resposta inválida');

        // Filtra fichas do utilizador — 'owner' é o username resolvido pelo JOIN no PHP
        const minhas = all.filter(c => c.owner === username);

        _fichasCache = minhas;
        renderizarFichas(minhas);
    } catch(e) {
        // Fallback local
        const raw = localStorage.getItem('vtm_ficha');
        if (raw) {
            const local = JSON.parse(raw);
            local.id    = local.id || 'local_0';
            local.owner = username;
            _fichasCache = [local];
            renderizarFichas([local]);
        } else {
            _fichasCache = [];
            renderizarFichas([]);
        }
    }
}

function renderizarFichas(fichas) {
    const list = document.getElementById('fichas-list');
    const countEl = document.getElementById('fichas-count');
    countEl.textContent = fichas.length;
    list.innerHTML = '';

    if (!fichas.length) {
        list.innerHTML = `
            <div class="fichas-empty">
                <div class="fichas-empty-text">Você está sem fichas</div>
            </div>`;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'fichas-grid';

    fichas.forEach(ficha => {
        const id    = ficha.id || '';
        const nome  = ficha.inputs?.nome || 'Sem nome';
        const cla   = ficha.inputs?.cla  || '';
        const gen   = ficha.inputs?.geracao ? `Geração ${ficha.inputs.geracao}` : '';
        const foto  = ficha.inputs?.foto_perfil || '';
        const extra = ficha._extra || {};  // descritivo salvo separadamente

        // Foto
        let fotoHtml = '';
        if (foto && foto.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) {
            fotoHtml = `<img class="ficha-foto" src="${foto}" alt="${nome}" onerror="this.style.display='none'">`;
        } else {
            fotoHtml = `<div class="ficha-foto-ph">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8a0000" stroke-width="1.5" opacity="0.4">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
            </div>`;
        }

        // Badges descritivo / história
        const temDesc = !!(extra.descricao || extra.idade);
        const temHist = !!(extra.historiaLink);
        const badges = [
            temDesc ? '<span class="badge badge-desc">Descrição</span>' : '',
            temHist ? '<span class="badge badge-hist">História</span>' : '',
        ].join('');

        const card = document.createElement('div');
        card.className = 'ficha-card';
        card.innerHTML = `
            ${fotoHtml}
            <div class="ficha-info">
                <div class="ficha-nome">${nome}</div>
                <div class="ficha-meta">${[cla, gen].filter(Boolean).join(' · ')}</div>
                ${badges ? `<div class="ficha-badges">${badges}</div>` : ''}
            </div>
            <div class="ficha-actions">
                <button class="btn-small" onclick="editarFicha('${id}')">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar
                </button>
                <button class="btn-small" onclick="abrirModal('${id}')">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Perfil
                </button>
                <button class="btn-small danger" onclick="apagarFicha('${id}')">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    Apagar
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    list.appendChild(grid);
}

// ==========================================
// AÇÕES DE FICHA
// ==========================================
function createNewSheet() {
    localStorage.removeItem('vtm_current_editing_char');
    localStorage.removeItem('vtm_import_data');
    window.location.href = 'sheet/ficha.html';
}

function editarFicha(id) {
    localStorage.setItem('vtm_current_editing_char', id);
    localStorage.removeItem('vtm_import_data');
    window.location.href = 'sheet/ficha.html';
}

async function apagarFicha(id) {
    if (!confirm('Tem certeza que deseja apagar este personagem permanentemente?')) return;
    try {
        const res = await fetch(`${API_URL}?action=delete`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) {
            mostrarToast('Personagem apagado.', true);
            _fichasCache = _fichasCache.filter(f => f.id !== id);
            renderizarFichas(_fichasCache);
        } else {
            mostrarToast(data.error || 'Erro ao apagar.', false);
        }
    } catch(e) {
        mostrarToast('Servidor indisponível.', false);
    }
}

// ==========================================
// MODAL: DESCRITIVO + HISTÓRIA
// ==========================================
function abrirModal(id) {
    _modalFichaId = id;
    const ficha = _fichasCache.find(f => f.id === id);
    if (!ficha) return;

    const nome = ficha.inputs?.nome || 'Personagem';
    document.getElementById('modal-char-name').textContent = nome;

    // Preenche campos descritivos (salvos em ficha._extra)
    const extra = ficha._extra || {};
    document.getElementById('spec-idade').value    = extra.idade    || '';
    document.getElementById('spec-altura').value   = extra.altura   || '';
    document.getElementById('spec-tipo').value     = extra.tipo     || '';
    document.getElementById('spec-olhos').value    = extra.olhos    || '';
    document.getElementById('spec-cabelo').value   = extra.cabelo   || '';
    document.getElementById('spec-tracos').value   = extra.tracos   || '';
    document.getElementById('spec-descricao').value = extra.descricao || '';
    document.getElementById('hist-link').value     = extra.historiaLink || '';
    previewHistLink(extra.historiaLink || '');

    switchModalTab('desc');
    document.getElementById('modal-overlay').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    _modalFichaId = null;
}

function fecharModalFora(event) {
    if (event.target === document.getElementById('modal-overlay')) fecharModal();
}

function switchModalTab(tab) {
    _currentModalTab = tab;
    document.getElementById('modal-tab-desc').classList.toggle('active', tab === 'desc');
    document.getElementById('modal-tab-hist').classList.toggle('active', tab === 'hist');
    document.getElementById('modal-panel-desc').style.display = tab === 'desc' ? 'block' : 'none';
    document.getElementById('modal-panel-hist').style.display = tab === 'hist' ? 'block' : 'none';
}

function previewHistLink(url) {
    const preview = document.getElementById('hist-preview');
    const anchor  = document.getElementById('hist-anchor');
    const isUrl = url && url.startsWith('http');
    preview.style.display = isUrl ? 'flex' : 'none';
    if (isUrl) {
        anchor.href = url;
        anchor.textContent = url.length > 60 ? url.slice(0, 60) + '…' : url;
    }
}

async function salvarDescritivo() {
    if (!_modalFichaId) return;

    const extra = {
        idade:        document.getElementById('spec-idade').value.trim(),
        altura:       document.getElementById('spec-altura').value.trim(),
        tipo:         document.getElementById('spec-tipo').value.trim(),
        olhos:        document.getElementById('spec-olhos').value.trim(),
        cabelo:       document.getElementById('spec-cabelo').value.trim(),
        tracos:       document.getElementById('spec-tracos').value.trim(),
        descricao:    document.getElementById('spec-descricao').value.trim(),
        historiaLink: document.getElementById('hist-link').value.trim(),
    };

    // Valida link de história
    if (extra.historiaLink && !extra.historiaLink.startsWith('http')) {
        mostrarToast('A história deve ser um link completo (começando com http...).', false);
        return;
    }

    // Atualiza cache local
    const ficha = _fichasCache.find(f => f.id === _modalFichaId);
    if (ficha) ficha._extra = extra;

    // Salva no servidor junto com o resto da ficha
    try {
        const payload = { ...(ficha || {}), _extra: extra, id: _modalFichaId };
        const res = await fetch(`${API_URL}?action=save`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success || data.id) {
            mostrarToast('Perfil salvo!', true);
            renderizarFichas(_fichasCache);
            fecharModal();
        } else {
            mostrarToast(data.error || 'Erro ao salvar.', false);
        }
    } catch(e) {
        // Fallback local
        mostrarToast('Salvo localmente (servidor offline).', false);
        renderizarFichas(_fichasCache);
        fecharModal();
    }
}

// ==========================================
// AÇÕES DO DASHBOARD
// ==========================================
async function logout() {
    try { await fetch(`${API_URL}?action=logout`, { credentials: 'include' }); } catch(e) {}
    location.reload();
}

function triggerImport() {
    document.getElementById('file-upload').click();
}

// ==========================================
// TOAST
// ==========================================
function mostrarToast(msg, sucesso = true) {
    const toast = document.getElementById('landing-toast');
    toast.textContent = msg;
    toast.style.borderColor = sucesso ? 'var(--blood)' : '#886600';
    toast.style.color = sucesso ? 'var(--bone)' : '#ffcc44';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==========================================
// EXPÕE GLOBALMENTE
// ==========================================
window.showLogin       = showLogin;
window.hideLogin       = hideLogin;
window.switchTab       = switchTab;
window.handleAuth      = handleAuth;
window.createNewSheet  = createNewSheet;
window.editarFicha     = editarFicha;
window.apagarFicha     = apagarFicha;
window.abrirModal      = abrirModal;
window.fecharModal     = fecharModal;
window.fecharModalFora = fecharModalFora;
window.switchModalTab  = switchModalTab;
window.previewHistLink = previewHistLink;
window.salvarDescritivo= salvarDescritivo;
window.logout          = logout;
window.triggerImport   = triggerImport;