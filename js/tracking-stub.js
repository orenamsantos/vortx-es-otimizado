// VORTX tracking layer — pushes events to dataLayer for GTM Server (Stape).
// All vortx* functions now feed the GTM container; tags configured server-side.
(function(){
"use strict";

// dataLayer pode já ter sido inicializado pelo snippet GTM no <head>.
window.dataLayer = window.dataLayer || [];

// ── Captura fbclid/utm para usar na URL do checkout ──────────
try {
  var url = new URLSearchParams(window.location.search);
  var fbclid = url.get("fbclid");
  if (fbclid) {
    sessionStorage.setItem("vx_fbclid", fbclid);
    sessionStorage.setItem("vx_fbc", "fb.1." + Date.now() + "." + fbclid);
  }
  ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(function(k){
    var v = url.get(k);
    if (v) sessionStorage.setItem("vx_" + k, v);
  });
} catch(e){}

// ── Geração de sck único por visitante ──────────────────────
// Formato: latam_<timestamp_base36>_<random>
// Ex: latam_kk2zr8w_a3f9k2m1xq2bz
// Persistido em sessionStorage durante toda a jornada do funil (quiz → checkout).
// É a chave que cruza dados client-side (gravados via Tag Stape Store Writer
// no evento begin_checkout) com o webhook server-side da Hotmart.
function generateSck(){
  var ts = Date.now().toString(36);
  var rnd = Math.random().toString(36).substr(2, 9);
  var rnd2 = Math.random().toString(36).substr(2, 4);
  return "latam_" + ts + "_" + rnd + rnd2;
}

window.vortxGetOrCreateSck = function(){
  try {
    var existing = sessionStorage.getItem("vx_sck");
    if (existing) return existing;
    var sck = generateSck();
    sessionStorage.setItem("vx_sck", sck);
    return sck;
  } catch(e){
    if (!window.__vx_sck_fallback) window.__vx_sck_fallback = generateSck();
    return window.__vx_sck_fallback;
  }
};

// Garante que o sck é gerado o quanto antes (pra estar pronto no PageView).
try { window.vortxGetOrCreateSck(); } catch(e){}

// ── event_id para dedupe entre browser e server ─────────────
function generateEventId(eventName){
  return eventName + "_" + Date.now() + "_" + Math.random().toString(36).substr(2,9);
}

// ── vortxTrack: push para dataLayer (assíncrono) ─────────────
// O sck vai junto no push, então qualquer Tag GA4/Stape Store Writer
// que leia {{ed - sck}} pega automaticamente.
window.vortxTrack = function(eventName, params){
  try {
    params = params || {};
    var eventId = params._eventId || generateEventId(eventName);
    window.dataLayer.push(Object.assign({
      event: eventName,
      event_id: eventId,
      sck: window.vortxGetOrCreateSck(),
      attribution: window.vortxGetAttribution()
    }, params));
  } catch(e){}
};

// ── vortxTrackSync: push síncrono + retorna event_id ────────
// Usado no click do checkout para dedupe com Hotmart CAPI server-side.
// Crítico: dispara begin_checkout → GA4 → Stape Store grava { sck → fbc, fbp, ip, ... }
// ANTES do redirect pro Hotmart. Webhook chega depois com mesmo sck → lookup funciona.
window.vortxTrackSync = function(eventName, params){
  try {
    params = params || {};
    var eventId = params._eventId || generateEventId(eventName);
    window.dataLayer.push(Object.assign({
      event: eventName,
      event_id: eventId,
      sck: window.vortxGetOrCreateSck(),
      attribution: window.vortxGetAttribution()
    }, params));
    return eventId;
  } catch(e){ return null; }
};

// ── Compatibilidade: pixels não existem mais, então no-op ───
window.vortxEnsureTracking = function(){};

// ── Atribuição: lida pela URL do checkout para anexar parâmetros ──
window.vortxGetAttribution = function(){
  try {
    var p = {};
    var fbclid = sessionStorage.getItem("vx_fbclid");
    var fbc    = sessionStorage.getItem("vx_fbc");
    if (fbclid) p.fbclid = fbclid;
    if (fbc)    p.fbc    = fbc;
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(function(k){
      var v = sessionStorage.getItem("vx_" + k);
      if (v) p[k] = v;
    });
    return p;
  } catch(e){ return {}; }
};

// ── Guard contra acesso direto às thank-you pages ───────────
window.vortxIsLegitimateConversionPage = function(){
  try {
    var params = new URLSearchParams(window.location.search);
    if ((params.get("hottok")||"").length >= 8) return true;
    if (/^HP[A-Z0-9]{6,}/i.test(params.get("transaction")||"")) return true;
    if (params.get("src") === "vortx_funnel") return true;
    var ref = document.referrer || "";
    if (/pay\.hotmart\.com|checkout\.hotmart\.com|hotmart\.com/i.test(ref)) return true;
    if (ref.indexOf(location.origin) === 0) return true;
    return false;
  } catch(e){ return false; }
};
})();
