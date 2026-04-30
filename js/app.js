// ============================================================
// VORTX Quiz Engine v5 (CONVERSÃO MÁXIMA, foco total)
// Melhorias v5:
//   1. Triggers em TODAS as respostas do step 2 (idade)
//   2. Interstitial 2 usa resposta real do usuário (step 9/10)
//   3. Interstitial 3 com tensão antecipatória antes do veredicto
//   4. Step 22 diferenciado visualmente por variante (gold/red)
//   5. Depoimentos filtrados por dor no protocolo
//   6. CTA do checkout personalizado por nome + dor declarada
// ============================================================

(function () {
  "use strict";

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE TRACKING DISABLED — server-side será implementado externamente.
// Stubs no-op para preservar todas as chamadas existentes sem quebrar o código.
// Quando o GTM Server estiver pronto, basta substituir o corpo de cada stub
// por dataLayer.push({...}) ou fetch('/server-event', {...}).
// ═══════════════════════════════════════════════════════════════
window.vortxTrack          = window.vortxTrack          || function(){};
window.vortxTrackSync      = window.vortxTrackSync      || function(){ return null; };
window.vortxEnsureTracking = window.vortxEnsureTracking || function(){};
window.vortxGetAttribution = window.vortxGetAttribution || function(){
  // Mantém a captura de fbclid/utm para URL do checkout (atribuição funciona sem pixel)
  try {
    var p = {};
    var url = new URLSearchParams(window.location.search);
    var fbclid = url.get("fbclid") || sessionStorage.getItem("vx_fbclid");
    if (fbclid) {
      sessionStorage.setItem("vx_fbclid", fbclid);
      p.fbclid = fbclid;
    }
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(function(k){
      var v = url.get(k) || sessionStorage.getItem("vx_" + k);
      if (v) { sessionStorage.setItem("vx_" + k, v); p[k] = v; }
    });
    return p;
  } catch(e){ return {}; }
};
window.vortxIsLegitimateConversionPage = window.vortxIsLegitimateConversionPage || function(){
  // Continua validando acesso direto às thank-you pages (independente de pixel)
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



  // ── STATE ─────────────────────────────────────────────────
  const state = {
    exitIntentShown: false,
    currentScreen: "gate",
    currentStepIndex: 0,
    answers: {},
    userData: { name: "", whatsapp: "", height: 0, weight: 0 },
    optIn: true,
    selectedPlan: "vitalicio",
    score: 0,
    criticalAreas: [],
    timerInterval: null,
    timerSeconds: PRICING_DATA.timerMinutes * 60,
    history: [],
    audioCtx: null,
    alertNodes: [],
  };

  let stepOrder = [];

  // ── INTERSTITIALS ─────────────────────────────────────────
  const INTERSTITIALS = [
    {
      afterStep: 6,  // após erección matinal
      emoji: "🔬",
      headline: '{name}, esto tiene nombre: <span class="highlight">bloqueo vascular peniano.</span>',
      getText: () => "No es la edad. Es obstrucción en los vasos que llevan sangre al pene. Ahora vamos a mapear el daño.",
      stat: "Quien identifica el patrón ahora tiene 3.7x más posibilidades de revertirlo.",
      cta: "MAPEAR EL DAÑO",
    },
    {
      afterStep: 9,  // após pastilla
      emoji: "🧠",
      headline: 'El mapa vascular de <span class="highlight">{name}</span> no es alentador.',
      getText: () => {
        const pastilla = state.answers[9];
        const nome     = state.userData.name || "tú";
        if (pastilla === "viciado") {
          return `${nome}, tu cuerpo creó dependencia química. Sin la pastilla, nada funciona. Pero se puede reactivar sin química.`;
        }
        if (pastilla === "asvezes") {
          return `${nome}, tenerla "por si acaso" ya es señal. En 2 años, sin ella, nada va a responder.`;
        }
        return `${nome}, tus vasos se están cerrando. Ahora cruzamos con tus hábitos para descubrir qué está acelerando eso.`;
      },
      stat: "93% de los hombres con este perfil responden al protocolo en menos de 21 días.",
      cta: "VER MIS HÁBITOS",
    },
    {
      afterStep: 10,  // após hábitos — prepara resultado
      emoji: "🔴",
      headline: 'Vas a ver un número ahora. <span class="highlight">Revela cuánto se han cerrado tus vasos.</span>',
      getText: () => {
        const nome = state.userData.name || "tú";
        return `${nome}, el sistema cruzó tus respuestas con 17.483 diagnósticos. Algunos hombres quedan en shock, otros sienten alivio. Prepárate.`;
      },
      stat: "La mayoría de los hombres nunca supo que este número existía.",
      cta: "VER MI DIAGNÓSTICO",
    },
  ];


  // ── PROGRESS PERSISTENCE — recovery after abandonment ────────
  const STORAGE_KEY = "vx_quiz_progress_v1";
  const STORAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  function saveProgress() {
    try {
      const data = {
        t: Date.now(),
        currentStepId: state.currentStepId,
        userData: state.userData,
        answers: state.answers,
        selectedPlan: state.selectedPlan,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }
  function tryResumeProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !data.t) return;
      if (Date.now() - data.t > STORAGE_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      // Só restaura se tiver ao menos o nome + 1 resposta (step 3 em diante)
      if (!data.userData || !data.userData.name) return;
      if (!data.answers || Object.keys(data.answers).length < 1) return;

      const resumeDiv = document.createElement("div");
      resumeDiv.className = "resume-banner";
      resumeDiv.innerHTML = `
        <p>Continuemos donde dejaste, ${data.userData.name}. Estás en el paso ${data.currentStepId || 3} de ${STEPS.length}.</p>
        <div class="resume-actions">
          <button class="btn-resume-yes">CONTINUAR</button>
          <button class="btn-resume-no">EMPEZAR DE NUEVO</button>
        </div>
      `;
      document.body.appendChild(resumeDiv);

      resumeDiv.querySelector(".btn-resume-yes").onclick = () => {
        state.userData = data.userData;
        state.answers = data.answers || {};
        state.selectedPlan = data.selectedPlan || state.selectedPlan;
        state.currentStepId = data.currentStepId || 3;
        resumeDiv.remove();
        document.getElementById("gate").classList.remove("active");
        document.getElementById("progress-bar").style.display = "block";
        showStep();
      };
      resumeDiv.querySelector(".btn-resume-no").onclick = () => {
        localStorage.removeItem(STORAGE_KEY);
        resumeDiv.remove();
      };
    } catch (e) {}
  }
  function clearProgress() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  // ── INIT ──────────────────────────────────────────────────
  function init() {
    buildStepOrder();
    // Resume progress from localStorage (recover abandoners)
    tryResumeProgress();
    renderGate();
    initProgressBar();
    bindGlobalEvents();
  }

  function buildStepOrder() {
    stepOrder = STEPS.filter((s) => !s.isConditional);
  }

  function getStepById(id) {
    return STEPS.find((s) => s.id === id || s.id === String(id));
  }

  function getCurrentStep() { return stepOrder[state.currentStepIndex]; }
  function getCurrentPhase() { const s = getCurrentStep(); return s ? s.phase : 1; }

  function injectName(text) {
    return text.replace(/\{name\}/g, state.userData.name || "tú");
  }

  // ── RENDER GATE ───────────────────────────────────────────
  function renderGate() {
    document.getElementById("gate").innerHTML = `
      <div class="gate-logo">VORTX<span></span></div>
      <div class="gate-badge">${GATE_DATA.badge}</div>
      <h1 class="gate-headline">${GATE_DATA.headline}</h1>
      <p class="gate-subheadline">${GATE_DATA.subheadline}</p>
      ${GATE_DATA.timerStrip ? `<div class="gate-timer-strip">${GATE_DATA.timerStrip}</div>` : ""}
      <button class="btn-cta" id="btn-start">${GATE_DATA.cta}</button>
      <div class="gate-social-proof">
        <div class="stars">★ ★ ★ ★ ★</div>
        <span class="gate-social-count">${GATE_DATA.socialProof}</span>
      </div>
      <div class="gate-privacy">${GATE_DATA.privacySeal}</div>
    `;
  }

  // ── PROGRESS BAR ──────────────────────────────────────────
  function initProgressBar() {
    const phasesContainer = document.getElementById("progress-phases");
    const labelsContainer = document.getElementById("progress-labels");
    let phasesHtml = "";
    let labelsHtml = "";
    PHASES.forEach((p) => {
      phasesHtml += `<div class="progress-phase" data-phase="${p.id}"><div class="progress-phase-fill"></div></div>`;
      labelsHtml += `<span class="progress-phase-label" data-phase-label="${p.id}">${p.label}</span>`;
    });
    phasesContainer.innerHTML = phasesHtml;
    labelsContainer.innerHTML = labelsHtml;

    // Criar elemento de step counter ("Paso X de Y — X%") se ainda não existir
    if (!document.getElementById("progress-step-counter")) {
      const counter = document.createElement("div");
      counter.id = "progress-step-counter";
      counter.className = "progress-step-counter";
      counter.innerHTML = '<span class="progress-step-num"></span><span class="progress-step-pct"></span>';
      labelsContainer.parentNode.insertBefore(counter, labelsContainer);
    }
  }

  function updateProgressBar() {
    const currentPhase = getCurrentPhase();
    const step = getCurrentStep();
    if (!step) return;
    PHASES.forEach((phase) => {
      const barEl   = document.querySelector(`.progress-phase[data-phase="${phase.id}"]`);
      const labelEl = document.querySelector(`[data-phase-label="${phase.id}"]`);
      const fill    = barEl.querySelector(".progress-phase-fill");
      barEl.classList.remove("completed");
      labelEl.classList.remove("active", "completed");
      if (phase.id < currentPhase) {
        barEl.classList.add("completed");
        fill.style.width = "100%";
        labelEl.classList.add("completed");
      } else if (phase.id === currentPhase) {
        labelEl.classList.add("active");
        const phaseSteps = stepOrder.filter((s) => s.phase === currentPhase);
        const currentIdx = phaseSteps.findIndex((s) => s.id === step.id);
        fill.style.width = `${((currentIdx + 1) / phaseSteps.length) * 100}%`;
      } else {
        fill.style.width = "0%";
      }
    });

    // Atualizar o counter numérico
    const counterNum = document.querySelector(".progress-step-num");
    const counterPct = document.querySelector(".progress-step-pct");
    if (counterNum && counterPct) {
      const totalSteps = stepOrder.length;
      const currentIdx = stepOrder.findIndex((s) => s.id === step.id) + 1;
      const pct        = Math.round((currentIdx / totalSteps) * 100);
      counterNum.textContent = `Paso ${currentIdx} de ${totalSteps}`;
      counterPct.textContent = `${pct}%`;
    }
  }


  // ── SOCIAL COUNTER ANIMATION ──────────────────────────────
  function animateSocialCounter() {
    const el = document.getElementById("social-counter");
    if (!el) return;
    const target = 17483;
    const duration = 1800;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      const val = Math.floor(eased * target);
      el.textContent = val.toLocaleString("es");
      if (pct < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── SCREEN MANAGEMENT ─────────────────────────────────────
  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(screenId).classList.add("active");
    state.currentScreen = screenId;
    window.scrollTo({ top: 0, behavior: "instant" });
    document.getElementById("progress-bar").style.display = screenId === "quiz" ? "block" : "none";
  }

  // ── GLOBAL EVENTS ─────────────────────────────────────────
  function bindGlobalEvents() {
    document.addEventListener("click", (e) => {
      if (e.target.id === "btn-start" || e.target.closest("#btn-start")) {
        unlockAudio();
        if (window.vortxTrack) vortxTrack("quiz_start");
        showScreen("quiz");
        renderStep();
        // History API: marca entrada no quiz para interceptar botão voltar
        try {
          history.pushState({ vortx: "quiz", stepIndex: state.currentStepIndex }, "");
        } catch (err) {}
      }
    });
    document.getElementById("btn-back").addEventListener("click", goBack);
  }

  function unlockAudio() {
    try {
      if (state.audioCtx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      state.audioCtx = ctx;
    } catch (e) {}
  }

  function goBack() {
    if (state.currentStepIndex > 0) {
      // Usa history.back() — isso dispara popstate que faz o rewind
      try {
        history.back();
      } catch (err) {
        // Fallback se History API falhar
        state.currentStepIndex--;
        renderStep();
      }
    }
  }

  // ── POPSTATE LISTENER — Intercepta botão voltar do navegador ──
  window.addEventListener("popstate", function (ev) {
    // Prioridade 1: Se tem lightbox aberto, fecha ele
    var lightbox = document.querySelector(".wa-lightbox");
    if (lightbox) {
      lightbox.remove();
      return;
    }

    // Prioridade 2: Se tem resume banner aberto, ignora
    var resumeBanner = document.querySelector(".resume-banner");
    if (resumeBanner) {
      // Re-empurra estado do quiz para não sair
      try {
        history.pushState({ vortx: "quiz", stepIndex: state.currentStepIndex }, "");
      } catch (err) {}
      return;
    }

    // Prioridade 3: Se está no quiz, navega para step anterior
    if (state.currentScreen === "quiz") {
      var targetIndex = ev.state && ev.state.vortx === "quiz"
        ? ev.state.stepIndex
        : Math.max(0, state.currentStepIndex - 1);
      
      if (targetIndex >= 0 && targetIndex < stepOrder.length) {
        state.currentStepIndex = targetIndex;
        renderStep();
      } else if (targetIndex < 0 || !ev.state) {
        // Voltou além do primeiro step → volta pro gate
        showScreen("gate");
        // Re-empurra estado neutro para manter o controle
        try {
          history.pushState({ vortx: "gate" }, "");
        } catch (err) {}
      }
    }
  });

  // ── RENDER STEP ───────────────────────────────────────────
  function renderStep() {
    const step = getCurrentStep();
    if (!step) return;
    updateProgressBar();
    if (window.vortxTrack) vortxTrack("quiz_step", { step_id: step.id, step_phase: step.phase, step_type: step.type });

    const container = document.getElementById("step-container");
    container.classList.remove("fade-enter");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.classList.add("fade-enter");
      });
    });

    const isSingle = step.type === "single-select";
    const question = injectName(step.question);
    const microcopy = step.microcopy ? injectName(step.microcopy) : null;

    let html = `
      <h2 class="step-question">${question}</h2>
      ${microcopy ? `<p class="step-microcopy">${microcopy}</p>` : '<div class="step-no-microcopy"></div>'}
    `;

    switch (step.type) {
      case "single-select":   html += renderSingleSelect(step);   break;
      case "multi-select":    html += renderMultiSelect(step);    break;
      case "biometric-input": html += renderBiometricInput(step); break;
      case "text-input":      html += renderTextInput(step);      break;
      case "email-input":     html += renderEmailInput(step);     break;
      case "whatsapp-input":  html += renderWhatsappInput(step);  break;
    }

    html += `<div id="step-trigger" class="step-trigger"></div>`;

    if (!isSingle) {
      html += `
        <div class="step-footer">
          <button class="btn-cta" id="btn-continue" disabled>Continuar</button>
        </div>
      `;
    }

    container.innerHTML = html;
    bindStepEvents(step);
    restoreAnswer(step);
  }

  // ── RENDER HELPERS ────────────────────────────────────────
  function renderSingleSelect(step) {
    let html = '<div class="options-grid single-select">';
    step.options.forEach((opt) => {
      const variantClass = opt.variant ? `option-variant-${opt.variant}` : "";
      html += `
        <div class="option-card ${variantClass}" data-value="${opt.value}">
          <div class="option-card-icon">${opt.icon}</div>
          <span class="option-card-label">${opt.label}</span>
        </div>
      `;
    });
    return html + "</div>";
  }

  function renderMultiSelect(step) {
    let html = '<div class="options-grid multi-select">';
    step.options.forEach((opt) => {
      html += `
        <div class="option-card" data-value="${opt.value}">
          <div class="option-card-icon">${opt.icon}</div>
          <span class="option-card-label">${opt.label}</span>
          <div class="option-card-check"></div>
        </div>
      `;
    });
    return html + "</div>";
  }

  function renderBiometricInput(step) {
    let html = '<div class="biometric-grid">';
    step.fields.forEach((f) => {
      html += `
        <div class="input-group">
          <label class="input-label">${f.label}</label>
          <div class="input-wrapper">
            <input type="number" class="input-field mono" id="input-${f.name}" name="${f.name}"
              placeholder="${f.placeholder}" min="${f.min}" max="${f.max}" inputmode="numeric">
            <span class="input-unit">${f.unit}</span>
          </div>
        </div>
      `;
    });
    return html + "</div>";
  }

  function renderTextInput(step) {
    return `
      <div class="input-group">
        <input type="text" class="input-field" id="input-${step.field.name}"
          name="${step.field.name}" placeholder="${step.field.placeholder}"
          maxlength="${step.field.maxLength || 50}" autocomplete="given-name">
      </div>
    `;
  }

  function renderEmailInput(step) {
    return `
      <div class="input-group">
        <input type="email" class="input-field" id="input-${step.field.name}"
          name="${step.field.name}" placeholder="${step.field.placeholder}" autocomplete="email">
      </div>
      <div class="optin-container" id="optin-toggle">
        <div class="optin-checkbox checked" id="optin-check"></div>
        <span class="optin-label">${step.optIn.text}</span>
      </div>
      <p class="body-sm" style="text-align:center;">${step.privacySeal}</p>
    `;
  }

  function renderWhatsappInput(step) {
    return `
      <div class="input-group" style="padding:0;">
        <div class="whatsapp-input-wrapper">
          <select class="whatsapp-ddi-select" id="ddi-select" aria-label="Código de país">
            <optgroup label="── América Latina ──">
            <option value="+52">🇲🇽 +52</option>
            <option value="+57">🇨🇴 +57</option>
            <option value="+54">🇦🇷 +54</option>
            <option value="+51">🇵🇪 +51</option>
            <option value="+56">🇨🇱 +56</option>
            <option value="+58">🇻🇪 +58</option>
            <option value="+593">🇪🇨 +593</option>
            <option value="+502">🇬🇹 +502</option>
            <option value="+503">🇸🇻 +503</option>
            <option value="+504">🇭🇳 +504</option>
            <option value="+505">🇳🇮 +505</option>
            <option value="+506">🇨🇷 +506</option>
            <option value="+507">🇵🇦 +507</option>
            <option value="+591">🇧🇴 +591</option>
            <option value="+595">🇵🇾 +595</option>
            <option value="+598">🇺🇾 +598</option>
            <option value="+53">🇨🇺 +53</option>
            <option value="+1-809">🇩🇴 +1-809</option>
            <option value="+509">🇭🇹 +509</option>
            <option value="+592">🇬🇾 +592</option>
            <option value="+597">🇸🇷 +597</option>
            <option value="+55">🇧🇷 +55</option>
            </optgroup>
            <optgroup label="── Europa ──">
            <option value="+34">🇪🇸 +34</option>
            <option value="+351">🇵🇹 +351</option>
            <option value="+39">🇮🇹 +39</option>
            <option value="+33">🇫🇷 +33</option>
            <option value="+49">🇩🇪 +49</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+31">🇳🇱 +31</option>
            <option value="+32">🇧🇪 +32</option>
            <option value="+41">🇨🇭 +41</option>
            <option value="+43">🇦🇹 +43</option>
            <option value="+48">🇵🇱 +48</option>
            <option value="+40">🇷🇴 +40</option>
            <option value="+30">🇬🇷 +30</option>
            <option value="+420">🇨🇿 +420</option>
            <option value="+36">🇭🇺 +36</option>
            <option value="+46">🇸🇪 +46</option>
            <option value="+47">🇳🇴 +47</option>
            <option value="+45">🇩🇰 +45</option>
            <option value="+358">🇫🇮 +358</option>
            <option value="+353">🇮🇪 +353</option>
            <option value="+380">🇺🇦 +380</option>
            <option value="+7">🇷🇺 +7</option>
            </optgroup>
            <optgroup label="── Otros ──">
            <option value="+1">🇺🇸 +1</option>
            <option value="+1-CA">🇨🇦 +1</option>
            <option value="+61">🇦🇺 +61</option>
            <option value="+64">🇳🇿 +64</option>
            </optgroup>
          </select>
          <input type="tel" class="input-field whatsapp-field" id="input-${step.field.name}"
            name="${step.field.name}" placeholder="000 000 0000"
            inputmode="tel" maxlength="15" autocomplete="tel">
        </div>
      </div>
      <div class="optin-container" id="optin-toggle">
        <div class="optin-checkbox checked" id="optin-check"></div>
        <span class="optin-label">${step.optIn.text}</span>
      </div>
      <p class="body-sm" style="text-align:center;">${step.privacySeal}</p>
    `;
  }

  // ── BIND EVENTS ───────────────────────────────────────────
  function bindStepEvents(step) {
    const btnContinue = document.getElementById("btn-continue");

    if (step.type === "single-select") {
      document.querySelectorAll(".option-card").forEach((card) => {
        card.addEventListener("click", function () {
          document.querySelectorAll(".option-card").forEach((c) => c.classList.remove("selected"));
          this.classList.add("selected");
          state.answers[step.id] = this.dataset.value;
          const triggerMsg = getTriggerMessage(step, this.dataset.value);
          if (triggerMsg) {
            showShockScreen(injectName(triggerMsg), () => advanceStep());
          } else {
            setTimeout(() => advanceStep(), 450);
          }
        });
      });
    }

    if (step.type === "multi-select") {
      document.querySelectorAll(".option-card").forEach((card) => {
        card.addEventListener("click", function () {
          const val = this.dataset.value;
          if (val === "nenhuma" || val === "nenhum") {
            document.querySelectorAll(".option-card").forEach((c) => c.classList.remove("selected"));
            this.classList.add("selected");
          } else {
            document.querySelector('.option-card[data-value="nenhuma"]')?.classList.remove("selected");
            document.querySelector('.option-card[data-value="nenhum"]')?.classList.remove("selected");
            this.classList.toggle("selected");
          }
          const selected = Array.from(document.querySelectorAll(".option-card.selected")).map((c) => c.dataset.value);
          state.answers[step.id] = selected;
          if (btnContinue) btnContinue.disabled = selected.length < (step.minSelections || 1);
          if (step.triggers && step.triggers._any_except_nenhuma) {
            const hasNeg = selected.some((v) => v !== "nenhuma" && v !== "nenhum");
            if (hasNeg) showInlineTrigger(injectName(step.triggers._any_except_nenhuma));
          }
        });
      });
    }

    if (step.type === "biometric-input") {
      const inputs = document.querySelectorAll(".biometric-grid .input-field");
      const LIMITS = {
        height: { min: 140, max: 220, unit: "cm", label: "Altura" },
        weight: { min: 40,  max: 250, unit: "kg", label: "Peso"   },
      };
      function getError(name, val) {
        const v = Number(val); const l = LIMITS[name];
        if (!l) return null;
        if (!val || isNaN(v) || v === 0) return null;
        if (v < l.min) return `${l.label} mínima: ${l.min}${l.unit}`;
        if (v > l.max) return `${l.label} máxima: ${l.max}${l.unit}`;
        return null;
      }
      function showFieldError(input, msg) {
        const wrapper = input.closest(".input-group");
        let err = wrapper.querySelector(".biometric-error");
        if (msg) {
          if (!err) { err = document.createElement("span"); err.className = "biometric-error"; wrapper.appendChild(err); }
          err.textContent = msg; input.classList.add("input-error");
        } else { if (err) err.remove(); input.classList.remove("input-error"); }
      }
      function validateAll() {
        let allValid = true;
        inputs.forEach((i) => {
          const v = Number(i.value); const l = LIMITS[i.name];
          if (!i.value || isNaN(v) || v === 0) { allValid = false; return; }
          if (l && (v < l.min || v > l.max)) allValid = false;
        });
        if (btnContinue) btnContinue.disabled = !allValid;
      }
      inputs.forEach((input) => {
        input.addEventListener("input", function () {
          showFieldError(this, getError(this.name, this.value));
          if (this.name === "height") state.userData.height = Number(this.value);
          if (this.name === "weight") state.userData.weight = Number(this.value);
          state.answers[step.id] = { height: state.userData.height, weight: state.userData.weight };
          validateAll();
        });
      });
    }

    if (step.type === "text-input") {
      const input = document.getElementById(`input-${step.field.name}`);
      input.addEventListener("input", function () {
        if (btnContinue) btnContinue.disabled = !this.value.trim();
        if (step.field.name === "userName") state.userData.name = this.value.trim();
        state.answers[step.id] = this.value.trim();
      });
      setTimeout(() => input.focus(), 400);
    }

    if (step.type === "email-input") {
      const input = document.getElementById(`input-${step.field.name}`);
      input.addEventListener("input", function () {
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value);
        if (btnContinue) btnContinue.disabled = !valid;
        state.userData.email = this.value.trim();
        state.answers[step.id] = this.value.trim();
      });
      setTimeout(() => input.focus(), 400);
      document.getElementById("optin-toggle")?.addEventListener("click", () => {
        const check = document.getElementById("optin-check");
        check.classList.toggle("checked");
        state.optIn = check.classList.contains("checked");
      });
    }

    if (step.type === "whatsapp-input") {
      const input = document.getElementById(`input-${step.field.name}`);
      const ddiEl = document.getElementById("ddi-select");

      // ── Comprimentos mínimo/máximo de dígitos por DDI ──────────────────
      // Formato: { ddi: [min, max] } — apenas dígitos locais (sem o DDI)
      const DDI_LENGTHS = {
        "+52":    [10, 10], // México
        "+57":    [10, 10], // Colômbia
        "+54":    [10, 10], // Argentina
        "+51":    [9,  9],  // Peru
        "+56":    [9,  9],  // Chile
        "+58":    [10, 10], // Venezuela
        "+593":   [9,  9],  // Equador
        "+502":   [8,  8],  // Guatemala
        "+503":   [8,  8],  // El Salvador
        "+504":   [8,  8],  // Honduras
        "+505":   [8,  8],  // Nicarágua
        "+506":   [8,  8],  // Costa Rica
        "+507":   [8,  8],  // Panamá
        "+591":   [8,  8],  // Bolívia
        "+595":   [9,  9],  // Paraguai
        "+598":   [9,  9],  // Uruguai
        "+53":    [8,  8],  // Cuba
        "+1-809": [10, 10], // Rep. Dominicana
        "+509":   [8,  8],  // Haiti
        "+592":   [7,  7],  // Guiana
        "+597":   [7,  7],  // Suriname
        "+55":    [10, 11], // Brasil (fixo 10, celular 11)
        "+34":    [9,  9],  // Espanha
        "+351":   [9,  9],  // Portugal
        "+39":    [9, 11],  // Itália
        "+33":    [9,  9],  // França
        "+49":    [10, 12], // Alemanha
        "+44":    [10, 10], // Reino Unido
        "+31":    [9,  9],  // Países Baixos
        "+32":    [9,  9],  // Bélgica
        "+41":    [9,  9],  // Suíça
        "+43":    [10, 13], // Áustria
        "+48":    [9,  9],  // Polônia
        "+40":    [9,  9],  // Romênia
        "+30":    [10, 10], // Grécia
        "+420":   [9,  9],  // Rep. Tcheca
        "+36":    [8,  9],  // Hungria
        "+46":    [7, 10],  // Suécia
        "+47":    [8,  8],  // Noruega
        "+45":    [8,  8],  // Dinamarca
        "+358":   [9, 11],  // Finlândia
        "+353":   [9,  9],  // Irlanda
        "+380":   [9,  9],  // Ucrânia
        "+7":     [10, 10], // Rússia
        "+1":     [10, 10], // EUA
        "+1-CA":  [10, 10], // Canadá
        "+61":    [9,  9],  // Austrália
        "+64":    [8,  10], // Nova Zelândia
      };

      // ── Exibe/oculta mensagem de erro ────────────────────────────────
      function showWhatsappError(msg) {
        const wrapper = input.closest(".input-group");
        let err = wrapper.querySelector(".whatsapp-error");
        if (msg) {
          if (!err) {
            err = document.createElement("span");
            err.className = "whatsapp-error";
            wrapper.appendChild(err);
          }
          err.textContent = msg;
          input.classList.add("input-error");
        } else {
          if (err) err.remove();
          input.classList.remove("input-error");
        }
      }

      // ── Valida de acordo com o DDI selecionado ───────────────────────
      function validateWhatsappIntl(digits) {
        if (digits.length === 0) return null;
        const currentDdi = ddiEl ? ddiEl.value : "+52";
        const [minLen, maxLen] = DDI_LENGTHS[currentDdi] || [7, 13];

        // Validação BR: DDD + dígito 9 + sequência repetida
        if (currentDdi === "+55") {
          if (digits.length < 10) return null; // ainda digitando
          const ddd = parseInt(digits.substring(0, 2), 10);
          if (ddd < 11 || ddd > 99) return "DDD inválido";
          if (digits.length === 11 && digits[2] !== "9") return "Celular deve começar com 9";
          if (/^(\d)\1+$/.test(digits.substring(2))) return "Número inválido";
          return null;
        }

        // Validação internacional genérica
        if (digits.length > maxLen) return "Número demasiado largo";
        if (/^(\d)\1+$/.test(digits)) return "Número inválido";
        return null;
      }

      // ── Aplica máscara apenas para Brasil; formato livre para demais ──
      function applyMask(rawDigits) {
        const currentDdi = ddiEl ? ddiEl.value : "+52";
        if (currentDdi === "+55") {
          // Máscara brasileira: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
          let v = rawDigits.substring(0, 11);
          if (v.length > 6)      return `(${v.substring(0,2)}) ${v.substring(2,7)}-${v.substring(7)}`;
          if (v.length > 2)      return `(${v.substring(0,2)}) ${v.substring(2)}`;
          if (v.length > 0)      return `(${v}`;
          return "";
        }
        // Demais países: apenas separa com espaços a cada 3-4 dígitos
        return rawDigits.replace(/(\d{3,4})(?=\d)/g, "$1 ").trim();
      }

      // ── Atualiza estado do botão e dados do usuário ───────────────────
      function updateWhatsappState() {
        const currentDdi = ddiEl ? ddiEl.value : "+52";
        const digits = input.value.replace(/\D/g, "");
        const [minLen, maxLen] = DDI_LENGTHS[currentDdi] || [7, 13];
        const errorMsg = validateWhatsappIntl(digits);
        const complete = digits.length >= minLen && digits.length <= maxLen && !errorMsg;
        const isOptional = step.optional === true;

        // Se opcional: mostra erro só se começou a digitar
        showWhatsappError(complete || digits.length === 0 ? null : errorMsg);

        // Se opcional: botão nunca fica disabled.
        // Se obrigatório: botão só habilita com número completo.
        if (btnContinue) {
          btnContinue.disabled = isOptional ? false : !complete;
          updateContinueLabel(complete);
        }

        if (complete) {
          const cleanDdi = currentDdi.replace(/-\w+$/, "");
          state.userData.whatsapp = `${cleanDdi}${digits}`;
        } else {
          state.userData.whatsapp = "";
        }
        state.answers[step.id] = state.userData.whatsapp;
      }

      // Altera o texto do botão Continuar conforme o lead preenche ou não
      function updateContinueLabel(hasValidNumber) {
        if (!btnContinue || !step.optional) return;
        const label = btnContinue.querySelector(".btn-label") || btnContinue;
        if (hasValidNumber) {
          label.textContent = "ENVIAR POR WHATSAPP Y VER DIAGNÓSTICO";
        } else {
          label.textContent = "VER MI DIAGNÓSTICO SIN WHATSAPP";
        }
      }

      // Init: se step é opcional, já começa com botão ativo e label "ver sin whatsapp"
      if (step.optional && btnContinue) {
        btnContinue.disabled = false;
        updateContinueLabel(false);
      }

      // ── Listener: input do campo ──────────────────────────────────────
      input.addEventListener("input", function () {
        const currentDdi = ddiEl ? ddiEl.value : "+52";
        const [, maxLen] = DDI_LENGTHS[currentDdi] || [7, 13];
        const rawDigits = this.value.replace(/\D/g, "").substring(0, maxLen);
        this.value = applyMask(rawDigits);
        updateWhatsappState();
      });

      // ── Listener: troca de país — re-valida imediatamente ─────────────
      if (ddiEl) {
        ddiEl.addEventListener("change", function () {
          const currentDdi = this.value;
          const [, maxLen] = DDI_LENGTHS[currentDdi] || [7, 13];
          // Reaplica máscara com novo DDI e re-valida
          const rawDigits = input.value.replace(/\D/g, "").substring(0, maxLen);
          input.value = applyMask(rawDigits);
          // Atualiza placeholder dinamicamente
          const [minLen] = DDI_LENGTHS[currentDdi] || [7, 13];
          input.placeholder = "0".repeat(minLen);
          updateWhatsappState();
        });
      }

      setTimeout(() => input.focus(), 400);

      // ── Opt-in toggle ─────────────────────────────────────────────────
      document.getElementById("optin-toggle")?.addEventListener("click", () => {
        const check = document.getElementById("optin-check");
        check.classList.toggle("checked");
        state.optIn = check.classList.contains("checked");
      });
    }

    if (btnContinue) {
      btnContinue.addEventListener("click", function () {
        if (!this.disabled) advanceStep();
      });
    }
  }

  // ── TRIGGERS ──────────────────────────────────────────────
  function getTriggerMessage(step, value) {
    if (!step.triggers) return null;
    return step.triggers[value] || step.triggers._all || null;
  }

  function showInlineTrigger(text) {
    const el = document.getElementById("step-trigger");
    if (el) { el.textContent = injectName(text); el.classList.add("visible"); }
  }

  // ── ÁUDIO ─────────────────────────────────────────────────
  function playCriticalAlert() {
    try {
      const ctx = state.audioCtx;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      _playAlertTones(ctx);
    } catch (e) {}
  }

  function stopCriticalAlert() {
    try {
      state.alertNodes.forEach((node) => {
        try { node.gain.gain.cancelScheduledValues(0); node.gain.gain.setValueAtTime(0, 0); } catch (_) {}
        try { node.osc.stop(0); } catch (_) {}
      });
    } catch (e) {}
    state.alertNodes = [];
  }

  function _playAlertTones(ctx) {
    try {
      stopCriticalAlert();
      const master = ctx.createGain();
      master.gain.setValueAtTime(1.0, ctx.currentTime);
      master.connect(ctx.destination);
      [0, 0.55, 1.10, 1.65, 2.20].forEach((offset) => {
        const osc1 = ctx.createOscillator(); const gain1 = ctx.createGain();
        osc1.connect(gain1); gain1.connect(master); osc1.type = "sine";
        osc1.frequency.setValueAtTime(130, ctx.currentTime + offset);
        osc1.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + offset + 0.45);
        gain1.gain.setValueAtTime(1.0, ctx.currentTime + offset);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.50);
        osc1.start(ctx.currentTime + offset); osc1.stop(ctx.currentTime + offset + 0.50);
        state.alertNodes.push({ osc: osc1, gain: gain1 });

        const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(master); osc2.type = "sine";
        osc2.frequency.setValueAtTime(420, ctx.currentTime + offset + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + offset + 0.45);
        gain2.gain.setValueAtTime(0.0,  ctx.currentTime + offset + 0.05);
        gain2.gain.linearRampToValueAtTime(0.80, ctx.currentTime + offset + 0.10);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.50);
        osc2.start(ctx.currentTime + offset + 0.05); osc2.stop(ctx.currentTime + offset + 0.50);
        state.alertNodes.push({ osc: osc2, gain: gain2 });
      });
      setTimeout(() => { state.alertNodes = []; }, 3500);
    } catch (e) {}
  }

  // ── SHOCK SCREEN ─────────────────────────────────────────
  function showShockScreen(message, onContinue) {
    const screen = document.getElementById("interstitial");
    const emojiMatch = message.match(/^(🛑|⚠|⚠️|✓)/u);
    const emoji = emojiMatch ? emojiMatch[0] : "⚠️";
    const bodyText = injectName(message.replace(/^(🛑|⚠|⚠️|✓)\s*/u, ""));
    const isCritical = emoji === "🛑";
    const isAlert    = isCritical || emoji === "⚠️" || emoji === "⚠";
    const isPositive = emoji === "✓";

    if (isCritical) playCriticalAlert();

    let shockCta;
    if (isPositive) {
      shockCta = "CONTINUAR →";
    } else if (message.includes("pene") || message.includes("erección") || message.includes("duro") || message.includes("abajo") || message.includes("pastilla")) {
      shockCta = isCritical ? "ENTENDIDO, QUIERO SABER SI TIENE SOLUCIÓN" : "VER LO SIGUIENTE";
    } else if (message.includes("músculo") || message.includes("grasa") || message.includes("barriga") || message.includes("hormona")) {
      shockCta = isCritical ? "ENTENDIDO, CONTINUAR EL DIAGNÓSTICO" : "VER LO SIGUIENTE";
    } else if (message.includes("testosterona") || message.includes("cortisol") || message.includes("energía") || message.includes("sueño")) {
      shockCta = isCritical ? "ENTENDIDO, CONTINUAR EL DIAGNÓSTICO" : "VER LO SIGUIENTE";
    } else if (message.includes("vaso") || message.includes("sangre") || message.includes("bloqueo") || message.includes("flujo")) {
      shockCta = isCritical ? "ENTENDIDO, CONTINUAR EL DIAGNÓSTICO" : "VER LO SIGUIENTE";
    } else {
      shockCta = isCritical ? "ENTENDIDO, CONTINUAR EL DIAGNÓSTICO" : "VER LO SIGUIENTE";
    }

    screen.innerHTML = `
      <div class="shock-screen ${isAlert ? "shock-alert" : ""} ${isPositive ? "shock-positive" : ""}">
        <div class="shock-icon">${emoji}</div>
        <p class="shock-body">${bodyText}</p>
        <button class="btn-cta shock-cta" id="btn-shock-continue">${shockCta}</button>
      </div>
    `;

    showScreen("interstitial");

    document.getElementById("btn-shock-continue").addEventListener("click", () => {
      stopCriticalAlert();
      showScreen("quiz");
      onContinue();
    });
  }

  function restoreAnswer(step) {
    const answer = state.answers[step.id];
    if (!answer) return;
    if (step.type === "single-select") {
      document.querySelector(`.option-card[data-value="${answer}"]`)?.classList.add("selected");
    } else if (step.type === "multi-select" && Array.isArray(answer)) {
      answer.forEach((val) => document.querySelector(`.option-card[data-value="${val}"]`)?.classList.add("selected"));
      const btn = document.getElementById("btn-continue");
      if (btn) btn.disabled = answer.length < (step.minSelections || 1);
    }
  }

  // ── STEP NAVIGATION ───────────────────────────────────────
  function advanceStep() {
    const currentStep = getCurrentStep();

    if (currentStep?.conditional) {
      const answer = state.answers[currentStep.id];
      const target = currentStep.conditional[answer];
      if (target) {
        const condStep = getStepById(target);
        if (condStep) {
          const nextIdx = state.currentStepIndex + 1;
          if (!stepOrder[nextIdx] || stepOrder[nextIdx].id !== condStep.id)
            stepOrder.splice(nextIdx, 0, condStep);
        }
      }
    }

    state.currentStepIndex++;

    if (state.currentStepIndex >= stepOrder.length) {
      startLoading();
      return;
    }

    // History API: push state para cada step (botão voltar navega entre steps)
    try {
      history.pushState({ vortx: "quiz", stepIndex: state.currentStepIndex }, "");
    } catch (err) {}

    const inter = INTERSTITIALS.find((i) => i.afterStep === (currentStep ? currentStep.id : null));
    if (inter) showInterstitial(inter);
    else renderStep();
  }

  // ── INTERSTITIAL DE FASE ──────────────────────────────────
  function showInterstitial(inter) {
    showScreen("interstitial");
    const container = document.getElementById("interstitial");
    // getText() é uma função que gera o texto com dados reais do state
    const dynamicText = typeof inter.getText === "function" ? inter.getText() : inter.text;

    container.innerHTML = `
      <div class="interstitial-image">
        <span class="interstitial-image-placeholder">${inter.emoji}</span>
      </div>
      <h2 class="interstitial-headline">${injectName(inter.headline)}</h2>
      <p class="interstitial-text">${dynamicText}</p>
      <p class="interstitial-stat">${inter.stat}</p>
      <button class="btn-cta" id="btn-inter-continue">${inter.cta || "Continuar"}</button>
    `;

    document.getElementById("btn-inter-continue").addEventListener("click", () => {
      showScreen("quiz");
      renderStep();
    });
  }

  // ── LOADING SCREEN ────────────────────────────────────────
  function startLoading() {
    showScreen("loading");
    if (window.vortxTrack) vortxTrack("quiz_complete");
    const name = state.userData.name || "tú";

    const testimonialsHtml = TESTIMONIALS.map((t, i) => `
      <div class="loading-testimonial-card ${i === 0 ? "active" : ""}" data-testimonial="${i}">
        <div class="loading-testimonial-header">
          <div class="loading-testimonial-avatar"><img src="${t.photo}" alt="${t.initials}" loading="lazy" decoding="async" width="80" height="80"></div>
          <div>
            <div class="loading-testimonial-name">${t.initials}, ${t.age}, ${t.occupation}</div>
            <div class="loading-testimonial-stars">★ ★ ★ ★ ★</div>
          </div>
        </div>
        <div class="loading-testimonial-text">"${t.text}"</div>
        <div class="loading-testimonial-result">
          <span class="loading-testimonial-badge">${t.result}</span>
          <span class="loading-testimonial-highlight">${t.highlight}</span>
        </div>
      </div>
    `).join("");

    document.getElementById("loading").innerHTML = `
      <div class="loading-rings">
        <div class="loading-ring"></div><div class="loading-ring"></div>
        <div class="loading-ring"></div><div class="loading-ring"></div>
        <div class="loading-percentage" id="loading-pct">0%</div>
      </div>
      <h2 class="loading-headline">${injectName(LOADING_DATA.headline)}</h2>
      <p class="loading-message" id="loading-msg">${injectName(LOADING_DATA.messages[0])}</p>
      <div class="loading-testimonials-carousel">${testimonialsHtml}</div>
      <div class="loading-testimonials-dots" id="testimonial-dots">
        ${TESTIMONIALS.map((_, i) => `<span class="dot ${i === 0 ? "active" : ""}" data-dot="${i}"></span>`).join("")}
      </div>
    `;

    calculateScore();

    const pctEl = document.getElementById("loading-pct");
    const msgEl = document.getElementById("loading-msg");
    const messages = LOADING_DATA.messages.map(m => injectName(m));
    const duration = LOADING_DATA.duration;
    const startTime = Date.now();
    let msgIdx = 0, testimonialIdx = 0;

    const msgInterval = setInterval(() => {
      msgIdx++;
      if (msgIdx >= messages.length) { clearInterval(msgInterval); return; }
      msgEl.style.opacity = "0";
      setTimeout(() => { msgEl.textContent = messages[msgIdx]; msgEl.style.opacity = "1"; }, 250);
    }, duration / messages.length);

    const testimonialInterval = setInterval(() => {
      const cards = document.querySelectorAll(".loading-testimonial-card");
      const dots  = document.querySelectorAll(".dot");
      if (!cards.length) { clearInterval(testimonialInterval); return; }
      cards[testimonialIdx].classList.remove("active");
      dots[testimonialIdx]?.classList.remove("active");
      testimonialIdx = (testimonialIdx + 1) % cards.length;
      cards[testimonialIdx].classList.add("active");
      dots[testimonialIdx]?.classList.add("active");
    }, 1800);

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
      pctEl.textContent = `${pct}%`;
      if (pct >= 100) {
        clearInterval(progressInterval);
        clearInterval(testimonialInterval);
        setTimeout(() => showResult(), 400);
      }
    }, 50);
  }

  // ── SCORE ─────────────────────────────────────────────────
  function calculateScore() {
    let totalWeight = 0, weightedScore = 0;
    const categoryScores = {};

    for (const step of STEPS) {
      if (!step.weight || step.weight === 0) continue;
      const answer = state.answers[step.id];
      if (answer === undefined) continue;
      totalWeight += step.weight;

      if (step.type === "single-select") {
        const opt = step.options.find((o) => o.value === answer);
        if (opt && opt.score !== undefined) {
          const maxScore = Math.max(...step.options.filter(o => o.score !== undefined).map(o => o.score));
          const norm = maxScore > 0 ? opt.score / maxScore : 0;
          weightedScore += norm * step.weight;
          if (step.category) categoryScores[step.category] = norm;
        }
      } else if (step.type === "multi-select" && Array.isArray(answer)) {
        const hasNone = answer.includes("nenhuma") || answer.includes("nenhum");
        if (hasNone) {
          weightedScore += step.weight;
          if (step.category) categoryScores[step.category] = 1;
        } else {
          const maxOpts = step.options.filter(o => o.value !== "nenhuma" && o.value !== "nenhum").length;
          const norm = Math.max(0, 1 - answer.length / maxOpts);
          weightedScore += norm * step.weight;
          if (step.category) categoryScores[step.category] = norm;
        }
      }
    }

    state.score = Math.round(Math.max(15, Math.min(92, totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 50)));
    state.criticalAreas = [];
    for (const [cat, sc] of Object.entries(categoryScores)) {
      const status = sc <= 0.25 ? "critical" : sc <= 0.5 ? "attention" : sc <= 0.75 ? "moderate" : "good";
      state.criticalAreas.push({ category: cat, score: sc, status, ...RESULT_DATA.criticalAreas[cat] });
    }
    state.criticalAreas.sort((a, b) => a.score - b.score);
  }

  // ── RESULT ────────────────────────────────────────────────
  function showResult() {
    showScreen("result");
    const score = state.score;
    if (window.vortxTrack) vortxTrack("view_result", { score: score });
    const zone  = RESULT_DATA.scoreZones.find((z) => score >= z.min && score <= z.max);
    const name  = state.userData.name || "Usuário";
    const circ  = 2 * Math.PI * 80;
    const offset= circ - (score / 100) * circ;

    const areasHtml = state.criticalAreas.map((a) => `
      <div class="critical-area-card">
        <span class="critical-area-icon">${a.icon}</span>
        <div>
          <div class="critical-area-label">${a.label}</div>
          <div class="critical-area-status status-${a.status}">${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</div>
        </div>
      </div>
    `).join("");

    document.getElementById("result").innerHTML = `
      <h2 class="heading-xl">${RESULT_DATA.headlineTemplate.replace("{name}", name)}</h2>
      <div class="result-gauge">
        <svg viewBox="0 0 200 200">
          <circle class="result-gauge-bg" cx="100" cy="100" r="80"/>
          <circle class="result-gauge-fill" cx="100" cy="100" r="80"
            style="stroke-dasharray:${circ};stroke-dashoffset:${circ};stroke:${zone.color};" id="gauge-fill"/>
        </svg>
        <div class="result-score-value">
          <div class="result-score-number" id="score-display" style="color:${zone.color}">0</div>
          <div class="result-score-out-of">/100</div>
          <div class="result-score-label" style="color:${zone.color}">${zone.label}</div>
        </div>
      </div>
      <p class="result-description">${zone.description}</p>
      <div class="result-critical-areas">${areasHtml}</div>
      <div class="result-urgency-block">
        <p class="result-urgency-text">Tus vasos se están cerrando ahora mismo, mientras lees esto. Cada mes sin actuar es más bloqueo, menos sangre, menos tamaño, menos duración — y este grado todavía tiene reversión, pero no para siempre.</p>
        <p class="result-urgency-subtext">El protocolo de reversión vascular fue calibrado para tu perfil exacto.</p>
      </div>
      <div style="width:100%;padding:20px 0;display:flex;justify-content:center;">
        <button class="btn-cta" id="btn-see-protocol">QUIERO VER LO QUE RESUELVE ESTO</button>
      </div>
    `;

    setTimeout(() => {
      document.getElementById("gauge-fill").style.strokeDashoffset = offset;
      animateNumber("score-display", 0, score, 1500);
    }, 300);

    document.getElementById("btn-see-protocol").addEventListener("click", showBridge);
  }

  function animateNumber(id, start, end, dur) {
    const el = document.getElementById(id);
    if (!el) return;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / dur, 1);
      el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── BRIDGE ────────────────────────────────────────────────
  function showBridge() {
    showScreen("bridge");
    const name  = state.userData.name || "tú";
    const score = state.score;

    const diasJanela = score <= 35 ? 47 : score <= 60 ? 90 : score <= 80 ? 180 : 365;
    const urgLabel   = score <= 35 ? "CRÍTICA" : score <= 60 ? "CORTA" : "ABIERTA";
    const urgColor   = score <= 35 ? "#C44B4B" : score <= 60 ? "#D4940A" : "#C9A84C";

    let bridgeText;
    if (score <= 35) {
      bridgeText = `${name}, tus vasos están casi cerrados — pero "casi" significa que todavía hay tiempo. El protocolo fue creado exactamente para este grado de bloqueo, para forzar la sangre a volver. No es para todos. Es para quien llegó hasta aquí y quiere el tamaño, la firmeza y la duración de vuelta.`;
    } else if (score <= 60) {
      bridgeText = `${name}, tus vasos se están cerrando, mes a mes. El tamaño ya bajó. La duración ya se acortó. El protocolo de reversión vascular está calibrado para tu grado exacto de bloqueo. Pero cada mes sin actuar cierra un vaso más.`;
    } else if (score <= 80) {
      bridgeText = `${name}, la caída todavía es sutil, pero está acelerando. En 2-3 años sin intervención, el daño se vuelve irreversible. El protocolo frena la caída y maximiza el flujo sanguíneo al pene mientras todavía hay tiempo.`;
    } else {
      bridgeText = `${name}, tus vasos todavía responden. Pero los factores de riesgo están ahí. El protocolo garantiza que mantengas y maximices cada centímetro, cada minuto de duración, cada erección — mientras los demás a tu alrededor van perdiendo.`;
    }

    document.getElementById("bridge").innerHTML = `
      <div class="bridge-container">
        <div class="bridge-icon">⚔️</div>
        <p class="bridge-label">PROTOCOLO ENCONTRADO</p>
        <div class="bridge-window-block">
          <span class="bridge-window-label">Ventana para actuar</span>
          <span class="bridge-window-status" style="color:${urgColor}">${urgLabel}</span>
          <span class="bridge-window-days" style="color:${urgColor}">${diasJanela} dias estimados</span>
        </div>
        <p class="bridge-text">${bridgeText}</p>
        <div class="bridge-divider"></div>
        <p class="bridge-warning">Protocolo generado en base a tus respuestas. Acceso restringido.</p>
        <button class="btn-cta" id="btn-bridge-continue">${BRIDGE_DATA.cta}</button>
      </div>
    `;

    document.getElementById("btn-bridge-continue").addEventListener("click", showProtocol);
  }

  // ── PROTOCOL ──────────────────────────────────────────────
  function showProtocol() {
    showScreen("protocol");
    const name     = state.userData.name || "tú";
    const painArea = state.answers[12];

    const headlineMap = {
      parceira: "El Protocolo Para Que Tu Pareja No Quiera Que Pares",
      eu_mesmo: "El Protocolo Para Que Vuelvas a Reconocerte Como Hombre",
      tudo:     "El Protocolo Para Recuperar Tamaño, Duración y Control — Todo de Vuelta",
      confianza:"El Protocolo Para Recuperar Tu Cuerpo y Tu Confianza",
    };
    const headline = headlineMap[painArea] || PROTOCOL_DATA.headline;

    const featuresHtml = PROTOCOL_DATA.features.map((f) => `
      <div class="protocol-feature">
        <div class="protocol-feature-icon">${f.icon}</div>
        <div>
          <div class="protocol-feature-title">${f.title}</div>
          <div class="protocol-feature-desc">${f.desc}</div>
        </div>
      </div>
    `).join("");

    // ── Depoimentos filtrados pela dor declarada ──
    const filtered = getFilteredTestimonials(painArea);
    const testimonialsHtml = filtered.map((t) => `
      <div class="testimonial-card">
        <div class="testimonial-header">
          <div class="testimonial-avatar"><img src="${t.photo}" alt="${t.initials}" loading="lazy" decoding="async" width="80" height="80"></div>
          <div><div class="testimonial-name">${t.initials}, ${t.age}, ${t.occupation}</div></div>
        </div>
        <p class="testimonial-text">"${t.text}"</p>
        <div class="testimonial-result">
          <span class="testimonial-score">${t.result}</span>
          <span class="testimonial-highlight">${t.highlight}</span>
        </div>
      </div>
    `).join("");

    document.getElementById("protocol").innerHTML = `
      <div style="text-align:center;">
        <p class="body-sm text-gold" style="letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Preparado para ${name}</p>
        <h2 class="heading-xl">${headline}</h2>
        <p class="body-md" style="margin-top:8px;">${PROTOCOL_DATA.subheadline}</p>
      </div>
      <div class="protocol-features">${featuresHtml}</div>
      <div class="protocol-seal">🏥 ${PROTOCOL_DATA.seal}</div>
      <div style="padding:16px 0;display:flex;justify-content:center;">
        <button class="btn-cta" id="btn-go-pricing">${PROTOCOL_DATA.cta}</button>
      </div>
      <div>
        <p class="testimonials-title">Hombres que tenían el mismo problema que tú</p>
        ${testimonialsHtml}
      </div>
    `;

    document.getElementById("btn-go-pricing").addEventListener("click", showPricing);
  }

  // ── PRICING ───────────────────────────────────────────────
  function showPricing() {
    showScreen("pricing");
    if (window.vortxTrack) vortxTrack("view_pricing", { score: state.score });

    const painArea  = state.answers[12];
    const name      = state.userData.name || "";
    const buildCheckoutCta = (planId) => {
      const plan = PRICING_DATA.plans.find((p) => p.id === planId);
      if (!plan) return "";
      return `<span style="display:block;font-size:0.65rem;letter-spacing:2px;opacity:0.7;margin-bottom:2px;">${plan.ctaTag}</span>${plan.ctaLabel}<br><span style="display:block;font-size:1.4rem;margin-top:4px;">$ ${plan.price}</span>`;
    };

    const plansHtml = PRICING_DATA.plans.map((plan) => {
      const isFeatured  = plan.id === "vitalicio";
      const isSelected  = plan.id === state.selectedPlan;
      const isDowngrade = plan.id === "mensal";
      const isAnchor    = plan.isAnchor === true;
      const featList    = plan.features.map((f) => `<li>${f}</li>`).join("");
      return `
        <div class="pricing-plan ${isFeatured ? "featured" : ""} ${isSelected ? "selected" : ""} ${isDowngrade ? "plan-downgrade" : ""} ${isAnchor ? "plan-anchor" : ""}" data-plan="${plan.id}">
          ${plan.badge ? `<div class="pricing-plan-badge-top">${plan.badge}</div>` : ""}
          ${isDowngrade ? `<div class="plan-downgrade-label">⚠ Versión limitada — sin protocolo vascular</div>` : ""}
          ${isAnchor ? `<div class="plan-anchor-label">⚠ Versión limitada — sin protocolo completo</div>` : ""}
          <div class="pricing-plan-header">
            <div class="pricing-plan-name">${plan.name}</div>
            <div class="pricing-plan-price-container">
              <div class="pricing-plan-original-price">$ ${plan.originalPrice}</div>
              <div class="pricing-plan-price"><span>$</span> ${plan.price}</div>
              <div class="pricing-plan-period">${plan.period}</div>
            </div>
          </div>
          <ul class="pricing-plan-features">${featList}</ul>
        </div>
      `;
    }).join("");

    originalPlansHtml = plansHtml;

    const selectedPrice = PRICING_DATA.plans.find((p) => p.id === state.selectedPlan).price;

    const score = state.score;
    const pricingHeadline = score <= 35
      ? `${name ? name + ", tus" : "Tus"} vasos están casi cerrados. Esta es la última ventana.`
      : score <= 60
      ? `${name ? name + ", el" : "El"} bloqueo todavía es reversible — pero no por mucho tiempo.`
      : `${name ? name + ", el" : "El"} protocolo vascular está listo. Solo falta tú.`;

    document.getElementById("pricing").innerHTML = `
      <div style="text-align:center;">
        <h2 class="heading-xl">${pricingHeadline}</h2>
      </div>

      <div class="pricing-timer-container">
        <div class="pricing-timer-label">${PRICING_DATA.urgencyText}</div>
        <div class="pricing-timer" id="pricing-timer">08:00</div>
        <div class="pricing-timer-sub">Después de esto el precio vuelve a $197</div>
      </div>

      <div class="pricing-social-counter">
        <div class="pricing-social-num" id="social-counter">17.483</div>
        <div class="pricing-social-txt">hombres ya empezaron el protocolo</div>
        <div class="pricing-social-live"><span class="pulse-dot"></span> 34 personas viendo esta página ahora mismo</div>
      </div>

      <div class="pricing-anchor-block">
        <p class="pricing-anchor-text">Cada mes sin actuar pierdes más tamaño, más firmeza, más duración. En 12 meses el daño se vuelve irreversible — y el costo de no actuar es perder lo que te hace hombre.</p>
      </div>

      <!-- HORMOZI VALUE STACK -->
      <div class="value-stack">
        <div class="value-stack-header">LO QUE RECIBES HOY:</div>
        <div class="value-stack-item">
          <div class="vsi-check">✓</div>
          <div class="vsi-content">
            <div class="vsi-title">Diagnóstico Vascular Personalizado</div>
            <div class="vsi-desc">Tu mapa exato de bloqueo basado en las respuestas del test</div>
          </div>
          <div class="vsi-price">$47</div>
        </div>
        <div class="value-stack-item">
          <div class="vsi-check">✓</div>
          <div class="vsi-content">
            <div class="vsi-title">Protocolo Vascular de 21 Días</div>
            <div class="vsi-desc">Las 4 rutinas casi ninguna toma más de 4 minutos al día</div>
          </div>
          <div class="vsi-price">$97</div>
        </div>
        <div class="value-stack-item">
          <div class="vsi-check">✓</div>
          <div class="vsi-content">
            <div class="vsi-title">Plan Alimentar Anti-Estrógeno</div>
            <div class="vsi-desc">Los 12 alimentos que disparan testosterona + los 10 que la destruyen</div>
          </div>
          <div class="vsi-price">$39</div>
        </div>
        <div class="value-stack-item">
          <div class="vsi-check">✓</div>
          <div class="vsi-content">
            <div class="vsi-title">Stack Hormonal Nocturno</div>
            <div class="vsi-desc">3 compuestos baratos que triplican tu testosterona mientras duermes</div>
          </div>
          <div class="vsi-price">$29</div>
        </div>
        <div class="value-stack-item value-stack-bonus">
          <div class="vsi-check">🎁</div>
          <div class="vsi-content">
            <div class="vsi-title">BONO: Acceso de por vida</div>
            <div class="vsi-desc">Todas las actualizaciones futuras incluidas — sin costo extra</div>
          </div>
          <div class="vsi-price">$47</div>
        </div>

        <div class="value-stack-total">
          <div class="vst-label">VALOR TOTAL:</div>
          <div class="vst-old">$259</div>
        </div>
        <div class="value-stack-today">
          <div class="vsth-label">HOY, SOLO HOY:</div>
          <div class="vsth-price"><span>$</span>17</div>
          <div class="vsth-tag">94% de descuento porque entraste por el diagnóstico gratuito</div>
        </div>
      </div>

      <div class="pricing-plans" style="display:none;">${plansHtml}</div>

      <div class="effort-box">
        <div class="effort-icon">⏱️</div>
        <div class="effort-content">
          <div class="effort-title">4 minutos al día. Sin pastillas. Sin receta.</div>
          <div class="effort-desc">Sin gimnasio, sin dietas extremas, sin productos químicos. Solo rutinas simples que cualquier hombre puede hacer en casa.</div>
        </div>
      </div>

      <div class="pricing-urgency-bio-block">
        <p class="pricing-urgency-bio-text">Esta noche vas a acostarte. Vas a mirar el techo y vas a saber que podrías haber hecho algo diferente. Mañana vas a despertar igual o peor. El bloqueo vascular no espera, no para, no negocia. <strong>La única pregunta es: ¿vas a actuar mientras todavía hay tiempo?</strong></p>
      </div>

      <!-- HORMOZI DOUBLE-YOUR-MONEY GUARANTEE -->
      <div class="guarantee-box guarantee-box--doubled">
        <div class="guarantee-shield">🛡️</div>
        <div class="guarantee-badge">GARANTÍA DEL DOBLE</div>
        <div class="guarantee-title-big">Resultado visible en 30 días — o te devuelvo el DOBLE.</div>
        <p class="guarantee-text-big">Si en 30 días tu pareja no nota el cambio sin que tengas que decirle nada, te devuelvo los $17 + otros $17 por mi error. <strong>Total: $34.</strong> El riesgo es 100% mío. Tú solo necesitas seguir el protocolo.</p>
        <div class="guarantee-small">Sin preguntas. Sin burocracia. Sin letra pequeña.</div>
      </div>

      <!-- WHATSAPP-STYLE TESTIMONIAL PLACEHOLDERS (you'll add real images here) -->
      <div class="whatsapp-testimonials" id="wa-testimonials">
        <div class="wa-test-header">📱 Mensajes reales de clientes</div>
        <div class="wa-test-grid">
          <div class="wa-placeholder" data-slot="1">
            <!-- Insert WhatsApp screenshot #1 here (upload to /img/wa1.jpg) -->
            <img src="img/wa1.jpg" alt="Mensaje de cliente" loading="lazy" onerror="this.style.display='none'">
          </div>
          <div class="wa-placeholder" data-slot="2">
            <img src="img/wa2.jpg" alt="Mensaje de cliente" loading="lazy" onerror="this.style.display='none'">
          </div>
          <div class="wa-placeholder" data-slot="3">
            <img src="img/wa3.jpg" alt="Mensaje de cliente" loading="lazy" onerror="this.style.display='none'">
          </div>
          <div class="wa-placeholder" data-slot="4">
            <img src="img/wa4.jpg" alt="Mensaje de cliente" loading="lazy" onerror="this.style.display='none'">
          </div>
        </div>
      </div>

      <div class="testimonial-pre-cta">
        <div class="testimonial-pre-cta-stars">★★★★★</div>
        <p class="testimonial-pre-cta-text">"En el día 14 mi esposa me miró distinto. No le dije nada. No tuve que hacerlo."</p>
        <span class="testimonial-pre-cta-author">— Roberto M., 44 años · México</span>
      </div>

      <div class="checkout-cta-block">
        <a href="https://pay.hotmart.com/U105461265V?checkoutMode=10" class="btn-cta btn-cta--checkout" id="btn-checkout" rel="noopener">${buildCheckoutCta(state.selectedPlan)}</a>
        <p class="checkout-sub">Acceso inmediato • Sin suscripción oculta • Garantía del DOBLE — 30 días</p>
        <div class="payment-methods">
          ${PRICING_DATA.paymentMethods.map((m) => `<span class="payment-method">${m}</span>`).join("")}
        </div>
      </div>

      <div class="final-reassurance">
        <div class="fr-item">🔒 Pago 100% seguro</div>
        <div class="fr-item">✉️ Acceso inmediato por email</div>
        <div class="fr-item">🛡️ Garantía del doble — 30 días</div>
      </div>
    `;

    // Animated social counter
    animateSocialCounter();

    // Exit intent popup (desktop mouseleave + mobile scroll up detection)
    setupExitIntent();


    // WhatsApp testimonial lightbox (tap to enlarge) — com suporte ao botão voltar
    document.querySelectorAll(".wa-placeholder img").forEach(function(img) {
      img.addEventListener("click", function(ev) {
        if (img.style.display === "none") return;
        ev.preventDefault();
        var overlay = document.createElement("div");
        overlay.className = "wa-lightbox";
        overlay.innerHTML = '<button class="wa-lightbox-close" aria-label="Cerrar">✕</button><img src="' + img.src + '" alt="">';
        document.body.appendChild(overlay);

        // Push state para botão voltar fechar o lightbox em vez de sair do site
        try { history.pushState({ vortx: "lightbox" }, ""); } catch (err) {}

        var closeLightbox = function() {
          // Se o state atual é o do lightbox, volta (dispara popstate que remove o overlay)
          if (history.state && history.state.vortx === "lightbox") {
            try { history.back(); return; } catch (err) {}
          }
          overlay.remove();
        };
        overlay.addEventListener("click", closeLightbox);
      });
    });

    rebindPlanSelection(buildCheckoutCta);



    // ── EXIT INTENT POPUP ─────────────────────────────────────
    // Oferta A (recomendada): guardar diagnóstico por 24h SEM desconto.
    // Captura WhatsApp/email para recovery. NÃO treina o lead a esperar desconto.
    function setupExitIntent() {
      if (state.exitIntentShown) return;
      if (sessionStorage.getItem("vx_exit_shown_v1")) return;

      var fired = false;
      function fire() {
        if (fired) return;
        fired = true;
        state.exitIntentShown = true;
        try { sessionStorage.setItem("vx_exit_shown_v1", "1"); } catch (e) {}
        showExitIntentPopup();
      }

      // DESKTOP: detecta mouse saindo do topo da viewport
      var mouseLeaveHandler = function (ev) {
        if (ev.clientY <= 0) fire();
      };
      document.addEventListener("mouseleave", mouseLeaveHandler);

      // MOBILE: detecta scroll rápido pra cima após chegar ao final
      var lastY = window.scrollY;
      var reachedBottom = false;
      var scrollHandler = function () {
        var currentY = window.scrollY;
        var pct = (currentY + window.innerHeight) / document.body.scrollHeight;
        if (pct > 0.70) reachedBottom = true;
        if (reachedBottom && lastY - currentY > 45) {
          // scroll UP rápido depois de ter descido → intent de sair
          fire();
        }
        lastY = currentY;
      };
      window.addEventListener("scroll", scrollHandler, { passive: true });

      // MOBILE FALLBACK: tempo longo parado sem scroll (60s) na pricing
      setTimeout(function () {
        if (!fired && window.scrollY < 200) fire();
      }, 60000);
    }

    function showExitIntentPopup() {
      if (document.getElementById("vx-exit-popup")) return;

      var userName = (state.userData && state.userData.name) || "";
      var prefillWhatsapp = (state.userData && state.userData.whatsapp) || "";

      var popup = document.createElement("div");
      popup.id = "vx-exit-popup";
      popup.className = "vx-exit-popup";
      popup.innerHTML = `
        <div class="vep-card">
          <button class="vep-close" aria-label="Cerrar">✕</button>
          <div class="vep-icon">⏸</div>
          <div class="vep-title">Espera${userName ? ", " + escapeHtml(userName) : ""} — antes de irte</div>
          <div class="vep-subtitle">¿Puedo hacer una cosa por ti?</div>
          <div class="vep-body">
            <p><strong>Te guardo tu diagnóstico gratis por 24 horas.</strong></p>
            <p>El precio de <span class="vep-price-now">$17</span> sigue disponible si decides volver. Después de eso, regresa a <span class="vep-price-old">$97</span>.</p>
            <p class="vep-note">Te lo mando a tu WhatsApp — sin spam, un único mensaje.</p>
          </div>
          <form class="vep-form" id="vep-form">
            <input type="tel" id="vep-whatsapp" placeholder="Tu WhatsApp (con código de país)" value="${prefillWhatsapp ? escapeHtml(prefillWhatsapp) : ""}" required>
            <button type="submit" class="vep-btn">GUÁRDAME EL DIAGNÓSTICO</button>
          </form>
          <button class="vep-skip" id="vep-skip">No gracias, cerrar</button>
          <div class="vep-footer">
            <span>🔒 100% privado</span>
            <span>•</span>
            <span>Un único mensaje</span>
            <span>•</span>
            <span>Sin spam</span>
          </div>
        </div>
      `;
      document.body.appendChild(popup);

      // Track
      if (window.vortxTrack) vortxTrack("exit_intent_shown");

      var closePopup = function () {
        popup.classList.add("vep-closing");
        setTimeout(function () { popup.remove(); }, 250);
      };

      popup.querySelector(".vep-close").addEventListener("click", closePopup);
      popup.querySelector("#vep-skip").addEventListener("click", function () {
        if (window.vortxTrack) vortxTrack("exit_intent_decline");
        closePopup();
      });

      // Click no overlay (fora do card) fecha
      popup.addEventListener("click", function (ev) {
        if (ev.target === popup) closePopup();
      });

      popup.querySelector("#vep-form").addEventListener("submit", function (ev) {
        ev.preventDefault();
        var wa = popup.querySelector("#vep-whatsapp").value.trim();
        if (!wa || wa.length < 7) return;

        // Persist para usar no recovery
        try {
          state.userData.whatsapp = wa;
          localStorage.setItem("vx_exit_recovery", JSON.stringify({
            whatsapp: wa,
            name: userName,
            timestamp: Date.now(),
            plan: state.selectedPlan
          }));
        } catch (e) {}

        if (window.vortxTrack) {
          vortxTrack("exit_intent_captured", {
            has_whatsapp: true,
            plan: state.selectedPlan
          });
        }

        // Mostrar confirmação dentro do próprio popup
        popup.querySelector(".vep-card").innerHTML = `
          <div class="vep-success">
            <div class="vep-success-icon">✓</div>
            <div class="vep-success-title">¡Diagnóstico guardado!</div>
            <p>Te mando el resumen en un momento. El precio de $17 sigue disponible por 24 horas.</p>
            <button class="vep-btn vep-btn-back" id="vep-stay">Seguir aquí y ver la oferta</button>
          </div>
        `;
        popup.querySelector("#vep-stay").addEventListener("click", closePopup);
      });
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    // ── CHECKOUT TRANSITION SCREEN ────────────────────────────
    // Tela de preparação mental antes do redirect para Hotmart
    function showCheckoutTransition() {
      var existing = document.getElementById("checkout-transition");
      if (existing) return;

      var overlay = document.createElement("div");
      overlay.id = "checkout-transition";
      overlay.className = "checkout-transition";
      overlay.innerHTML = `
        <div class="ct-card">
          <div class="ct-spinner">
            <div class="ct-spinner-ring"></div>
            <div class="ct-spinner-lock">🔒</div>
          </div>
          <div class="ct-title">Preparando tu pago seguro</div>
          <div class="ct-steps">
            <div class="ct-step ct-step-1">
              <span class="ct-check">✓</span>
              <span>Datos validados</span>
            </div>
            <div class="ct-step ct-step-2">
              <span class="ct-check">✓</span>
              <span>Conexión cifrada SSL</span>
            </div>
            <div class="ct-step ct-step-3">
              <span class="ct-check">✓</span>
              <span>Conectando con Hotmart...</span>
            </div>
          </div>
          <div class="ct-footer">
            <img src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23C9A84C\'><path d=\'M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z\'/></svg>" alt="" class="ct-badge-icon">
            <span>Procesado por <strong>Hotmart</strong> — plataforma segura usada por 500.000+ negocios</span>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Animar os checks sequencialmente
      setTimeout(function(){ overlay.querySelector(".ct-step-1").classList.add("done"); }, 200);
      setTimeout(function(){ overlay.querySelector(".ct-step-2").classList.add("done"); }, 600);
      setTimeout(function(){ overlay.querySelector(".ct-step-3").classList.add("done"); }, 1000);
    }

    document.getElementById("btn-checkout").addEventListener("click", (ev) => {
      ev.preventDefault();

      var selectedPlan = state.selectedPlan;
      var plan  = PRICING_DATA.plans.find(function (p) { return p.id === selectedPlan; });
      var price = plan ? plan.price : 0;

      // ── DISPARO SÍNCRONO DO InitiateCheckout ──────────────────
      // vortxTrackSync força load do pixel E dispara fbq imediatamente.
      // Retorna o event_id — fundamental para desduplicar com a Hotmart CAPI.
      var eventId = null;
      if (window.vortxTrackSync) {
        eventId = window.vortxTrackSync("begin_checkout", {
          value:    price,
          currency: "USD",
          plan:     selectedPlan
        });
      } else if (window.vortxTrack) {
        // Fallback
        vortxTrack("begin_checkout", { value: price, currency: "USD", plan: selectedPlan });
      }

      // ── MONTAGEM DA URL COM ATRIBUIÇÃO ─────────────────────────
      // Parâmetros nativos do quiz
      var userName = encodeURIComponent(state.userData.name || "");
      var baseUrl  = selectedPlan === "esencial"
        ? "https://pay.hotmart.com/U105461265V?off=tjhgh4hs&checkoutMode=10"
        : "https://pay.hotmart.com/U105461265V?checkoutMode=10";
      var checkoutUrl = baseUrl + "&name=" + userName + "&plan=" + selectedPlan + "&value=" + price;
      if (state.userData.whatsapp) checkoutUrl += "&phonenumber=" + encodeURIComponent(state.userData.whatsapp);

      // Atribuição Meta Ads (fbclid, fbp, fbc) + sck único + UTMs
      // sck é a chave única por visitante, gerada em tracking-stub.js
      // e incluída automaticamente no dataLayer.push de begin_checkout.
      // Cruza dados client-side (Stape Store, gravado pela Tag BD InitiateCheckout)
      // com o webhook server-side da Hotmart.
      try {
        // sck único por visitante (mesmo que vai no dataLayer do begin_checkout)
        var sck = window.vortxGetOrCreateSck ? window.vortxGetOrCreateSck() : null;
        if (sck) checkoutUrl += "&sck=" + encodeURIComponent(sck);

        if (window.vortxGetAttribution) {
          var attr = window.vortxGetAttribution();
          // fbclid é o parâmetro que a Hotmart reconhece nativamente
          if (attr.fbclid) checkoutUrl += "&fbclid=" + encodeURIComponent(attr.fbclid);
          // Passamos fbp/fbc + event_id dentro de xcod (string arbitrária que volta no postback)
          var xcodParts = [];
          if (eventId)   xcodParts.push("eid=" + eventId);
          if (attr.fbp)  xcodParts.push("fbp=" + attr.fbp);
          if (attr.fbc)  xcodParts.push("fbc=" + attr.fbc);
          if (xcodParts.length) {
            checkoutUrl += "&xcod=" + encodeURIComponent(xcodParts.join("|"));
          }
          // src recebe utm_campaign (campo separado do sck, não conflita)
          if (attr.utm_campaign) checkoutUrl += "&src=" + encodeURIComponent(attr.utm_campaign);
        }
      } catch (e) {}

      // ── TELA DE TRANSIÇÃO "PREPARANDO TU PAGO" ──────────────
      // Prepara mentalmente o lead para o redirect (evita estranhamento
      // ao ver pay.hotmart.com na barra de endereço) + dá tempo para o
      // Pixel do Meta disparar antes da navegação.
      // Atualiza href do <a> para que GTM detecte navegação correta como gtm.linkClick
      try { ev.target.closest("a").setAttribute("href", checkoutUrl); } catch(_) {}
      showCheckoutTransition();
      setTimeout(function () {
        try { clearProgress(); } catch(e){}
        window.location.href = checkoutUrl;
      }, 1400);
    });
    startPricingTimer();
  }

  function startPricingTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.timerSeconds--;
      if (state.timerSeconds <= 0) {
        clearInterval(state.timerInterval);
        state.timerSeconds = 0;
        const timerEl = document.getElementById("pricing-timer");
        if (timerEl) timerEl.textContent = "00:00";
        const plansEl = document.querySelector(".pricing-plans");
        if (plansEl) {
          plansEl.innerHTML = `
            <div class="timer-expired-block">
              <div class="timer-expired-icon">⏰</div>
              <p class="timer-expired-title">Este precio ya no está disponible.</p>
              <p class="timer-expired-text">El precio especial expiró y el protocolo volvió a $197.</p>
              <button class="btn-cta" id="btn-recover-offer">QUIERO 10 MINUTOS MÁS CON EL PRECIO ESPECIAL</button>
            </div>
          `;
          document.getElementById("btn-recover-offer").addEventListener("click", () => {
            state.timerSeconds = 10 * 60;
            plansEl.innerHTML = originalPlansHtml;
            rebindPlanSelection((planId) => {
              const plan = PRICING_DATA.plans.find((p) => p.id === planId);
              if (!plan) return "";
              return `<span style="display:block;font-size:0.65rem;letter-spacing:2px;opacity:0.7;margin-bottom:2px;">${plan.ctaTag}</span>${plan.ctaLabel}<br><span style="display:block;font-size:1.4rem;margin-top:4px;">$ ${plan.price}</span>`;
            });
            startPricingTimer();
          });
        }
        return;
      }
      const m = Math.floor(state.timerSeconds / 60);
      const s = state.timerSeconds % 60;
      const el = document.getElementById("pricing-timer");
      if (el) el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      if (state.timerSeconds <= 60) document.getElementById("pricing-timer")?.classList.add("timer-critical");
    }, 1000);
  }

  let originalPlansHtml = "";

  function rebindPlanSelection(buildCtaFn) {
    document.querySelectorAll(".pricing-plan").forEach((el) => {
      el.addEventListener("click", function () {
        document.querySelectorAll(".pricing-plan").forEach((p) => p.classList.remove("selected"));
        this.classList.add("selected");
        state.selectedPlan = this.dataset.plan;
        const btn   = document.getElementById("btn-checkout");
        if (btn && buildCtaFn) btn.innerHTML = buildCtaFn(state.selectedPlan);
      });
    });
  }

  // ── THANK YOU ─────────────────────────────────────────────
  function showThankYou() {
    showScreen("thankyou");
    const name = state.userData.name || "Usuário";
    const stepsHtml = THANKYOU_DATA.steps.map((s) => `
      <div class="thankyou-step">
        <div class="thankyou-step-number">${s.number}</div>
        <div>
          <div class="thankyou-step-title">${s.title}</div>
          <div class="thankyou-step-desc">${s.desc}</div>
        </div>
      </div>
    `).join("");
    document.getElementById("thankyou").innerHTML = `
      <div class="thankyou-checkmark">✓</div>
      <div>
        <h2 class="heading-xl">${THANKYOU_DATA.headline.replace("{name}", name)}</h2>
        <p class="body-md" style="margin-top:8px;text-align:center;">${THANKYOU_DATA.subheadline}</p>
      </div>
      <div class="thankyou-steps">${stepsHtml}</div>
      <button class="btn-cta" id="btn-access-app">${THANKYOU_DATA.cta}</button>
      <p class="body-sm" style="text-align:center;">Diagnóstico enviado para o WhatsApp <strong>${state.userData.whatsapp || "informado"}</strong></p>
    `;
    document.getElementById("btn-access-app").addEventListener("click", () => { /* CHECKOUT */ });
    if (state.timerInterval) clearInterval(state.timerInterval);
  }

  // ── INIT ──────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", init);
})();
