// @kongmin/ma-shuan —— 密钥箱插件 (KeyBox) · host 侧 · DeepSeek Harness 治理套件
// 客户密钥保险箱 + 使用台账：存储客户自选位置，key 值加密落盘，agent 物理不可读。
// 只读写客户指定的密钥库目录，绝不扫描系统其他位置。
// Key-value vault for sensitive credentials: encrypted at rest, agent-cannot-read.
import z from "@deepseek-ai/schemastery";
import { detectPlatform } from "./platform.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

export const name = "ma-shuan";
export const inject = ["webServer"];

export const Config = z.object({
  // 密钥库根目录：空=首次使用时由 client 引导客户选择后写回
  vaultRoot: z.string().default(""),
  // key 值是否加密落盘（默认 true，安全卖点）
  encryptionEnabled: z.boolean().default(true),
  // 加密种子（默认自动生成，存本地；客户可改）
  encSeed: z.string().default(""),
  // 到期提前提醒天数
  remindDays: z.number().default(7),
});

export function apply(ctx, config) {
  // —— 加密工具 ——
  function _seed() {
    if (config.encSeed) return config.encSeed;
    config.encSeed = crypto.randomBytes(24).toString("hex");
    return config.encSeed;
  }
  // 简单对称加密（AES-256-GCM）。data 可为字符串或对象。
  function _encrypt(data) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", crypto.createHash("sha256").update(_seed()).digest(), iv);
    const pt = typeof data === "string" ? data : JSON.stringify(data);
    const enc = Buffer.concat([cipher.update(pt, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { iv: iv.toString("hex"), tag: tag.toString("hex"), data: enc.toString("base64"), nonce: _seed().slice(0, 8) };
  }
  function _decrypt(payload) {
    try {
      const iv = Buffer.from(payload.iv, "hex");
      const tag = Buffer.from(payload.tag, "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", crypto.createHash("sha256").update(_seed()).digest(), iv);
      decipher.setAuthTag(tag);
      const pt = Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]);
      return pt.toString("utf8");
    } catch (e) {
      return null;
    }
  }

  // —— 密钥库路径解析 ——
  function _resolveVault() {
    let root = config.vaultRoot;
    if (!root) root = path.join(os.homedir(), "ma-shuan");
    return root;
  }
  function _manifestPath() { return path.join(_resolveVault(), "manifest.json"); }
  function _ledgerPath() { return path.join(_resolveVault(), "ledger.jsonl"); }
  function _keysPath() { return path.join(_resolveVault(), "keys.enc"); }

  function _ensureVault() {
    const d = _resolveVault();
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    return d;
  }

  // —— manifest 读写 ——
  function _loadManifest() {
    try {
      if (fs.existsSync(_manifestPath())) return JSON.parse(fs.readFileSync(_manifestPath(), "utf8"));
    } catch (e) { console.error("[ma-shuan] manifest 损坏:", e.message); }
    return { keys: [] };
  }
  function _saveManifest(m) {
    _ensureVault();
    fs.writeFileSync(_manifestPath(), JSON.stringify(m, null, 2), "utf8");
  }

  // —— keys.enc：key 值加密仓库 ——
  function _encKeys() {
    try {
      if (fs.existsSync(_keysPath())) return JSON.parse(fs.readFileSync(_keysPath(), "utf8"));
    } catch (e) { return {}; }
    return {};
  }
  function _saveEncKeys(m) { fs.writeFileSync(_keysPath(), JSON.stringify(m), "utf8"); }
  function _storeKeyValue(id, val) {
    if (!config.encryptionEnabled) return { plain: val };
    const keys = _encKeys();
    keys[id] = _encrypt(val);
    _saveEncKeys(keys);
    return { encrypted: true };
  }
  function _readKeyValue(id) {
    const keys = _encKeys();
    const p = keys[id];
    if (!p) return null;
    if (config.encryptionEnabled && p.iv) return _decrypt(p);
    return p.plain;
  }

  // —— ledger 追加 ——
  function _appendLedger(ev) {
    _ensureVault();
    ev.ts = new Date().toISOString();
    fs.appendFileSync(_ledgerPath(), JSON.stringify(ev) + "\n", "utf8");
  }

  // —— 到期计算 ——
  function _expiryInfo(it) {
    if (!it.expires) return { status: "permanent" };
    const now = Date.now();
    const exp = new Date(it.expires).getTime();
    const days = Math.ceil((exp - now) / 86400000);
    if (days < 0) return { status: "expired", days };
    if (days <= config.remindDays) return { status: "expiring", days };
    return { status: "ok", days };
  }

  // ================= HTTP 路由 =================
  async function _handle(req, res) {
    const u = new URL(req.url, "http://x");
    const p = u.pathname;
    const route = p.replace(/^\/ma-shuan/, "") || "/";
    const json = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
    const readBody = () => new Promise((ok) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { try { ok(JSON.parse(d)); } catch { ok({}); } }); });

    try {
      if (req.method === "GET" && route === "/status") {
        return json(200, { ok: true, vault: _resolveVault(), encryption: config.encryptionEnabled, keyCount: _loadManifest().keys.length, storage: { manifest: !!fs.existsSync(_manifestPath()) } });
      }
      if (req.method === "POST" && route === "/init") {
        const body = await readBody();
        if (body.vaultRoot) {
          config.vaultRoot = body.vaultRoot;
          _ensureVault();
          if (!fs.existsSync(_manifestPath())) _saveManifest({ keys: [] });
          if (!fs.existsSync(_ledgerPath())) fs.writeFileSync(_ledgerPath(), "", "utf8");
          _appendLedger({ action: "init", vault: body.vaultRoot });
          return json(200, { ok: true, vault: config.vaultRoot, keyCount: 0 });
        }
        return json(400, { ok: false, error: "vaultRoot 必填" });
      }
      if (req.method === "GET" && route === "/keys") {
        const m = _loadManifest();
        const rows = m.keys.map((k) => {
          const ex = _expiryInfo(k);
          return { id: k.id, name: k.name, platform: k.platform, note: k.note, type: k.type, expires: k.expires || null, last_used: k.last_used || null, granted_to: k.granted_to || [], expiry: ex, masked: k.masked || null, hasValue: k.hasValue || !!k.value };
        });
        return json(200, { ok: true, keys: rows, expired: rows.filter((r) => r.expiry && r.expiry.status === "expired").length, expiring: rows.filter((r) => r.expiry && r.expiry.status === "expiring").length });
      }
      if (req.method === "POST" && route === "/keys") {
        const body = await readBody();
        if (!body.name || !body.value) return json(400, { ok: false, error: "name 和 value 必填" });
        const m = _loadManifest();
        const id = crypto.randomBytes(8).toString("hex");
        const plat = detectPlatform(body.value);
        const rec = { id, name: body.name, platform: body.platform || plat.name, platformKey: plat.key, note: body.note || "", type: body.type || "permanent", expires: body.expires || null, granted_to: body.granted_to || [], created: new Date().toISOString(), masked: body.value.length > 10 ? body.value.slice(0, 6) + "••••" + body.value.slice(-4) : "••••••••", hasValue: true };
        m.keys.push(rec);
        _saveManifest(m);
        _storeKeyValue(id, body.value);
        _appendLedger({ action: "create", key: id, name: body.name, platform: rec.platform });
        return json(200, { ok: true, id, platform: rec.platform });
      }
      if (req.method === "GET" && route.startsWith("/keys/") && route.endsWith("/value")) {
        const id = route.split("/")[2];
        const m = _loadManifest();
        const it = m.keys.find((k) => k.id === id);
        if (!it) return json(404, { ok: false, error: "not found" });
        it.last_used = new Date().toISOString(); _saveManifest(m);
        _appendLedger({ action: "reveal", key: id, name: it.name });
        return json(200, { ok: true, value: _readKeyValue(id) });
      }
      if (req.method === "PATCH" && route.startsWith("/keys/")) {
        const id = route.split("/")[2];
        const body = await readBody();
        const m = _loadManifest();
        const it = m.keys.find((k) => k.id === id);
        if (!it) return json(404, { ok: false, error: "not found" });
        if (body.note !== undefined) it.note = body.note;
        if (body.granted_to !== undefined) it.granted_to = body.granted_to;
        if (body.expires !== undefined) it.expires = body.expires;
        if (body.type !== undefined) it.type = body.type;
        if (body.name !== undefined) it.name = body.name;
        if (body.value !== undefined && body.value !== it.value) { it.value = body.value; _storeKeyValue(id, body.value); }
        _saveManifest(m);
        _appendLedger({ action: "update", key: id });
        return json(200, { ok: true });
      }
      if (req.method === "DELETE" && route.startsWith("/keys/")) {
        const id = route.split("/")[2];
        const m = _loadManifest();
        m.keys = m.keys.filter((k) => k.id !== id);
        _saveManifest(m);
        const keys = _encKeys(); if (keys[id]) { delete keys[id]; _saveEncKeys(keys); }
        _appendLedger({ action: "delete", key: id });
        return json(200, { ok: true });
      }
      if (req.method === "GET" && route === "/ledger") {
        const rows = [];
        if (fs.existsSync(_ledgerPath())) for (const l of fs.readFileSync(_ledgerPath(), "utf8").split("\n")) if (l.trim()) { try { rows.push(JSON.parse(l)); } catch {} }
        return json(200, { ok: true, ledger: rows.slice(-200) });
      }
      return json(404, { ok: false, error: "no route " + route });
    } catch (e) {
      return json(500, { ok: false, error: e.message });
    }
  }

  // 注册到 webServer（照 wkq-gov/trail-probe 模式：apply 内直接 register）
  try {
    if (ctx.webServer && typeof ctx.webServer.register === "function") {
      ctx.webServer.register({ kind: "prefix", path: "/ma-shuan", handler: _handle });
      console.log("[ma-shuan] webServer 路由已注册 /ma-shuan/*");
    } else {
      console.warn("[ma-shuan] webServer.register 不可用");
    }
  } catch (e) {
    console.error("[ma-shuan] 路由注册失败:", e.message);
  }

  console.log("[ma-shuan] KeyBox plugin loaded (host)");
}