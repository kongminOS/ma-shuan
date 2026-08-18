// @kongmin/ma-shuan —— 密钥箱插件 (KeyBox) · client 侧 · DeepSeek Harness 治理套件
window.__ModuleLoader__.load({
  id: "@kongmin/ma-shuan",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

// sidebar.footer.action 并列注入 🔐 密钥箱图标（复用 wkq-gov 🛡 同槽位）
// 点图标打开密钥箱面板：客户密钥账本（登记/追溯/到期提醒/更换指引）
// KeyBox skeleton
let maRegistered = false;

function registerMaShuan(ctx) {
  if (maRegistered) return;
  let slots = null;
  try { slots = ctx.slots; } catch (e) { slots = null; }
  if (!slots || typeof slots.inject !== "function") {
    console.warn("[ma-shuan] slots 不可用, 密钥箱不注入");
    return;
  }
  try {
    const _react = require("react");

    // —— 面板：密钥账本 UI ——
    function MaShuanPanel({ close }) {
      const [view, setView] = _react.useState("list"); // list / add / detail
      const [keys, setKeys] = _react.useState([]);
      const [ledger, setLedger] = _react.useState([]);
      const [vault, setVault] = _react.useState(null);
      const [needInit, setNeedInit] = _react.useState(false);
      const [detail, setDetail] = _react.useState(null);
            const [revealed, setRevealed] = _react.useState(null);
            const [search, setSearch] = _react.useState("");
            const [form, setForm] = _react.useState({ name: "", value: "", note: "", platform: "", type: "permanent", expires: "" });
      const [msg, setMsg] = _react.useState("");

      const fetchKeys = () => {
        fetch("/ma-shuan/keys").then((r) => r.json()).then((d) => {
          if (d.ok) { setKeys(d.keys); setNeedInit(false); }
          else setNeedInit(true);
        }).catch(() => setNeedInit(true));
      };

      _react.useEffect(() => {
        fetch("/ma-shuan/status").then((r) => r.json()).then((d) => {
          if (d.ok && d.keyCount >= 0) { setVault(d.vault); fetchKeys(); }
          else setNeedInit(true);
        }).catch(() => setNeedInit(true));
        fetch("/ma-shuan/ledger").then((r) => r.json()).then((d) => d.ok && setLedger(d.ledger)).catch(() => {});
      }, []);

      // 平台徽标色
      const platColor = (p) => {
        const map = { "GitHub": "#8b949e", "OpenAI": "#10a37f", "AWS": "#ff9900", "Stripe": "#635bff", "SkillHub": "#ff7a59", "Anthropic": "#d97757", "其他/未知": "#8b949e" };
        return map[p] || "#8b949e";
      };
      const expiryLabel = (e) => {
        if (e.status === "expired") return _react.createElement("span", { style: { color: "#f85149", fontWeight: 600 } }, "已过期");
        if (e.status === "expiring") return _react.createElement("span", { style: { color: "#d29922" } }, `${e.days}天后到期`);
        if (e.status === "permanent") return _react.createElement("span", { style: { color: "#3fb950" } }, "永久");
        return _react.createElement("span", { style: { color: "#3fb950" } }, "正常");
      };

      // —— 首次选择存储位 ——
            if (needInit) {
              return _react.createElement("div", { style: { padding: 16, width: 380, fontFamily: "sans-serif", background: "#ffffff" } },
                _react.createElement("div", { style: { fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#1f2328" } }, "🔒 密钥箱"),
                _react.createElement("p", { style: { color: "#57606a", fontSize: 12, margin: "0 0 12px 0" } },
                  "选择你要存密钥的位置。密钥只存在这个位置，加密保护，读取不到，我们不碰系统其他地方的密钥。"),
                _react.createElement("input", {
                  placeholder: "例如 D:/keybox", value: form.vaultPath || "", style: { width: "100%", padding: 8, marginBottom: 8, background: "#ffffff", color: "#1f2328", border: "1px solid #d0d7de", borderRadius: 6 }
                , onChange: (e) => setForm((f) => ({ ...f, vaultPath: e.target.value })) }),
                _react.createElement("button", {
                  onClick: async () => {
                    const root = form.vaultPath || "D:/keybox";
                    try {
                      const r = await fetch("/ma-shuan/init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vaultRoot: root }) });
                      const d = await r.json();
                      if (d.ok) { setVault(d.vault); setNeedInit(false); fetchKeys(); setMsg(""); }
                      else setMsg(d.error || "初始化失败");
                    } catch (e) { setMsg(e.message); }
                  }, style: { background: "#1f6feb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }
                }, "确定使用这个位置"),
                msg ? _react.createElement("div", { style: { color: "#f85149", marginTop: 8, fontSize: 12 } }, msg) : null,
              );
            }

      // —— 主面板 ——
      const row = (label, val, color) => _react.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "4px 0", color, fontSize: 13 } },
        _react.createElement("span", {}, label), _react.createElement("span", { style: { fontWeight: 600 } }, val));

      // 搜索过滤
      const q = search.trim().toLowerCase();
      const filtered = q ? keys.filter((k) => (k.name || "").toLowerCase().includes(q) || (k.note || "").toLowerCase().includes(q) || (k.platform || "").toLowerCase().includes(q)) : keys;
      return _react.createElement("div", { style: { width: 440, maxHeight: 560, overflowY: "auto", padding: 16, fontFamily: "sans-serif", background: "#ffffff", borderRadius: 14 } },
              // 头部
              _react.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } },
                _react.createElement("span", { style: { fontSize: 16, fontWeight: 700, color: "#1f2328" } }, "🔒 密钥箱"),
                _react.createElement("button", { onClick: close, style: { background: "none", border: "none", color: "#8b949e", fontSize: 18, cursor: "pointer" } }, "✕")),
                              // 加密状态横幅（客户一眼知道加密了）
                              _react.createElement("div", { style: { background: "#e8f5ee", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#1a7f37" } },
                                _react.createElement("span", { style: { fontSize: 14 } }, "🔒"),
                                _react.createElement("span", { style: { fontWeight: 600 } }, "AES-256 加密保护"),
                                _react.createElement("span", { style: { color: "#3fb950", marginLeft: "auto" } }, "加密中 · 已启用")),
                              // 到期概览
              _react.createElement("div", { style: { background: "#f6f8fa", borderRadius: 8, padding: 10, marginBottom: 12 } },
                row("密钥总数", String(keys.length), "#1f2328"),
                row("已过期", String(keys.filter((k) => k.expiry && k.expiry.status === "expired").length), "#f85149"),
                row("即将到期", String(keys.filter((k) => k.expiry && k.expiry.status === "expiring").length), "#d29922"),
                row("存储位置", vault ? vault.replace(/[/\\\\]/g, "/") : "-", "#656d76")),
              // 工具栏
                            _react.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 12, alignItems: "center" } },
                              _react.createElement("input", {
                                placeholder: "🔍 查找密钥（名称/备注/平台）", value: search,
                                onChange: (e) => setSearch(e.target.value),
                                style: { flex: 1, padding: "7px 10px", background: "#fff", color: "#1f2328", border: "1px solid #d0d7de", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }
                              }),
                              _react.createElement("button", { onClick: () => { setView("add"); setMsg(""); }, style: btn } , "+ 添加密钥"),
                              _react.createElement("button", { onClick: fetchKeys, style: { ...btn, background: "#eaeef2" } }, "刷新")),

              // 添加表单
              view === "add" ? _react.createElement("div", { style: { background: "#f6f8fa", borderRadius: 8, padding: 12, marginBottom: 12 } },
                _react.createElement(Field, { label: "名称", val: form.name, ph: "例如 我的 GitHub" , onChange: (v) => setForm((f) => ({ ...f, name: v })) }),
                _react.createElement(Field, { label: "密钥值", val: form.value, ph: "粘贴 token/KEY", onChange: (v) => setForm((f) => ({ ...f, value: v })) }),
                _react.createElement(Field, { label: "用途备注", val: form.note, ph: "用于 xxx 工具 / 配到哪了", onChange: (v) => setForm((f) => ({ ...f, note: v })) }),
                _react.createElement(Field, { label: "过期类型", val: form.type, ph: "", onChange: (v) => setForm((f) => ({ ...f, type: v })), select: ["一次性", "永久", "有到期日"].map((x) => x) }),
                form.type === "有到期日" ? _react.createElement(Field, { label: "到期日期", val: form.expires, ph: "2026-12-31", onChange: (v) => setForm((f) => ({ ...f, expires: v })) }) : null,
                _react.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8 } },
                  _react.createElement("button", {
                    onClick: async () => {
                      const typeMap = { "一次性": "one-time", "永久": "permanent", "有到期日": "dated" };
                      try {
                        const r = await fetch("/ma-shuan/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, value: form.value, note: form.note, type: typeMap[form.type] || "permanent", expires: form.type === "有到期日" ? form.expires : null }) });
                        const d = await r.json();
                        if (d.ok) { setView("list"); setMsg(""); fetchKeys(); const f0 = { name: "", value: "", note: "", platform: "", type: "permanent", expires: "" }; setForm(f0); }
                        else setMsg(d.error || "保存失败");
                      } catch (e) { setMsg(e.message); }
                    }, style: { ...btn, flex: 1 }
                  }, "保存"),
                  _react.createElement("button", { onClick: () => { setView("list"); setMsg(""); }, style: { ...btn, background: "#eaeef2" } }, "取消")),
                msg ? _react.createElement("div", { style: { color: "#f85149", marginTop: 6, fontSize: 12 } }, msg) : null,
              ) : null,

              // 密钥列表（搜索过滤用 filtered）
                            keys.length === 0 && view === "list" ? _react.createElement("p", { style: { color: "#8b949e", fontSize: 13, textAlign: "center", padding: 24 } }, "还没有密钥。点「+ 添加密钥」登记第一个。") : null,
                            filtered.length === 0 && keys.length > 0 ? _react.createElement("p", { style: { color: "#8b949e", fontSize: 13, textAlign: "center", padding: 24 } }, `没有匹配「${search}」的密钥`) : null,
                            filtered.map((k) => _react.createElement("div", { key: k.id, onClick: () => { setDetail(k); setRevealed(null); }, style: { background: "#f6f8fa", borderRadius: 8, padding: 10, marginBottom: 8, cursor: "pointer", border: "1px solid #d0d7de" } },
                              _react.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                                _react.createElement("span", { style: { fontWeight: 600, fontSize: 14, color: "#1f2328" } }, k.name || k.masked),
                                _react.createElement("span", { style: { fontSize: 11, color: platColor(k.platform), padding: "2px 8px", background: "#eaeef2", borderRadius: 10 } }, k.platform || "其他/未知")),
                              _react.createElement("div", { style: { marginTop: 4, fontSize: 12, color: "#656d76" } }, k.masked || (k.hasValue ? "已加密存储" : "无值")),
                              _react.createElement("div", { style: { marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 11, alignItems: "center" } },
                                k.note ? _react.createElement("span", { style: { color: "#656d76" } }, k.note.slice(0, 24)) : _react.createElement("span", { style: { color: "#8b949e" } }, "无备注"),
                                _react.createElement("span", { style: { display: "flex", alignItems: "center", gap: 8 } },
                                  // 调用状态：last_used 或 granted_to 有值 = 已调用
                                  (k.last_used || (k.granted_to && k.granted_to.length))
                                    ? _react.createElement("span", { style: { color: "#3fb950" } }, "✓ 已调用" + (k.last_used ? "" : ""))
                                    : _react.createElement("span", { style: { color: "#8b949e" } }, "未调用"),
                                  k.expiry ? expiryLabel(k.expiry) : null)))),

        // 详情
                detail ? _react.createElement("div", { style: { marginTop: 12, background: "#f6f8fa", borderRadius: 8, padding: 12 } },
                  _react.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } },
                    _react.createElement("span", { style: { fontWeight: 600, color: "#1f2328" } }, "🗝 " + (detail.name || detail.masked)),
                    _react.createElement("button", { onClick: async () => { await fetch("/ma-shuan/keys/" + detail.id, { method: "DELETE" }); setDetail(null); fetchKeys(); }, style: { background: "none", border: "1px solid #f85149", color: "#f85149", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 } }, "删除")),
                  row("平台", detail.platform || "-", "#1f2328"),
                  row("类型", detail.type === "one-time" ? "一次性" : detail.type === "dated" ? "有到期日" : "永久", "#1f2328"),
                  row("到期", detail.expires ? detail.expires : "永久", "#1f2328"),
                  row("打码值", detail.masked || "-", "#656d76"),
                  row("调用状态", (detail.last_used || (detail.granted_to && detail.granted_to.length)) ? ("已调用 · " + (detail.last_used ? String(detail.last_used).slice(0,10) : "给过 " + detail.granted_to.length + " 方")) : "未调用", (detail.last_used || (detail.granted_to && detail.granted_to.length)) ? "#3fb950" : "#8b949e"),
                  _react.createElement("div", { style: { marginTop: 8 } },
                    _react.createElement("button", { onClick: async () => {
                      const r = await fetch("/ma-shuan/keys/" + detail.id + "/value"); const d = await r.json();
                      if (d.ok) setRevealed(d.value);
                    }, style: { ...btn, background: "#eaeef2", fontSize: 12 } }, revealed ? "已显示↓" : "查看完整密钥"),
                    revealed ? _react.createElement("div", { style: { wordBreak: "break-all", background: "#f6f8fa", padding: 8, borderRadius: 6, marginTop: 6, fontSize: 12, color: "#1f2328", fontFamily: "monospace" } }, revealed) : null),
                  detail.note ? _react.createElement("div", { style: { marginTop: 8, fontSize: 12, color: "#656d76" } }, "📝 " + detail.note) : null,
                  (detail.granted_to && detail.granted_to.length) ? _react.createElement("div", { style: { marginTop: 4, fontSize: 12, color: "#656d76" } }, "🤖 给过: " + detail.granted_to.join(", ")) : null,
                ) : null,
              );
    }

    const Field = ({ label, val, onChange, ph, select }) => _react.createElement("div", { style: { marginBottom: 8 } },
      _react.createElement("label", { style: { fontSize: 11, color: "#8b949e", display: "block", marginBottom: 3 } }, label),
      select
        ? _react.createElement("select", { value: val, onChange: (e) => onChange(e.target.value), style: inputStyle },
            select.map((o) => _react.createElement("option", { key: o, value: o }, o)))
        : _react.createElement("input", { value: val, placeholder: ph, onChange: (e) => onChange(e.target.value), style: inputStyle }));

    const inputStyle = { width: "100%", padding: 7, background: "#ffffff", color: "#1f2328", border: "1px solid #d0d7de", borderRadius: 6, fontSize: 13, boxSizing: "border-box" };
        const btn = { background: "#1f6feb", color: "#fff", border: "none", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13 };

    // —— sidebar.footer.action 并列注入 🔐（与 🛡 盾牌并排）——
    // 与治理徽标共用一个 slot，此处注入密钥箱图标，形成"治理 + 密钥箱"
    const disposer = slots.inject("sidebar.footer.action", () => slots.register({
          name: "sidebar.footer.action",
          id: "ma-shuan-entry",
          locale: "kongmin.mashuan",
          inject: () => ({})
        }, ({ actions }) => {
                  const [open, setOpen] = _react.useState(false);
                  // 让 footer 图标区竖排（order:-1 最前=最顶；容器设为 column）
                                    _react.useEffect(() => {
                                      try {
                                        const btn = document.querySelector('button[title*="密钥箱"]');
                                        if (!btn) return;
                                        let fa = btn.parentElement;
                                        while (fa && !String(fa.className).includes("footerActions")) fa = fa.parentElement;
                                        if (fa && getComputedStyle(fa).flexDirection !== "column") fa.style.flexDirection = "column";
                                        if (btn && String(btn.style.order) !== "-1") btn.style.order = "-1";
                                      } catch (e) {}
                                    }, []);
                                    return _react.createElement("div", { style: { order: -1 } },
                                                                          _react.createElement("button", {
                                                                            title: open ? "密钥箱 · 已打开" : "密钥箱 · 密钥账本",
                                                                            "data-active": open ? "" : undefined,
                                                                            onClick: () => setOpen((o) => !o),
                                                                            style: {
                                                                              width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer",
                                                                              background: open ? "var(--gold,#C9A24B)" : "var(--gold-soft,#f3e9d2)",
                                                                              color: open ? "#fff" : "var(--gold,#C9A24B)",
                                                                              display: "flex", alignItems: "center", justifyContent: "center",
                                                                              margin: "2px 0", order: -1, transition: "background .15s"
                                                                            }
                                                                          },
                                                                            // 锁 SVG：打开=开锁(开盖)，关闭=锁闭（金色线性风格，与治理徽标一致）
                                                                            _react.createElement("svg", { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", style: { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } },
                                                                              open
                                                                                ? _react.createElement(_react.Fragment, null,
                                                                                    _react.createElement("rect", { x: 4, y: 11, width: 16, height: 9, rx: 2 }),
                                                                                    _react.createElement("path", { d: "M8 11V8a4 4 0 0 1 7.5-2" }),
                                                                                    _react.createElement("path", { d: "M8 15h.01M12 15h.01M16 15h.01" }))
                                                                                : _react.createElement(_react.Fragment, null,
                                                                                    _react.createElement("rect", { x: 4, y: 11, width: 16, height: 9, rx: 2 }),
                                                                                    _react.createElement("path", { d: "M8 11V7a4 4 0 0 1 8 0v4" }))
                                                                            )),
                    // 全屏浮层：fixed 脱离文档流，覆盖全屏，不破坏侧栏布局（浅色，不黑屏）
                    open ? _react.createElement("div", { onClick: () => setOpen(false), style: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,17,21,.45)", display: "flex", alignItems: "center", justifyContent: "center" } },
                      _react.createElement("div", { onClick: (e) => e.stopPropagation(), style: { background: "#ffffff", borderRadius: 14, boxShadow: "0 8px 40px rgba(0,0,0,.2)", minWidth: 440, maxWidth: 560, maxHeight: "80vh", overflow: "auto" } },
                        _react.createElement(MaShuanPanel, { close: () => setOpen(false) }))) : null);
                }));
    ctx.effect(() => disposer, "ma-shuan: sidebar footer password vault");

    maRegistered = true;
  } catch (e) {
    console.error("[ma-shuan] 注册失败:", e.message);
  }
}

function start(ctx) {
  ctx.effect(() => {
    setTimeout(() => registerMaShuan(ctx), 800);
    const retry = setInterval(() => registerMaShuan(ctx), 4000);
    return () => clearInterval(retry);
  }, "ma-shuan: register");
}

exports.inject = ["slots", "sessions"];
exports.apply = start;

    return module.exports;
  }
});
