/**
 * Moteur logique ChoreCore — Application Tâches Ménagères
 * Compatible Navigateur (ES module et Global window.ChoreCore) et Node.js.
 */

export const DEFAULT_TAXONOMY = [
  {
    room: "Cuisine",
    icon: "🍳",
    tags: [
      "Vaisselle",
      "Rangement vaisselle",
      "Plan de travail",
      "Etendoir",
      "Courses",
      "Four",
      "Poubelles",
      "Alu + pet + verre",
      "Compost",
      "Frigo",
      "Robot"
    ]
  },
  {
    room: "Salle de bain",
    icon: "🚿",
    tags: [
      "Laver baignoire",
      "Laver évier",
      "Laver toilettes",
      "Déboucher lavabo",
      "Sol",
      "Rangement"
    ]
  },
  {
    room: "Lessive",
    icon: "🧺",
    tags: [
      "Lessive",
      "Etendre",
      "Pliage"
    ]
  },
  {
    room: "Salon",
    icon: "🛋️",
    tags: [
      "Ranger",
      "Canapé",
      "Sol",
      "Débarrasser"
    ]
  },
  {
    room: "Chambre",
    icon: "🛏️",
    tags: [
      "Ranger",
      "Sol",
      "Changer les draps"
    ]
  },
  {
    room: "Couloir",
    icon: "🚪",
    tags: [
      "Chaussures",
      "Sol"
    ]
  },
  {
    room: "Vitres",
    icon: "🪟",
    tags: [
      "Vitres"
    ]
  }
];

export const STORAGE_KEY_CUSTOM_TAGS = "taches_menageres_custom_tags";

export function getRoomTags(roomName, customTagsMap = {}) {
  const category = DEFAULT_TAXONOMY.find((c) => c.room === roomName);
  const defaultTags = category ? category.tags : [];
  const customTags = (customTagsMap && Array.isArray(customTagsMap[roomName]))
    ? customTagsMap[roomName]
    : [];

  const seen = new Set();
  const result = [];
  for (const t of defaultTags) {
    if (!seen.has(t)) {
      seen.add(t);
      result.push({ name: t, isCustom: false });
    }
  }
  for (const t of customTags) {
    const clean = typeof t === "string" ? t.trim() : "";
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      result.push({ name: clean, isCustom: true });
    }
  }
  return result;
}

export function addCustomTagToRoom(customTagsMap = {}, roomName, tagName) {
  if (!roomName || !tagName) return { ...customTagsMap };
  const cleanRoom = String(roomName).trim();
  const cleanTag = String(tagName).trim();
  if (!cleanRoom || !cleanTag) return { ...customTagsMap };

  const current = (customTagsMap && Array.isArray(customTagsMap[cleanRoom]))
    ? [...customTagsMap[cleanRoom]]
    : [];
  if (!current.includes(cleanTag)) {
    current.push(cleanTag);
  }
  return {
    ...customTagsMap,
    [cleanRoom]: current
  };
}

export function removeCustomTagFromRoom(customTagsMap = {}, roomName, tagName) {
  if (!roomName || !tagName || !customTagsMap || !customTagsMap[roomName]) {
    return { ...customTagsMap };
  }
  return {
    ...customTagsMap,
    [roomName]: customTagsMap[roomName].filter((t) => t !== tagName)
  };
}

export function createTimerState() {
  return {
    status: "IDLE", // "IDLE" | "RUNNING" | "PAUSED"
    startTimeMs: null,
    pauseTimeMs: null,
    accumulatedMs: 0
  };
}

export function startTimer(state, nowMs = Date.now()) {
  return {
    status: "RUNNING",
    startTimeMs: nowMs,
    pauseTimeMs: null,
    accumulatedMs: 0
  };
}

export function pauseTimer(state, nowMs = Date.now()) {
  if (state.status !== "RUNNING") return { ...state };
  const currentElapsed = Math.max(0, nowMs - (state.startTimeMs || nowMs));
  return {
    status: "PAUSED",
    startTimeMs: null,
    pauseTimeMs: nowMs,
    accumulatedMs: state.accumulatedMs + currentElapsed
  };
}

export function resumeTimer(state, nowMs = Date.now()) {
  if (state.status !== "PAUSED") return { ...state };
  return {
    status: "RUNNING",
    startTimeMs: nowMs,
    pauseTimeMs: null,
    accumulatedMs: state.accumulatedMs
  };
}

export function getElapsedSeconds(state, nowMs = Date.now()) {
  if (!state || state.status === "IDLE") return 0;
  let totalMs = state.accumulatedMs || 0;
  if (state.status === "RUNNING" && state.startTimeMs) {
    totalMs += Math.max(0, nowMs - state.startTimeMs);
  }
  return Math.floor(totalMs / 1000);
}

export function stopTimer(state, nowMs = Date.now()) {
  const durationSeconds = getElapsedSeconds(state, nowMs);
  return {
    durationSeconds,
    endState: createTimerState()
  };
}

export function formatDurationHms(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDurationHm(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function generateSessionId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `ses_${ts}_${rand}`;
}

export function createSessionRecord({
  id = generateSessionId(),
  person = "Henri",
  startIso = new Date().toISOString(),
  endIso = new Date().toISOString(),
  durationSeconds = 0,
  rooms = [],
  tags = [],
  note = ""
}) {
  const validPersons = ["Henri", "Annabelle"];
  const finalPerson = validPersons.includes(person) ? person : "Henri";
  const finalDuration = Math.max(0, Math.round(durationSeconds));
  const finalRooms = Array.isArray(rooms) ? [...rooms] : [];
  const finalTags = Array.isArray(tags) ? [...tags] : [];
  const finalNote = typeof note === "string" ? note.trim() : "";

  return {
    id: String(id || generateSessionId()),
    person: finalPerson,
    startIso: String(startIso),
    endIso: String(endIso),
    durationSeconds: finalDuration,
    rooms: finalRooms,
    tags: finalTags,
    note: finalNote
  };
}

export function computeStats(sessions, filterPeriod = "all", refDate = new Date()) {
  const validSessions = Array.isArray(sessions) ? sessions : [];
  const refTimeMs = refDate.getTime();

  const filtered = validSessions.filter((s) => {
    if (!s || !s.startIso) return false;
    if (filterPeriod === "all") return true;

    const sessionDate = new Date(s.startIso);
    const sessionTimeMs = sessionDate.getTime();
    if (isNaN(sessionTimeMs)) return false;

    if (filterPeriod === "today") {
      const todayStart = new Date(refDate);
      todayStart.setHours(0, 0, 0, 0);
      return sessionTimeMs >= todayStart.getTime();
    }
    if (filterPeriod === "7days") {
      const sevenDaysAgo = refTimeMs - 7 * 24 * 60 * 60 * 1000;
      return sessionTimeMs >= sevenDaysAgo;
    }
    if (filterPeriod === "30days") {
      const thirtyDaysAgo = refTimeMs - 30 * 24 * 60 * 60 * 1000;
      return sessionTimeMs >= thirtyDaysAgo;
    }
    return true;
  });

  let totalSeconds = 0;
  let henriSeconds = 0;
  let henriCount = 0;
  let annabelleSeconds = 0;
  let annabelleCount = 0;

  const roomMap = new Map();
  const tagMap = new Map();

  for (const s of filtered) {
    const dur = Math.max(0, Number(s.durationSeconds) || 0);
    totalSeconds += dur;

    if (s.person === "Henri") {
      henriSeconds += dur;
      henriCount += 1;
    } else if (s.person === "Annabelle") {
      annabelleSeconds += dur;
      annabelleCount += 1;
    }

    // Statistiques par pièce
    const rooms = Array.isArray(s.rooms) && s.rooms.length > 0 ? s.rooms : ["Autre"];
    for (const r of rooms) {
      if (!roomMap.has(r)) {
        roomMap.set(r, {
          room: r,
          totalSeconds: 0,
          count: 0,
          henriSeconds: 0,
          henriCount: 0,
          annabelleSeconds: 0,
          annabelleCount: 0
        });
      }
      const entry = roomMap.get(r);
      entry.totalSeconds += dur;
      entry.count += 1;
      if (s.person === "Henri") {
        entry.henriSeconds += dur;
        entry.henriCount += 1;
      } else {
        entry.annabelleSeconds += dur;
        entry.annabelleCount += 1;
      }
    }

    // Statistiques par tag
    const tags = Array.isArray(s.tags) && s.tags.length > 0 ? s.tags : ["Général"];
    for (const t of tags) {
      if (!tagMap.has(t)) {
        tagMap.set(t, {
          tag: t,
          totalSeconds: 0,
          count: 0,
          henriSeconds: 0,
          henriCount: 0,
          annabelleSeconds: 0,
          annabelleCount: 0,
          avgSeconds: 0
        });
      }
      const entry = tagMap.get(t);
      entry.totalSeconds += dur;
      entry.count += 1;
      if (s.person === "Henri") {
        entry.henriSeconds += dur;
        entry.henriCount += 1;
      } else {
        entry.annabelleSeconds += dur;
        entry.annabelleCount += 1;
      }
    }
  }

  // Calcul moyennes pour les tags
  for (const entry of tagMap.values()) {
    entry.avgSeconds = entry.count > 0 ? Math.round(entry.totalSeconds / entry.count) : 0;
  }

  const henriPct = totalSeconds > 0 ? Math.round((henriSeconds / totalSeconds) * 1000) / 10 : 0;
  const annabellePct = totalSeconds > 0 ? Math.round((annabelleSeconds / totalSeconds) * 1000) / 10 : 0;

  const byRoom = Array.from(roomMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
  const byTag = Array.from(tagMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);

  return {
    filterPeriod,
    totalSessions: filtered.length,
    totalSeconds,
    henriSeconds,
    henriCount,
    henriPct,
    annabelleSeconds,
    annabelleCount,
    annabellePct,
    byRoom,
    byTag
  };
}

function escapeCsvField(field) {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function sessionsToCsv(sessions) {
  const header = "id,date,start_time,end_time,duration_seconds,duration_hm,person,rooms,tags,note";
  const rows = [header];

  const list = Array.isArray(sessions) ? sessions : [];
  for (const s of list) {
    if (!s) continue;
    const startDate = s.startIso ? new Date(s.startIso) : new Date();
    const endDate = s.endIso ? new Date(s.endIso) : startDate;

    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = !isNaN(startDate.getTime())
      ? `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`
      : "";
    const startTimeStr = !isNaN(startDate.getTime())
      ? `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`
      : "";
    const endTimeStr = !isNaN(endDate.getTime())
      ? `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`
      : "";

    const durationSec = Math.max(0, Number(s.durationSeconds) || 0);
    const durationHmStr = formatDurationHm(durationSec);
    const roomsStr = Array.isArray(s.rooms) ? s.rooms.join("; ") : "";
    const tagsStr = Array.isArray(s.tags) ? s.tags.join("; ") : "";

    const row = [
      escapeCsvField(s.id),
      escapeCsvField(dateStr),
      escapeCsvField(startTimeStr),
      escapeCsvField(endTimeStr),
      escapeCsvField(durationSec),
      escapeCsvField(durationHmStr),
      escapeCsvField(s.person || "Henri"),
      escapeCsvField(roomsStr),
      escapeCsvField(tagsStr),
      escapeCsvField(s.note || "")
    ].join(",");

    rows.push(row);
  }

  // Préfixe UTF-8 BOM (\uFEFF)
  return "\uFEFF" + rows.join("\r\n");
}

function parseCsvRows(csvText) {
  // Enlève BOM éventuel
  let text = csvText.startsWith("\uFEFF") ? csvText.slice(1) : csvText;
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === "\"" && nextChar === "\"") {
        currentField += "\"";
        i++; // skip escaped quote
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === "\"") {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function parseAndMergeCsv(csvText, existingSessions = []) {
  if (!csvText || typeof csvText !== "string") {
    return {
      mergedSessions: [...existingSessions],
      addedCount: 0,
      duplicateCount: 0
    };
  }

  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return {
      mergedSessions: [...existingSessions],
      addedCount: 0,
      duplicateCount: 0
    };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idIdx = header.indexOf("id");
  const dateIdx = header.indexOf("date");
  const startTimeIdx = header.indexOf("start_time");
  const endTimeIdx = header.indexOf("end_time");
  const durSecIdx = header.indexOf("duration_seconds");
  const personIdx = header.indexOf("person");
  const roomsIdx = header.indexOf("rooms");
  const tagsIdx = header.indexOf("tags");
  const noteIdx = header.indexOf("note");

  const existingMap = new Map();
  for (const s of existingSessions) {
    if (s && s.id) {
      existingMap.set(s.id, s);
    }
  }

  let addedCount = 0;
  let duplicateCount = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0].trim() === "") continue; // ligne vide

    const id = (idIdx >= 0 && row[idIdx]) ? row[idIdx].trim() : generateSessionId();
    if (existingMap.has(id)) {
      duplicateCount++;
      continue;
    }

    const dateStr = (dateIdx >= 0 && row[dateIdx]) ? row[dateIdx].trim() : "";
    const startTimeStr = (startTimeIdx >= 0 && row[startTimeIdx]) ? row[startTimeIdx].trim() : "12:00";
    const endTimeStr = (endTimeIdx >= 0 && row[endTimeIdx]) ? row[endTimeIdx].trim() : startTimeStr;
    const durSec = durSecIdx >= 0 ? parseInt(row[durSecIdx], 10) || 0 : 0;
    const person = personIdx >= 0 ? row[personIdx].trim() : "Henri";
    const roomsRaw = roomsIdx >= 0 ? row[roomsIdx] : "";
    const tagsRaw = tagsIdx >= 0 ? row[tagsIdx] : "";
    const note = noteIdx >= 0 ? row[noteIdx] : "";

    const rooms = roomsRaw ? roomsRaw.split(";").map((x) => x.trim()).filter(Boolean) : [];
    const tags = tagsRaw ? tagsRaw.split(";").map((x) => x.trim()).filter(Boolean) : [];

    // Reconstitution ISO
    let startIso = new Date().toISOString();
    let endIso = new Date().toISOString();
    if (dateStr) {
      const timeClean = startTimeStr.length === 5 ? startTimeStr + ":00" : startTimeStr;
      const endClean = endTimeStr.length === 5 ? endTimeStr + ":00" : endTimeStr;
      const parsedStart = new Date(`${dateStr}T${timeClean}Z`);
      if (!isNaN(parsedStart.getTime())) {
        startIso = parsedStart.toISOString();
        const parsedEnd = new Date(`${dateStr}T${endClean}Z`);
        endIso = !isNaN(parsedEnd.getTime()) ? parsedEnd.toISOString() : new Date(parsedStart.getTime() + durSec * 1000).toISOString();
      }
    }

    const newSession = createSessionRecord({
      id,
      person,
      startIso,
      endIso,
      durationSeconds: durSec,
      rooms,
      tags,
      note
    });

    existingMap.set(id, newSession);
    addedCount++;
  }

  const mergedSessions = Array.from(existingMap.values()).sort(
    (a, b) => new Date(b.startIso).getTime() - new Date(a.startIso).getTime()
  );

  return {
    mergedSessions,
    addedCount,
    duplicateCount
  };
}

// Attacher à globalThis pour compatibilité script classique <script src="core.js">
if (typeof globalThis !== "undefined") {
  globalThis.ChoreCore = {
    DEFAULT_TAXONOMY,
    STORAGE_KEY_CUSTOM_TAGS,
    getRoomTags,
    addCustomTagToRoom,
    removeCustomTagFromRoom,
    createTimerState,
    startTimer,
    pauseTimer,
    resumeTimer,
    getElapsedSeconds,
    stopTimer,
    formatDurationHms,
    formatDurationHm,
    generateSessionId,
    createSessionRecord,
    computeStats,
    sessionsToCsv,
    parseAndMergeCsv
  };
}
