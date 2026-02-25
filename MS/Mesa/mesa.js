// ==========================================
// MESA.JS — Vampiro: A Máscara
// Lógica completa da Mesa Virtual
// ==========================================

const API_URL = '/api';

let _currentUser = null;
let _isMaster = false;
let _mesaAtiva = null; // { id, nome, maxJogadores, prefs, ownerId, jogadores: [] }

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Verifica sessão
    try {
        const res = await fetch(`${API_URL}?action=check_auth`, { credentials: 'include' });
        const data = await res.json();
        if (!data.logged_in) {
            window.location.href = 'index.html';
            return;
        }
        _currentUser = data.username;
        _isMaster = data.isMaster == 1;
    } catch(e) {
        window.location.href = 'index.html';
        return;
    }

    // Nav user display
    const navUser = document.getElementById('nav-user');
    if (navUser) {
        navUser.textContent = _isMaster
            ? `${_currentUser} · Narrador`
            : `${_currentUser} · Jogador`;
    }

    // Verifica se já há uma mesa ativa em sessão
    const mesaAtiva = localStorage.getItem('vtm_mesa_ativa');
    if (mesaAtiva) {
        try {
            const mesa = JSON.parse(mesaAtiva);
            await abrirMesaPorId(mesa.id, false);
            return;
        } catch(e) {
            localStorage.removeItem('vtm_mesa_ativa');
        }
    }

    // Exibe tela correta para mestre ou jogador
    if (_isMaster) {
        await carregarMestreCreate();
    } else {
        await carregarPlayerJoin();
    }
});

// ==========================================
// TELA: MESTRE — CRIAR MESA
// ==========================================
async function carregarMestreCreate() {
    ocultarTodas();
    document.getElementById('screen-master-create').style.display = 'block';
    await renderListaMesasMestre();
}

async function renderListaMesasMestre() {
    const container = document.getElementById('lista-mesas-mestre');
    container.innerHTML = '';

    try {
        const mesas = await fetchMesasMestre();
        if (!mesas.length) {
            container.innerHTML = '<p class="empty-note">Nenhuma mesa criada ainda.</p>';
            return;
        }
        mesas.forEach(mesa => {
            const div = document.createElement('div');
            div.className = 'mesa-list-item';
            div.innerHTML = `
                <div>
                    <div class="mesa-list-name">${mesa.nome}</div>
                    <div class="mesa-list-meta">${mesa.jogadoresAtivos || 0}/${mesa.maxJogadores} jogadores · ${mesa.id}</div>
                </div>
                <button class="btn-small" onclick="abrirMesaPorId('${mesa.id}')">Abrir</button>
            `;
            container.appendChild(div);
        });
    } catch(e) {
        container.innerHTML = '<p class="empty-note">Erro ao carregar mesas.</p>';
    }
}

// ==========================================
// TELA: JOGADOR — ENTRAR
// ==========================================
async function carregarPlayerJoin() {
    ocultarTodas();
    document.getElementById('screen-player-join').style.display = 'block';

    // Carrega fichas do jogador para o select
    await popularSelectFichas();
    await renderListaMesasPlayer();
}

async function popularSelectFichas() {
    const select = document.getElementById('join-ficha');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione uma ficha...</option>';

    try {
        const res = await fetch(`${API_URL}?action=get_all`, { credentials: 'include' });
        const chars = await res.json();
        if (!Array.isArray(chars)) return;

        // owner é o username resolvido pelo PHP via JOIN
        chars.filter(c => c.owner === _currentUser).forEach(c => {
            const nome = c.inputs?.nome || c.nome || 'Sem nome';
            const cla  = c.inputs?.cla  || '';
            select.appendChild(new Option(`${nome}${cla ? ' — ' + cla : ''}`, c.id));
        });
    } catch(e) {
        console.error('[mesa] Erro ao buscar fichas:', e);
    }
}

async function renderListaMesasPlayer() {
    const container = document.getElementById('lista-mesas-player');
    container.innerHTML = '';

    try {
        const mesas = await fetchMesasPlayer();
        if (!mesas.length) {
            container.innerHTML = '<p class="empty-note">Você não está em nenhuma mesa ainda.</p>';
            return;
        }
        mesas.forEach(mesa => {
            const div = document.createElement('div');
            div.className = 'mesa-list-item';
            div.innerHTML = `
                <div>
                    <div class="mesa-list-name">${mesa.nome}</div>
                    <div class="mesa-list-meta">${mesa.id}</div>
                </div>
                <button class="btn-small" onclick="abrirMesaPorId('${mesa.id}')">Entrar</button>
            `;
            container.appendChild(div);
        });
    } catch(e) {
        container.innerHTML = '<p class="empty-note">Erro ao carregar mesas.</p>';
    }
}

// ==========================================
// NÚMERO DE JOGADORES (adjuster)
// ==========================================
let _numJogadores = 4;
function ajustarJogadores(delta) {
    _numJogadores = Math.max(1, Math.min(10, _numJogadores + delta));
    document.getElementById('num-jogadores').textContent = _numJogadores;
}
window.ajustarJogadores = ajustarJogadores;

// ==========================================
// CRIAR MESA
// ==========================================
async function criarMesa() {
    const nome = document.getElementById('mesa-nome').value.trim();
    const prefs = document.getElementById('mesa-prefs').value.trim();

    if (!nome) { mostrarToast('Dê um nome à mesa.', false); return; }

    const id = gerarCodigoMesa();
    const mesa = {
        id,
        nome,
        maxJogadores: _numJogadores,
        prefs,
        ownerId: _currentUser,
        jogadores: [], // { userId, fichaId, fichaSnapshot }
    };

    try {
        const res = await fetch(`${API_URL}?action=mesa_save`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mesa)
        });
        const data = await res.json();
        if (data.success || data.id) {
            window._novaMesaId = id;
            document.getElementById('modal-code-display').textContent = id;
            document.getElementById('modal-overlay').style.display = 'flex';
            await renderListaMesasMestre();
        } else {
            mostrarToast(data.error || 'Erro ao criar mesa.', false);
        }
    } catch(e) {
        // Fallback: salva localmente (modo offline)
        const mesas = JSON.parse(localStorage.getItem('vtm_mesas_local') || '[]');
        mesas.push(mesa);
        localStorage.setItem('vtm_mesas_local', JSON.stringify(mesas));
        window._novaMesaId = id;
        document.getElementById('modal-code-display').textContent = id;
        document.getElementById('modal-overlay').style.display = 'flex';
        await renderListaMesasMestre();
    }
}
window.criarMesa = criarMesa;

// ==========================================
// ENTRAR EM MESA (Jogador)
// ==========================================
async function entrarNaMesa() {
    const codigo = document.getElementById('join-codigo').value.trim().toUpperCase();
    const fichaId = document.getElementById('join-ficha').value;

    if (!codigo) { mostrarToast('Insira o código da mesa.', false); return; }
    if (!fichaId) { mostrarToast('Selecione uma ficha.', false); return; }

    try {
        const res = await fetch(`${API_URL}?action=mesa_join`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mesaId: codigo, fichaId, userId: _currentUser })
        });
        const data = await res.json();
        if (data.success) {
            mostrarToast('Entraste na Crônica!', true);
            setTimeout(() => abrirMesaPorId(codigo), 600);
        } else {
            mostrarToast(data.error || 'Código inválido ou mesa cheia.', false);
        }
    } catch(e) {
        // Fallback local
        const mesas = JSON.parse(localStorage.getItem('vtm_mesas_local') || '[]');
        const mesa = mesas.find(m => m.id === codigo);
        if (!mesa) { mostrarToast('Mesa não encontrada.', false); return; }
        if (mesa.jogadores.length >= mesa.maxJogadores) { mostrarToast('Mesa está cheia.', false); return; }
        // Busca snapshot da ficha local
        const raw = localStorage.getItem('vtm_ficha');
        const fichaSnapshot = raw ? JSON.parse(raw) : {};
        mesa.jogadores.push({ userId: _currentUser, fichaId, fichaSnapshot: JSON.parse(JSON.stringify(fichaSnapshot)) });
        localStorage.setItem('vtm_mesas_local', JSON.stringify(mesas));
        mostrarToast('Entraste na Crônica!', true);
        setTimeout(() => abrirMesaPorId(codigo), 600);
    }
}
window.entrarNaMesa = entrarNaMesa;

// ==========================================
// ABRIR MESA (interior)
// ==========================================
async function abrirMesaPorId(id, salvarSessao = true) {
    fecharModal();
    ocultarTodas();
    document.getElementById('screen-mesa-interior').style.display = 'block';

    let mesa = null;

    try {
        const res = await fetch(`${API_URL}?action=mesa_get&id=${encodeURIComponent(id)}`, { credentials: 'include' });
        const data = await res.json();
        if (data && !data.error) mesa = data;
    } catch(e) {}

    // Fallback local
    if (!mesa) {
        const mesas = JSON.parse(localStorage.getItem('vtm_mesas_local') || '[]');
        mesa = mesas.find(m => m.id === id) || null;
    }

    if (!mesa) {
        mostrarToast('Mesa não encontrada.', false);
        if (_isMaster) await carregarMestreCreate();
        else await carregarPlayerJoin();
        return;
    }

    _mesaAtiva = mesa;
    if (salvarSessao) localStorage.setItem('vtm_mesa_ativa', JSON.stringify({ id: mesa.id }));

    // Preenche UI
    document.getElementById('mesa-titulo-interior').textContent = mesa.nome;
    document.getElementById('mesa-id-display').textContent = `ID: ${mesa.id}`;
    document.getElementById('mesa-vagas-display').textContent =
        `${(mesa.jogadores || []).length}/${mesa.maxJogadores} jogadores`;

    if (mesa.prefs) {
        const banner = document.getElementById('mesa-prefs-display');
        banner.textContent = `📜 ${mesa.prefs}`;
        banner.style.display = 'block';
    }

    // Código de convite visível apenas para o mestre
    if (_isMaster && mesa.ownerId === _currentUser) {
        const box = document.getElementById('codigo-convite-box');
        box.style.display = 'flex';
        document.getElementById('codigo-convite-val').textContent = mesa.id;
    }

    // Renderiza fichas
    await renderFichasNaMesa(mesa);
}
window.abrirMesaPorId = abrirMesaPorId;

// ==========================================
// RENDERIZAR FICHAS NA MESA
// ==========================================
async function renderFichasNaMesa(mesa) {
    const grid = document.getElementById('char-grid');
    grid.innerHTML = '';

    const jogadores = mesa.jogadores || [];
    if (!jogadores.length) {
        grid.innerHTML = '<p class="empty-note" style="grid-column:1/-1">Nenhum jogador na mesa ainda. Compartilhe o código!</p>';
        return;
    }

    // Busca fichas completas
    let todasFichas = [];
    try {
        const res = await fetch(`${API_URL}?action=get_all`, { credentials: 'include' });
        todasFichas = await res.json() || [];
    } catch(e) {}

    jogadores.forEach(jogador => {
        // A "ficha de mesa" é o snapshot que pode ter sido editado pelo mestre
        const fichaSnapshot = jogador.fichaSnapshot || {};
        const fichaOriginal = todasFichas.find(f => f.id === jogador.fichaId) || {};

        const nome = fichaSnapshot.inputs?.nome || fichaOriginal.inputs?.nome || 'Desconhecido';
        const cla  = fichaSnapshot.inputs?.cla  || fichaOriginal.inputs?.cla  || '—';
        const foto = fichaSnapshot.inputs?.foto_perfil || fichaOriginal.inputs?.foto_perfil || '';

        const card = document.createElement('div');
        card.className = 'char-card';

        // Imagem
        let photoHtml = '';
        if (foto && foto.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) {
            photoHtml = `<img class="char-card-photo" src="${foto}" alt="${nome}" onerror="this.style.display='none'">`;
        } else {
            photoHtml = `<div class="char-card-photo-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8a0000" stroke-width="1">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
            </div>`;
        }

        // Badge mestre
        const isMesaOwner = _isMaster && mesa.ownerId === _currentUser;
        const badgeHtml = isMesaOwner ? '<span class="master-badge">Mestre</span>' : '';

        // Botões
        let acoes = `
            <button class="btn-small" onclick="visualizarFichaMesa('${jogador.fichaId}', '${jogador.userId}')">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Ver
            </button>
        `;

        // Mestre pode editar qualquer ficha DE MESA (cópia)
        if (isMesaOwner) {
            acoes += `
                <button class="btn-small master-edit" onclick="editarFichaMesa('${jogador.fichaId}', '${jogador.userId}')">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar (Mesa)
                </button>
            `;
        }

        // Dono da ficha pode editar a sua própria cópia de mesa
        if (jogador.userId === _currentUser && !isMesaOwner) {
            acoes += `
                <button class="btn-small" onclick="editarFichaMesa('${jogador.fichaId}', '${jogador.userId}')">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Minha Ficha
                </button>
            `;
        }

        // Rolar — disponível para o dono da ficha ou para o mestre (rolar em nome do jogador)
        if (jogador.userId === _currentUser || isMesaOwner) {
            acoes += `
                <button class="btn-small btn-roll" onclick="abrirModalRolar('${jogador.fichaId}', '${jogador.userId}')">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="2" width="20" height="20" rx="3"/>
                        <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                        <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
                        <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
                        <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
                        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    </svg>
                    Rolar
                </button>
            `;
        }

        card.innerHTML = `
            ${badgeHtml}
            ${photoHtml}
            <div class="char-card-body">
                <div class="char-card-name">${nome}</div>
                <div class="char-card-meta">${cla}</div>
                <div class="char-card-owner">${jogador.userId}</div>
                <div class="char-card-actions">${acoes}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// VISUALIZAR FICHA DE MESA (somente leitura)
// ==========================================
window.visualizarFichaMesa = function(fichaId, userId) {
    if (!_mesaAtiva) return;
    const jogador = (_mesaAtiva.jogadores || []).find(j => j.fichaId === fichaId && j.userId === userId);
    if (!jogador || !jogador.fichaSnapshot) return;
    localStorage.setItem('vtm_import_data', JSON.stringify(jogador.fichaSnapshot));
    localStorage.removeItem('vtm_current_editing_char');
    window.location.href = 'ficha.html';
};

// ==========================================
// EDITAR FICHA DE MESA (cópia isolada)
// Mestre pode editar qualquer uma; jogador só a sua.
// ==========================================
window.editarFichaMesa = function(fichaId, userId) {
    if (!_mesaAtiva) return;
    const podeEditar = _isMaster || userId === _currentUser;
    if (!podeEditar) { mostrarToast('Sem permissão para editar esta ficha.', false); return; }

    const jogador = (_mesaAtiva.jogadores || []).find(j => j.fichaId === fichaId && j.userId === userId);
    if (!jogador) return;

    // Salva contexto para a ficha saber que está em modo "mesa"
    localStorage.setItem('vtm_mesa_edit', JSON.stringify({
        mesaId: _mesaAtiva.id,
        fichaId,
        userId,
        isMasterEdit: _isMaster
    }));
    localStorage.setItem('vtm_import_data', JSON.stringify(jogador.fichaSnapshot || {}));
    localStorage.removeItem('vtm_current_editing_char');
    window.location.href = 'ficha.html';
};

// ==========================================
// SAIR DA MESA
// Ao sair, gera ficha "pós-mesa" para o jogador
// ==========================================
async function sairDaMesa() {
    if (!_mesaAtiva) {
        voltarParaTela();
        return;
    }

    const mesaEdit = JSON.parse(localStorage.getItem('vtm_mesa_edit') || 'null');

    // Se é jogador (não mestre), cria cópia pós-mesa da ficha atual
    if (!_isMaster && _mesaAtiva.jogadores) {
        const jogador = _mesaAtiva.jogadores.find(j => j.userId === _currentUser);
        if (jogador && jogador.fichaSnapshot) {
            const posMesa = { ...jogador.fichaSnapshot };
            posMesa.inputs = { ...(posMesa.inputs || {}) };
            posMesa.inputs.nome = (posMesa.inputs.nome || 'Personagem') + ' [Pós-Mesa]';

            // Tenta salvar como nova ficha no servidor
            try {
                await fetch(`${API_URL}?action=save`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(posMesa)
                });
                mostrarToast('Ficha pós-mesa salva na sua conta!', true);
            } catch(e) {
                // Fallback: salva localmente
                localStorage.setItem('vtm_ficha_posmesa', JSON.stringify(posMesa));
                mostrarToast('Ficha pós-mesa salva localmente.', true);
            }
        }
    }

    localStorage.removeItem('vtm_mesa_ativa');
    localStorage.removeItem('vtm_mesa_edit');
    _mesaAtiva = null;

    setTimeout(voltarParaTela, 800);
}
window.sairDaMesa = sairDaMesa;

function voltarParaTela() {
    if (_isMaster) carregarMestreCreate();
    else carregarPlayerJoin();
}

// ==========================================
// COPIAR CÓDIGO
// ==========================================
function copiarCodigo() {
    const codigo = document.getElementById('codigo-convite-val')?.textContent;
    if (codigo) navigator.clipboard.writeText(codigo).then(() => mostrarToast('Código copiado!', true));
}
window.copiarCodigo = copiarCodigo;

function copiarCodigoModal() {
    const codigo = document.getElementById('modal-code-display')?.textContent;
    if (codigo) navigator.clipboard.writeText(codigo).then(() => mostrarToast('Código copiado!', true));
}
window.copiarCodigoModal = copiarCodigoModal;

// ==========================================
// MODAL
// ==========================================
function fecharModal(event) {
    if (!event || event.target === document.getElementById('modal-overlay')) {
        document.getElementById('modal-overlay').style.display = 'none';
    }
}
window.fecharModal = fecharModal;

// ==========================================
// HELPERS — FETCH MESAS
// ==========================================
async function fetchMesasMestre() {
    try {
        const res = await fetch(`${API_URL}?action=mesa_list_master`, { credentials: 'include' });
        const data = await res.json();
        if (Array.isArray(data)) return data;
    } catch(e) {}
    // Fallback local
    const all = JSON.parse(localStorage.getItem('vtm_mesas_local') || '[]');
    return all.filter(m => m.ownerId === _currentUser);
}

async function fetchMesasPlayer() {
    try {
        const res = await fetch(`${API_URL}?action=mesa_list_player`, { credentials: 'include' });
        const data = await res.json();
        if (Array.isArray(data)) return data;
    } catch(e) {}
    const all = JSON.parse(localStorage.getItem('vtm_mesas_local') || '[]');
    return all.filter(m => (m.jogadores || []).some(j => j.userId === _currentUser));
}

// ==========================================
// UTILITÁRIOS
// ==========================================
function gerarCodigoMesa() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'VTM-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function ocultarTodas() {
    ['screen-loading', 'screen-master-create', 'screen-player-join', 'screen-mesa-interior']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
}

// ==========================================
// SISTEMA DE ROLAGEM WoD (d10)
// ==========================================

let _rollFichaId   = null;
let _rollUserId    = null;
let _rollSnapshot  = null;

// Mapa de todas as características extraíveis da ficha com seus pesos
const GRUPOS_ROLAGEM = [
    {
        grupo: 'Atributos Físicos',
        itens: [
            { id: 'attr_força',      label: 'Força' },
            { id: 'attr_destreza',   label: 'Destreza' },
            { id: 'attr_vigor',      label: 'Vigor' },
        ]
    },
    {
        grupo: 'Atributos Sociais',
        itens: [
            { id: 'attr_carisma',      label: 'Carisma' },
            { id: 'attr_manipulação',  label: 'Manipulação' },
            { id: 'attr_aparência',    label: 'Aparência' },
        ]
    },
    {
        grupo: 'Atributos Mentais',
        itens: [
            { id: 'attr_percepção',    label: 'Percepção' },
            { id: 'attr_inteligência', label: 'Inteligência' },
            { id: 'attr_raciocínio',   label: 'Raciocínio' },
        ]
    },
    {
        grupo: 'Talentos',
        itens: [
            { id: 'hab_prontidão',     label: 'Prontidão' },
            { id: 'hab_esportes',      label: 'Esportes' },
            { id: 'hab_briga',         label: 'Briga' },
            { id: 'hab_esquiva',       label: 'Esquiva' },
            { id: 'hab_empatia',       label: 'Empatia' },
            { id: 'hab_expressão',     label: 'Expressão' },
            { id: 'hab_intimidação',   label: 'Intimidação' },
            { id: 'hab_liderança',     label: 'Liderança' },
            { id: 'hab_manha',         label: 'Manha' },
            { id: 'hab_lábia',         label: 'Lábia' },
        ]
    },
    {
        grupo: 'Perícias',
        itens: [
            { id: 'hab_empatia_c__animais', label: 'Empatia c/ Animais' },
            { id: 'hab_ofícios',        label: 'Ofícios' },
            { id: 'hab_condução',       label: 'Condução' },
            { id: 'hab_etiqueta',       label: 'Etiqueta' },
            { id: 'hab_armas_de_fogo',  label: 'Armas de Fogo' },
            { id: 'hab_armas_brancas',  label: 'Armas Brancas' },
            { id: 'hab_performance',    label: 'Performance' },
            { id: 'hab_segurança',      label: 'Segurança' },
            { id: 'hab_furtividade',    label: 'Furtividade' },
            { id: 'hab_sobrevivência',  label: 'Sobrevivência' },
        ]
    },
    {
        grupo: 'Conhecimentos',
        itens: [
            { id: 'hab_acadêmicos',    label: 'Acadêmicos' },
            { id: 'hab_computador',    label: 'Computador' },
            { id: 'hab_finanças',      label: 'Finanças' },
            { id: 'hab_investigação',  label: 'Investigação' },
            { id: 'hab_direito',       label: 'Direito' },
            { id: 'hab_linguística',   label: 'Linguística' },
            { id: 'hab_medicina',      label: 'Medicina' },
            { id: 'hab_ocultismo',     label: 'Ocultismo' },
            { id: 'hab_política',      label: 'Política' },
            { id: 'hab_ciência',       label: 'Ciência' },
        ]
    },
    {
        grupo: 'Disciplinas',
        itens: [
            { id: 'disc_valor_1', label: 'Disciplina 1' },
            { id: 'disc_valor_2', label: 'Disciplina 2' },
            { id: 'disc_valor_3', label: 'Disciplina 3' },
            { id: 'disc_valor_4', label: 'Disciplina 4' },
            { id: 'disc_valor_5', label: 'Disciplina 5' },
        ]
    },
    {
        grupo: 'Humanidade & Vontade',
        itens: [
            { id: 'humanidade',   label: 'Humanidade' },
            { id: 'vontade_perm', label: 'Força de Vontade' },
        ]
    },
];

// Abre o modal de rolagem para a ficha escolhida
window.abrirModalRolar = function(fichaId, userId) {
    if (!_mesaAtiva) return;
    const jogador = (_mesaAtiva.jogadores || []).find(j => j.fichaId === fichaId && j.userId === userId);
    if (!jogador) return;

    _rollFichaId  = fichaId;
    _rollUserId   = userId;
    _rollSnapshot = jogador.fichaSnapshot || {};

    const nome = _rollSnapshot.inputs?.nome || userId;
    document.getElementById('roll-char-name').textContent = nome;

    // Monta a lista de itens selecionáveis
    renderListaRolagem(_rollSnapshot);

    // Reseta resultado e discord box
    document.getElementById('roll-resultado').style.display = 'none';
    document.getElementById('roll-discord-box').style.display = 'none';
    document.getElementById('roll-total-display').textContent = '0d10';
    document.getElementById('roll-auto').checked = true;
    document.getElementById('roll-dificuldade').value = '6';
    atualizarTotal();

    document.getElementById('roll-modal-overlay').style.display = 'flex';
};

function renderListaRolagem(snapshot) {
    const stats = snapshot.stats || {};
    const inputs = snapshot.inputs || {};
    const container = document.getElementById('roll-itens-lista');
    container.innerHTML = '';

    GRUPOS_ROLAGEM.forEach(grupo => {
        // Verifica se algum item do grupo tem valor > 0
        const comValor = grupo.itens.filter(item => {
            const val = stats[item.id] || 0;
            // Disciplinas: tenta pegar o nome do select correspondente
            if (item.id.startsWith('disc_valor_')) {
                const idx = item.id.replace('disc_valor_', '');
                const nomeDisc = inputs[`disc_nome_${idx}`];
                if (nomeDisc) item.label = nomeDisc;
            }
            return val > 0;
        });

        if (!comValor.length) return; // oculta grupos sem nenhum ponto

        const grupoDiv = document.createElement('div');
        grupoDiv.className = 'roll-grupo';

        const h = document.createElement('div');
        h.className = 'roll-grupo-nome';
        h.textContent = grupo.grupo;
        grupoDiv.appendChild(h);

        comValor.forEach(item => {
            const val = stats[item.id] || 0;
            const row = document.createElement('label');
            row.className = 'roll-item';
            row.innerHTML = `
                <input type="checkbox" class="roll-check" data-id="${item.id}" data-val="${val}" onchange="atualizarTotal()">
                <span class="roll-check-indicator"></span>
                <span class="roll-item-nome">${item.label}</span>
                <span class="roll-item-dots">${renderDotsMini(val)}</span>
                <span class="roll-item-val">${val}</span>
            `;
            grupoDiv.appendChild(row);
        });

        container.appendChild(grupoDiv);
    });

    if (!container.children.length) {
        container.innerHTML = '<p style="color:var(--parchment);opacity:0.4;font-style:italic;font-size:13px;padding:12px 0;">Esta ficha não tem atributos preenchidos.</p>';
    }
}

function renderDotsMini(val) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<span class="dot-mini ${i <= val ? 'active' : ''}"></span>`;
    }
    return html;
}

function atualizarTotal() {
    let total = 0;
    document.querySelectorAll('.roll-check:checked').forEach(cb => {
        total += parseInt(cb.dataset.val) || 0;
    });
    const displayEl = document.getElementById('roll-total-display');
    const hintEl    = document.getElementById('roll-total-num');
    if (displayEl) displayEl.textContent = total + 'd10';
    if (hintEl)    hintEl.textContent    = total + ' pontos selecionados';
    return total;
}
window.atualizarTotal = atualizarTotal;

function fecharRollModal() {
    document.getElementById('roll-modal-overlay').style.display = 'none';
    _rollFichaId = _rollUserId = _rollSnapshot = null;
}
window.fecharRollModal = fecharRollModal;

// Executa a rolagem
window.executarRolagem = function() {
    const total = atualizarTotal();
    if (total < 1) { mostrarToast('Selecione ao menos 1 característica.', false); return; }

    const dificuldade = parseInt(document.getElementById('roll-dificuldade').value) || 6;
    const autoRoll    = document.getElementById('roll-auto').checked;
    const nomePersonagem = document.getElementById('roll-char-name').textContent;

    // Monta rótulo dos itens selecionados
    const selecionados = [];
    document.querySelectorAll('.roll-check:checked').forEach(cb => {
        const label = cb.closest('.roll-item').querySelector('.roll-item-nome').textContent;
        selecionados.push(label);
    });
    const descricao = selecionados.join(' + ');

    if (autoRoll) {
        // Rola internamente
        const dados = [];
        let sucessos = 0;
        let uns = 0;
        for (let i = 0; i < total; i++) {
            const r = Math.floor(Math.random() * 10) + 1;
            dados.push(r);
            if (r >= dificuldade) sucessos++;
            if (r === 1) uns++;
        }
        // Regra WoD: cada "1" cancela um sucesso
        const sucessosFinais = Math.max(0, sucessos - uns);
        const falhaTotal = sucessosFinais === 0 && uns > 0;

        renderResultadoInterno(dados, dificuldade, sucessosFinais, uns, falhaTotal, descricao, nomePersonagem, total);

        // Envia para o log da mesa (estrutura em memória, visível a todos na tela)
        publicarResultadoNaMesa(nomePersonagem, descricao, dados, dificuldade, sucessosFinais, falhaTotal);

    } else {
        // Gera sintaxe Discord
        renderDiscordSyntax(total, dificuldade, descricao, nomePersonagem);
    }
};

function renderResultadoInterno(dados, dificuldade, sucessos, uns, falhaTotal, descricao, personagem, total) {
    const resultDiv = document.getElementById('roll-resultado');
    resultDiv.style.display = 'block';
    document.getElementById('roll-discord-box').style.display = 'none';

    const dadosHtml = dados.map(d => {
        let cls = 'dado-normal';
        if (d >= dificuldade) cls = 'dado-sucesso';
        if (d === 1) cls = 'dado-um';
        if (d === 10) cls = 'dado-dez';
        return `<span class="dado ${cls}">${d}</span>`;
    }).join('');

    let veredicto = '';
    if (falhaTotal) {
        veredicto = '<div class="roll-veredicto falha-total">⚠ Falha Total!</div>';
    } else if (sucessos === 0) {
        veredicto = '<div class="roll-veredicto falha">Falha</div>';
    } else if (sucessos >= 5) {
        veredicto = `<div class="roll-veredicto critico">${sucessos} Sucessos — Extraordinário!</div>`;
    } else {
        veredicto = `<div class="roll-veredicto sucesso">${sucessos} Sucesso${sucessos > 1 ? 's' : ''}</div>`;
    }

    resultDiv.innerHTML = `
        <div class="roll-res-header">
            <span class="roll-res-label">${personagem} · ${descricao}</span>
            <span class="roll-res-parada">${total}d10 dif.${dificuldade}</span>
        </div>
        <div class="roll-dados">${dadosHtml}</div>
        ${uns > 0 ? `<div class="roll-uns-note">${uns} dado${uns>1?'s':''} com "1" cancelou${uns>1?'ram':''} sucesso${uns>1?'s':''}</div>` : ''}
        ${veredicto}
    `;
}

function renderDiscordSyntax(total, dificuldade, descricao, personagem) {
    document.getElementById('roll-resultado').style.display = 'none';
    const box = document.getElementById('roll-discord-box');
    box.style.display = 'block';

    // Formatos para bots populares de Discord
    const rollem    = `${total}d10>${dificuldade}`;
    const diceMaiden = `!roll ${total}d10`;
    const avrae     = `!r ${total}d10`;

    document.getElementById('roll-discord-rollem').textContent    = rollem;
    document.getElementById('roll-discord-maiden').textContent    = diceMaiden;
    document.getElementById('roll-discord-avrae').textContent     = avrae;
    document.getElementById('roll-discord-contexto').textContent  =
        `${personagem}: ${descricao} (dif. ${dificuldade})`;
}

window.copiarDiscord = function(elId) {
    const text = document.getElementById(elId).textContent;
    navigator.clipboard.writeText(text).then(() => mostrarToast('Copiado!', true));
};

// Log visual de rolagens na mesa (aparece abaixo das fichas)
let _rollLog = [];

function publicarResultadoNaMesa(personagem, descricao, dados, dificuldade, sucessos, falhaTotal) {
    const entry = { personagem, descricao, dados, dificuldade, sucessos, falhaTotal, ts: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) };
    _rollLog.unshift(entry); // mais recente primeiro
    if (_rollLog.length > 20) _rollLog.pop();
    renderizarLog();

    // Garante que o log esteja visível
    const logSection = document.getElementById('roll-log-section');
    if (logSection) logSection.style.display = 'block';
}

function renderizarLog() {
    const container = document.getElementById('roll-log-entries');
    if (!container) return;
    container.innerHTML = '';
    _rollLog.forEach(entry => {
        const dadosHtml = entry.dados.map(d => {
            let cls = 'dado-normal';
            if (d >= entry.dificuldade) cls = 'dado-sucesso';
            if (d === 1) cls = 'dado-um';
            if (d === 10) cls = 'dado-dez';
            return `<span class="dado dado-sm ${cls}">${d}</span>`;
        }).join('');

        let resultado = entry.falhaTotal ? '⚠ Falha Total' :
                        entry.sucessos === 0 ? 'Falha' :
                        `${entry.sucessos} Sucesso${entry.sucessos > 1 ? 's' : ''}`;

        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `
            <div class="log-entry-header">
                <span class="log-personagem">${entry.personagem}</span>
                <span class="log-descricao">${entry.descricao}</span>
                <span class="log-ts">${entry.ts}</span>
            </div>
            <div class="log-dados-row">
                ${dadosHtml}
                <span class="log-resultado ${entry.falhaTotal ? 'cor-falha-total' : entry.sucessos === 0 ? 'cor-falha' : 'cor-sucesso'}">${resultado}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

// Ajuste de dificuldade via botões ±
function ajustarDif(delta) {
    const input = document.getElementById('roll-dificuldade');
    const display = document.getElementById('roll-dificuldade-display');
    let val = parseInt(input.value) + delta;
    val = Math.max(2, Math.min(10, val));
    input.value = val;
    display.textContent = val;
}
window.ajustarDif = ajustarDif;

// Alterna hint do modo auto/discord
function toggleAutoMode() {
    const auto = document.getElementById('roll-auto').checked;
    document.getElementById('roll-mode-hint-auto').style.display    = auto ? 'block' : 'none';
    document.getElementById('roll-mode-hint-discord').style.display = auto ? 'none'  : 'block';
}
window.toggleAutoMode = toggleAutoMode;

// Fecha o modal de rolagem ao clicar no overlay
window.fecharRollModalFora = function(event) {
    if (event.target === document.getElementById('roll-modal-overlay')) fecharRollModal();
};

// ==========================================
// TOAST
// ==========================================
function mostrarToast(msg, sucesso = true) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.borderColor = sucesso ? 'var(--blood)' : '#886600';
    toast.style.color = sucesso ? 'var(--bone)' : '#ffcc44';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}