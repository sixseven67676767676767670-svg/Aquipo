// api.js
//
// Camada fina em cima da sua API já existente (Netlify: src/routes/keys.routes.js).
// O bot NUNCA fala direto com o banco — ele só chama essas rotas, exatamente
// como o painel (index.html) já faz, usando o mesmo ADMIN_API_KEY.

const fetch = require("node-fetch");

const API_BASE = process.env.API_BASE; // ex: https://seusite.netlify.app/api/v1
const ADMIN_API_KEY = process.env.ADMIN_API_KEY; // mesma key do Netlify, se configurada
const SCRIPT_ID = process.env.SCRIPT_ID; // o id do script que este painel gerencia

function headers() {
  const h = { "Content-Type": "application/json" };
  if (ADMIN_API_KEY) h["x-api-key"] = ADMIN_API_KEY;
  return h;
}

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return json.data ?? json;
}

// GET /scripts/:id/keys -> { enabled, hwidLock, keys: [...] }
async function listKeys() {
  return request("GET", `/scripts/${SCRIPT_ID}/keys`);
}

// Acha uma key pelo valor digitado pelo usuário (ex: "VXS-AB3F-9QK7-ZP12")
async function findKeyByValue(keyValue) {
  const { keys } = await listKeys();
  return keys.find((k) => k.key === keyValue) || null;
}

// POST /scripts/:id/keys  { duration }
async function createKey(duration = "lifetime") {
  return request("POST", `/scripts/${SCRIPT_ID}/keys`, { duration });
}

// POST /scripts/:id/keys/:keyId/unbind-hwid
async function unbindHwid(keyId) {
  return request("POST", `/scripts/${SCRIPT_ID}/keys/${keyId}/unbind-hwid`);
}

module.exports = { listKeys, findKeyByValue, createKey, unbindHwid, SCRIPT_ID };
