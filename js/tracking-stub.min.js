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

// ── event_id para dedupe entre browser e server ─────────────
function generateEventId(eventName){
  return eventName + "_" + Date.now() + "_" + Math.random().toString(36).substr(2,9);
}

// ── vortxTrack: push para dataLayer (assíncrono) ─────────────
window.vortxTrack = function(eventName, params){
  try {
    params = params || {};
    var eventId = params._eventId || generateEventId(eventName);
    window.dataLayer.push(Object.assign({
      event: eventName,
      event_id: eventId,
      attribution: window.vortxGetAttribution()
    }, params));
  } catch(e){}
};

// ── vortxTrackSync: push síncrono + retorna event_id ────────
// Usado no click do checkout para dedupe com Hotmart CAPI server-side
window.vortxTrackSync = function(eventName, params){
  try {
    params = params || {};
    var eventId = params._eventId || generateEventId(eventName);
    window.dataLayer.push(Object.assign({
      event: eventName,
      event_id: eventId,
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
