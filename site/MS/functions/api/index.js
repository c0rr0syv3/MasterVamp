// functions/api/index.js
// Rota: /api?action=...

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Cookie',
};

const ok  = (data)       => new Response(JSON.stringify(data), { headers: HEADERS });
const fail = (msg, s=400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: HEADERS });

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export async function onRequestGet(ctx)  { return handle(ctx); }
export async function onRequestPost(ctx) { return handle(ctx); }

async function handle({ request, env }) {
  const DB = env.vtm_database;
  const KV = env.VTM_SESSIONS;

  const url    = new URL(request.url);
  const action = url.searchParams.get('action') || '';
  let   input  = {};
  if (request.method === 'POST') {
    try { input = await request.json(); } catch(e) {}
  }

  // ── REGISTER ────────────────────────────────────────────
  if (action === 'register') {
    const username = (input.username || '').trim();
    const password = input.password  || '';
    const isMaster = input.isMaster  ? 1 : 0;
    if (!username || !password)
      return ok({ success: false, error: 'Preencha todos os campos.' });
    const existing = await DB.prepare('SELECT id FROM utilizadores WHERE username = ?').bind(username).first();
    if (existing) return ok({ success: false, error: 'Usuário já existe.' });
    const hash = await hashPassword(password);
    const res  = await DB.prepare('INSERT INTO utilizadores (username, password, is_master) VALUES (?, ?, ?)').bind(username, hash, isMaster).run();
    const sid  = await createSession(KV, res.meta.last_row_id, username, isMaster);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...HEADERS, 'Set-Cookie': sessionCookie(sid) }
    });
  }

  // ── LOGIN ───────────────────────────────────────────────
  if (action === 'login') {
    const username = (input.username || '').trim();
    const password = input.password  || '';
    const user = await DB.prepare('SELECT id, password, is_master FROM utilizadores WHERE username = ?').bind(username).first();
    if (!user || !(await verifyPassword(password, user.password)))
      return ok({ success: false, error: 'Usuário ou senha incorretos.' });
    const sid = await createSession(KV, user.id, username, user.is_master);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...HEADERS, 'Set-Cookie': sessionCookie(sid) }
    });
  }

  // ── CHECK AUTH ──────────────────────────────────────────
  if (action === 'check_auth') {
    const session = await getSession(request, KV);
    if (session) return ok({ logged_in: true, username: session.username, isMaster: session.isMaster });
    return ok({ logged_in: false });
  }

  // ── LOGOUT ──────────────────────────────────────────────
  if (action === 'logout') {
    await destroySession(request, KV);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...HEADERS, 'Set-Cookie': 'vtm_sid=; Path=/; Max-Age=0' }
    });
  }

  // ── ROTAS PROTEGIDAS ────────────────────────────────────
  const session = await getSession(request, KV);
  if (!session) return fail('Não autorizado', 401);
  const { userId, username, isMaster } = session;

  // ── GET ALL ─────────────────────────────────────────────
  if (action === 'get_all') {
    const rows = await DB.prepare(`
      SELECT p.id, p.dados_completos, u.username AS owner_username
      FROM personagens p LEFT JOIN utilizadores u ON u.id = p.owner_id
      ORDER BY p.rowid DESC
    `).all();
    const chars = (rows.results || []).map(row => {
      let d = {};
      try { d = JSON.parse(row.dados_completos); } catch(e) {}
      if (!d.inputs) d.inputs = {};
      d.id    = row.id;
      d.owner = row.owner_username || '';
      return d;
    });
    return ok(chars);
  }

  // ── SAVE ────────────────────────────────────────────────
  if (action === 'save') {
    let charId = input.id || randomId();
    const dados = { ...input };
    delete dados.id; delete dados.owner;
    const dadosJson = JSON.stringify(dados);
    const nome = input.inputs?.nome || input.nome || 'Desconhecido';
    const foto = input.inputs?.foto_perfil || input.foto_url || '';
    const ex = await DB.prepare('SELECT id, owner_id FROM personagens WHERE id = ?').bind(charId).first();
    if (ex) {
      if (ex.owner_id === userId || isMaster) {
        await DB.prepare('UPDATE personagens SET nome=?,foto_url=?,dados_completos=? WHERE id=?').bind(nome,foto,dadosJson,charId).run();
      } else {
        charId = randomId();
        await DB.prepare('INSERT INTO personagens (id,owner_id,nome,foto_url,dados_completos) VALUES (?,?,?,?,?)').bind(charId,userId,nome,foto,dadosJson).run();
      }
    } else {
      await DB.prepare('INSERT INTO personagens (id,owner_id,nome,foto_url,dados_completos) VALUES (?,?,?,?,?)').bind(charId,userId,nome,foto,dadosJson).run();
    }
    return ok({ success: true, id: charId });
  }

  // ── DELETE ──────────────────────────────────────────────
  if (action === 'delete') {
    const charId = input.id || '';
    if (isMaster) {
      await DB.prepare('DELETE FROM personagens WHERE id=?').bind(charId).run();
    } else {
      await DB.prepare('DELETE FROM personagens WHERE id=? AND owner_id=?').bind(charId,userId).run();
    }
    return ok({ success: true });
  }

  // ── MESA SAVE ───────────────────────────────────────────
  if (action === 'mesa_save') {
    const mesaId = input.id;
    if (!mesaId) return ok({ success: false, error: 'ID da mesa ausente.' });
    const nome = input.nome || 'Sem nome';
    const maxJ = parseInt(input.maxJogadores) || 4;
    const prefs = input.prefs || '';
    const dadosJson = JSON.stringify(input);
    const ex = await DB.prepare('SELECT id FROM mesas WHERE id=?').bind(mesaId).first();
    if (ex) {
      await DB.prepare('UPDATE mesas SET nome=?,max_jogadores=?,prefs=?,dados_completos=? WHERE id=? AND owner_id=?').bind(nome,maxJ,prefs,dadosJson,mesaId,userId).run();
    } else {
      await DB.prepare('INSERT INTO mesas (id,owner_id,nome,max_jogadores,prefs,dados_completos) VALUES (?,?,?,?,?,?)').bind(mesaId,userId,nome,maxJ,prefs,dadosJson).run();
    }
    return ok({ success: true, id: mesaId });
  }

  // ── MESA GET ────────────────────────────────────────────
  if (action === 'mesa_get') {
    const mesaId = url.searchParams.get('id') || '';
    const row = await DB.prepare('SELECT * FROM mesas WHERE id=?').bind(mesaId).first();
    if (!row) return ok({ error: 'Mesa não encontrada.' });
    let d = {};
    try { d = JSON.parse(row.dados_completos); } catch(e) {}
    d.id = row.id; d.nome = row.nome; d.maxJogadores = row.max_jogadores;
    d.prefs = row.prefs; d.ownerId = row.owner_id;
    return ok(d);
  }

  // ── MESA LIST MASTER ────────────────────────────────────
  if (action === 'mesa_list_master') {
    const rows = await DB.prepare('SELECT id,nome,max_jogadores,dados_completos FROM mesas WHERE owner_id=?').bind(userId).all();
    return ok((rows.results || []).map(row => {
      let d = {};
      try { d = JSON.parse(row.dados_completos); } catch(e) {}
      return { id: row.id, nome: row.nome, maxJogadores: row.max_jogadores, jogadoresAtivos: (d.jogadores||[]).length };
    }));
  }

  // ── MESA LIST PLAYER ────────────────────────────────────
  if (action === 'mesa_list_player') {
    const rows = await DB.prepare('SELECT id,nome,dados_completos FROM mesas').all();
    const mesas = [];
    for (const row of (rows.results || [])) {
      let d = {};
      try { d = JSON.parse(row.dados_completos); } catch(e) {}
      if ((d.jogadores||[]).some(j => j.userId === username))
        mesas.push({ id: row.id, nome: row.nome });
    }
    return ok(mesas);
  }

  // ── MESA JOIN ───────────────────────────────────────────
  if (action === 'mesa_join') {
    const mesaId  = input.mesaId  || '';
    const fichaId = input.fichaId || '';
    const row = await DB.prepare('SELECT dados_completos FROM mesas WHERE id=?').bind(mesaId).first();
    if (!row) return ok({ success: false, error: 'Mesa não encontrada.' });
    let d = {};
    try { d = JSON.parse(row.dados_completos); } catch(e) {}
    const jogs = d.jogadores || [];
    if (jogs.length >= parseInt(d.maxJogadores||4)) return ok({ success: false, error: 'Mesa cheia.' });
    if (jogs.some(j => j.userId === username)) return ok({ success: true });
    const fichaRow = await DB.prepare('SELECT dados_completos FROM personagens WHERE id=? AND owner_id=?').bind(fichaId,userId).first();
    let snap = {};
    try { snap = fichaRow ? JSON.parse(fichaRow.dados_completos) : {}; } catch(e) {}
    jogs.push({ userId: username, fichaId, fichaSnapshot: snap });
    d.jogadores = jogs;
    await DB.prepare('UPDATE mesas SET dados_completos=? WHERE id=?').bind(JSON.stringify(d),mesaId).run();
    return ok({ success: true });
  }

  // ── MESA UPDATE FICHA ───────────────────────────────────
  if (action === 'mesa_update_ficha') {
    const mesaId   = input.mesaId        || '';
    const fichaId  = input.fichaId       || '';
    const tUserId  = input.userId        || '';
    const snap     = input.fichaSnapshot || {};
    const row = await DB.prepare('SELECT dados_completos, owner_id FROM mesas WHERE id=?').bind(mesaId).first();
    if (!row) return ok({ success: false, error: 'Mesa não encontrada.' });
    if (row.owner_id !== userId && tUserId !== username) return ok({ success: false, error: 'Sem permissão.' });
    let d = {};
    try { d = JSON.parse(row.dados_completos); } catch(e) {}
    d.jogadores = (d.jogadores||[]).map(j =>
      j.fichaId === fichaId && j.userId === tUserId ? { ...j, fichaSnapshot: snap } : j
    );
    await DB.prepare('UPDATE mesas SET dados_completos=? WHERE id=?').bind(JSON.stringify(d),mesaId).run();
    return ok({ success: true });
  }

  return fail('Ação desconhecida.', 404);
}

// ── Helpers ─────────────────────────────────────────────────
function randomId() {
  return 'char_' + crypto.randomUUID().replace(/-/g,'').slice(0,16);
}
async function hashPassword(pw) {
  const salt = crypto.randomUUID().replace(/-/g,'');
  const key  = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt: new TextEncoder().encode(salt), iterations:100000, hash:'SHA-256' }, key, 256);
  return `pbkdf2:${salt}:${btoa(String.fromCharCode(...new Uint8Array(bits)))}`;
}
async function verifyPassword(pw, stored) {
  if (!stored?.startsWith('pbkdf2:')) return false;
  const [,salt,hash] = stored.split(':');
  const key  = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt: new TextEncoder().encode(salt), iterations:100000, hash:'SHA-256' }, key, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits))) === hash;
}
async function getSession(req, KV) {
  const m = (req.headers.get('Cookie')||'').match(/vtm_sid=([^;]+)/);
  if (!m) return null;
  const raw = await KV.get(`session:${m[1]}`);
  return raw ? JSON.parse(raw) : null;
}
async function createSession(KV, userId, username, isMaster) {
  const sid = crypto.randomUUID();
  await KV.put(`session:${sid}`, JSON.stringify({ userId, username, isMaster }), { expirationTtl: 604800 });
  return sid;
}
async function destroySession(req, KV) {
  const m = (req.headers.get('Cookie')||'').match(/vtm_sid=([^;]+)/);
  if (m) await KV.delete(`session:${m[1]}`);
}
function sessionCookie(sid) {
  return `vtm_sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
}
