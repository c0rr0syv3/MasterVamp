let currentUser = null;
let isMaster = false;

// ==========================================
// 1. SISTEMA DE AUTENTICAÇÃO
// ==========================================

async function initAuth() {
    try {
        const res = await fetch('api.php?action=check_auth');
        const data = await res.json();
        if (data.logged_in) {
            currentUser = data.username;
            isMaster = data.isMaster == 1;
        }
    } catch (e) { console.error("Erro na auth", e); }
}

function getCurrentUser() { return currentUser; }
function getIsMaster() { return isMaster; }

async function login(username, password) {
    try {
        const res = await fetch('api.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.error) alert(data.error);
        return data.success;
    } catch (e) { return false; }
}

async function register(username, password, isMasterFlag) {
    try {
        const res = await fetch('api.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, isMaster: isMasterFlag })
        });
        const data = await res.json();
        if (data.error) alert(data.error);
        return data.success;
    } catch (e) { return false; }
}

async function logout() {
    await fetch('api.php?action=logout');
    window.location.href = 'index.html';
}

// ==========================================
// 2. FUNÇÕES DE BANCO DE DADOS (FICHAS)
// ==========================================

// Função que estava a faltar para salvar a ficha!
async function saveCharacterToProfile(charData) {
    try {
        const res = await fetch('api.php?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(charData)
        });
        const data = await res.json();
        
        if (data.error) {
            alert("Erro ao salvar: " + data.error);
            return false;
        }
        
        alert("Ficha salva com sucesso na nuvem!");
        return data.id; // Retorna o ID gerado pelo banco
    } catch (e) {
        console.error("Erro de conexão ao salvar", e);
        alert("Erro de conexão. A sua base de dados local está ligada?");
        return false;
    }
}

// Função para a Mesa Virtual puxar todas as fichas
async function getAllCharacters() {
    try {
        const res = await fetch('api.php?action=get_all');
        const data = await res.json();
        if (data.error) {
            console.error(data.error);
            return [];
        }
        return data;
    } catch (e) {
        console.error("Erro ao buscar fichas", e);
        return [];
    }
}

// Função para apagar ficha
async function deleteCharacter(id) {
    try {
        const res = await fetch('api.php?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        return data.success;
    } catch (e) {
        console.error("Erro ao deletar", e);
        return false;
    }
}