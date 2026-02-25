// ==========================================
// DATA
// ==========================================
const dataRef = {
  clans: ["", "Assamita", "Brujah", "Caitiff", "Gangrel", "Giovanni", "Lasombra", "Malkaviano", "Nosferatu", "Ravnos", "Seguidores de Set", "Toreador", "Tremere", "Tzimisce", "Ventrue"],
  arquetipos: ["", "Arquiteto", "Autocrata", "Bon Vivant", "Valentão", "Capitalista", "Celerado", "Criança", "Competidor", "Conformista", "Ranzinza", "Desviado", "Diretor", "Fanático", "Galante", "Juiz", "Solitário", "Mártir", "Masoquista", "Monstro", "Pedagogo", "Penitente", "Perfeccionista", "Rebelde", "Malandro", "Sobrevivente", "Tradicionalista", "Caçador de Emoções", "Visionário"],
  conceitos: ["", "Criminoso", "Andarilho", "Artista", "Intelectual", "Investigador", "Criança", "Notívago", "Forasteiro", "Político", "Profissional", "Repórter", "Socialite", "Soldado", "Trabalhador"],
  disciplinas: ["", "Animalismo", "Auspícios", "Celeridade", "Dominação", "Fortitude", "Metamorfose", "Necromancia", "Ofuscação", "Potência", "Presença", "Quietus", "Serpentis", "Tenebrosidade", "Taumaturgia", "Vicissitude"],
  atributos: {
    fisicos: ["Força", "Destreza", "Vigor"],
    sociais: ["Carisma", "Manipulação", "Aparência"],
    mentais: ["Percepção", "Inteligência", "Raciocínio"]
  },
  habilidades: {
    talentos: ["Prontidão", "Esportes", "Briga", "Esquiva", "Empatia", "Expressão", "Intimidação", "Liderança", "Manha", "Lábia"],
    pericias: ["Empatia c/ Animais", "Ofícios", "Condução", "Etiqueta", "Armas de Fogo", "Armas Brancas", "Performance", "Segurança", "Furtividade", "Sobrevivência"],
    conhecimentos: ["Acadêmicos", "Computador", "Finanças", "Investigação", "Direito", "Linguística", "Medicina", "Ocultismo", "Política", "Ciência"]
  },
  vitalidade: [
    {label: "Escoriado", penalty: ""},
    {label: "Machucado", penalty: "-1"},
    {label: "Ferido", penalty: "-1"},
    {label: "Ferido Gravemente", penalty: "-2"},
    {label: "Espancado", penalty: "-2"},
    {label: "Aleijado", penalty: "-5"},
    {label: "Incapacitado", penalty: "—"}
  ]
};

// ==========================================
// UI MODULE
// ==========================================
const UI = {
  setarValorOriginal: null,

  criarBolinhas(containerId, idInterno, labelText, maxDots = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'stat-row';
    const label = document.createElement('span');
    label.className = 'stat-label';
    label.innerText = labelText;
    row.appendChild(label);
    const dotsDiv = document.createElement('div');
    dotsDiv.className = 'dots';
    dotsDiv.dataset.name = idInterno;
    for (let i = 1; i <= maxDots; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.dataset.value = i;
      dot.onclick = () => UI.setarValor(idInterno, i, 'dot');
      dotsDiv.appendChild(dot);
    }
    row.appendChild(dotsDiv);
    container.appendChild(row);
  },

  criarLinhaSelectEBolinhas(containerId, prefixo, numLinhas, opcoesLista) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (let i = 1; i <= numLinhas; i++) {
      const row = document.createElement('div');
      row.className = 'adv-row';
      const select = document.createElement('select');
      select.id = `${prefixo}_nome_${i}`;
      select.className = 'adv-select';
      select.appendChild(new Option('—', ''));
      opcoesLista.forEach(opt => select.appendChild(new Option(opt, opt)));
      const dotsDiv = document.createElement('div');
      dotsDiv.className = 'dots';
      dotsDiv.dataset.name = `${prefixo}_valor_${i}`;
      for (let d = 1; d <= 5; d++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.dataset.value = d;
        dot.onclick = () => UI.setarValor(`${prefixo}_valor_${i}`, d, 'dot');
        dotsDiv.appendChild(dot);
      }
      row.appendChild(select);
      row.appendChild(dotsDiv);
      container.appendChild(row);
    }
  },

  criarLinhaTextoEBolinhas(containerId, prefixo, numLinhas) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (let i = 1; i <= numLinhas; i++) {
      const row = document.createElement('div');
      row.className = 'adv-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `${prefixo}_nome_${i}`;
      input.className = 'adv-input';
      input.placeholder = 'Nome...';
      const dotsDiv = document.createElement('div');
      dotsDiv.className = 'dots';
      dotsDiv.dataset.name = `${prefixo}_valor_${i}`;
      for (let d = 1; d <= 5; d++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.dataset.value = d;
        dot.onclick = () => UI.setarValor(`${prefixo}_valor_${i}`, d, 'dot');
        dotsDiv.appendChild(dot);
      }
      row.appendChild(input);
      row.appendChild(dotsDiv);
      container.appendChild(row);
    }
  },

  criarQuadrados(containerId, idInterno, maxSquares = 10) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.dataset.name = idInterno;
    for (let i = 1; i <= maxSquares; i++) {
      const sq = document.createElement('span');
      sq.className = 'square';
      sq.dataset.value = i;
      sq.onclick = () => UI.setarValor(idInterno, i, 'square');
      container.appendChild(sq);
    }
  },

  setarValor(idInterno, valor, tipoElemento, ignorarToggle = false) {
    const container = document.querySelector(`[data-name="${idInterno}"]`);
    if (!container) return;
    const elementos = container.querySelectorAll(`.${tipoElemento}`);
    let valorAtual = 0;
    elementos.forEach(el => { if (el.classList.contains('active')) valorAtual++; });
    if (valorAtual === valor && !ignorarToggle) valor = valor - 1;
    elementos.forEach((el, index) => {
      if (index < valor) el.classList.add('active');
      else el.classList.remove('active');
    });
    // Recalcular derivados se virtude foi alterada
    if (idInterno.startsWith('virt_')) calcularDerivados();
  },

  obterValor(idInterno) {
    const container = document.querySelector(`[data-name="${idInterno}"]`);
    if (!container) return 0;
    return container.querySelectorAll('.active').length;
  }
};

// ==========================================
// MATEMÁTICA
// ==========================================
function calcularDerivados() {
  const consciencia = UI.obterValor('virt_consciencia');
  const autocontrole = UI.obterValor('virt_autocontrole');
  const humanidade = consciencia + autocontrole;
  UI.setarValor('humanidade', humanidade, 'dot', true);
  const coragem = UI.obterValor('virt_coragem');
  UI.setarValor('vontade_perm', coragem, 'dot', true);
}

// ==========================================
// CONSTRUÇÃO DA TELA
// ==========================================
function montarInterfaceVampiro() {
  // Atributos
  dataRef.atributos.fisicos.forEach(a => UI.criarBolinhas('attr-fisicos', `attr_${a.toLowerCase()}`, a, 5));
  dataRef.atributos.sociais.forEach(a => UI.criarBolinhas('attr-sociais', `attr_${a.toLowerCase()}`, a, 5));
  dataRef.atributos.mentais.forEach(a => UI.criarBolinhas('attr-mentais', `attr_${a.toLowerCase()}`, a, 5));

  // Habilidades
  dataRef.habilidades.talentos.forEach(h => UI.criarBolinhas('abil-talentos', `hab_${h.toLowerCase().replace(/\s/g,'_')}`, h, 5));
  dataRef.habilidades.pericias.forEach(h => UI.criarBolinhas('abil-pericias', `hab_${h.toLowerCase().replace(/[\s\/]/g,'_')}`, h, 5));
  dataRef.habilidades.conhecimentos.forEach(h => UI.criarBolinhas('abil-conhecimentos', `hab_${h.toLowerCase().replace(/\s/g,'_')}`, h, 5));

  // Disciplinas
  UI.criarLinhaSelectEBolinhas('adv-disciplinas', 'disc', 5, dataRef.disciplinas.filter(d => d));

  // Antecedentes
  UI.criarLinhaTextoEBolinhas('adv-antecedentes', 'ant', 5);

  // Virtudes — preencher dots existentes no HTML
  document.querySelectorAll('#virtudes-container .dots').forEach(container => {
    if (container.innerHTML.trim() === '') {
      for (let i = 1; i <= 5; i++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.dataset.value = i;
        dot.onclick = () => UI.setarValor(container.dataset.name, i, 'dot');
        container.appendChild(dot);
      }
    }
  });

  // Humanidade (10 dots)
  const humContainer = document.getElementById('calc-humanidade');
  for (let i = 1; i <= 10; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.dataset.value = i;
    dot.onclick = () => UI.setarValor('humanidade', i, 'dot');
    humContainer.appendChild(dot);
  }

  // Vontade Permanente (10 dots)
  const vontContainer = document.getElementById('calc-vontade');
  for (let i = 1; i <= 10; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.dataset.value = i;
    dot.onclick = () => UI.setarValor('vontade_perm', i, 'dot');
    vontContainer.appendChild(dot);
  }

  // Vontade Temporária (10 squares)
  UI.criarQuadrados('vontade-temp', 'vontade_temp', 10);

  // Pontos de Sangue (20 squares)
  UI.criarQuadrados('sangue-pool', 'pontos_sangue', 20);

  // Vitalidade
  const vitContainer = document.getElementById('vitalidade-list');
  dataRef.vitalidade.forEach((nivel, idx) => {
    const row = document.createElement('div');
    row.className = 'vit-row';
    row.innerHTML = `
      <input type="checkbox" class="vit-check" id="vit_${idx}">
      <label class="vit-label" for="vit_${idx}">${nivel.label}</label>
      ${nivel.penalty ? `<span class="vit-penalty">${nivel.penalty}</span>` : ''}
    `;
    vitContainer.appendChild(row);
  });
}

function inicializarDropdowns() {
  const listas = {
    'cla': dataRef.clans,
    'natureza': dataRef.arquetipos,
    'comportamento': dataRef.arquetipos,
    'conceito': dataRef.conceitos
  };
  
  for (const [id, opcoes] of Object.entries(listas)) {
    const select = document.getElementById(id);
    if (select && select.options.length === 0) {
      select.appendChild(new Option('Selecione...', ''));
      opcoes.filter(o => o).forEach(opt => select.appendChild(new Option(opt, opt)));
    }
  }

  // --- CÓDIGO NOVO AQUI EMBAIXO ---
  // Garante que o ícone inicie no estado correto (vazio ou com o clã selecionado)
  const selectCla = document.getElementById('cla');
  if (selectCla) {
    atualizarIconeCla(selectCla.value);
  }
}
// ==========================================
// INVENTÁRIO
// ==========================================
let inventario = [];

function adicionarItem() {
  const input = document.getElementById('inv-input');
  const texto = input.value.trim();
  if (!texto) return;
  inventario.push(texto);
  input.value = '';
  renderizarInventario();
}

function removerItem(idx) {
  inventario.splice(idx, 1);
  renderizarInventario();
}

function renderizarInventario() {
  const list = document.getElementById('inv-list');
  list.innerHTML = '';
  inventario.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'inv-item';
    div.innerHTML = `<span>⚔</span> ${item} <button class="inv-remove" onclick="removerItem(${idx})">✕</button>`;
    list.appendChild(div);
  });
}

// ==========================================
// FOTO
// ==========================================
function atualizarFoto(url) {
  const img = document.getElementById('foto-preview');
  if (url && url.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) {
    img.src = url;
    img.classList.add('visible');
    img.onerror = () => img.classList.remove('visible');
  } else {
    img.classList.remove('visible');
  }
}

// ==========================================
// CONFIG — ajuste se o api.php estiver em outro caminho
// ==========================================
const API_URL = '../api.php';

let fichaAtualId = localStorage.getItem('vtm_current_editing_char') || null;

// ==========================================
// SALVAR / CARREGAR / EXPORTAR
// ==========================================
function coletarDadosDaTela() {
  const inputsData = {};
  document.querySelectorAll('input[type="text"], input[type="checkbox"], select').forEach(input => {
    if (input.id) {
      inputsData[input.id] = input.type === 'checkbox' ? input.checked : input.value;
    }
  });
  const statsData = {};
  document.querySelectorAll('.dots, .squares-container').forEach(container => {
    if (container.dataset.name) {
      statsData[container.dataset.name] = UI.obterValor(container.dataset.name);
    }
  });
  return { inputs: inputsData, stats: statsData, inventario };
}

function carregarDadosNaTela(dados) {
  if (!dados) return;
  if (dados.inputs) {
    for (const [key, value] of Object.entries(dados.inputs)) {
      const el = document.getElementById(key);
      if (el) {
        if (el.type === 'checkbox') el.checked = value;
        else el.value = value;
      }
    }
    if (dados.inputs.foto_perfil) atualizarFoto(dados.inputs.foto_perfil);
  }
  if (dados.stats) {
    for (const [key, value] of Object.entries(dados.stats)) {
      UI.setarValor(key, value, 'dot', true);
      UI.setarValor(key, value, 'square', true);
    }
  }
  if (dados.inventario) {
    inventario = dados.inventario;
    renderizarInventario();
  }
}

async function carregarFichaDoServidor(charId) {
  try {
    const res = await fetch(`${API_URL}?action=get_all`, { credentials: 'include' });
    const chars = await res.json();
    if (chars.error) { fichaDefaults(); return; }
    const ficha = chars.find(c => c.id === charId);
    if (ficha) carregarDadosNaTela(ficha);
    else fichaDefaults();
  } catch(e) {
    console.warn('Servidor indisponível, carregando do localStorage.', e);
    const raw = localStorage.getItem('vtm_ficha');
    if (raw) carregarDadosNaTela(JSON.parse(raw));
    else fichaDefaults();
  }
}

function fichaDefaults() {
  UI.setarValor('virt_consciencia', 1, 'dot');
  UI.setarValor('virt_autocontrole', 1, 'dot');
  UI.setarValor('virt_coragem', 1, 'dot');
  calcularDerivados();
}

async function salvarNaNuvem() {
  const btn = document.getElementById('btn-salvar');
  const icon = document.getElementById('icon-save');
  btn.disabled = true;
  if (icon) icon.style.animation = 'spin 1s linear infinite';

  const dados = coletarDadosDaTela();
  if (fichaAtualId) dados.id = fichaAtualId;

  try {
    const res = await fetch(`${API_URL}?action=save`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const json = await res.json();

    if (json.error) {
      mostrarToast(json.error === 'Não autorizado' ? 'Faça login primeiro.' : 'Erro: ' + json.error, false);
    } else if (json.success) {
      fichaAtualId = json.id;
      localStorage.setItem('vtm_current_editing_char', json.id);
      localStorage.setItem('vtm_ficha', JSON.stringify(dados)); // fallback local
      mostrarToast('Ficha salva na nuvem!', true);
    }
  } catch(e) {
    try {
      localStorage.setItem('vtm_ficha', JSON.stringify(dados));
      mostrarToast('Servidor offline. Salvo localmente.', false);
    } catch(_) {
      mostrarToast('Erro ao salvar.', false);
    }
  } finally {
    btn.disabled = false;
    if (icon) icon.style.animation = '';
  }
}

function exportarJSON() {
  const dados = coletarDadosDaTela();
  const nome = (dados.inputs && dados.inputs.nome) ? dados.inputs.nome : 'vampiro';
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dados, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", nome + ".json");
  document.body.appendChild(a);
  a.click();
  a.remove();
  mostrarToast('JSON exportado!', true);
}

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

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  inicializarDropdowns();
  montarInterfaceVampiro();

  const charEditId = localStorage.getItem('vtm_current_editing_char');
  const importRaw = localStorage.getItem('vtm_import_data');

  if (charEditId) {
    fichaAtualId = charEditId;
    await carregarFichaDoServidor(charEditId);
  } else if (importRaw) {
    carregarDadosNaTela(JSON.parse(importRaw));
  } else {
    const raw = localStorage.getItem('vtm_ficha');
    if (raw) carregarDadosNaTela(JSON.parse(raw));
    else fichaDefaults();
  }
});

function atualizarIconeCla(nomeCla) {
    const iconeElemento = document.getElementById('clan-icon-display');
    if (!iconeElemento) return;

    const mapaIcones = {
        "Assamita": "icon-banuhaqim",
        "Brujah": "icon-brujah",
        "Gangrel": "icon-gangrel",
        "Giovanni": "icon-giovanni",
        "Lasombra": "icon-lasombra",
        "Malkaviano": "icon-malkovian",
        "Nosferatu": "icon-nosferatu",
        "Ravnos": "icon-ravnos",
        "Seguidores de Set": "icon-set",
        "Toreador": "icon-toreador",
        "Tremere": "icon-tremere",
        "Tzimisce": "icon-tzimisce",
        "Ventrue": "icon-ventrue"
    };

    // Reseta a classe base
    iconeElemento.className = "icon-clan"; 
    
    // Aplica a classe do clã selecionado
    const classeEncontrada = mapaIcones[nomeCla];
    if (classeEncontrada) {
        iconeElemento.classList.add(classeEncontrada);
    }
}
