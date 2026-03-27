"use strict";

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  🧑‍💻 Vibecodeado con MiniMax 2.5 por Gerardo Saz                 ║
 * ║                                                                  ║
 * ║  ¿Quieres contribuir? ¡Haz un Pull Request!                    ║
 * ║  🔗 https://github.com/pgap22/udb-notas-planificador            ║
 * ║                                                                  ║
 * ║  ⭐ Si te sirve, dale una estrella al repo                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

console.log(
  `%c🧑‍💻 UDB Notas Planificador %cVibecodeado por Gerardo Saz`,
  "background: #6366f1; color: white; padding: 8px 12px; border-radius: 6px 0 0 6px; font-weight: bold; font-size: 14px;",
  "background: #1e293b; color: #a5b4fc; padding: 8px 12px; border-radius: 0 6px 6px 0; font-size: 14px;"
);

console.log(
  `%c📦 Repo: %chttps://github.com/pgap22/udb-notas-planificador`,
  "color: #fbbf24; font-weight: bold;",
  "color: #60a5fa;"
);

console.log(
  "%c⭐ ¡Dale una estrella si te sirve!",
  "color: #fbbf24; font-weight: bold; font-size: 14px;"
);

const STORAGE_KEY = "grade-planner-v1";
const MAX_GRADE = new Decimal(10);
const ZERO = new Decimal(0);

/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} name
 * @property {boolean} done
 * @property {string} score
 * @property {string} weight
 * @property {string} expected
 */

/**
 * @typedef {Object} Subject
 * @property {string} id
 * @property {string} name
 * @property {string} targetGrade
 * @property {Activity[]} activities
 */

/**
 * @typedef {Object} AppState
 * @property {Subject[]} subjects
 * @property {string} selectedSubjectId
 */

/** @type {HTMLUListElement} */
const subjectList = document.getElementById("subject-list");
/** @type {HTMLInputElement} */
const subjectNameInput = document.getElementById("subject-name");
/** @type {HTMLInputElement} */
const targetGradeInput = document.getElementById("target-grade");
/** @type {HTMLTableSectionElement} */
const activityBody = document.getElementById("activity-body");
/** @type {HTMLTemplateElement} */
const activityTemplate = document.getElementById("activity-row-template");
/** @type {HTMLElement} */
const currentGradeEl = document.getElementById("current-grade");
/** @type {HTMLElement} */
const projectedGradeEl = document.getElementById("projected-grade");
/** @type {HTMLElement} */
const missingGradeEl = document.getElementById("missing-grade");
/** @type {HTMLElement} */
const goalStatusEl = document.getElementById("goal-status");
/** @type {HTMLTextAreaElement} */
const udbInput = document.getElementById("udb-input");

/** @type {AppState} */
let state = loadState();

// Theme toggle
const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
});

bindEvents();
render();

function bindEvents() {
  document.getElementById("add-subject-btn").addEventListener("click", () => {
    const newSubject = createSubject(`Materia ${state.subjects.length + 1}`);
    state.subjects = [...state.subjects, newSubject];
    state.selectedSubjectId = newSubject.id;
    persistAndRender();
  });

  document.getElementById("delete-subject-btn").addEventListener("click", () => {
    if (state.subjects.length <= 1) {
      state.subjects = [];
      state.selectedSubjectId = "";
      persistAndRender();
      return;
    }
    state.subjects = state.subjects.filter((s) => s.id !== state.selectedSubjectId);
    state.selectedSubjectId = state.subjects[0].id;
    persistAndRender();
  });

  document.getElementById("add-activity-btn").addEventListener("click", () => {
    const subject = getSelectedSubject();
    const activity = createActivity("Nueva actividad");
    subject.activities = [...subject.activities, activity];
    persistAndRender();
  });

  document.getElementById("import-udb-btn").addEventListener("click", () => {
    const raw = udbInput.value.trim();
    if (!raw) {
      alert("Pega primero el contenido UDB.");
      return;
    }

    const parsed = parseUdbBlock(raw);
    if (!parsed) {
      alert("No se pudo interpretar el bloque UDB. Revisa el formato pegado.");
      return;
    }

    const subject = createSubject(parsed.subjectName);
    subject.activities = parsed.activities;
    state.subjects = [...state.subjects, subject];
    state.selectedSubjectId = subject.id;
    udbInput.value = "";
    persistAndRender();
  });

  subjectNameInput.addEventListener("change", (event) => {
    const subject = getSelectedSubject();
    const nextValue = event.target.value.trimStart();
    subject.name = nextValue || "Sin nombre";
    persistAndRender();
  });

  targetGradeInput.addEventListener("change", (event) => {
    const subject = getSelectedSubject();
    const value = sanitizeNumber(event.target.value, 0, 10);
    subject.targetGrade = value;
    persistAndRender();
  });
}

function render() {
  renderSubjects();
  renderSelectedSubject();
}

function renderSubjects() {
  subjectList.innerHTML = "";
  if (state.subjects.length === 0) {
    const empty = document.createElement("li");
    empty.className = "subject-item";
    empty.textContent = "Sin materias. Crea una nueva.";
    subjectList.appendChild(empty);
    return;
  }

  for (const subject of state.subjects) {
    const li = document.createElement("li");
    li.className = `subject-item ${subject.id === state.selectedSubjectId ? "active" : ""}`;
    li.textContent = subject.name;
    li.addEventListener("click", () => {
      state.selectedSubjectId = subject.id;
      persistAndRender();
    });
    subjectList.appendChild(li);
  }
}

function renderSelectedSubject() {
  // Check if there's a selected subject first
  if (!state.selectedSubjectId || state.subjects.length === 0) {
    subjectNameInput.value = "";
    targetGradeInput.value = "6.00";
    currentGradeEl.textContent = "0.00";
    projectedGradeEl.textContent = "0.00";
    missingGradeEl.textContent = "0.00";
    goalStatusEl.textContent = "Sin materias";
    goalStatusEl.className = "status neutral";
    activityBody.innerHTML = "";
    return;
  }

  const subject = getSelectedSubject();
  if (!subject) {
    subjectNameInput.value = "";
    targetGradeInput.value = "6.00";
    currentGradeEl.textContent = "0.00";
    projectedGradeEl.textContent = "0.00";
    missingGradeEl.textContent = "0.00";
    goalStatusEl.textContent = "Sin materias";
    goalStatusEl.className = "status neutral";
    activityBody.innerHTML = "";
    return;
  }
  subjectNameInput.value = subject.name;
  targetGradeInput.value = subject.targetGrade;

  const calculations = calculateSubject(subject);

  currentGradeEl.textContent = formatDecimal(calculations.current);
  projectedGradeEl.textContent = formatDecimal(calculations.projectedMin);
  missingGradeEl.textContent = formatDecimal(calculations.missing);
  goalStatusEl.textContent = calculations.statusText;
  goalStatusEl.className = `status ${calculations.statusClass}`;

  activityBody.innerHTML = "";
  for (const activity of subject.activities) {
    const row = activityTemplate.content.firstElementChild.cloneNode(true);
    const nameInput = row.querySelector('[data-field="name"]');
    const doneInput = row.querySelector('[data-field="done"]');
    const scoreInput = row.querySelector('[data-field="score"]');
    const weightInput = row.querySelector('[data-field="weight"]');
    const expectedInput = row.querySelector('[data-field="expected"]');
    const globalCell = row.querySelector(".global-cell");
    const globalExpectedCell = row.querySelector(".global-expected-cell");
    const requiredCell = row.querySelector(".required-cell");
    const deleteBtn = row.querySelector(".delete-activity-btn");

    nameInput.value = activity.name;
    doneInput.checked = activity.done;
    scoreInput.value = activity.score;
    weightInput.value = activity.weight;
    expectedInput.value = activity.expected || "";

    // Set readonly based on done status
    const setReadonly = (input, isDone) => {
      input.readOnly = isDone;
      input.disabled = isDone;
    };
    setReadonly(nameInput, activity.done);
    setReadonly(scoreInput, activity.done);
    setReadonly(weightInput, activity.done);
    setReadonly(expectedInput, activity.done);

    const weight = toDecimal(activity.weight);
    const score = toDecimal(activity.score);
    const globalValue = score.mul(weight).div(100);
    globalCell.textContent = formatDecimal(globalValue);

    const required = calculations.requiredByActivity.get(activity.id);
    const hasCustomExpected = activity.expected && activity.expected.trim() !== "";
    if (required) {
      requiredCell.textContent = formatDecimal(required.requiredScore);
      requiredCell.className = `required-cell ${required.className}${hasCustomExpected ? " has-custom" : ""}`;
      
      // Global expected = expected score * weight / 100
      const expectedScore = hasCustomExpected ? toDecimal(activity.expected) : required.requiredScore;
      const globalExpected = expectedScore.mul(weight).div(100);
      globalExpectedCell.textContent = formatDecimal(globalExpected);
    } else {
      requiredCell.textContent = activity.done ? "Hecho" : "-";
      requiredCell.className = "required-cell";
      globalExpectedCell.textContent = "-";
    }

    nameInput.addEventListener("change", (event) => {
      activity.name = event.target.value;
      persistAndRender();
    });

    doneInput.addEventListener("change", (event) => {
      activity.done = Boolean(event.target.checked);
      if (!activity.done && toDecimal(activity.score).equals(0)) {
        activity.score = "0";
      }
      // Update readonly based on new done status
      nameInput.readOnly = activity.done;
      nameInput.disabled = activity.done;
      scoreInput.readOnly = activity.done;
      scoreInput.disabled = activity.done;
      weightInput.readOnly = activity.done;
      weightInput.disabled = activity.done;
      expectedInput.readOnly = activity.done;
      expectedInput.disabled = activity.done;
      persistAndRender();
    });

    scoreInput.addEventListener("change", (event) => {
      activity.score = sanitizeNumber(event.target.value, 0, 10);
      persistAndRender();
    });

    weightInput.addEventListener("change", (event) => {
      activity.weight = sanitizeNumber(event.target.value, 0, 100);
      persistAndRender();
    });

    expectedInput.addEventListener("change", (event) => {
      const val = event.target.value.trim();
      activity.expected = val ? sanitizeNumber(val, 0, 10) : "";
      persistAndRender();
    });

    deleteBtn.addEventListener("click", () => {
      subject.activities = subject.activities.filter((a) => a.id !== activity.id);
      persistAndRender();
    });

    activityBody.appendChild(row);
  }
}

/**
 * @param {Subject} subject
 */
function calculateSubject(subject) {
  const target = toDecimal(subject.targetGrade);
  const doneActivities = subject.activities.filter((a) => a.done);
  const pendingActivities = subject.activities.filter((a) => !a.done);

  const current = doneActivities.reduce((acc, activity) => {
    const score = toDecimal(activity.score);
    const weight = toDecimal(activity.weight);
    return acc.plus(score.mul(weight).div(100));
  }, ZERO);

  const totalPendingWeight = pendingActivities.reduce((acc, activity) => {
    return acc.plus(toDecimal(activity.weight));
  }, ZERO);

  const missingRaw = target.minus(current);
  const missing = Decimal.max(missingRaw, ZERO);

  /** @type {Map<string, {requiredScore: Decimal, className: string, expectedScore: Decimal}>} */
  const requiredByActivity = new Map();

  // Separate activities with custom expected vs auto-calculated
  const customExpected = pendingActivities.filter(a => a.expected && a.expected.trim() !== "");
  const autoCalculated = pendingActivities.filter(a => !a.expected || a.expected.trim() === "");

  // Calculate projected from custom expected scores
  let projectedFromCustom = ZERO;
  for (const activity of customExpected) {
    const expected = toDecimal(activity.expected);
    const weight = toDecimal(activity.weight);
    projectedFromCustom = projectedFromCustom.plus(expected.mul(weight).div(100));
    requiredByActivity.set(activity.id, {
      requiredScore: expected,
      className: classifyRequired(expected),
      expectedScore: expected
    });
  }

  // Calculate remaining needed after custom expectations
  const remainingNeeded = Decimal.max(ZERO, target.minus(current).minus(projectedFromCustom));
  const remainingWeight = autoCalculated.reduce((acc, activity) => {
    return acc.plus(toDecimal(activity.weight));
  }, ZERO);

  // Calculate required for auto-calculated activities
  if (autoCalculated.length > 0 && remainingNeeded.greaterThan(0) && remainingWeight.greaterThan(0)) {
    for (const activity of autoCalculated) {
      const requiredScore = remainingNeeded.mul(100).div(remainingWeight);
      const clampedRequired = Decimal.max(ZERO, Decimal.min(MAX_GRADE, requiredScore));
      requiredByActivity.set(activity.id, {
        requiredScore: clampedRequired,
        className: classifyRequired(clampedRequired),
        expectedScore: clampedRequired
      });
    }
  } else if (autoCalculated.length > 0 && remainingNeeded.equals(0)) {
    for (const activity of autoCalculated) {
      requiredByActivity.set(activity.id, {
        requiredScore: ZERO,
        className: "required-green",
        expectedScore: ZERO
      });
    }
  }

  const maxPossible = current.plus(
    pendingActivities.reduce((acc, activity) => {
      const weight = toDecimal(activity.weight);
      return acc.plus(MAX_GRADE.mul(weight).div(100));
    }, ZERO)
  );

  const projectedMin = current.plus(
    pendingActivities.reduce((acc, activity) => {
      const data = requiredByActivity.get(activity.id);
      if (!data || !data.expectedScore) {
        return acc;
      }
      return acc.plus(data.expectedScore.mul(toDecimal(activity.weight)).div(100));
    }, ZERO)
  );

  let statusText = "En progreso";
  let statusClass = "neutral";

  if (target.lessThanOrEqualTo(current)) {
    statusText = "Objetivo ya cumplido";
    statusClass = "ok";
  } else if (totalPendingWeight.equals(0)) {
    statusText = "Sin actividades pendientes";
    statusClass = current.greaterThanOrEqualTo(target) ? "ok" : "bad";
  } else if (maxPossible.lessThan(target)) {
    statusText = "Objetivo imposible con actividades pendientes";
    statusClass = "bad";
  } else {
    const balanced = missing.mul(100).div(totalPendingWeight);
    if (balanced.lessThanOrEqualTo(7)) {
      statusText = "Objetivo alcanzable";
      statusClass = "ok";
    } else if (balanced.lessThanOrEqualTo(9)) {
      statusText = "Objetivo exigente";
      statusClass = "warn";
    } else {
      statusText = "Objetivo muy exigente";
      statusClass = "bad";
    }
  }

  return {
    current,
    projectedMin,
    missing,
    requiredByActivity,
    statusText,
    statusClass
  };
}

/**
 * @param {Decimal} score
 */
function classifyRequired(score) {
  if (score.lessThanOrEqualTo(7)) {
    return "required-green";
  }
  if (score.lessThanOrEqualTo(9)) {
    return "required-yellow";
  }
  return "required-red";
}

/**
 * @param {string} raw
 * @param {number} min
 * @param {number} max
 */
function sanitizeNumber(raw, min, max) {
  if (!raw) {
    return "0";
  }
  let decimal;
  try {
    decimal = new Decimal(raw);
  } catch {
    return "0";
  }
  const bounded = Decimal.max(new Decimal(min), Decimal.min(new Decimal(max), decimal));
  return bounded.toFixed(2);
}

/**
 * @param {string|number|Decimal} value
 */
function toDecimal(value) {
  try {
    return new Decimal(value);
  } catch {
    return ZERO;
  }
}

/**
 * @param {Decimal} value
 */
function formatDecimal(value) {
  return value.toDecimalPlaces(2).toFixed(2);
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function getSelectedSubject() {
  const subject = state.subjects.find((s) => s.id === state.selectedSubjectId);
  if (!subject) {
    throw new Error("No se encontró la materia seleccionada.");
  }
  return subject;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.subjects)) {
        return parsed;
      }
    } catch {
      // fallback a estado vacío
    }
  }

  return {
    subjects: [],
    selectedSubjectId: ""
  };
}

/**
 * @param {string} raw
 * @returns {{subjectName: string, activities: Activity[]} | null}
 */
function parseUdbBlock(raw) {
  const normalized = raw.replace(/\r/g, "");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  const subjectName = parseModuleName(lines);
  if (!subjectName) {
    return null;
  }

  const activities = parseActivities(lines);
  if (activities.length === 0) {
    return null;
  }

  return { subjectName, activities };
}

/**
 * @param {string[]} lines
 */
function parseModuleName(lines) {
  const labelIndex = lines.findIndex((line) => /^Detalle m[oó]dulo:/i.test(line));
  if (labelIndex >= 0) {
    const inline = lines[labelIndex].replace(/^Detalle m[oó]dulo:\s*/i, "").trim();
    if (inline) {
      return inline;
    }
    if (labelIndex + 1 < lines.length) {
      return lines[labelIndex + 1];
    }
  }
  return null;
}

/**
 * @param {string[]} lines
 * @returns {Activity[]}
 */
function parseActivities(lines) {
  const activities = [];
  const headerIndex = lines.findIndex((line) => /Actividad/i.test(line) && /Calificaci[oó]n/i.test(line));
  const start = headerIndex >= 0 ? headerIndex + 1 : 0;

  for (let i = start; i < lines.length; i += 1) {
    const parsed = parseActivityLine(lines[i]);
    if (!parsed) {
      continue;
    }
    activities.push(createSeedActivity(parsed.name, parsed.done, parsed.score, parsed.weight));
  }

  return activities;
}

/**
 * Soporta líneas UDB como:
 * "Actividad ... 8.80 20.00 % 1.76"
 * @param {string} line
 * @returns {{name: string, done: boolean, score: string, weight: string} | null}
 */
function parseActivityLine(line) {
  const pattern = /^(.*?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*%\s+(\d+(?:[.,]\d+)?)$/;
  const match = line.match(pattern);
  if (!match) {
    return null;
  }

  const name = match[1].trim();
  const score = sanitizeNumber(match[2].replace(",", "."), 0, 10);
  const weight = sanitizeNumber(match[3].replace(",", "."), 0, 100);
  const done = toDecimal(score).greaterThan(0);

  if (!name) {
    return null;
  }

  return { name, done, score, weight };
}

function createSubject(name) {
  return {
    id: crypto.randomUUID(),
    name,
    targetGrade: "6.00",
    activities: []
  };
}

function createActivity(name) {
  return {
    id: crypto.randomUUID(),
    name,
    done: false,
    score: "0.00",
    weight: "0.00",
    expected: ""
  };
}

function createSeedActivity(name, done, score, weight) {
  return {
    id: crypto.randomUUID(),
    name,
    done,
    score,
    weight,
    expected: ""
  };
}
