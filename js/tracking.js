// ============================================================
// VORTX Tracking Layer v4 — Race-Condition + Attribution Fix
// GA4 + Meta Pixel + TikTok Pixel + Clarity
//
// CORREÇÕES v4 (resolvem os problemas reportados):
//  1. Helper window.vortxTrackSync() para InitiateCheckout —
//     força pixel carregado E dispara fbq síncrono (bypassa fila).
//  2. Captura fbclid/fbp/fbc no primeiro carregamento e expõe
//     window.vortxGetAttribution() para anexar na URL do Hotmart.
//     Isso é ESSENCIAL para a CAPI da Hotmart atribuir Purchase ao anúncio.
//  3. Fire-once guard expandido — cobre TODOS os eventos pós-compra
//     para evitar re-disparo em reload.
//  4. fbMap reduzido: o client NUNCA dispara Purchase (reservado
//     exclusivamente para a CAPI server-side da Hotmart).
//     upsell/crosssell/downsell_accept ficam como CustomEvent.
// ============================================================

(function () {
  "use strict";

  var GA4_ID          = "G-N1WZY3T5C4";
  var META_PIXEL_ID   = "1849972115648698";
  var TIKTOK_PIXEL_ID = "D7H2553C77U02GBEEMSG";
  var CLARITY_ID      = "wd3eefoz11";

  // ── Atribuição: captura fbclid no primeiro load e persiste ───
  function captureAttribution() {
    try {
      var url = new URLSearchParams(window.location.search);
      var fbclid = url.get("fbclid");
      if (fbclid) {
        sessionStorage.setItem("vx_fbclid", fbclid);
        var fbc = "fb.1." + Date.now() + "." + fbclid;
        sessionStorage.setItem("vx_fbc", fbc);
      }
      ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(function(k){
        var v = url.get(k);
        if (v) sessionStorage.setItem("vx_" + k, v);
      });
    } catch (e) {}
  }
  captureAttribution();

  function getCookie(name) {
    try {
      var m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return m ? m[2] : null;
    } catch (e) { return null; }
  }

  // ── Helper PÚBLICO: use ao montar URL do checkout Hotmart ────
  window.vortxGetAttribution = function () {
    var p = {};
    var fbp = getCookie("_fbp") || sessionStorage.getItem("vx_fbp");
    var fbc = getCookie("_fbc") || sessionStorage.getItem("vx_fbc");
    var fbclid = sessionStorage.getItem("vx_fbclid");
    if (fbp)    p.fbp    = fbp;
    if (fbc)    p.fbc    = fbc;
    if (fbclid) p.fbclid = fbclid;
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(function(k){
      var v = sessionStorage.getItem("vx_" + k);
      if (v) p[k] = v;
    });
    return p;
  };

  function generateEventId(eventName) {
    return eventName + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // Todos os eventos pós-compra ganham fire-once guard
  var ONCE_EVENTS = [
    "purchase", "purchase_confirmed",
    "upsell_view", "upsell_accept", "upsell_decline",
    "crosssell_view", "crosssell_accept", "crosssell_decline",
    "downsell_view", "downsell_accept", "downsell_decline",
    "funnel_complete", "payment_pending"
  ];
  function isAlreadyFired(eventName, productKey) {
    if (ONCE_EVENTS.indexOf(eventName) === -1) return false;
    var key = "vx_fired_" + eventName + (productKey ? "_" + productKey : "");
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, "1");
    return false;
  }

  var eventQueue   = [];
  var pixelsLoaded = false;

  window.vortxTrack = function (eventName, params) {
    params = params || {};
    params._eventId = params._eventId || generateEventId(eventName);
    if (!pixelsLoaded) {
      eventQueue.push({ e: eventName, p: params });
      return;
    }
    fireEvent(eventName, params);
  };

  // ── vortxTrackSync (NOVO) — para InitiateCheckout antes de redirect ──
  // Força load do pixel E dispara fbq imediatamente (sem fila).
  window.vortxTrackSync = function (eventName, params) {
    params = params || {};
    var eventId = generateEventId(eventName);
    params._eventId = eventId;
    if (!pixelsLoaded) loadPixels();
    fireEvent(eventName, params);
    return eventId;
  };

  function fireEvent(eventName, params) {
    var productKey = params.product || params.plan || null;
    if (isAlreadyFired(eventName, productKey)) return;
    var eventId = params._eventId || generateEventId(eventName);

    // GA4
    try {
      if (typeof gtag !== "function") throw new Error();
      var ga = Object.assign({}, params);
      delete ga._eventId;
      if (eventName === "purchase" || eventName === "upsell_accept" || eventName === "crosssell_accept") {
        ga.transaction_id = eventId;
        ga.currency       = params.currency || "USD";
        ga.items          = [{
          item_id:   productKey || "vortx_protocol",
          item_name: productKey || "vortx_protocol",
          price:     params.value || 0,
          quantity:  1,
        }];
      }
      gtag("event", eventName, ga);
    } catch (e) {}

    // Meta Pixel
    try {
      if (typeof fbq !== "function") throw new Error();
      var fbMap = {
        quiz_start:     "Lead",
        quiz_complete:  "CompleteRegistration",
        view_result:    "ViewContent",
        view_pricing:   "ViewContent",
        begin_checkout: "InitiateCheckout",
        purchase:       "Purchase",
        upsell_view:    "ViewContent",
        crosssell_view: "ViewContent",
        downsell_view:  "ViewContent",
      };
      var fbEvent  = fbMap[eventName];
      var fbParams = {};
      if (params.value)    fbParams.value    = params.value;
      if (params.currency) fbParams.currency = params.currency;
      else if (params.value) fbParams.currency = "USD";
      if (productKey) {
        fbParams.content_type = "product";
        fbParams.content_ids  = [productKey];
        fbParams.content_name = productKey;
      }
      if (params.score) fbParams.content_category = "quiz_score_" + params.score;
      if (fbEvent) {
        fbq("track", fbEvent, fbParams, { eventID: eventId });
      } else {
        fbq("trackCustom", eventName, fbParams, { eventID: eventId });
      }
    } catch (e) {}

    // TikTok
    try {
      if (typeof ttq === "undefined") throw new Error();
      var ttMap = {
        quiz_start: "SubmitForm", quiz_complete: "CompleteRegistration",
        view_pricing: "ViewContent", begin_checkout: "InitiateCheckout",
        upsell_view: "ViewContent", crosssell_view: "ViewContent", downsell_view: "ViewContent",
      };
      var ttEvent = ttMap[eventName];
      if (ttEvent) {
        var tt = { content_type: "product", description: eventName, quantity: 1, event_id: eventId };
        if (params.value)    tt.value    = params.value;
        if (params.currency) tt.currency = params.currency;
        else if (params.value) tt.currency = "USD";
        tt.content_id = productKey || "vortx";
        tt.content_name = productKey || "vortx";
        ttq.track(ttEvent, tt);
      }
    } catch (e) {}
  }

  function loadPixels() {
    if (pixelsLoaded) return;
    pixelsLoaded = true;

    var gs = document.createElement("script");
    gs.async = true;
    gs.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(gs);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag("js", new Date());
    gtag("config", GA4_ID, { send_page_view: true });
    window.gtag = gtag;

    if (!window.fbq) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0";
        n.queue = []; t = b.createElement(e); t.async = !0;
        t.src = v; s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      fbq("init", META_PIXEL_ID);
      fbq("track", "PageView");
    }

    !function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
      ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
      ttq.load = function (e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
        ttq._t = ttq._t || {}; ttq._t[e] = +new Date;
        ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        n = document.createElement("script"); n.type = "text/javascript"; n.async = !0;
        n.src = r + "?sdkid=" + e + "&lib=" + t;
        e = document.getElementsByTagName("script")[0]; e.parentNode.insertBefore(n, e);
      };
      ttq.load(TIKTOK_PIXEL_ID);
      ttq.page();
    }(window, document, "ttq");

    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);

    setTimeout(function () {
      for (var i = 0; i < eventQueue.length; i++) {
        fireEvent(eventQueue[i].e, eventQueue[i].p);
      }
      eventQueue = [];
    }, 500);
  }

  var loadTimer = setTimeout(loadPixels, 3000);
  function onInteraction() { clearTimeout(loadTimer); loadPixels(); }
  document.addEventListener("click",      onInteraction, { once: true, passive: true });
  document.addEventListener("scroll",     onInteraction, { once: true, passive: true });
  document.addEventListener("touchstart", onInteraction, { once: true, passive: true });

  window.vortxEnsureTracking = function () { clearTimeout(loadTimer); loadPixels(); };

  if (window._vtq && window._vtq.length) {
    for (var i = 0; i < window._vtq.length; i++) eventQueue.push(window._vtq[i]);
    window._vtq = [];
  }
})();
