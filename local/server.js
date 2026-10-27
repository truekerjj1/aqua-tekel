'use strict';

/**
 * Aqua Tekel — localhost test sunucusu
 *
 * ui/Index + Styles + Client’ı sunar (GAS include / template çözülür).
 * google.script.run → /api/run mock (JSON store, Drive yerine local/uploads).
 * Canlı muhasebe / Google Sheets’e bağlanmaz.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const cfg = require('./config');
const store = require('./store');
const api = require('./api');

const ROOT = path.join(__dirname, '..');
const UI_DIR = path.join(ROOT, 'ui');

store.seedIfEmpty();

function readUi(relPath) {
  const clean = String(relPath || '').replace(/^ui\//, '').replace(/\.html$/, '');
  const file = path.join(UI_DIR, clean + '.html');
  if (!file.startsWith(UI_DIR) || !fs.existsSync(file)) {
    throw new Error('UI dosyası yok: ' + relPath);
  }
  return fs.readFileSync(file, 'utf8');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** GAS HtmlService.createTemplateFromFile + include() taklidi */
function renderIndex() {
  var brandName = cfg.BRAND_NAME;
  var brandSubtitle = cfg.BRAND_SUBTITLE;
  var environmentLabel = cfg.ENVIRONMENT_LABEL;
  var appInfoJson = JSON.stringify(api.getAppInfo({ session: null }));

  var html = readUi('Index');

  html = html.replace(/<\?!=\s*include\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*\?>/g, function (_, name) {
    return readUi(name);
  });

  html = html.replace(/<\?=\s*brandName\s*\?>/g, escapeHtml(brandName));
  html = html.replace(/<\?=\s*brandSubtitle\s*\?>/g, escapeHtml(brandSubtitle));
  html = html.replace(/<\?=\s*environmentLabel\s*\?>/g, escapeHtml(environmentLabel));
  html = html.replace(/<\?=\s*appInfoJson\s*\?>/g, escapeHtml(appInfoJson));

  // Kalan scriptlet’leri temizle (beklenmeyen)
  html = html.replace(/<\?[\s\S]*?\?>/g, '');

  // Proxy zinciri: withSuccessHandler apiObj dönerse .listUsersForLogin kırılır —
  // handler’lar her zaman aynı Proxy’yi döndürmeli (GAS google.script.run davranışı).
  var mockScript =
    '<script>\n' +
    '(function () {\n' +
    '  function makeRunner() {\n' +
    '    var ok = null;\n' +
    '    var fail = null;\n' +
    '    var apiObj = {};\n' +
    '    var proxy = new Proxy(apiObj, {\n' +
    '      get: function (target, prop) {\n' +
    '        if (prop === "withSuccessHandler") {\n' +
    '          return function (fn) { ok = fn; return proxy; };\n' +
    '        }\n' +
    '        if (prop === "withFailureHandler") {\n' +
    '          return function (fn) { fail = fn; return proxy; };\n' +
    '        }\n' +
    '        if (typeof prop !== "string") return undefined;\n' +
    '        return function () {\n' +
    '          var args = Array.prototype.slice.call(arguments);\n' +
    '          function emitFail(err) {\n' +
    '            if (fail) fail(err);\n' +
    '            else if (typeof window.__aquaRpcFail === "function") window.__aquaRpcFail(err);\n' +
    '          }\n' +
    '          fetch("/api/run", {\n' +
    '            method: "POST",\n' +
    '            credentials: "same-origin",\n' +
    '            headers: { "Content-Type": "application/json" },\n' +
    '            body: JSON.stringify({ method: prop, args: args })\n' +
    '          })\n' +
    '            .then(function (r) {\n' +
    '              if (!r.ok) throw new Error("HTTP " + r.status);\n' +
    '              return r.json();\n' +
    '            })\n' +
    '            .then(function (data) {\n' +
    '              if (data && data.__error) {\n' +
    '                emitFail(data.__error);\n' +
    '                return;\n' +
    '              }\n' +
    '              if (ok) ok(data.result);\n' +
    '            })\n' +
    '            .catch(function (err) {\n' +
    '              emitFail(err && err.message ? err.message : String(err));\n' +
    '            });\n' +
    '        };\n' +
    '      }\n' +
    '    });\n' +
    '    return proxy;\n' +
    '  }\n' +
    '  window.google = {\n' +
    '    script: {\n' +
    '      get run() { return makeRunner(); }\n' +
    '    }\n' +
    '  };\n' +
    '  document.documentElement.setAttribute("data-local-mock", "1");\n' +
    '})();\n' +
    '</script>\n';

  // Client’tan önce mock’u enjekte et
  if (html.indexOf('</head>') !== -1) {
    html = html.replace('</head>', mockScript + '</head>');
  } else {
    html = mockScript + html;
  }

  // Localhost rozeti: ortam etiketini zaten config’ten LOCALHOST yaptık
  return html;
}

function parseCookies(req) {
  var header = req.headers.cookie || '';
  var out = {};
  header.split(';').forEach(function (part) {
    var i = part.indexOf('=');
    if (i < 0) return;
    var k = part.slice(0, i).trim();
    var v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch (e) {
      out[k] = v;
    }
  });
  return out;
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var size = 0;
    var max = 8 * 1024 * 1024;
    req.on('data', function (c) {
      size += c.length;
      if (size > max) {
        reject(new Error('İstek çok büyük'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function send(res, status, body, headers) {
  headers = headers || {};
  var payload = body;
  if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
    payload = JSON.stringify(body);
    headers['Content-Type'] = headers['Content-Type'] || 'application/json; charset=utf-8';
  }
  headers['Content-Length'] = Buffer.byteLength(payload);
  res.writeHead(status, headers);
  res.end(payload);
}

function mimeFor(filePath) {
  var ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

function resolveSessionFromStore(parsed) {
  if (!parsed || !parsed.id) return null;
  if (parsed.exp && parsed.exp <= Date.now()) return null;
  var users = store.readJson('users', []);
  var id = String(parsed.id).trim();
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (u && u.id === id && u.aktif !== false) {
      // Rol / ad çerezden değil — store’dan (sahte patron çerezi engeli)
      return { id: u.id, ad: u.ad || u.id, rol: u.rol || 'personel' };
    }
  }
  for (var j = 0; j < (cfg.TEST_USERS || []).length; j++) {
    var t = cfg.TEST_USERS[j];
    if (t && t.id === id) {
      return { id: t.id, ad: t.ad, rol: t.rol };
    }
  }
  return null;
}

function makeCtx(req, res) {
  var cookies = parseCookies(req);
  var session = null;
  var raw = cookies[cfg.SESSION_COOKIE];
  if (raw) {
    try {
      var parsed = JSON.parse(raw);
      session = resolveSessionFromStore(parsed);
    } catch (e) {
      session = null;
    }
  }

  var pendingCookies = [];

  return {
    session: session,
    setSession: function (sess) {
      this.session = sess;
      var payload = JSON.stringify({
        id: sess.id,
        ad: sess.ad,
        rol: sess.rol,
        exp: Date.now() + cfg.SESSION_TTL_MS
      });
      pendingCookies.push(
        cfg.SESSION_COOKIE +
          '=' +
          encodeURIComponent(payload) +
          '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' +
          Math.floor(cfg.SESSION_TTL_MS / 1000)
      );
    },
    clearSession: function () {
      this.session = null;
      pendingCookies.push(
        cfg.SESSION_COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
      );
    },
    applyCookies: function (headers) {
      if (pendingCookies.length) {
        headers['Set-Cookie'] = pendingCookies.length === 1
          ? pendingCookies[0]
          : pendingCookies;
      }
      return headers;
    }
  };
}

async function handleApiRun(req, res) {
  var ctx = makeCtx(req, res);
  var raw = await readBody(req);
  var body;
  try {
    body = JSON.parse(raw || '{}');
  } catch (e) {
    send(res, 400, { __error: 'Geçersiz JSON' }, ctx.applyCookies({}));
    return;
  }
  var method = String(body.method || '').trim();
  var args = Array.isArray(body.args) ? body.args : [];
  try {
    var result = api.dispatch(method, args, ctx);
    send(res, 200, { result: result }, ctx.applyCookies({}));
  } catch (e) {
    send(
      res,
      200,
      { __error: e && e.message ? e.message : String(e) },
      ctx.applyCookies({})
    );
  }
}

function handleUpload(req, res, urlPath) {
  var name = decodeURIComponent(urlPath.replace(/^\/uploads\//, ''));
  if (!name || name.indexOf('..') !== -1 || name.indexOf('/') !== -1 || name.indexOf('\\') !== -1) {
    send(res, 400, 'Geçersiz dosya');
    return;
  }
  var abs = path.join(store.UPLOADS_DIR, name);
  if (!abs.startsWith(store.UPLOADS_DIR) || !fs.existsSync(abs)) {
    send(res, 404, 'Dosya yok');
    return;
  }
  var data = fs.readFileSync(abs);
  send(res, 200, data, { 'Content-Type': mimeFor(abs) });
}

const server = http.createServer(async function (req, res) {
  try {
    var url = new URL(req.url || '/', 'http://localhost:' + cfg.PORT);
    var pathname = url.pathname;

    if (req.method === 'POST' && pathname === '/api/run') {
      await handleApiRun(req, res);
      return;
    }

    if (req.method === 'GET' && pathname.indexOf('/uploads/') === 0) {
      handleUpload(req, res, pathname);
      return;
    }

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      var html = renderIndex();
      send(res, 200, html, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      send(res, 200, { ok: true, local: true, port: cfg.PORT });
      return;
    }

    // Doğrudan kullanıcı listesi (Client listUsersForLogin ile aynı şekil)
    if (req.method === 'GET' && pathname === '/api/users') {
      var ctxUsers = makeCtx(req, res);
      try {
        var usersResult = api.dispatch('listUsersForLogin', [], ctxUsers);
        send(res, 200, usersResult, ctxUsers.applyCookies({}));
      } catch (e) {
        send(
          res,
          200,
          { ok: false, message: e && e.message ? e.message : String(e), users: [] },
          ctxUsers.applyCookies({})
        );
      }
      return;
    }

    send(res, 404, 'Bulunamadı');
  } catch (e) {
    console.error(e);
    send(res, 500, 'Sunucu hatası: ' + (e && e.message ? e.message : e));
  }
});

server.listen(cfg.PORT, '127.0.0.1', function () {
  console.log('');
  console.log('  Aqua Tekel — localhost test');
  console.log('  http://localhost:' + cfg.PORT);
  console.log('  Canlı muhasebeye bağlanmaz. Veri: local/data/  Dekont: local/uploads/');
  console.log('  Test: Fatih TEST4567 (patron) · Sercan TEST2345 (personel)');
  console.log('');
});
