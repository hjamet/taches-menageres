(function() {
"use strict";

// Moteur Core global classique (compatibilité 100% WebView file:// Android)
const Core = window.Core || window.ChoreCore;

// Clés de persistance locale
const STORAGE_KEY_SESSIONS = "taches_menageres_sessions";
const STORAGE_KEY_USER = "taches_menageres_active_user";
const STORAGE_KEY_PROFILE_LEGACY = "taches_menageres_active_profile";
const STORAGE_KEY_TIMER = "taches_menageres_timer_state";
const STORAGE_KEY_CUSTOM_TAGS = (Core && Core.STORAGE_KEY_CUSTOM_TAGS) || "taches_menageres_custom_tags";

function loadCustomTags() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_TAGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed).flat().filter(Boolean);
      }
    }
  } catch (err) {
    console.error("Erreur lecture custom tags:", err);
  }
  return [];
}

function saveCustomTags() {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TAGS, JSON.stringify(state.customTags));
  } catch (err) {
    console.error("Erreur écriture custom tags:", err);
  }
}

// État global de l'application
const state = {
  activePerson: localStorage.getItem(STORAGE_KEY_USER) || localStorage.getItem(STORAGE_KEY_PROFILE_LEGACY) || "",
  sessions: [],
  timerState: Core.createTimerState(),
  timerIntervalId: null,
  activeTab: "timer",
  statsPeriod: "all",
  customTags: loadCustomTags(),

  // État de la modale en cours
  modal: {
    isOpen: false,
    isManual: false,
    startTimeIso: null,
    endTimeIso: null,
    durationSeconds: 0,
    selectedRooms: [],
    selectedTags: []
  }
};

// Éléments DOM
const DOM = {
  // Profil Header & Modale Profil
  btnCurrentProfile: document.getElementById("btnCurrentProfile"),
  profileChipAvatar: document.getElementById("profileChipAvatar"),
  profileChipName: document.getElementById("profileChipName"),
  profileModal: document.getElementById("profileModal"),
  btnProfileModalClose: document.getElementById("btnProfileModalClose"),

  // Timer gros bouton rond
  btnMainTimer: document.getElementById("btnMainTimer"),
  btnMainTimerIcon: document.getElementById("btnMainTimerIcon"),
  btnMainTimerLabel: document.getElementById("btnMainTimerLabel"),
  timerDigits: document.getElementById("timerDigits"),
  timerStatusBadge: document.getElementById("timerStatusBadge"),
  timerStatusText: document.getElementById("timerStatusText"),
  timerPersonIndicator: document.getElementById("timerPersonIndicator"),
  timerSubActions: document.getElementById("timerSubActions"),
  btnPauseTimer: document.getElementById("btnPauseTimer"),
  btnPauseIcon: document.getElementById("btnPauseIcon"),
  btnPauseLabel: document.getElementById("btnPauseLabel"),
  btnCancelTimer: document.getElementById("btnCancelTimer"),
  btnManualEntry: document.getElementById("btnManualEntry"),

  // Tabs
  tabNav: document.querySelector(".tab-nav"),
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),

  // Modal qualification tâche
  taskModal: document.getElementById("taskModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalRoomGrid: document.getElementById("modalRoomGrid"),
  modalTagsContainer: document.getElementById("modalTagsContainer"),
  inputCustomTag: document.getElementById("inputCustomTag"),
  btnAddCustomTag: document.getElementById("btnAddCustomTag"),
  inputDurationMinutes: document.getElementById("inputDurationMinutes"),
  durationFormattedPreview: document.getElementById("durationFormattedPreview"),
  inputNote: document.getElementById("inputNote"),
  btnModalClose: document.getElementById("btnModalClose"),
  btnModalCancel: document.getElementById("btnModalCancel"),
  btnModalSave: document.getElementById("btnModalSave"),

  // Stats
  statsPeriodFilter: document.getElementById("statsPeriodFilter"),
  statHenriTime: document.getElementById("statHenriTime"),
  statHenriSub: document.getElementById("statHenriSub"),
  statAnnabelleTime: document.getElementById("statAnnabelleTime"),
  statAnnabelleSub: document.getElementById("statAnnabelleSub"),
  labelHenriPct: document.getElementById("labelHenriPct"),
  labelAnnabellePct: document.getElementById("labelAnnabellePct"),
  progressBarHenri: document.getElementById("progressBarHenri"),
  progressBarAnnabelle: document.getElementById("progressBarAnnabelle"),
  statsRoomsList: document.getElementById("statsRoomsList"),
  statsTagsList: document.getElementById("statsTagsList"),

  // History
  historyPersonFilter: document.getElementById("historyPersonFilter"),
  historyRoomFilter: document.getElementById("historyRoomFilter"),
  historyList: document.getElementById("historyList"),
  btnExportCsv: document.getElementById("btnExportCsv"),
  btnImportCsv: document.getElementById("btnImportCsv"),
  btnExportJson: document.getElementById("btnExportJson"),
  btnImportJson: document.getElementById("btnImportJson"),
  fileCsvInput: document.getElementById("fileCsvInput"),
  fileJsonInput: document.getElementById("fileJsonInput"),

  // Toast
  toastContainer: document.getElementById("toastContainer")
};

// Afficher un message Toast éphémère
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3200);
}

// Persistance et chargement des données
function loadSessions() {
  let loaded = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (raw) {
      loaded = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Erreur lecture localStorage:", err);
  }

  // Vérifier sauvegarde native Android si disponible
  if (window.AndroidNativeBridge && typeof window.AndroidNativeBridge.loadBackupJson === "function") {
    try {
      const nativeRaw = window.AndroidNativeBridge.loadBackupJson();
      if (nativeRaw && nativeRaw.trim().length > 0) {
        const parsed = JSON.parse(nativeRaw);
        if (Array.isArray(parsed)) {
          // Format brut V1 (tableau de sessions)
          const map = new Map();
          for (const s of parsed) if (s && s.id) map.set(s.id, s);
          for (const s of loaded) if (s && s.id) map.set(s.id, s);
          loaded = Array.from(map.values());
        } else if (parsed && typeof parsed === "object") {
          // Format structuré V2
          if (Array.isArray(parsed.sessions)) {
            const map = new Map();
            for (const s of parsed.sessions) if (s && s.id) map.set(s.id, s);
            for (const s of loaded) if (s && s.id) map.set(s.id, s);
            loaded = Array.from(map.values());
          }
          if (Array.isArray(parsed.customTags) && state.customTags.length === 0) {
            state.customTags = parsed.customTags;
            saveCustomTags();
          }
          if (parsed.activeUser && !state.activePerson) {
            state.activePerson = parsed.activeUser;
            localStorage.setItem(STORAGE_KEY_USER, parsed.activeUser);
          }
        }
      }
    } catch (err) {
      console.warn("Erreur chargement AndroidNativeBridge:", err);
    }
  }

  state.sessions = Array.isArray(loaded) ? loaded : [];
}

function saveSessions() {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(state.sessions));
  } catch (err) {
    console.error("Erreur écriture localStorage:", err);
  }

  // Sauvegarde native Android indestructible (avec customTags et profil actif)
  if (window.AndroidNativeBridge && typeof window.AndroidNativeBridge.saveBackupJson === "function") {
    try {
      const backupPayload = JSON.stringify({
        version: 2,
        activeUser: state.activePerson,
        customTags: state.customTags,
        sessions: state.sessions
      });
      window.AndroidNativeBridge.saveBackupJson(backupPayload);
    } catch (err) {
      console.warn("Erreur sauvegarde AndroidNativeBridge:", err);
    }
  }

  // Synchronisation SQLite serveur local si accessible
  syncToServer();
}

async function syncToServer() {
  try {
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.sessions)
    }).catch(() => {
      // Hors-ligne normal
    });
  } catch {
    // Hors-ligne
  }
}

// Gestion du profil actif (Henri ou Annabelle)
function setProfile(person) {
  if (!person || (person !== "Henri" && person !== "Annabelle")) {
    person = "Henri";
  }

  state.activePerson = person;
  localStorage.setItem(STORAGE_KEY_USER, person);
  localStorage.setItem(STORAGE_KEY_PROFILE_LEGACY, person);

  // Mettre à jour la pastille dans l'en-tête
  DOM.profileChipName.textContent = person;
  DOM.profileChipAvatar.textContent = person === "Annabelle" ? "👩" : "👨";
  DOM.btnCurrentProfile.className = `profile-chip ${person.toLowerCase()}`;

  DOM.timerPersonIndicator.textContent = `Profil actif : ${person}`;

  // Fermer la modale de profil si elle était ouverte
  closeProfileModal();

  // Sauvegarder dans AndroidNativeBridge
  saveSessions();

  renderStats();
}

function openProfileModal(canClose = true) {
  DOM.btnProfileModalClose.style.display = canClose ? "block" : "none";
  DOM.profileModal.classList.add("open");
}

function closeProfileModal() {
  DOM.profileModal.classList.remove("open");
}

// Gestion des onglets
function switchTab(tabId) {
  state.activeTab = tabId;
  DOM.tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  DOM.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${tabId}`);
  });

  if (tabId === "stats") {
    renderStats();
  } else if (tabId === "history") {
    renderHistory();
  }
}

// Gestion du Timer
function saveTimerState() {
  try {
    localStorage.setItem(STORAGE_KEY_TIMER, JSON.stringify(state.timerState));
  } catch (err) {
    console.error("Erreur saveTimerState:", err);
  }
}

function restoreTimerState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TIMER);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.status === "RUNNING" || parsed.status === "PAUSED")) {
        state.timerState = parsed;
        updateTimerDisplay();
        startTimerTick();
      }
    }
  } catch (err) {
    console.error("Erreur restoreTimerState:", err);
  }
}

function updateTimerDisplay() {
  const elapsed = Core.getElapsedSeconds(state.timerState);
  DOM.timerDigits.textContent = Core.formatDurationHms(elapsed);

  if (state.timerState.status === "RUNNING") {
    DOM.timerStatusBadge.className = "timer-status-badge running";
    const startTimeStr = state.timerState.startTimeMs
      ? new Date(state.timerState.startTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    DOM.timerStatusText.textContent = `En cours (depuis ${startTimeStr})`;

    // Gros bouton rond : état RUNNING
    DOM.btnMainTimer.className = "big-round-btn running";
    DOM.btnMainTimerIcon.textContent = "⏹";
    DOM.btnMainTimerLabel.textContent = "ARRÊTER & QUALIFIER";

    DOM.timerSubActions.style.display = "flex";
    DOM.btnPauseIcon.textContent = "⏸";
    DOM.btnPauseLabel.textContent = "Pause";
  } else if (state.timerState.status === "PAUSED") {
    DOM.timerStatusBadge.className = "timer-status-badge paused";
    DOM.timerStatusText.textContent = "En pause";

    // Gros bouton rond : état PAUSED
    DOM.btnMainTimer.className = "big-round-btn paused";
    DOM.btnMainTimerIcon.textContent = "▶";
    DOM.btnMainTimerLabel.textContent = "REPRENDRE";

    DOM.timerSubActions.style.display = "flex";
    DOM.btnPauseIcon.textContent = "▶";
    DOM.btnPauseLabel.textContent = "Reprendre";
  } else {
    DOM.timerStatusBadge.className = "timer-status-badge";
    DOM.timerStatusText.textContent = "Prêt à démarrer";

    // Gros bouton rond : état IDLE
    DOM.btnMainTimer.className = "big-round-btn idle";
    DOM.btnMainTimerIcon.textContent = "▶";
    DOM.btnMainTimerLabel.textContent = "DÉMARRER";

    DOM.timerSubActions.style.display = "none";
  }
}

function startTimerTick() {
  if (state.timerIntervalId) clearInterval(state.timerIntervalId);
  state.timerIntervalId = setInterval(() => {
    if (state.timerState.status === "RUNNING") {
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimerTick() {
  if (state.timerIntervalId) {
    clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
}

function onMainTimerClick() {
  if (state.timerState.status === "IDLE") {
    // Démarrage du chronomètre en 1 clic
    state.timerState = Core.startTimer(state.timerState);
    saveTimerState();
    updateTimerDisplay();
    startTimerTick();
    showToast(`Chronomètre démarré pour ${state.activePerson || "Henri"}`);
  } else if (state.timerState.status === "PAUSED") {
    // Reprise du chronomètre
    state.timerState = Core.resumeTimer(state.timerState);
    saveTimerState();
    updateTimerDisplay();
  } else {
    // Arrêt et ouverture de la modale de qualification
    const finalElapsed = Core.getElapsedSeconds(state.timerState);
    const endIso = new Date().toISOString();
    const startIso = state.timerState.startTimeMs
      ? new Date(state.timerState.startTimeMs).toISOString()
      : new Date(Date.now() - finalElapsed * 1000).toISOString();

    openQualificationModal({
      isManual: false,
      startIso,
      endIso,
      durationSeconds: Math.max(1, finalElapsed)
    });
  }
}

function onPauseTimerClick() {
  if (state.timerState.status === "RUNNING") {
    state.timerState = Core.pauseTimer(state.timerState);
    saveTimerState();
    updateTimerDisplay();
  } else if (state.timerState.status === "PAUSED") {
    state.timerState = Core.resumeTimer(state.timerState);
    saveTimerState();
    updateTimerDisplay();
  }
}

function onCancelTimerClick() {
  if (confirm("Voulez-vous vraiment annuler le chronométrage en cours ?")) {
    state.timerState = Core.createTimerState();
    saveTimerState();
    stopTimerTick();
    updateTimerDisplay();
    showToast("Chronomètre annulé.");
  }
}

// Modale de qualification / Saisie manuelle
function openQualificationModal({ isManual = false, startIso, endIso, durationSeconds = 900 }) {
  state.modal.isOpen = true;
  state.modal.isManual = isManual;
  state.modal.startTimeIso = startIso || new Date(Date.now() - durationSeconds * 1000).toISOString();
  state.modal.endTimeIso = endIso || new Date().toISOString();
  state.modal.durationSeconds = durationSeconds;
  state.modal.selectedRooms = [];
  state.modal.selectedTags = [];

  DOM.modalTitle.textContent = isManual ? "Saisie manuelle d'une tâche" : "Qualifier la tâche terminée";
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
  DOM.inputDurationMinutes.value = durationMinutes;
  DOM.durationFormattedPreview.textContent = `(${Core.formatDurationHm(durationMinutes * 60)})`;
  DOM.inputNote.value = "";
  DOM.inputCustomTag.value = "";

  renderModalRooms();
  renderModalTags();

  DOM.taskModal.classList.add("open");
}

function closeModal() {
  state.modal.isOpen = false;
  DOM.taskModal.classList.remove("open");
}

// Étape 1 : Pièces (multi-sélection libre)
function renderModalRooms() {
  DOM.modalRoomGrid.innerHTML = "";
  for (const item of Core.DEFAULT_TAXONOMY) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "room-chip";
    if (state.modal.selectedRooms.includes(item.room)) {
      chip.classList.add("selected");
    }
    chip.innerHTML = `<span class="room-icon">${item.icon}</span><span>${item.room}</span>`;
    chip.addEventListener("click", () => {
      toggleModalRoom(item.room);
    });
    DOM.modalRoomGrid.appendChild(chip);
  }
}

function toggleModalRoom(roomName) {
  const idx = state.modal.selectedRooms.indexOf(roomName);
  if (idx >= 0) {
    state.modal.selectedRooms.splice(idx, 1);
  } else {
    state.modal.selectedRooms.push(roomName);
  }
  renderModalRooms();
}

// Étape 2 : Tags généraux (toujours visibles, découplés des pièces)
function renderModalTags() {
  DOM.modalTagsContainer.innerHTML = "";

  const allTags = Core.getAllTags(state.customTags);

  for (const tagObj of allTags) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag-chip";
    if (state.modal.selectedTags.includes(tagObj.name)) {
      chip.classList.add("selected");
    }

    if (tagObj.isCustom) {
      chip.innerHTML = `<span>✨ ${tagObj.name}</span> <span class="tag-delete-cross" title="Supprimer ce tag personnalisé" data-tag="${tagObj.name}">&times;</span>`;
    } else {
      chip.textContent = tagObj.name;
    }

    chip.addEventListener("click", (e) => {
      if (e.target.classList.contains("tag-delete-cross")) {
        e.stopPropagation();
        deleteCustomTag(tagObj.name);
        return;
      }
      toggleModalTag(tagObj.name);
    });

    DOM.modalTagsContainer.appendChild(chip);
  }
}

function deleteCustomTag(tagName) {
  if (confirm(`Supprimer définitivement la tâche personnalisée "${tagName}" ?`)) {
    state.customTags = Core.removeCustomTag(state.customTags, tagName);
    saveCustomTags();
    saveSessions(); // synchronise le backup Android native

    const idx = state.modal.selectedTags.indexOf(tagName);
    if (idx >= 0) {
      state.modal.selectedTags.splice(idx, 1);
    }
    renderModalTags();
    showToast(`Tag personnalisé "${tagName}" supprimé.`);
  }
}

function toggleModalTag(tagName) {
  const idx = state.modal.selectedTags.indexOf(tagName);
  if (idx >= 0) {
    state.modal.selectedTags.splice(idx, 1);
  } else {
    state.modal.selectedTags.push(tagName);
  }
  renderModalTags();
}

function onAddCustomTag() {
  const rawText = DOM.inputCustomTag.value.trim();
  if (!rawText) return;

  // Analyser si l'utilisateur a préfixé par une pièce (ex: "Cuisine > Nettoyer micro-ondes")
  let cleanTagName = rawText;
  if (rawText.includes(">")) {
    const parts = rawText.split(">");
    const parsedRoom = parts[0].trim();
    const parsedTag = parts.slice(1).join(">").trim();
    if (parsedRoom && parsedTag) {
      cleanTagName = parsedTag;
      if (!state.modal.selectedRooms.includes(parsedRoom)) {
        state.modal.selectedRooms.push(parsedRoom);
        renderModalRooms();
      }
    }
  }

  if (!cleanTagName) return;

  // Ajout du tag général persistant
  state.customTags = Core.addCustomTag(state.customTags, cleanTagName);
  saveCustomTags();
  saveSessions(); // sauvegarde Android native

  // Sélectionner le tag pour la tâche en cours
  if (!state.modal.selectedTags.includes(cleanTagName)) {
    state.modal.selectedTags.push(cleanTagName);
  }

  DOM.inputCustomTag.value = "";
  renderModalTags();
  showToast(`Tâche "${cleanTagName}" ajoutée à vos tâches !`);
}

function saveModalTask() {
  const durationMin = parseInt(DOM.inputDurationMinutes.value, 10);
  const finalDurationSeconds = isNaN(durationMin) || durationMin <= 0 ? 60 : durationMin * 60;
  const note = DOM.inputNote.value.trim();

  const rooms = state.modal.selectedRooms.length > 0 ? [...state.modal.selectedRooms] : ["Général"];
  const tags = state.modal.selectedTags.length > 0 ? [...state.modal.selectedTags] : ["Tâche générale"];

  const newSession = Core.createSessionRecord({
    person: state.activePerson || "Henri",
    startIso: state.modal.startTimeIso,
    endIso: state.modal.endTimeIso,
    durationSeconds: finalDurationSeconds,
    rooms,
    tags,
    note
  });

  // Ajouter au début de la liste
  state.sessions.unshift(newSession);
  saveSessions();

  // Si le timer tournait, le réinitialiser proprement
  if (!state.modal.isManual) {
    state.timerState = Core.createTimerState();
    saveTimerState();
    stopTimerTick();
    updateTimerDisplay();
  }

  closeModal();
  showToast(`Tâche enregistrée (${Core.formatDurationHm(finalDurationSeconds)}) !`);

  renderStats();
  renderHistory();
}

// Rendu des Statistiques (Onglet 2)
function renderStats() {
  const stats = Core.computeStats(state.sessions, state.statsPeriod);

  DOM.statHenriTime.textContent = Core.formatDurationHm(stats.henriSeconds);
  DOM.statHenriSub.textContent = `${stats.henriCount} session${stats.henriCount > 1 ? "s" : ""} (${stats.henriPct}%)`;

  DOM.statAnnabelleTime.textContent = Core.formatDurationHm(stats.annabelleSeconds);
  DOM.statAnnabelleSub.textContent = `${stats.annabelleCount} session${stats.annabelleCount > 1 ? "s" : ""} (${stats.annabellePct}%)`;

  DOM.labelHenriPct.textContent = `Henri : ${stats.henriPct}%`;
  DOM.labelAnnabellePct.textContent = `Annabelle : ${stats.annabellePct}%`;

  if (stats.totalSeconds > 0) {
    DOM.progressBarHenri.style.width = `${stats.henriPct}%`;
    DOM.progressBarAnnabelle.style.width = `${stats.annabellePct}%`;
  } else {
    DOM.progressBarHenri.style.width = "50%";
    DOM.progressBarAnnabelle.style.width = "50%";
  }

  // Répartition par pièce
  DOM.statsRoomsList.innerHTML = "";
  if (stats.byRoom.length === 0) {
    DOM.statsRoomsList.innerHTML = `<div class="empty-state"><p>Aucune session pour cette période.</p></div>`;
  } else {
    for (const r of stats.byRoom) {
      const item = document.createElement("div");
      item.className = "breakdown-item";
      const icon = (Core.DEFAULT_TAXONOMY.find((t) => t.room === r.room) || {}).icon || "🏠";
      item.innerHTML = `
        <div class="breakdown-info">
          <div class="breakdown-title">${icon} ${r.room}</div>
          <div class="breakdown-sub">${r.count} session${r.count > 1 ? "s" : ""}</div>
        </div>
        <div class="breakdown-metrics">
          <div class="breakdown-time">${Core.formatDurationHm(r.totalSeconds)}</div>
          <div class="breakdown-split">H: ${Core.formatDurationHm(r.henriSeconds)} | A: ${Core.formatDurationHm(r.annabelleSeconds)}</div>
        </div>
      `;
      DOM.statsRoomsList.appendChild(item);
    }
  }

  // Répartition par tâche (tag)
  DOM.statsTagsList.innerHTML = "";
  if (stats.byTag.length === 0) {
    DOM.statsTagsList.innerHTML = `<div class="empty-state"><p>Aucune tâche pour cette période.</p></div>`;
  } else {
    for (const t of stats.byTag) {
      const item = document.createElement("div");
      item.className = "breakdown-item";
      item.innerHTML = `
        <div class="breakdown-info">
          <div class="breakdown-title">${t.tag}</div>
          <div class="breakdown-sub">${t.count} session${t.count > 1 ? "s" : ""} (Moyenne : ${Core.formatDurationHm(t.avgSeconds)}/session)</div>
        </div>
        <div class="breakdown-metrics">
          <div class="breakdown-time">${Core.formatDurationHm(t.totalSeconds)}</div>
          <div class="breakdown-split">H: ${Core.formatDurationHm(t.henriSeconds)} | A: ${Core.formatDurationHm(t.annabelleSeconds)}</div>
        </div>
      `;
      DOM.statsTagsList.appendChild(item);
    }
  }
}

// Rendu de l'Historique (Onglet 3)
function populateHistoryRoomFilter() {
  const currentVal = DOM.historyRoomFilter.value;
  DOM.historyRoomFilter.innerHTML = `<option value="all">Toutes les pièces</option>`;
  for (const item of Core.DEFAULT_TAXONOMY) {
    const opt = document.createElement("option");
    opt.value = item.room;
    opt.textContent = `${item.icon} ${item.room}`;
    DOM.historyRoomFilter.appendChild(opt);
  }
  DOM.historyRoomFilter.value = currentVal || "all";
}

function renderHistory() {
  populateHistoryRoomFilter();

  const personFilter = DOM.historyPersonFilter.value;
  const roomFilter = DOM.historyRoomFilter.value;

  const filtered = state.sessions.filter((s) => {
    if (personFilter !== "all" && s.person !== personFilter) return false;
    if (roomFilter !== "all" && !(s.rooms && s.rooms.includes(roomFilter))) return false;
    return true;
  });

  DOM.historyList.innerHTML = "";

  if (filtered.length === 0) {
    DOM.historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p><strong>Aucune session enregistrée (0 tâche).</strong></p>
        <p>Démarrez un chronomètre ou saisissez une tâche passée pour commencer.</p>
      </div>
    `;
    return;
  }

  for (const s of filtered) {
    const card = document.createElement("div");
    card.className = "session-card";

    const startDate = s.startIso ? new Date(s.startIso) : new Date();
    const dateFormatted = !isNaN(startDate.getTime())
      ? startDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : "";

    const roomsHtml = (s.rooms || []).map((r) => `<span class="session-room-badge">📍 ${r}</span>`).join(" ");
    const tagsHtml = (s.tags || []).map((t) => `<span class="session-tag-badge">${t}</span>`).join(" ");
    const badgesHtml = [roomsHtml, tagsHtml].filter(Boolean).join(" ");

    card.innerHTML = `
      <div class="session-card-header">
        <span class="session-person-badge ${s.person}">${s.person}</span>
        <span class="session-date">${dateFormatted}</span>
      </div>
      <div class="session-card-body">
        <div class="session-tags">${badgesHtml || "<em>Général</em>"}</div>
        <div class="session-duration">${Core.formatDurationHm(s.durationSeconds)}</div>
      </div>
      ${s.note ? `<div class="session-note">${s.note}</div>` : ""}
      <div style="display:flex; justify-content:flex-end;">
        <button type="button" class="session-delete-btn" data-id="${s.id}" title="Supprimer la session">🗑️ Supprimer</button>
      </div>
    `;

    card.querySelector(".session-delete-btn").addEventListener("click", () => {
      deleteSession(s.id);
    });

    DOM.historyList.appendChild(card);
  }
}

function deleteSession(id) {
  if (confirm("Voulez-vous supprimer définitivement cette session ?")) {
    state.sessions = state.sessions.filter((s) => s.id !== id);
    saveSessions();
    renderHistory();
    renderStats();
    showToast("Session supprimée.");
  }
}

// Export CSV & Partage Android
function exportCsv() {
  if (state.sessions.length === 0) {
    showToast("Aucune session à exporter.");
    return;
  }

  const csvContent = Core.sessionsToCsv(state.sessions);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const filename = `taches_menageres_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;

  // 1. Si passerelle Android Native Bridge disponible, déclencher le partage natif WhatsApp/Drive/Spark
  if (window.AndroidNativeBridge && typeof window.AndroidNativeBridge.shareCsv === "function") {
    try {
      window.AndroidNativeBridge.shareCsv(filename, csvContent);
      showToast("Fichier partagé via Android.");
      return;
    } catch (err) {
      console.warn("Erreur AndroidNativeBridge.shareCsv:", err);
    }
  }

  // 2. Téléchargement standard navigateur
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Export CSV téléchargé.");
}

// Import & Fusion CSV
function handleCsvFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const { mergedSessions, addedCount, duplicateCount } = Core.parseAndMergeCsv(text, state.sessions);
    state.sessions = mergedSessions;
    saveSessions();
    renderHistory();
    renderStats();
    showToast(`${addedCount} sessions importées (${duplicateCount} doublons ignorés).`);
    DOM.fileCsvInput.value = "";
  };
  reader.readAsText(file, "UTF-8");
}

// Export / Import JSON
function exportJson() {
  const payload = {
    version: 2,
    activeUser: state.activePerson,
    customTags: state.customTags,
    sessions: state.sessions
  };
  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `taches_menageres_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Sauvegarde JSON exportée.");
}

function handleJsonFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      let sessionList = [];

      if (Array.isArray(parsed)) {
        sessionList = parsed;
      } else if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.sessions)) sessionList = parsed.sessions;
        if (Array.isArray(parsed.customTags)) {
          state.customTags = parsed.customTags;
          saveCustomTags();
        }
        if (parsed.activeUser) {
          setProfile(parsed.activeUser);
        }
      }

      if (sessionList.length > 0 || Array.isArray(sessionList)) {
        const map = new Map();
        for (const s of state.sessions) if (s && s.id) map.set(s.id, s);
        let added = 0;
        for (const s of sessionList) {
          if (s && s.id && !map.has(s.id)) {
            map.set(s.id, s);
            added++;
          }
        }
        state.sessions = Array.from(map.values()).sort(
          (a, b) => new Date(b.startIso).getTime() - new Date(a.startIso).getTime()
        );
        saveSessions();
        renderHistory();
        renderStats();
        showToast(`${added} sessions restaurées depuis le fichier JSON.`);
      } else {
        alert("Format JSON non valide.");
      }
    } catch (err) {
      alert("Erreur lecture JSON: " + err.message);
    }
    DOM.fileJsonInput.value = "";
  };
  reader.readAsText(file, "UTF-8");
}

// Initialisation des écouteurs d'événements
function initEventListeners() {
  // Clic sur la pastille profil dans le header pour changer de profil
  DOM.btnCurrentProfile.addEventListener("click", () => {
    openProfileModal(true);
  });

  // Choix dans la modale de profil (cartes Henri et Annabelle)
  document.querySelectorAll(".profile-big-card").forEach((card) => {
    card.addEventListener("click", () => {
      const person = card.dataset.person;
      if (person) {
        setProfile(person);
        showToast(`Profil actif : ${person}`);
      }
    });
  });

  DOM.btnProfileModalClose.addEventListener("click", closeProfileModal);

  // Onglets
  DOM.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Timer (Gros bouton rond)
  DOM.btnMainTimer.addEventListener("click", onMainTimerClick);
  DOM.btnPauseTimer.addEventListener("click", onPauseTimerClick);
  DOM.btnCancelTimer.addEventListener("click", onCancelTimerClick);
  DOM.btnManualEntry.addEventListener("click", () => {
    openQualificationModal({ isManual: true });
  });

  // Modale Qualification
  DOM.btnModalClose.addEventListener("click", closeModal);
  DOM.btnModalCancel.addEventListener("click", closeModal);
  DOM.btnModalSave.addEventListener("click", saveModalTask);
  DOM.btnAddCustomTag.addEventListener("click", onAddCustomTag);
  DOM.inputCustomTag.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddCustomTag();
    }
  });
  DOM.inputDurationMinutes.addEventListener("input", () => {
    const val = parseInt(DOM.inputDurationMinutes.value, 10) || 0;
    DOM.durationFormattedPreview.textContent = `(${Core.formatDurationHm(val * 60)})`;
  });

  // Filtres stats
  DOM.statsPeriodFilter.addEventListener("click", (e) => {
    const pill = e.target.closest(".filter-pill");
    if (pill) {
      DOM.statsPeriodFilter.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.statsPeriod = pill.dataset.period;
      renderStats();
    }
  });

  // Filtres historique
  DOM.historyPersonFilter.addEventListener("change", renderHistory);
  DOM.historyRoomFilter.addEventListener("change", renderHistory);

  // Actions Historique
  DOM.btnExportCsv.addEventListener("click", exportCsv);
  DOM.btnImportCsv.addEventListener("click", () => DOM.fileCsvInput.click());
  DOM.fileCsvInput.addEventListener("change", handleCsvFileSelect);
  DOM.btnExportJson.addEventListener("click", exportJson);
  DOM.btnImportJson.addEventListener("click", () => DOM.fileJsonInput.click());
  DOM.fileJsonInput.addEventListener("change", handleJsonFileSelect);
}

// Initialisation globale
function initApp() {
  loadSessions();
  initEventListeners();

  // Si aucun profil n'est défini (premier lancement), afficher la modale obligatoire de bienvenue
  if (!state.activePerson) {
    openProfileModal(false);
  } else {
    setProfile(state.activePerson);
  }

  restoreTimerState();
  updateTimerDisplay();
  renderStats();
  renderHistory();
}

window.initApp = initApp;

// Démarrer l'application au chargement du DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
})();
