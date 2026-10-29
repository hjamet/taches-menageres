import test from "node:test";
import assert from "node:assert/strict";
import * as Core from "../web/core.js";

test("Livrable 1.1 : Taxonomie de référence exacte", () => {
  const tax = Core.DEFAULT_TAXONOMY;
  assert.equal(tax.length, 7, "Il doit y avoir exactement 7 catégories de pièces");

  const roomNames = tax.map((t) => t.room);
  assert.deepEqual(roomNames, [
    "Cuisine",
    "Salle de bain",
    "Lessive",
    "Salon",
    "Chambre",
    "Couloir",
    "Vitres"
  ]);

  const cuisine = tax.find((t) => t.room === "Cuisine");
  assert.equal(cuisine.icon, "🍳");
  assert.deepEqual(cuisine.tags, [
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
  ]);

  const sdb = tax.find((t) => t.room === "Salle de bain");
  assert.equal(sdb.icon, "🚿");
  assert.deepEqual(sdb.tags, [
    "Laver baignoire",
    "Laver évier",
    "Laver toilettes",
    "Déboucher lavabo",
    "Sol",
    "Rangement"
  ]);

  const lessive = tax.find((t) => t.room === "Lessive");
  assert.equal(lessive.icon, "🧺");
  assert.deepEqual(lessive.tags, ["Lessive", "Etendre", "Pliage"]);

  const salon = tax.find((t) => t.room === "Salon");
  assert.equal(salon.icon, "🛋️");
  assert.deepEqual(salon.tags, ["Ranger", "Canapé", "Sol", "Débarrasser"]);

  const chambre = tax.find((t) => t.room === "Chambre");
  assert.equal(chambre.icon, "🛏️");
  assert.deepEqual(chambre.tags, ["Ranger", "Sol", "Changer les draps"]);

  const couloir = tax.find((t) => t.room === "Couloir");
  assert.equal(couloir.icon, "🚪");
  assert.deepEqual(couloir.tags, ["Chaussures", "Sol"]);

  const vitres = tax.find((t) => t.room === "Vitres");
  assert.equal(vitres.icon, "🪟");
  assert.deepEqual(vitres.tags, ["Vitres"]);

  const totalTags = tax.reduce((acc, curr) => acc + curr.tags.length, 0);
  assert.equal(totalTags, 30, "Total de 30 sous-tâches définies");
});

test("Livrable 1.2 : Précision du Timer et résistance aux pauses", () => {
  let timer = Core.createTimerState();
  assert.equal(timer.status, "IDLE");
  assert.equal(Core.getElapsedSeconds(timer), 0);

  const t0 = 1000000000;
  timer = Core.startTimer(timer, t0);
  assert.equal(timer.status, "RUNNING");

  // 15 secondes plus tard
  assert.equal(Core.getElapsedSeconds(timer, t0 + 15000), 15);

  // Pause à T0 + 15s
  timer = Core.pauseTimer(timer, t0 + 15000);
  assert.equal(timer.status, "PAUSED");
  assert.equal(timer.accumulatedMs, 15000);

  // Même 2 heures plus tard en pause, la durée reste 15 secondes
  assert.equal(Core.getElapsedSeconds(timer, t0 + 7200000), 15);

  // Reprise à T0 + 7200000
  const tResume = t0 + 7200000;
  timer = Core.resumeTimer(timer, tResume);
  assert.equal(timer.status, "RUNNING");

  // 10 secondes supplémentaires
  assert.equal(Core.getElapsedSeconds(timer, tResume + 10000), 25);

  // Arrêt
  const { durationSeconds, endState } = Core.stopTimer(timer, tResume + 10000);
  assert.equal(durationSeconds, 25);
  assert.equal(endState.status, "IDLE");
});

test("Livrable 1.3 : Calcul des statistiques comparatives Henri / Annabelle", () => {
  const sessions = [
    Core.createSessionRecord({
      id: "s1",
      person: "Henri",
      durationSeconds: 3600, // 1h
      rooms: ["Cuisine"],
      tags: ["Cuisine > Vaisselle"],
      startIso: "2026-10-29T10:00:00.000Z"
    }),
    Core.createSessionRecord({
      id: "s2",
      person: "Annabelle",
      durationSeconds: 1800, // 30m
      rooms: ["Cuisine"],
      tags: ["Cuisine > Vaisselle"],
      startIso: "2026-10-29T11:00:00.000Z"
    }),
    Core.createSessionRecord({
      id: "s3",
      person: "Annabelle",
      durationSeconds: 1800, // 30m
      rooms: ["Salle de bain"],
      tags: ["Salle de bain > Sol"],
      startIso: "2026-10-29T12:00:00.000Z"
    })
  ];

  const stats = Core.computeStats(sessions, "all", new Date("2026-10-29T20:00:00.000Z"));
  assert.equal(stats.totalSessions, 3);
  assert.equal(stats.totalSeconds, 7200); // 2h au total
  assert.equal(stats.henriSeconds, 3600);
  assert.equal(stats.henriCount, 1);
  assert.equal(stats.henriPct, 50.0);
  assert.equal(stats.annabelleSeconds, 3600);
  assert.equal(stats.annabelleCount, 2);
  assert.equal(stats.annabellePct, 50.0);

  // Vérification stats par pièce
  const cuisineStat = stats.byRoom.find((r) => r.room === "Cuisine");
  assert.ok(cuisineStat);
  assert.equal(cuisineStat.totalSeconds, 5400); // 1h30
  assert.equal(cuisineStat.henriSeconds, 3600);
  assert.equal(cuisineStat.annabelleSeconds, 1800);

  // Vérification stats par tag
  const vaisselleStat = stats.byTag.find((t) => t.tag === "Cuisine > Vaisselle");
  assert.ok(vaisselleStat);
  assert.equal(vaisselleStat.totalSeconds, 5400);
  assert.equal(vaisselleStat.count, 2);
  assert.equal(vaisselleStat.avgSeconds, 2700); // Moyenne 45m
});

test("Livrable 1.4 : Export CSV RFC 4180 avec BOM UTF-8 et Import dédupliqué", () => {
  const sessions = [
    Core.createSessionRecord({
      id: "ses_001",
      person: "Henri",
      durationSeconds: 1800,
      rooms: ["Cuisine", "Salon"],
      tags: ["Cuisine > Vaisselle", "Salon > Ranger"],
      note: 'Note avec "guillemets" et, virgule',
      startIso: "2026-10-29T14:00:00.000Z",
      endIso: "2026-10-29T14:30:00.000Z"
    })
  ];

  const csv = Core.sessionsToCsv(sessions);
  // Vérification du BOM UTF-8
  assert.ok(csv.startsWith("\uFEFF"), "Le CSV doit commencer par le BOM UTF-8 \\uFEFF");
  assert.ok(csv.includes("id,date,start_time,end_time,duration_seconds,duration_hm,person,rooms,tags,note"));
  assert.ok(csv.includes('"Note avec ""guillemets"" et, virgule"'));

  // Test de l'import et fusion avec déduplication
  const { mergedSessions, addedCount, duplicateCount } = Core.parseAndMergeCsv(csv, sessions);
  assert.equal(addedCount, 0, "La session existante est un doublon");
  assert.equal(duplicateCount, 1, "Un doublon doit être comptabilisé");
  assert.equal(mergedSessions.length, 1);

  // Import d'un nouveau CSV externe
  const externalCsv = `\uFEFFid,date,start_time,end_time,duration_seconds,duration_hm,person,rooms,tags,note
ses_002,2026-10-29,15:00,15:20,1200,20m,Annabelle,Salle de bain,Salle de bain > Sol,Bien propre
`;
  const res2 = Core.parseAndMergeCsv(externalCsv, sessions);
  assert.equal(res2.addedCount, 1);
  assert.equal(res2.duplicateCount, 0);
  assert.equal(res2.mergedSessions.length, 2);
  assert.equal(res2.mergedSessions[0].id, "ses_002");
});
