// ============================================================
// VORTX Tracking Layer v3 — Deduplication Fix
// GA4 + Meta Pixel + TikTok Pixel + Clarity
//
// CORREÇÕES v3:
//  1. Pixel ID unificado (1849972115648698) — um único pixel em todo o funil
//  2. event_id gerado por evento para desduplicação Pixel vs CAPI
//  3. GA4 com transaction_id obrigatório para evitar contagem dupla por reload
//  4. upsell_accept e crosssell_accept NÃO disparam Purchase no Meta
//     (são eventos customizados — compra principal já foi contada)
//  5. Proteção "fire-once" para eventos de Purchase/purchase via sessionStorage
// ============================================================

(function () {
  "use strict";

  var GA4_ID          = "G-N1WZY3T5C4";
  var META_PIXEL_ID   = "1849972115648698"; // ← ID unificado (igual ao das páginas)
  var TIKTOK_PIXEL_ID = "D7H2553C77U02GBEEMSG";
  var CLARITY_ID      = "wd3eefoz11";

  // ── Gerador de event_id único (para desduplicação Pixel ↔ CAPI) ──
  // O mesmo event_id deve ser passado para a Hotmart/CAPI via parâmetro de URL
  function generateEventId(eventName) {
    return eventName + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // ── Guard "fire-once": impede re-disparo de purchase por reload ──
  // Armazena IDs de compra no sessionStorage; ignora se já disparado
  var PURCHASE_EVENTS = ["purchase", "upsell_accept", "crosssell_accept"];
  function isAlreadyFired(eventName, productKey) {
    if (PURCHASE_EVENTS.indexOf(eventName) === -1) return false;
    var key = "vx_fired_" + eventName + (productKey ? "_" + productKey : "");
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, "1");
    return false;
  }

  // ── Fila de eventos (antes dos pixels carregarem) ──────────
  var eventQueue  = [];
  var pixelsLoaded = false;

  // ── vortxTrack disponível IMEDIATAMENTE ────────────────────
  window.vortxTrack = function (eventName, params) {
    params = params || {};
    // Gera e anexa event_id a cada chamada
    params._eventId = params._eventId || generateEventId(eventName);
    if (!pixelsLoaded) {
      eventQueue.push({ e: eventName, p: params });
      return;
    }
    fireEvent(eventName, params);
  };

  // ── Dispara evento em todos os pixels ──────────────────────
  function fireEvent(eventName, params) {
    var productKey = params.product || params.plan || null;

    // Guard: não re-disparar Purchase em reload de página
    if (isAlreadyFired(eventName, productKey)) return;

    var eventId = params._eventId || generateEventId(eventName);

    // ── GA4 ──────────────────────────────────────────────────
    try {
      var ga4Params = Object.assign({}, params);
      delete ga4Params._eventId;

      // Eventos de compra no GA4 precisam de transaction_id para deduplicação
      if (eventName === "purchase" || eventName === "upsell_accept" || eventName === "crosssell_accept") {
        ga4Params.transaction_id = eventId;
        ga4Params.currency       = params.currency || "USD";
        ga4Params.items          = [{
          item_id:   productKey || "vortx_protocol",
          item_name: productKey || "vortx_protocol",
          price:     params.value || 0,
          quantity:  1,
        }];
      }
      gtag("event", eventName, ga4Params);
    } catch (e) {}

    // ── Meta Pixel ───────────────────────────────────────────
    try {
      // REGRA DE OURO: apenas "purchase" mapeia para Purchase no Meta.
      // upsell_accept e crosssell_accept → eventos CUSTOM (não Purchase)
      // para não gerar contagens duplicadas de compra.
      var fbMap = {
        quiz_start:       "Lead",
        quiz_complete:    "CompleteRegistration",
        view_result:      "ViewContent",
        view_pricing:     "ViewContent",
        begin_checkout:   "InitiateCheckout",
        purchase:         "Purchase",       // ← ÚNICO evento mapeado como Purchase
        upsell_view:      "ViewContent",
        crosssell_view:   "ViewContent",
      };
      // upsell_accept e crosssell_accept ficam como CustomEvent
      var fbEvent  = fbMap[eventName];
      var fbParams = { eventID: eventId };  // ← chave de desduplicação com CAPI

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
        // upsell_accept / crosssell_accept / downsell_accept etc.
        fbq("trackCustom", eventName, fbParams, { eventID: eventId });
      }
    } catch (e) {}

    // ── TikTok ───────────────────────────────────────────────
    try {
      var ttMap = {
        quiz_start:       "SubmitForm",
        quiz_complete:    "CompleteRegistration",
        view_pricing:     "ViewContent",
        begin_checkout:   "InitiateCheckout",
        purchase:         "CompletePayment",
        upsell_accept:    "CompletePayment",
        crosssell_accept: "CompletePayment",
        upsell_view:      "ViewContent",
        crosssell_view:   "ViewContent",
      };
      var ttEvent = ttMap[eventName];
      if (ttEvent) {
        var ttParams = {
          content_type: "product",
          description:  eventName,
          quantity:     1,
          event_id:     eventId,
        };
        if (params.value)    ttParams.value    = params.value;
        if (params.currency) ttParams.currency = params.currency;
        else if (params.value) ttParams.currency = "USD";
        ttParams.content_id   = productKey || "vortx";
        ttParams.content_name = productKey || "vortx";
        ttq.track(ttEvent, ttParams);
      }
    } catch (e) {}
  }

  // ── Carrega todos os pixels (chamado com delay) ────────────
  function loadPixels() {
    if (pixelsLoaded) return;
    pixelsLoaded = true;

    // GA4
    var gs = document.createElement("script");
    gs.async = true;
    gs.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(gs);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag("js", new Date());
    gtag("config", GA4_ID, { send_page_view: true });
    window.gtag = gtag;

    // Meta Pixel — inicializado UMA VEZ pelo tracking.js (não nas páginas)
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

    // TikTok Pixel
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
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

    // Clarity
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);

    // Despejar fila de eventos acumulados
    setTimeout(function () {
      for (var i = 0; i < eventQueue.length; i++) {
        fireEvent(eventQueue[i].e, eventQueue[i].p);
      }
      eventQueue = [];
    }, 500);
  }

  // ── Trigger: carrega pixels após 3s OU na primeira interação ──
  var loadTimer = setTimeout(loadPixels, 3000);

  function onInteraction() {
    clearTimeout(loadTimer);
    loadPixels();
  }

  document.addEventListener("click",      onInteraction, { once: true, passive: true });
  document.addEventListener("scroll",     onInteraction, { once: true, passive: true });
  document.addEventListener("touchstart", onInteraction, { once: true, passive: true });


  // Permite forçar carregamento imediato do tracking em ações críticas (ex.: checkout)
  window.vortxEnsureTracking = function () {
    clearTimeout(loadTimer);
    loadPixels();
  };

  // Consume pre-load queue from inline script
  if (window._vtq && window._vtq.length) {
    for (var i = 0; i < window._vtq.length; i++) {
      eventQueue.push(window._vtq[i]);
    }
    window._vtq = [];
  }

})();
