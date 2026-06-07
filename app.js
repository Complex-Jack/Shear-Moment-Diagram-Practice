const ids = {
  newCaseButton: document.getElementById("newCaseButton"),
  attemptStatus: document.getElementById("attemptStatus"),
  supportDescription: document.getElementById("supportDescription"),
  beamLength: document.getElementById("beamLength"),
  stationValue: document.getElementById("stationValue"),
  problemDiagram: document.getElementById("problemDiagram"),
  loadList: document.getElementById("loadList"),
  checkButton: document.getElementById("checkButton"),
  methodFeedback: document.getElementById("methodFeedback"),
  lockedSolution: document.getElementById("lockedSolution"),
  solutionContent: document.getElementById("solutionContent"),
  shearPlot: document.getElementById("shearPlot"),
  momentPlot: document.getElementById("momentPlot"),
  summaryReactions: document.getElementById("summaryReactions"),
  summaryMaxM: document.getElementById("summaryMaxM"),
  summaryMaxX: document.getElementById("summaryMaxX"),
};

const answerFields = {
  ra: {
    wrapper: document.getElementById("fieldRA"),
    label: document.getElementById("labelRA"),
    input: document.getElementById("answerRA"),
    feedback: document.getElementById("feedbackRA"),
  },
  rb: {
    wrapper: document.getElementById("fieldRB"),
    label: document.getElementById("labelRB"),
    input: document.getElementById("answerRB"),
    feedback: document.getElementById("feedbackRB"),
  },
  rc: {
    wrapper: document.getElementById("fieldRC"),
    label: document.getElementById("labelRC"),
    input: document.getElementById("answerRC"),
    feedback: document.getElementById("feedbackRC"),
  },
  v: {
    input: document.getElementById("answerV"),
    feedback: document.getElementById("feedbackV"),
  },
  m: {
    input: document.getElementById("answerM"),
    feedback: document.getElementById("feedbackM"),
  },
  maxM: {
    input: document.getElementById("answerMaxM"),
    feedback: document.getElementById("feedbackMaxM"),
  },
  maxX: {
    input: document.getElementById("answerMaxX"),
    feedback: document.getElementById("feedbackMaxX"),
  },
};

const state = {
  problem: null,
  attempts: 0,
  revealed: false,
};

const COLORS = {
  ink: "#15201a",
  muted: "#68736b",
  line: "#d5ddd4",
  green: "#126c61",
  red: "#b84932",
  blue: "#3e6198",
  gold: "#aa7e16",
  grid: "#edf1ec",
};

const fmt = (value, decimals = 2) => {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return normalized.toFixed(decimals);
};

const randomChoice = (items) => items[Math.floor(Math.random() * items.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function createSvg(tag, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function addText(svg, text, x, y, attrs = {}) {
  const node = createSvg("text", {
    x,
    y,
    fill: COLORS.muted,
    "font-family": "Inter, system-ui, sans-serif",
    "font-size": 12,
    ...attrs,
  });
  node.textContent = text;
  svg.append(node);
  return node;
}

function addArrowMarkers(svg) {
  const defs = createSvg("defs");
  const markers = [
    ["arrow-red", COLORS.red],
    ["arrow-green", COLORS.green],
    ["arrow-blue", COLORS.blue],
  ];
  markers.forEach(([id, color]) => {
    const marker = createSvg("marker", {
      id,
      viewBox: "0 0 10 10",
      refX: 9,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: "auto-start-reverse",
    });
    marker.append(createSvg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: color }));
    defs.append(marker);
  });
  svg.append(defs);
}

function pointLoad(x, magnitude) {
  return { type: "point", x, magnitude };
}

function distributedLoad(start, end, intensity) {
  return { type: "udl", start, end, intensity };
}

function appliedMoment(x, magnitude) {
  return { type: "moment", x, magnitude };
}

function loadResultant(load) {
  if (load.type === "point") return { force: load.magnitude, x: load.x };
  if (load.type === "udl") {
    const force = load.intensity * (load.end - load.start);
    return { force, x: 0.5 * (load.start + load.end) };
  }
  return { force: 0, x: load.x };
}

function loadEquilibrium(loads) {
  let downwardForce = 0;
  let clockwiseLoadMoment = 0;
  let appliedCouple = 0;

  loads.forEach((load) => {
    if (load.type === "moment") {
      appliedCouple += load.magnitude;
      return;
    }
    const resultant = loadResultant(load);
    downwardForce += resultant.force;
    clockwiseLoadMoment += resultant.force * resultant.x;
  });

  return { downwardForce, requiredReactionMoment: clockwiseLoadMoment - appliedCouple };
}

function solveSupportReactions(supports, loads) {
  const equilibrium = loadEquilibrium(loads);
  const unknown = supports.filter((support) => !support.given);
  const given = supports.filter((support) => support.given);
  const remainingForce = equilibrium.downwardForce - given.reduce((sum, support) => sum + support.reaction, 0);
  const remainingMoment = equilibrium.requiredReactionMoment - given.reduce((sum, support) => sum + support.reaction * support.x, 0);

  if (unknown.length !== 2) return null;
  const [first, second] = unknown;
  const firstReaction = (remainingMoment - remainingForce * second.x) / (first.x - second.x);
  const secondReaction = remainingForce - firstReaction;
  first.reaction = firstReaction;
  second.reaction = secondReaction;
  return { supports, downwardForce: equilibrium.downwardForce };
}

function shearAt(problem, x) {
  let shear = 0;
  problem.supports.forEach((support) => {
    if (support.x <= x) shear += support.reaction;
  });
  problem.loads.forEach((load) => {
    if (load.type === "point" && load.x <= x) shear -= load.magnitude;
    if (load.type === "udl" && x > load.start) {
      shear -= load.intensity * clamp(x - load.start, 0, load.end - load.start);
    }
  });
  return shear;
}

function momentAt(problem, x) {
  let moment = 0;
  problem.supports.forEach((support) => {
    if (support.x <= x) moment += support.reaction * (x - support.x);
  });
  problem.loads.forEach((load) => {
    if (load.type === "point" && load.x <= x) {
      moment -= load.magnitude * (x - load.x);
    }
    if (load.type === "udl" && x > load.start) {
      const appliedLength = clamp(x - load.start, 0, load.end - load.start);
      moment -= load.intensity * appliedLength * (x - (load.start + appliedLength / 2));
    }
    if (load.type === "moment" && load.x <= x) {
      moment -= load.magnitude;
    }
  });
  return moment;
}

function importantLocations(problem) {
  const locations = [0, problem.length];
  problem.supports.forEach((support) => locations.push(support.x));
  problem.loads.forEach((load) => {
    if (load.type === "point" || load.type === "moment") locations.push(load.x);
    if (load.type === "udl") locations.push(load.start, load.end);
  });
  return [...new Set(locations)].sort((a, b) => a - b);
}

function findMaximumMoment(problem) {
  const candidates = [];
  const samples = 5000;
  for (let index = 0; index <= samples; index += 1) {
    candidates.push((problem.length * index) / samples);
  }
  importantLocations(problem).forEach((x) => {
    candidates.push(clamp(x - 1e-6, 0, problem.length), x, clamp(x + 1e-6, 0, problem.length));
  });

  let best = { x: 0, moment: momentAt(problem, 0) };
  candidates.forEach((x) => {
    const moment = momentAt(problem, x);
    if (Math.abs(moment) > Math.abs(best.moment)) best = { x, moment };
  });
  return best;
}

function chooseStation(problem) {
  const forbidden = importantLocations(problem);
  const candidates = [];
  for (let x = 1; x < problem.length; x += 0.5) {
    if (forbidden.every((eventX) => Math.abs(eventX - x) > 0.3)) candidates.push(x);
  }
  return randomChoice(candidates.length ? candidates : [problem.length / 2]);
}

function generateLoads(length) {
  const caseType = randomChoice(["single-point", "two-point", "full-udl", "mixed", "couple"]);
  if (caseType === "single-point") {
    return [pointLoad(randomInt(2, length - 2), randomInt(3, 8) * 5)];
  }
  if (caseType === "two-point") {
    const positions = [randomInt(2, Math.floor(length / 2)), randomInt(Math.ceil(length / 2) + 1, length - 1)];
    return [
      pointLoad(positions[0], randomInt(3, 7) * 5),
      pointLoad(positions[1], randomInt(2, 6) * 5),
    ];
  }
  if (caseType === "full-udl") {
    return [distributedLoad(0, length, randomInt(2, 6) * 2)];
  }
  if (caseType === "mixed") {
    const start = randomInt(1, Math.max(1, length - 5));
    const end = randomInt(start + 2, length - 1);
    let pointX = randomInt(1, length - 1);
    while (Math.abs(pointX - start) < 0.5 || Math.abs(pointX - end) < 0.5) pointX = randomInt(1, length - 1);
    return [
      distributedLoad(start, end, randomInt(2, 5) * 2),
      pointLoad(pointX, randomInt(3, 7) * 5),
    ];
  }

  const pointX = randomInt(2, length - 2);
  let momentX = randomInt(1, length - 1);
  while (momentX === pointX) momentX = randomInt(1, length - 1);
  return [
    pointLoad(pointX, randomInt(3, 7) * 5),
    appliedMoment(momentX, randomChoice([-1, 1]) * randomInt(2, 5) * 5),
  ];
}

function generateSupports(length, loads) {
  const threeSupport = Math.random() < 0.35;
  if (!threeSupport) {
    const supports = [
      { label: "A", x: randomInt(0, 2), given: false },
      { label: "B", x: randomInt(length - 2, length), given: false },
    ];
    return solveSupportReactions(supports, loads);
  }

  const equilibrium = loadEquilibrium(loads);
  const positions = [
    randomInt(0, 1),
    randomInt(Math.max(3, Math.floor(length / 2) - 1), Math.min(length - 3, Math.ceil(length / 2) + 1)),
    randomInt(length - 1, length),
  ];
  const givenIndex = randomInt(0, 2);
  const givenReaction = equilibrium.downwardForce * randomChoice([0.15, 0.2, 0.25, 0.3]);
  const supports = positions.map((x, index) => ({
    label: ["A", "B", "C"][index],
    x,
    given: index === givenIndex,
    reaction: index === givenIndex ? givenReaction : undefined,
  }));
  return solveSupportReactions(supports, loads);
}

function generateProblem() {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const length = randomInt(8, 12);
    const loads = generateLoads(length);
    const reactionSolution = generateSupports(length, loads);
    if (!reactionSolution || reactionSolution.supports.some((support) => support.reaction < 1)) continue;

    const problem = { length, loads, supports: reactionSolution.supports, downwardForce: reactionSolution.downwardForce };
    problem.station = chooseStation(problem);
    problem.stationShear = shearAt(problem, problem.station);
    problem.stationMoment = momentAt(problem, problem.station);
    const maximum = findMaximumMoment(problem);
    problem.maxMoment = Math.abs(maximum.moment);
    problem.maxMomentSigned = maximum.moment;
    problem.maxMomentX = maximum.x;
    return problem;
  }
  const fallbackLoads = [pointLoad(4, 30), distributedLoad(6, 9, 8)];
  const fallbackSupports = [
    { label: "A", x: 1, given: false },
    { label: "B", x: 9, given: false },
  ];
  const fallbackSolution = solveSupportReactions(fallbackSupports, fallbackLoads);
  return {
    length: 10,
    loads: fallbackLoads,
    supports: fallbackSolution.supports,
    downwardForce: fallbackSolution.downwardForce,
    station: 7.5,
    stationShear: 0,
    stationMoment: 0,
    maxMoment: 0,
    maxMomentSigned: 0,
    maxMomentX: 0,
  };
}

function finalizeFallback(problem) {
  problem.stationShear = shearAt(problem, problem.station);
  problem.stationMoment = momentAt(problem, problem.station);
  const maximum = findMaximumMoment(problem);
  problem.maxMoment = Math.abs(maximum.moment);
  problem.maxMomentSigned = maximum.moment;
  problem.maxMomentX = maximum.x;
  return problem;
}

function describeLoad(load) {
  if (load.type === "point") return `Downward point load: ${fmt(load.magnitude, 0)} kN at x = ${fmt(load.x, 1)} m`;
  if (load.type === "udl") return `Uniform load: ${fmt(load.intensity, 0)} kN/m from x = ${fmt(load.start, 1)} m to x = ${fmt(load.end, 1)} m`;
  const direction = load.magnitude > 0 ? "counterclockwise" : "clockwise";
  return `Applied couple: ${fmt(Math.abs(load.magnitude), 0)} kN·m ${direction} at x = ${fmt(load.x, 1)} m`;
}

function renderProblemDiagram(problem) {
  const svg = ids.problemDiagram;
  svg.innerHTML = "";
  addArrowMarkers(svg);
  const left = 70;
  const right = 700;
  const beamY = 165;
  const scaleX = (right - left) / problem.length;
  const x = (value) => left + value * scaleX;

  svg.append(createSvg("line", { x1: left, y1: beamY, x2: right, y2: beamY, stroke: COLORS.ink, "stroke-width": 7, "stroke-linecap": "round" }));

  problem.supports.forEach((support, index) => {
    const px = x(support.x);
    svg.append(createSvg("path", { d: `M ${px} ${beamY + 4} L ${px - 18} ${beamY + 36} L ${px + 18} ${beamY + 36} Z`, fill: "#dfe7df", stroke: COLORS.ink, "stroke-width": 2 }));
    if (index > 0) {
      svg.append(createSvg("circle", { cx: px - 9, cy: beamY + 42, r: 4.5, fill: "#fff", stroke: COLORS.ink, "stroke-width": 2 }));
      svg.append(createSvg("circle", { cx: px + 9, cy: beamY + 42, r: 4.5, fill: "#fff", stroke: COLORS.ink, "stroke-width": 2 }));
    }
    addText(svg, support.label, px, beamY + 66, { fill: COLORS.ink, "text-anchor": "middle", "font-weight": 800 });
    addText(svg, `x=${fmt(support.x, 1)} m`, px, beamY + 82, { "text-anchor": "middle", "font-size": 10 });
    if (support.given) {
      svg.append(createSvg("line", { x1: px, y1: beamY - 8, x2: px, y2: beamY - 64, stroke: COLORS.green, "stroke-width": 3, "marker-end": "url(#arrow-green)" }));
      addText(svg, `Given R${support.label}=${fmt(support.reaction, 2)} kN`, px, beamY + 98, { fill: COLORS.green, "text-anchor": "middle", "font-size": 10, "font-weight": 800 });
    }
  });

  problem.loads.forEach((load) => {
    if (load.type === "point") {
      const px = x(load.x);
      svg.append(createSvg("line", { x1: px, y1: 58, x2: px, y2: beamY - 8, stroke: COLORS.red, "stroke-width": 3, "marker-end": "url(#arrow-red)" }));
      addText(svg, `${fmt(load.magnitude, 0)} kN`, px, 32, { fill: COLORS.red, "text-anchor": "middle", "font-weight": 800 });
      addText(svg, `(x=${fmt(load.x, 1)} m)`, px, 47, { fill: COLORS.red, "text-anchor": "middle", "font-size": 10 });
    }
    if (load.type === "udl") {
      const startX = x(load.start);
      const endX = x(load.end);
      svg.append(createSvg("line", { x1: startX, y1: 64, x2: endX, y2: 64, stroke: COLORS.red, "stroke-width": 3 }));
      const arrowCount = Math.max(4, Math.round((load.end - load.start) * 1.5));
      for (let index = 0; index <= arrowCount; index += 1) {
        const px = startX + ((endX - startX) * index) / arrowCount;
        svg.append(createSvg("line", { x1: px, y1: 64, x2: px, y2: beamY - 8, stroke: COLORS.red, "stroke-width": 2, "marker-end": "url(#arrow-red)" }));
      }
      addText(svg, `${fmt(load.intensity, 0)} kN/m`, 0.5 * (startX + endX), 31, { fill: COLORS.red, "text-anchor": "middle", "font-weight": 800 });
      addText(svg, `(x=${fmt(load.start, 1)}–${fmt(load.end, 1)} m)`, 0.5 * (startX + endX), 46, { fill: COLORS.red, "text-anchor": "middle", "font-size": 10 });
    }
    if (load.type === "moment") {
      const px = x(load.x);
      const clockwise = load.magnitude < 0;
      const path = clockwise
        ? `M ${px - 25} ${beamY - 45} A 32 32 0 1 1 ${px + 24} ${beamY - 44}`
        : `M ${px + 25} ${beamY - 45} A 32 32 0 1 0 ${px - 24} ${beamY - 44}`;
      svg.append(createSvg("path", { d: path, fill: "none", stroke: COLORS.gold, "stroke-width": 3, "marker-end": "url(#arrow-green)" }));
      addText(svg, `${fmt(Math.abs(load.magnitude), 0)} kN·m`, px, beamY - 96, { fill: COLORS.gold, "text-anchor": "middle", "font-weight": 800 });
      addText(svg, `(x=${fmt(load.x, 1)} m)`, px, beamY - 81, { fill: COLORS.gold, "text-anchor": "middle", "font-size": 10 });
    }
  });

  const stationX = x(problem.station);
  svg.append(createSvg("line", { x1: stationX, y1: 24, x2: stationX, y2: 245, stroke: COLORS.blue, "stroke-width": 2, "stroke-dasharray": "7 6" }));
  addText(svg, "EVAL. LOCATION", stationX, 22, { fill: COLORS.blue, "text-anchor": "middle", "font-size": 10, "font-weight": 850 });

  svg.append(createSvg("line", { x1: left, y1: 276, x2: right, y2: 276, stroke: COLORS.muted, "stroke-width": 1.5, "marker-start": "url(#arrow-blue)", "marker-end": "url(#arrow-blue)" }));
  addText(svg, `L = ${fmt(problem.length, 1)} m`, 0.5 * (left + right), 300, { fill: COLORS.ink, "text-anchor": "middle", "font-weight": 800 });
}

function renderLoadList(problem) {
  const supports = problem.supports
    .map((support) => `<div><span>Support ${support.label}</span><strong>x = ${fmt(support.x, 1)} m${support.given ? ` · given R${support.label} = ${fmt(support.reaction, 2)} kN` : ""}</strong></div>`)
    .join("");
  const loads = problem.loads
    .map((load, index) => `<div><span>Load ${index + 1}</span><strong>${describeLoad(load)}</strong></div>`)
    .join("");
  ids.loadList.innerHTML = supports + loads;
}

function plotSamples(problem, quantity) {
  const events = importantLocations(problem);
  const points = [];
  const samples = 700;
  for (let index = 0; index <= samples; index += 1) {
    const x = (problem.length * index) / samples;
    points.push({ x, y: quantity(problem, x) });
  }
  events.forEach((eventX) => {
    points.push({ x: clamp(eventX - 1e-6, 0, problem.length), y: quantity(problem, clamp(eventX - 1e-6, 0, problem.length)) });
    points.push({ x: eventX, y: quantity(problem, eventX) });
  });
  const sorted = points.sort((a, b) => a.x - b.x);
  if (quantity === shearAt) {
    sorted.unshift({ x: 0, y: 0 });
    sorted.push({ x: problem.length, y: 0 });
  }
  return sorted;
}

function renderPlot(svg, problem, quantity, color, stationY, maxPoint = null) {
  svg.innerHTML = "";
  const width = 900;
  const height = 370;
  const margin = { left: 64, right: 26, top: 28, bottom: 48 };
  const points = plotSamples(problem, quantity);
  const maxAbs = Math.max(...points.map((point) => Math.abs(point.y)), 1);
  const scaleX = (width - margin.left - margin.right) / problem.length;
  const scaleY = (height - margin.top - margin.bottom) / (2.25 * maxAbs);
  const originY = 0.5 * (margin.top + height - margin.bottom);
  const x = (value) => margin.left + value * scaleX;
  const y = (value) => originY - value * scaleY;

  for (let index = 0; index <= 4; index += 1) {
    const gx = margin.left + ((width - margin.left - margin.right) * index) / 4;
    svg.append(createSvg("line", { x1: gx, y1: margin.top, x2: gx, y2: height - margin.bottom, stroke: COLORS.grid, "stroke-width": 1 }));
    addText(svg, fmt((problem.length * index) / 4, 1), gx, height - 20, { "text-anchor": "middle" });
  }
  [-1, -0.5, 0.5, 1].forEach((fraction) => {
    const gy = y(fraction * maxAbs);
    svg.append(createSvg("line", { x1: margin.left, y1: gy, x2: width - margin.right, y2: gy, stroke: COLORS.grid, "stroke-width": 1 }));
    addText(svg, fmt(fraction * maxAbs, 1), margin.left - 10, gy + 4, { "text-anchor": "end" });
  });

  svg.append(createSvg("line", { x1: margin.left, y1: originY, x2: width - margin.right, y2: originY, stroke: COLORS.ink, "stroke-width": 1.5 }));
  svg.append(createSvg("line", { x1: margin.left, y1: margin.top, x2: margin.left, y2: height - margin.bottom, stroke: COLORS.ink, "stroke-width": 1.5 }));

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.x)} ${y(point.y)}`).join(" ");
  const areaPath = `M ${x(points[0].x)} ${originY} ${points.map((point) => `L ${x(point.x)} ${y(point.y)}`).join(" ")} L ${x(points.at(-1).x)} ${originY} Z`;
  svg.append(createSvg("path", { d: areaPath, fill: color, opacity: 0.12 }));
  svg.append(createSvg("path", { d: linePath, fill: "none", stroke: color, "stroke-width": 3, "stroke-linejoin": "round" }));

  const stationX = x(problem.station);
  svg.append(createSvg("line", { x1: stationX, y1: margin.top, x2: stationX, y2: height - margin.bottom, stroke: COLORS.blue, "stroke-width": 1.5, "stroke-dasharray": "6 5" }));
  svg.append(createSvg("circle", { cx: stationX, cy: y(stationY), r: 5, fill: COLORS.blue, stroke: "#fff", "stroke-width": 2 }));
  addText(svg, `x=${fmt(problem.station, 1)}, value=${fmt(stationY, 2)}`, stationX + 8, y(stationY) - 9, { fill: COLORS.blue, "font-weight": 750 });

  if (maxPoint) {
    svg.append(createSvg("circle", { cx: x(maxPoint.x), cy: y(maxPoint.y), r: 6, fill: COLORS.gold, stroke: "#fff", "stroke-width": 2 }));
    addText(svg, `max |M| = ${fmt(Math.abs(maxPoint.y), 2)}`, x(maxPoint.x) + 9, y(maxPoint.y) + (maxPoint.y >= 0 ? -10 : 18), { fill: COLORS.gold, "font-weight": 800 });
  }
  addText(svg, "x, m", width - margin.right, height - 20, { fill: COLORS.ink, "text-anchor": "end", "font-weight": 750 });
}

function valueNear(answer, correct, absoluteTolerance, relativeTolerance = 0.01) {
  if (!Number.isFinite(answer)) return false;
  return Math.abs(answer - correct) <= Math.max(absoluteTolerance, relativeTolerance * Math.max(Math.abs(correct), 1));
}

function readAnswers() {
  return Object.fromEntries(
    Object.entries(answerFields).map(([key, field]) => [key, field.input.value.trim() === "" ? Number.NaN : Number(field.input.value)]),
  );
}

function resultChecks(answers) {
  const p = state.problem;
  return {
    ra: valueNear(answers.ra, answerFields.ra.correctValue, 0.15),
    rb: valueNear(answers.rb, answerFields.rb.correctValue, 0.15),
    rc: true,
    v: valueNear(answers.v, p.stationShear, 0.2),
    m: valueNear(answers.m, p.stationMoment, 0.3),
    maxM: valueNear(Math.abs(answers.maxM), p.maxMoment, 0.4),
    maxX: valueNear(answers.maxX, p.maxMomentX, 0.08, 0.005),
  };
}

function fieldMessage(key, answer, correct, isCorrect, finalAttempt) {
  if (isCorrect) return "Correct";
  if (finalAttempt) return `Solution: ${fmt(correct, 2)}`;
  if (!Number.isFinite(answer)) return "Enter a numerical value.";
  if (Math.abs(answer + correct) <= Math.max(0.2, 0.01 * Math.abs(correct))) return "Magnitude is close; check your sign convention.";
  if (key === "ra" || key === "rb" || key === "rc") return "Check ΣFy = 0 and moments about one support; include any given reaction.";
  if (key === "v") return "Cut at the Eval. Location and sum vertical forces to its left.";
  if (key === "m") return "Cut at the Eval. Location and sum moments of the left segment.";
  if (key === "maxM") return "Check locations where V = 0 and either side of an applied couple.";
  return "The maximum |M| location should match the governing peak on M(x).";
}

function updateFieldFeedback(answers, checks, finalAttempt) {
  const correctValues = {
    ra: answerFields.ra.correctValue,
    rb: answerFields.rb.correctValue,
    rc: answerFields.rc.correctValue,
    v: state.problem.stationShear,
    m: state.problem.stationMoment,
    maxM: state.problem.maxMoment,
    maxX: state.problem.maxMomentX,
  };

  Object.entries(answerFields).forEach(([key, field]) => {
    if (field.active === false) return;
    field.input.closest("label").classList.toggle("correct", checks[key]);
    field.input.closest("label").classList.toggle("incorrect", !checks[key]);
    field.feedback.textContent = fieldMessage(key, answers[key], correctValues[key], checks[key], finalAttempt);
  });
}

function methodGuidance(checks, finalAttempt) {
  if (finalAttempt) {
    return `
      <p>Solutions are now shown. Compare the values to the unlocked diagrams and trace each change from left to right.</p>
      <ul>
        <li>Force equilibrium: the sum of all support reactions equals the total downward loading.</li>
        <li>Shear changes by point-load jumps and by the area under w(x).</li>
        <li>Moment changes by the area under V(x); an applied couple creates a moment jump.</li>
      </ul>
    `;
  }

  const tips = [];
  if (!checks.ra || !checks.rb || !checks.rc) {
    tips.push("Start with global equilibrium. Include the given reaction, if present, and replace each distributed load with its resultant at the load centroid before taking moments.");
  }
  if (!checks.v) {
    tips.push("For V at the Eval. Location, isolate the left segment and include only loads acting to the left of the cut.");
  }
  if (!checks.m) {
    tips.push("For M at the Eval. Location, take moments of all left-segment forces about the cut and include applied couples with their signs.");
  }
  if (!checks.maxM || !checks.maxX) {
    tips.push("Search for maximum |M| where shear crosses zero and immediately beside any applied couple, where the moment diagram jumps.");
  }
  tips.push(`Attempts remaining: ${3 - state.attempts}.`);
  return `<ul>${tips.map((tip) => `<li>${tip}</li>`).join("")}</ul>`;
}

function revealSolution() {
  state.revealed = true;
  ids.lockedSolution.classList.add("hidden");
  ids.solutionContent.classList.remove("hidden");
  ids.checkButton.disabled = true;
  Object.values(answerFields).forEach((field) => {
    field.input.disabled = true;
  });
  renderSolution();
}

function checkAnswers() {
  if (state.revealed) return;
  state.attempts += 1;
  const answers = readAnswers();
  const checks = resultChecks(answers);
  const allCorrect = Object.values(checks).every(Boolean);
  const finalAttempt = state.attempts >= 3;
  updateFieldFeedback(answers, checks, finalAttempt);
  ids.methodFeedback.innerHTML = allCorrect
    ? "<p>All calculations are correct. The diagrams are unlocked for comparison.</p>"
    : methodGuidance(checks, finalAttempt);

  if (allCorrect || finalAttempt) {
    ids.attemptStatus.textContent = allCorrect ? "Correct — solution unlocked" : "Solutions revealed";
    revealSolution();
  } else {
    ids.attemptStatus.textContent = `Attempt ${state.attempts + 1} of 3`;
  }
}

function renderSolution() {
  const p = state.problem;
  ids.summaryReactions.textContent = p.supports.map((support) => `R${support.label}=${fmt(support.reaction)}`).join(", ") + " kN";
  ids.summaryMaxM.textContent = `${fmt(p.maxMoment)} kN·m`;
  ids.summaryMaxX.textContent = `${fmt(p.maxMomentX)} m`;
  renderPlot(ids.shearPlot, p, shearAt, COLORS.green, p.stationShear);
  renderPlot(ids.momentPlot, p, momentAt, COLORS.red, p.stationMoment, { x: p.maxMomentX, y: p.maxMomentSigned });
}

function resetAnswerFields() {
  Object.values(answerFields).forEach((field) => {
    field.input.value = "";
    field.input.disabled = false;
    field.feedback.textContent = "Awaiting answer";
    field.input.closest("label").classList.remove("correct", "incorrect");
  });
}

function configureReactionFields(problem) {
  const unknownSupports = problem.supports.filter((support) => !support.given);
  const reactionFields = [answerFields.ra, answerFields.rb, answerFields.rc];
  reactionFields.forEach((field, index) => {
    const support = unknownSupports[index];
    field.active = Boolean(support);
    field.wrapper.classList.toggle("hidden", !support);
    if (support) {
      field.correctValue = support.reaction;
      field.label.innerHTML = `Reaction, R<sub>${support.label}</sub> at x=${fmt(support.x, 1)} m <b>kN</b>`;
    }
  });
}

function newCase() {
  const generated = generateProblem();
  state.problem = generated.maxMoment === 0 ? finalizeFallback(generated) : generated;
  state.attempts = 0;
  state.revealed = false;
  ids.attemptStatus.textContent = "Attempt 1 of 3";
  ids.supportDescription.textContent = `${state.problem.supports.length} supports${state.problem.supports.length === 3 ? " · one reaction given" : " · reactions unknown"}`;
  ids.beamLength.textContent = `${fmt(state.problem.length, 1)} m`;
  ids.stationValue.textContent = `x = ${fmt(state.problem.station, 1)} m`;
  ids.methodFeedback.innerHTML = "Use equilibrium to find the reactions, then move from left to right using dV/dx = −w and dM/dx = V.";
  ids.lockedSolution.classList.remove("hidden");
  ids.solutionContent.classList.add("hidden");
  ids.checkButton.disabled = false;
  configureReactionFields(state.problem);
  resetAnswerFields();
  renderProblemDiagram(state.problem);
  renderLoadList(state.problem);
}

ids.newCaseButton.addEventListener("click", newCase);
ids.checkButton.addEventListener("click", checkAnswers);
window.addEventListener("resize", () => {
  if (state.revealed) renderSolution();
});

newCase();
