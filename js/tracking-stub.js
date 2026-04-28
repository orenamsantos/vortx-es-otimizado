// VORTX tracking stub v1 — client-side disabled, server-side handles all events.
// All vortx* functions are no-ops. Only fbclid/utm capture and access guard remain.
(function(){
"use strict";

// Captura fbclid/utm no primeiro load (necessário para checkout URL)
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

// No-op stubs
window.vortxTrack          = function(){};
window.vortxTrackSync      = function(){ return null; };
window.vortxEnsureTracking = function(){};

// Atribuição (server-side vai consumir isso)
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

// Guard contra acesso direto às thank-you pages
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
