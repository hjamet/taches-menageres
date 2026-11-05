import * as Core from "./core.js";

// Clés de persistance locale
const STORAGE_KEY_SESSIONS = "taches_menageres_sessions";
const STORAGE_KEY_PROFILE = "taches_menageres_active_profile";
const STORAGE_KEY_TIMER = "taches_menageres_timer_state";
const STORAGE_KEY_CUSTOM_TAGS = Core.STORAGE_KEY_CUSTOM_TAGS || "taches_menageres_custom_tags";

function loadCustomTags() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_TAGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Erreur lecture custom tags:", err);
  }
  return {};
}

function saveCustomTags() {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TAGS, JSON.stringify(state.customTagsByRoom));
  } catch (err) {
    console.error("Erreur écriture custom tags:", err);
  }
}

// État global de l'application
const state = {
  activePerson: localStorage.getItem(STORAGE_KEY_PROFILE) || "Henri",
  sessions: [],
  timerState: Core.createTimerState(),
  timerIntervalId: null,
  activeTab: "timer",
  statsPeriod: "all",
  customTagsByRoom: loadCustomTags(),

  // État de la modale en cours
  modal: {
    isOpen: false,
    isManual: false,
    startTimeIso: null,
    endTimeIso: null,
    durationSeconds: 0,
    selectedRooms: [],
    selectedTags: [],
    customTags: []
  }
};

// Éléments DOM
const DOM = {
  profileSelector: document.getElementById("profileSelector"),
  timerDigits: document.getElementById("timerDigits"),
  timerStatusBadge: document.getElementById("timerStatusBadge"),
  timerStatusText: document.getElementById("timerStatusText"),
  timerPersonIndicator: document.getElementById("timerPersonIndicator"),
  btnMainTimer: document.getElementById("btnMainTimer"),
  btnMainTimerIcon: document.getElementById("btnMainTimerIcon"),
  btnMainTimerLabel: document.getElementById("btnMainTimerLabel"),
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

  // Modal
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
        const nativeList = JSON.parse(nativeRaw);
        if (Array.isArray(nativeList)) {
          // Fusionner avec ce qui est en local
          const map = new Map();
          for (const s of nativeList) if (s && s.id) map.set(s.id, s);
          for (const s of loaded) if (s && s.id) map.set(s.id, s);
          loaded = Array.from(map.values());
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

  // Sauvegarde native Android indestructible
  if (window.AndroidNativeBridge && typeof window.AndroidNativeBridge.saveBackupJson === "function") {
    try {
      window.AndroidNativeBridge.saveBackupJson(JSON.stringify(state.sessions));
    } catch (err) {
      console.warn("Erreur sauvegarde AndroidNativeBridge:", err);
    }
  }

  // Synchronisation SQLite serveur local si accessible
  syncToServer();
}

async function syncToServer() {
  try {
    // Tente de poster les sessions vers l'API SQLite locale
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.sessions)
    }).catch(() => {
      // Serveur non démarré ou hors ligne, fonctionnement autonome normal
    });
  } catch {
    // Hors ligne
  }
}

// Gestion du profil actif
function setProfile(person) {
  state.activePerson = person;
  localStorage.setItem(STORAGE_KEY_PROFILE, person);

  document.querySelectorAll(".profile-pill").forEach((pill) => {
    if (pill.dataset.person === person) {
      pill.classList.add("active");
    } else {
      pill.classList.remove("active");
    }
  });

  DOM.timerPersonIndicator.textContent = `Profil actif : ${person}`;
  renderStats();
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

    DOM.btnMainTimer.className = "btn-primary-big stop";
    DOM.btnMainTimerIcon.textContent = "⏹";
    DOM.btnMainTimerLabel.textContent = "TERMINER & TAGUER";

    DOM.timerSubActions.style.display = "flex";
    DOM.btnPauseIcon.textContent = "⏸";
    DOM.btnPauseLabel.textContent = "Pause";
  } else if (state.timerState.status === "PAUSED") {
    DOM.timerStatusBadge.className = "timer-status-badge paused";
    DOM.timerStatusText.textContent = "En pause";

    DOM.btnMainTimer.className = "btn-primary-big stop";
    DOM.btnMainTimerIcon.textContent = "⏹";
    DOM.btnMainTimerLabel.textContent = "TERMINER & TAGUER";

    DOM.timerSubActions.style.display = "flex";
    DOM.btnPauseIcon.textContent = "▶";
    DOM.btnPauseLabel.textContent = "Reprendre";
  } else {
    DOM.timerStatusBadge.className = "timer-status-badge";
    DOM.timerStatusText.textContent = "Prêt à démarrer";

    DOM.btnMainTimer.className = "btn-primary-big";
    DOM.btnMainTimerIcon.textContent = "▶";
    DOM.btnMainTimerLabel.textContent = "DÉMARRER UNE TÂCHE";

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
    showToast(`Chronomètre démarré pour ${state.activePerson}`);
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
  state.modal.customTags = [];

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
  renderModalTags();
}

function renderModalTags() {
  DOM.modalTagsContainer.innerHTML = "";

  // Si aucune pièce n'est sélectionnée, inviter à en choisir une
  if (state.modal.selectedRooms.length === 0) {
    DOM.modalTagsContainer.innerHTML = `<span style="font-size:0.85rem; color:var(--text-dim); padding:6px 0;">Sélectionnez au moins une pièce ci-dessus pour afficher ses tâches.</span>`;
    return;
  }

  // Récupérer tous les tags des pièces sélectionnées (défaut + personnalisés persistés)
  for (const roomName of state.modal.selectedRooms) {
    const category = Core.DEFAULT_TAXONOMY.find((t) => t.room === roomName) || { icon: "🏠" };
    const roomTags = Core.getRoomTags(roomName, state.customTagsByRoom);

    for (const tagObj of roomTags) {
      const fullTag = `${roomName} > ${tagObj.name}`;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip";
      if (state.modal.selectedTags.includes(fullTag)) {
        chip.classList.add("selected");
      }

      if (tagObj.isCustom) {
        chip.innerHTML = `<span>✨ ${tagObj.name}</span> <span class="tag-delete-cross" title="Supprimer ce tag personnalisé" data-room="${roomName}" data-tag="${tagObj.name}">&times;</span>`;
      } else {
        chip.textContent = `${category.icon} ${tagObj.name}`;
      }

      chip.addEventListener("click", (e) => {
        if (e.target.classList.contains("tag-delete-cross")) {
          e.stopPropagation();
          deleteCustomTag(roomName, tagObj.name);
          return;
        }
        toggleModalTag(fullTag);
      });
      DOM.modalTagsContainer.appendChild(chip);
    }
  }
}

function deleteCustomTag(roomName, tagName) {
  if (confirm(`Supprimer définitivement la tâche personnalisée "${tagName}" de ${roomName} ?`)) {
    state.customTagsByRoom = Core.removeCustomTagFromRoom(state.customTagsByRoom, roomName, tagName);
    saveCustomTags();
    const fullTag = `${roomName} > ${tagName}`;
    const idx = state.modal.selectedTags.indexOf(fullTag);
    if (idx >= 0) {
      state.modal.selectedTags.splice(idx, 1);
    }
    renderModalTags();
    showToast(`Tag "${tagName}" retiré de ${roomName}.`);
  }
}

function toggleModalTag(fullTag) {
  const idx = state.modal.selectedTags.indexOf(fullTag);
  if (idx >= 0) {
    state.modal.selectedTags.splice(idx, 1);
  } else {
    state.modal.selectedTags.push(fullTag);
  }
  renderModalTags();
}

function onAddCustomTag() {
  const text = DOM.inputCustomTag.value.trim();
  if (!text) return;

  if (state.modal.selectedRooms.length === 0) {
    showToast("Sélectionnez d'abord au moins une pièce ci-dessus pour y associer cette tâche.");
    return;
  }

  // Déterminer la pièce cible (première sélectionnée ou pièce précisée dans le texte)
  let targetRoom = state.modal.selectedRooms[0];
  let cleanTagName = text;
  if (text.includes(">")) {
    const parts = text.split(">");
    const parsedRoom = parts[0].trim();
    const parsedTag = parts.slice(1).join(">").trim();
    if (parsedRoom && parsedTag) {
      targetRoom = parsedRoom;
      cleanTagName = parsedTag;
      if (!state.modal.selectedRooms.includes(targetRoom)) {
        state.modal.selectedRooms.push(targetRoom);
        renderModalRooms();
      }
    }
  }

  if (!cleanTagName) return;

  // Persistance par pièce dans customTagsByRoom
  state.customTagsByRoom = Core.addCustomTagToRoom(state.customTagsByRoom, targetRoom, cleanTagName);
  saveCustomTags();

  // Sélection immédiate du tag pour la session en cours
  const fullTag = `${targetRoom} > ${cleanTagName}`;
  if (!state.modal.selectedTags.includes(fullTag)) {
    state.modal.selectedTags.push(fullTag);
  }

  DOM.inputCustomTag.value = "";
  renderModalTags();
  showToast(`Tâche "${cleanTagName}" ajoutée à ${targetRoom} et mémorisée !`);
}

function saveModalTask() {
  const durationMin = parseInt(DOM.inputDurationMinutes.value, 10);
  const finalDurationSeconds = isNaN(durationMin) || durationMin <= 0 ? 60 : durationMin * 60;
  const note = DOM.inputNote.value.trim();

  const rooms = state.modal.selectedRooms.length > 0 ? [...state.modal.selectedRooms] : ["Général"];
  const tags = state.modal.selectedTags.length > 0 ? [...state.modal.selectedTags] : [`${rooms[0]} > Tâche générale`];

  const newSession = Core.createSessionRecord({
    person: state.activePerson,
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

  // Rafraîchir les autres vues
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
        <p>Démarrez un chronomètre ou importez un fichier CSV pour commencer.</p>
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

    const tagsHtml = (s.tags || []).map((t) => `<span class="session-tag-badge">${t}</span>`).join(" ");

    card.innerHTML = `
      <div class="session-card-header">
        <span class="session-person-badge ${s.person}">${s.person}</span>
        <span class="session-date">${dateFormatted}</span>
      </div>
      <div class="session-card-body">
        <div class="session-tags">${tagsHtml || "<em>Général</em>"}</div>
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
  const data = JSON.stringify(state.sessions, null, 2);
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
      if (Array.isArray(parsed)) {
        const map = new Map();
        for (const s of state.sessions) if (s && s.id) map.set(s.id, s);
        let added = 0;
        for (const s of parsed) {
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
        alert("Format JSON non valide (attendu: tableau de sessions).");
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
  // Profil
  DOM.profileSelector.addEventListener("click", (e) => {
    const pill = e.target.closest(".profile-pill");
    if (pill) {
      setProfile(pill.dataset.person);
    }
  });

  // Onglets
  DOM.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Timer
  DOM.btnMainTimer.addEventListener("click", onMainTimerClick);
  DOM.btnPauseTimer.addEventListener("click", onPauseTimerClick);
  DOM.btnCancelTimer.addEventListener("click", onCancelTimerClick);
  DOM.btnManualEntry.addEventListener("click", () => {
    openQualificationModal({ isManual: true });
  });

  // Modale
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
export function initApp() {
  loadSessions();
  initEventListeners();
  setProfile(state.activePerson);
  restoreTimerState();
  updateTimerDisplay();
  renderStats();
  renderHistory();
}

// Démarrer l'application au chargement du DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
