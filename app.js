// Clé de stockage
const STORAGE_KEY = "climb_sessions_v1";

// État en mémoire
let sessions = [];

// Utilitaires dates
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function parseISO(dateStr) {
  return new Date(dateStr + "T00:00:00");
}

function daysDiff(d1, d2) {
  const ms = parseISO(d1) - parseISO(d2);
  return ms / (1000 * 60 * 60 * 24);
}

// Chargement / sauvegarde localStorage
function loadSessions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.error("Erreur parse localStorage", e);
  }
  return [];
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// Récup form
function readForm() {
  const date = document.getElementById("date").value || todayISO();
  const type = document.getElementById("type").value;
  const blocColor = document.getElementById("blocColor").value;
  const voieGrade = document.getElementById("voieGrade").value.trim();
  const count = Number(document.getElementById("count").value || 0);
  const attempts = Number(document.getElementById("attempts").value || 0);
  const duration = Number(document.getElementById("duration").value || 0);
  const feeling = document.getElementById("feeling").value;
  const notes = document.getElementById("notes").value.trim();

  let grade = "";
  if (type === "Bloc") {
    grade = blocColor || "";
  } else if (type === "Voie") {
    grade = voieGrade || "";
  }

  return {
    id: Date.now(),
    date,
    type,
    grade,
    blocColor: type === "Bloc" ? blocColor : "",
    voieGrade: type === "Voie" ? voieGrade : "",
    count,
    attempts,
    duration,
    feeling,
    notes
  };
}

// Affichage historique
function getFilteredSessions() {
  const typeFilter = document.getElementById("filter-type").value;
  const periodFilter = document.getElementById("filter-period").value;
  const today = todayISO();

  return sessions.filter(s => {
    if (typeFilter !== "Tout" && s.type !== typeFilter) return false;

    if (periodFilter === "7") {
      if (daysDiff(today, s.date) > 7) return false;
    } else if (periodFilter === "30") {
      if (daysDiff(today, s.date) > 30) return false;
    }
    return true;
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function renderTable() {
  const tbody = document.querySelector("#sessions-table tbody");
  tbody.innerHTML = "";

  const filtered = getFilteredSessions();

  filtered.forEach(s => {
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = s.date;

    const tdType = document.createElement("td");
    tdType.textContent = s.type;

    const tdGrade = document.createElement("td");
    tdGrade.textContent = s.grade || "-";

    const tdVolume = document.createElement("td");
    tdVolume.textContent = s.count ?? 0;

    const tdDuration = document.createElement("td");
    tdDuration.textContent = s.duration ?? 0;

    const tdFeeling = document.createElement("td");
    tdFeeling.textContent = s.feeling || "";

    const tdNotes = document.createElement("td");
    tdNotes.textContent = s.notes || "";

    tr.appendChild(tdDate);
    tr.appendChild(tdType);
    tr.appendChild(tdGrade);
    tr.appendChild(tdVolume);
    tr.appendChild(tdDuration);
    tr.appendChild(tdFeeling);
    tr.appendChild(tdNotes);

    tbody.appendChild(tr);
  });
}

// Statistiques
function computeStats() {
  const today = todayISO();

  let sessions7 = 0;
  let sessions30 = 0;
  let volume7 = 0;
  let volume30 = 0;

  const typeCounts = { Bloc: 0, Voie: 0, Poutre: 0, Tractions: 0, Autre: 0 };
  const feelingCounts = {
    "Très facile": 0,
    "Facile": 0,
    "Moyen": 0,
    "Dur": 0,
    "À fond": 0
  };

  const blocColorCounts = {
    Jaune: 0,
    Vert: 0,
    Bleu: 0,
    Violet: 0,
    Rouge: 0,
    Noir: 0,
    Blanc: 0
  };

  sessions.forEach(s => {
    const diff = daysDiff(today, s.date);
    if (diff <= 7) {
      sessions7++;
      volume7 += s.count || 0;
    }
    if (diff <= 30) {
      sessions30++;
      volume30 += s.count || 0;
    }

    if (typeCounts[s.type] !== undefined) {
      typeCounts[s.type] += 1;
    }

    if (feelingCounts[s.feeling] !== undefined) {
      feelingCounts[s.feeling] += 1;
    }

    if (s.type === "Bloc" && s.blocColor && blocColorCounts[s.blocColor] !== undefined) {
      blocColorCounts[s.blocColor] += s.count || 0 || 1;
    }
  });

  return {
    sessions7,
    sessions30,
    volume7,
    volume30,
    typeCounts,
    feelingCounts,
    blocColorCounts
  };
}

function renderStats() {
  const stats = computeStats();

  document.getElementById("sessions-7").textContent = stats.sessions7;
  document.getElementById("sessions-30").textContent = stats.sessions30;
  document.getElementById("volume-7").textContent = stats.volume7;
  document.getElementById("volume-30").textContent = stats.volume30;

  const totalSessions = sessions.length || 1;

  // Types
  const typeLabels = [];
  let mainType = null;
  let mainTypeCount = 0;
  Object.entries(stats.typeCounts).forEach(([type, c]) => {
    if (c > 0) {
      const pct = Math.round((c / totalSessions) * 100);
      typeLabels.push(`${type} ${pct}%`);
      if (c > mainTypeCount) {
        mainTypeCount = c;
        mainType = `${type} (${pct}%)`;
      }
    }
  });
  document.getElementById("main-type").textContent = mainType || "N/A";
  document.getElementById("types-distribution").textContent =
    typeLabels.length ? typeLabels.join(" · ") : "N/A";

  // Sensations
  const feelingLabels = [];
  let fullSendPct = 0;
  const totalFeelings = Object.values(stats.feelingCounts).reduce((a, b) => a + b, 0) || 1;

  Object.entries(stats.feelingCounts).forEach(([f, c]) => {
    if (c > 0) {
      const pct = Math.round((c / totalFeelings) * 100);
      feelingLabels.push(`${f} ${pct}%`);
    }
  });

  fullSendPct = Math.round((stats.feelingCounts["À fond"] / totalFeelings) * 100);
  document.getElementById("full-send-7").textContent = fullSendPct;
  document.getElementById("feelings-distribution").textContent =
    feelingLabels.length ? feelingLabels.join(" · ") : "N/A";

  // Niveau dominant bloc
  const diffSummary = guessMainDifficultyLevel(stats.blocColorCounts);
  document.getElementById("difficulty-summary").textContent = diffSummary;
}

// Niveau bloc dominant
function guessMainDifficultyLevel(blocColorCounts) {
  const weights = {
    Jaune: 1,
    Vert: 2,
    Bleu: 3,
    Violet: 4,
    Rouge: 5,
    Noir: 6,
    Blanc: 7
  };

  let totalVolume = 0;
  let weighted = 0;

  Object.entries(blocColorCounts).forEach(([color, count]) => {
    totalVolume += count;
    weighted += (weights[color] || 0) * count;
  });

  if (totalVolume === 0) {
    return "Niveau dominant : N/A (pas assez de blocs colorés).";
  }

  const avg = weighted / totalVolume;

  let mainPair = "Jaune/Vert";
  let label = "débutant";

  if (avg >= 1.5 && avg < 2.5) {
    mainPair = "Vert/Bleu";
    label = "débutant+ / intermédiaire";
  } else if (avg >= 2.5 && avg < 3.5) {
    mainPair = "Bleu/Violet";
    label = "intermédiaire";
  } else if (avg >= 3.5 && avg < 4.5) {
    mainPair = "Violet/Rouge";
    label = "intermédiaire+ / avancé";
  } else if (avg >= 4.5) {
    mainPair = "Rouge/Noir/Blanc";
    label = "avancé";
  }

  return `Tu grimpes surtout ${mainPair} (niveau ${label}).`;
}

// Conseils d’entraînement
function generateTrainingAdvice() {
  const stats = computeStats();
  const advice = [];

  const today = todayISO();
  const last7 = sessions.filter(s => daysDiff(today, s.date) <= 7);
  const sessions7 = stats.sessions7;
  const fullSendSessions = last7.filter(s => s.feeling === "À fond").length;

  // 1. Charge / récupération
  if (sessions7 > 4 && fullSendSessions >= 2) {
    advice.push(
      "Tu as plus de 4 séances dans les 7 derniers jours avec plusieurs séances \"À fond\" : prévois une semaine plus légère ou au moins un vrai jour de repos."
    );
  } else if (sessions7 === 0) {
    advice.push(
      "Tu n'as aucune séance sur les 7 derniers jours : reprendre doucement avec 1 à 2 séances légères peut être une bonne idée."
    );
  } else {
    advice.push(
      "Le volume des 7 derniers jours semble raisonnable : garde 1 jour de repos complet entre les séances intenses."
    );
  }

  // 2. Difficulté (couleurs blocs)
  const blocColors = stats.blocColorCounts;
  const easyVolume = (blocColors.Jaune || 0) + (blocColors.Vert || 0);
  const totalBlocVolume = Object.values(blocColors).reduce((a, b) => a + b, 0);

  if (totalBlocVolume > 0 && easyVolume / totalBlocVolume > 0.7) {
    advice.push(
      "Tu grimpes surtout en Jaune/Vert : tente de rajouter quelques blocs plus durs (Bleu/Violet) en début de séance quand tu es frais."
    );
  } else if (totalBlocVolume > 0) {
    advice.push(
      "Tu explores déjà plusieurs couleurs : continue à alterner blocs dans ta zone de confort et quelques essais plus durs."
    );
  } else {
    advice.push(
      "Peu de données sur les couleurs de blocs : pense à renseigner les couleurs pour suivre ton évolution de niveau."
    );
  }

  // 3. Bloc vs continuité
  const typeCounts = stats.typeCounts;
  const climbingSessions =
    typeCounts.Bloc + typeCounts.Voie + typeCounts.Poutre + typeCounts.Tractions;
  if (climbingSessions > 0) {
    const blocShare = climbingSessions ? typeCounts.Bloc / climbingSessions : 0;
    if (blocShare > 0.7) {
      advice.push(
        "Tu fais presque que du bloc : ajoute au moins une séance orientée continuité (voies plus longues, circuits, poutre en aérobie)."
      );
    } else if (typeCounts.Voie > typeCounts.Bloc) {
      advice.push(
        "Tu fais beaucoup de voies : garder quelques blocs plus durs peut t'aider à développer la force et la puissance."
      );
    } else {
      advice.push(
        "Ton mix Bloc/Voie est assez équilibré : continue en ajustant selon tes objectifs (force vs continuité)."
      );
    }
  } else {
    advice.push(
      "Pas assez de séances pour analyser le ratio Bloc/Voie : commence par enregistrer quelques séances variées."
    );
  }

  return advice;
}

function renderAdvice() {
  const ul = document.getElementById("advice-list");
  ul.innerHTML = "";
  const advice = generateTrainingAdvice();
  advice.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  });
}

// Résumé IA 14 jours
function buildPerplexitySummary() {
  const today = todayISO();
  const last14 = sessions
    .filter(s => daysDiff(today, s.date) <= 14)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  if (last14.length === 0) {
    return "Aucune séance enregistrée sur les 14 derniers jours.";
  }

  const stats = computeStats();
  const volume14 = last14.reduce((sum, s) => sum + (s.count || 0), 0);

  // sensations sur 14 jours
  const feelings14 = {
    "Très facile": 0,
    "Facile": 0,
    "Moyen": 0,
    "Dur": 0,
    "À fond": 0
  };
  last14.forEach(s => {
    if (feelings14[s.feeling] !== undefined) {
      feelings14[s.feeling] += 1;
    }
  });

  const total14 = last14.length || 1;
  let mainFeeling = "Moyen";
  let mainFeelingCount = 0;
  Object.entries(feelings14).forEach(([f, c]) => {
    if (c > mainFeelingCount) {
      mainFeelingCount = c;
      mainFeeling = f;
    }
  });

  // Difficulté dominante via couleurs blocs sur 14 jours
  const blocColorCounts14 = {
    Jaune: 0,
    Vert: 0,
    Bleu: 0,
    Violet: 0,
    Rouge: 0,
    Noir: 0,
    Blanc: 0
  };

  last14.forEach(s => {
    if (s.type === "Bloc" && s.blocColor && blocColorCounts14[s.blocColor] !== undefined) {
      blocColorCounts14[s.blocColor] += s.count || 0 || 1;
    }
  });

  const difficultySentence = guessMainDifficultyLevel(blocColorCounts14);

  // Notes douleurs
  const painKeywords = ["douleur", "doigt", "doigts", "coude", "coudes", "épaule", "épaules", "bless"];
  const painNotes = last14
    .map(s => s.notes || "")
    .filter(n =>
      painKeywords.some(kw => n.toLowerCase().includes(kw))
    );

  const painText =
    painNotes.length > 0
      ? `Plusieurs notes mentionnent des douleurs ou gênes (exemples : ${painNotes
          .slice(0, 2)
          .join(" / ")}).`
      : "Aucune mention claire de douleurs importantes dans les notes.";

  const text = [
    `Sur les 14 derniers jours, j'ai fait ${last14.length} séances pour un volume total d'environ ${volume14} blocs/voies.`,
    `La sensation dominante est plutôt "${mainFeeling}" sur cette période.`,
    difficultySentence,
    `Répartition des sensations (14 jours) : Très facile ${feelings14["Très facile"]}, Facile ${feelings14["Facile"]}, Moyen ${feelings14["Moyen"]}, Dur ${feelings14["Dur"]}, À fond ${feelings14["À fond"]}.`,
    painText
  ].join(" ");

  return text;
}

function renderAISummary() {
  const textarea = document.getElementById("ai-summary");
  textarea.value = buildPerplexitySummary();
}

// Gestion UI
function onTypeChange() {
  const type = document.getElementById("type").value;
  const blocRow = document.getElementById("bloc-color-row");
  const voieRow = document.getElementById("voie-grade-row");

  if (type === "Bloc") {
    blocRow.style.display = "flex";
    voieRow.style.display = "none";
  } else if (type === "Voie") {
    blocRow.style.display = "none";
    voieRow.style.display = "flex";
  } else {
    blocRow.style.display = "none";
    voieRow.style.display = "none";
  }
}

function resetForm() {
  document.getElementById("session-form").reset();
  document.getElementById("date").value = todayISO();
  onTypeChange();
}

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  // Chargement
  sessions = loadSessions();

  // Valeurs par défaut
  document.getElementById("date").value = todayISO();
  onTypeChange();

  // Listeners
  document.getElementById("type").addEventListener("change", onTypeChange);

  document.getElementById("session-form").addEventListener("submit", e => {
    e.preventDefault();
    const s = readForm();
    sessions.push(s);
    saveSessions();
    renderTable();
    renderStats();
    renderAdvice();
    renderAISummary();
    resetForm();
  });

  document.getElementById("filter-type").addEventListener("change", () => {
    renderTable();
  });

  document.getElementById("filter-period").addEventListener("change", () => {
    renderTable();
  });

  document.getElementById("clear-data").addEventListener("click", () => {
    const ok = confirm(
      "Tu vas effacer toutes les séances enregistrées dans ce navigateur. Continuer ?"
    );
    if (!ok) return;
    sessions = [];
    saveSessions();
    renderTable();
    renderStats();
    renderAdvice();
    renderAISummary();
  });

  document.getElementById("copy-summary").addEventListener("click", async () => {
    const textarea = document.getElementById("ai-summary");
    const feedback = document.getElementById("copy-feedback");
    try {
      await navigator.clipboard.writeText(textarea.value);
      feedback.textContent = "Résumé copié dans le presse-papier.";
    } catch (e) {
      feedback.textContent = "Impossible de copier automatiquement, sélectionne et copie le texte manuellement.";
    }
    setTimeout(() => {
      feedback.textContent = "";
    }, 3000);
  });

  // Premier affichage
  renderTable();
  renderStats();
  renderAdvice();
  renderAISummary();
});
