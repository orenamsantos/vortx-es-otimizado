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

  // ── STATE ─────────────────────────────────────────────────
  const state = {
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
      afterStep: 4,
      emoji: "🔬",
      headline: '{name}, esto tiene nombre: <span class="highlight">bloqueo vascular peniano.</span>',
      getText: () => "No es la edad. Es obstrucción en los vasos que llevan sangre al pene. Ahora vamos a mapear el daño.",
      stat: "Quien identifica el patrón ahora tiene 3.7x más posibilidades de revertirlo.",
      cta: "MAPEAR EL DAÑO",
    },
    {
      afterStep: 11,
      emoji: "🧠",
      headline: 'O mapa vascular de <span class="highlight">{name}</span> não é bonito.',
      getText: () => {
        const manha = state.answers[9];
        const sono  = state.answers[10];
        const nome  = state.userData.name || "tú";

        if (manha === "zumbi") {
          return `${nome}, seu corpo não se recupera à noite. Cortisol come sua testosterona viva. Cada noite assim é mais dano.`;
        }
        if (manha === "odio") {
          return `${nome}, eso no es excusa. Es testosterona por el suelo. Cuando la sangre no circula, el pene es lo primero en sufrir.`;
        }
        if (sono === "pessimo") {
          return `${nome}, sem sono profundo não tem testosterona. Sem testosterona não tem tamanho, firmeza ou duração.`;
        }
        if (sono === "superficial") {
          return `${nome}, dormir sem descansar é carregar o celular com o fio solto. De manhã a bateria tá em 12%.`;
        }
        return "Tus vasos se están cerrando. Ahora cruzamos con tus hábitos para descubrir qué está acelerando eso.";
      },
      stat: "93% dos homens com esse perfil respondem ao protocolo em menos de 21 dias.",
      cta: "VER MEUS HÁBITOS",
    },
    {
      afterStep: 14,
      emoji: "🔴",
      headline: 'Você vai ver um número agora. <span class="highlight">Ele revela o quanto seus vasos já fecharam.</span>',
      getText: () => {
        const nome = state.userData.name || "tú";
        return `${nome}, el sistema cruzó tus respuestas con 17.483 diagnósticos. Algunos hombres quedan en shock, otros sienten alivio. Prepárate.`;
      },
      stat: "A maioria dos homens nunca soube que esse número existia.",
      cta: "VER MEU DIAGNÓSTICO",
    },
  ];

  // ── INIT ──────────────────────────────────────────────────
  function init() {
    buildStepOrder();
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
      state.currentStepIndex--;
      renderStep();
    }
  }

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
      function showWhatsappError(msg) {
        const wrapper = input.closest(".input-group");
        let err = wrapper.querySelector(".whatsapp-error");
        if (msg) {
          if (!err) { err = document.createElement("span"); err.className = "whatsapp-error"; wrapper.appendChild(err); }
          err.textContent = msg; input.classList.add("input-error");
        } else { if (err) err.remove(); input.classList.remove("input-error"); }
      }
      function validateWhatsapp(digits) {
        if (digits.length === 0) return null;
        const ddd = parseInt(digits.substring(0, 2), 10);
        if (ddd < 11 || ddd > 99) return "DDD inválido";
        if (digits.length === 11 && digits[2] !== "9") return "Número deve começar com 9";
        if (/^(\d)\1+$/.test(digits.substring(2))) return "Número inválido";
        if (digits.length === 11) return null;
        return null;
      }
      input.addEventListener("input", function () {
        let v = this.value.replace(/\D/g, "").substring(0, 12);
        if (v.length > 6)      v = `(${v.substring(0,2)}) ${v.substring(2,7)}-${v.substring(7)}`;
        else if (v.length > 2) v = `(${v.substring(0,2)}) ${v.substring(2)}`;
        else if (v.length > 0) v = `(${v}`;
        this.value = v;
        const digits = this.value.replace(/\D/g, "");
        const errorMsg = validateWhatsapp(digits);
        const complete = digits.length === 11 && !errorMsg;
        showWhatsappError(errorMsg);
        if (btnContinue) btnContinue.disabled = !complete;
        state.userData.whatsapp = complete ? `+55${digits}` : "";
        const ddiEl = document.getElementById("ddi-select");
        const ddi = ddiEl ? ddiEl.value : "+52";
        state.userData.whatsapp = ddi + " " + state.userData.whatsapp;
        state.answers[step.id] = state.userData.whatsapp;
      });
      setTimeout(() => input.focus(), 400);
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
    const painArea = state.answers[10];

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

    const painArea  = state.answers[10];
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
      const featList    = plan.features.map((f) => `<li>${f}</li>`).join("");
      return `
        <div class="pricing-plan ${isFeatured ? "featured" : ""} ${isSelected ? "selected" : ""} ${isDowngrade ? "plan-downgrade" : ""}" data-plan="${plan.id}">
          ${plan.badge ? `<div class="pricing-plan-badge">${plan.badge}</div>` : ""}
          ${isDowngrade ? `<div class="plan-downgrade-label">⚠ Versión limitada — sin protocolo vascular</div>` : ""}
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

      <div class="pricing-anchor-block">
        <p class="pricing-anchor-text">Cada mes sin actuar pierdes más tamaño, más firmeza, más duración. En 12 meses el daño se vuelve irreversible — y el costo de no actuar es perder lo que te hace hombre.</p>
        <p class="pricing-anchor-sub">El acceso completo cuesta menos que una cena — y puede cambiar los próximos 20 años de tu vida.</p>
      </div>

      <div class="pricing-plans">${plansHtml}</div>

      <div class="pricing-urgency-bio-block">
        <p class="pricing-urgency-bio-text">Esta noche vas a acostarte. Vas a mirar el techo y vas a saber que podrías haber hecho algo diferente. Mañana vas a despertar igual o peor. El bloqueo vascular no espera, no para, no negocia. <strong>La única pregunta es: ¿vas a actuar mientras todavía hay tiempo?</strong></p>
      </div>

      <div class="guarantee-box guarantee-box--pre-cta">
        <div class="guarantee-icon">${PRICING_DATA.guarantee.icon}</div>
        <div class="guarantee-title">${PRICING_DATA.guarantee.title}</div>
        <p class="guarantee-text">${PRICING_DATA.guarantee.text}</p>
      </div>

      <div class="checkout-cta-block">
        <button class="btn-cta btn-cta--checkout" id="btn-checkout">${buildCheckoutCta(state.selectedPlan)}</button>
        <p class="checkout-sub">Acceso inmediato • Sin suscripción oculta • Garantía de 30 días</p>
        <div class="payment-methods">
          ${PRICING_DATA.paymentMethods.map((m) => `<span class="payment-method">${m}</span>`).join("")}
        </div>
      </div>
    `;

    rebindPlanSelection(buildCheckoutCta);

    document.getElementById("btn-checkout").addEventListener("click", () => {
      var plan = PRICING_DATA.plans.find(function(p) { return p.id === state.selectedPlan; });
      if (window.vortxTrack) vortxTrack("begin_checkout", { value: plan ? plan.price : 0, currency: "USD", plan: state.selectedPlan });
      var plan = state.selectedPlan;
      var price = PRICING_DATA.plans.find(function(p) { return p.id === plan; }).price;
      var userName = encodeURIComponent(state.userData.name || "");
      var baseUrl = "https://pay.hotmart.com/U105461265V?checkoutMode=10";
      var checkoutUrl = baseUrl + "?name=" + userName + "&plan=" + plan + "&value=" + price;
      if (state.userData.whatsapp) checkoutUrl += "&phonenumber=" + encodeURIComponent(state.userData.whatsapp);
      window.location.href = checkoutUrl;
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
              <p class="timer-expired-title">Esse preço acabou.</p>
              <p class="timer-expired-text">O valor de R$67 não está mais disponível e o protocolo voltou para R$197.</p>
              <button class="btn-cta" id="btn-recover-offer">QUERO MAIS 10 MINUTOS COM O PREÇO ESPECIAL</button>
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
