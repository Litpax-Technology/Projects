'use strict';

/* =====================================================================
   1. CORE — state, helpers, JSONP api, upload, toast, modal
   ===================================================================== */
const S = { token: null, me: null, cfg: {}, modules: [], packageModes: [], paymentTypes: [], adjMode: '', project: null, locations: [], packages: [], parties: [], users: [], pending: 0 };

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = n => (n < 10 ? '0' : '') + n;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const money = n => (n === '' || n == null) ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtDate = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/); return m ? m[3] + '-' + m[2] + '-' + m[1] + (m[4] ? m[4].slice(0, 6) : '') : (s || ''); };
const isOn = v => !(v === false || v === 'FALSE' || v === 'false');
const cfgVals = type => (S.cfg[type] || []).map(c => c.value);
const nameOf = (list, id) => { const x = list.find(i => i.id === id); return x ? x.name : ''; };
const locName = id => { const l = S.locations.find(x => x.LocationID === id); return l ? l.DisplayName : ''; };
const pkgName = id => nameOf(S.packages, id);
const userName = id => nameOf(S.users, id) || id || '';
const can = (m, a) => !!S.me && (S.me.isSystem || ((S.me.perms[m] || []).indexOf(a) > -1));

/* Icon shapes from Lucide (ISC licence), embedded so the app needs no icon CDN */
const ICONS = {
  "layout-dashboard":"<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>",
  "building":"<path d=\"M12 10h.01\"/><path d=\"M12 14h.01\"/><path d=\"M12 6h.01\"/><path d=\"M16 10h.01\"/><path d=\"M16 14h.01\"/><path d=\"M16 6h.01\"/><path d=\"M8 10h.01\"/><path d=\"M8 14h.01\"/><path d=\"M8 6h.01\"/><path d=\"M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3\"/><rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/>",
  "package":"<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"/><path d=\"M12 22V12\"/><polyline points=\"3.29 7 12 12 20.71 7\"/><path d=\"m7.5 4.27 9 5.15\"/>",
  "clipboard-list":"<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"M12 11h4\"/><path d=\"M12 16h4\"/><path d=\"M8 11h.01\"/><path d=\"M8 16h.01\"/>",
  "receipt":"<path d=\"M12 17V7\"/><path d=\"M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8\"/><path d=\"M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z\"/>",
  "circle-check-big":"<path d=\"M21.801 10A10 10 0 1 1 17 3.335\"/><path d=\"m9 11 3 3L22 4\"/>",
  "users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><path d=\"M16 3.128a4 4 0 0 1 0 7.744\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/>",
  "wallet":"<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>",
  "chart-column":"<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"M18 17V9\"/><path d=\"M13 17V5\"/><path d=\"M8 17v-3\"/>",
  "settings":"<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "plus":"<path d=\"M5 12h14\"/><path d=\"M12 5v14\"/>",
  "download":"<path d=\"M12 15V3\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/>",
  "printer":"<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"/><path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\"/><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"/>",
  "search":"<path d=\"m21 21-4.34-4.34\"/><circle cx=\"11\" cy=\"11\" r=\"8\"/>",
  "log-out":"<path d=\"m16 17 5-5-5-5\"/><path d=\"M21 12H9\"/><path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/>",
  "key-round":"<path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\"/><circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>",
  "menu":"<path d=\"M4 5h16\"/><path d=\"M4 12h16\"/><path d=\"M4 19h16\"/>",
  "x":"<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>",
  "inbox":"<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\"/><path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/>",
  "trending-up":"<path d=\"M16 7h6v6\"/><path d=\"m22 7-8.5 8.5-5-5L2 17\"/>",
  "hand-coins":"<path d=\"M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17\"/><path d=\"m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9\"/><path d=\"m2 16 6 6\"/><circle cx=\"16\" cy=\"9\" r=\"2.9\"/><circle cx=\"6\" cy=\"5\" r=\"3\"/>",
  "landmark":"<path d=\"M10 18v-7\"/><path d=\"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z\"/><path d=\"M14 18v-7\"/><path d=\"M18 18v-7\"/><path d=\"M3 22h18\"/><path d=\"M6 18v-7\"/>",
  "clock":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/>",
  "hard-hat":"<path d=\"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5\"/><path d=\"M14 6a6 6 0 0 1 6 6v3\"/><path d=\"M4 15v-3a6 6 0 0 1 6-6\"/><rect x=\"2\" y=\"15\" width=\"20\" height=\"4\" rx=\"1\"/>",
  "shield-check":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>",
  "banknote":"<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M6 12h.01M18 12h.01\"/>",
  "scale":"<path d=\"M12 3v18\"/><path d=\"m19 8 3 8a5 5 0 0 1-6 0zV7\"/><path d=\"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1\"/><path d=\"m5 8 3 8a5 5 0 0 1-6 0zV7\"/><path d=\"M7 21h10\"/>",
  "chevron-left":"<path d=\"m15 18-6-6 6-6\"/>",
  "chevron-right":"<path d=\"m9 18 6-6-6-6\"/>",
  "alert":"<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>"
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---- Fast data: recent read results are remembered so pages open instantly.
        Any change (save / approve / delete / payment …) clears everything,
        so a page never shows figures from before that change. ---- */
const READS = { bootstrap: 1, dashboard: 1, list: 1, listApprovals: 1, partyLedger: 1, payables: 1, report: 1 };
const DC = new Map(), DC_TTL = 5 * 60 * 1000;
let DC_GEN = 0;
const dcKey = (action, data) => action + '|' + JSON.stringify(data || {});
function cached(action, data) { const e = DC.get(dcKey(action, data)); return e && Date.now() - e.t < DC_TTL ? e.v : null; }
function clearCache() { DC.clear(); DC_GEN++; }

/* ---- Top loading bar while the server is working ---- */
const NET = { n: 0, t: 0, p: 0, bar: null };
function netStart() {
  if (!NET.bar) { NET.bar = document.createElement('div'); NET.bar.id = 'netBar'; NET.bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(NET.bar); }
  if (++NET.n > 1) return;
  clearInterval(NET.t); NET.p = .08; NET.bar.style.transform = 'scaleX(.08)'; NET.bar.classList.add('on');
  NET.t = setInterval(() => { NET.p += (.9 - NET.p) * .08; NET.bar.style.transform = 'scaleX(' + NET.p + ')'; }, 200);
}
function netEnd() {
  if (NET.n === 0 || --NET.n > 0) return;
  clearInterval(NET.t); NET.bar.style.transform = 'scaleX(1)';
  setTimeout(() => { if (!NET.n) { NET.bar.classList.remove('on'); setTimeout(() => { if (!NET.n) NET.bar.style.transform = 'scaleX(0)'; }, 300); } }, 200);
}

function api(action, data) {
  return new Promise((resolve, reject) => {
    const cb = 'jp_' + uid();
    const s = document.createElement('script');
    const gen = DC_GEN;
    let done = false;
    netStart();
    const finish = (fn, v) => { if (done) return; done = true; clearTimeout(timer); window[cb] = function () {}; s.remove(); netEnd(); fn(v); };
    const timer = setTimeout(() => finish(reject, new Error('The server took too long to respond. Your data is kept — please try again.')), CONFIG.TIMEOUT_MS);
    window[cb] = res => {
      if (res && res.ok) {
        if (!READS[action]) clearCache();                                          // something changed → forget old data
        else if (gen === DC_GEN) DC.set(dcKey(action, data), { t: Date.now(), v: res });  // only if nothing changed meanwhile
        return finish(resolve, res);
      }
      const e = new Error((res && res.message) || 'Request failed'); e.code = res && res.error;
      finish(reject, e);
      if (e.code === 'AUTH' && S.token) logout(true);
    };
    let url = CONFIG.API_URL + '?action=' + encodeURIComponent(action) + '&callback=' + cb;
    if (S.token) url += '&token=' + encodeURIComponent(S.token);
    if (data) url += '&data=' + encodeURIComponent(JSON.stringify(data));
    if (url.length > 7000) return finish(reject, new Error('This entry has too much text. Please shorten the description or remarks.'));
    s.onerror = () => finish(reject, new Error('Network error. Your data is kept — please try again.'));
    s.src = url;
    document.body.appendChild(s);
  });
}

/* ---- File upload (POST, because JSONP cannot carry files) ---- */
function readBase64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Could not read the file')); r.readAsDataURL(blob); });
}
function compressImage(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, CONFIG.MAX_IMAGE_PX / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read the image')); };
    img.src = url;
  });
}
async function uploadFile(file) {
  if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(file.type)) throw new Error('Only JPG, PNG or PDF files are allowed');
  let mime = file.type, name = file.name, data;
  if (mime === 'application/pdf') {
    if (file.size > 5 * 1024 * 1024) throw new Error('PDF is larger than 5 MB');
    data = await readBase64(file);
  } else { data = await compressImage(file); mime = 'image/jpeg'; name = name.replace(/\.\w+$/, '') + '.jpg'; }
  let j;
  netStart();
  try {
    const r = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: S.token, name: name, mime: mime, data: data }) });
    j = await r.json();
  } catch (e) { throw new Error('Bill upload failed. Check your connection and try again.'); }
  finally { netEnd(); }
  if (!j.ok) throw new Error(j.message || 'Bill upload failed');
  return j.url;
}

/* ---- Toast ---- */
let toastTimer;
function toast(msg, ok) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast show ' + (ok === false ? 'bad' : 'ok');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = 'toast'; }, ok === false ? 4500 : 2600);
}

/* ---- Modal ---- */
function modal(title, bodyHtml, footHtml, cls) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${cls || ''}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-x" type="button" aria-label="Close">&times;</button></div>
    <div class="modal-body">${bodyHtml}</div>${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ''}</div>`;
  let closing = false;
  const close = () => {                          // smooth close: fade + sink, then remove
    if (closing) return; closing = true;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return ov.remove();
    ov.classList.add('closing');
    setTimeout(() => ov.remove(), 190);
  };
  $('.modal-x', ov).onclick = close;
  document.body.appendChild(ov);
  return { el: ov, close: close };
}
function confirmBox(title, message, opt) {
  opt = opt || {};
  return new Promise(resolve => {
    const m = modal(title, `<p>${esc(message)}</p>${opt.input ? `<label class="field"><span class="lbl">${esc(opt.input)} <span class="req">*</span></span><textarea class="input" id="cfInput"></textarea></label>` : ''}`,
      `<button class="btn btn-ghost" data-x="no" type="button">Cancel</button><button class="btn ${opt.danger ? 'btn-danger' : 'btn-primary'}" data-x="yes" type="button">${esc(opt.yes || 'Confirm')}</button>`, 'narrow');
    $('[data-x=no]', m.el).onclick = () => { m.close(); resolve(null); };
    $('.modal-x', m.el).onclick = () => { m.close(); resolve(null); };
    $('[data-x=yes]', m.el).onclick = () => {
      const v = opt.input ? $('#cfInput', m.el).value.trim() : true;
      if (opt.input && !v) return toast(opt.input + ' is required', false);
      m.close(); resolve(v);
    };
  });
}
const skeleton = n => '<div class="skeleton"></div>'.repeat(n || 6);
const emptyBox = (title, hint, icon) => `<div class="empty"><span class="empty-ic">${ic(icon || 'inbox')}</span><b>${esc(title)}</b>${hint ? `<span>${esc(hint)}</span>` : ''}</div>`;
const errorBox = msg => `<div class="empty"><span class="empty-ic">${ic('alert')}</span><b>Could not load this page</b><span>${esc(msg)}</span><button class="btn btn-ghost" type="button" data-retry>Try again</button></div>`;
function busy(btn, on) {
  if (!btn) return;
  $$('.ripple', btn).forEach(x => x.remove());      // don't save the click ripple with the label
  if (on) { btn.dataset.txt = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span>' + esc(btn.textContent); btn.disabled = true; }
  else { if (btn.dataset.txt) btn.innerHTML = btn.dataset.txt; btn.disabled = false; }
}
function exportCSV(name, headers, rows) {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = [headers.map(q).join(',')].concat(rows.map(r => r.map(q).join(','))).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name + '_' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
}
function badge(v) {
  const cls = { Approved: 'ok', Paid: 'ok', Completed: 'ok', Rejected: 'bad', Delayed: 'bad', Submitted: 'info', Pending: 'info', 'Partially Paid': 'info', 'In Progress': 'info', Active: 'info' }[v] || '';
  return v ? `<span class="badge ${cls}">${esc(v)}</span>` : '';
}

/* =====================================================================
   2. AUTH — login, session, logout
   ===================================================================== */
function showOnly(id) { ['splash', 'loginView', 'appView'].forEach(x => $('#' + x).classList.toggle('hidden', x !== id)); }

async function doLogin(e) {
  e.preventDefault();
  const btn = $('#loginBtn'), err = $('#loginErr');
  err.textContent = ''; busy(btn, true);
  try {
    const r = await api('login', { id: $('#loginId').value.trim(), pin: $('#loginPin').value.trim() });
    S.token = r.token;
    localStorage.setItem(CONFIG.TOKEN_KEY, r.token);
    $('#loginPin').value = '';
    await startApp();
  } catch (x) {
    err.textContent = x.message;
    const card = $('#loginForm'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  }
  finally { busy(btn, false); }
}
function logout(expired) {
  S.token = null; S.me = null;
  clearCache();
  localStorage.removeItem(CONFIG.TOKEN_KEY);
  $$('.overlay').forEach(o => o.remove());
  showOnly('loginView');
  $('#loginErr').textContent = expired ? 'Session expired. Please sign in again.' : '';
}
function applyBoot(r) {
  S.me = r.me; S.cfg = r.config; S.modules = r.modules; S.packageModes = r.packageModes; S.paymentTypes = r.paymentTypes; S.adjMode = r.adjMode;
  S.project = r.project; S.locations = r.locations; S.packages = r.packages; S.parties = r.parties; S.users = r.users; S.pending = r.pending;
  const initials = S.me.name.split(/\s+/).map(x => x[0] || '').slice(0, 2).join('').toUpperCase();
  $('#who').innerHTML = `<span class="avatar">${esc(initials)}</span><span><b>${esc(S.me.name)}</b><small>${esc(S.me.roleName)}</small></span>`;
  $('#projectName').textContent = S.project ? S.project.ProjectName : '';
  buildNav();
}
async function refreshBoot() { applyBoot(await api('bootstrap')); }
async function startApp() {
  showOnly('splash');
  try { await refreshBoot(); }
  catch (e) { if (S.token) { showOnly('loginView'); $('#loginErr').textContent = e.message; } return; }
  showOnly('appView');
  route();
  // Chart library is only needed on the dashboard: fetch it quietly once the app is on screen
  (window.requestIdleCallback || (f => setTimeout(f, 1200)))(() => loadChart());
}

/* ---- Chart.js loads on demand (it used to block the login screen) ---- */
let chartLoading = null;
function loadChart() {
  if (window.Chart) return Promise.resolve(true);
  if (chartLoading) return chartLoading;
  chartLoading = new Promise(res => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.6.1/dist/chart.umd.min.js'; s.async = true;
    s.onload = () => res(true);
    s.onerror = () => { chartLoading = null; s.remove(); res(false); };   // falls back to the built-in bars
    document.head.appendChild(s);
  });
  return chartLoading;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* =====================================================================
   3. ROUTER — role-aware navigation
   ===================================================================== */
const NAV = [
  { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard', show: () => can('dashboard', 'view') },
  { id: 'project', icon: 'building', label: 'Project', show: () => can('project', 'view') },
  { id: 'packages', icon: 'package', label: 'Work Packages', show: () => can('packages', 'view') },
  { id: 'budget', icon: 'scale', label: 'Budget & BOQ', show: () => can('budget', 'view') },
  { id: 'expenses', icon: 'receipt', label: 'Expenses', show: () => can('expenses', 'view') },
  { id: 'approvals', icon: 'circle-check-big', label: 'Approvals', show: () => can('expenses', 'approve') || can('budget', 'approve') || can('expenses', 'create') },
  { id: 'parties', icon: 'users', label: 'Parties', show: () => can('parties', 'view') },
  { id: 'payments', icon: 'wallet', label: 'Payments', show: () => can('payments', 'view') },
  { id: 'reports', icon: 'chart-column', label: 'Reports', show: () => can('reports', 'view') && !S.me.hideAmounts },
  { id: 'admin', icon: 'settings', label: 'Admin & Settings', show: () => can('admin', 'view') || can('audit', 'view') }
];
function buildNav() {
  const cur = location.hash.slice(1);
  $('#nav').innerHTML = NAV.filter(n => n.show()).map(n =>
    `<a class="nav-item ${n.id === cur ? 'active' : ''}" href="#${n.id}">${ic(n.icon)}<span class="nav-label">${esc(n.label)}</span>${n.id === 'approvals' && S.pending ? `<span class="nav-badge">${S.pending}</span>` : ''}</a>`).join('');
}
function route() {
  if (!S.me) return;
  const allowed = NAV.filter(n => n.show());
  let id = location.hash.slice(1);
  if (!allowed.some(n => n.id === id)) { id = allowed.length ? allowed[0].id : ''; if (id) { location.replace('#' + id); return; } }
  closeMenu(); buildNav();
  const nav = NAV.find(n => n.id === id);
  $('#pageTitle').textContent = nav ? nav.label : '';
  const page = $('#page');
  page.className = 'page'; void page.offsetWidth;   // restart the page-in animation
  if (!nav) { page.innerHTML = emptyBox('No modules are assigned to your role', 'Contact the administrator.', 'shield-check'); return; }
  page.innerHTML = '';
  VIEWS[id](page);
}
function closeMenu() { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); }

/* =====================================================================
   4. FORMS — schema-driven modal form with validation, draft, double-submit guard
   field: { name, label, type, required, options, optionsFn, dependsOn, showIf, hint, wide, min, compute }
   ===================================================================== */
function optHtml(options, val, placeholder) {
  const list = (options || []).map(o => (typeof o === 'object' ? o : { v: o, l: o }));
  if (val !== '' && val != null && !list.some(o => String(o.v) === String(val))) list.push({ v: val, l: val });
  return `<option value="">${esc(placeholder || 'Select')}</option>` + list.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.l)}</option>`).join('');
}
function formModal(o) {
  const isNew = !o.values || !o.editing;
  const dKey = o.draftKey && isNew ? 'draft_' + o.draftKey : null;
  let draft = null;
  if (dKey) { try { draft = JSON.parse(localStorage.getItem(dKey) || 'null'); } catch (e) {} }
  const vals = Object.assign({}, o.values || {}, draft ? draft.v : {});
  const requestKey = (draft && draft.rk) || uid();
  const buttons = o.buttons || [{ label: 'Save', primary: true }];

  const fieldHtml = f => {
    const v = vals[f.name] == null ? '' : vals[f.name];
    const lbl = `<span class="lbl">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</span>`;
    if (f.type === 'info') return `<div class="field wide" data-f="${f.name}"><div class="info-line" data-info="${f.name}"></div></div>`;
    if (f.type === 'checkbox') return `<label class="field check ${f.wide ? 'wide' : ''}" data-f="${f.name}"><input type="checkbox" name="${f.name}" ${v === true || v === 'TRUE' ? 'checked' : ''}>${lbl}</label>`;
    let inp;
    if (f.type === 'select') inp = `<select class="input" name="${f.name}">${optHtml(f.optionsFn ? f.optionsFn(vals) : f.options, v, f.placeholder)}</select>`;
    else if (f.type === 'textarea') inp = `<textarea class="input" name="${f.name}" maxlength="500">${esc(v)}</textarea>`;
    else if (f.type === 'file') inp = `<input class="input" type="file" name="${f.name}" accept="image/jpeg,image/png,application/pdf">${v ? `<small><a href="${esc(v)}" target="_blank" rel="noopener">View current file</a></small>` : ''}`;
    else inp = `<input class="input" type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" ${f.type === 'number' ? 'step="any" min="0" inputmode="decimal"' : ''} ${f.type === 'date' && f.maxToday ? `max="${today()}"` : ''} ${f.type === 'password' ? 'inputmode="numeric" autocomplete="new-password"' : ''} maxlength="${f.max || 200}">`;
    return `<label class="field ${f.wide || f.type === 'textarea' ? 'wide' : ''}" data-f="${f.name}">${lbl}${inp}${f.hint ? `<small class="muted">${esc(f.hint)}</small>` : ''}</label>`;
  };

  const m = modal(o.title,
    (draft ? '<div class="note">Unsaved draft restored.</div>' : '') + `<form class="form-grid" novalidate>${o.fields.map(fieldHtml).join('')}</form>`,
    `<button class="btn btn-ghost" type="button" data-x="cancel">Cancel</button>` + buttons.map((b, i) => `<button class="btn ${b.primary ? 'btn-primary' : 'btn-ghost'}" type="button" data-b="${i}">${esc(b.label)}</button>`).join(''),
    o.cls);
  const form = $('form', m.el);

  const collect = () => {
    const out = {};
    o.fields.forEach(f => {
      if (f.type === 'info') return;
      const el = form.elements[f.name];
      if (!el) return;
      if (f.type === 'checkbox') out[f.name] = el.checked;
      else if (f.type === 'file') out[f.name] = vals[f.name] || '';
      else if (f.type === 'number') out[f.name] = el.value === '' ? '' : Number(el.value);
      else out[f.name] = el.value.trim();
    });
    return out;
  };
  const setValue = (name, v) => { const el = form.elements[name]; if (el) el.value = v == null ? '' : v; };
  const sync = changed => {
    let v = collect();
    o.fields.forEach(f => {
      if (f.dependsOn && (!changed || changed === f.dependsOn)) {
        const el = form.elements[f.name], keep = changed ? '' : v[f.name];
        el.innerHTML = optHtml(f.optionsFn(v), keep, f.placeholder);
      }
    });
    if (changed && o.onChange) o.onChange(v, setValue, changed);
    v = collect();
    o.fields.forEach(f => {
      const wrap = $(`[data-f="${f.name}"]`, form);
      if (f.showIf) wrap.classList.toggle('hidden', !f.showIf(v));
      if (f.type === 'info') $('[data-info]', wrap).textContent = f.compute(v);
    });
    if (dKey && changed) { try { localStorage.setItem(dKey, JSON.stringify({ v: v, rk: requestKey })); } catch (e) {} }
  };
  form.addEventListener('input', e => sync(e.target.name));
  form.addEventListener('change', e => sync(e.target.name));
  form.addEventListener('submit', e => e.preventDefault());
  sync(null);

  const cancel = () => { if (dKey) localStorage.removeItem(dKey); m.close(); };   // explicit cancel discards the draft
  $('[data-x=cancel]', m.el).onclick = cancel;
  $('.modal-x', m.el).onclick = cancel;

  let submitting = false;
  const submit = async btnIdx => {
    if (submitting) return;                       // double-submit guard
    const v = collect();
    let bad = null;
    o.fields.forEach(f => {
      const wrap = $(`[data-f="${f.name}"]`, form), hidden = wrap.classList.contains('hidden');
      let msg = null;
      if (!hidden && f.type !== 'info' && f.type !== 'checkbox' && f.type !== 'file') {
        if (f.required && (v[f.name] === '' || v[f.name] == null)) msg = f.label + ' is required';
        else if (f.type === 'number' && v[f.name] !== '' && (!isFinite(v[f.name]) || v[f.name] < 0)) msg = f.label + ' must be a valid number';
        else if (f.type === 'number' && f.positive && !(v[f.name] > 0)) msg = f.label + ' must be greater than zero';
      }
      if (hidden && f.type !== 'info') v[f.name] = f.type === 'checkbox' ? false : '';
      wrap.classList.toggle('invalid', !!msg);
      if (msg && !bad) bad = msg;
    });
    if (!bad && o.validate) bad = o.validate(v);
    if (bad) return toast(bad, false);
    submitting = true;
    const all = $$('[data-b]', m.el), btn = all[btnIdx];
    all.forEach(b => { b.disabled = true; }); busy(btn, true);
    try {
      for (const f of o.fields) {
        if (f.type !== 'file') continue;
        const file = form.elements[f.name].files[0];
        if (file) { v[f.name] = await uploadFile(file); vals[f.name] = v[f.name]; form.elements[f.name].value = ''; }
      }
      await o.onSubmit(v, buttons[btnIdx], requestKey);
      if (dKey) localStorage.removeItem(dKey);
      m.close();
    } catch (e) {
      toast(e.message, false);                    // form stays open with all data intact
    } finally { submitting = false; busy(btn, false); all.forEach(b => { b.disabled = false; }); }
  };
  $$('[data-b]', m.el).forEach((b, i) => { b.onclick = () => submit(i); });
  return m;
}

/* =====================================================================
   5. TABLES — paginated list with search, filters, export
   col: { k, label, num, fmt(v,row) → text, html(v,row) → html }
   ===================================================================== */
function tableHtml(cols, rows, actions, foot) {
  return `<div class="tbl-wrap"><table class="tbl stack"><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('')}${actions ? '<th class="acts"></th>' : ''}</tr></thead>
    <tbody>${rows.map((row, i) => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''}${c.wrap ? ' wrap' : ''}" data-label="${esc(c.label)}"><span class="cell">${c.html ? c.html(row[c.k], row) : esc(c.fmt ? c.fmt(row[c.k], row) : row[c.k])}</span></td>`).join('')}${actions ? `<td class="acts">${actions(row).map((a, j) => `<button class="btn-link ${a.danger ? 'danger' : ''}" type="button" data-i="${i}" data-j="${j}">${esc(a.label)}</button>`).join('')}</td>` : ''}</tr>`).join('')}</tbody>${foot || ''}</table></div>`;
}
function listView(host, o) {
  const st = { page: 1, q: '', filters: Object.assign({}, o.fixed || {}), from: '', to: '', rows: [] };
  host.innerHTML = `<div class="toolbar">
      <div class="search-box">${ic('search')}<input class="input search" type="search" placeholder="Search"></div>
      ${(o.filters || []).map(f => `<select class="input sm" data-filter="${f.k}"><option value="">${esc(f.label)}: All</option>${f.options.map(x => `<option>${esc(x)}</option>`).join('')}</select>`).join('')}
      ${o.dates ? '<label class="date-f">From<input class="input sm" type="date" data-d="from"></label><label class="date-f">To<input class="input sm" type="date" data-d="to"></label>' : ''}
      <span class="spacer"></span>
      ${o.canExport ? `<button class="btn btn-ghost" type="button" data-x="csv">${ic('download')}Export CSV</button><button class="btn btn-ghost" type="button" data-x="print">${ic('printer')}Print</button>` : ''}
      ${o.onAdd ? `<button class="btn btn-primary" type="button" data-x="add">${ic('plus')}${esc(o.addLabel || 'Add')}</button>` : ''}
    </div><div class="lv-body"></div>`;
  const body = $('.lv-body', host);
  const query = extra => Object.assign({ entity: o.entity, page: st.page, q: st.q, filters: st.filters, from: st.from, to: st.to }, extra || {});
  let seq = 0;
  function show(r, quiet) {
    st.rows = r.rows;
    body.classList.toggle('quiet', !!quiet);
    if (!r.rows.length) { body.innerHTML = emptyBox('No records found', st.q || st.from || st.to || Object.keys(st.filters).some(k => st.filters[k]) ? 'Try a different search or filter.' : (o.onAdd ? 'Use the button above to add the first one.' : '')); return; }
    const pages = Math.ceil(r.total / r.pageSize) || 1;
    body.innerHTML = tableHtml(o.cols.filter(c => !c.csvOnly), r.rows, o.actions) + `<div class="pager"><button class="btn btn-ghost" type="button" data-p="-1" ${r.page <= 1 ? 'disabled' : ''}>${ic('chevron-left')}Previous</button><span class="muted">Page ${r.page} of ${pages} · ${r.total} records</span><button class="btn btn-ghost" type="button" data-p="1" ${r.page >= pages ? 'disabled' : ''}>Next${ic('chevron-right')}</button></div>`;
  }
  async function load() {
    const my = ++seq, q = query(), hit = cached('list', q);
    if (hit) show(hit); else body.innerHTML = skeleton();        // recent data → shown instantly
    try {
      const r = await api('list', q);
      if (my !== seq || !host.isConnected) return;               // a newer search / page already started
      if (hit && JSON.stringify(hit) === JSON.stringify(r)) return;
      show(r, !!hit);
    } catch (e) { if (my === seq && !hit) body.innerHTML = errorBox(e.message); }
  }
  body.addEventListener('click', e => {
    if (e.target.closest('[data-retry]')) return load();
    const a = e.target.closest('[data-i]');
    if (a) { const row = st.rows[+a.dataset.i]; return o.actions(row)[+a.dataset.j].fn(row); }
    const p = e.target.closest('[data-p]');
    if (p) { st.page += +p.dataset.p; load(); }
  });
  let timer;
  $('.search', host).addEventListener('input', e => { clearTimeout(timer); timer = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; load(); }, 350); });
  $$('[data-filter]', host).forEach(el => { el.onchange = () => { st.filters[el.dataset.filter] = el.value; st.page = 1; load(); }; });
  $$('[data-d]', host).forEach(el => { el.onchange = () => { st[el.dataset.d] = el.value; st.page = 1; load(); }; });
  const add = $('[data-x=add]', host); if (add) add.onclick = () => o.onAdd();
  const pr = $('[data-x=print]', host); if (pr) pr.onclick = () => window.print();
  const csv = $('[data-x=csv]', host);
  if (csv) csv.onclick = async () => {
    busy(csv, true);
    try {
      const r = await api('list', query({ all: 1 }));
      exportCSV(o.entity, o.cols.map(c => c.label), r.rows.map(row => o.cols.map(c => (c.num || !c.fmt) ? row[c.k] : c.fmt(row[c.k], row))));
    } catch (e) { toast(e.message, false); } finally { busy(csv, false); }
  };
  load();
  return { reload: load };
}
function tabs(host, items) {
  host.innerHTML = `<div class="tabs">${items.map((t, i) => `<button class="tab" type="button" data-t="${i}">${esc(t.label)}</button>`).join('')}</div><div class="tab-body fade-in"></div>`;
  const body = $('.tab-body', host);
  const open = i => { $$('.tab', host).forEach((b, j) => b.classList.toggle('active', i === j)); body.innerHTML = ''; items[i].render(body); };
  $$('.tab', host).forEach((b, i) => { b.onclick = () => open(i); });
  if (items.length) open(0);
}
async function removeRow(action, payload, message, reload) {
  if (!(await confirmBox('Delete', message, { yes: 'Delete', danger: true }))) return;
  try { await api(action, payload); toast('Deleted'); await reload(); } catch (e) { toast(e.message, false); }
}

/* =====================================================================
   6. VIEWS
   ===================================================================== */
const VIEWS = {};

/* ---------------- Dashboard ---------------- */
let dashChart = null;
const compact = v => { v = Number(v) || 0; return v >= 1e7 ? '₹' + (v / 1e7).toFixed(1) + ' Cr' : v >= 1e5 ? '₹' + (v / 1e5).toFixed(1) + ' L' : v >= 1e3 ? '₹' + Math.round(v / 1e3) + 'K' : '₹' + v; };
const monthLabel = k => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+k.slice(5) - 1] + ' ' + k.slice(2, 4);
function countUp(root) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('[data-count]', root).forEach(el => {
    const end = Number(el.dataset.count), isMoney = el.dataset.fmt === 'money', show = v => { el.textContent = isMoney ? money(v) : String(v); };
    if (!end) return;
    const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 750), e = 1 - Math.pow(1 - k, 3); if (k < 1) { show(Math.round(end * e)); requestAnimationFrame(step); } else show(end); };
    requestAnimationFrame(step);
  });
}
VIEWS.dashboard = async page => {
  // Show the last dashboard instantly (if recent), then refresh it quietly
  const hit = cached('dashboard');
  if (hit) renderDash(page, hit); else page.innerHTML = skeleton(5);
  const chartReady = loadChart();
  let d;
  try { d = await api('dashboard'); } catch (e) {
    if (hit) return;                                      // keep showing the last figures
    page.innerHTML = errorBox(e.message); $('[data-retry]', page).onclick = () => VIEWS.dashboard(page); return;
  }
  if (location.hash.slice(1) !== 'dashboard' || !page.isConnected) return;   // user moved to another page
  if (hit && JSON.stringify(hit) === JSON.stringify(d)) return;             // nothing changed
  if (!window.Chart) await Promise.race([chartReady, wait(1500)]);
  renderDash(page, d, !!hit);
};
function renderDash(page, d, quiet) {
  S.pending = d.pending; buildNav();
  if (dashChart) { dashChart.destroy(); dashChart = null; }
  const kpi = (icon, label, value, sub, link, fmt) => `<div class="kpi ${link ? 'link' : ''}" ${link ? `data-go="${link}"` : ''}><span class="kpi-ic">${ic(icon)}</span><div class="k-label">${esc(label)}</div><div class="k-value" data-count="${Number(value) || 0}" data-fmt="${fmt || 'int'}">${esc(fmt === 'money' ? money(value) : value)}</div>${sub ? `<div class="k-sub">${esc(sub)}</div>` : ''}</div>`;
  const pkTotal = Object.keys(d.packageStatus).reduce((a, k) => a + d.packageStatus[k], 0);
  const pkSub = Object.keys(d.packageStatus).map(k => d.packageStatus[k] + ' ' + k.toLowerCase()).join(', ') || 'None created yet';
  const kApprovals = kpi('circle-check-big', 'Pending approvals', d.pending, 'Waiting for your action', 'approvals');
  const kPackages = kpi('package', 'Work packages', pkTotal, pkSub, can('packages', 'view') ? 'packages' : '');
  if (d.limited) {
    page.innerHTML = `<div class="kpis">${kApprovals}${kPackages}</div>`;
  } else {
    const ringP = Math.max(0, Math.min(100, d.pct)), maxM = Math.max(1, ...d.months.map(m => m.amount));
    page.innerHTML = `
      ${d.alert ? `<div class="banner ${d.pct >= 100 ? 'bad' : ''}">${ic('alert')}${d.pct}% of the budget is used. It has crossed the ${d.alert}% alert level.</div>` : ''}
      <div class="dash-top">
        <div class="card hero">
          <div class="ring ${d.pct >= 100 ? 'over' : ''}"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="52"/><circle class="val" cx="60" cy="60" r="52" style="stroke-dashoffset:${(327 * (1 - ringP / 100)).toFixed(1)}"/></svg>
            <div class="ring-txt"><b>${Math.round(d.pct)}%</b><span>budget used</span></div></div>
          <div class="hero-stats"><h3>Budget position</h3>
            <div class="stat-line"><span>Total budget</span><b data-count="${d.budget}" data-fmt="money">${money(d.budget)}</b></div>
            <div class="stat-line"><span>Actual cost (approved)</span><b data-count="${d.actual}" data-fmt="money">${money(d.actual)}</b></div>
            <div class="stat-line"><span>Balance</span><b style="${d.balance < 0 ? 'color:var(--bad)' : ''}">${money(d.balance)}</b></div>
            <div class="stat-line"><span>Awaiting approval</span><b>${money(d.awaitingApproval)}</b></div>
          </div>
        </div>
        <div class="kpis">
          ${kpi('hand-coins', 'Payables outstanding', d.payable, 'Approved bills not yet paid', can('parties', 'view') ? 'parties' : '', 'money')}
          ${kpi('banknote', 'Advances with parties', d.advances, 'Not yet adjusted against bills', can('parties', 'view') ? 'parties' : '', 'money')}
          ${kApprovals}${kPackages}
        </div>
      </div>
      <div class="grid2">
        <div class="card"><h3>Budget and actual cost by category</h3>${d.categories.length ? d.categories.map(c => {
          const p = c.budget > 0 ? c.actual / c.budget * 100 : (c.actual > 0 ? 100 : 0);
          return `<div class="bar-row"><div class="bar-top"><span>${esc(c.category)}</span><span class="muted">${money(c.actual)} of ${money(c.budget)}</span></div><div class="bar ${c.actual > c.budget ? 'over' : ''}"><i style="width:${Math.min(100, p).toFixed(1)}%"></i></div></div>`;
        }).join('') : '<p class="muted">Add BOQ items to see the budget here.</p>'}</div>
        <div class="card"><h3>Approved cost, last 6 months</h3>${window.Chart ? '<div class="chart-box"><canvas id="monthChart"></canvas></div>' :
          `<div class="cols">${d.months.map(m => `<div class="col"><span>${m.amount ? compact(m.amount) : ''}</span><i style="height:${(m.amount / maxM * 100).toFixed(1)}%"></i><span>${esc(monthLabel(m.month))}</span></div>`).join('')}</div>`}</div>
      </div>
      <div class="grid2">
        <div class="card"><h3>Cash and bank balances</h3>${d.accounts.map(a => `<div class="list-row"><span>${esc(a.account)}</span><span class="num"><b>${money(a.balance)}</b></span></div>`).join('') || '<p class="muted">No accounts are set up yet.</p>'}</div>
        <div class="card"><h3>Recent expenses</h3>${d.recent.length ? d.recent.map(r => `<div class="list-row"><span>${esc(r.category)}<small>${esc(fmtDate(r.date))}${r.party ? ', ' + esc(r.party) : ''}</small></span><span class="num"><b>${money(r.total)}</b>${badge(r.status)}</span></div>`).join('') : '<p class="muted">No expenses have been entered yet.</p>'}</div>
      </div>`;
    const cv = $('#monthChart', page);
    if (cv && window.Chart) {
      Chart.defaults.font.family = "'Inter', system-ui, sans-serif"; Chart.defaults.color = '#6e6c85';
      dashChart = new Chart(cv, {
        type: 'bar',
        data: { labels: d.months.map(m => monthLabel(m.month)), datasets: [{ data: d.months.map(m => m.amount), backgroundColor: '#5b4cf0', hoverBackgroundColor: '#4636d8', borderRadius: 8, maxBarThickness: 40 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: { duration: 700 },
          plugins: { legend: { display: false }, tooltip: { displayColors: false, padding: 10, callbacks: { label: c => money(c.parsed.y) } } },
          scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, border: { display: false }, grid: { color: '#eceef5' }, ticks: { maxTicksLimit: 5, callback: v => compact(v) } } } }
      });
    }
  }
  if (quiet) page.classList.add('quiet'); else { page.classList.remove('quiet'); countUp(page); }
  $$('[data-go]', page).forEach(el => { if (el.dataset.go) el.onclick = () => { location.hash = el.dataset.go; }; });
}

/* ---------------- Project & locations ---------------- */
VIEWS.project = page => {
  const p = S.project || {}, edit = can('project', 'edit');
  const item = (l, v) => `<div><span>${esc(l)}</span><b>${esc(v === '' || v == null ? '—' : v)}</b></div>`;
  page.innerHTML = `
    <div class="card"><div class="card-head"><h3>Project Details</h3>${edit ? '<button class="btn btn-ghost" type="button" id="editProject">Edit</button>' : ''}</div>
      <div class="dl">${item('Project Name', p.ProjectName)}${item('Location', p.Location)}${item('Type', p.ProjectType)}${item('Status', p.Status)}
      ${item('Plot Area', p.PlotArea)}${item('Built-up Area', p.BuiltUpArea)}${item('Floors', p.Floors)}
      ${item('Planned Start', fmtDate(p.PlannedStart))}${item('Actual Start', fmtDate(p.ActualStart))}${item('Target Completion', fmtDate(p.TargetCompletion))}${item('Actual Completion', fmtDate(p.ActualCompletion))}
      ${S.me.hideAmounts ? '' : item('Initial Budget', money(p.InitialBudget)) + item('Contingency', money(p.Contingency))}</div></div>
    <div class="card"><div class="card-head"><h3>Locations (Blocks / Floors / Zones)</h3>${edit ? `<button class="btn btn-primary" type="button" id="addLoc">${ic('plus')}Add Location</button>` : ''}</div><div id="locs"></div></div>`;
  const locForm = row => formModal({
    title: row ? 'Edit Location' : 'Add Location', values: row, editing: !!row,
    fields: [{ name: 'DisplayName', label: 'Display Name', required: true, wide: true, hint: 'Example: Block A – 2nd Floor' }, { name: 'Block', label: 'Block' }, { name: 'Floor', label: 'Floor' }, { name: 'Zone', label: 'Zone' }],
    onSubmit: async v => { await api('saveMaster', { entity: 'location', record: Object.assign({ LocationID: row ? row.LocationID : '' }, v) }); toast('Saved'); await refreshBoot(); VIEWS.project(page); }
  });
  const acts = edit ? row => [{ label: 'Edit', fn: locForm }, { label: 'Delete', danger: true, fn: r => removeRow('deleteMaster', { entity: 'location', id: r.LocationID }, 'Delete location "' + r.DisplayName + '"?', async () => { await refreshBoot(); VIEWS.project(page); }) }] : null;
  const locs = $('#locs', page);
  locs.innerHTML = S.locations.length ? tableHtml([{ k: 'DisplayName', label: 'Name' }, { k: 'Block', label: 'Block' }, { k: 'Floor', label: 'Floor' }, { k: 'Zone', label: 'Zone' }], S.locations, acts) : '<p class="muted">No locations added yet.</p>';
  locs.onclick = e => { const a = e.target.closest('[data-i]'); if (a) acts(S.locations[+a.dataset.i])[+a.dataset.j].fn(S.locations[+a.dataset.i]); };
  if (edit) {
    $('#addLoc', page).onclick = () => locForm(null);
    $('#editProject', page).onclick = () => formModal({
      title: 'Edit Project', values: p, editing: true,
      fields: [
        { name: 'ProjectName', label: 'Project Name', required: true, wide: true }, { name: 'Location', label: 'Site Address', wide: true },
        { name: 'ProjectType', label: 'Project Type', type: 'select', options: cfgVals('ProjectType') }, { name: 'Status', label: 'Status', type: 'select', options: cfgVals('ProjectStatus') },
        { name: 'PlotArea', label: 'Plot Area (sq.ft)', type: 'number' }, { name: 'BuiltUpArea', label: 'Built-up Area (sq.ft)', type: 'number' }, { name: 'Floors', label: 'Floors', type: 'number' },
        { name: 'PlannedStart', label: 'Planned Start', type: 'date' }, { name: 'ActualStart', label: 'Actual Start', type: 'date' }, { name: 'TargetCompletion', label: 'Target Completion', type: 'date' }, { name: 'ActualCompletion', label: 'Actual Completion', type: 'date' },
        { name: 'InitialBudget', label: 'Initial Approved Budget', type: 'number', hint: 'For reference. Working budget comes from BOQ items.' }, { name: 'Contingency', label: 'Contingency Amount', type: 'number' }
      ],
      onSubmit: async v => { await api('saveProject', { record: v }); toast('Project updated'); await refreshBoot(); VIEWS.project(page); }
    });
  }
};

/* ---------------- Work packages ---------------- */
VIEWS.packages = page => {
  const form = row => formModal({
    title: row ? 'Edit Work Package' : 'Add Work Package', values: row || { Status: cfgVals('PackageStatus')[0] || '' }, editing: !!row, draftKey: 'package',
    fields: [
      { name: 'Name', label: 'Package Name', required: true, wide: true, hint: 'Example: RCC Structure, Electrical, Flooring' },
      { name: 'Category', label: 'Budget Category', type: 'select', options: cfgVals('BudgetCategory'), required: true },
      { name: 'Mode', label: 'Execution Mode', type: 'select', options: S.packageModes, required: true },
      { name: 'LocationID', label: 'Location', type: 'select', options: S.locations.map(l => ({ v: l.LocationID, l: l.DisplayName })), placeholder: 'Whole site' },
      { name: 'Status', label: 'Status', type: 'select', options: cfgVals('PackageStatus') },
      { name: 'BudgetAmount', label: 'Package Budget', type: 'number' },
      { name: 'PlannedStart', label: 'Planned Start', type: 'date' }, { name: 'PlannedEnd', label: 'Planned End', type: 'date' },
      { name: 'Remarks', label: 'Remarks', type: 'textarea' }
    ],
    validate: v => (v.PlannedStart && v.PlannedEnd && v.PlannedEnd < v.PlannedStart) ? 'Planned End cannot be before Planned Start' : null,
    onSubmit: async v => { await api('saveMaster', { entity: 'package', record: Object.assign({ PackageID: row ? row.PackageID : '' }, v) }); toast('Saved'); await refreshBoot(); lv.reload(); }
  });
  const lv = listView(page, {
    entity: 'packages', canExport: can('packages', 'export'), addLabel: 'Add Work Package', onAdd: can('packages', 'create') ? () => form(null) : null,
    filters: [{ k: 'Mode', label: 'Mode', options: S.packageModes }, { k: 'Status', label: 'Status', options: cfgVals('PackageStatus') }],
    cols: [{ k: 'Name', label: 'Package' }, { k: 'Category', label: 'Category' }, { k: 'Mode', label: 'Mode' }, { k: 'LocationID', label: 'Location', fmt: v => locName(v) || 'Whole site' },
      { k: 'BudgetAmount', label: 'Budget', num: true, html: v => money(v) }, { k: 'PlannedStart', label: 'Start', fmt: fmtDate }, { k: 'PlannedEnd', label: 'End', fmt: fmtDate }, { k: 'Status', label: 'Status', html: badge }],
    actions: row => [].concat(can('packages', 'edit') ? [{ label: 'Edit', fn: form }] : [], can('packages', 'delete') ? [{ label: 'Delete', danger: true, fn: r => removeRow('deleteMaster', { entity: 'package', id: r.PackageID }, 'Delete work package "' + r.Name + '"?', async () => { await refreshBoot(); lv.reload(); }) }] : [])
  });
};

/* ---------------- Budget & BOQ ---------------- */
function simpleTable(host, rows, cols, foot) { host.innerHTML = rows.length ? tableHtml(cols, rows, null, foot) : emptyBox('No records found'); }
VIEWS.budget = page => {
  const mcol = (k, label) => ({ k: k, label: label, num: true, html: v => money(v) });
  tabs(page, [
    { label: 'Summary', render: async host => {
      host.innerHTML = skeleton(4);
      try {
        const r = await api('report', { type: 'budget' });
        const sum = k => r.rows.reduce((a, x) => a + Number(x[k] || 0), 0);
        const cols = [{ k: 'Category', label: 'Category' }, mcol('BOQ', 'BOQ Amount'), mcol('Revisions', 'Revisions'), mcol('Budget', 'Budget'), mcol('Actual', 'Actual'), mcol('Balance', 'Balance'), { k: 'UsedPct', label: 'Used', num: true, fmt: v => v + '%' }];
        simpleTable(host, r.rows, cols, `<tfoot><tr><td>Total (contingency ${money(r.contingency)} extra)</td><td class="num">${money(sum('BOQ'))}</td><td class="num">${money(sum('Revisions'))}</td><td class="num">${money(sum('Budget'))}</td><td class="num">${money(sum('Actual'))}</td><td class="num">${money(sum('Balance'))}</td><td></td></tr></tfoot>`);
      } catch (e) { host.innerHTML = errorBox(e.message); }
    } },
    { label: 'BOQ Items', render: host => {
      const form = row => formModal({
        title: row ? 'Edit BOQ Item' : 'Add BOQ Item', values: row, editing: !!row, draftKey: 'boq',
        fields: [
          { name: 'ItemCode', label: 'Item Code' }, { name: 'Category', label: 'Budget Category', type: 'select', options: cfgVals('BudgetCategory'), required: true },
          { name: 'Description', label: 'Description', type: 'textarea', required: true }, { name: 'Specification', label: 'Specification', wide: true },
          { name: 'Unit', label: 'Unit', type: 'select', options: cfgVals('Unit'), required: true }, { name: 'LocationID', label: 'Location', type: 'select', options: S.locations.map(l => ({ v: l.LocationID, l: l.DisplayName })), placeholder: 'Whole site' },
          { name: 'EstQty', label: 'Estimated Quantity', type: 'number', required: true }, { name: 'Rate', label: 'Rate', type: 'number', required: true },
          { name: 'calc', type: 'info', compute: v => 'Amount: ' + money((Number(v.EstQty) || 0) * (Number(v.Rate) || 0)) }
        ],
        onSubmit: async v => { await api('saveMaster', { entity: 'boq', record: Object.assign({ BOQID: row ? row.BOQID : '' }, v) }); toast('Saved'); lv.reload(); }
      });
      const lv = listView(host, {
        entity: 'boq', canExport: can('budget', 'export'), addLabel: 'Add BOQ Item', onAdd: can('budget', 'create') ? () => form(null) : null,
        filters: [{ k: 'Category', label: 'Category', options: cfgVals('BudgetCategory') }],
        cols: [{ k: 'ItemCode', label: 'Code' }, { k: 'Category', label: 'Category' }, { k: 'Description', label: 'Description', wrap: true }, { k: 'Unit', label: 'Unit' }, { k: 'EstQty', label: 'Qty', num: true }, mcol('Rate', 'Rate'), mcol('Amount', 'Amount')],
        actions: row => [].concat(can('budget', 'edit') ? [{ label: 'Edit', fn: form }] : [], can('budget', 'delete') ? [{ label: 'Delete', danger: true, fn: r => removeRow('deleteMaster', { entity: 'boq', id: r.BOQID }, 'Delete this BOQ item?', lv.reload) }] : [])
      });
    } },
    { label: 'Revisions', render: host => {
      const lv = listView(host, {
        entity: 'revisions', canExport: can('budget', 'export'), addLabel: 'Request Revision',
        onAdd: can('budget', 'edit') ? () => formModal({
          title: 'Request Budget Revision',
          fields: [{ name: 'Category', label: 'Budget Category', type: 'select', options: cfgVals('BudgetCategory'), required: true }, { name: 'NewAmount', label: 'New Budget for this Category', type: 'number', required: true },
            { name: 'Reason', label: 'Reason', type: 'textarea', required: true }],
          buttons: [{ label: 'Send for Approval', primary: true }],
          onSubmit: async v => { await api('requestRevision', v); toast('Revision sent for approval'); await refreshBoot(); lv.reload(); }
        }) : null,
        filters: [{ k: 'Status', label: 'Status', options: ['Pending', 'Approved', 'Rejected'] }],
        cols: [{ k: 'RevisionNo', label: 'No.' }, { k: 'Category', label: 'Category' }, mcol('OldAmount', 'Old Budget'), mcol('NewAmount', 'New Budget'), { k: 'Reason', label: 'Reason', wrap: true },
          { k: 'RequestedBy', label: 'Requested By', fmt: userName }, { k: 'ApprovedBy', label: 'Action By', fmt: userName }, { k: 'Status', label: 'Status', html: badge }]
      });
    } }
  ]);
};

/* ---------------- Expenses ---------------- */
function expenseForm(row, done) {
  const subs = cat => (S.cfg.SubCategory || []).filter(s => !s.parent || s.parent === cat).map(s => s.value);
  formModal({
    title: row ? 'Edit Expense ' + row.ExpenseID : 'New Expense', values: row || { ExpenseDate: today() }, editing: !!row, draftKey: 'expense',
    fields: [
      { name: 'ExpenseDate', label: 'Expense Date', type: 'date', required: true, maxToday: true },
      { name: 'Category', label: 'Category', type: 'select', options: cfgVals('BudgetCategory'), required: true },
      { name: 'SubCategory', label: 'Sub-category', type: 'select', dependsOn: 'Category', optionsFn: v => subs(v.Category) },
      { name: 'PackageID', label: 'Work Package', type: 'select', options: S.packages.map(p => ({ v: p.id, l: p.name })), placeholder: 'Not linked' },
      { name: 'LocationID', label: 'Location', type: 'select', options: S.locations.map(l => ({ v: l.LocationID, l: l.DisplayName })), placeholder: 'Whole site' },
      { name: 'PartyID', label: 'Party', type: 'select', options: S.parties.map(p => ({ v: p.id, l: p.name + ' (' + p.type + ')' })), placeholder: 'No party' },
      { name: 'PaidTo', label: 'Paid To (if no party)', showIf: v => !v.PartyID },
      { name: 'Description', label: 'Description', type: 'textarea', required: true },
      { name: 'BaseAmount', label: 'Amount (before tax)', type: 'number', required: true, positive: true },
      { name: 'TaxAmount', label: 'Tax Amount', type: 'number' },
      { name: 'calc', type: 'info', compute: v => 'Total: ' + money((Number(v.BaseAmount) || 0) + (Number(v.TaxAmount) || 0)) },
      { name: 'InvoiceNo', label: 'Invoice / Bill No.', max: 60 }, { name: 'InvoiceDate', label: 'Invoice Date', type: 'date' },
      { name: 'BillLink', label: 'Bill / Receipt (photo or PDF)', type: 'file', wide: true }
    ],
    buttons: [{ label: 'Save Draft', submit: false }, { label: 'Submit for Approval', primary: true, submit: true }],
    validate: v => v.ExpenseDate > today() ? 'Expense date cannot be in the future' : null,
    onSubmit: async (v, btn, rk) => {
      await api('saveExpense', { record: Object.assign({ ExpenseID: row ? row.ExpenseID : '' }, v), submit: btn.submit, requestKey: rk });
      toast(btn.submit ? 'Expense submitted for approval' : 'Draft saved');
      done();
    }
  });
}
VIEWS.expenses = page => {
  const editable = r => (r.ApprovalStatus === 'Draft' || r.ApprovalStatus === 'Rejected') && can('expenses', 'edit');
  const lv = listView(page, {
    entity: 'expenses', dates: true, canExport: can('expenses', 'export'), addLabel: 'New Expense', onAdd: can('expenses', 'create') ? () => expenseForm(null, () => lv.reload()) : null,
    filters: [{ k: 'ApprovalStatus', label: 'Approval', options: ['Draft', 'Submitted', 'Approved', 'Rejected'] }, { k: 'PaymentStatus', label: 'Payment', options: ['Unpaid', 'Partially Paid', 'Paid'] }, { k: 'Category', label: 'Category', options: cfgVals('BudgetCategory') }],
    cols: [
      { k: 'ExpenseID', label: 'Expense', html: (v, r) => `<b>${esc(v)}</b><small class="sub">${esc(fmtDate(r.ExpenseDate))}</small>` },
      { k: 'ExpenseDate', label: 'Date', csvOnly: true },
      { k: 'Category', label: 'Category', html: (v, r) => esc(v) + (r.SubCategory ? `<small class="sub">${esc(r.SubCategory)}</small>` : '') },
      { k: 'SubCategory', label: 'Sub-category', csvOnly: true },
      { k: 'Description', label: 'Description', wrap: true, html: (v, r) => esc(v) + `<small class="sub">Entered by ${esc(userName(r.EnteredBy))}</small>` },
      { k: 'PartyName', label: 'Party', html: (v, r) => esc(v || '—') + (r.InvoiceNo ? `<small class="sub">Invoice ${esc(r.InvoiceNo)}</small>` : '') },
      { k: 'InvoiceNo', label: 'Invoice No.', csvOnly: true },
      { k: 'TotalAmount', label: 'Total', num: true, html: v => money(v) }, { k: 'PaidAmount', label: 'Paid', num: true, html: v => money(v) },
      { k: 'ApprovalStatus', label: 'Status', html: (v, r) => `<span class="badges">${badge(v)}${v === 'Approved' ? badge(r.PaymentStatus) : ''}</span>` + (v === 'Rejected' && r.RejectReason ? `<small class="sub">${esc(r.RejectReason)}</small>` : '') },
      { k: 'PaymentStatus', label: 'Payment', csvOnly: true }, { k: 'RejectReason', label: 'Reject Reason', csvOnly: true },
      { k: 'EnteredBy', label: 'Entered by', fmt: userName, csvOnly: true }],
    actions: r => {
      const a = [];
      if (r.BillLink) a.push({ label: 'Bill', fn: x => window.open(x.BillLink, '_blank', 'noopener') });
      if (editable(r)) a.push({ label: 'Edit', fn: x => expenseForm(x, () => lv.reload()) });
      if (r.ApprovalStatus === 'Approved' && r.PaymentStatus !== 'Paid' && can('payments', 'create')) a.push({ label: 'Pay', fn: x => paymentForm({ Type: 'Payment', RefID: x.ExpenseID }, () => lv.reload()) });
      if (r.ApprovalStatus === 'Approved' && S.me.isSystem && !(Number(r.PaidAmount) > 0)) a.push({ label: 'Reopen', fn: async x => {
        const reason = await confirmBox('Reopen Expense', 'This sends ' + x.ExpenseID + ' back for correction and removes it from actual cost.', { input: 'Reason', yes: 'Reopen' });
        if (!reason) return;
        try { await api('reopenExpense', { id: x.ExpenseID, reason: reason }); toast('Expense reopened'); lv.reload(); } catch (e) { toast(e.message, false); }
      } });
      if (r.ApprovalStatus !== 'Approved' && can('expenses', 'delete')) a.push({ label: 'Delete', danger: true, fn: x => removeRow('deleteExpense', { id: x.ExpenseID }, 'Delete expense ' + x.ExpenseID + '?', lv.reload) });
      return a;
    }
  });
};

/* ---------------- Approvals ---------------- */
VIEWS.approvals = async page => {
  page.innerHTML = skeleton(4);
  let r;
  try { r = await api('listApprovals'); } catch (e) { page.innerHTML = errorBox(e.message); $('[data-retry]', page).onclick = () => VIEWS.approvals(page); return; }
  S.pending = r.rows.filter(x => x.canAct).length; buildNav();
  if (!r.rows.length) { page.innerHTML = emptyBox('Nothing is waiting for approval', 'New requests will appear here.', 'circle-check-big'); return; }
  page.innerHTML = r.rows.map((a, i) => `<div class="card ap-card fade-in">
      <div class="ap-main"><b>${esc(a.title)}</b> <span class="badge info">${esc(a.type === 'Expense' ? a.entityId : 'Budget')}</span>
        <div>${esc(a.detail)}</div>
        <div class="muted">${esc(fmtDate(a.date))}${a.party ? ' · ' + esc(a.party) : ''}${a.invoiceNo ? ' · Invoice ' + esc(a.invoiceNo) : ''} · Requested by ${esc(a.requestedBy)}</div>
        ${a.type !== 'Expense' ? `<div class="muted">Budget: ${money(a.oldAmount)} → ${money(a.newAmount)}</div>` : ''}
        ${a.billLink ? `<a href="${esc(a.billLink)}" target="_blank" rel="noopener">View bill</a>` : (a.type === 'Expense' ? '<span class="badge bad">No bill attached</span>' : '')}</div>
      <div class="num"><div class="ap-amt">${money(a.amount)}</div>
        ${a.canAct ? `<div class="ap-acts"><button class="btn btn-danger" type="button" data-rej="${i}">Reject</button><button class="btn btn-primary" type="button" data-app="${i}">Approve</button></div>` : `<span class="muted">${a.mine ? 'Waiting for approver' : 'Above your approval limit'}</span>`}</div>
    </div>`).join('');
  const act = async (a, decision, btn) => {
    let remarks = '';
    if (decision === 'reject') { remarks = await confirmBox('Reject', 'Reject this request?', { input: 'Reason', yes: 'Reject', danger: true }); if (!remarks) return; }
    busy(btn, true);
    try { await api('actApproval', { id: a.id, decision: decision, remarks: remarks }); toast(decision === 'approve' ? 'Approved' : 'Rejected'); VIEWS.approvals(page); }
    catch (e) { toast(e.message, false); busy(btn, false); }
  };
  $$('[data-app]', page).forEach(b => { b.onclick = () => act(r.rows[+b.dataset.app], 'approve', b); });
  $$('[data-rej]', page).forEach(b => { b.onclick = () => act(r.rows[+b.dataset.rej], 'reject', b); });
};

/* ---------------- Parties ---------------- */
VIEWS.parties = page => {
  const form = row => formModal({
    title: row ? 'Edit Party' : 'Add Party', values: row, editing: !!row, draftKey: 'party',
    fields: [
      { name: 'PartyType', label: 'Party Type', type: 'select', options: cfgVals('PartyType'), required: true }, { name: 'Name', label: 'Name', required: true },
      { name: 'ContactPerson', label: 'Contact Person' }, { name: 'Phone', label: 'Phone', max: 20 },
      { name: 'Trade', label: 'Trade', type: 'select', options: cfgVals('Trade'), showIf: v => v.PartyType !== 'Supplier' }, { name: 'GSTIN', label: 'GSTIN', max: 20 },
      { name: 'Address', label: 'Address', type: 'textarea' },
      { name: 'PaymentTermsDays', label: 'Payment Terms (days)', type: 'number' }, { name: 'OpeningBalance', label: 'Opening Payable Balance', type: 'number' }
    ],
    onSubmit: async v => { await api('saveMaster', { entity: 'party', record: Object.assign({ PartyID: row ? row.PartyID : '' }, v) }); toast('Saved'); await refreshBoot(); lv.reload(); }
  });
  const ledger = async row => {
    const m = modal('Ledger — ' + row.Name, skeleton(4), '<button class="btn btn-ghost" type="button" data-x="csv">Export CSV</button>', 'wide');
    try {
      const r = await api('partyLedger', { id: row.PartyID });
      const cols = [{ k: 'date', label: 'Date', fmt: fmtDate }, { k: 'ref', label: 'Ref' }, { k: 'particulars', label: 'Particulars', wrap: true }, { k: 'credit', label: 'Bill', num: true, html: v => v ? money(v) : '' }, { k: 'debit', label: 'Paid', num: true, html: (v, x) => v ? money(v) : (x.note ? '<small class="muted">' + money(x.note) + ' adj.</small>' : '') }, { k: 'balance', label: 'Balance', num: true, html: v => money(v) }];
      $('.modal-body', m.el).innerHTML = `<div class="kpis"><div class="kpi"><div class="k-label">Opening</div><div class="k-value">${money(r.opening)}</div></div><div class="kpi"><div class="k-label">Outstanding</div><div class="k-value">${money(r.outstanding)}</div></div><div class="kpi"><div class="k-label">Advance Balance</div><div class="k-value">${money(r.advanceBal)}</div></div><div class="kpi"><div class="k-label">Net Payable</div><div class="k-value">${money(r.net)}</div></div></div>` +
        (r.rows.length ? tableHtml(cols, r.rows) : '<p class="muted">No transactions yet.</p>');
      $('[data-x=csv]', m.el).onclick = () => exportCSV('ledger_' + row.Name.replace(/\W+/g, '_'), ['Date', 'Ref', 'Particulars', 'Bill', 'Paid', 'Balance'], r.rows.map(x => [x.date, x.ref, x.particulars, x.credit, x.debit, x.balance]));
    } catch (e) { $('.modal-body', m.el).innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  };
  const lv = listView(page, {
    entity: 'parties', canExport: can('parties', 'export'), addLabel: 'Add Party', onAdd: can('parties', 'create') ? () => form(null) : null,
    filters: [{ k: 'PartyType', label: 'Type', options: cfgVals('PartyType') }],
    cols: [{ k: 'Name', label: 'Name' }, { k: 'PartyType', label: 'Type' }, { k: 'Trade', label: 'Trade' }, { k: 'ContactPerson', label: 'Contact' }, { k: 'Phone', label: 'Phone' },
      { k: 'Outstanding', label: 'Outstanding', num: true, html: v => money(v) }, { k: 'AdvanceBalance', label: 'Advance', num: true, html: v => money(v) }],
    actions: r => [].concat(S.me.hideAmounts ? [] : [{ label: 'Ledger', fn: ledger }], can('parties', 'edit') ? [{ label: 'Edit', fn: form }] : [],
      can('parties', 'delete') ? [{ label: 'Delete', danger: true, fn: x => removeRow('deleteMaster', { entity: 'party', id: x.PartyID }, 'Delete party "' + x.Name + '"?', async () => { await refreshBoot(); lv.reload(); }) }] : [])
  });
};

/* ---------------- Payments ---------------- */
async function paymentForm(preset, done) {
  let pay;
  try { pay = (await api('payables')).rows; } catch (e) { return toast(e.message, false); }
  const exp = id => pay.find(p => p.id === id);
  const accounts = cfgVals('Account');
  formModal({
    title: 'New Payment Entry', values: Object.assign({ PaymentDate: today(), Type: 'Payment', Amount: preset && preset.RefID && exp(preset.RefID) ? exp(preset.RefID).balance : '' }, preset || {}), draftKey: preset ? null : 'payment',
    fields: [
      { name: 'Type', label: 'Entry Type', type: 'select', options: [{ v: 'Payment', l: 'Payment against expense' }, { v: 'Advance', l: 'Advance to party' }, { v: 'Receipt', l: 'Receipt (funds received)' }, { v: 'Transfer', l: 'Transfer between accounts' }], required: true },
      { name: 'PaymentDate', label: 'Date', type: 'date', required: true, maxToday: true },
      { name: 'RefID', label: 'Expense to Pay', type: 'select', wide: true, required: true, showIf: v => v.Type === 'Payment', options: pay.map(p => ({ v: p.id, l: p.id + ' · ' + (p.party || 'No party') + ' · Balance ' + money(p.balance) })) },
      { name: 'info', type: 'info', showIf: v => v.Type === 'Payment' && !!exp(v.RefID), compute: v => { const e = exp(v.RefID); return e ? e.description + ' — Balance payable ' + money(e.balance) + (e.advanceBal > 0 ? ' · Advance available ' + money(e.advanceBal) : '') : ''; } },
      { name: 'PartyID', label: 'Party', type: 'select', required: true, showIf: v => v.Type === 'Advance', options: S.parties.map(p => ({ v: p.id, l: p.name + ' (' + p.type + ')' })) },
      { name: 'Party', label: 'Received From', required: true, showIf: v => v.Type === 'Receipt' },
      { name: 'Amount', label: 'Amount', type: 'number', required: true, positive: true },
      { name: 'Mode', label: 'Payment Mode', type: 'select', required: true, showIf: v => v.Type !== 'Transfer', dependsOn: 'Type', optionsFn: v => cfgVals('PaymentMode').concat(v.Type === 'Payment' ? [S.adjMode] : []) },
      { name: 'Account', label: 'Account', type: 'select', required: true, options: accounts, showIf: v => v.Mode !== S.adjMode || v.Type !== 'Payment' },
      { name: 'ToAccount', label: 'To Account', type: 'select', required: true, options: accounts, showIf: v => v.Type === 'Transfer' },
      { name: 'ReferenceNo', label: 'Reference / UTR / Cheque No.', max: 80 }, { name: 'Remarks', label: 'Remarks', type: 'textarea' }
    ],
    onChange: (v, set, changed) => { if (changed === 'RefID' && exp(v.RefID)) set('Amount', exp(v.RefID).balance); },
    validate: v => {
      if (v.PaymentDate > today()) return 'Date cannot be in the future';
      const e = exp(v.RefID);
      if (v.Type === 'Payment' && e && v.Amount > e.balance + 0.005) return 'Amount is more than the balance payable (' + money(e.balance) + ')';
      if (v.Type === 'Payment' && e && v.Mode === S.adjMode && v.Amount > e.advanceBal + 0.005) return 'Advance available with this party is only ' + money(e.advanceBal);
      if (v.Type === 'Transfer' && v.Account === v.ToAccount) return 'From and To accounts must be different';
      return null;
    },
    onSubmit: async (v, btn, rk) => { await api('savePayment', { record: v, requestKey: rk }); toast('Payment saved'); done(); }
  });
}
VIEWS.payments = page => {
  const lv = listView(page, {
    entity: 'payments', dates: true, canExport: can('payments', 'export'), addLabel: 'New Entry', onAdd: can('payments', 'create') ? () => paymentForm(null, () => lv.reload()) : null,
    filters: [{ k: 'Type', label: 'Type', options: S.paymentTypes }, { k: 'Account', label: 'Account', options: cfgVals('Account') }],
    cols: [{ k: 'PaymentID', label: 'ID' }, { k: 'PaymentDate', label: 'Date', fmt: fmtDate }, { k: 'Type', label: 'Type' }, { k: 'PartyName', label: 'Party' }, { k: 'RefID', label: 'Against' },
      { k: 'Mode', label: 'Mode' }, { k: 'Account', label: 'Account', fmt: (v, r) => r.Type === 'Transfer' ? v + ' → ' + r.ToAccount : v }, { k: 'ReferenceNo', label: 'Reference' },
      { k: 'Amount', label: 'Amount', num: true, html: v => money(v) }, { k: 'EnteredBy', label: 'Entered By', fmt: userName }],
    actions: r => can('payments', 'delete') ? [{ label: 'Delete', danger: true, fn: x => removeRow('deletePayment', { id: x.PaymentID }, 'Delete payment ' + x.PaymentID + ' of ' + money(x.Amount) + '? The expense balance will be restored.', lv.reload) }] : []
  });
};

/* ---------------- Reports ---------------- */
VIEWS.reports = page => {
  const types = [{ v: 'budget', l: 'Budget vs Actual' }, { v: 'packages', l: 'Work Package Cost' }, { v: 'outstanding', l: 'Party Outstanding & Ageing' }, { v: 'cashbook', l: 'Cash / Bank Book' }, { v: 'missingBills', l: 'Expenses Without Bill' }];
  page.innerHTML = `<div class="toolbar">
      <select class="input sm" id="rType">${types.map(t => `<option value="${t.v}">${esc(t.l)}</option>`).join('')}</select>
      <select class="input sm hidden" id="rAcc">${cfgVals('Account').map(a => `<option>${esc(a)}</option>`).join('')}</select>
      <input class="input sm hidden" type="date" id="rFrom" title="From date"><input class="input sm hidden" type="date" id="rTo" title="To date">
      <span class="spacer"></span>
      ${can('reports', 'export') ? `<button class="btn btn-ghost" type="button" id="rCsv">${ic('download')}Export CSV</button><button class="btn btn-ghost" type="button" id="rPrint">${ic('printer')}Print</button>` : ''}
    </div><div id="rBody"></div>`;
  const body = $('#rBody', page);
  let last = { rows: [], keys: [] };
  const label = k => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, '–').replace(' Pct', ' %');
  const run = async () => {
    const type = $('#rType', page).value, cash = type === 'cashbook';
    ['rAcc', 'rFrom', 'rTo'].forEach(id => $('#' + id, page).classList.toggle('hidden', !cash));
    body.innerHTML = skeleton(5);
    try {
      const r = await api('report', { type: type, account: $('#rAcc', page).value, from: $('#rFrom', page).value, to: $('#rTo', page).value });
      const keys = r.rows.length ? Object.keys(r.rows[0]) : [];
      last = { rows: r.rows, keys: keys, type: type };
      const isNum = k => typeof r.rows[0][k] === 'number';
      const cols = keys.map(k => isNum(k) ? { k: k, label: label(k), num: true, html: v => k === 'UsedPct' ? esc(v) + '%' : money(v) } : { k: k, label: label(k), wrap: /^(Description|Particulars)$/.test(k), fmt: /date/i.test(k) ? fmtDate : null });
      const foot = keys.length && !cash ? `<tfoot><tr>${keys.map((k, i) => i === 0 ? '<td>Total</td>' : (isNum(k) && k !== 'UsedPct' ? `<td class="num">${money(r.rows.reduce((a, x) => a + x[k], 0))}</td>` : '<td></td>')).join('')}</tr></tfoot>` : '';
      body.innerHTML = (cash ? `<div class="kpis"><div class="kpi"><div class="k-label">Opening Balance</div><div class="k-value">${money(r.opening)}</div></div><div class="kpi"><div class="k-label">Closing Balance</div><div class="k-value">${money(r.closing)}</div></div></div>` : '') +
        (r.rows.length ? tableHtml(cols, r.rows, null, foot) : emptyBox('No data for this report', '', 'chart-column'));
    } catch (e) { body.innerHTML = errorBox(e.message); }
  };
  body.addEventListener('click', e => { if (e.target.closest('[data-retry]')) run(); });
  ['rType', 'rAcc', 'rFrom', 'rTo'].forEach(id => { $('#' + id, page).onchange = run; });
  if (can('reports', 'export')) {
    $('#rCsv', page).onclick = () => last.rows.length ? exportCSV('report_' + last.type, last.keys.map(label), last.rows.map(r => last.keys.map(k => r[k]))) : toast('Nothing to export', false);
    $('#rPrint', page).onclick = () => window.print();
  }
  run();
};

/* ---------------- Admin: users, roles, settings, audit ---------------- */
const CFG_TYPES = {
  BudgetCategory: { label: 'Budget / Expense Categories' },
  SubCategory: { label: 'Expense Sub-categories', parent: 'BudgetCategory' },
  Unit: { label: 'Units' }, PaymentMode: { label: 'Payment Modes' },
  Account: { label: 'Cash & Bank Accounts', extra: 'Opening Balance', extraType: 'number' },
  PartyType: { label: 'Party Types' }, Trade: { label: 'Trades' },
  ProjectType: { label: 'Project Types' }, ProjectStatus: { label: 'Project Statuses' }, PackageStatus: { label: 'Work Package Statuses' },
  BudgetAlert: { label: 'Budget Alert Levels (%)' },
  Module: { label: 'Modules (Stage 2 and 3)', extra: 'Status', extraOptions: ['ON', 'OFF'], fixed: true }
};
function roleEditor(row, allRoles, done) {
  const sysRole = row && (row.IsSystem === true || row.IsSystem === 'TRUE');
  let perms = {};
  if (row) { try { perms = JSON.parse(row.Permissions || '{}'); } catch (e) {} }
  const actions = ['view', 'create', 'edit', 'delete', 'approve', 'export'];
  const matrix = p => `<div class="tbl-wrap"><table class="tbl matrix"><thead><tr><th>Module</th>${actions.map(a => `<th>${a[0].toUpperCase() + a.slice(1)}</th>`).join('')}</tr></thead><tbody>${S.modules.map(m => `<tr><td>${esc(m.label)}</td>${actions.map(a => `<td>${m.actions.indexOf(a) > -1 ? `<input type="checkbox" data-m="${m.id}" data-a="${a}" ${sysRole || (p[m.id] || []).indexOf(a) > -1 ? 'checked' : ''} ${sysRole ? 'disabled' : ''}>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const m = modal(row ? 'Edit Role' : 'New Role', `
    ${sysRole ? '<div class="note">This is the system administrator role. It always has full access, so permissions cannot be changed.</div>' : ''}
    <div class="form-grid">
      <label class="field"><span class="lbl">Role Name <span class="req">*</span></span><input class="input" id="rName" maxlength="60" value="${esc(row ? row.RoleName : '')}" ${sysRole ? 'disabled' : ''}></label>
      <label class="field"><span class="lbl">Approval Limit (₹)</span><input class="input" id="rLimit" type="number" min="0" step="any" value="${esc(row ? row.ApprovalLimit : '')}" ${sysRole ? 'disabled' : ''}><small class="muted">Blank = cannot approve. Needs the Approve permission too.</small></label>
      <label class="field wide"><span class="lbl">Description</span><input class="input" id="rDesc" maxlength="200" value="${esc(row ? row.Description : '')}"></label>
      <label class="field check"><input type="checkbox" id="rOwn" ${row && (row.OwnOnly === true || row.OwnOnly === 'TRUE') ? 'checked' : ''} ${sysRole ? 'disabled' : ''}><span class="lbl">Own entries only (expenses and payments)</span></label>
      <label class="field check"><input type="checkbox" id="rHide" ${row && (row.HideAmounts === true || row.HideAmounts === 'TRUE') ? 'checked' : ''} ${sysRole ? 'disabled' : ''}><span class="lbl">Hide amounts, ledgers and reports</span></label>
      ${!row ? `<label class="field wide"><span class="lbl">Copy permissions from</span><select class="input" id="rCopy">${optHtml(allRoles.map(r => ({ v: r.RoleID, l: r.RoleName })), '', 'Start blank')}</select></label>` : ''}
    </div><h3 style="margin-top:16px">Permissions</h3><div id="rMatrix">${matrix(perms)}</div>`,
    '<button class="btn btn-ghost" type="button" data-x="cancel">Cancel</button><button class="btn btn-primary" type="button" data-x="save">Save Role</button>', 'wide');
  $('[data-x=cancel]', m.el).onclick = m.close;
  const copy = $('#rCopy', m.el);
  if (copy) copy.onchange = () => { const src = allRoles.find(r => r.RoleID === copy.value); let p = {}; if (src) { try { p = JSON.parse(src.Permissions || '{}'); } catch (e) {} } $('#rMatrix', m.el).innerHTML = matrix(p); };
  // ticking any action also ticks View; unticking View clears the row
  $('#rMatrix', m.el).addEventListener('change', e => {
    const t = e.target; if (!t.dataset.m) return;
    const rowBoxes = $$(`[data-m="${t.dataset.m}"]`, m.el), view = rowBoxes.find(b => b.dataset.a === 'view');
    if (t.dataset.a !== 'view' && t.checked) view.checked = true;
    if (t.dataset.a === 'view' && !t.checked) rowBoxes.forEach(b => { b.checked = false; });
  });
  const save = $('[data-x=save]', m.el);
  save.onclick = async () => {
    const name = $('#rName', m.el).value.trim();
    if (!name) return toast('Role name is required', false);
    const p = {};
    $$('[data-m]', m.el).forEach(b => { if (b.checked) (p[b.dataset.m] = p[b.dataset.m] || []).push(b.dataset.a); });
    busy(save, true);
    try {
      await api('saveRole', { record: { RoleID: row ? row.RoleID : '', RoleName: name, Description: $('#rDesc', m.el).value.trim(), ApprovalLimit: $('#rLimit', m.el).value, OwnOnly: $('#rOwn', m.el).checked, HideAmounts: $('#rHide', m.el).checked, Permissions: p } });
      toast('Role saved'); m.close(); await refreshBoot(); done();
    } catch (e) { toast(e.message, false); busy(save, false); }
  };
}
VIEWS.admin = page => {
  const edit = can('admin', 'edit'), items = [];
  let roleCache = [];
  const loadRoles = async () => { roleCache = (await api('list', { entity: 'roles', all: 0, page: 1 })).rows; return roleCache; };
  if (can('admin', 'view')) {
    items.push({ label: 'Users', render: async host => {
      host.innerHTML = skeleton(3);
      try { await loadRoles(); } catch (e) { host.innerHTML = errorBox(e.message); return; }
      const roleName = id => { const r = roleCache.find(x => x.RoleID === id); return r ? r.RoleName : id; };
      const form = row => formModal({
        title: row ? 'Edit User' : 'Add User', values: row ? Object.assign({}, row, { Active: isOn(row.Active) }) : { Active: true }, editing: !!row,
        fields: [
          { name: 'Name', label: 'Full Name', required: true }, { name: 'Phone', label: 'Login ID (mobile number)', required: true, max: 30 },
          { name: 'RoleID', label: 'Role', type: 'select', required: true, options: roleCache.map(r => ({ v: r.RoleID, l: r.RoleName })) },
          { name: 'ApprovalLimitOverride', label: 'Approval Limit Override (₹)', type: 'number', hint: 'Blank = use the limit of the role' },
          { name: 'Pin', label: row ? 'Reset PIN' : 'PIN', type: 'password', required: !row, max: 8, hint: row ? 'Leave blank to keep the current PIN' : '4 to 8 digits' },
          { name: 'Active', label: 'Active (can sign in)', type: 'checkbox' }
        ],
        validate: v => (v.Pin && !/^\d{4,8}$/.test(v.Pin)) ? 'PIN must be 4 to 8 digits' : null,
        onSubmit: async v => { await api('saveUser', { record: Object.assign({ UserID: row ? row.UserID : '' }, v) }); toast('User saved'); await refreshBoot(); lv.reload(); }
      });
      const lv = listView(host, {
        entity: 'users', addLabel: 'Add User', onAdd: edit ? () => form(null) : null,
        cols: [{ k: 'Name', label: 'Name' }, { k: 'Phone', label: 'Login ID' }, { k: 'RoleID', label: 'Role', fmt: roleName }, { k: 'ApprovalLimitOverride', label: 'Limit Override', num: true, html: v => v === '' ? '' : money(v) },
          { k: 'Active', label: 'Status', html: v => isOn(v) ? '<span class="badge ok">Active</span>' : '<span class="badge bad">Inactive</span>' }, { k: 'LastLogin', label: 'Last Login', fmt: fmtDate }],
        actions: r => edit ? [{ label: 'Edit', fn: form }] : []
      });
    } });
    items.push({ label: 'Roles & Permissions', render: host => {
      const open = async row => { try { await loadRoles(); } catch (e) { return toast(e.message, false); } roleEditor(row, roleCache, () => lv.reload()); };
      const lv = listView(host, {
        entity: 'roles', addLabel: 'New Role', onAdd: edit ? () => open(null) : null,
        cols: [{ k: 'RoleName', label: 'Role', html: (v, r) => esc(v) + (r.IsSystem === true || r.IsSystem === 'TRUE' ? ' <span class="badge info">System</span>' : '') }, { k: 'Description', label: 'Description', wrap: true },
          { k: 'ApprovalLimit', label: 'Approval Limit', num: true, html: (v, r) => (r.IsSystem === true || r.IsSystem === 'TRUE') ? 'Unlimited' : (v === '' ? '—' : money(v)) },
          { k: 'OwnOnly', label: 'Own Entries Only', fmt: v => (v === true || v === 'TRUE') ? 'Yes' : 'No' }, { k: 'HideAmounts', label: 'Amounts Hidden', fmt: v => (v === true || v === 'TRUE') ? 'Yes' : 'No' }],
        actions: r => edit ? [{ label: 'Edit', fn: open }].concat((r.IsSystem === true || r.IsSystem === 'TRUE') ? [] : [{ label: 'Delete', danger: true, fn: x => removeRow('deleteRole', { id: x.RoleID }, 'Delete role "' + x.RoleName + '"?', lv.reload) }]) : []
      });
    } });
    items.push({ label: 'Settings', render: host => {
      let type = 'BudgetCategory';
      const draw = () => {
        const meta = CFG_TYPES[type], list = S.cfg[type] || [];
        const cols = [{ k: 'value', label: 'Value' }].concat(meta.parent ? [{ k: 'parent', label: 'Category' }] : [], meta.extra ? [{ k: 'extra', label: meta.extra, num: meta.extraType === 'number', html: v => meta.extraType === 'number' ? money(v || 0) : badge(v === 'ON' ? 'Active' : v) }] : [], [{ k: 'sort', label: 'Order', num: true }]);
        const form = row => formModal({
          title: (row ? 'Edit' : 'Add') + ' — ' + meta.label, values: row ? { Value: row.value, Parent: row.parent, Extra: row.extra, SortOrder: row.sort } : { SortOrder: list.length + 1, Extra: meta.extraOptions ? meta.extraOptions[0] : '' }, editing: !!row,
          fields: [].concat(
            row ? [{ name: 'vinfo', type: 'info', compute: () => row.value }] : [{ name: 'Value', label: 'Value', required: true, wide: true, type: type === 'BudgetAlert' ? 'number' : 'text' }],
            meta.parent ? [{ name: 'Parent', label: 'Category', type: 'select', options: cfgVals(meta.parent), placeholder: 'All categories' }] : [],
            meta.extra ? [meta.extraOptions ? { name: 'Extra', label: meta.extra, type: 'select', options: meta.extraOptions, required: true } : { name: 'Extra', label: meta.extra, type: meta.extraType || 'text' }] : [],
            [{ name: 'SortOrder', label: 'Display Order', type: 'number' }]),
          onSubmit: async v => {
            await api('saveMaster', { entity: 'config', record: { ConfigID: row ? row.id : '', Type: type, Value: row ? row.value : String(v.Value), Parent: v.Parent || '', Extra: v.Extra === undefined ? '' : String(v.Extra), SortOrder: v.SortOrder } });
            toast('Saved'); await refreshBoot(); draw();
          }
        });
        const acts = edit ? r => [{ label: 'Edit', fn: form }].concat(meta.fixed ? [] : [{ label: 'Delete', danger: true, fn: x => removeRow('deleteMaster', { entity: 'config', id: x.id }, 'Delete "' + x.value + '"? Existing records keep the old value.', async () => { await refreshBoot(); draw(); }) }]) : null;
        host.innerHTML = `<div class="toolbar"><select class="input sm" id="cfgType" style="max-width:280px">${Object.keys(CFG_TYPES).map(k => `<option value="${k}" ${k === type ? 'selected' : ''}>${esc(CFG_TYPES[k].label)}</option>`).join('')}</select><span class="spacer"></span>${edit && !meta.fixed ? `<button class="btn btn-primary" type="button" id="cfgAdd">${ic('plus')}Add</button>` : ''}</div>
          ${type === 'Module' ? '<div class="note">These switches are stored now and take effect when the Contractor, Material and Labour modules are added.</div>' : ''}
          <div id="cfgList">${list.length ? tableHtml(cols, list, acts) : emptyBox('No values yet')}</div>`;
        $('#cfgType', host).onchange = e => { type = e.target.value; draw(); };
        const add = $('#cfgAdd', host); if (add) add.onclick = () => form(null);
        $('#cfgList', host).onclick = e => { const a = e.target.closest('[data-i]'); if (a && acts) acts(list[+a.dataset.i])[+a.dataset.j].fn(list[+a.dataset.i]); };
      };
      draw();
    } });
  }
  if (can('audit', 'view')) {
    items.push({ label: 'Audit Log', render: host => {
      const pretty = s => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch (e) { return s || '—'; } };
      listView(host, {
        entity: 'audit', dates: true, canExport: can('audit', 'export'),
        filters: [{ k: 'Action', label: 'Action', options: ['Create', 'Edit', 'Delete', 'Approve', 'Reject', 'Reopen', 'Login'] }],
        cols: [{ k: 'Timestamp', label: 'When', fmt: v => fmtDate(v) + String(v).slice(16) }, { k: 'UserName', label: 'User' }, { k: 'Role', label: 'Role' }, { k: 'Action', label: 'Action' }, { k: 'Entity', label: 'Record Type' }, { k: 'EntityID', label: 'Record ID' }],
        actions: r => (r.OldValue || r.NewValue) ? [{ label: 'Details', fn: x => modal('Change Details — ' + x.EntityID, `<b>Before</b><pre class="json">${esc(pretty(x.OldValue))}</pre><b>After</b><pre class="json">${esc(pretty(x.NewValue))}</pre>`) }] : []
      });
    } });
  }
  tabs(page, items);
};

/* =====================================================================
   7. INIT
   ===================================================================== */
function changePin() {
  formModal({
    title: 'Change PIN', cls: 'narrow',
    fields: [{ name: 'oldPin', label: 'Current PIN', type: 'password', required: true, wide: true, max: 8 }, { name: 'newPin', label: 'New PIN (4 to 8 digits)', type: 'password', required: true, wide: true, max: 8 }, { name: 'again', label: 'Confirm New PIN', type: 'password', required: true, wide: true, max: 8 }],
    buttons: [{ label: 'Change PIN', primary: true }],
    validate: v => !/^\d{4,8}$/.test(v.newPin) ? 'New PIN must be 4 to 8 digits' : (v.newPin !== v.again ? 'New PIN and confirmation do not match' : null),
    onSubmit: async v => { await api('changePin', { oldPin: v.oldPin, newPin: v.newPin }); toast('PIN changed'); }
  });
}
/* ---- Touch feedback: soft ripple on buttons & tabs ---- */
document.addEventListener('pointerdown', e => {
  if (e.button !== 0 || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  const b = e.target.closest('.btn, .tab, .side-btn, .btn-link, .icon-btn');
  if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
  const i = document.createElement('i');
  i.className = 'ripple';
  i.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.appendChild(i);
  setTimeout(() => i.remove(), 650);
}, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
  document.title = CONFIG.APP_NAME;
  $('#pinBtn').innerHTML = ic('key-round') + 'Change PIN';
  $('#logoutBtn').innerHTML = ic('log-out') + 'Sign out';
  $('#menuBtn').innerHTML = ic('menu');
  $('#todayChip').innerHTML = ic('clock') + esc(new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
  $('#loginForm').addEventListener('submit', doLogin);
  $('#logoutBtn').onclick = () => logout(false);
  $('#pinBtn').onclick = changePin;
  $('#menuBtn').onclick = () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); };
  $('#scrim').onclick = closeMenu;
  window.addEventListener('hashchange', route);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  S.token = localStorage.getItem(CONFIG.TOKEN_KEY);
  if (S.token) startApp(); else showOnly('loginView');
});
