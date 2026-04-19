// ============================================================
// VORTX Tracking Layer v2 (Lazy Load)
// GA4 + Meta Pixel + TikTok Pixel + Clarity
// Pixels carregam DEPOIS do render pra não afetar performance
// Eventos ficam em fila e disparam quando pixels carregarem
// ============================================================

(function () {
  "use strict";

  var GA4_ID = "G-N1WZY3T5C4";
  var META_PIXEL_ID = "1492285522546817";
  var TIKTOK_PIXEL_ID = "D7H2553C77U02GBEEMSG";
  var CLARITY_ID = "wd3eefoz11";

  // ── Fila de eventos (antes dos pixels carregarem) ──────────
  var eventQueue = [];
  var pixelsLoaded = false;

  // ── vortxTrack disponível IMEDIATAMENTE (enfileira se pixels não carregaram)
  window.vortxTrack = function (eventName, params) {
    params = params || {};
    if (!pixelsLoaded) {
      eventQueue.push({ e: eventName, p: params });
      return;
    }
    fireEvent(eventName, params);
  };

  // ── Dispara evento em todos os pixels ──────────────────────
  function fireEvent(eventName, params) {
    // GA4
    try { gtag("event", eventName, params); } catch (e) { }

    // Meta Pixel
    try {
      var fbMap = {
        quiz_start: "Lead",
        quiz_complete: "CompleteRegistration",
        view_pricing: "ViewContent",
        begin_checkout: "InitiateCheckout",
        purchase: "Purchase",
        upsell_accept: "Purchase",
        crosssell_accept: "Purchase",
        upsell_view: "ViewContent",
        crosssell_view: "ViewContent",
      };
      var fbEvent = fbMap[eventName];
      if (fbEvent) {
        var fbParams = {};
        if (params.value) fbParams.value = params.value;
        if (params.currency) fbParams.currency = params.currency;
        else if (params.value) fbParams.currency = "BRL";
        if (params.product) {
          fbParams.content_type = "product";
          fbParams.content_ids = [params.product];
          fbParams.content_name = params.product;
        } else if (params.plan) {
          fbParams.content_type = "product";
          fbParams.content_ids = [params.plan];
          fbParams.content_name = params.plan;
        }
        if (params.score) fbParams.content_category = "quiz_score_" + params.score;
        fbq("track", fbEvent, fbParams);
      } else {
        fbq("trackCustom", eventName, params);
      }
    } catch (e) { }

    // TikTok
    try {
      var ttMap = {
        quiz_start: "SubmitForm",
        quiz_complete: "CompleteRegistration",
        view_pricing: "ViewContent",
        begin_checkout: "InitiateCheckout",
        purchase: "CompletePayment",
        upsell_accept: "CompletePayment",
        crosssell_accept: "CompletePayment",
        upsell_view: "ViewContent",
        crosssell_view: "ViewContent",
      };
      var ttEvent = ttMap[eventName];
      if (ttEvent) {
        var ttParams = {};
        ttParams.content_type = "product";
        ttParams.description = eventName;
        if (params.value) ttParams.value = params.value;
        if (params.currency) ttParams.currency = params.currency;
        else if (params.value) ttParams.currency = "BRL";
        if (params.product) {
          ttParams.content_id = params.product;
          ttParams.content_name = params.product;
        } else if (params.plan) {
          ttParams.content_id = params.plan;
          ttParams.content_name = params.plan;
        } else {
          ttParams.content_id = "vortx";
          ttParams.content_name = "vortx";
        }
        ttParams.quantity = 1;
        ttq.track(ttEvent, ttParams);
      }
    } catch (e) { }
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

    // Meta Pixel
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

    // TikTok Pixel
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
      ttq.load = function (e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js", o = n && n.partner;
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
    document.removeEventListener("click", onInteraction);
    document.removeEventListener("scroll", onInteraction);
    document.removeEventListener("touchstart", onInteraction);
  }

  document.addEventListener("click", onInteraction, { once: true, passive: true });
  document.addEventListener("scroll", onInteraction, { once: true, passive: true });
  document.addEventListener("touchstart", onInteraction, { once: true, passive: true });

  // Consume pre-load queue from inline script
  if (window._vtq && window._vtq.length) {
    for (var i = 0; i < window._vtq.length; i++) {
      eventQueue.push(window._vtq[i]);
    }
    window._vtq = [];
  }

})();
