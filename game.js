(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // CONFIG — every gameplay value worth tuning lives here.
  // Rates are expressed per second. Distances are in canvas pixels.
  // ---------------------------------------------------------------------------
  const DEFAULT_CONFIG = {
    // The world is much larger than the screen. The camera shows a window of it.
    world: {
      width: 12000,
      height: 8000,
    },
    camera: {
      minZoom: 0.05,
      maxZoom: 5,
      zoomResponse: 12,
      followResponse: 7,
      offsetDecay: 0.8,
      keepVisibleMarginPx: 56,
      wheelSensitivity: 0.0015,
    },
    survivors: {
      startingCount: 6,
      radius: 13,
      shotsPerSecond: 2,
      firingRange: 520,
      bitesToInfect: 3,
      sniperChance: 0.3,
      sniper: {
        radius: 13,
        shotsPerSecond: 0.6,
        firingRange: 1040,
        barrelLength: 2.2,
      },
      flamethrower: {
        radius: 13,
        rangeMultiplier: 0.5,
        halfAngle: 0.3,
        damagePerSecond: 55,
        barrelLength: 1.7,
        cost: 7,
      },
      // The player drives the whole squad through one central point. Every
      // survivor then seeks its own slot in the active formation.
      group: {
        speed: 140,
        responsiveness: 12,
        formationSpacing: 34,
        formationEase: 10,
        jitter: 2.6,
        boundaryMargin: 20,
        searchRadius: 420,
      },
      // Every survivor carries one weapon type. Give a survivor its own
      // weapon object later if you want mixed loadouts.
      weapon: {
        name: "Rifle",
        magazineSize: 30,
        reloadSeconds: 1,
        aimSpeed: 4,
        aimTolerance: 0.14,
      },
    },
    zombies: {
      radius: 8,
      health: 100,
      speed: 160,
      bitesPerSecond: 2.0,
      speedVariance: 0.14,
      spawnMargin: 34,
      initialWave: 8,
      waveIntervals: [30, 25, 20, 15, 10],
      spawnIntervalStart: 9999,
      spawnIntervalMin: 0.18,
      spawnRampSeconds: 70,
      groupGrowthSeconds: 5,
      maxGroupSize: 8,
      scatteredCount: 0,
      // Special variants replace normal spawns in the sequence.
      fastEvery: 10,
      bigFirst: 49,
      bigEvery: 50,
      variants: {
        fast: { speedMultiplier: 2, damageMultiplier: 2, healthMultiplier: 1, sizeMultiplier: 1 },
        big: { speedMultiplier: 0.5, damageMultiplier: 0.5, healthMultiplier: 5, sizeMultiplier: 2.5 },
      },
      // Sleeping zombies wake from gunshots, nearby zombie deaths, or a chain
      // reaction from another zombie waking up next to them.
      activation: {
        gunshotRadius: 500,
        killRadius: 500,
        chainRadius: 100,
        civilianDetectionRadius: 200,
        wanderSpeedFactor: 0.3,
        engageRadius: 160,
        investigateReachRadius: 40,
        investigateTimeout: 6,
        deactivationDelay: 1.5,
      },
    },
    obstacles: {
      rockCount: 30,
      rockRadiusMin: 20,
      rockRadiusMax: 34,
    },
    civilians: {
      radius: 9,
      rescueRadius: 74,
      bitesToInfect: 3,
      recruitSeconds: 6,
      spawnCount: 30,
      speed: 1,
    },
    safeZones: {
      count: 1,
      width: 260,
      height: 220,
      radius: 180,
      wallHealth: 120,
      capacity: 12,
      recruitmentSeconds: 6,
    },
    evacuation: {
      count: 6,
      radius: 110,
      civiliansPerZone: 5,
      unlockRadius: 90,
      bitesToUnlock: 400,
    },
    lamps: {
      radius: 600,
      gasInterval: 60,
      steelCost: 1,
    },
    visual: {
      maxDeltaSeconds: 0.05,
      darkMode: true,
      visibilityRadius: 140,
      flashlightRange: 520,
    },
    gameplay: {
      threatScale: 1,
      threatOverride: 1,
    },
    workers: {
      enabled: true,
    },
    gameplay: {
      threatScale: 1,
      threatOverride: 1,
    },
    workers: {
      enabled: true,
    },
  };

  const CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  // Per-mode map layouts. Each mode gets its own world size and object counts.
  const MAP_LAYOUTS = {
    survival: {
      world: { width: 12000, height: 8000 },
      safeZoneCount: 1,
      evacuationCount: 6,
      rockCount: 30,
      civilianCount: 30,
    },
    map1: {
      world: { width: 21096, height: 13608 },
      safeZoneCount: 0,
      evacuationCount: 0,
      rockCount: 0,
      civilianCount: 0,
      empty: true,
    },
  };

  function applyMapLayout(mapId) {
    const layout = MAP_LAYOUTS[mapId] || MAP_LAYOUTS.survival;
    CONFIG.world.width = layout.world.width;
    CONFIG.world.height = layout.world.height;
    CONFIG.safeZones.count = layout.safeZoneCount;
    CONFIG.evacuation.count = layout.evacuationCount;
    CONFIG.obstacles.rockCount = layout.rockCount;
    CONFIG.civilians.spawnCount = layout.civilianCount;
  }

  // Map 1 geographical blueprint. All coordinates are in map squares (72 px).
  const MAP1_GEOGRAPHY = {
    forest: {
      polygon: [[6, 6], [160, 5], [164, 28], [160, 72], [120, 75], [82, 74], [42, 76], [8, 70]],
      color: "#14351f",
      outline: "#0c2414",
    },
    village: {
      polygon: [[222, 12], [274, 10], [275, 62], [250, 65], [232, 60], [223, 64]],
      color: "#3a3a26",
      outline: "#26261a",
    },
    farm: {
      rect: { x1: 112, y1: 84, x2: 164, y2: 122 },
      colors: ["#233a1a", "#2f5123", "#3a5a28", "#4a4a2a", "#5a4a2a"],
      outline: "#182a12",
    },
    industrial: {
      rect: { x1: 5, y1: 85, x2: 75, y2: 185 },
      color: "#33383a",
      outline: "#222526",
    },
    city: {
      rect: { x1: 200, y1: 95, x2: 292, y2: 188 },
      color: "#23272a",
      outline: "#16191b",
      block: "#353b3f",
    },
    safeZoneSpot: { x1: 125, y1: 92, x2: 150, y2: 112 },
    stream: {
      points: [[0, 78], [18, 72], [36, 80], [54, 70], [72, 78], [90, 72], [108, 80], [126, 74], [144, 82], [162, 76], [180, 84], [198, 78], [216, 86], [234, 80], [252, 84], [276, 82]],
      width: 5,
      bankWidth: 9,
      bankColor: "#6fb6d9",
      color: "#2a6f9e",
    },
    roads: [
      { points: [[0, 150], [35, 150], [70, 148], [105, 145], [140, 147], [170, 152], [195, 158], [212, 166], [228, 172], [246, 178], [265, 182], [292, 186]], width: 14, outline: 22 },
      { points: [[82, 40], [120, 38], [160, 36], [200, 34], [222, 32]], width: 7, outline: 11 },
      { points: [[240, 64], [225, 72], [210, 78], [195, 82], [180, 84], [164, 86]], width: 7, outline: 11 },
      { points: [[120, 122], [105, 130], [90, 136], [75, 142], [60, 148], [45, 152]], width: 7, outline: 11 },
      { points: [[75, 75], [85, 80], [95, 85], [105, 90]], width: 7, outline: 11 },
    ],
  };

  const TREE_TYPES = {
    deciduous: { trunk: 5, canopy: 44, density: 0.7, colors: ["#24502f", "#2d5f36", "#1c4026"] },
    oak: { trunk: 7, canopy: 58, density: 0.85, colors: ["#1f4429", "#2a5533", "#173620"] },
    small: { trunk: 3.5, canopy: 30, density: 0.6, colors: ["#2f6238", "#3a7042", "#24502f"] },
    bushy: { trunk: 4.5, canopy: 52, density: 0.9, colors: ["#356b3f", "#40784a", "#2a5733"] },
  };

  function createTreeObject(x, y, typeName, forcedTrunkRadius) {
    const cfg = TREE_TYPES[typeName] || TREE_TYPES.deciduous;
    const trunkRadius = forcedTrunkRadius != null
      ? forcedTrunkRadius
      : cfg.trunk * randomRange(0.85, 1.15);
    const canopyRadius = cfg.canopy * randomRange(0.85, 1.2);
    const density = clamp(cfg.density * randomRange(0.9, 1.1), 0.4, 1);
    const blobs = [];
    const blobCount = 4 + Math.floor(Math.random() * 4);
    for (let b = 0; b < blobCount; b += 1) {
      const angle = (b / blobCount) * TAU + randomRange(-0.5, 0.5);
      const dist = canopyRadius * randomRange(0.18, 0.55);
      blobs.push({
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        r: canopyRadius * randomRange(0.34, 0.58),
      });
    }
    blobs.push({ dx: 0, dy: 0, r: canopyRadius * 0.72 });
    return {
      id: idSequence++,
      x,
      y,
      type: typeName,
      trunkRadius,
      canopyRadius,
      density,
      seed: Math.random() * TAU,
      colors: cfg.colors,
      blobs,
      spriteIndex: Math.floor(Math.random() * TREE_SPRITE_VARIANTS),
    };
  }

  const TREE_SPRITE_VARIANTS = 6;
  const TREE_SPRITE_HALF = 112;
  const TREE_SPRITE_BASE = 90;
  let treeSpriteCache = null;

  function getTreeSprites() {
    if (treeSpriteCache) return treeSpriteCache;
    const cache = {};
    const size = TREE_SPRITE_HALF * 2;
    for (const typeName of Object.keys(TREE_TYPES)) {
      const cfg = TREE_TYPES[typeName];
      cache[typeName] = [];
      for (let v = 0; v < TREE_SPRITE_VARIANTS; v += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const c = canvas.getContext("2d");
        const cx = TREE_SPRITE_HALF;
        const cy = TREE_SPRITE_HALF;

        // Ground shadow.
        c.fillStyle = "rgba(0, 0, 0, 0.16)";
        c.beginPath();
        c.ellipse(cx + 6, cy + 8, TREE_SPRITE_BASE * 0.9, TREE_SPRITE_BASE * 0.55, 0, 0, TAU);
        c.fill();

        // Leaf blobs.
        const count = 4 + (v % 3);
        const blobAlpha = 0.16 + cfg.density * 0.08;
        for (let b = 0; b < count; b += 1) {
          const angle = (b / count) * TAU + v * 0.8;
          const dist = TREE_SPRITE_BASE * (0.18 + ((b * 7 + v * 3) % 10) / 25);
          const r = TREE_SPRITE_BASE * (0.34 + ((b * 5 + v * 2) % 9) / 40);
          c.globalAlpha = blobAlpha;
          c.fillStyle = cfg.colors[b % cfg.colors.length];
          c.beginPath();
          c.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, r, 0, TAU);
          c.fill();
        }
        c.globalAlpha = 0.2 + cfg.density * 0.08;
        c.fillStyle = cfg.colors[1];
        c.beginPath();
        c.arc(cx, cy, TREE_SPRITE_BASE * 0.72, 0, TAU);
        c.fill();

        // Leaf highlights.
        c.globalAlpha = 0.18;
        c.fillStyle = "#6fce83";
        for (let b = 0; b < count; b += 2) {
          const angle = (b / count) * TAU + v * 0.8;
          const dist = TREE_SPRITE_BASE * (0.18 + ((b * 7 + v * 3) % 10) / 25);
          c.beginPath();
          c.arc(
            cx + Math.cos(angle) * dist - 4,
            cy + Math.sin(angle) * dist - 4,
            TREE_SPRITE_BASE * 0.2,
            0,
            TAU
          );
          c.fill();
        }

        // Trunk on top so it stays visible.
        const trunkR = cfg.trunk * (TREE_SPRITE_BASE / cfg.canopy) * 1.1;
        c.globalAlpha = 1;
        c.fillStyle = "#3b2412";
        c.beginPath();
        c.ellipse(cx, cy, trunkR, trunkR * 0.85, 0.4, 0, TAU);
        c.fill();
        c.fillStyle = "#6b4a2a";
        c.beginPath();
        c.arc(cx, cy, trunkR * 0.58, 0, TAU);
        c.fill();

        cache[typeName].push(canvas);
      }
    }
    treeSpriteCache = cache;
    return cache;
  }

  function generateMap1ForestTrees() {
    trees = [];
    const S = 72;
    const poly = MAP1_GEOGRAPHY.forest.polygon.map(([x, y]) => ({ x: x * S, y: y * S }));
    const minX = Math.min(...poly.map((p) => p.x));
    const maxX = Math.max(...poly.map((p) => p.x));
    const minY = Math.min(...poly.map((p) => p.y));
    const maxY = Math.max(...poly.map((p) => p.y));
    const typeNames = Object.keys(TREE_TYPES);
    const target = 3000;
    let attempts = 0;
    while (trees.length < target && attempts < target * 40) {
      attempts += 1;
      const x = randomRange(minX, maxX);
      const y = randomRange(minY, maxY);
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
        const xi = poly[i].x;
        const yi = poly[i].y;
        const xj = poly[j].x;
        const yj = poly[j].y;
        const intersects =
          yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersects) inside = !inside;
      }
      if (!inside) continue;

      const type = typeNames[Math.floor(Math.random() * typeNames.length)];
      const trunkRadius = TREE_TYPES[type].trunk * randomRange(0.85, 1.15);
      let blocked = false;
      for (const other of trees) {
        if (Math.hypot(x - other.x, y - other.y) < trunkRadius + other.trunkRadius + 8) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      trees.push(createTreeObject(x, y, type, trunkRadius));
    }
  }

  const TAU = Math.PI * 2;
  const MONO = '"Cascadia Code", "SFMono-Regular", Consolas, monospace';
  const DISPLAY = '"Arial Black", "Segoe UI Black", sans-serif';

  const dom = {
    canvas: document.getElementById("game"),
    startScreen: document.getElementById("startScreen"),
    startButton: document.getElementById("startButton"),
    buildButton: document.getElementById("buildButton"),
    map1Button: document.getElementById("map1Button"),
    bestTimeValue: document.getElementById("bestTimeValue"),
    pauseScreen: document.getElementById("pauseScreen"),
    resumeButton: document.getElementById("resumeButton"),
    mainMenuButton: document.getElementById("mainMenuButton"),
    pauseButton: document.getElementById("pauseButton"),
    restartButton: document.getElementById("restartButton"),
    darkModeButton: document.getElementById("darkModeButton"),
    workersToggleButton: document.getElementById("workersToggleButton"),
    workerSteelButton: document.getElementById("workerSteelButton"),
    workerGasButton: document.getElementById("workerGasButton"),
    settingsButton: document.getElementById("settingsButton"),
    tuningPanel: document.getElementById("tuningPanel"),
    closeTuningButton: document.getElementById("closeTuningButton"),
    resetTuningButton: document.getElementById("resetTuningButton"),
    gameOverScreen: document.getElementById("gameOverScreen"),
    gameOverCopy: document.getElementById("gameOverCopy"),
    retryButton: document.getElementById("retryButton"),
    gameOverTuneButton: document.getElementById("gameOverTuneButton"),
    finalTime: document.getElementById("finalTime"),
    finalKills: document.getElementById("finalKills"),
    finalInfected: document.getElementById("finalInfected"),
    newBest: document.getElementById("newBest"),
    survivorsValue: document.getElementById("survivorsValue"),
    steelValue: document.getElementById("steelValue"),
    gasValue: document.getElementById("gasValue"),
    killsValue: document.getElementById("killsValue"),
    timeValue: document.getElementById("timeValue"),
    threatBars: document.getElementById("threatBars"),
    threatLabel: document.getElementById("threatLabel"),
    dayNightToggle: document.getElementById("dayNightToggle"),
    dayNightText: document.getElementById("dayNightText"),
    dayNightIcon: document.querySelector("#dayNightToggle .daynight-icon"),
    eventFeed: document.getElementById("eventFeed"),
    joystick: document.getElementById("joystick"),
    joystickKnob: document.getElementById("joystickKnob"),
    formationDock: document.getElementById("formationDock"),
    formationButton: document.getElementById("formationButton"),
    formationName: document.getElementById("formationName"),
    formationMenu: document.getElementById("formationMenu"),
    squadBar: document.getElementById("squadBar"),
    recruitMenu: document.getElementById("recruitMenu"),
    recruitClose: document.getElementById("recruitClose"),
    recruitSteel: document.getElementById("recruitSteel"),
    recruitSoldierBtn: document.getElementById("recruitSoldierBtn"),
    recruitSniperBtn: document.getElementById("recruitSniperBtn"),
    recruitFlamethrowerBtn: document.getElementById("recruitFlamethrowerBtn"),
    buildPalette: document.getElementById("buildPalette"),
    buildSizePanel: document.getElementById("buildSizePanel"),
    buildSizeSlider: document.getElementById("buildSizeSlider"),
    buildSizeValue: document.getElementById("buildSizeValue"),
    commandBar: document.getElementById("commandBar"),
    deploySoldiersButton: document.getElementById("deploySoldiersButton"),
    deployAvailableBadge: document.getElementById("deployAvailableBadge"),
    deployMenu: document.getElementById("deployMenu"),
    deployCloseButton: document.getElementById("deployCloseButton"),
    deployActiveCount: document.getElementById("deployActiveCount"),
    deployTravellingCount: document.getElementById("deployTravellingCount"),
    deployAvailableCount: document.getElementById("deployAvailableCount"),
    deployZoneList: document.getElementById("deployZoneList"),
    zoomControl: document.getElementById("zoomControl"),
    groupSpeedInput: document.getElementById("groupSpeedInput"),
    groupSpeedOutput: document.getElementById("groupSpeedOutput"),
    spacingInput: document.getElementById("spacingInput"),
    spacingOutput: document.getElementById("spacingOutput"),
    responseInput: document.getElementById("responseInput"),
    responseOutput: document.getElementById("responseOutput"),
    fireRateInput: document.getElementById("fireRateInput"),
    fireRateOutput: document.getElementById("fireRateOutput"),
    magazineInput: document.getElementById("magazineInput"),
    magazineOutput: document.getElementById("magazineOutput"),
    reloadInput: document.getElementById("reloadInput"),
    reloadOutput: document.getElementById("reloadOutput"),
    aimSpeedInput: document.getElementById("aimSpeedInput"),
    aimSpeedOutput: document.getElementById("aimSpeedOutput"),
    biteRateInput: document.getElementById("biteRateInput"),
    biteRateOutput: document.getElementById("biteRateOutput"),
    infectionInput: document.getElementById("infectionInput"),
    infectionOutput: document.getElementById("infectionOutput"),
    speedInput: document.getElementById("speedInput"),
    speedOutput: document.getElementById("speedOutput"),
    gunshotRadiusInput: document.getElementById("gunshotRadiusInput"),
    gunshotRadiusOutput: document.getElementById("gunshotRadiusOutput"),
    killRadiusInput: document.getElementById("killRadiusInput"),
    killRadiusOutput: document.getElementById("killRadiusOutput"),
    chainRadiusInput: document.getElementById("chainRadiusInput"),
    chainRadiusOutput: document.getElementById("chainRadiusOutput"),
    civilianSightInput: document.getElementById("civilianSightInput"),
    civilianSightOutput: document.getElementById("civilianSightOutput"),
    deactivationDelayInput: document.getElementById("deactivationDelayInput"),
    deactivationDelayOutput: document.getElementById("deactivationDelayOutput"),
    spawnCountInput: document.getElementById("spawnCountInput"),
    spawnCountOutput: document.getElementById("spawnCountOutput"),
    visibilityRadiusInput: document.getElementById("visibilityRadiusInput"),
    visibilityRadiusOutput: document.getElementById("visibilityRadiusOutput"),
    threatScaleInput: document.getElementById("threatScaleInput"),
    threatScaleOutput: document.getElementById("threatScaleOutput"),
    threatLevelSelect: document.getElementById("threatLevelSelect"),
    threatLevelSelectOutput: document.getElementById("threatLevelSelectOutput"),
    civilianSpeedInput: document.getElementById("civilianSpeedInput"),
    civilianSpeedOutput: document.getElementById("civilianSpeedOutput"),
    ruleFireRate: document.getElementById("ruleFireRate"),
    ruleBiteRate: document.getElementById("ruleBiteRate"),
    ruleInfection: document.getElementById("ruleInfection"),
  };

  const ctx = dom.canvas.getContext("2d", { alpha: false });
  const fogCanvas = document.getElementById("fog");
  const fogCtx = fogCanvas ? fogCanvas.getContext("2d") : null;

  // width/height describe the world. viewW/viewH describe the visible screen.
  let width = 0;
  let height = 0;
  let viewW = 0;
  let viewH = 0;

  const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    targetZoom: 1,
    offsetX: 0,
    offsetY: 0,
    anchor: null,
    lockedZone: null,
  };
  let dpr = 1;
  let backgroundGradient = null;

  let mode = "menu"; // menu | playing | paused | gameover
  let survivors = [];
  let zombies = [];
  let zombieSpawnCount = 0;
  let currentMapId = "survival";
  let obstacles = [];
  let trees = [];
  let civilians = [];
  let carriedCivilians = [];
  let safeZones = [];
  let evacuationZones = [];
  let deployingUnits = [];
  let returningUnits = [];
  let evacuatingDefenders = [];
  let deployPanelOpen = false;
  const deploySelectionByZone = new Map();
  let drawnPath = [];
  let isDrawingPath = false;
  let buildObjects = [];
  let buildTool = "safe";
  let buildSelectedId = null;
  let buildPreview = null;
  let buildDragging = false;
  let buildDragOffset = { x: 0, y: 0 };
  let zombieSpawners = [];
  let steelMines = [];
  let gasStations = [];
  let furnaces = [];
  let lamps = [];
  let buildDraggingZone = false;
  let buildDragZoneOffset = { x: 0, y: 0 };
  let buildSelectedZoneId = null;
  let buildSelectedSpawnerId = null;
  let pathDrawStart = null;
  let pathDrawMoved = false;
  let turretPanelOpen = false;
  let selectedReturnZone = null;
  let beams = [];
  let particles = [];
  let rings = [];
  let texts = [];
  let motes = [];
  let steel = 0;
  let gas = 0;
  const FORMATIONS = [
    { id: "circle", name: "Circle", hint: "Balanced all-round ring" },
    { id: "line", name: "Line", hint: "Wide firing line" },
    { id: "square", name: "Square", hint: "Compact block" },
    { id: "triangle", name: "Triangle", hint: "Focused spearhead" },
    { id: "wedge", name: "Wedge", hint: "Snake-like pointed wedge" },
  ];
  const FORMATION_IDS = FORMATIONS.map((item) => item.id);

  let formation = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 120,
    facing: -Math.PI / 2,
    style: "wedge",
  };
  let groupInput = { x: 0, y: 0 };

  // ---------------------------------------------------------------------------
  // Multi-squad state
  // ---------------------------------------------------------------------------
  let squads = [];
  let activeSquad = null;
  let squadCounter = 0;
  const SQUAD_NAMES = [
    "Alpha",
    "Bravo",
    "Charlie",
    "Delta",
    "Echo",
    "Foxtrot",
    "Golf",
    "Hotel",
    "India",
    "Juliett",
    "Kilo",
    "Lima",
    "Mike",
    "November",
    "Oscar",
    "Papa",
    "Quebec",
    "Romeo",
    "Sierra",
    "Tango",
    "Uniform",
    "Victor",
    "Whiskey",
    "X-ray",
    "Yankee",
    "Zulu",
  ];

  function makeSquad(name, survivorsList, formationState) {
    const f = formationState || {
      x: formation ? formation.x : width / 2,
      y: formation ? formation.y : height / 2,
      vx: 0,
      vy: 0,
      radius: 120,
      facing: -Math.PI / 2,
      style: formation ? formation.style : "circle",
    };
    return {
      id: ++squadCounter,
      name: name || SQUAD_NAMES[squadCounter - 1] || `Squad ${squadCounter}`,
      survivors: survivorsList || [],
      formation: f,
      input: { x: 0, y: 0 },
      command: "defend",
      path: [],
      pathIndex: 0,
      carriedCivilians: [],
      rescueTargetId: null,
    };
  }

  function activeSquadFormation() {
    return activeSquad ? activeSquad.formation : formation;
  }

  function switchToSquad(squad) {
    if (!squad || squad === activeSquad) return;
    // Save current active back into the inactive list.
    if (activeSquad) {
      activeSquad.formation = formation;
      activeSquad.survivors = survivors;
      activeSquad.input = groupInput;
      activeSquad.carriedCivilians = carriedCivilians;
      if (!squads.includes(activeSquad)) squads.push(activeSquad);
    }
    // Promote the chosen squad.
    formation = squad.formation;
    survivors = squad.survivors;
    groupInput = squad.input;
    carriedCivilians = squad.carriedCivilians || [];
    activeSquad = squad;
    squads = squads.filter((s) => s !== squad);
    syncSquadUI();
    syncCommandUI();
  }

  function createSquadFromSplit(count) {
    if (survivors.length <= 1) {
      showEvent("Need at least 2 soldiers to split");
      return;
    }
    const n = survivors.length;
    const splitCount = Math.floor(n / 2); // new group gets the smaller half
    const split = survivors.splice(survivors.length - splitCount, splitCount);
    const newSquad = makeSquad(null, split, {
      x: formation.x,
      y: formation.y,
      vx: formation.vx,
      vy: formation.vy,
      radius: formation.radius,
      facing: formation.facing,
      style: formation.style,
    });
    squads.push(newSquad);
    syncSquadUI();
    syncCommandUI();
    showEvent(`Created ${newSquad.name}`);
  }

  function pathInput(squad) {
    if (!squad || !squad.path || squad.path.length === 0) return null;
    const f = squad.formation;
    let idx = squad.pathIndex || 0;
    if (idx >= squad.path.length) {
      squad.path = [];
      squad.pathIndex = 0;
      return null;
    }
    const target = squad.path[idx];
    const d = Math.hypot(target.x - f.x, target.y - f.y);
    if (d < 16) {
      squad.pathIndex = idx + 1;
      if (squad.pathIndex >= squad.path.length) {
        squad.path = [];
        squad.pathIndex = 0;
        return null;
      }
      const nt = squad.path[squad.pathIndex];
      const nd = Math.hypot(nt.x - f.x, nt.y - f.y) || 1;
      return { x: (nt.x - f.x) / nd, y: (nt.y - f.y) / nd };
    }
    return { x: (target.x - f.x) / d, y: (target.y - f.y) / d };
  }

  function commandInput(squad) {
    if (!squad || !squad.survivors || squad.survivors.length === 0) return { x: 0, y: 0 };
    const f = squad.formation;
    const cmd = squad.command || "defend";
    const radius = CONFIG.survivors.group.searchRadius;

    if (cmd === "defend") {
      // Stay in place; only shoot nearby zombies (handled by combat).
      return { x: 0, y: 0 };
    }

    if (cmd === "attack") {
      // Group attack range = 2x the longest soldier shooting range.
      let longestRange = CONFIG.survivors.firingRange;
      for (const su of (squad.survivors || [])) {
        if (!su || !su.alive) continue;
        const r = (su.type === "sniper") ? (CONFIG.survivors.sniper.firingRange || CONFIG.survivors.firingRange) : CONFIG.survivors.firingRange;
        if (r > longestRange) longestRange = r;
      }
      const attackRange = longestRange * 2;

      // Find nearest zombie within attack range.
      let best = null;
      let bestDist = attackRange * attackRange;
      for (const z of zombies) {
        if (!z.alive) continue;
        const d2 = (z.x - f.x) ** 2 + (z.y - f.y) ** 2;
        if (d2 < bestDist) {
          bestDist = d2;
          best = z;
        }
      }
      if (best) {
        const d = Math.hypot(best.x - f.x, best.y - f.y) || 1;
        if (d < 180) {
          if (d < 90) {
            return { x: (f.x - best.x) / d, y: (f.y - best.y) / d };
          }
          return { x: 0, y: 0 };
        }
        return { x: (best.x - f.x) / d, y: (best.y - f.y) / d };
      }
      // No zombie in range: wander and keep scanning.
      if (!squad.wanderTimer) squad.wanderTimer = randomRange(1, 2.5);
      if (typeof squad.wanderAngle !== "number") squad.wanderAngle = Math.random() * TAU;
      squad.wanderTimer -= 0.016;
      if (squad.wanderTimer <= 0) {
        squad.wanderTimer = randomRange(1, 2.5);
        squad.wanderAngle += randomRange(-1, 1);
      }
      return { x: Math.cos(squad.wanderAngle) * 0.35, y: Math.sin(squad.wanderAngle) * 0.35 };
    }


    if (cmd === "safe") {
      // Return to the nearest accessible safe zone; complete once every
      // soldier and carried civilian is inside the zone interior.
      let zone = null;
      let best = Infinity;
      for (const z of safeZones) {
        if (z.wallHealth <= 0) continue;
        const d = (z.x - f.x) ** 2 + (z.y - f.y) ** 2;
        if (d < best) {
          best = d;
          zone = z;
        }
      }
      if (!zone) return { x: 0, y: 0 };

      const allInside =
        (squad.survivors || []).every(
          (s) => !s.alive || Math.hypot(s.x - zone.x, s.y - zone.y) < zone.radius
        ) &&
        (squad.carriedCivilians || []).every(
          (c) => !c.alive || Math.hypot(c.x - zone.x, c.y - zone.y) < zone.radius
        );
      if (allInside && Math.hypot(f.x - zone.x, f.y - zone.y) < zone.radius * 0.6) {
        squad.command = "defend";
        syncCommandUI();
        return { x: 0, y: 0 };
      }

      const d = Math.hypot(zone.x - f.x, zone.y - f.y) || 1;
      if (d < 12) return { x: 0, y: 0 };
      return { x: (zone.x - f.x) / d, y: (zone.y - f.y) / d };
    }

    return { x: 0, y: 0 };
  }

  function updateSquad(dt, squad) {
    if (!squad || !squad.survivors || squad.survivors.length === 0) return;
    const f = squad.formation;
    const surv = squad.survivors;

    const pi = pathInput(squad);
    const ci = pi || commandInput(squad);
    squad.input = { x: ci.x, y: ci.y };
    const inp = squad.input;
    if (Math.hypot(inp.x, inp.y) <= 0.01) {
      f.vx = 0;
      f.vy = 0;
    }

    // Movement (only if input; otherwise drift to a stop).
    const group = CONFIG.survivors.group;
    const response = 1 - Math.exp(-group.responsiveness * dt);
    f.vx += (inp.x * group.speed - f.vx) * response;
    f.vy += (inp.y * group.speed - f.vy) * response;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (Math.hypot(f.vx, f.vy) > 6) {
      const tf = Math.atan2(f.vy, f.vx);
      f.facing += angleDelta(f.facing, tf) * (1 - Math.exp(-8 * dt));
    }
    const probe = { x: f.x, y: f.y, radius: Math.max(10, CONFIG.survivors.radius * 1.5) };
    resolveObstacleCollisions(probe);
    f.x = probe.x;
    f.y = probe.y;
    const margin = group.boundaryMargin;
    const halfX = Math.min(width / 2, f.radius + margin);
    const halfY = Math.min(height / 2, f.radius + margin);
    const nx = clamp(f.x, halfX, width - halfX);
    const ny = clamp(f.y, halfY, height - halfY);
    if (nx !== f.x) f.vx = 0;
    if (ny !== f.y) f.vy = 0;
    f.x = nx;
    f.y = ny;

  // Separate soldiers within the squad to avoid overlap.
    for (let i = 0; i < surv.length; i += 1) {
      const a = surv[i];
      if (!a || !a.alive) continue;
      for (let j = i + 1; j < surv.length; j += 1) {
        const b = surv[j];
        if (!b || !b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.radius + b.radius + 3;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minDist * minDist) continue;
        const d = Math.sqrt(d2) || 0.001;
        const overlap = (minDist - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      }
    }

    // Keep this squad's carried civilians moving with it.
    if (squad.carriedCivilians && squad.carriedCivilians.length > 0) {
      const prevFormation = formation;
      const prevSurvivors = survivors;
      const prevCarried = carriedCivilians;
      formation = f;
      survivors = surv;
      carriedCivilians = squad.carriedCivilians;
      updateCarriedCivilians(dt);
      squad.carriedCivilians = carriedCivilians;
      formation = prevFormation;
      survivors = prevSurvivors;
      carriedCivilians = prevCarried;
    }

    // Formation targets.
    const slots = formationSlots(f.style, surv.length, group.formationSpacing);
    f.radius = formationExtent(slots);
    const forwardX = Math.cos(f.facing);
    const forwardY = Math.sin(f.facing);
    const rightX = -forwardY;
    const rightY = forwardX;
    let assignment = surv.map((_, i) => i);
    if (f.style === "line" && surv.length > 1) {
      assignment = surv
        .map((s, i) => ({ i, p: (s.x - f.x) * rightX + (s.y - f.y) * rightY }))
        .sort((a, b) => a.p - b.p)
        .map((e) => e.i);
    }
    for (let k = 0; k < surv.length; k += 1) {
      const s = surv[assignment[k]];
      const slot = slots[k] || { lx: 0, ly: 0 };
      const wobbleX = Math.cos(visualTime * 0.95 + s.seed * 1.7) * group.jitter;
      const wobbleY = Math.sin(visualTime * 1.15 + s.seed * 2.3) * group.jitter;
      s.targetX = f.x + rightX * slot.lx + forwardX * slot.ly + wobbleX;
      s.targetY = f.y + rightY * slot.lx + forwardY * slot.ly + wobbleY;
    }

    const shotInterval = fireInterval();
    for (const s of surv) {
      if (!s.alive) continue;
      s.flash = Math.max(0, s.flash - dt);
      s.biteFlash = Math.max(0, s.biteFlash - dt);
      if (s.reloading) {
        s.reloadTimer -= dt;
        if (s.reloadTimer <= 0) {
          s.reloading = false;
          s.reloadTimer = 0;
          s.shotsInMagazine = weaponMagazineSize();
        }
      }
      const gain = group.formationEase * s.formationGain;
      const dx = s.targetX - s.x;
      const dy = s.targetY - s.y;
      let desiredX = f.vx + dx * gain;
      let desiredY = f.vy + dy * gain;
      const steerLen = Math.hypot(desiredX, desiredY);
      if (steerLen > 0.001) {
        const avoid = obstacleAvoidance(s.x, s.y, desiredX / steerLen, desiredY / steerLen, s.radius, 28);
        desiredX += avoid.x * group.speed * 0.5;
        desiredY += avoid.y * group.speed * 0.5;
      }
      const maxSpeed = Math.max(group.speed * 1.75, 120);
      const ds = Math.hypot(desiredX, desiredY);
      if (ds > maxSpeed) {
        desiredX = (desiredX / ds) * maxSpeed;
        desiredY = (desiredY / ds) * maxSpeed;
      }
      const resp = 1 - Math.exp(-group.formationEase * 1.5 * dt);
      s.vx += (desiredX - s.vx) * resp;
      s.vy += (desiredY - s.vy) * resp;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      resolveObstacleCollisions(s);
      s.x = clamp(s.x, s.radius + 6, width - s.radius - 6);
      s.y = clamp(s.y, s.radius + 6, height - s.radius - 6);

      // Combat for inactive squads is handled by the dedicated loop below,
      // which respects barrel tracking and alignment.
    }

    // Separation within the squad.
    for (let i = 0; i < surv.length; i += 1) {
      const a = surv[i];
      for (let j = i + 1; j < surv.length; j += 1) {
        const b = surv[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minD = a.radius + b.radius + 3;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minD * minD) continue;
        const d = Math.sqrt(d2) || 0.001;
        const overlap = (minD - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      }
      resolveObstacleCollisions(a);
      a.x = clamp(a.x, a.radius + 6, width - a.radius - 6);
      a.y = clamp(a.y, a.radius + 6, height - a.radius - 6);
    }
    // Combat for inactive squad members.
    for (const su of surv) {
      if (!su.alive) continue;
      const isSniper = su.type === "sniper";
      const isFlame = su.type === "flamethrower";
      const shotInterval = isSniper ? 1 / (CONFIG.survivors.sniper.shotsPerSecond || 0.6) : isFlame ? 0.1 : fireInterval();
      const firingRange = survivorFiringRange(su);
      const rangeSquared = firingRange * firingRange;
      su.fireCooldown = Math.min(su.fireCooldown || shotInterval, shotInterval) - dt;
      // Prefer current target to avoid instant switching.
      let target = null;
      if (su.aimTargetId != null) {
        const current = zombies.find((z) => z.id === su.aimTargetId && z.alive);
        if (current) {
          const d2 = (current.x - su.x) ** 2 + (current.y - su.y) ** 2;
          if (d2 <= rangeSquared * 1.2) target = current;
        }
      }
      if (!target) {
        target = findNearestZombie(su, rangeSquared);
        su.aimTargetId = target ? target.id : null;
      }
      const aimSpeed = CONFIG.survivors.weapon.aimSpeed || 4;
      if (target) {
        const desiredAngle = Math.atan2(target.y - su.y, target.x - su.x);
        const cur = typeof su.aimAngle === "number" ? su.aimAngle : desiredAngle;
        su.aimAngle = cur + angleDelta(cur, desiredAngle) * (1 - Math.exp(-aimSpeed * dt));
      }
      if (isFlame) {
        if (target) applyFlamethrowerDamage(su, dt);
        else su.flameActive = false;
        continue;
      }
      if (target && su.fireCooldown <= 0 && !su.reloading) {
        const aimDiff = Math.abs(angleDelta(su.aimAngle, Math.atan2(target.y - su.y, target.x - su.x)));
        if (aimDiff <= (CONFIG.survivors.weapon.aimTolerance || 0.14)) {
          shoot(su, target);
          su.fireCooldown = shotInterval;
        }
      }
    }

  }
  const pressedKeys = new Set();
  const MOVEMENT_KEYS = new Set([
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
    "w",
    "a",
    "s",
    "d",
  ]);
  const JOYSTICK_DEAD_ZONE = 0.14;
  let joystickPointer = null;
  let lastCanvasPointer = { x: null, y: null };

  let visualTime = 0;
  let dayMode = false; // false = night, true = day
  let darkMode = true; // night => dark mode on by default
  let preMap1DarkMode = null;
  let workersEnabled = true;
  let workerAssignment = "steel";
  let idSequence = 1;
  let lastFrame = performance.now();
  let eventTimer = 0;
  let endTimer = 0;

  let game = createFreshRun();
  let bestTime = loadBestTime();

  const hudCache = {
    survivors: "",
    kills: "",
    time: "",
    threatLevel: 0,
    threatLabel: "",
  };

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  function init() {
    width = CONFIG.world.width;
    height = CONFIG.world.height;
    resize();
    buildMenuScene();
    snapCamera();
    bindEvents();
    setupJoystick();
    darkMode = CONFIG.visual.darkMode;
    workersEnabled = CONFIG.workers.enabled;
    syncTuningUI();
    syncFormationUI();
    syncWorkersUI();
    workerAssignment = "steel";
    syncWorkerAssignmentUI();
    syncControlVisibility();
    syncDarkModeUI();
    updateBestLabels();
    syncHud(true);
    requestAnimationFrame(loop);
  }

  function createFreshRun() {
    return {
      time: 0,
      kills: 0,
      infected: 0,
      spawnTimer: 0,
      shake: 0,
      flash: 0,
      flashColor: "255, 107, 95",
    };
  }

  function goToMainMenu() {
    if (preMap1DarkMode !== null) {
      darkMode = preMap1DarkMode;
      CONFIG.visual.darkMode = preMap1DarkMode;
      dayMode = !darkMode;
      preMap1DarkMode = null;
      applyDayNight();
      syncDarkModeUI();
    }
    mode = "menu";
    game = createFreshRun();
    steel = 0;
    gas = 0;
    beams = [];
    particles = [];
    rings = [];
    texts = [];
    zombies = [];
    lamps = [];
    zombieSpawnCount = 0;
    civilians = [];
    carriedCivilians = [];
    safeZones = [];
    evacuationZones = [];
    deployingUnits = [];
    returningUnits = [];
    evacuatingDefenders = [];
    survivors = [];
    squads = [];
    activeSquad = null;
    drawnPath = [];
    isDrawingPath = false;
    zombieSpawners = [];
    pressedKeys.clear();
    resetGroupInput();
    closeTuning();
    closeFormationMenu();
    dom.startScreen.hidden = false;
    dom.gameOverScreen.hidden = true;
    dom.pauseScreen.hidden = true;
    dom.pauseButton.disabled = true;
    dom.pauseButton.classList.remove("is-paused");
    syncControlVisibility();
    syncHud(true);
    updateBestLabels();
  }

  function buildMenuScene() {
    mode = "menu";
    currentMapId = "survival";
    dom.startScreen.hidden = false;
    dom.gameOverScreen.hidden = true;
    dom.pauseScreen.hidden = true;
    game = createFreshRun();
    steel = 0;
    gas = 0;
    beams = [];
    particles = [];
    rings = [];
    texts = [];
    zombies = [];
    lamps = [];
    zombieSpawnCount = 0;
    placeSurvivors();
    generateObstacles();
    setupWorldEntities();
    squads = [];
    activeSquad = null;
    syncControlVisibility();
    syncHud(true);
  }

  function restartCurrentRun() {
    if (mode === "build") startBuildMode();
    else startGame(currentMapId);
  }

  function startGame(mapId = "survival") {
    const previousMapId = currentMapId;
    currentMapId = mapId;
    applyMapLayout(mapId);
    width = CONFIG.world.width;
    height = CONFIG.world.height;
    window.clearTimeout(endTimer);
    hideEvent();
    dom.startScreen.hidden = true;
    dom.gameOverScreen.hidden = true;
    dom.pauseScreen.hidden = true;
    closeTuning();
    closeFormationMenu();
    dom.pauseButton.disabled = false;
    dom.pauseButton.classList.remove("is-paused");
    dom.pauseButton.setAttribute("aria-label", "Pause simulation");

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    mode = "playing";
    game = createFreshRun();
    steel = 0;
    gas = 0;
    beams = [];
    particles = [];
    rings = [];
    texts = [];
    zombies = [];
    lamps = [];
    zombieSpawnCount = 0;
    zombieSpawners = [];
    pressedKeys.clear();
    resetGroupInput();

    if (mapId === "map1") {
      if (previousMapId !== "map1") preMap1DarkMode = darkMode;
      darkMode = false;
      CONFIG.visual.darkMode = false;
      dayMode = true;
      applyDayNight();
      syncDarkModeUI();
    } else if (preMap1DarkMode !== null) {
      darkMode = preMap1DarkMode;
      CONFIG.visual.darkMode = preMap1DarkMode;
      dayMode = !darkMode;
      preMap1DarkMode = null;
      applyDayNight();
      syncDarkModeUI();
    }

    const layout = MAP_LAYOUTS[mapId] || MAP_LAYOUTS.survival;
    if (layout.empty) {
      // Completely blank map: clear every object/entity system and leave only
      // the world background and camera controls.
      survivors = [];
      squads = [];
      squadCounter = 0;
      carriedCivilians = [];
      civilians = [];
      safeZones = [];
      evacuationZones = [];
      deployingUnits = [];
      returningUnits = [];
      evacuatingDefenders = [];
      zombieSpawners = [];
      steelMines = [];
      gasStations = [];
      furnaces = [];
      lamps = [];
      trees = [];
      obstacles = [];
      buildObjects = [];
      beams = [];
      particles = [];
      rings = [];
      texts = [];
      drawnPath = [];
      generateMap1ForestTrees();
      formation.x = width / 2;
      formation.y = height / 2;
      formation.vx = 0;
      formation.vy = 0;
      formation.facing = -Math.PI / 2;
      formation.radius = 82;
      activeSquad = makeSquad(null, [], {
        x: formation.x,
        y: formation.y,
        vx: 0,
        vy: 0,
        radius: formation.radius,
        facing: formation.facing,
        style: formation.style,
      });
      formation = activeSquad.formation;
      groupInput = activeSquad.input;
      carriedCivilians = activeSquad.carriedCivilians || [];
      syncFormationUI();
      syncSquadUI();
      syncCommandUI();
      syncControlVisibility();
      snapCamera();
      syncHud(true);
      return;
    }

    placeSurvivors();
    setupWorldEntities();

    // Spawn the starting group in front of the first safe zone's gate.
    if (safeZones.length > 0) {
      const zone = safeZones[0];
      const gateY = zone.y - (zone.h || zone.radius * 2) / 2;
      const targetX = zone.x;
      const targetY = gateY - 150;
      const dx = targetX - formation.x;
      const dy = targetY - formation.y;
      formation.x = targetX;
      formation.y = targetY;
      formation.facing = Math.PI / 2;
      for (const surv of survivors) {
        surv.x += dx;
        surv.y += dy;
        surv.targetX = (surv.targetX || surv.x) + dx;
        surv.targetY = (surv.targetY || surv.y) + dy;
      }
      for (const civ of carriedCivilians) {
        civ.x += dx;
        civ.y += dy;
      }
    }

    generateObstacles();

    // Reset squad naming for the new run.
    squads = [];
    squadCounter = 0;
    activeSquad = makeSquad(null, survivors, {
      x: formation.x,
      y: formation.y,
      vx: formation.vx,
      vy: formation.vy,
      radius: formation.radius,
      facing: formation.facing,
      style: formation.style,
    });
    survivors = activeSquad.survivors;
    formation = activeSquad.formation;
    groupInput = activeSquad.input;
    carriedCivilians = activeSquad.carriedCivilians || [];
    syncFormationUI();
    syncSquadUI();
    syncCommandUI();
    syncControlVisibility();

    // A small opening horde gives the outpost something to do immediately.
    const opening = CONFIG.zombies.initialWave;
    spawnWave(Math.ceil(opening / 2));
    spawnWave(Math.floor(opening / 2));
    game.spawnTimer = spawnIntervalAt(0) * 0.8;

    // Zombies are already spread across the larger map.
    scatterZombies(CONFIG.zombies.scatteredCount);
    snapCamera();

    syncHud(true);
  }

  function startMap1() {
    startGame("map1");
  }

  function startBuildMode() {
    currentMapId = "survival";
    if (preMap1DarkMode !== null) {
      darkMode = preMap1DarkMode;
      CONFIG.visual.darkMode = preMap1DarkMode;
      dayMode = !darkMode;
      preMap1DarkMode = null;
      applyDayNight();
      syncDarkModeUI();
    }
    applyMapLayout("survival");
    width = CONFIG.world.width;
    height = CONFIG.world.height;
    window.clearTimeout(endTimer);
    hideEvent();
    dom.startScreen.hidden = true;
    dom.gameOverScreen.hidden = true;
    dom.pauseScreen.hidden = true;
    closeTuning();
    closeFormationMenu();
    dom.pauseButton.disabled = true;
    mode = "build";
    game = createFreshRun();
    steel = 0;
    gas = 0;
    beams = [];
    particles = [];
    rings = [];
    texts = [];
    zombies = [];
    lamps = [];
    zombieSpawnCount = 0;
    civilians = [];
    carriedCivilians = [];
    safeZones = [];
    evacuationZones = [];
    deployingUnits = [];
    returningUnits = [];
    evacuatingDefenders = [];
    survivors = [];
    squads = [];
    activeSquad = null;
    buildTool = "safe";
    buildSelectedId = null;
    // Add a safe zone in build mode
    safeZones = [{
      id: idSequence++,
      x: width / 2,
      y: height / 2,
      radius: CONFIG.safeZones.radius,
      wallHealth: CONFIG.safeZones.wallHealth,
      maxWallHealth: CONFIG.safeZones.wallHealth,
      lastSyncedWallHealth: CONFIG.safeZones.wallHealth,
      gateOpen: 0,
      segments: (function() {
        const segs = [];
        const count = 12;
        const segMax = CONFIG.safeZones.wallHealth;
        for (let s = 0; s < count; s++) {
          const centerAngle = -Math.PI / 2 + (s / count) * TAU;
          segs.push({
            index: s,
            isGate: s === 0,
            angleStart: centerAngle - TAU / (count * 2),
            angleEnd: centerAngle + TAU / (count * 2),
            centerAngle,
            health: segMax,
            maxHealth: segMax,
            seed: 13.7 + s * 4.3,
          });
        }
        return segs;
      })(),
      capacity: CONFIG.safeZones.capacity,
      civilians: [],
      recruits: [],
      defenders: [],
      workers: [],
      turrets: [],
    }];
    // Add steel mines next to the safe zone in build mode.
    steelMines = [];
    furnaces = [];
    const _sz = safeZones[0];
    if (_sz) {
      const mineW = 46;
      const mineH = 40;
      const offsets = [
        { x: _sz.radius + mineW * 0.5 + 90, y: -mineH * 1.6 },
        { x: _sz.radius + mineW * 0.5 + 90, y: mineH * 1.6 },
      ];
      for (const off of offsets) {
        steelMines.push({
          id: idSequence++,
          x: _sz.x + off.x,
          y: _sz.y + off.y,
          w: mineW,
          h: mineH,
          zoneId: _sz.id,
        });
      }
      // Gas stations on the opposite side of the safe zone.
      const gasOffsets = [
        { x: -(_sz.radius + mineW * 0.5 + 90), y: -mineH * 1.6 },
        { x: -(_sz.radius + mineW * 0.5 + 90), y: mineH * 1.6 },
      ];
      for (const off of gasOffsets) {
        gasStations.push({
          id: idSequence++,
          x: _sz.x + off.x,
          y: _sz.y + off.y,
          w: mineW,
          h: mineH,
          zoneId: _sz.id,
        });
      }
      furnaces.push({
        id: idSequence++,
        x: _sz.x - _sz.radius * 0.5,
        y: _sz.y,
        w: 44,
        h: 44,
        zoneId: _sz.id,
      });
    }
    // Add a zombie spawner in build mode
    zombieSpawners = [{
      id: idSequence++,
      x: width * 0.75,
      y: height * 0.25,
      w: 60,
      h: 60,
      timer: (CONFIG.zombies.waveIntervals && CONFIG.zombies.waveIntervals[0]) || 30,
      interval: 3,
    }];
    formation = {
      x: width / 2,
      y: height / 2,
      vx: 0,
      vy: 0,
      radius: 120,
      facing: -Math.PI / 2,
      style: "circle",
    };
    pressedKeys.clear();
    resetGroupInput();
    syncFormationUI();
    syncControlVisibility();
    snapCamera();
    syncHud(true);
    showEvent("Build Mode — empty map");
  }

  function endRun() {
    if (mode === "gameover") return;

    mode = "gameover";
    dom.pauseButton.disabled = true;
    dom.pauseButton.classList.remove("is-paused");
    dom.pauseScreen.hidden = true;
    closeTuning();
    closeFormationMenu();
    resetGroupInput();
    syncControlVisibility();
    hideEvent();

    const newBest = game.time > bestTime;
    if (newBest) {
      bestTime = game.time;
      saveBestTime(bestTime);
    }

    window.clearTimeout(endTimer);
    endTimer = window.setTimeout(() => {
      const startingCount = CONFIG.survivors.startingCount;
      dom.finalTime.textContent = formatTime(game.time);
      dom.finalKills.textContent = String(game.kills);
      dom.finalInfected.textContent = String(Math.max(game.infected, startingCount - survivors.length));
      dom.newBest.hidden = !newBest;

      if (game.kills > 0) {
        dom.gameOverCopy.textContent =
          `All ${startingCount} blue dots turned. ${game.kills} zombie${game.kills === 1 ? "" : "s"} went down first.`;
      } else {
        dom.gameOverCopy.textContent =
          "Every blue dot has turned. The outpost belongs to the green now.";
      }

      updateBestLabels();
      dom.gameOverScreen.hidden = false;
      dom.retryButton.focus({ preventScroll: true });
    }, 780);
  }

  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Camera: shows a window of the world. Zoom changes only the view, never the
  // size, speed or behaviour of anything in the simulation.
  // ---------------------------------------------------------------------------
  function clampZoom(value) {
    return clamp(value, CONFIG.camera.minZoom, CONFIG.camera.maxZoom);
  }

  function screenToWorld(sx, sy) {
    return {
      x: camera.x + (sx - viewW / 2) / camera.zoom,
      y: camera.y + (sy - viewH / 2) / camera.zoom,
    };
  }

  function worldToScreen(wx, wy) {
    return {
      x: (wx - camera.x) * camera.zoom + viewW / 2,
      y: (wy - camera.y) * camera.zoom + viewH / 2,
    };
  }

  function applyWorldTransform() {
    const scale = dpr * camera.zoom;
    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      (viewW / 2 - camera.x * camera.zoom) * dpr,
      (viewH / 2 - camera.y * camera.zoom) * dpr
    );
  }

  function visibleWorldRect() {
    const halfW = viewW / (2 * camera.zoom);
    const halfH = viewH / (2 * camera.zoom);
    return {
      left: camera.x - halfW,
      right: camera.x + halfW,
      top: camera.y - halfH,
      bottom: camera.y + halfH,
    };
  }

  function clampCameraToWorld() {
    const halfW = viewW / (2 * camera.zoom);
    const halfH = viewH / (2 * camera.zoom);
    const overscan = currentMapId === "map1" ? 70 / camera.zoom : 0;
    const minX = Math.max(0, halfW - overscan);
    const maxX = Math.max(minX, width - halfW + overscan);
    const minY = Math.max(0, halfH - overscan);
    const maxY = Math.max(minY, height - halfH + overscan);
    if (currentMapId === "map1") {
      // Never snap to the center on Map 1; keep the current focus even when
      // the whole map fits on screen.
      camera.x = 2 * halfW >= width + overscan * 2
        ? clamp(camera.x, 0, width)
        : clamp(camera.x, minX, maxX);
      camera.y = 2 * halfH >= height + overscan * 2
        ? clamp(camera.y, 0, height)
        : clamp(camera.y, minY, maxY);
    } else {
      camera.x = 2 * halfW >= width ? width / 2 : clamp(camera.x, halfW, width - halfW);
      camera.y = 2 * halfH >= height ? height / 2 : clamp(camera.y, halfH, height - halfH);
    }
  }

  function snapCamera() {
    camera.x = formation.x;
    camera.y = formation.y;
    camera.offsetX = 0;
    camera.offsetY = 0;
    camera.anchor = null;
    camera.lockedZone = null;
    clampCameraToWorld();
  }

  function setZoomLevel(level) {
    camera.anchor = null;
    camera.offsetX = 0;
    camera.offsetY = 0;
    camera.targetZoom = clampZoom(level);
    syncZoomUI();
  }

  // Zoom towards a screen point (the mouse cursor). The world point under the
  // cursor stays put while the zoom eases in or out.
  function zoomAt(level, sx, sy) {
    const target = clampZoom(level);
    const world = screenToWorld(sx, sy);
    camera.anchor = { sx, sy, wx: world.x, wy: world.y };
    camera.targetZoom = target;
    syncZoomUI();
  }

  function updateCamera(dt) {
    const cfg = CONFIG.camera;
    const cam = camera;

    cam.zoom += (cam.targetZoom - cam.zoom) * (1 - Math.exp(-cfg.zoomResponse * dt));
    if (Math.abs(cam.targetZoom - cam.zoom) < 0.001) cam.zoom = cam.targetZoom;

    if (cam.lockedZone) {
      const zone = cam.lockedZone;
      if (!safeZones.includes(zone)) {
        cam.lockedZone = null;
      } else {
        const input = readMovementInput();
        if (Math.hypot(input.x, input.y) > 0.1) {
          cam.lockedZone = null;
        } else {
          cam.x += (zone.x - cam.x) * (1 - Math.exp(-cfg.followResponse * dt));
          cam.y += (zone.y - cam.y) * (1 - Math.exp(-cfg.followResponse * dt));
        }
      }
    }

    const freeMapCamera = currentMapId === "map1";

    if (cam.lockedZone) {
      // keep locked; skip normal follow
    } else if (cam.anchor) {
      const a = cam.anchor;
      cam.x = a.wx - (a.sx - viewW / 2) / cam.zoom;
      cam.y = a.wy - (a.sy - viewH / 2) / cam.zoom;
      if (cam.zoom === cam.targetZoom) {
        if (!freeMapCamera) {
          cam.offsetX = cam.x - formation.x;
          cam.offsetY = cam.y - formation.y;
        }
        cam.anchor = null;
      }
    } else if (freeMapCamera) {
      // Map 1 uses a free camera: manual pan only, never auto-recenter.
      const input = readMovementInput();
      if (Math.hypot(input.x, input.y) > 0.01) {
        const panSpeed = 600 / cam.zoom;
        cam.x += input.x * panSpeed * dt;
        cam.y += input.y * panSpeed * dt;
      }
    } else {
      const decay = Math.exp(-cfg.offsetDecay * dt);
      cam.offsetX *= decay;
      cam.offsetY *= decay;
      const follow = 1 - Math.exp(-cfg.followResponse * dt);
      cam.x += (formation.x + cam.offsetX - cam.x) * follow;
      cam.y += (formation.y + cam.offsetY - cam.y) * follow;
    }

    if (!cam.lockedZone && !freeMapCamera) {
      // The squad always stays on screen, whatever the zoom level.
      const marginX = Math.min(cfg.keepVisibleMarginPx, viewW * 0.3);
      const marginY = Math.min(cfg.keepVisibleMarginPx, viewH * 0.3);
      const maxDx = Math.max(0, (viewW / 2 - marginX) / cam.zoom);
      const maxDy = Math.max(0, (viewH / 2 - marginY) / cam.zoom);
      cam.x = clamp(cam.x, formation.x - maxDx, formation.x + maxDx);
      cam.y = clamp(cam.y, formation.y - maxDy, formation.y + maxDy);
    }

    clampCameraToWorld();
  }

  function fillScreenText(text, worldX, worldY) {
    const p = worldToScreen(worldX, worldY);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillText(text, p.x, p.y);
    ctx.restore();
  }

  function loop(now) {
    const delta = Math.min(Math.max((now - lastFrame) / 1000, 0), CONFIG.visual.maxDeltaSeconds);
    lastFrame = now;
    visualTime += delta;

    updateMotes(delta);
    if (mode === "playing") {
      updateCamera(delta);
      updateSimulation(delta);
    } else if (mode === "build") {
      // Pan the camera with the joystick / WASD in build mode.
      const input = readMovementInput();
      const speed = 300;
      camera.x += input.x * speed * delta;
      camera.y += input.y * speed * delta;
      clampCameraToWorld();
      camera.zoom += (camera.targetZoom - camera.zoom) * (1 - Math.exp(-CONFIG.camera.zoomResponse * delta));
      if (Math.abs(camera.targetZoom - camera.zoom) < 0.001) camera.zoom = camera.targetZoom;

      updateZombieSpawners(delta);
      zombies = zombies.filter((z) => z.alive);
    } else {
      updateCamera(delta);
    }
    if (mode !== "paused") {
      updateEffects(delta);
    }

    render();
    requestAnimationFrame(loop);
  }

  function currentThreatLevel() {
    if (!game) return CONFIG.gameplay ? (CONFIG.gameplay.threatOverride || 1) : 1;
    const lost = CONFIG.survivors.startingCount - survivors.length;
    const pressure = clamp((game.time / 70 + lost * 0.075) * (CONFIG.gameplay ? CONFIG.gameplay.threatScale : 1), 0, 1);
    const computed = clamp(1 + Math.floor(pressure * 4.999), 1, 5);
    const override = CONFIG.gameplay ? CONFIG.gameplay.threatOverride : 0;
    return override > 0 ? clamp(override, 1, 5) : computed;
  }

  function waveIntervalForThreat(level) {
    const intervals = CONFIG.zombies.waveIntervals || [30, 25, 20, 15, 10];
    return intervals[clamp(Math.round(level) - 1, 0, intervals.length - 1)];
  }

  function zombiesPerWave() {
    return Math.max(5, Math.floor(CONFIG.zombies.initialWave || 5));
  }

  // Every spawner independently emits a full wave of zombies. Threat level
  // only changes how often that happens.
  function updateZombieSpawners(dt) {
    const threatLevel = currentThreatLevel();
    const interval = waveIntervalForThreat(threatLevel);
    const perWave = zombiesPerWave();
    for (const sp of zombieSpawners) {
      if (typeof sp.timer !== "number") sp.timer = interval;
      if (sp.timer > interval) sp.timer = interval;
      sp.timer -= dt;
      if (sp.timer <= 0) {
        sp.timer = interval;
        for (let i = 0; i < perWave; i += 1) {
          spawnNaturalZombie(
            sp.x + randomRange(-sp.w / 2, sp.w / 2),
            sp.y + randomRange(-sp.h / 2, sp.h / 2)
          );
        }
      }
    }
  }

  function updateSimulation(dt) {
    game.time += dt;

    updateGroup(dt);
    updateSurvivors(dt);
    updateCivilians(dt);
    updateSafeZones(dt);
    updateWorkers(dt);
    updateLamps(dt);
    updateRecruitments(dt);
    updateDefenders(dt);
    updateEvacuatingDefenders(dt);
    updateEvacuationZones(dt);
    updateDeployingUnits(dt);

    // Every spawner emits its own full wave on the threat-level interval.
    updateZombieSpawners(dt);
    updateReturningUnits(dt);

    // Keep every inactive squad alive and fighting in real time.
    for (const squad of squads) {
      updateSquad(dt, squad);
    }

    zombies = zombies.filter((zombie) => zombie.alive);
    updateZombies(dt);
    zombies = zombies.filter((zombie) => {
      if (!zombie.alive) return false;
      if (!formation) return true;
      return Math.hypot(zombie.x - formation.x, zombie.y - formation.y) < Math.max(width, height) * 2;
    });

    if (survivors.length === 0 && deployingUnits.length === 0 && currentMapId !== "map1") {
      endRun();
    }

    syncHud();
    syncSquadUI();
  }

  function returnSoldiersToZone(zoneId, count) {
    const zone = safeZones.find((z) => z.id === zoneId);
    if (!zone) return;
    const n = Math.min(count, survivors.length);
    for (let i = 0; i < n; i += 1) {
      const soldier = survivors.pop();
      if (!soldier) break;
      soldier.state = "returning";
      soldier.zoneId = zone.id;
      returningUnits.push(soldier);
    }
  }

  // Snap a centered rectangular spot so its top-left boundary sits on the
  // 72 px map grid. Dimensions are unchanged.
  function snapSpotToGrid(center, size) {
    const step = 72;
    return Math.round((center - size / 2) / step) * step + size / 2;
  }

  function setupWorldEntities() {
    buildObjects = buildObjects.filter((o) => !o.civilianSpotWall);
    civilians = [];
    carriedCivilians = [];
    safeZones = [];
    evacuationZones = [];
    deployingUnits = [];
    returningUnits = [];
    evacuatingDefenders = [];

    const szCount = CONFIG.safeZones.count;
    const szW = CONFIG.safeZones.width || CONFIG.safeZones.radius * 2 || 236;
    const szH = CONFIG.safeZones.height || CONFIG.safeZones.radius * 2 || 236;
    // Place safe zones toward the lower side of the map.
    for (let i = 0; i < szCount; i += 1) {
      const spacing = width / (szCount + 1);
      let x = clamp(spacing * (i + 1), szW / 2 + 40, width - szW / 2 - 40);
      let y = clamp(height / 2, szH / 2 + 80, height - szH / 2 - 40);
      x = snapSpotToGrid(x, szW);
      y = snapSpotToGrid(y, szH);
      x = clamp(x, szW / 2 + 40, width - szW / 2 - 40);
      y = clamp(y, szH / 2 + 80, height - szH / 2 - 40);
      const segMax = CONFIG.safeZones.wallHealth;
      const segments = [
        { index: 0, isGate: true, side: "top", health: segMax, maxHealth: segMax, seed: (i + 1) * 13.7 + 0 },
        { index: 1, isGate: false, side: "right", health: segMax, maxHealth: segMax, seed: (i + 1) * 13.7 + 1 },
        { index: 2, isGate: false, side: "bottom", health: segMax, maxHealth: segMax, seed: (i + 1) * 13.7 + 2 },
        { index: 3, isGate: false, side: "left", health: segMax, maxHealth: segMax, seed: (i + 1) * 13.7 + 3 },
      ];
      safeZones.push({
        id: idSequence++,
        x,
        y,
        w: szW,
        h: szH,
        radius: Math.max(szW, szH) / 2,
        wallHealth: CONFIG.safeZones.wallHealth,
        maxWallHealth: CONFIG.safeZones.wallHealth,
        lastSyncedWallHealth: CONFIG.safeZones.wallHealth,
        gateOpen: 0,
        segments,
        capacity: CONFIG.safeZones.capacity,
        civilians: [],
        recruits: [],
        defenders: [],
        workers: [],
        recruitments: [],
        turrets: [],
        recruitmentStation: {
          x: x + szW * 0.3,
          y: y + szH * 0.3,
          w: 34,
          h: 28,
        },
      });
    }

  // Steel Mines: two per safe zone, placed just outside the wall.
  steelMines = [];
  gasStations = [];
  furnaces = [];
  for (const zone of safeZones) {
    const mineW = 46;
    const mineH = 40;
    const offsets = [
      { x: zone.radius + mineW * 0.5 + 90, y: -mineH * 1.6 },
      { x: zone.radius + mineW * 0.5 + 90, y: mineH * 1.6 },
    ];
    for (const off of offsets) {
      steelMines.push({
        id: idSequence++,
        x: zone.x + off.x,
        y: zone.y + off.y,
        w: mineW,
        h: mineH,
        zoneId: zone.id,
      });
    }
    // Gas stations: two per safe zone, on the opposite side from steel mines.
    const gasOffsets = [
      { x: -(zone.radius + mineW * 0.5 + 90), y: -mineH * 1.6 },
      { x: -(zone.radius + mineW * 0.5 + 90), y: mineH * 1.6 },
    ];
    for (const off of gasOffsets) {
      gasStations.push({
        id: idSequence++,
        x: zone.x + off.x,
        y: zone.y + off.y,
        w: mineW,
        h: mineH,
        zoneId: zone.id,
      });
    }
    // Furnace: inside the safe zone, on the opposite side from the mines.
    furnaces.push({
      id: idSequence++,
      x: zone.x - zone.radius * 0.5,
      y: zone.y,
      w: 44,
      h: 44,
      zoneId: zone.id,
    });
  }

    // Evacuation zones.
    for (let i = 0; i < CONFIG.evacuation.count; i += 1) {
      // Evacuation sites are spread toward the corners and edges of the map.
      const spots = [
        [0.2, 0.2],
        [0.8, 0.22],
        [0.2, 0.78],
        [0.8, 0.8],
        [0.5, 0.12],
        [0.5, 0.9],
      ];
      const [fx, fy] = spots[i % spots.length];
      const evacRadius = CONFIG.evacuation.radius;
      let x = clamp(width * fx, evacRadius + 60, width - evacRadius - 60);
      let y = clamp(height * fy, evacRadius + 60, height - evacRadius - 60);
      x = snapSpotToGrid(x, evacRadius * 2);
      y = snapSpotToGrid(y, evacRadius * 2);
      x = clamp(x, evacRadius + 60, width - evacRadius - 60);
      y = clamp(y, evacRadius + 60, height - evacRadius - 60);
      const civiliansList = [];
      for (let c = 0; c < CONFIG.evacuation.civiliansPerZone; c += 1) {
        civiliansList.push(makeCivilian(x + randomRange(-evacRadius * 0.35, evacRadius * 0.35), y + randomRange(-evacRadius * 0.35, evacRadius * 0.35)));
      }
      evacuationZones.push({
        id: idSequence++,
        x,
        y,
        radius: evacRadius,
        w: evacRadius * 2,
        h: evacRadius * 2,
        entranceX: x,
        entranceY: y - evacRadius - 20,
        entranceRadius: 34,
        unlockX: x,
        unlockY: y - evacRadius - 60,
        locked: true,
        bites: 0,
        bitesToUnlock: CONFIG.evacuation.bitesToUnlock,
        civiliansTotal: civiliansList.length,
        civiliansRemaining: civiliansList.length,
        civilians: civiliansList,
        completed: false,
      });
    }

    // Continuous perimeter walls around each civilian spot, built from the
    // same 36 px quarter-square blocks as build-mode walls. The top row leaves
    // a 72 px (one map square / two wall blocks) opening at the unlock point.
    const wallSize = 36;
    const wallHalf = wallSize / 2;
    for (const zone of evacuationZones) {
      const hw = (zone.w || zone.radius * 2) / 2;
      const hh = (zone.h || zone.radius * 2) / 2;
      const left = zone.x - hw;
      const right = zone.x + hw;
      const top = zone.y - hh;
      const bottom = zone.y + hh;
      const addWall = (wx, wy) => {
        buildObjects.push({
          id: idSequence++,
          type: "wall",
          x: wx,
          y: wy,
          w: wallSize,
          h: wallSize,
          civilianSpotWall: true,
          spotId: zone.id,
        });
      };
      const bottomY = Math.round(bottom / wallSize) * wallSize + wallHalf;
      // Top and bottom rows. Skip the two top blocks under the unlock point.
      for (let bx = left + wallHalf; bx <= right - wallHalf; bx += wallSize) {
        if (!(bx >= zone.x - wallHalf * 2 && bx <= zone.x + wallHalf * 2)) {
          addWall(bx, top - wallHalf);
        }
        addWall(bx, bottomY);
      }
      // Left and right columns.
      const rightX = Math.round(right / wallSize) * wallSize + wallHalf;
      for (let by = top + wallHalf; by <= bottom - wallHalf; by += wallSize) {
        addWall(left - wallHalf, by);
        addWall(rightX, by);
      }
    }

    // Free civilians scattered.
    const freeCount = CONFIG.civilians.spawnCount;
    for (let i = 0; i < freeCount; i += 1) {
      const x = randomRange(80, width - 80);
      const y = randomRange(120, height - 80);
      civilians.push(makeCivilian(x, y));
    }

  // Zombie spawners in all four corners (survival mode).
  zombieSpawners = [];
  zombieSpawners.push({
    id: idSequence++,
    x: 120,
    y: 80,
    w: 60,
    h: 60,
    timer: (CONFIG.zombies.waveIntervals && CONFIG.zombies.waveIntervals[0]) || 30,
    interval: 3,
  });
  zombieSpawners.push({
    id: idSequence++,
    x: width - 120,
    y: 80,
    w: 60,
    h: 60,
    timer: (CONFIG.zombies.waveIntervals && CONFIG.zombies.waveIntervals[0]) || 30,
    interval: 3,
  });
  zombieSpawners.push({
    id: idSequence++,
    x: 120,
    y: height - 80,
    w: 60,
    h: 60,
    timer: (CONFIG.zombies.waveIntervals && CONFIG.zombies.waveIntervals[0]) || 30,
    interval: 3,
  });
  zombieSpawners.push({
    id: idSequence++,
    x: width - 120,
    y: height - 80,
    w: 60,
    h: 60,
    timer: (CONFIG.zombies.waveIntervals && CONFIG.zombies.waveIntervals[0]) || 30,
    interval: 3,
  });

  // Trees scattered across the map. Only the wooden trunk collides; the
  // canopy is a separate visual layer that can overlap units and other trees.
  trees = [];
  const treeTypes = TREE_TYPES;
  const treeTypeNames = Object.keys(treeTypes);
  const treeCount = 64;
  let treeAttempts = 0;
  while (trees.length < treeCount && treeAttempts < treeCount * 25) {
    treeAttempts += 1;
    const type = treeTypeNames[Math.floor(Math.random() * treeTypeNames.length)];
    const cfg = treeTypes[type];
    const trunkRadius = cfg.trunk * randomRange(0.85, 1.15);
    const canopyRadius = cfg.canopy * randomRange(0.85, 1.2);
    const density = clamp(cfg.density * randomRange(0.9, 1.1), 0.4, 1);
    const x = randomRange(70, width - 70);
    const y = randomRange(70, height - 70);
    if (Math.hypot(x - formation.x, y - formation.y) < 220) continue;

    let blocked = false;
    for (const zone of safeZones) {
      const zoneR = Math.max(zone.w || 0, zone.h || 0) / 2 + 60;
      if (Math.hypot(x - zone.x, y - zone.y) < zoneR + 40) { blocked = true; break; }
    }
    if (blocked) continue;
    for (const zone of evacuationZones) {
      const zoneR = Math.max(zone.w || 0, zone.h || 0) / 2 + 60;
      if (Math.hypot(x - zone.x, y - zone.y) < zoneR + 40) { blocked = true; break; }
    }
    if (blocked) continue;
    for (const obstacle of obstacles) {
      if (Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.radius + trunkRadius + 18) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    for (const obj of buildObjects) {
      if (obj.type !== "wall" && obj.type !== "tree") continue;
      const range = Math.max(obj.w, obj.h) / 2 + trunkRadius + 16;
      if (Math.hypot(x - obj.x, y - obj.y) < range) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    for (const other of trees) {
      if (Math.hypot(x - other.x, y - other.y) < trunkRadius + other.trunkRadius + 10) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    trees.push(createTreeObject(x, y, type, trunkRadius));
  }
  }

  function makeCivilian(x, y) {
    return {
      id: idSequence++,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: CONFIG.civilians.radius,
      infections: 0,
      bitesToInfect: Math.random() < 0.5 ? 1 : 2,
      biteFlash: 0,
      alive: true,
      carried: false,
      rescued: false,
      zoneId: null,
      recruitTimer: 0,
      state: "wandering",
      beingAttacked: false,
    };
  }

  function placeSurvivors() {
    const count = Math.max(1, Math.floor(CONFIG.survivors.startingCount));
    const group = CONFIG.survivors.group;
    const centerX = width / 2;
    const centerY = height / 2 + Math.min(24, height * 0.018);
    const slots = formationSlots(formation.style, count, group.formationSpacing);

    formation.x = centerX;
    formation.y = centerY;
    formation.vx = 0;
    formation.vy = 0;
    formation.facing = -Math.PI / 2;
    formation.radius = formationExtent(slots);

    const forwardX = Math.cos(formation.facing);
    const forwardY = Math.sin(formation.facing);
    const rightX = -forwardY;
    const rightY = forwardX;

    survivors = [];

    for (let i = 0; i < count; i += 1) {
      const slot = slots[i];
      const offsetX = rightX * slot.lx + forwardX * slot.ly;
      const offsetY = rightY * slot.lx + forwardY * slot.ly;
      const angle = Math.atan2(offsetY, offsetX);

      survivors.push({
        id: idSequence++,
        x: centerX + offsetX,
        y: centerY + offsetY,
        targetX: centerX + offsetX,
        targetY: centerY + offsetY,
        radius: CONFIG.survivors.radius,
        infections: 0,
        fireCooldown: Math.random() * fireInterval(),
        shotsInMagazine: weaponMagazineSize(),
        reloading: false,
        reloadTimer: 0,
        reloadDuration: weaponReloadSeconds(),
        aimAngle: angle,
        vx: 0,
        vy: 0,
        flash: 0,
        biteFlash: 0,
        formationGain: randomRange(0.88, 1.14),
        seed: Math.random() * TAU,
        alive: true,
        state: "active",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Group movement + formations

  // ---------------------------------------------------------------------------
  function formationSlots(style, count, spacing) {
    const slots = [];

    if (count <= 0) return slots;
    if (count === 1) return [{ lx: 0, ly: 0 }];

    const civilianBoost = Math.min(28, carriedCivilians.length * 3.5);

    if (style === "line") {
      // Horizontal line perpendicular to the direction the squad is facing.
      const frontOffset = carriedCivilians.length > 0 ? spacing * 0.35 : 0;
      for (let i = 0; i < count; i += 1) {
        slots.push({ lx: (i - (count - 1) / 2) * spacing, ly: frontOffset });
      }
      return slots;
    }

    if (style === "square") {
      // With few soldiers: perimeter outline. With many: filled compact block.
      if (count <= 6) {
        const perimeter = Math.max(spacing * 4, count * spacing);
        const side = Math.max(spacing * 2.2 + civilianBoost, perimeter / 4);
        const half = side / 2;
        for (let i = 0; i < count; i += 1) {
          const t = (i / count) * 4;
          const edge = Math.floor(t);
          const u = t - edge;
          if (edge === 0) {
            slots.push({ lx: lerp(-half, half, u), ly: half });
          } else if (edge === 1) {
            slots.push({ lx: half, ly: lerp(half, -half, u) });
          } else if (edge === 2) {
            slots.push({ lx: lerp(half, -half, u), ly: -half });
          } else {
            slots.push({ lx: -half, ly: lerp(-half, half, u) });
          }
        }
        return slots;
      }
      // Filled compact block.
      const columns = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / columns);
      for (let i = 0; i < count; i += 1) {
        const column = i % columns;
        const row = Math.floor(i / columns);
        slots.push({
          lx: (column - (columns - 1) / 2) * spacing,
          ly: (row - (rows - 1) / 2) * spacing,
        });
      }
      return slots;
    }

    if (style === "triangle") {
      // With few soldiers: perimeter outline. With many: filled triangle.
      if (count <= 6) {
        const scale = Math.max(spacing * 2.0 + civilianBoost, (count * spacing) / 3.2);
        const apex = { lx: 0, ly: scale * 0.95 };
        const backRight = { lx: scale * 0.88, ly: -scale * 0.68 };
        const backLeft = { lx: -scale * 0.88, ly: -scale * 0.68 };
        const vertices = [apex, backRight, backLeft];
        for (let i = 0; i < count; i += 1) {
          const t = (i / count) * 3;
          const edge = Math.floor(t);
          const u = t - edge;
          const a = vertices[edge];
          const b = vertices[(edge + 1) % 3];
          slots.push({
            lx: lerp(a.lx, b.lx, u),
            ly: lerp(a.ly, b.ly, u),
          });
        }
        return slots;
      }
      // Filled triangle.
      let rows = 1;
      while ((rows * (rows + 1)) / 2 < count) rows += 1;
      let remaining = count;
      for (let row = 0; row < rows && remaining > 0; row += 1) {
        const inRow = Math.min(row + 1, remaining);
        for (let i = 0; i < inRow; i += 1) {
          slots.push({
            lx: (i - (inRow - 1) / 2) * spacing,
            ly: ((rows - 1) / 2 - row) * spacing * 0.88,
          });
        }
        remaining -= inRow;
      }
      return slots;
    }

    if (style === "wedge") {
      // Narrow, pointed wedge: leader at the tip, diagonal rows behind,
      // progressively wider toward the back but still relatively narrow.
      const depth = Math.max(spacing * 1.15, (count * spacing) / 3.4);
      const halfWidth = Math.max(spacing * 0.45, depth * 0.42);
      slots.push({ lx: 0, ly: depth * 0.95 }); // leader at the tip (front)
      let row = 1;
      let idx = 1;
      while (idx < count) {
        const inRow = Math.min(2, count - idx);
        for (let k = 0; k < inRow; k += 1) {
          const side = k === 0 ? -1 : 1;
          const rowWidth = (row / Math.max(1, Math.ceil((count - 1) / 2))) * halfWidth;
          slots.push({
            lx: side * Math.max(spacing * 0.35, rowWidth),
            ly: depth * 0.95 - row * spacing * 0.92,
          });
        }
        idx += inRow;
        row += 1;
      }
      return slots;
    }

    // Circle: evenly spaced ring around the group centre.
    const ringRadius = Math.max(spacing * 1.2 + civilianBoost, (spacing * count) / TAU);
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (i / count) * TAU;
      slots.push({
        lx: Math.cos(angle) * ringRadius,
        ly: Math.sin(angle) * ringRadius,
      });
    }
    return slots;
  }

  function formationExtent(slots) {
    let furthest = 0;
    for (const slot of slots) {
      furthest = Math.max(furthest, Math.hypot(slot.lx, slot.ly));
    }
    return furthest + CONFIG.survivors.radius + 12;
  }

  function applyFormationTargets() {
    const group = CONFIG.survivors.group;
    const slots = formationSlots(
      formation.style,
      survivors.length,
      group.formationSpacing
    );

    formation.radius = formationExtent(slots);

    const forwardX = Math.cos(formation.facing);
    const forwardY = Math.sin(formation.facing);
    const rightX = -forwardY;
    const rightY = forwardX;

    // The line formation is a single row, so reversing direction would otherwise
    // make every dot chase the opposite slot and cross through the centre. Sort
    // the survivors by their projection onto the current row axis and pair them
    // with the slots in the same order, so the row flips as a rigid body.
    let assignment = survivors.map((_, index) => index);
    if (formation.style === "line" && survivors.length > 1) {
      assignment = survivors
        .map((survivor, index) => ({ index, projection: (survivor.x - formation.x) * rightX + (survivor.y - formation.y) * rightY }))
        .sort((a, b) => a.projection - b.projection)
        .map((entry) => entry.index);
    }

    for (let k = 0; k < survivors.length; k += 1) {
      const survivor = survivors[assignment[k]];
      const slot = slots[k] || { lx: 0, ly: 0 };
      const wobbleX = Math.cos(visualTime * 0.95 + survivor.seed * 1.7) * group.jitter;
      const wobbleY = Math.sin(visualTime * 1.15 + survivor.seed * 2.3) * group.jitter;

      survivor.targetX = formation.x + rightX * slot.lx + forwardX * slot.ly + wobbleX;
      survivor.targetY = formation.y + rightY * slot.lx + forwardY * slot.ly + wobbleY;

      // Default aiming orientation based on the soldier's position in the
      // formation. Acts as a default; soldiers still rotate to shoot zombies.
      let defaultAim = formation.facing;
      if (formation.style === "circle" || formation.style === "square") {
        const ox = rightX * slot.lx + forwardX * slot.ly;
        const oy = rightY * slot.lx + forwardY * slot.ly;
        if (Math.hypot(ox, oy) > 0.001) defaultAim = Math.atan2(oy, ox);
      } else if (formation.style === "line") {
        if (k === 0) defaultAim = formation.facing - 0.55;
        else if (k === survivors.length - 1) defaultAim = formation.facing + 0.55;
        else defaultAim = formation.facing;
      } else if (formation.style === "wedge") {
        const depth = Math.max(group.formationSpacing * 1.15, (survivors.length * group.formationSpacing) / 3.4);
        const t = clamp((depth * 0.95 - slot.ly) / Math.max(1, depth * 0.95), 0, 1);
        const side = slot.lx >= 0 ? 1 : -1;
        defaultAim = formation.facing + side * (t * 0.65);
        if (Math.abs(slot.lx) < 0.001 && t < 0.15) defaultAim = formation.facing;
      }
      // triangle: all forward (default stays formation.facing)
      survivor.defaultAimAngle = defaultAim;
    }
  }

  function updateGroup(dt) {
    const group = CONFIG.survivors.group;
    let input = readMovementInput();
    const manual = Math.hypot(input.x, input.y) > 0.01;
    if (manual && activeSquad && activeSquad.path && activeSquad.path.length > 0) {
      activeSquad.path = [];
      activeSquad.pathIndex = 0;
    }
    if (!manual && activeSquad) {
      const pi = pathInput(activeSquad);
      if (pi) {
        input = pi;
      } else {
        const ci = commandInput(activeSquad);
        input = { x: ci.x, y: ci.y };
      }
    }

    // If inside a safe zone and not all soldiers are out yet, exit through
    // the gate first before heading to any outside destination.
    // (Redirect removed: groups now use the same wall/door collision rules.)
    const response = 1 - Math.exp(-group.responsiveness * dt);
    if (Math.hypot(input.x, input.y) <= 0.01) {
      formation.vx = 0;
      formation.vy = 0;
    }

    const carryFactor = carriedCivilians.length > 0 ? 0.72 : 1;
    const effectiveSpeed = group.speed * carryFactor;
    formation.vx += (input.x * effectiveSpeed - formation.vx) * response;
    formation.vy += (input.y * effectiveSpeed - formation.vy) * response;

    formation.x += formation.vx * dt;
    formation.y += formation.vy * dt;

    const speed = Math.hypot(formation.vx, formation.vy);
    if (speed > 6) {
      const targetFacing = Math.atan2(formation.vy, formation.vx);
      formation.facing += angleDelta(formation.facing, targetFacing) * (1 - Math.exp(-8 * dt));
    }

    // Keep the group centre out of rocks. Individual dots resolve their own
    // collisions, so the squad can slide around obstacles instead of sticking.
    const probe = {
      x: formation.x,
      y: formation.y,
      radius: Math.max(10, CONFIG.survivors.radius * 1.5),
    };
    resolveObstacleCollisions(probe);
    formation.x = probe.x;
    formation.y = probe.y;

    clampGroupToBounds();
  }

  function readMovementInput() {
    let x = 0;
    let y = 0;

    if (pressedKeys.size > 0) {
      if (pressedKeys.has("arrowleft") || pressedKeys.has("a")) x -= 1;
      if (pressedKeys.has("arrowright") || pressedKeys.has("d")) x += 1;
      if (pressedKeys.has("arrowup") || pressedKeys.has("w")) y -= 1;
      if (pressedKeys.has("arrowdown") || pressedKeys.has("s")) y += 1;
    }

    if (x === 0 && y === 0) {
      x = groupInput.x;
      y = groupInput.y;
    }

    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }

    return { x, y };
  }

  function clampGroupToBounds() {
    const margin = CONFIG.survivors.group.boundaryMargin;
    const halfX = Math.min(width / 2, formation.radius + margin);
    const halfY = Math.min(height / 2, formation.radius + margin);
    const nextX = clamp(formation.x, halfX, width - halfX);
    const nextY = clamp(formation.y, halfY, height - halfY);

    if (nextX !== formation.x) formation.vx = 0;
    if (nextY !== formation.y) formation.vy = 0;

    formation.x = nextX;
    formation.y = nextY;
  }

  function separateSurvivors() {
    const padding = 3;

    for (let i = 0; i < survivors.length; i += 1) {
      const a = survivors[i];

      for (let j = i + 1; j < survivors.length; j += 1) {
        const b = survivors[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDistance = a.radius + b.radius + padding;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared >= minDistance * minDistance) continue;

        const distance = Math.sqrt(distanceSquared);
        if (distance < 0.0001) {
          a.x -= minDistance / 2;
          b.x += minDistance / 2;
          continue;
        }

        const overlap = (minDistance - distance) / 2;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      }
    }

    for (const survivor of survivors) {
      if (formation.style === "wedge" && survivor === survivors[0]) continue;
      resolveObstacleCollisions(survivor);
      survivor.x = clamp(survivor.x, survivor.radius + 6, width - survivor.radius - 6);
      survivor.y = clamp(survivor.y, survivor.radius + 6, height - survivor.radius - 6);
    }
  }

  function shoot(survivor, target) {
    const isSniper = survivor.type === "sniper";
    const angle = Math.atan2(target.y - survivor.y, target.x - survivor.x);
    const muzzleDistance = survivor.radius + rifleLength(survivor);
    const startX = survivor.x + Math.cos(angle) * muzzleDistance;
    const startY = survivor.y + Math.sin(angle) * muzzleDistance;

    // Gunfire wakes sleeping zombies around the muzzle; the struck zombie is
    // always woken, and its wake-up ripples through its neighbours.
    const activation = CONFIG.zombies.activation;
    activateZombiesNear(startX, startY, activation.gunshotRadius, startX, startY);
    activateZombie(target, survivor.x, survivor.y);

    // Barrel direction is controlled by the aiming rotation; never snap it here.
    survivor.flash = 0.1;
    survivor.shotsInMagazine = Math.max(0, survivor.shotsInMagazine - 1);

    if (survivor.shotsInMagazine === 0) {
      survivor.reloading = true;
      survivor.reloadDuration = weaponReloadSeconds();
      survivor.reloadTimer = survivor.reloadDuration;
    }

    beams.push({
      x1: startX,
      y1: startY,
      x2: target.x,
      y2: target.y,
      life: 0.11,
      maxLife: 0.11,
    });

    const damage = isSniper ? CONFIG.zombies.health : CONFIG.zombies.health / 2;
    target.health = (target.health || 1) - damage;
    game.shake = Math.max(game.shake, 0.9);

    if (target.health <= 0) {
      target.alive = false;
      game.kills += 1;
      burstParticles(target.x, target.y, "kill");
      // A dying zombie is a loud disturbance: nearby sleepers wake and come
      // running to the kill site.
      activateZombiesNear(
        target.x,
        target.y,
        activation.killRadius,
        target.x,
        target.y
      );
      rings.push({
        x: target.x,
        y: target.y,
        radius: target.radius * 0.6,
        maxRadius: target.radius * 3.8,
        life: 0.26,
        maxLife: 0.26,
        color: "98, 235, 131",
        width: 1.2,
      });
    }
  }

  function survivorFiringRange(survivor) {
    if (survivor.type === "sniper") {
      return CONFIG.survivors.sniper.firingRange || CONFIG.survivors.firingRange;
    }
    if (survivor.type === "flamethrower") {
      return CONFIG.survivors.firingRange * (CONFIG.survivors.flamethrower.rangeMultiplier || 0.5);
    }
    return CONFIG.survivors.firingRange;
  }

  function killZombie(zombie) {
    if (!zombie || !zombie.alive) return;
    zombie.alive = false;
    game.kills += 1;
    burstParticles(zombie.x, zombie.y, "kill");
    const activation = CONFIG.zombies.activation;
    activateZombiesNear(zombie.x, zombie.y, activation.killRadius, zombie.x, zombie.y);
    rings.push({
      x: zombie.x,
      y: zombie.y,
      radius: zombie.radius * 0.6,
      maxRadius: zombie.radius * 3.8,
      life: 0.26,
      maxLife: 0.26,
      color: "98, 235, 131",
      width: 1.2,
    });
  }

  function applyFlamethrowerDamage(survivor, dt) {
    const cfg = CONFIG.survivors.flamethrower;
    const range = CONFIG.survivors.firingRange * (cfg.rangeMultiplier || 0.5);
    const rangeSquared = range * range;
    const halfAngle = cfg.halfAngle || 0.3;
    const damage = (cfg.damagePerSecond || 55) * dt;
    let hit = false;
    for (const zombie of zombies) {
      if (!zombie.alive) continue;
      const dx = zombie.x - survivor.x;
      const dy = zombie.y - survivor.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > rangeSquared) continue;
      const angle = Math.atan2(dy, dx);
      if (Math.abs(angleDelta(angle, survivor.aimAngle)) > halfAngle) continue;
      zombie.burnTimer = 0.35;
      zombie.health -= damage;
      hit = true;
      if (zombie.health <= 0) killZombie(zombie);
    }
    if (hit) {
      survivor.flash = Math.max(survivor.flash, 0.1);
      survivor.flameActive = true;
    } else {
      survivor.flameActive = false;
    }
    return hit;
  }

  function updateSurvivors(dt) {
    if (survivors.length === 0) return;

    const aimSpeed = CONFIG.survivors.weapon.aimSpeed || 4;
    const aimTolerance = CONFIG.survivors.weapon.aimTolerance || 0.14;
    const aimEase = 1 - Math.exp(-aimSpeed * dt);

    applyFormationTargets();

    for (const survivor of survivors) {
      if (!survivor.alive) continue;

      const isSniper = survivor.type === "sniper";
      const isFlame = survivor.type === "flamethrower";
      const sniperCfg = isSniper ? CONFIG.survivors.sniper : null;
      const shotInterval = isSniper ? 1 / sniperCfg.shotsPerSecond : isFlame ? 0.1 : fireInterval();
      const firingRange = survivorFiringRange(survivor);
      const rangeSquared = firingRange * firingRange;

      survivor.flash = Math.max(0, survivor.flash - dt);
      survivor.biteFlash = Math.max(0, survivor.biteFlash - dt);
      survivor.fireCooldown = Math.min(survivor.fireCooldown, shotInterval);
      survivor.fireCooldown -= dt;

      updateSurvivorMovement(survivor, dt);

      if (survivor.reloading) {
        survivor.reloadTimer -= dt;
        if (survivor.reloadTimer <= 0) {
          survivor.reloading = false;
          survivor.reloadTimer = 0;
          survivor.reloadDuration = weaponReloadSeconds();
          survivor.shotsInMagazine = weaponMagazineSize();
        }
      }

      // Prefer the current target if it is still valid to avoid instant switching.
      let target = null;
      if (survivor.aimTargetId != null) {
        const current = zombies.find((z) => z.id === survivor.aimTargetId && z.alive);
        if (current) {
          const d2 = (current.x - survivor.x) ** 2 + (current.y - survivor.y) ** 2;
          if (d2 <= rangeSquared * 1.2) target = current;
        }
      }
      if (!target) {
        target = findNearestZombie(survivor, rangeSquared);
        survivor.aimTargetId = target ? target.id : null;
      }

      // Track the target between shots so the rifle visibly follows the horde.
      if (target) {
        const desiredAngle = Math.atan2(target.y - survivor.y, target.x - survivor.x);
        survivor.aimAngle += angleDelta(survivor.aimAngle, desiredAngle) * aimEase;
      } else if (typeof survivor.defaultAimAngle === "number") {
        survivor.aimAngle += angleDelta(survivor.aimAngle, survivor.defaultAimAngle) * aimEase;
      }

      if (isFlame) {
        if (target) applyFlamethrowerDamage(survivor, dt);
        else survivor.flameActive = false;
        continue;
      }

      if (!target || survivor.reloading || survivor.fireCooldown > 0) continue;
      const aimDiff = Math.abs(angleDelta(survivor.aimAngle, Math.atan2(target.y - survivor.y, target.x - survivor.x)));
      if (aimDiff > aimTolerance) continue;

      shoot(survivor, target);
      survivor.fireCooldown = shotInterval;
    }

    separateSurvivors();
  }

  // ---------------------------------------------------------------------------
  // Civilians
  // ---------------------------------------------------------------------------
  function stepCivilianWander(civilian, dt, maxWanderSpeed) {
    if (!civilian.wanderTimer) civilian.wanderTimer = randomRange(0.6, 2.2);
    if (typeof civilian.wanderAngle !== "number") civilian.wanderAngle = Math.random() * TAU;
    civilian.wanderTimer -= dt;
    if (civilian.wanderTimer <= 0) {
      civilian.wanderTimer = randomRange(0.6, 2.2);
      civilian.wanderAngle += randomRange(-1.1, 1.1);
    }

    let fleeX = 0;
    let fleeY = 0;
    const dangerDist = 140;
    for (const zombie of zombies) {
      if (!zombie.alive) continue;
      const dx = civilian.x - zombie.x;
      const dy = civilian.y - zombie.y;
      const d = Math.hypot(dx, dy);
      if (d < dangerDist && d > 0.001) {
        const weight = 1 - d / dangerDist;
        fleeX += (dx / d) * weight * 2.2;
        fleeY += (dy / d) * weight * 2.2;
      }
    }

    let desiredVx = Math.cos(civilian.wanderAngle) * maxWanderSpeed + fleeX * 55;
    let desiredVy = Math.sin(civilian.wanderAngle) * maxWanderSpeed + fleeY * 55;

    const dirLen = Math.hypot(desiredVx, desiredVy);
    if (dirLen > 0.001) {
      const avoid = obstacleAvoidance(
        civilian.x,
        civilian.y,
        desiredVx / dirLen,
        desiredVy / dirLen,
        civilian.radius,
        38
      );
      desiredVx += avoid.x * 65;
      desiredVy += avoid.y * 65;

      const bAvoid = boundaryAvoidance(civilian.x, civilian.y, desiredVx / (Math.hypot(desiredVx, desiredVy) || 1), desiredVy / (Math.hypot(desiredVx, desiredVy) || 1), civilian.radius, 30);
      desiredVx += bAvoid.x * 40;
      desiredVy += bAvoid.y * 40;
    }

    return { vx: desiredVx, vy: desiredVy };
  }

  function formationPerimeterGuide(civilian) {
    const group = CONFIG.survivors.group;
    const spacing = group.formationSpacing;
    const count = Math.max(1, survivors.length);
    const civilianBoost = Math.min(28, carriedCivilians.length * 3.5);
    const pad = CONFIG.survivors.radius + civilian.radius + 4;

    const forwardX = Math.cos(formation.facing);
    const forwardY = Math.sin(formation.facing);
    const rightX = -forwardY;
    const rightY = forwardX;

    const relX = civilian.x - formation.x;
    const relY = civilian.y - formation.y;
    const lx = relX * rightX + relY * rightY;
    const ly = relX * forwardX + relY * forwardY;

    let clampedLx = lx;
    let clampedLy = ly;

    if (formation.style === "line") {
      // Protected zone sits behind the soldier line.
      const halfSpan = Math.max(spacing * 0.9, ((count - 1) * spacing) * 0.5 - civilian.radius);
      const frontLimit = spacing * 0.35 - pad;
      const backLimit = -Math.max(spacing * 1.45 + civilianBoost, 44);
      clampedLx = clamp(lx, -halfSpan, halfSpan);
      clampedLy = clamp(ly, backLimit, frontLimit);
    } else if (formation.style === "square") {
      const perimeter = Math.max(spacing * 4, count * spacing);
      const side = Math.max(spacing * 1.5 + civilianBoost, perimeter / 4);
      const halfInner = Math.max(14, side * 0.5 - pad * 0.65);
      clampedLx = clamp(lx, -halfInner, halfInner);
      clampedLy = clamp(ly, -halfInner, halfInner);
    } else if (formation.style === "triangle") {
      const scale = Math.max(spacing * 1.45 + civilianBoost, (count * spacing) / 3.2);
      const minY = -scale * 0.68 + pad * 0.55;
      const maxY = scale * 0.95 - pad * 0.85;
      clampedLy = clamp(ly, minY, Math.max(minY + 8, maxY));
      const t = clamp(( scale * 0.95 - clampedLy ) / Math.max(1, scale * 1.63), 0.15, 1);
      const halfWidthAtY = Math.max(10, t * scale * 0.88 - pad * 0.65);
      clampedLx = clamp(lx, -halfWidthAtY, halfWidthAtY);
    } else if (formation.style === "wedge") {
      const scale = Math.max(spacing * 1.45 + civilianBoost, (count * spacing) / 3.2);
      const maxY = -pad * 0.4;
      const minY = -scale * 0.95 + pad * 0.55;
      clampedLy = clamp(ly, minY, Math.max(minY + 8, maxY));
      const t = clamp((maxY - clampedLy) / Math.max(1, maxY - minY), 0, 1);
      const halfWidthAtY = Math.max(10, t * scale * 0.42 + pad * 0.5);
      clampedLx = clamp(lx, -halfWidthAtY, halfWidthAtY);
    } else {
      // Circle perimeter.
      const ringRadius = Math.max(spacing * 1.2 + civilianBoost, (spacing * count) / TAU);
      const innerRadius = Math.max(16, ringRadius - pad * 0.65);
      const dist = Math.hypot(lx, ly);
      if (dist > innerRadius && dist > 0.001) {
        clampedLx = (lx / dist) * innerRadius;
        clampedLy = (ly / dist) * innerRadius;
      }
    }

    const errLx = clampedLx - lx;
    const errLy = clampedLy - ly;
    const errDist = Math.hypot(errLx, errLy);
    if (errDist <= 0.001) {
      return { gx: 0, gy: 0, outside: 0 };
    }

    const worldDx = rightX * errLx + forwardX * errLy;
    const worldDy = rightY * errLx + forwardY * errLy;
    return {
      gx: worldDx,
      gy: worldDy,
      outside: errDist,
    };
  }

  function separateCivilians(list) {
    for (let i = 0; i < list.length; i += 1) {
      const a = list[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j += 1) {
        const b = list[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.radius + b.radius + 3;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minDist * minDist) continue;
        const d = Math.sqrt(d2) || 0.001;
        const overlap = (minDist - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      }
      resolveObstacleCollisions(a);
    }
  }

  function updateCarriedCivilians(dt) {
    const groupSpeed = CONFIG.survivors.group.speed;
    for (const civilian of carriedCivilians) {
      if (!civilian.alive) continue;
      civilian.prevX = civilian.x;
      civilian.prevY = civilian.y;
      civilian.beingAttacked = false;
      for (const zombie of zombies) {
        if (!zombie.alive) continue;
        const d = Math.hypot(civilian.x - zombie.x, civilian.y - zombie.y);
        if (d <= zombie.radius + civilian.radius + 2) {
          civilian.beingAttacked = true;
          break;
        }
      }
      civilian.biteFlash = Math.max(0, (civilian.biteFlash || 0) - dt);

      if (civilian.beingAttacked) {
        civilian.vx = 0;
        civilian.vy = 0;
        civilian.x = clamp(civilian.x, civilian.radius + 6, width - civilian.radius - 6);
        civilian.y = clamp(civilian.y, civilian.radius + 6, height - civilian.radius - 6);
        continue;
      }

      const wander = stepCivilianWander(civilian, dt, 18 * CONFIG.civilians.speed);
      const guide = formationPerimeterGuide(civilian);

      let desiredVx = wander.vx;
      let desiredVy = wander.vy;

      if (guide.outside > 0) {
        const pull = Math.min(groupSpeed * 3, guide.outside * 18 + 40);
        const nx = guide.gx / guide.outside;
        const ny = guide.gy / guide.outside;
        desiredVx += nx * pull + formation.vx * clamp(guide.outside / 10, 0.35, 1);
        desiredVy += ny * pull + formation.vy * clamp(guide.outside / 10, 0.35, 1);
        const inwardAngle = Math.atan2(ny, nx);
        civilian.wanderAngle += angleDelta(civilian.wanderAngle, inwardAngle) * Math.min(1, dt * 8);
      }

      const maxCarrySpeed = Math.max(groupSpeed * 1.35, 95);
      const bAvoid = boundaryAvoidance(civilian.x, civilian.y, desiredVx / (Math.hypot(desiredVx, desiredVy) || 1), desiredVy / (Math.hypot(desiredVx, desiredVy) || 1), civilian.radius, 30);
      desiredVx += bAvoid.x * 40;
      desiredVy += bAvoid.y * 40;
      const desiredSpeed = Math.hypot(desiredVx, desiredVy);
      if (desiredSpeed > maxCarrySpeed) {
        desiredVx = (desiredVx / desiredSpeed) * maxCarrySpeed;
        desiredVy = (desiredVy / desiredSpeed) * maxCarrySpeed;
      }

      const response = 1 - Math.exp(-12 * dt);
      civilian.vx += (desiredVx - civilian.vx) * response;
      civilian.vy += (desiredVy - civilian.vy) * response;
      civilian.x += civilian.vx * dt;
      civilian.y += civilian.vy * dt;
      resolveObstacleCollisions(civilian);
      resolveSafeZoneWalls(civilian);
      civilian.x = clamp(civilian.x, civilian.radius + 6, width - civilian.radius - 6);
      civilian.y = clamp(civilian.y, civilian.radius + 6, height - civilian.radius - 6);
    }
    separateCivilians(carriedCivilians);

    // Drop off carried civilians when the squad reaches the interior of a safe zone.
    for (let i = carriedCivilians.length - 1; i >= 0; i -= 1) {
      const civilian = carriedCivilians[i];
      const zone = safeZoneAt(formation.x, formation.y);
      if (!zone) continue;
      if (zone.civilians.length >= zone.capacity) continue;
      civilian.carried = false;
      civilian.state = "recruiting";
      civilian.zoneId = zone.id;
      civilian.recruitTimer = 0;
      zone.civilians.push(civilian);
      carriedCivilians.splice(i, 1);
      showEvent("Civilian delivered to safe zone");
    }
  }

  function updateCivilians(dt) {
    // Free civilians wander independently and flee nearby zombies.
    for (const civilian of civilians) {
      if (!civilian.alive) continue;
      civilian.prevX = civilian.x;
      civilian.prevY = civilian.y;
      civilian.beingAttacked = false;
      for (const zombie of zombies) {
        if (!zombie.alive) continue;
        const d = Math.hypot(civilian.x - zombie.x, civilian.y - zombie.y);
        if (d <= zombie.radius + civilian.radius + 2) {
          civilian.beingAttacked = true;
          break;
        }
      }

      civilian.biteFlash = Math.max(0, (civilian.biteFlash || 0) - dt);

      if (civilian.beingAttacked) {
        civilian.vx = 0;
        civilian.vy = 0;
        civilian.x = clamp(civilian.x, civilian.radius + 6, width - civilian.radius - 6);
        civilian.y = clamp(civilian.y, civilian.radius + 6, height - civilian.radius - 6);
        continue;
      }

      const wander = stepCivilianWander(civilian, dt, 26 * CONFIG.civilians.speed);
      const response = 1 - Math.exp(-6 * dt);
      civilian.vx += (wander.vx - civilian.vx) * response;
      civilian.vy += (wander.vy - civilian.vy) * response;
      const speed = Math.hypot(civilian.vx, civilian.vy);
      if (speed > 70) {
        civilian.vx = (civilian.vx / speed) * 70;
        civilian.vy = (civilian.vy / speed) * 70;
      }
      civilian.x += civilian.vx * dt;
      civilian.y += civilian.vy * dt;
      resolveObstacleCollisions(civilian);
      resolveSafeZoneWalls(civilian);
      civilian.x = clamp(civilian.x, civilian.radius + 6, width - civilian.radius - 6);
      civilian.y = clamp(civilian.y, civilian.radius + 6, height - civilian.radius - 6);
    }
    separateCivilians(civilians);

    // Rescue free civilians when they enter the group's pickup / perimeter radius.
    const pickupRadius = Math.max(CONFIG.civilians.rescueRadius, formation.radius + 8);
    for (let i = civilians.length - 1; i >= 0; i -= 1) {
      const civilian = civilians[i];
      if (!civilian.alive) {
        civilians.splice(i, 1);
        continue;
      }

      const distance = Math.hypot(civilian.x - formation.x, civilian.y - formation.y);
      if (distance <= pickupRadius) {
        civilian.carried = true;
        civilian.state = "following";
        carriedCivilians.push(civilian);
        civilians.splice(i, 1);
        showEvent("Civilian rescued");
      }
    }

    updateCarriedCivilians(dt);
  }

  function safeZoneAt(x, y) {
    for (const zone of safeZones) {
      const hw = (zone.w || zone.radius * 2) / 2;
      const hh = (zone.h || zone.radius * 2) / 2;
      if (Math.abs(x - zone.x) <= hw && Math.abs(y - zone.y) <= hh) return zone;
    }
    return null;
  }

  function biteCivilian(civilian, zombie) {
    if (!civilian.alive) return;
    civilian.infections += zombie.biteDamage || 1;
    civilian.biteFlash = 0.34;
    game.shake = Math.max(game.shake, 3.2);
    game.flash = Math.max(game.flash, 0.22);
    game.flashColor = "255, 107, 95";

    burstParticles(
      (civilian.x + zombie.x) / 2,
      (civilian.y + zombie.y) / 2,
      "bite"
    );

    rings.push({
      x: civilian.x,
      y: civilian.y,
      radius: civilian.radius + 3,
      maxRadius: civilian.radius + 25,
      life: 0.3,
      maxLife: 0.3,
      color: "255, 107, 95",
      width: 2,
    });

    if (civilian.infections >= civilian.bitesToInfect) {
      // Transform into a zombie at the same position.
      civilian.alive = false;
      const cz = safeZones.find((z) => z.civilians.includes(civilian));
      if (cz) cz.civilians = cz.civilians.filter((c) => c !== civilian);
      carriedCivilians = carriedCivilians.filter((c) => c !== civilian);
      civilians = civilians.filter((c) => c !== civilian);

      const converted = createZombie(civilian.x, civilian.y, true);
      zombies.push(converted);

      rings.push({
        x: civilian.x,
        y: civilian.y,
        radius: civilian.radius + 6,
        maxRadius: 70,
        life: 0.72,
        maxLife: 0.72,
        color: "98, 235, 131",
        width: 2.4,
      });

      burstParticles(civilian.x, civilian.y, "infection");
      texts.push({
        x: civilian.x,
        y: civilian.y - civilian.radius - 24,
        text: "INFECTED",
        life: 1.05,
        maxLife: 1.05,
        color: "98, 235, 131",
        size: 9,
      });

      showEvent("Civilian infected — turned zombie");
    } else {
      texts.push({
        x: civilian.x,
        y: civilian.y - civilian.radius - 18,
        text: `${civilian.infections} / ${civilian.bitesToInfect}`,
        life: 0.9,
        maxLife: 0.9,
        color: "255, 177, 91",
        size: 9,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Safe zones
  // ---------------------------------------------------------------------------
  function safeZoneSegmentAtAngle(zone, angle) {
    if (!zone.segments || zone.segments.length === 0) return null;
    const count = zone.segments.length;
    const step = TAU / count;
    const rel = ((angle - (-Math.PI / 2 - step / 2)) % TAU + TAU) % TAU;
    const idx = clamp(Math.floor(rel / step), 0, count - 1);
    return zone.segments[idx];
  }

  function syncSafeZoneSegments(zone) {
    if (!zone.segments || zone.segments.length === 0) return;
    if (zone.wallHealth !== zone.lastSyncedWallHealth) {
      const ratio = clamp(zone.wallHealth / Math.max(1, zone.maxWallHealth), 0, 1);
      for (const seg of zone.segments) {
        seg.health = seg.maxHealth * ratio;
      }
      zone.lastSyncedWallHealth = zone.wallHealth;
    }
  }

  function updateSafeZones(dt) {
    for (const zone of safeZones) {
      syncSafeZoneSegments(zone);

      // Smoothly open the entrance gate when friendly units pass near the top gate.
      const gateX = zone.x;
      const gateY = zone.y - (zone.h || zone.radius * 2) / 2;
      let friendlyNearGate = Math.hypot(formation.x - gateX, formation.y - gateY) <= 78;
      if (!friendlyNearGate) {
        for (const s of survivors) {
          if (Math.hypot(s.x - gateX, s.y - gateY) <= 52) {
            friendlyNearGate = true;
            break;
          }
        }
      }
      if (!friendlyNearGate) {
        for (const c of carriedCivilians) {
          if (Math.hypot(c.x - gateX, c.y - gateY) <= 52) {
            friendlyNearGate = true;
            break;
          }
        }
      }
      if (!friendlyNearGate) {
        for (const u of deployingUnits) {
          if (Math.hypot(u.x - gateX, u.y - gateY) <= 52) {
            friendlyNearGate = true;
            break;
          }
        }
      }
      if (!friendlyNearGate) {
        for (const u of returningUnits) {
          if (Math.hypot(u.x - gateX, u.y - gateY) <= 52) {
            friendlyNearGate = true;
            break;
          }
        }
      }
      if (!friendlyNearGate) {
        for (const u of evacuatingDefenders) {
          if (Math.hypot(u.x - gateX, u.y - gateY) <= 52) {
            friendlyNearGate = true;
            break;
          }
        }
      }
      const targetGate = zone.wallHealth <= 0 || friendlyNearGate ? 1 : 0;
      zone.gateOpen = lerp(zone.gateOpen || 0, targetGate, 1 - Math.exp(-9 * dt));

      // Recruiting civilians wander inside the safe zone until their timer completes.
      for (let i = zone.civilians.length - 1; i >= 0; i -= 1) {
        const civilian = zone.civilians[i];
        if (!civilian.alive) {
          zone.civilians.splice(i, 1);
          continue;
        }
        civilian.prevX = civilian.x;
        civilian.prevY = civilian.y;
        civilian.biteFlash = Math.max(0, (civilian.biteFlash || 0) - dt);

        const wander = stepCivilianWander(civilian, dt, 22 * CONFIG.civilians.speed);
        let desiredVx = wander.vx;
        let desiredVy = wander.vy;

        const dx = civilian.x - zone.x;
        const dy = civilian.y - zone.y;
        const dist = Math.hypot(dx, dy);
        const limit = Math.max(20, zone.radius - civilian.radius - 14);
        if (dist > limit && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const pull = (dist - limit) * 6 + 24;
          desiredVx -= nx * pull;
          desiredVy -= ny * pull;
          const inwardAngle = Math.atan2(-ny, -nx);
          civilian.wanderAngle += angleDelta(civilian.wanderAngle, inwardAngle) * Math.min(1, dt * 5);
        }

        const response = 1 - Math.exp(-6 * dt);
        civilian.vx += (desiredVx - civilian.vx) * response;
        civilian.vy += (desiredVy - civilian.vy) * response;
        civilian.x += civilian.vx * dt;
        civilian.y += civilian.vy * dt;
        resolveObstacleCollisions(civilian);
        resolveSafeZoneWalls(civilian);

        civilian.recruitTimer += dt;
        if (civilian.recruitTimer >= CONFIG.safeZones.recruitmentSeconds) {
          zone.civilians.splice(i, 1);
          const isSniper = Math.random() < (CONFIG.survivors.sniperChance || 0);
          const worker = {
            id: idSequence++,
            x: civilian.x,
            y: civilian.y,
            vx: 0,
            vy: 0,
            radius: CONFIG.survivors.radius,
            wanderTimer: randomRange(0.6, 2.2),
            wanderAngle: Math.random() * TAU,
            zoneId: zone.id,
            state: "wandering",
            infections: 0,
            bitesToInfect: 2,
            alive: true,
            assignedMine: null,
            assignedGas: null,
            steelCarried: 0,
            gasCarried: 0,
            mineTimer: 0,
            gasTimer: 0,
            tripCooldown: 0,
            targetX: zone.x,
            targetY: zone.y,
          };
          zone.workers.push(worker);
          showEvent("Civilian recruited as Worker");
        }
      }
      separateCivilians(zone.civilians);

      // Wall breach: evacuate all defenders.
      if (zone.wallHealth <= 0 && zone.defenders.length > 0) {
        for (const defender of zone.defenders) {
          defender.state = "evacuating";
          evacuatingDefenders.push(defender);
        }
        zone.defenders = [];
        showEvent("Safe zone breached — defenders evacuating");
      }
    }
  }


  function layoutDefenders(zone) {
    const count = zone.defenders.length;
    if (count === 0) return;
    const radius = zone.radius * 0.55;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * TAU - Math.PI / 2;
      zone.defenders[i].x = zone.x + Math.cos(angle) * radius;
      zone.defenders[i].y = zone.y + Math.sin(angle) * radius;
      zone.defenders[i].targetX = zone.defenders[i].x;
      zone.defenders[i].targetY = zone.defenders[i].y;
    }
  }

  function updateWorkers(dt) {
    for (const zone of safeZones) {
      const mines = steelMines.filter((m) => m.zoneId === zone.id);
      for (const worker of zone.workers) {
        if (!worker.alive) continue;
        worker.prevX = worker.x;
        worker.prevY = worker.y;

        if (worker.state === "wandering") {
          if (!worker.wanderTimer) worker.wanderTimer = randomRange(0.6, 2.2);
          if (typeof worker.wanderAngle !== "number") worker.wanderAngle = Math.random() * TAU;
          worker.wanderTimer -= dt;
          if (worker.wanderTimer <= 0) {
            worker.wanderTimer = randomRange(0.6, 2.2);
            worker.wanderAngle += randomRange(-1.2, 1.2);
          }
          const speed = 24;
          let vx = Math.cos(worker.wanderAngle) * speed;
          let vy = Math.sin(worker.wanderAngle) * speed;
          const dx = worker.x - zone.x;
          const dy = worker.y - zone.y;
          const dist = Math.hypot(dx, dy);
          const limit = zone.radius * 0.7;
          if (dist > limit) {
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            vx -= nx * speed * 1.6;
            vy -= ny * speed * 1.6;
          }
          worker.x += vx * dt;
          worker.y += vy * dt;
          worker.x = clamp(worker.x, zone.x - limit, zone.x + limit);
          worker.y = clamp(worker.y, zone.y - limit, zone.y + limit);
          resolveObstacleCollisions(worker);
          resolveSafeZoneWalls(worker);

          // Occasionally start a collection trip (only if workers are enabled).
          if (!workersEnabled) {
            worker.tripCooldown = randomRange(4, 8);
          } else {
            if (worker.tripCooldown == null) worker.tripCooldown = randomRange(4, 8);
            worker.tripCooldown -= dt;
            const gasStns = gasStations.filter((g) => g.zoneId === zone.id);
            const autoMode = workerAssignment === null;
            const avail = autoMode
              ? mines.map((m) => ({ b: m, type: "steel" })).concat(gasStns.map((g) => ({ b: g, type: "gas" })))
              : (workerAssignment === "steel"
                  ? mines.map((m) => ({ b: m, type: "steel" }))
                  : gasStns.map((g) => ({ b: g, type: "gas" })));
            if (worker.tripCooldown <= 0 && avail.length > 0) {
            worker.tripCooldown = randomRange(8, 14);
            const counts = avail.map((entry) => zone.workers.filter((w) => {
              const aid = entry.type === "steel" ? w.assignedMine : w.assignedGas;
              return aid === entry.b.id && w.state !== "wandering";
            }).length);
            let bestIdx = 0;
            for (let i = 1; i < avail.length; i += 1) {
              if (counts[i] < counts[bestIdx]) bestIdx = i;
            }
            const chosen = avail[bestIdx];
            if (chosen.type === "gas") {
              worker.assignedGas = chosen.b.id;
              worker.state = "toGas";
              worker.gasCarried = 0;
              worker.gasTimer = 0;
            } else {
              worker.assignedMine = chosen.b.id;
              worker.state = "toMine";
              worker.steelCarried = 0;
              worker.mineTimer = 0;
            }
            }
          }
        } else if (worker.state === "toMine") {
          const mine = steelMines.find((m) => m.id === worker.assignedMine);
          if (!mine) {
            worker.state = "wandering";
            worker.assignedMine = null;
            return;
          }
          const dx = mine.x - worker.x;
          const dy = mine.y - worker.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 12) {
            worker.state = "mining";
            worker.mineTimer = 5;
            worker.x = mine.x;
            worker.y = mine.y;
          } else {
            const speed = CONFIG.survivors.group.speed * 0.6;
            const step = Math.min(dist, speed * dt);
            worker.x += (dx / (dist || 1)) * step;
            worker.y += (dy / (dist || 1)) * step;
            resolveObstacleCollisions(worker);
            resolveSafeZoneWalls(worker);
          }
        } else if (worker.state === "mining") {
          worker.mineTimer -= dt;
          if (worker.mineTimer <= 0) {
            worker.steelCarried += 1;
            if (worker.steelCarried >= 2) {
              worker.state = "returning";
            } else {
              worker.mineTimer = 5;
            }
          }
        } else if (worker.state === "returning") {
          const furnace = furnaces.find((f) => f.zoneId === zone.id);
          const targetX = furnace ? furnace.x : zone.x;
          const targetY = furnace ? furnace.y : zone.y;
          const dx = targetX - worker.x;
          const dy = targetY - worker.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 18) {
            if (furnace) {
              steel += worker.steelCarried;
            }
            worker.steelCarried = 0;
            worker.state = "wandering";
            worker.assignedMine = null;
            worker.tripCooldown = 0;
          } else {
            const speed = CONFIG.survivors.group.speed * 0.6;
            const step = Math.min(dist, speed * dt);
            worker.x += (dx / (dist || 1)) * step;
            worker.y += (dy / (dist || 1)) * step;
            resolveObstacleCollisions(worker);
            resolveSafeZoneWalls(worker);
          }
        } else if (worker.state === "toGas") {
          const station = gasStations.find((g) => g.id === worker.assignedGas);
          if (!station) {
            worker.state = "wandering";
            worker.assignedGas = null;
            return;
          }
          const dx = station.x - worker.x;
          const dy = station.y - worker.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 12) {
            worker.state = "gassing";
            worker.gasTimer = 5;
            worker.x = station.x;
            worker.y = station.y;
          } else {
            const speed = CONFIG.survivors.group.speed * 0.6;
            const step = Math.min(dist, speed * dt);
            worker.x += (dx / (dist || 1)) * step;
            worker.y += (dy / (dist || 1)) * step;
            resolveObstacleCollisions(worker);
            resolveSafeZoneWalls(worker);
          }
        } else if (worker.state === "gassing") {
          worker.gasTimer -= dt;
          if (worker.gasTimer <= 0) {
            worker.gasCarried += 1;
            if (worker.gasCarried >= 2) {
              worker.state = "returningGas";
            } else {
              worker.gasTimer = 5;
            }
          }
        } else if (worker.state === "returningGas") {
          const furnace = furnaces.find((f) => f.zoneId === zone.id);
          const targetX = furnace ? furnace.x : zone.x;
          const targetY = furnace ? furnace.y : zone.y;
          const dx = targetX - worker.x;
          const dy = targetY - worker.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 18) {
            if (furnace) {
              gas += worker.gasCarried;
            }
            worker.gasCarried = 0;
            worker.state = "wandering";
            worker.assignedGas = null;
            worker.tripCooldown = 0;
          } else {
            const speed = CONFIG.survivors.group.speed * 0.6;
            const step = Math.min(dist, speed * dt);
            worker.x += (dx / (dist || 1)) * step;
            worker.y += (dy / (dist || 1)) * step;
            resolveObstacleCollisions(worker);
            resolveSafeZoneWalls(worker);
          }
        }
      }
    }
  }

  function placeLamp() {
    const cost = CONFIG.lamps.steelCost;
    if (steel < cost) {
      showEvent("Not enough Steel for a Lamp");
      return;
    }
    steel -= cost;
    lamps.push({
      id: idSequence++,
      x: formation.x,
      y: formation.y,
      radius: CONFIG.lamps.radius,
      gasTimer: CONFIG.lamps.gasInterval,
      active: true,
    });
    showEvent("Lamp placed");
    syncHud(true);
  }

  function updateLamps(dt) {
    const interval = CONFIG.lamps.gasInterval;
    for (const lamp of lamps) {
      if (gas <= 0) {
        lamp.active = false;
        lamp.gasTimer = interval;
        continue;
      }
      lamp.active = true;
      if (typeof lamp.gasTimer !== "number") lamp.gasTimer = interval;
      lamp.gasTimer -= dt;
      if (lamp.gasTimer <= 0) {
        if (gas >= 1) {
          gas -= 1;
          lamp.gasTimer += interval;
          syncHud(true);
        } else {
          lamp.active = false;
          lamp.gasTimer = interval;
        }
      }
    }
  }

  function updateRecruitments(dt) {
    for (const zone of safeZones) {
      const rs = zone.recruitmentStation;
      if (!rs) continue;
      for (let i = zone.recruitments.length - 1; i >= 0; i -= 1) {
        const rec = zone.recruitments[i];
        const worker = rec.worker;
        if (!worker || !worker.alive) {
          // Worker died; refund? Just remove.
          zone.recruitments.splice(i, 1);
          continue;
        }

        if (rec.timer > 0 && worker.state === "recruiting") {
          // Walk to station.
          const dx = rs.x - worker.x;
          const dy = rs.y - worker.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 8) {
            // Disappear inside.
            worker.state = "inside";
            worker.x = rs.x;
            worker.y = rs.y;
            worker.visible = false;
          } else {
            const speed = CONFIG.survivors.group.speed * 0.6;
            const step = Math.min(dist, speed * dt);
            worker.x += (dx / (dist || 1)) * step;
            worker.y += (dy / (dist || 1)) * step;
            resolveObstacleCollisions(worker);
            resolveSafeZoneWalls(worker);
          }
        } else if (worker.state === "inside") {
          rec.timer -= dt;
          if (rec.timer <= 0) {
            // Emerge as soldier/sniper/flamethrower.
            const soldier = createSoldier(rs.x, rs.y, rec.type);
            soldier.state = "defending";
            soldier.zoneId = zone.id;
            zone.defenders.push(soldier);
            // Remove worker.
            zone.workers = (zone.workers || []).filter((w) => w !== worker);
            worker.alive = false;
            zone.recruitments.splice(i, 1);
            const label = rec.type === "sniper" ? "Sniper" : rec.type === "flamethrower" ? "Flamethrower" : "Soldier";
            showEvent(`Recruited ${label}`);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Safe zone defenders
  // ---------------------------------------------------------------------------
  function updateDefenders(dt) {
    const aimSpeed = CONFIG.survivors.weapon.aimSpeed || 4;
    const aimTolerance = CONFIG.survivors.weapon.aimTolerance || 0.14;
    const aimEase = 1 - Math.exp(-aimSpeed * dt);

    for (const zone of safeZones) {
      if (zone.wallHealth <= 0) continue; // evacuating handled separately
      for (const defender of zone.defenders) {
        const isSniper = defender.type === "sniper";
        const isFlame = defender.type === "flamethrower";
        const sniperCfg = isSniper ? CONFIG.survivors.sniper : null;
        const shotInterval = isSniper ? 1 / sniperCfg.shotsPerSecond : isFlame ? 0.1 : fireInterval();
        const firingRange = survivorFiringRange(defender);
        const rangeSquared = firingRange * firingRange;

        defender.prevX = defender.x;
        defender.prevY = defender.y;
        defender.flash = Math.max(0, defender.flash - dt);
        defender.biteFlash = Math.max(0, defender.biteFlash - dt);
        defender.fireCooldown = Math.min(defender.fireCooldown, shotInterval);
        defender.fireCooldown -= dt;

        // Wander inside the safe zone like a normal soldier, staying inside
        // the circle.
        if (!defender.wanderTimer) defender.wanderTimer = randomRange(0.6, 2.0);
        if (!defender.wanderAngle) defender.wanderAngle = Math.random() * TAU;
        defender.wanderTimer -= dt;
        if (defender.wanderTimer <= 0) {
          defender.wanderTimer = randomRange(0.6, 2.0);
          defender.wanderAngle += randomRange(-1.2, 1.2);
        }
        const speed = 30;
        let vx = Math.cos(defender.wanderAngle) * speed;
        let vy = Math.sin(defender.wanderAngle) * speed;
        // Keep inside zone.
        const dx = defender.x - zone.x;
        const dy = defender.y - zone.y;
        const dist = Math.hypot(dx, dy);
        const limit = zone.radius * 0.72;
        if (dist > limit) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          vx -= nx * speed * 1.6;
          vy -= ny * speed * 1.6;
        }
        defender.x += vx * dt;
        defender.y += vy * dt;
        defender.x = clamp(defender.x, zone.x - limit, zone.x + limit);
        defender.y = clamp(defender.y, zone.y - limit, zone.y + limit);

        if (defender.reloading) {
          defender.reloadTimer -= dt;
          if (defender.reloadTimer <= 0) {
            defender.reloading = false;
            defender.reloadTimer = 0;
            defender.shotsInMagazine = weaponMagazineSize();
          }
        }

        // Keep tracking the current target instead of snapping to a new one.
        let target = null;
        if (defender.aimTargetId != null) {
          const current = zombies.find((z) => z.id === defender.aimTargetId && z.alive);
          if (current) {
            const d2 = (current.x - defender.x) ** 2 + (current.y - defender.y) ** 2;
            if (d2 <= rangeSquared * 1.2) target = current;
          }
        }
        if (!target) {
          target = findNearestZombieDefender(defender, rangeSquared);
          defender.aimTargetId = target ? target.id : null;
        }
        if (target) {
          const desiredAngle = Math.atan2(target.y - defender.y, target.x - defender.x);
          defender.aimAngle += angleDelta(defender.aimAngle, desiredAngle) * aimEase;
        }
        if (isFlame) {
          if (target) applyFlamethrowerDamage(defender, dt);
          else defender.flameActive = false;
          continue;
        }
        if (target && !defender.reloading && defender.fireCooldown <= 0) {
          const aimDiff = Math.abs(
            angleDelta(defender.aimAngle, Math.atan2(target.y - defender.y, target.x - defender.x))
          );
          if (aimDiff <= aimTolerance) {
            shoot(defender, target);
            defender.fireCooldown = shotInterval;
          }
        }
      }
    }
  }

  function updateEvacuatingDefenders(dt) {
    for (let i = evacuatingDefenders.length - 1; i >= 0; i -= 1) {
      const def = evacuatingDefenders[i];
      def.prevX = def.x;
      def.prevY = def.y;
      const dx = formation.x - def.x;
      const dy = formation.y - def.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 18) {
        const soldier = createSoldier(def.x, def.y);
        soldier.id = def.id;
        survivors.push(soldier);
        evacuatingDefenders.splice(i, 1);
        showEvent("Defender joined squad");
        continue;
      }
      const speed = CONFIG.survivors.group.speed;
      const step = Math.min(dist, speed * dt);
      def.x += (dx / (dist || 1)) * step;
      def.y += (dy / (dist || 1)) * step;
      resolveSafeZoneWalls(def);
      // Vulnerable to zombies: handled by zombie targeting (defenders not in survivors, but zombies target? Need include evacuating defenders in nearestZombieTarget)
    }
  }

  function findNearestZombie(survivor, rangeSquared) {
    let target = null;
    let nearestDistance = rangeSquared;
    for (const zombie of zombies) {
      if (!zombie.alive) continue;
      const dx = zombie.x - survivor.x;
      const dy = zombie.y - survivor.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistance) {
        nearestDistance = distanceSquared;
        target = zombie;
      }
    }
    return target;
  }

  function findNearestZombieDefender(defender, rangeSquared) {
    let target = null;
    let nearest = rangeSquared;
    for (const zombie of zombies) {
      if (!zombie.alive) continue;
      const d2 = (zombie.x - defender.x) ** 2 + (zombie.y - defender.y) ** 2;
      if (d2 < nearest) {
        nearest = d2;
        target = zombie;
      }
    }
    return target;
  }

  // ---------------------------------------------------------------------------
  // Evacuation zones
  // ---------------------------------------------------------------------------
  function resolveEvacZoneWalls(entity, zone) {
    if (!zone || zone.completed || !entity) return;
    const hw = (zone.w || zone.radius * 2) / 2;
    const hh = (zone.h || zone.radius * 2) / 2;
    const dist = Math.hypot(entity.x - zone.x, entity.y - zone.y);
    if (dist > Math.max(hw, hh) + (entity.radius || 8) + 60) return;
    const gateHalfW = Math.max(12, (zone.w || 40) * 0.18);
    const gateX = zone.x;
    const gateY = zone.y - hh;
    const isOpen = !zone.locked;
    const nearGate = Math.abs(entity.x - gateX) <= gateHalfW + (entity.radius || 8) && Math.abs(entity.y - gateY) <= (entity.radius || 8) + 8;
    if (isOpen && nearGate) return;

    const localX = entity.x - zone.x;
    const localY = entity.y - zone.y;
    // Inside: push away from nearest wall to stay inside.
    if (Math.abs(localX) < hw && Math.abs(localY) < hh) {
      const distLeft = localX + hw;
      const distRight = hw - localX;
      const distTop = localY + hh;
      const distBottom = hh - localY;
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);
      const band = (entity.radius || 8) + 4;
      if (minDist < band) {
        if (minDist === distLeft) entity.x = zone.x - hw + band;
        else if (minDist === distRight) entity.x = zone.x + hw - band;
        else if (minDist === distTop) entity.y = zone.y - hh + band;
        else entity.y = zone.y + hh - band;
      }
    } else {
      // Outside: keep outside.
      if (Math.abs(localX) > hw) entity.x = zone.x + Math.sign(localX) * (hw + (entity.radius || 8) - 1);
      if (Math.abs(localY) > hh) entity.y = zone.y + Math.sign(localY) * (hh + (entity.radius || 8) - 1);
    }
  }

  function updateEvacuationZones(dt) {
    for (const zone of evacuationZones) {
      if (zone.completed) continue;
      // Unlock when the Blue Dot group touches the unlocking point.
      if (zone.locked) {
        let touched = Math.hypot(formation.x - zone.unlockX, formation.y - zone.unlockY) <= CONFIG.evacuation.unlockRadius;
        if (!touched) {
          for (const sq of squads) {
            const f = sq.formation;
            if (Math.hypot(f.x - zone.unlockX, f.y - zone.unlockY) <= CONFIG.evacuation.unlockRadius) { touched = true; break; }
          }
        }
        if (touched) {
          zone.locked = false;
          showEvent("Civilian spot unlocked");
        }
      }
      if (zone.locked) continue;

      const hw = (zone.w || zone.radius * 2) / 2;
      const hh = (zone.h || zone.radius * 2) / 2;

      // Move civilians out through the entrance.
      for (let i = zone.civilians.length - 1; i >= 0; i -= 1) {
        const civ = zone.civilians[i];
        if (!civ.alive) {
          zone.civilians.splice(i, 1);
          zone.civiliansRemaining = Math.max(0, zone.civiliansRemaining - 1);
          continue;
        }
        civ.prevX = civ.x;
        civ.prevY = civ.y;
        const dx = zone.entranceX - civ.x;
        const dy = zone.entranceY - civ.y;
        const d = Math.hypot(dx, dy) || 1;
        const speed = 55;
        civ.vx = (civ.vx || 0) + ((dx / d) * speed - (civ.vx || 0)) * (1 - Math.exp(-6 * dt));
        civ.vy = (civ.vy || 0) + ((dy / d) * speed - (civ.vy || 0)) * (1 - Math.exp(-6 * dt));
        civ.x += civ.vx * dt;
        civ.y += civ.vy * dt;
        resolveEvacZoneWalls(civ, zone);
        resolveObstacleCollisions(civ);
        civ.x = clamp(civ.x, civ.radius + 6, width - civ.radius - 6);
        civ.y = clamp(civ.y, civ.radius + 6, height - civ.radius - 6);

        // Once outside the enclosure, convert to a free civilian.
        if (Math.abs(civ.x - zone.x) > hw + 6 || Math.abs(civ.y - zone.y) > hh + 6) {
          civ.carried = false;
          civilians.push(civ);
          zone.civilians.splice(i, 1);
          zone.civiliansRemaining = Math.max(0, zone.civiliansRemaining - 1);
        }
      }

      if (zone.civilians.length === 0 && zone.civiliansRemaining <= 0) {
        zone.completed = true;
        showEvent("Civilian spot cleared");
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Deploying / returning units
  // ---------------------------------------------------------------------------
  function deploySoldiersFromZone(zoneId, requestedCount) {
    const zone = safeZones.find((z) => z.id === Number(zoneId));
    if (!zone || zone.defenders.length === 0) return 0;

    const count = clamp(
      Math.floor(Number(requestedCount) || 1),
      1,
      zone.defenders.length
    );

    const deployed = zone.defenders.splice(0, count);
    for (const soldier of deployed) {
      soldier.state = "deploying";
      soldier.zoneId = zone.id;
      deployingUnits.push(soldier);
    }

    const remaining = zone.defenders.length;
    deploySelectionByZone.set(
      zone.id,
      remaining > 0 ? clamp(deploySelectionByZone.get(zone.id) || 1, 1, remaining) : 1
    );

    showEvent(
      `Deploying ${deployed.length} soldier${deployed.length === 1 ? "" : "s"} to squad`
    );
    syncDeployUI(true);
    return deployed.length;
  }

  function updateDeployingUnits(dt) {
    const shotInterval = fireInterval();
    const rangeSquared = CONFIG.survivors.firingRange * CONFIG.survivors.firingRange;
    const aimSpeed = CONFIG.survivors.weapon.aimSpeed || 4;
    const aimTolerance = CONFIG.survivors.weapon.aimTolerance || 0.14;
    const aimEase = 1 - Math.exp(-aimSpeed * dt);
    const travelSpeed = Math.max(CONFIG.survivors.group.speed * 1.18, 155);

    for (let i = deployingUnits.length - 1; i >= 0; i -= 1) {
      const unit = deployingUnits[i];
      if (!unit.alive) {
        deployingUnits.splice(i, 1);
        continue;
      }
      unit.prevX = unit.x;
      unit.prevY = unit.y;

      unit.flash = Math.max(0, (unit.flash || 0) - dt);
      unit.biteFlash = Math.max(0, (unit.biteFlash || 0) - dt);
      unit.fireCooldown = Math.min(unit.fireCooldown || 0, shotInterval) - dt;

      if (unit.reloading) {
        unit.reloadTimer -= dt;
        if (unit.reloadTimer <= 0) {
          unit.reloading = false;
          unit.reloadTimer = 0;
          unit.reloadDuration = weaponReloadSeconds();
          unit.shotsInMagazine = weaponMagazineSize();
        }
      }

      // Dynamically navigate toward the player's latest group position.
      const dx = formation.x - unit.x;
      const dy = formation.y - unit.y;
      const dist = Math.hypot(dx, dy);
      const joinRadius = Math.max(24, formation.radius + 6);

      if (dist <= joinRadius) {
        unit.state = "active";
        unit.targetX = unit.x;
        unit.targetY = unit.y;
        survivors.push(unit);
        deployingUnits.splice(i, 1);
        applyFormationTargets();
        showEvent("Deployed soldier joined formation");
        syncDeployUI(true);
        continue;
      }

      let dirX = dx / (dist || 1);
      let dirY = dy / (dist || 1);
      const avoid = obstacleAvoidance(unit.x, unit.y, dirX, dirY, unit.radius, 32);
      dirX += avoid.x * 0.7;
      dirY += avoid.y * 0.7;
      const dirLen = Math.hypot(dirX, dirY) || 1;
      const desiredVx = (dirX / dirLen) * travelSpeed;
      const desiredVy = (dirY / dirLen) * travelSpeed;

      const moveResponse = 1 - Math.exp(-10 * dt);
      unit.vx = (unit.vx || 0) + (desiredVx - (unit.vx || 0)) * moveResponse;
      unit.vy = (unit.vy || 0) + (desiredVy - (unit.vy || 0)) * moveResponse;
      unit.x += unit.vx * dt;
      unit.y += unit.vy * dt;
      resolveObstacleCollisions(unit);
      resolveSafeZoneWalls(unit);
      unit.x = clamp(unit.x, unit.radius + 6, width - unit.radius - 6);
      unit.y = clamp(unit.y, unit.radius + 6, height - unit.radius - 6);

      // Shoot at nearby zombies while travelling across the map.
      let target = null;
      if (unit.aimTargetId != null) {
        const current = zombies.find((z) => z.id === unit.aimTargetId && z.alive);
        if (current) {
          const d2 = (current.x - unit.x) ** 2 + (current.y - unit.y) ** 2;
          if (d2 <= rangeSquared * 1.2) target = current;
        }
      }
      if (!target) {
        target = findNearestZombie(unit, rangeSquared);
        unit.aimTargetId = target ? target.id : null;
      }
      if (target) {
        const desiredAngle = Math.atan2(target.y - unit.y, target.x - unit.x);
        unit.aimAngle += angleDelta(unit.aimAngle, desiredAngle) * aimEase;
      } else {
        const moveAngle = Math.atan2(unit.vy, unit.vx);
        unit.aimAngle += angleDelta(unit.aimAngle, moveAngle) * aimEase;
      }

      if (target && !unit.reloading && unit.fireCooldown <= 0) {
        const aimDiff = Math.abs(
          angleDelta(unit.aimAngle, Math.atan2(target.y - unit.y, target.x - unit.x))
        );
        if (aimDiff <= aimTolerance) {
          shoot(unit, target);
          unit.fireCooldown = shotInterval;
        }
      }
    }
  }

  function updateReturningUnits(dt) {
    for (let i = returningUnits.length - 1; i >= 0; i -= 1) {
      const unit = returningUnits[i];
      unit.prevX = unit.x;
      unit.prevY = unit.y;
      const zone = safeZones.find((z) => z.id === unit.zoneId);
      if (!zone) {
        returningUnits.splice(i, 1);
        continue;
      }
      const dx = zone.x - unit.x;
      const dy = zone.y - unit.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 18) {
        unit.state = "defending";
        zone.defenders.push(unit);
        layoutDefenders(zone);
        returningUnits.splice(i, 1);
        showEvent("Soldier returned to defend safe zone");
        continue;
      }
      const speed = CONFIG.survivors.group.speed;
      const step = Math.min(dist, speed * dt);
      unit.x += (dx / (dist || 1)) * step;
      unit.y += (dy / (dist || 1)) * step;
      resolveSafeZoneWalls(unit);
    }
  }

  function createSoldier(x, y, type) {
    const isSniper = type === "sniper";
    const isFlame = type === "flamethrower";
    const cfg = isSniper ? CONFIG.survivors.sniper : isFlame ? CONFIG.survivors.flamethrower : null;
    return {
      id: idSequence++,
      type: isSniper ? "sniper" : isFlame ? "flamethrower" : "soldier",
      x,
      y,
      targetX: x,
      targetY: y,
      radius: cfg ? cfg.radius : CONFIG.survivors.radius,
      infections: 0,
      fireCooldown: Math.random() * (isSniper ? 1 / cfg.shotsPerSecond : isFlame ? 0.1 : fireInterval()),
      shotsInMagazine: weaponMagazineSize(),
      reloading: false,
      reloadTimer: 0,
      reloadDuration: weaponReloadSeconds(),
      aimAngle: 0,
      vx: 0,
      vy: 0,
      flash: 0,
      biteFlash: 0,
      flameActive: false,
      formationGain: randomRange(0.88, 1.14),
      seed: Math.random() * TAU,
      alive: true,
      state: "active",
    };
  }

  function generateObstacles() {
    obstacles = [];

    const rockCount = CONFIG.obstacles.rockCount;
    const sideMargin = 46;
    const topMargin = 90;
    const bottomMargin = 34;
    let attempts = 0;

    while (obstacles.length < rockCount && attempts < 400) {
      attempts += 1;

      const radius = randomRange(
        CONFIG.obstacles.rockRadiusMin,
        CONFIG.obstacles.rockRadiusMax
      );
      const x = randomRange(
        sideMargin + radius,
        Math.max(sideMargin + radius, width - sideMargin - radius)
      );
      const y = randomRange(
        topMargin + radius,
        Math.max(topMargin + radius, height - bottomMargin - radius)
      );

      // Keep the opening position clear so the squad always deploys cleanly.
      if (
        Math.hypot(x - formation.x, y - formation.y) <
        formation.radius + radius + 46
      ) {
        continue;
      }

      // Keep rocks away from safe zones, just like trees.
      let nearSafeZone = false;
      for (const zone of safeZones) {
        const zoneR = Math.max(zone.w || 0, zone.h || 0) / 2 + 60;
        if (Math.hypot(x - zone.x, y - zone.y) < zoneR + 40) {
          nearSafeZone = true;
          break;
        }
      }
      if (nearSafeZone) continue;

      // Keep rocks away from civilian spots (evacuation zones).
      let nearEvacZone = false;
      for (const zone of evacuationZones) {
        const zoneR = Math.max(zone.w || 0, zone.h || 0) / 2 + 60;
        if (Math.hypot(x - zone.x, y - zone.y) < zoneR + 40) {
          nearEvacZone = true;
          break;
        }
      }
      if (nearEvacZone) continue;

      const crowded = obstacles.some((obstacle) => {
        const gap = Math.hypot(x - obstacle.x, y - obstacle.y);
        return gap < radius + obstacle.radius + 46;
      });
      if (crowded) continue;

      obstacles.push({
        kind: "rock",
        x,
        y,
        radius,
        alive: true,
        seed: Math.random() * TAU,
      });
    }
  }

  function updateSurvivorMovement(survivor, dt) {
    survivor.prevX = survivor.x;
    survivor.prevY = survivor.y;
    const group = CONFIG.survivors.group;
    const gain = group.formationEase * survivor.formationGain;
    const dx = survivor.targetX - survivor.x;
    const dy = survivor.targetY - survivor.y;

    // Feed the group's own velocity forward so dots don't trail behind while
    // the squad is moving, then add a positional spring toward their slot.
    let desiredX = formation.vx + dx * gain;
    let desiredY = formation.vy + dy * gain;

    const steerLength = Math.hypot(desiredX, desiredY);
    if (steerLength > 0.001) {
      const avoid = obstacleAvoidance(
        survivor.x,
        survivor.y,
        desiredX / steerLength,
        desiredY / steerLength,
        survivor.radius,
        42
      );
      desiredX += avoid.x * group.speed * 0.9;
      desiredY += avoid.y * group.speed * 0.9;

      const bAvoid = boundaryAvoidance(survivor.x, survivor.y, desiredX / (Math.hypot(desiredX, desiredY) || 1), desiredY / (Math.hypot(desiredX, desiredY) || 1), survivor.radius, 40);
      desiredX += bAvoid.x * group.speed * 0.6;
      desiredY += bAvoid.y * group.speed * 0.6;
    }

    // Cap catch-up speed so switching formations glides instead of snapping.
    const maxSpeed = Math.max(group.speed * 1.75, 120);
    const desiredSpeed = Math.hypot(desiredX, desiredY);
    if (desiredSpeed > maxSpeed) {
      desiredX = (desiredX / desiredSpeed) * maxSpeed;
      desiredY = (desiredY / desiredSpeed) * maxSpeed;
    }

    const response = 1 - Math.exp(-group.formationEase * 1.5 * dt);
    survivor.vx += (desiredX - survivor.vx) * response;
    survivor.vy += (desiredY - survivor.vy) * response;
    survivor.x += survivor.vx * dt;
    survivor.y += survivor.vy * dt;
    resolveObstacleCollisions(survivor);
    resolveSafeZoneWalls(survivor);

    survivor.x = clamp(survivor.x, survivor.radius + 6, width - survivor.radius - 6);
    survivor.y = clamp(survivor.y, survivor.radius + 6, height - survivor.radius - 6);
  }

  function boundaryAvoidance(x, y, dirX, dirY, radius, lookAhead) {
    let steerX = 0;
    let steerY = 0;
    const margin = radius + lookAhead;

    if (x < margin) {
      const proximity = 1 - x / margin;
      steerX += proximity * 2.5;
    }
    if (x > width - margin) {
      const proximity = 1 - (width - x) / margin;
      steerX -= proximity * 2.5;
    }
    if (y < margin) {
      const proximity = 1 - y / margin;
      steerY += proximity * 2.5;
    }
    if (y > height - margin) {
      const proximity = 1 - (height - y) / margin;
      steerY -= proximity * 2.5;
    }

    // Dampen movement into the boundary.
    if (x < margin && dirX < 0) steerX += -dirX * 0.8;
    if (x > width - margin && dirX > 0) steerX -= dirX * 0.8;
    if (y < margin && dirY < 0) steerY += -dirY * 0.8;
    if (y > height - margin && dirY > 0) steerY -= dirY * 0.8;

    return { x: steerX, y: steerY };
  }

  function obstacleAvoidance(x, y, dirX, dirY, radius, lookAhead) {
    let steerX = 0;
    let steerY = 0;

    for (const obstacle of obstacles) {
      if (!obstacle.alive) continue;

      const dx = obstacle.x - x;
      const dy = obstacle.y - y;
      const distance = Math.hypot(dx, dy);
      const limit = obstacle.radius + radius + lookAhead;
      if (distance <= 0.001 || distance > limit) continue;

      const forward = (dx / distance) * dirX + (dy / distance) * dirY;
      if (forward <= 0.05) continue;

      const proximity = 1 - distance / limit;
      const cross = dirX * (dy / distance) - dirY * (dx / distance);
      const side = cross >= 0 ? -1 : 1;
      const strength = proximity * (1.3 + forward * 1.6);

      steerX += -dirY * side * strength * 1.35 - (dx / distance) * strength * 0.55;
      steerY += dirX * side * strength * 1.35 - (dy / distance) * strength * 0.55;
    }

    // Trees avoidance.
    for (const tree of trees) {
      const dx = tree.x - x;
      const dy = tree.y - y;
      const distance = Math.hypot(dx, dy);
      const limit = tree.trunkRadius + radius + lookAhead;
      if (distance <= 0.001 || distance > limit) continue;
      const forward = (dx / distance) * dirX + (dy / distance) * dirY;
      if (forward <= 0.05) continue;
      const proximity = 1 - distance / limit;
      const cross = dirX * (dy / distance) - dirY * (dx / distance);
      const side = cross >= 0 ? -1 : 1;
      const strength = proximity * (0.9 + forward * 1.2);
      steerX += -dirY * side * strength - (dx / distance) * strength * 0.45;
      steerY += dirX * side * strength - (dy / distance) * strength * 0.45;
    }

    // Build objects (walls, trees) avoidance.
    for (const obj of buildObjects) {
      if (obj.type !== "wall" && obj.type !== "tree") continue;
      const cx = obj.x;
      const cy = obj.y;
      const dx = cx - x;
      const dy = cy - y;
      const distance = Math.hypot(dx, dy);
      const objRadius = obj.type === "tree"
        ? Math.max(4, Math.min(obj.w, obj.h) * 0.12)
        : Math.max(obj.w, obj.h) / 2;
      const limit = objRadius + radius + lookAhead;
      if (distance <= 0.001 || distance > limit) continue;
      const forward = (dx / distance) * dirX + (dy / distance) * dirY;
      if (forward <= 0.05) continue;
      const proximity = 1 - distance / limit;
      const cross = dirX * (dy / distance) - dirY * (dx / distance);
      const side = cross >= 0 ? -1 : 1;
      const strength = proximity * (0.9 + forward * 1.2);
      steerX += -dirY * side * strength - (dx / distance) * strength * 0.45;
      steerY += dirX * side * strength - (dy / distance) * strength * 0.45;
    }

    return { x: steerX, y: steerY };
  }

  function resolveObstacleCollisions(entity) {
    for (const obstacle of obstacles) {
      if (!obstacle.alive) continue;

      const dx = entity.x - obstacle.x;
      const dy = entity.y - obstacle.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = obstacle.radius + entity.radius;
      if (distance >= minDistance) continue;

      if (distance < 0.001) {
        entity.x += minDistance;
        continue;
      }

      const push = minDistance - distance;
      entity.x += (dx / distance) * push;
      entity.y += (dy / distance) * push;
    }

    // Trees are solid obstacles.
    for (const tree of trees) {
      const dx = entity.x - tree.x;
      const dy = entity.y - tree.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = tree.trunkRadius + entity.radius;
      if (distance >= minDistance) continue;
      if (distance < 0.001) {
        entity.x += minDistance;
        continue;
      }
      const push = minDistance - distance;
      entity.x += (dx / distance) * push;
      entity.y += (dy / distance) * push;
    }

    // Build objects: walls are solid rectangles; trees only have a solid trunk.
    for (const obj of buildObjects) {
      if (obj.type === "tree") {
        const trunk = Math.max(4, Math.min(obj.w, obj.h) * 0.12);
        const dx = entity.x - obj.x;
        const dy = entity.y - obj.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = trunk + entity.radius;
        if (distance >= minDistance) continue;
        if (distance < 0.001) {
          entity.x += minDistance;
          continue;
        }
        const push = minDistance - distance;
        entity.x += (dx / distance) * push;
        entity.y += (dy / distance) * push;
        continue;
      }
      if (obj.type !== "wall") continue;
      const halfW = obj.w / 2;
      const halfH = obj.h / 2;
      const closestX = clamp(entity.x, obj.x - halfW, obj.x + halfW);
      const closestY = clamp(entity.y, obj.y - halfH, obj.y + halfH);
      const dx = entity.x - closestX;
      const dy = entity.y - closestY;
      const dist = Math.hypot(dx, dy);
      const minDist = entity.radius;
      if (dist >= minDist || dist < 0.001) continue;
      const push = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      entity.x += nx * push;
      entity.y += ny * push;
    }
  }

  function resolveSafeZoneWalls(entity) {
    if (!entity || typeof entity.x !== "number") return;
    // Blue soldiers, workers, and civilians can walk through safe-zone walls freely.
    if (entity.formationGain !== undefined) return;
    if (entity.assignedMine !== undefined) return;
    if (entity.infections !== undefined) return;
    for (const zone of safeZones) {
      if (zone.wallHealth <= 0) continue;
      const dx = entity.x - zone.x;
      const dy = entity.y - zone.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.001) continue;

      const angle = Math.atan2(dy, dx);
      const gateAngle = -Math.PI / 2;
      const angleDiff = Math.abs(angleDelta(angle, gateAngle));
      const gateHalfWidth = 0.4;
      const isOpen = (zone.gateOpen || 0) > 0.35;
      if (angleDiff < gateHalfWidth && isOpen) continue;

      const wallR = zone.radius;
      const band = (entity.radius || 8) + 8;

      const prevD = Math.hypot((entity.prevX || entity.x) - zone.x, (entity.prevY || entity.y) - zone.y);

      if (!(angleDiff < gateHalfWidth && isOpen)) {
        const wasInside = prevD < wallR;
        const isInside = d < wallR;

        if (wasInside !== isInside) {
          if (wasInside) {
            const targetD = wallR - band;
            const scale = targetD / d;
            entity.x = zone.x + dx * scale;
            entity.y = zone.y + dy * scale;
          } else {
            const targetD = wallR + band;
            const scale = targetD / d;
            entity.x = zone.x + dx * scale;
            entity.y = zone.y + dy * scale;
          }
        } else if (Math.abs(d - wallR) < band) {
          const targetD = d < wallR ? wallR - band : wallR + band;
          const scale = targetD / d;
          entity.x = zone.x + dx * scale;
          entity.y = zone.y + dy * scale;

          const tangentialDir = angleDelta(angle, gateAngle) >= 0 ? 1 : -1;
          const tangentX = -Math.sin(angle) * tangentialDir;
          const tangentY = Math.cos(angle) * tangentialDir;
          entity.x += tangentX * 6;
          entity.y += tangentY * 6;
        }
      }
    }
  }

  function resolveSafeZoneWallCollisions(zombie) {
    for (const zone of safeZones) {
      if (zone.wallHealth <= 0) continue;
      const dx = zombie.x - zone.x;
      const dy = zombie.y - zone.y;
      const dist = Math.hypot(dx, dy);
      const minDist = zone.radius + zombie.radius + 5;
      if (dist >= minDist || dist < 0.001) continue;

      const angle = Math.atan2(dy, dx);
      const gateAngle = -Math.PI / 2;
      const angleDiff = Math.abs(angleDelta(angle, gateAngle));
      const gateHalfWidth = 0.4;
      const isOpen = (zone.gateOpen || 0) > 0.35;
      if (angleDiff < gateHalfWidth && isOpen) continue;

      zombie.x = zone.x + (dx / dist) * minDist;
      zombie.y = zone.y + (dy / dist) * minDist;
    }
  }

  function resolveEvacZoneWallsAll(entity) {
    for (const zone of evacuationZones) {
      resolveEvacZoneWalls(entity, zone);
    }
  }

  function activateZombie(zombie, sourceX, sourceY) {
    if (!zombie || !zombie.alive || zombie.activated) return;
    const activation = CONFIG.zombies.activation;
    const chainRadiusSquared = activation.chainRadius * activation.chainRadius;
    const queue = [zombie];

    zombie.activated = true;
    zombie.investigateX = sourceX;
    zombie.investigateY = sourceY;
    zombie.investigateTimer = activation.investigateTimeout;
    zombie.isBiting = false;
    zombie.biteTargetId = null;
    zombie.deactivateTimer = 0;
    zombie.lastTargetX = null;
    zombie.lastTargetY = null;

    // Breadth-first chain reaction: every zombie woken this way wakes its own
    // sleeping neighbours within chainRadius, until the wave runs out.
    while (queue.length > 0) {
      const current = queue.pop();
      for (let i = 0; i < zombies.length; i += 1) {
        const other = zombies[i];
        if (other === current || other.activated || !other.alive) continue;
        const dx = other.x - current.x;
        const dy = other.y - current.y;
        if (dx * dx + dy * dy > chainRadiusSquared) continue;
        other.activated = true;
        other.investigateX = sourceX;
        other.investigateY = sourceY;
        other.investigateTimer = activation.investigateTimeout;
        other.isBiting = false;
        other.biteTargetId = null;
        other.deactivateTimer = 0;
        other.lastTargetX = null;
        other.lastTargetY = null;
        queue.push(other);
      }
    }
  }

  function activateZombiesNear(x, y, radius, sourceX = x, sourceY = y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const radiusSquared = radius * radius;
    const alerted = [];
    for (let i = 0; i < zombies.length; i += 1) {
      const zombie = zombies[i];
      if (!zombie.alive || zombie.activated) continue;
      const dx = zombie.x - x;
      const dy = zombie.y - y;
      if (dx * dx + dy * dy <= radiusSquared) alerted.push(zombie);
    }
    for (let i = 0; i < alerted.length; i += 1) {
      activateZombie(alerted[i], sourceX, sourceY);
    }
  }

  // A zombie that runs out of valid targets goes back to sleep and resumes
  // random wandering. It can be woken again by any activation source later.
  function deactivateZombie(zombie) {
    zombie.activated = false;
    zombie.investigateX = null;
    zombie.investigateY = null;
    zombie.investigateTimer = 0;
    zombie.isBiting = false;
    zombie.biteTargetId = null;
    zombie.deactivateTimer = 0;
    zombie.lastTargetX = null;
    zombie.lastTargetY = null;
    zombie.wanderTimer = randomRange(0.8, 2.6);
    zombie.wanderAngle = Math.random() * TAU;
    zombie.wanderStuckTimer = 0;
  }

  function stepZombieToward(zombie, targetX, targetY, dt, stopDistance, speedFactor) {
    const dx = targetX - zombie.x;
    const dy = targetY - zombie.y;
    const distance = Math.hypot(dx, dy);
    const speed = CONFIG.zombies.speed * zombie.speedScale * speedFactor;
    const moveDistance = Math.min(speed * dt, Math.max(0, distance - stopDistance));
    if (moveDistance <= 0) return;

    const wobble = Math.sin(visualTime * 2.4 + zombie.seed) * 0.12;
    const moveAngle = Math.atan2(dy, dx) + wobble;
    let dirX = Math.cos(moveAngle);
    let dirY = Math.sin(moveAngle);
    const avoid = obstacleAvoidance(zombie.x, zombie.y, dirX, dirY, zombie.radius, 42);
    dirX += avoid.x;
    dirY += avoid.y;
    const dirLength = Math.hypot(dirX, dirY) || 1;
    const finalAngle = Math.atan2(dirY / dirLength, dirX / dirLength);

    zombie.x += Math.cos(finalAngle) * moveDistance;
    zombie.y += Math.sin(finalAngle) * moveDistance;
    resolveObstacleCollisions(zombie);
    resolveSafeZoneWallCollisions(zombie);
    resolveEvacZoneWallsAll(zombie);
    zombie.angle = finalAngle;
  }

  function wanderInactiveZombie(zombie, dt) {
    if (!zombie.wanderTimer) zombie.wanderTimer = randomRange(0.6, 1.8);
    if (typeof zombie.wanderAngle !== "number") zombie.wanderAngle = Math.random() * TAU;
    zombie.wanderTimer -= dt;
    if (zombie.wanderTimer <= 0) {
      zombie.wanderTimer = randomRange(0.6, 1.8);
      zombie.wanderAngle += randomRange(-1.4, 1.4);
    }

    zombie.isBiting = false;
    zombie.biteTargetId = null;

    // Steer back toward the playfield. Without this, inactive zombies can drift
    // far off the map and appear to have stopped wandering.
    let dirX = Math.cos(zombie.wanderAngle);
    let dirY = Math.sin(zombie.wanderAngle);
    const steer = boundaryAvoidance(zombie.x, zombie.y, dirX, dirY, zombie.radius, 90);
    dirX += steer.x;
    dirY += steer.y;
    const dirLength = Math.hypot(dirX, dirY) || 1;

    const wanderDistance = 120;
    const targetX = zombie.x + (dirX / dirLength) * wanderDistance;
    const targetY = zombie.y + (dirY / dirLength) * wanderDistance;
    const beforeX = zombie.x;
    const beforeY = zombie.y;
    stepZombieToward(
      zombie,
      targetX,
      targetY,
      dt,
      0,
      CONFIG.zombies.activation.wanderSpeedFactor
    );

    // If a rock, wall, or the map edge pins the zombie, turn instead of
    // pushing against it forever.
    const moved = Math.hypot(zombie.x - beforeX, zombie.y - beforeY);
    zombie.wanderStuckTimer = moved < 0.3 ? (zombie.wanderStuckTimer || 0) + dt : 0;
    if (zombie.wanderStuckTimer > 0.5) {
      zombie.wanderStuckTimer = 0;
      zombie.wanderAngle = Math.random() * TAU;
      zombie.wanderTimer = randomRange(0.6, 1.8);
    }
  }

  // Spatial hash used only while some zombies are still asleep. It keeps
  // civilian detection cheap even with large hordes and many civilians.
  function buildCivilianDetectionIndex() {
    const cellSize = Math.max(1, CONFIG.zombies.activation.civilianDetectionRadius);
    const grid = new Map();
    const add = (civilian) => {
      if (!civilian || !civilian.alive) return;
      const key =
        Math.floor(civilian.x / cellSize) + ":" + Math.floor(civilian.y / cellSize);
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(civilian);
    };

    for (let i = 0; i < civilians.length; i += 1) add(civilians[i]);
    for (let i = 0; i < carriedCivilians.length; i += 1) add(carriedCivilians[i]);
    for (let i = 0; i < squads.length; i += 1) {
      const carried = squads[i].carriedCivilians || [];
      for (let j = 0; j < carried.length; j += 1) add(carried[j]);
    }
    for (let i = 0; i < safeZones.length; i += 1) {
      const zone = safeZones[i];
      if (zone.wallHealth > 0) continue;
      for (let j = 0; j < zone.civilians.length; j += 1) add(zone.civilians[j]);
    }
    // Civilians sheltering in locked civilian spots are also detectable.
    for (let i = 0; i < evacuationZones.length; i += 1) {
      const zone = evacuationZones[i];
      if (!zone.locked || !zone.civilians) continue;
      for (let j = 0; j < zone.civilians.length; j += 1) add(zone.civilians[j]);
    }

    return { grid, cellSize };
  }

  function findDetectedCivilian(zombie, index) {
    const radius = CONFIG.zombies.activation.civilianDetectionRadius;
    const radiusSquared = radius * radius;
    const cellX = Math.floor(zombie.x / index.cellSize);
    const cellY = Math.floor(zombie.y / index.cellSize);
    let best = null;
    let bestDistanceSquared = radiusSquared;

    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const bucket = index.grid.get(`${cellX + offsetX}:${cellY + offsetY}`);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const civilian = bucket[i];
          if (!civilian.alive) continue;
          const dx = civilian.x - zombie.x;
          const dy = civilian.y - zombie.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared < bestDistanceSquared) {
            bestDistanceSquared = distanceSquared;
            best = civilian;
          }
        }
      }
    }

    return best;
  }

  function updateZombies(dt) {
    const biteInterval = biteIntervalSeconds ? biteIntervalSeconds() : 0.6;
    const activation = CONFIG.zombies.activation;
    let civilianIndex = null;
    for (let i = 0; i < zombies.length; i += 1) {
      const zombie = zombies[i];
      if (!zombie.alive) continue;

      zombie.age = (zombie.age || 0) + dt;
      zombie.burnTimer = Math.max(0, (zombie.burnTimer || 0) - dt);
      zombie.radius = Math.min(
        CONFIG.zombies.radius * zombie.sizeScale,
        zombie.radius + dt * 20
      );

      // Sleeping zombies only wander until they see a civilian, hear a
      // gunshot, or are woken by a nearby kill/chain reaction.
      if (!zombie.activated) {
        if (!civilianIndex) civilianIndex = buildCivilianDetectionIndex();
        const detectedCivilian = findDetectedCivilian(zombie, civilianIndex);
        if (detectedCivilian) {
          activateZombie(
            zombie,
            detectedCivilian.x,
            detectedCivilian.y
          );
        } else {
          wanderInactiveZombie(zombie, dt);
          continue;
        }
      }

      const target = nearestZombieTarget(zombie);

      // A target inside its detection radius refreshes the wake timer and is
      // remembered, so a zombie can keep closing if the target slips away.
      if (target) {
        zombie.deactivateTimer = activation.deactivationDelay;
        zombie.lastTargetX = target.x;
        zombie.lastTargetY = target.y;
      }

      // Freshly woken zombies run to the gunshot/kill that woke them, unless a
      // living target is already close enough to engage.
      if (zombie.investigateX != null) {
        const investigateDistance = Math.hypot(
          zombie.investigateX - zombie.x,
          zombie.investigateY - zombie.y
        );
        const targetDistance = target
          ? Math.hypot(target.x - zombie.x, target.y - zombie.y)
          : Infinity;
        if (typeof zombie.investigateTimer !== "number") {
          zombie.investigateTimer = activation.investigateTimeout;
        }
        zombie.investigateTimer = Math.max(0, zombie.investigateTimer - dt);
        if (
          zombie.investigateTimer <= 0 ||
          investigateDistance <= activation.investigateReachRadius ||
          targetDistance <= activation.engageRadius
        ) {
          zombie.investigateX = null;
          zombie.investigateY = null;
        } else {
          zombie.isBiting = false;
          zombie.biteTargetId = null;
          stepZombieToward(
            zombie,
            zombie.investigateX,
            zombie.investigateY,
            dt,
            0,
            1
          );
          continue;
        }
      }

      if (!target) {
        // No valid target left. Wait out the grace timer while walking to the
        // last known position, then return to inactive wandering. This delay
        // keeps targets near the detection edge from causing rapid flapping.
        zombie.isBiting = false;
        zombie.biteTargetId = null;
        zombie.deactivateTimer = Math.max(0, (zombie.deactivateTimer || 0) - dt);
        if (zombie.deactivateTimer <= 0) {
          deactivateZombie(zombie);
          continue;
        }
        if (zombie.lastTargetX != null && zombie.lastTargetY != null) {
          const lastDistance = Math.hypot(
            zombie.lastTargetX - zombie.x,
            zombie.lastTargetY - zombie.y
          );
          if (lastDistance > 6) {
            stepZombieToward(
              zombie,
              zombie.lastTargetX,
              zombie.lastTargetY,
              dt,
              0,
              1
            );
          }
        }
        continue;
      }

      const dx = target.x - zombie.x;
      const dy = target.y - zombie.y;
      const distance = Math.hypot(dx, dy);
      const contactDistance = zombie.radius + target.radius + 1.5;

      if (distance <= contactDistance) {
        zombie.isBiting = true;
        zombie.angle = Math.atan2(dy, dx);

        if (zombie.biteTargetId !== target.id) {
          zombie.biteTargetId = target.id;
          zombie.biteTimer = biteInterval;
        }

        zombie.biteTimer -= dt;
        if (zombie.biteTimer <= 0) {
          biteZombieTarget(target, zombie);
          zombie.biteTimer += biteInterval;
          if (target.kind === "survivor" && !target.entity.alive) {
            zombie.isBiting = false;
            zombie.biteTargetId = null;
          } else if (target.kind === "civilian" && !target.entity.alive) {
            zombie.isBiting = false;
            zombie.biteTargetId = null;
          } else if (target.kind === "worker" && !target.entity.alive) {
            zombie.isBiting = false;
            zombie.biteTargetId = null;
          } else if (target.kind === "wall" && target.entity.wallHealth <= 0) {
            zombie.isBiting = false;
            zombie.biteTargetId = null;
          } else if (target.kind === "evacwall" && !target.entity.locked) {
            zombie.isBiting = false;
            zombie.biteTargetId = null;
          }
        }
        continue;
      }

      zombie.isBiting = false;
      zombie.biteTargetId = null;

      stepZombieToward(zombie, target.x, target.y, dt, contactDistance, 1);
    }
  }

  function biteSurvivor(survivor, zombie) {
    if (!survivor.alive) return;

    survivor.infections += zombie.biteDamage || 1;
    survivor.biteFlash = 0.34;
    game.shake = Math.max(game.shake, 3.2);
    game.flash = Math.max(game.flash, 0.22);
    game.flashColor = "255, 107, 95";

    burstParticles(
      (survivor.x + zombie.x) / 2,
      (survivor.y + zombie.y) / 2,
      "bite"
    );

    rings.push({
      x: survivor.x,
      y: survivor.y,
      radius: survivor.radius + 3,
      maxRadius: survivor.radius + 25,
      life: 0.3,
      maxLife: 0.3,
      color: "255, 107, 95",
      width: 2,
    });

    if (survivor.infections >= CONFIG.survivors.bitesToInfect) {
      infectSurvivor(survivor);
      return;
    }

    texts.push({
      x: survivor.x,
      y: survivor.y - survivor.radius - 18,
      text: `${survivor.infections} / ${CONFIG.survivors.bitesToInfect}`,
      life: 0.9,
      maxLife: 0.9,
      color: "255, 177, 91",
      size: 9,
    });
  }

  function infectSurvivor(survivor) {
    if (!survivor.alive) return;

    survivor.alive = false;
    survivors = survivors.filter((unit) => unit !== survivor);
    deployingUnits = deployingUnits.filter((unit) => unit !== survivor);
    returningUnits = returningUnits.filter((unit) => unit !== survivor);
    for (const zone of safeZones) {
      zone.defenders = zone.defenders.filter((unit) => unit !== survivor);
    }
    evacuatingDefenders = evacuatingDefenders.filter((unit) => unit !== survivor);
    for (const squad of squads) {
      if (squad.survivors) squad.survivors = squad.survivors.filter((unit) => unit !== survivor);
    }
    game.infected += 1;
    game.shake = Math.max(game.shake, 8);
    game.flash = Math.max(game.flash, 0.68);
    game.flashColor = "98, 235, 131";

    const converted = createZombie(survivor.x, survivor.y, true);
    zombies.push(converted);

    rings.push({
      x: survivor.x,
      y: survivor.y,
      radius: survivor.radius + 6,
      maxRadius: 70,
      life: 0.72,
      maxLife: 0.72,
      color: "98, 235, 131",
      width: 2.4,
    });

    rings.push({
      x: survivor.x,
      y: survivor.y,
      radius: 2,
      maxRadius: 46,
      life: 0.5,
      maxLife: 0.5,
      color: "255, 177, 91",
      width: 1.2,
    });

    burstParticles(survivor.x, survivor.y, "infection");
    texts.push({
      x: survivor.x,
      y: survivor.y - survivor.radius - 24,
      text: "INFECTED",
      life: 1.05,
      maxLife: 1.05,
      color: "98, 235, 131",
      size: 9,
    });

    showEvent(`Survivor ${String(survivor.id).padStart(2, "0")} infected — turned green`);
    syncHud(true);
  }

  // Civilians are only noticed within their own sight radius; every other kind
  // of target uses the gunshot/kill activation range. These are also the radii
  // a zombie checks when deciding whether it still has a reason to stay awake.
  function nearestZombieTarget(zombie) {
    let best = null;
    let bestDist = Infinity;

    const activation = CONFIG.zombies.activation;
    const civilianRange = activation.civilianDetectionRadius;
    const civilianRangeSquared = civilianRange * civilianRange;
    const otherRange = Math.max(activation.gunshotRadius, activation.killRadius);
    const otherRangeSquared = otherRange * otherRange;

    const consider = (kind, entity, x, y, radius) => {
      const d2 = (x - zombie.x) ** 2 + (y - zombie.y) ** 2;
      if (d2 > (kind === "civilian" ? civilianRangeSquared : otherRangeSquared)) return;
      if (d2 < bestDist) {
        bestDist = d2;
        best = { kind, entity, x, y, radius, id: entity.id };
      }
    };

    for (const survivor of survivors) {
      if (!survivor.alive) continue;
      consider("survivor", survivor, survivor.x, survivor.y, survivor.radius);
    }
    for (const squad of squads) {
      for (const survivor of squad.survivors) {
        if (!survivor.alive) continue;
        consider("survivor", survivor, survivor.x, survivor.y, survivor.radius);
      }
    }
    for (const unit of deployingUnits) {
      if (!unit.alive) continue;
      consider("survivor", unit, unit.x, unit.y, unit.radius);
    }
    for (const def of evacuatingDefenders) {
      consider("survivor", def, def.x, def.y, def.radius);
    }
    for (const zone of safeZones) {
      if (zone.wallHealth > 0) continue;
      for (const def of zone.defenders) {
        consider("survivor", def, def.x, def.y, def.radius);
      }
    }
    for (const civ of carriedCivilians) {
      if (!civ.alive) continue;
      consider("civilian", civ, civ.x, civ.y, civ.radius);
    }
    for (const civ of civilians) {
      if (!civ.alive) continue;
      consider("civilian", civ, civ.x, civ.y, civ.radius);
    }
    for (const zone of safeZones) {
      if (zone.wallHealth <= 0) {
        for (const civ of zone.civilians) {
          if (!civ.alive) continue;
          consider("civilian", civ, civ.x, civ.y, civ.radius);
        }
        for (const w of (zone.workers || [])) {
          if (!w.alive) continue;
          consider("worker", w, w.x, w.y, w.radius);
        }
      } else {
        // Workers outside the safe zone are vulnerable even with intact walls.
        for (const w of (zone.workers || [])) {
          if (!w.alive) continue;
          const d = Math.hypot(w.x - zone.x, w.y - zone.y);
          if (d > zone.radius) {
            consider("worker", w, w.x, w.y, w.radius);
          }
        }
        if (zone.civilians.length > 0 || zone.defenders.length > 0 || (zone.workers || []).length > 0) {
          consider("wall", zone, zone.x, zone.y, zone.radius);
        }
      }
    }

    // Locked civilian spots are attackable: zombies bite their perimeter until
    // the spot unlocks and the civilians inside can escape.
    for (const zone of evacuationZones) {
      if (zone.completed || !zone.locked || !zone.civilians || zone.civilians.length === 0) continue;
      const hw = (zone.w || zone.radius * 2) / 2;
      const hh = (zone.h || zone.radius * 2) / 2;
      consider("evacwall", zone, zone.x, zone.y, Math.max(hw, hh) + 18);
    }

    return best;
  }

  function biteZombieTarget(target, zombie) {
    if (target.kind === "survivor") {
      biteSurvivor(target.entity, zombie);
    } else if (target.kind === "civilian") {
      biteCivilian(target.entity, zombie);
    } else if (target.kind === "evacwall") {
      const zone = target.entity;
      zone.bites = (zone.bites || 0) + 1;
      if (zone.bites >= (CONFIG.evacuation.bitesToUnlock || 400)) {
        zone.locked = false;
        showEvent("Civilian spot unlocked");
      }
    } else if (target.kind === "worker") {
      const worker = target.entity;
      worker.alive = false;
      for (const zone of safeZones) {
        zone.workers = (zone.workers || []).filter((w) => w !== worker);
      }
      showEvent("Worker killed");
    } else if (target.kind === "wall") {
      const zone = target.entity;
      zone.wallHealth = Math.max(0, zone.wallHealth - 10 * (zombie.biteDamage || 1));
      zone.lastSyncedWallHealth = zone.wallHealth;
      if (zone.segments && zone.segments.length > 0) {
        const hitAngle = Math.atan2(zombie.y - zone.y, zombie.x - zone.x);
        const seg = safeZoneSegmentAtAngle(zone, hitAngle);
        if (seg) {
          seg.health = Math.max(0, seg.health - 28);
        }
        const overallRatio = clamp(zone.wallHealth / Math.max(1, zone.maxWallHealth), 0, 1);
        for (const s of zone.segments) {
          s.health = Math.min(s.health, s.maxHealth * overallRatio);
        }
      }
      if (zone.wallHealth <= 0) {
        zone.wallHealth = 0;
        if (zone.segments) {
          for (const s of zone.segments) s.health = 0;
        }
        showEvent("Safe zone wall breached");
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Spawning / difficulty
  // ---------------------------------------------------------------------------
  function nextZombieVariant() {
    zombieSpawnCount += 1;
    const n = zombieSpawnCount;
    const cfg = CONFIG.zombies;
    if (n >= cfg.bigFirst && (n - cfg.bigFirst) % cfg.bigEvery === 0) return "big";
    if (n % cfg.fastEvery === 0) return "fast";
    return "normal";
  }

  function spawnNaturalZombie(x, y) {
    const zombie = createZombie(x, y, false, nextZombieVariant());
    zombies.push(zombie);
    return zombie;
  }

  function spawnWave(count) {
    const side = 0; // zombies only come from the upper side
    const margin = CONFIG.zombies.spawnMargin;

    for (let i = 0; i < count; i += 1) {
      let x;
      let y;

      if (side === 0) {
        x = randomRange(-width * 0.06, width * 1.06);
        y = -margin - randomRange(0, 42);
      } else if (side === 1) {
        x = width + margin + randomRange(0, 42);
        y = randomRange(-height * 0.06, height * 1.06);
      } else if (side === 2) {
        x = randomRange(-width * 0.06, width * 1.06);
        y = height + margin + randomRange(0, 42);
      } else {
        x = -margin - randomRange(0, 42);
        y = randomRange(-height * 0.06, height * 1.06);
      }

      spawnNaturalZombie(x, y);
    }
  }

  function createZombie(x, y, converted, variant = "normal") {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = width / 2;
      y = height / 2;
    }
    const cfg = CONFIG.zombies;
    const v = (cfg.variants && cfg.variants[variant]) || {
      speedMultiplier: 1,
      damageMultiplier: 1,
      healthMultiplier: 1,
      sizeMultiplier: 1,
    };
    const baseHealth = cfg.health * v.healthMultiplier;
    const baseRadius = converted ? cfg.radius : cfg.radius * 0.35;
    return {
      id: idSequence++,
      x,
      y,
      variant,
      biteDamage: v.damageMultiplier,
      radius: baseRadius * v.sizeMultiplier,
      health: baseHealth,
      maxHealth: baseHealth,
      sizeScale: randomRange(1 - cfg.speedVariance, 1 + cfg.speedVariance) * v.sizeMultiplier,
      speedScale: randomRange(1 - cfg.speedVariance, 1 + cfg.speedVariance) * v.speedMultiplier,
      age: 0,
      seed: Math.random() * TAU,
      angle: Math.random() * TAU,
      biteTimer: biteIntervalSeconds(),
      biteTargetId: null,
      isBiting: false,
      burnTimer: 0,
      converted,
      // Converted zombies enter the world already aggressive; fresh spawns
      // sleep until they hear a gunshot or a nearby kill.
      activated: converted,
      investigateX: null,
      investigateY: null,
      investigateTimer: 0,
      deactivateTimer: 0,
      lastTargetX: null,
      lastTargetY: null,
      wanderTimer: randomRange(0.8, 2.6),
      wanderAngle: Math.random() * TAU,
      wanderStuckTimer: 0,
      alive: true,
    };
  }

  function scatterZombies(count) {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 25) {
      attempts += 1;
      const x = randomRange(60, width - 60);
      const y = randomRange(60, height * 0.35);
      if (Math.hypot(x - formation.x, y - formation.y) < 520) continue;
      spawnNaturalZombie(x, y);
      placed += 1;
    }
  }

  function spawnZombieDirect(x, y) {
    const zombie = createZombie(x, y, false);
    zombie.radius = CONFIG.zombies.radius;
    zombies.push(zombie);
    return zombie;
  }

  function spawnIntervalAt(time) {
    const progress = clamp(time / CONFIG.zombies.spawnRampSeconds, 0, 1);
    return lerp(
      CONFIG.zombies.spawnIntervalStart,
      CONFIG.zombies.spawnIntervalMin,
      progress
    );
  }

  function spawnGroupSizeAt(time) {
    if (time < 10) return 30;
    if (time < 20) return 50;
    return Math.min(200, 50 + Math.floor((time - 20) / 10) * 10);
  }

  function fireInterval() {
    return 1 / Math.max(0.01, CONFIG.survivors.shotsPerSecond);
  }

  function weaponMagazineSize() {
    return Math.max(1, Math.floor(CONFIG.survivors.weapon.magazineSize));
  }

  function weaponReloadSeconds() {
    return Math.max(0.05, CONFIG.survivors.weapon.reloadSeconds);
  }

  function rifleLength(survivor) {
    const base = Math.max(16, survivor.radius * 1.4);
    if (survivor.type === "sniper") {
      return base * (CONFIG.survivors.sniper.barrelLength || 2.2);
    }
    if (survivor.type === "flamethrower") {
      return base * (CONFIG.survivors.flamethrower.barrelLength || 1.7);
    }
    return base;
  }

  function angleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  function biteIntervalSeconds() {
    return 1 / Math.max(0.01, CONFIG.zombies.bitesPerSecond);
  }

  // ---------------------------------------------------------------------------
  // Visual effects
  // ---------------------------------------------------------------------------
  function burstParticles(x, y, kind) {
    let count;
    let colors;
    let speedMin;
    let speedMax;
    let sizeMin;
    let sizeMax;
    let lifeMin;
    let lifeMax;

    if (kind === "infection") {
      count = 30;
      colors = ["98, 235, 131", "180, 255, 196", "255, 177, 91", "64, 184, 96"];
      speedMin = 20;
      speedMax = 150;
      sizeMin = 0.8;
      sizeMax = 3.2;
      lifeMin = 0.4;
      lifeMax = 1.1;
    } else if (kind === "bite") {
      count = 8;
      colors = ["255, 107, 95", "255, 177, 91", "230, 75, 69"];
      speedMin = 18;
      speedMax = 80;
      sizeMin = 0.7;
      sizeMax = 2.2;
      lifeMin = 0.25;
      lifeMax = 0.65;
    } else {
      count = 10;
      colors = ["98, 235, 131", "180, 255, 196", "53, 177, 84"];
      speedMin = 16;
      speedMax = 105;
      sizeMin = 0.65;
      sizeMax = 2.4;
      lifeMin = 0.28;
      lifeMax = 0.72;
    }

    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const speed = randomRange(speedMin, speedMax);
      const life = randomRange(lifeMin, lifeMax);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomRange(sizeMin, sizeMax),
        color: colors[Math.floor(Math.random() * colors.length)],
        life,
        maxLife: life,
        drag: kind === "infection" ? 2.1 : 3.3,
      });
    }
  }

  function updateEffects(dt) {
    for (const beam of beams) {
      beam.life -= dt;
    }
    beams = beams.filter((beam) => beam.life > 0);

    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const damping = Math.max(0, 1 - particle.drag * dt);
      particle.vx *= damping;
      particle.vy *= damping;
    }
    particles = particles.filter((particle) => particle.life > 0);

    for (const ring of rings) {
      ring.life -= dt;
      const progress = 1 - ring.life / ring.maxLife;
      ring.currentRadius = lerp(ring.radius, ring.maxRadius, easeOutCubic(progress));
    }
    rings = rings.filter((ring) => ring.life > 0);

    for (const text of texts) {
      text.life -= dt;
      text.y -= dt * 18;
    }
    texts = texts.filter((text) => text.life > 0);

    game.shake = Math.max(0, game.shake - dt * 22);
    game.flash = Math.max(0, game.flash - dt * 2.8);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = backgroundGradient || "#040a07";
    ctx.fillRect(0, 0, viewW, viewH);
    drawMotes();

    applyWorldTransform();

    const shakeX = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
    const shakeY = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawMap1Geography();
    drawGrid();

    if (mode !== "build") {
      if (survivors.length > 0) {
        drawOutpost();
        drawSurvivorLinks();
      }
    }
    drawObstacles();
    if (mode !== "build") {
      drawSafeZones();
      drawEvacuationZones();
      drawCivilianSpotWalls();
    } else {
      drawSafeZones();
      drawBuildObjects();
    }
    drawZombieSpawners();
    drawSteelMines();
    drawGasStations();
    drawLamps();
    drawFurnaces();
    drawRecruitmentStations();

    // Draw the path being drawn and the active squad's path.
    drawPath(drawnPath, "rgba(95, 185, 255, 0.85)");
    if (activeSquad && activeSquad.path && activeSquad.path.length > 1) {
      drawPath(activeSquad.path, "rgba(98, 235, 131, 0.55)");
    }
    for (const ring of rings) drawRing(ring);
    for (const zombie of zombies) drawZombie(zombie);
    for (const civilian of civilians) drawCivilian(civilian);
    for (const civilian of carriedCivilians) drawCivilian(civilian);
    for (const squad of squads) {
      for (const civilian of squad.carriedCivilians || []) drawCivilian(civilian);
    }
    for (const zone of safeZones) for (const civ of zone.civilians) drawCivilian(civ);
    for (const zone of safeZones) for (const w of (zone.workers || [])) drawWorker(w);
    for (const squad of squads) {
      for (const survivor of squad.survivors) drawSurvivor(survivor);
    }
    for (const survivor of survivors) drawSurvivor(survivor);
    for (const unit of deployingUnits) drawSurvivor(unit);
    for (const unit of returningUnits) drawSurvivor(unit);
    for (const def of evacuatingDefenders) drawSurvivor(def);
    for (const zone of safeZones) for (const def of zone.defenders) drawSurvivor(def);

    drawTreeCanopies();

    drawBeams();
    drawParticles();
    drawFloatingTexts();

    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawFogOverlay();
    drawMapCoordinates();

    drawScreenFlash();
  }

  function drawMap1Geography() {
    if (currentMapId !== "map1") return;
    const S = 72;
    const sq = (v) => v * S;
    const g = MAP1_GEOGRAPHY;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const fillPolygon = (points, color, outline, lineWidth) => {
      ctx.beginPath();
      for (let i = 0; i < points.length; i += 1) {
        const x = sq(points[i][0]);
        const y = sq(points[i][1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    const strokePath = (points, width, color) => {
      ctx.beginPath();
      for (let i = 0; i < points.length; i += 1) {
        const x = sq(points[i][0]);
        const y = sq(points[i][1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.stroke();
    };

    // Farmland.
    const farm = g.farm.rect;
    ctx.fillStyle = g.farm.colors[0];
    ctx.fillRect(sq(farm.x1), sq(farm.y1), sq(farm.x2 - farm.x1), sq(farm.y2 - farm.y1));
    const patch = 15;
    let patchIndex = 0;
    for (let y = farm.y1; y < farm.y2; y += patch) {
      for (let x = farm.x1; x < farm.x2; x += patch) {
        const w = Math.min(patch, farm.x2 - x);
        const h = Math.min(patch, farm.y2 - y);
        ctx.fillStyle = g.farm.colors[patchIndex % g.farm.colors.length];
        ctx.fillRect(sq(x), sq(y), sq(w), sq(h));
        patchIndex += 1;
      }
    }
    ctx.strokeStyle = g.farm.outline;
    ctx.lineWidth = 3;
    ctx.strokeRect(sq(farm.x1), sq(farm.y1), sq(farm.x2 - farm.x1), sq(farm.y2 - farm.y1));

    // Industrial ground.
    const ind = g.industrial.rect;
    ctx.fillStyle = g.industrial.color;
    ctx.fillRect(sq(ind.x1), sq(ind.y1), sq(ind.x2 - ind.x1), sq(ind.y2 - ind.y1));
    ctx.strokeStyle = g.industrial.outline;
    ctx.lineWidth = 3;
    ctx.strokeRect(sq(ind.x1), sq(ind.y1), sq(ind.x2 - ind.x1), sq(ind.y2 - ind.y1));
    ctx.fillStyle = "#2c3133";
    ctx.fillRect(sq(10), sq(95), sq(25), sq(14));
    ctx.fillRect(sq(40), sq(95), sq(28), sq(14));
    ctx.fillRect(sq(10), sq(115), sq(25), sq(12));
    ctx.fillRect(sq(40), sq(115), sq(28), sq(12));
    ctx.fillRect(sq(10), sq(145), sq(25), sq(14));
    ctx.fillRect(sq(40), sq(145), sq(28), sq(14));
    ctx.fillRect(sq(10), sq(166), sq(25), sq(12));
    ctx.fillRect(sq(40), sq(166), sq(28), sq(12));

    // City ground and abstract blocks.
    const city = g.city.rect;
    ctx.fillStyle = g.city.color;
    ctx.fillRect(sq(city.x1), sq(city.y1), sq(city.x2 - city.x1), sq(city.y2 - city.y1));
    ctx.strokeStyle = g.city.outline;
    ctx.lineWidth = 3;
    ctx.strokeRect(sq(city.x1), sq(city.y1), sq(city.x2 - city.x1), sq(city.y2 - city.y1));
    const blockW = 10;
    const blockH = 8;
    const gap = 3;
    for (let y = city.y1 + 4; y + blockH <= city.y2 - 4; y += blockH + gap) {
      for (let x = city.x1 + 4; x + blockW <= city.x2 - 4; x += blockW + gap) {
        ctx.fillStyle = g.city.block;
        ctx.fillRect(sq(x), sq(y), sq(blockW), sq(blockH));
        ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(sq(x), sq(y), sq(blockW), sq(blockH));
      }
    }

    // Forest and village.
    fillPolygon(g.forest.polygon, g.forest.color, g.forest.outline, 4);
    fillPolygon(g.village.polygon, g.village.color, g.village.outline, 4);

    // Reserved future Safe Zone area in the farm centre (visual only).
    const sz = g.safeZoneSpot;
    ctx.fillStyle = "rgba(95, 185, 255, 0.08)";
    ctx.fillRect(sq(sz.x1), sq(sz.y1), sq(sz.x2 - sz.x1), sq(sz.y2 - sz.y1));
    ctx.strokeStyle = "rgba(183, 231, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(sq(sz.x1), sq(sz.y1), sq(sz.x2 - sz.x1), sq(sz.y2 - sz.y1));
    ctx.setLineDash([]);

    // River and stream with lighter banks.
    strokePath(g.stream.points, g.stream.bankWidth, g.stream.bankColor);
    strokePath(g.stream.points, g.stream.width, g.stream.color);

    // Roads on top of the terrain.
    for (const road of g.roads) {
      strokePath(road.points, road.outline, "#3a4042");
      strokePath(road.points, road.width, "#6b7275");
    }

    ctx.restore();
  }

  function drawGrid() {
    const step = 72;
    const view = visibleWorldRect();
    const left = Math.max(0, view.left);
    const right = Math.min(width, view.right);
    const top = Math.max(0, view.top);
    const bottom = Math.min(height, view.bottom);
    const hairline = 1 / camera.zoom;

    ctx.save();
    ctx.lineWidth = hairline;
    ctx.strokeStyle = "rgba(103, 184, 136, 0.036)";
    ctx.beginPath();

    for (let x = Math.ceil(left / step) * step; x <= right; x += step) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = Math.ceil(top / step) * step; y <= bottom; y += step) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(117, 208, 155, 0.085)";
    const dot = 1.5 / camera.zoom;
    for (let x = Math.ceil(left / step) * step; x <= right; x += step) {
      for (let y = Math.ceil(top / step) * step; y <= bottom; y += step) {
        ctx.fillRect(x, y, dot, dot);
      }
    }

    // Edge of the playable world.
    ctx.strokeStyle = "rgba(150, 224, 181, 0.2)";
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeRect(0, 0, width, height);
    ctx.restore();
  }

  function drawMapCoordinates() {
    if (currentMapId !== "map1") return;
    const step = 72;
    const zoom = camera.zoom;
    const screenStep = step * zoom;
    if (screenStep < 6) return;

    const view = visibleWorldRect();

    ctx.save();
    ctx.font = `600 9px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(150, 224, 181, 0.72)";
    ctx.strokeStyle = "rgba(150, 224, 181, 0.32)";
    ctx.lineWidth = 1;

    // Top ruler: X coordinates just above the map's top boundary.
    let stride = 1;
    while (screenStep * stride < 30) stride *= 2;
    const startCol = Math.max(0, Math.floor(Math.max(0, view.left) / step));
    const endCol = Math.min(Math.ceil(width / step), Math.ceil(Math.min(width, view.right) / step));
    for (let col = startCol; col <= endCol; col += 1) {
      const x = col * step;
      if (x < view.left - step || x > view.right + step) continue;
      const top = worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(top.x, top.y - 6);
      ctx.stroke();
      if (col % stride !== 0) continue;
      const p = worldToScreen(x + step / 2, 0);
      const labelY = p.y - 12;
      if (p.x < 10 || p.x > viewW - 10 || labelY < 4 || labelY > viewH - 4) continue;
      ctx.fillText(String(col + 1), p.x, labelY);
    }

    // Left ruler: Y coordinates just left of the map's left boundary.
    let rowStride = 1;
    while (screenStep * rowStride < 26) rowStride *= 2;
    const startRow = Math.max(0, Math.floor(Math.max(0, view.top) / step));
    const endRow = Math.min(Math.ceil(height / step), Math.ceil(Math.min(height, view.bottom) / step));
    for (let row = startRow; row <= endRow; row += 1) {
      const y = row * step;
      if (y < view.top - step || y > view.bottom + step) continue;
      const left = worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(left.x - 6, left.y);
      ctx.stroke();
      if (row % rowStride !== 0) continue;
      const p = worldToScreen(0, y + step / 2);
      const labelX = p.x - 12;
      if (labelX < 4 || labelX > viewW - 4 || p.y < 10 || p.y > viewH - 10) continue;
      ctx.fillText(String(row + 1), labelX, p.y);
    }

    ctx.restore();
  }

  function initMotes() {
    const count = Math.round(clamp((viewW * viewH) / 35000, 22, 62));
    motes = [];
    for (let i = 0; i < count; i += 1) {
      motes.push({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        vx: randomRange(-3.5, 3.5),
        vy: randomRange(-7, -1.2),
        size: randomRange(0.45, 1.6),
        alpha: randomRange(0.05, 0.22),
        color: Math.random() < 0.28 ? "95, 185, 255" : "98, 235, 131",
      });
    }
  }

  function updateMotes(dt) {
    for (const mote of motes) {
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      if (mote.y < -4) {
        mote.y = viewH + 4;
        mote.x = Math.random() * viewW;
      }
      if (mote.x < -4) mote.x = viewW + 4;
      if (mote.x > viewW + 4) mote.x = -4;
    }
  }

  function drawMotes() {
    ctx.save();
    for (const mote of motes) {
      ctx.globalAlpha = mote.alpha;
      ctx.fillStyle = `rgb(${mote.color})`;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawOutpost() {
    const center = arenaCenter();
    const radius = formation.radius + 46;
    const pulse = Math.sin(visualTime * 1.4) * 1.5;

    const glow = ctx.createRadialGradient(
      center.x,
      center.y,
      Math.max(1, radius * 0.08),
      center.x,
      center.y,
      radius * 1.28
    );
    glow.addColorStop(0, "rgba(28, 106, 67, 0.11)");
    glow.addColorStop(0.62, "rgba(20, 70, 46, 0.045)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 1.3, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(center.x, center.y);

    ctx.strokeStyle = "rgba(95, 185, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + pulse, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 36; i += 1) {
      const angle = (i / 36) * TAU;
      const major = i % 6 === 0;
      const inner = radius + pulse + (major ? 5 : 3);
      const outer = radius + pulse + (major ? 11 : 7);
      ctx.strokeStyle = major
        ? "rgba(150, 224, 181, 0.19)"
        : "rgba(150, 224, 181, 0.08)";
      ctx.lineWidth = major ? 1.2 : 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }

    const sweepStart = visualTime * 0.38;
    ctx.strokeStyle = "rgba(95, 185, 255, 0.23)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius + pulse, sweepStart, sweepStart + 0.6);
    ctx.stroke();

    ctx.strokeStyle = "rgba(98, 235, 131, 0.18)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 9, -0.8, 0.45);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(117, 151, 132, 0.36)";
    ctx.font = `600 8px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fillScreenText(
      `OUTPOST // ${formation.style.toUpperCase()}`,
      center.x,
      center.y + radius + 25
    );
    ctx.restore();
  }

  function drawSurvivorLinks() {
    if (survivors.length < 2) return;

    const center = arenaCenter();
    const forwardX = Math.cos(formation.facing);
    const forwardY = Math.sin(formation.facing);
    const rightX = -forwardY;
    const rightY = forwardX;

    let ordered = survivors;
    if (formation.style === "line") {
      ordered = [...survivors].sort(
        (a, b) =>
          (a.x - center.x) * rightX +
          (a.y - center.y) * rightY -
          ((b.x - center.x) * rightX + (b.y - center.y) * rightY)
      );
    }

    ctx.save();
    ctx.strokeStyle = "rgba(95, 185, 255, 0.11)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ordered.forEach((survivor, index) => {
      if (index === 0) ctx.moveTo(survivor.x, survivor.y);
      else ctx.lineTo(survivor.x, survivor.y);
    });
    if (formation.style !== "line" && ordered.length > 2) ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = "rgba(95, 185, 255, 0.2)";
    ctx.beginPath();
    ctx.arc(center.x, center.y, 1.7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawObstacles() {
    for (const obstacle of obstacles) {
      if (!obstacle.alive) continue;
      drawRock(obstacle);
    }
  }

  function drawRock(rock) {
    const { x, y, radius, seed } = rock;
    const points = 9;

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 5, radius * 1.02, radius * 0.9, 0, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < points; i += 1) {
      const angle = (i / points) * TAU;
      const wobble = 1 + Math.sin(seed + i * 1.9) * 0.09 + Math.cos(seed * 1.7 + i * 2.4) * 0.05;
      const px = x + Math.cos(angle) * radius * wobble;
      const py = y + Math.sin(angle) * radius * wobble;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "#1a231e";
    ctx.fill();
    ctx.strokeStyle = "rgba(135, 159, 144, 0.28)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.strokeStyle = "rgba(150, 172, 157, 0.13)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const angle = seed + (i / 4) * TAU;
      const inner = radius * 0.18;
      const outer = radius * (0.68 + Math.sin(seed + i) * 0.1);
      ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    }
    ctx.stroke();

    ctx.restore();
  }

  function drawSafeZones() {
    const wallThickness = 10;

    for (const zone of safeZones) {
      syncSafeZoneSegments(zone);
      ctx.save();

      const hw = (zone.w || zone.radius * 2) / 2;
      const hh = (zone.h || zone.radius * 2) / 2;

      // Subtle interior floor tint.
      ctx.fillStyle = "rgba(95, 185, 255, 0.04)";
      ctx.fillRect(zone.x - hw + wallThickness * 0.5, zone.y - hh + wallThickness * 0.5, zone.w - wallThickness, zone.h - wallThickness);

      // Inner tactical dashed ring (rect).
      ctx.strokeStyle = "rgba(150, 224, 181, 0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.strokeRect(zone.x - hw + wallThickness + 6, zone.y - hh + wallThickness + 6, zone.w - wallThickness * 2 - 12, zone.h - wallThickness * 2 - 12);
      ctx.setLineDash([]);

      const overallRatio = clamp(zone.wallHealth / Math.max(1, zone.maxWallHealth), 0, 1);

      // Draw 4 wall sides.
      const sides = [
        { name: "top", x: zone.x - hw, y: zone.y - hh, w: zone.w, h: wallThickness, gate: true },
        { name: "right", x: zone.x + hw - wallThickness, y: zone.y - hh, w: wallThickness, h: zone.h },
        { name: "bottom", x: zone.x - hw, y: zone.y + hh - wallThickness, w: zone.w, h: wallThickness },
        { name: "left", x: zone.x - hw, y: zone.y - hh, w: wallThickness, h: zone.h },
      ];

      for (let i = 0; i < sides.length; i += 1) {
        const side = sides[i];
        const seg = (zone.segments || [])[i];
        const ratio = seg ? clamp(seg.health / Math.max(1, seg.maxHealth), 0, 1) : overallRatio;

        if (side.gate) {
          drawRectSafeZoneGate(zone, side, ratio, wallThickness);
        } else {
          drawRectSafeZoneWall(zone, side, ratio, wallThickness);
        }
      }

      // Draw pillars at 4 corners.
      const corners = [
        { x: zone.x - hw, y: zone.y - hh },
        { x: zone.x + hw, y: zone.y - hh },
        { x: zone.x + hw, y: zone.y + hh },
        { x: zone.x - hw, y: zone.y + hh },
      ];
      for (const c of corners) {
        ctx.save();
        ctx.fillStyle = "#121915";
        ctx.fillRect(c.x - 4, c.y - 4, 8, 8);
        ctx.fillStyle = overallRatio <= 0 ? "#3c4641" : "#6f8077";
        ctx.fillRect(c.x - 3, c.y - 3, 6, 6);
        ctx.fillStyle = "rgba(220, 236, 228, 0.36)";
        ctx.fillRect(c.x - 1.5, c.y - 1.5, 3, 3);
        ctx.restore();
      }

      // Label.
      ctx.fillStyle = "rgba(183, 231, 255, 0.78)";
      ctx.font = `700 9px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fillScreenText("SAFE ZONE", zone.x, zone.y - hh - 14);
      ctx.font = `600 8px ${MONO}`;
      ctx.fillStyle = "rgba(136, 164, 149, 0.85)";
      fillScreenText(
        `${zone.civilians.length}/${zone.capacity} civ · ${zone.defenders.length} def`,
        zone.x,
        zone.y - hh - 4
      );

      // Recruit progress bars.
      let yy = zone.y + hh + 8;
      for (const civ of zone.civilians) {
        const progress = clamp(civ.recruitTimer / CONFIG.safeZones.recruitmentSeconds, 0, 1);
        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.fillRect(zone.x - 30, yy, 60, 3);
        ctx.fillStyle = "rgba(95, 185, 255, 0.7)";
        ctx.fillRect(zone.x - 30, yy, 60 * progress, 3);
        yy += 6;
      }
      ctx.restore();
    }
  }

  function drawRectSafeZoneWall(zone, side, ratio, wallThickness) {
    ctx.save();
    if (ratio <= 0) {
      ctx.fillStyle = "#1c2621";
      ctx.fillRect(side.x, side.y, side.w, side.h);
      ctx.fillStyle = "#434e48";
      for (let k = 0; k < 4; k += 1) {
        ctx.fillRect(side.x + (side.w / 5) * (k + 1) - 3, side.y + (side.h / 5) * (k % 3) - 2, 6, 4);
      }
      ctx.restore();
      return;
    }
    ctx.fillStyle = ratio > 0.75 ? "#63726b" : ratio > 0.5 ? "#58665f" : ratio > 0.25 ? "#4d5953" : "#434e48";
    ctx.fillRect(side.x, side.y, side.w, side.h);
    ctx.strokeStyle = "#121915";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(side.x, side.y, side.w, side.h);
    ctx.strokeStyle = "rgba(206, 224, 215, 0.25)";
    ctx.lineWidth = 1;
    if (side.w > side.h) {
      ctx.beginPath();
      ctx.moveTo(side.x + 1, side.y + 2);
      ctx.lineTo(side.x + side.w - 1, side.y + 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(side.x + 2, side.y + 1);
      ctx.lineTo(side.x + 2, side.y + side.h - 1);
      ctx.stroke();
    }
    if (ratio <= 0.75) {
      ctx.strokeStyle = "#1a231e";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(side.x + side.w * 0.4, side.y + 1);
      ctx.lineTo(side.x + side.w * 0.35, side.y + side.h - 1);
      ctx.stroke();
    }
    if (ratio <= 0.5) {
      ctx.strokeStyle = "#121915";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(side.x + side.w * 0.7, side.y + 1);
      ctx.lineTo(side.x + side.w * 0.6, side.y + side.h * 0.5);
      ctx.lineTo(side.x + side.w * 0.75, side.y + side.h - 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRectSafeZoneGate(zone, side, ratio, wallThickness) {
    const hw = zone.w / 2;
    const hh = zone.h / 2;
    const gateW = Math.max(40, zone.w * 0.35);
    const openAmount = ratio <= 0 ? 0.85 : clamp(zone.gateOpen || 0, 0, 1);

    ctx.save();
    const gx = zone.x;
    const gy = zone.y - hh;
    ctx.translate(gx, gy);

    ctx.fillStyle = "rgba(24, 34, 29, 0.85)";
    ctx.fillRect(-gateW / 2, -wallThickness / 2, gateW, wallThickness);

    const leafW = gateW / 2;
    const leafH = wallThickness - 1.5;
    const slide = openAmount * (leafW * 0.82);

    const leaves = [
      { x: -leafW - slide, broken: ratio <= 0 },
      { x: slide, broken: ratio <= 0 },
    ];

    for (let i = 0; i < leaves.length; i += 1) {
      const leaf = leaves[i];
      ctx.save();
      ctx.translate(leaf.x, 0);
      if (leaf.broken) {
        ctx.rotate(i === 0 ? -0.18 : 0.22);
      }

      ctx.fillStyle = "#3c4741";
      ctx.strokeStyle = "#101713";
      ctx.lineWidth = 1.6;
      ctx.fillRect(0, -leafH * 0.5, leafW, leafH);

      ctx.save();
      ctx.beginPath();
      ctx.rect(1, -leafH * 0.5 + 1, leafW - 2, leafH - 2);
      ctx.clip();
      const stripeStep = 7;
      for (let sx = -leafH; sx < leafW + leafH; sx += stripeStep) {
        ctx.fillStyle = Math.floor((sx + leafH) / stripeStep) % 2 === 0 ? "#e2be46" : "#18201c";
        ctx.beginPath();
        ctx.moveTo(sx, -leafH * 0.5);
        ctx.lineTo(sx + stripeStep * 0.6, -leafH * 0.5);
        ctx.lineTo(sx + stripeStep * 0.6 - leafH * 0.6, leafH * 0.5);
        ctx.lineTo(sx - leafH * 0.6, leafH * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = "#101713";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(0, -leafH * 0.5, leafW, leafH);

      if (ratio <= 0.5 && ratio > 0) {
        ctx.strokeStyle = "#101713";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(leafW * 0.45, -leafH * 0.5);
        ctx.lineTo(leafW * 0.55, leafH * 0.5);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }
  function drawEvacuationZones() {
    for (const zone of evacuationZones) {
      ctx.save();
      const hw = (zone.w || zone.radius * 2) / 2;
      const hh = (zone.h || zone.radius * 2) / 2;
      const gateW = Math.max(30, zone.w * 0.3);
      const wallColor = zone.locked ? "rgba(255, 177, 91, 0.7)" : "rgba(98, 235, 131, 0.7)";
      ctx.strokeStyle = wallColor;
      ctx.lineWidth = 3;
      ctx.setLineDash(zone.locked ? [6, 6] : []);

      // Draw 4 walls with gap on top (entrance).
      // Top wall (left segment)
      ctx.beginPath();
      ctx.moveTo(zone.x - hw, zone.y - hh);
      ctx.lineTo(zone.x - gateW / 2, zone.y - hh);
      ctx.stroke();
      // Top wall (right segment)
      ctx.beginPath();
      ctx.moveTo(zone.x + gateW / 2, zone.y - hh);
      ctx.lineTo(zone.x + hw, zone.y - hh);
      ctx.stroke();
      // Right wall
      ctx.beginPath();
      ctx.moveTo(zone.x + hw, zone.y - hh);
      ctx.lineTo(zone.x + hw, zone.y + hh);
      ctx.stroke();
      // Bottom wall
      ctx.beginPath();
      ctx.moveTo(zone.x + hw, zone.y + hh);
      ctx.lineTo(zone.x - hw, zone.y + hh);
      ctx.stroke();
      // Left wall
      ctx.beginPath();
      ctx.moveTo(zone.x - hw, zone.y + hh);
      ctx.lineTo(zone.x - hw, zone.y - hh);
      ctx.stroke();
      ctx.setLineDash([]);

      // Entrance marker.
      ctx.fillStyle = zone.locked ? "rgba(255, 177, 91, 0.9)" : "rgba(98, 235, 131, 0.9)";
      ctx.beginPath();
      ctx.arc(zone.entranceX, zone.entranceY, 6, 0, TAU);
      ctx.fill();

      // Unlock point marker.
      ctx.fillStyle = zone.locked ? "rgba(255, 177, 91, 0.5)" : "rgba(98, 235, 131, 0.3)";
      ctx.beginPath();
      ctx.arc(zone.unlockX, zone.unlockY, 10, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = zone.locked ? "rgba(255, 177, 91, 0.9)" : "rgba(98, 235, 131, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(zone.unlockX, zone.unlockY, 10, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "rgba(236, 255, 243, 0.85)";
      ctx.font = `700 7px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fillScreenText("UNLOCK", zone.unlockX, zone.unlockY);

      ctx.fillStyle = "rgba(236, 255, 243, 0.8)";
      ctx.font = `700 9px ${MONO}`;
      fillScreenText(zone.locked ? "LOCKED" : "OPEN", zone.x, zone.y);
      ctx.font = `600 8px ${MONO}`;
      ctx.fillStyle = "rgba(136, 164, 149, 0.9)";
      fillScreenText(
        `${zone.civiliansRemaining} civilians`,
        zone.x,
        zone.y + 14
      );

      if (zone.completed) {
        ctx.fillStyle = "rgba(98, 235, 131, 0.9)";
        ctx.font = `700 9px ${MONO}`;
        fillScreenText("CLEARED", zone.x, zone.y - 14);
      }

      // Draw civilians inside.
      for (const civ of zone.civilians) {
        drawCivilian(civ);
      }
      ctx.restore();
    }
  }

  function drawPath(points, color) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 / camera.zoom;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([8 / camera.zoom, 5 / camera.zoom]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Start and end markers.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, 6 / camera.zoom, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(points[points.length - 1].x, points[points.length - 1].y, 6 / camera.zoom, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawZombieSpawners() {
    for (const sp of zombieSpawners) {
      const hw = sp.w / 2;
      const hh = sp.h / 2;
      const frame = Math.max(6, Math.min(hw, hh) * 0.18);

      ctx.save();

      // Outer concrete / metal frame.
      ctx.fillStyle = "#3b4540";
      ctx.fillRect(sp.x - hw - frame, sp.y - hh - frame, sp.w + frame * 2, sp.h + frame * 2);
      ctx.strokeStyle = "#141b17";
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(sp.x - hw - frame, sp.y - hh - frame, sp.w + frame * 2, sp.h + frame * 2);

      // Inner dark sewer opening.
      ctx.fillStyle = "#070b09";
      ctx.fillRect(sp.x - hw, sp.y - hh, sp.w, sp.h);
      ctx.strokeStyle = "rgba(98, 235, 131, 0.35)";
      ctx.lineWidth = 1 / camera.zoom;
      ctx.strokeRect(sp.x - hw, sp.y - hh, sp.w, sp.h);

      // Metal grate bars (horizontal + vertical).
      ctx.strokeStyle = "#5a6b62";
      ctx.lineWidth = Math.max(1, 2 / camera.zoom);
      const barCount = 5;
      for (let i = 1; i < barCount; i += 1) {
        const bx = sp.x - hw + (sp.w / barCount) * i;
        ctx.beginPath();
        ctx.moveTo(bx, sp.y - hh);
        ctx.lineTo(bx, sp.y + hh);
        ctx.stroke();
      }
      for (let i = 1; i < barCount; i += 1) {
        const by = sp.y - hh + (sp.h / barCount) * i;
        ctx.beginPath();
        ctx.moveTo(sp.x - hw, by);
        ctx.lineTo(sp.x + hw, by);
        ctx.stroke();
      }

      // Dark centre hole hint.
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(sp.x - hw * 0.35, sp.y - hh * 0.35, sp.w * 0.7, sp.h * 0.7);

      // Label.
      ctx.fillStyle = "rgba(183, 231, 255, 0.78)";
      ctx.font = `700 9px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fillScreenText("ZOMBIE SPAWNER", sp.x, sp.y + hh + frame + 12 / camera.zoom);

      ctx.restore();
    }
  }

  function drawCivilianSpotWalls() {
    ctx.save();
    for (const obj of buildObjects) {
      if (!obj.civilianSpotWall) continue;
      ctx.fillStyle = "rgba(150, 155, 150, 0.6)";
      ctx.strokeStyle = "rgba(210, 215, 210, 0.9)";
      ctx.lineWidth = 2 / camera.zoom;
      ctx.fillRect(obj.x - obj.w / 2, obj.y - obj.h / 2, obj.w, obj.h);
      ctx.strokeRect(obj.x - obj.w / 2, obj.y - obj.h / 2, obj.w, obj.h);
    }
    ctx.restore();
  }

  function drawBuildObjects(filter) {
    const colors = {
      rescue: "rgba(245, 230, 168, 0.25)",
      safe: "rgba(95, 185, 255, 0.25)",
      spawner: "rgba(98, 235, 131, 0.25)",
      wall: "rgba(130, 135, 132, 0.5)",
      tree: "rgba(60, 120, 70, 0.35)",
    };
    const strokes = {
      rescue: "rgba(245, 230, 168, 0.9)",
      safe: "rgba(95, 185, 255, 0.9)",
      spawner: "rgba(98, 235, 131, 0.9)",
      wall: "rgba(130, 135, 132, 0.95)",
      tree: "rgba(60, 120, 70, 0.9)",
    };
    const labels = {
      rescue: "RESCUE ZONE",
      safe: "SAFE ZONE",
      spawner: "ZOMBIE SPAWNER",
      wall: "WALL",
      tree: "TREE",
    };

    for (const obj of buildObjects) {
      if (filter && !filter(obj)) continue;
      const color = colors[obj.type] || "rgba(200,200,200,0.2)";
      const stroke = strokes[obj.type] || "rgba(200,200,200,0.9)";
      const label = labels[obj.type] || obj.type.toUpperCase();
      const selected = obj.id === buildSelectedId;

      ctx.save();
      ctx.translate(obj.x, obj.y);
      if (obj.type === "tree") {
        // Tree: circle canopy
        const r = Math.min(obj.w, obj.h) / 2;
        ctx.fillStyle = "rgba(40, 90, 50, 0.6)";
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = (selected ? 3 : 2) / camera.zoom;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.stroke();
        // Trunk dot
        ctx.fillStyle = "rgba(90, 60, 30, 0.9)";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.25, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(-obj.w / 2, -obj.h / 2, obj.w, obj.h);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = (selected ? 3 : 2) / camera.zoom;
        ctx.strokeRect(-obj.w / 2, -obj.h / 2, obj.w, obj.h);
      }
      if (selected) {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([4 / camera.zoom, 3 / camera.zoom]);
        ctx.strokeRect(-obj.w / 2 - 4, -obj.h / 2 - 4, obj.w + 8, obj.h + 8);
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Preview
    if (buildPreview && buildTool !== "select") {
      const color = colors[buildTool] || "rgba(200,200,200,0.2)";
      const stroke = strokes[buildTool] || "rgba(200,200,200,0.9)";
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = color;
      ctx.fillRect(buildPreview.x - buildPreview.w / 2, buildPreview.y - buildPreview.h / 2, buildPreview.w, buildPreview.h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2 / camera.zoom;
      ctx.setLineDash([4 / camera.zoom, 3 / camera.zoom]);
      ctx.strokeRect(buildPreview.x - buildPreview.w / 2, buildPreview.y - buildPreview.h / 2, buildPreview.w, buildPreview.h);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function drawWorker(worker) {
    if (!worker.alive) return;
    if (worker.state === "inside") return;
    ctx.save();
    ctx.fillStyle = "#9a9a9a";
    ctx.beginPath();
    ctx.arc(worker.x, worker.y, worker.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(worker.x, worker.y, worker.radius, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawSteelMines() {
    for (const mine of steelMines) {
      ctx.save();
      const hw = mine.w / 2;
      const hh = mine.h / 2;

      // Concrete base pad.
      ctx.fillStyle = "#4a524e";
      ctx.fillRect(mine.x - hw - 4, mine.y - hh - 4, mine.w + 8, mine.h + 8);
      ctx.strokeStyle = "#1a211d";
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.strokeRect(mine.x - hw - 4, mine.y - hh - 4, mine.w + 8, mine.h + 8);

      // Metal structure.
      ctx.fillStyle = "#6b7570";
      ctx.fillRect(mine.x - hw, mine.y - hh, mine.w, mine.h);
      ctx.strokeStyle = "#2a332e";
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(mine.x - hw, mine.y - hh, mine.w, mine.h);

      // Dark mine opening (square hole).
      ctx.fillStyle = "#0a0f0c";
      ctx.fillRect(mine.x - hw * 0.5, mine.y - hh * 0.5, mine.w * 0.5, mine.h * 0.5);

      // Support beams (cross).
      ctx.strokeStyle = "#8a968f";
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.beginPath();
      ctx.moveTo(mine.x - hw * 0.5, mine.y - hh * 0.5);
      ctx.lineTo(mine.x + hw * 0.5, mine.y + hh * 0.5);
      ctx.moveTo(mine.x + hw * 0.5, mine.y - hh * 0.5);
      ctx.lineTo(mine.x - hw * 0.5, mine.y + hh * 0.5);
      ctx.stroke();

      // Label.
      ctx.fillStyle = "rgba(183, 231, 255, 0.78)";
      ctx.font = `700 9px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fillScreenText("STEEL MINE", mine.x, mine.y + hh + 12 / camera.zoom);

      ctx.restore();
    }
  }

  function drawGasStations() {
    for (const station of gasStations) {
      ctx.save();
      const hw = station.w / 2;
      const hh = station.h / 2;

      // Concrete base pad.
      ctx.fillStyle = "#4a4a3e";
      ctx.fillRect(station.x - hw - 4, station.y - hh - 4, station.w + 8, station.h + 8);
      ctx.strokeStyle = "#1a1a14";
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.strokeRect(station.x - hw - 4, station.y - hh - 4, station.w + 8, station.h + 8);

      // Yellow fuel canopy.
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(station.x - hw, station.y - hh, station.w, station.h);
      ctx.strokeStyle = "#3a2f0a";
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(station.x - hw, station.y - hh, station.w, station.h);

      // Fuel pump nozzle symbol.
      ctx.fillStyle = "#1a1a14";
      ctx.fillRect(station.x - 3, station.y - hh * 0.6, 6, hh * 1.2);
      ctx.fillStyle = "#f7c948";
      ctx.fillRect(station.x - 1.5, station.y - hh * 0.4, 3, hh * 0.8);

      // Label.
      ctx.fillStyle = "rgba(255, 230, 140, 0.85)";
      ctx.font = `700 9px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fillScreenText("GAS STATION", station.x, station.y + hh + 12 / camera.zoom);

      ctx.restore();
    }
  }

  function drawLamps() {
    for (const lamp of lamps) {
      ctx.save();
      const active = lamp.active !== false;
      // Light pool in the world.
      if (active && darkMode) {
        const glow = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, lamp.radius);
        glow.addColorStop(0, "rgba(255, 226, 150, 0.14)");
        glow.addColorStop(0.6, "rgba(255, 214, 110, 0.06)");
        glow.addColorStop(1, "rgba(255, 214, 110, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, lamp.radius, 0, TAU);
        ctx.fill();
      }
      // Post.
      ctx.strokeStyle = "#2a332e";
      ctx.lineWidth = 3 / camera.zoom;
      ctx.beginPath();
      ctx.moveTo(lamp.x, lamp.y + 10);
      ctx.lineTo(lamp.x, lamp.y - 6);
      ctx.stroke();
      // Lamp head.
      ctx.fillStyle = active ? "#ffe28a" : "#5b5f58";
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 8, 6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#1a211d";
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.stroke();
      // Label.
      ctx.fillStyle = active ? "rgba(255, 240, 190, 0.8)" : "rgba(160, 160, 150, 0.7)";
      ctx.font = `700 8px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fillScreenText(active ? "LAMP" : "LAMP OFF", lamp.x, lamp.y + 20 / camera.zoom);
      ctx.restore();
    }
  }

  function drawFurnaces() {
    for (const f of furnaces) {
      ctx.save();
      const hw = f.w / 2;
      const hh = f.h / 2;

      // Stone/concrete base.
      ctx.fillStyle = "#4a3f38";
      ctx.fillRect(f.x - hw - 3, f.y - hh - 3, f.w + 6, f.h + 6);
      ctx.strokeStyle = "#1a1410";
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.strokeRect(f.x - hw - 3, f.y - hh - 3, f.w + 6, f.h + 6);

      // Furnace body (dark metal).
      ctx.fillStyle = "#2a2320";
      ctx.fillRect(f.x - hw, f.y - hh, f.w, f.h);
      ctx.strokeStyle = "#5a4a42";
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(f.x - hw, f.y - hh, f.w, f.h);

      // Glowing opening.
      ctx.fillStyle = "rgba(255, 140, 40, 0.85)";
      ctx.fillRect(f.x - hw * 0.5, f.y - hh * 0.5, f.w * 0.5, f.h * 0.5);
      ctx.fillStyle = "rgba(255, 200, 80, 0.6)";
      ctx.fillRect(f.x - hw * 0.25, f.y - hh * 0.25, f.w * 0.5, f.h * 0.5);

      // Chimney/stack detail.
      ctx.fillStyle = "#3a3330";
      ctx.fillRect(f.x - 4, f.y - hh - 8, 8, 6);

      ctx.fillStyle = "rgba(183, 231, 255, 0.78)";
      ctx.font = `700 9px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fillScreenText("FURNACE", f.x, f.y + hh + 12 / camera.zoom);

      ctx.restore();
    }
  }

  function drawRecruitmentStations() {
    for (const zone of safeZones) {
      const rs = zone.recruitmentStation;
      if (!rs) continue;
      ctx.save();
      const hw = rs.w / 2;
      const hh = rs.h / 2;

      // Building base (concrete).
      ctx.fillStyle = "#3a4540";
      ctx.fillRect(rs.x - hw - 3, rs.y - hh - 3, rs.w + 6, rs.h + 6);
      ctx.strokeStyle = "#141b17";
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.strokeRect(rs.x - hw - 3, rs.y - hh - 3, rs.w + 6, rs.h + 6);

      // Building body.
      ctx.fillStyle = "#5a6560";
      ctx.fillRect(rs.x - hw, rs.y - hh, rs.w, rs.h);
      ctx.strokeStyle = "#2a332e";
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(rs.x - hw, rs.y - hh, rs.w, rs.h);

      // Door.
      ctx.fillStyle = "#1a201c";
      ctx.fillRect(rs.x - 5, rs.y + hh - 8, 10, 8);

      // Roof detail (horizontal lines).
      ctx.strokeStyle = "#7a8580";
      ctx.lineWidth = 1 / camera.zoom;
      ctx.beginPath();
      ctx.moveTo(rs.x - hw + 2, rs.y - hh + 6);
      ctx.lineTo(rs.x + hw - 2, rs.y - hh + 6);
      ctx.moveTo(rs.x - hw + 2, rs.y - hh + 12);
      ctx.lineTo(rs.x + hw - 2, rs.y - hh + 12);
      ctx.stroke();

      // Label.
      ctx.fillStyle = "rgba(183, 231, 255, 0.78)";
      ctx.font = `700 9px ${MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fillScreenText("RECRUIT", rs.x, rs.y + hh + 10 / camera.zoom);

      ctx.restore();
    }
  }

  function drawTreeCanopies() {
    const sprites = getTreeSprites();
    const view = visibleWorldRect();
    const scale = TREE_SPRITE_HALF / TREE_SPRITE_BASE;
    for (const tree of trees) {
      if (tree.canopyRadius * camera.zoom < 2.5) continue;
      const r = tree.canopyRadius * scale;
      if (
        tree.x + r < view.left ||
        tree.x - r > view.right ||
        tree.y + r < view.top ||
        tree.y - r > view.bottom
      ) {
        continue;
      }
      const variants = sprites[tree.type];
      if (!variants) continue;
      const sprite = variants[tree.spriteIndex % TREE_SPRITE_VARIANTS];
      if (!sprite) continue;
      ctx.drawImage(sprite, tree.x - r, tree.y - r, r * 2, r * 2);
    }
  }

  function drawCivilian(civilian) {
    if (!civilian.alive) return;
    ctx.save();
    const x = civilian.x;
    const y = civilian.y;
    const radius = civilian.radius;

    // Recruitment progress ring when inside a safe zone.
    if (civilian.state === "recruiting" && civilian.recruitTimer > 0) {
      const progress = clamp(
        civilian.recruitTimer / CONFIG.safeZones.recruitmentSeconds,
        0,
        1
      );
      ctx.strokeStyle = "rgba(95, 185, 255, 0.78)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
      ctx.stroke();
    }

    const body = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.34,
      radius * 0.08,
      x,
      y,
      radius
    );
    body.addColorStop(0, "#fff6c8");
    body.addColorStop(0.58, "#f3d56b");
    body.addColorStop(1, "#b89228");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 248, 210, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();

    if (civilian.biteFlash > 0) {
      const progress = 1 - civilian.biteFlash / 0.34;
      ctx.globalAlpha = 0.8 * (1 - progress);
      ctx.strokeStyle = "#ff6b5f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3 + progress * 10, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMovingSoldier(unit) {
    ctx.save();
    ctx.fillStyle = "#4798c9";
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, CONFIG.survivors.radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawDefender(defender, zone) {
    ctx.save();
    ctx.fillStyle = "#4798c9";
    ctx.beginPath();
    ctx.arc(defender.x, defender.y, defender.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(170, 214, 238, 0.34)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(defender.x, defender.y, defender.radius, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawSurvivor(survivor) {
    if (!survivor.alive) return;

    const bob = Math.sin(visualTime * 1.8 + survivor.seed) * 1.1;
    const x = survivor.x;
    const y = survivor.y + bob;
    const radius = survivor.radius;
    const threshold = Math.max(1, Math.round(CONFIG.survivors.bitesToInfect));

    ctx.save();

    // Infection ring: one arc per required bite.
    const ringRadius = radius + 6.5;
    const segment = TAU / threshold;
    for (let i = 0; i < threshold; i += 1) {
      const start = -Math.PI / 2 + i * segment + segment * 0.12;
      const end = start + segment * 0.76;
      const bitten = i < survivor.infections;
      ctx.beginPath();
      ctx.strokeStyle = bitten
        ? i === threshold - 1
          ? "rgba(255, 107, 95, 0.95)"
          : "rgba(255, 177, 91, 0.92)"
        : "rgba(219, 242, 230, 0.16)";
      ctx.lineWidth = bitten ? 2.4 : 1.5;
      ctx.lineCap = "round";
      ctx.arc(x, y, ringRadius, start, end);
      ctx.stroke();
    }

    // Rifle sits under the dot and points where the survivor is aiming.
    drawRifle(survivor, x, y);

    // Body.
    const body = ctx.createRadialGradient(
      x - radius * 0.34,
      y - radius * 0.38,
      radius * 0.08,
      x,
      y,
      radius
    );
    if (survivor.type === "sniper") {
      body.addColorStop(0, "#9ad6ff");
      body.addColorStop(0.55, "#5fa8e0");
      body.addColorStop(1, "#2a6fa8");
    } else if (survivor.type === "flamethrower") {
      body.addColorStop(0, "#ffc48a");
      body.addColorStop(0.55, "#e07a3a");
      body.addColorStop(1, "#8a3c1a");
    } else {
      body.addColorStop(0, "#74b9e0");
      body.addColorStop(0.55, "#4798c9");
      body.addColorStop(1, "#266a96");
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(170, 214, 238, 0.34)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();

    // Reload progress ring.
    if (survivor.reloading) {
      const total = survivor.reloadDuration || weaponReloadSeconds();
      const progress = clamp(1 - survivor.reloadTimer / total, 0, 1);
      const reloadRadius = radius + 3.5;

      ctx.strokeStyle = "rgba(255, 177, 91, 0.16)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x, y, reloadRadius, 0, TAU);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 177, 91, ${0.55 + progress * 0.4})`;
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y, reloadRadius, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
      ctx.stroke();
    }

    // Continuous flame cone.
    if (survivor.type === "flamethrower" && survivor.flameActive) {
      const range = survivorFiringRange(survivor);
      const half = CONFIG.survivors.flamethrower.halfAngle || 0.3;
      const muzzle = radius + rifleLength(survivor);
      const mx = x + Math.cos(survivor.aimAngle) * muzzle;
      const my = y + Math.sin(survivor.aimAngle) * muzzle;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(mx, my, 2, mx, my, range);
      grad.addColorStop(0, "rgba(255, 232, 150, 0.8)");
      grad.addColorStop(0.4, "rgba(255, 130, 40, 0.45)");
      grad.addColorStop(1, "rgba(255, 60, 20, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.arc(mx, my, range, survivor.aimAngle - half, survivor.aimAngle + half);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Muzzle flash.
    if (survivor.flash > 0) {
      const flashAlpha = survivor.flash / 0.1;
      const muzzleDistance = radius + rifleLength(survivor);
      const muzzleX = x + Math.cos(survivor.aimAngle) * muzzleDistance;
      const muzzleY = y + Math.sin(survivor.aimAngle) * muzzleDistance;
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = "#e9faff";
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 2.2, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Bite flash.
    if (survivor.biteFlash > 0) {
      const progress = 1 - survivor.biteFlash / 0.34;
      ctx.globalAlpha = 0.8 * (1 - progress);
      ctx.strokeStyle = "#ff6b5f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + 4 + progress * 13, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawRifle(survivor, x, y) {
    const reach = survivor.radius + rifleLength(survivor);
    const reloadTilt = survivor.reloading ? 0.24 : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(survivor.aimAngle + reloadTilt);
    ctx.lineCap = "round";

    if (survivor.type === "flamethrower") {
      // Fuel tank on the back.
      ctx.fillStyle = "#7a4f26";
      ctx.strokeStyle = "#2a1a0e";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-survivor.radius * 0.95, 0, 7, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // Hose.
      ctx.strokeStyle = "#3a2a18";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-survivor.radius * 0.95, 0);
      ctx.quadraticCurveTo(-survivor.radius * 0.2, 8, 2, 2);
      ctx.stroke();
      // Long barrel.
      ctx.strokeStyle = "#2a332e";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(reach, 0);
      ctx.stroke();
      ctx.strokeStyle = "#a6762f";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(reach, 0);
      ctx.stroke();
      // Nozzle.
      ctx.fillStyle = "#ffd36b";
      ctx.fillRect(reach - 4, -3, 6, 6);
      ctx.strokeStyle = "#2a1a0e";
      ctx.lineWidth = 1;
      ctx.strokeRect(reach - 4, -3, 6, 6);
      ctx.restore();
      return;
    }

    // Dark stock/outline.
    ctx.strokeStyle = "rgba(4, 10, 7, 0.96)";
    ctx.lineWidth = 6.2;
    ctx.beginPath();
    ctx.moveTo(-3, 0.8);
    ctx.lineTo(reach, 0.8);
    ctx.stroke();

    // Metal barrel.
    ctx.strokeStyle = "rgba(176, 199, 188, 0.94)";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(reach, 0);
    ctx.stroke();

    // Muzzle tip.
    ctx.fillStyle = "rgba(228, 240, 234, 0.95)";
    ctx.fillRect(reach - 2.4, -1.7, 3.2, 3.4);

    // Grip.
    ctx.strokeStyle = "rgba(4, 10, 7, 0.96)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(survivor.radius * 0.55, 1);
    ctx.lineTo(survivor.radius * 0.55 + 2.5, 8);
    ctx.stroke();

    ctx.restore();
  }

  function drawZombie(zombie) {
    if (!zombie.alive) return;

    const enter = easeOutCubic(clamp(zombie.age / 0.32, 0, 1));
    const scale = zombie.converted ? 1 : 0.3 + enter * 0.7;
    const radius = Math.max(0.2, zombie.radius * scale);
    const wobble = Math.sin(visualTime * 5 + zombie.seed) * 0.55;
    const x = zombie.x + Math.cos(zombie.angle + Math.PI / 2) * wobble;
    const y = zombie.y + Math.sin(zombie.angle + Math.PI / 2) * wobble;

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) {
      return;
    }

    ctx.save();

    const body = ctx.createRadialGradient(
      x - radius * 0.32,
      y - radius * 0.34,
      radius * 0.08,
      x,
      y,
      radius
    );
    const variant = zombie.variant || "normal";
    const bodyStops = variant === "fast"
      ? ["#c8ff9e", "#5ee06f", "#24984a"]
      : variant === "big"
        ? ["#5f7d4a", "#3d5a34", "#1b2f1c"]
        : ["#6fce83", "#46b25f", "#23753d"];
    body.addColorStop(0, bodyStops[0]);
    body.addColorStop(0.56, bodyStops[1]);
    body.addColorStop(1, bodyStops[2]);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();

    // Variant visual cues.
    if (variant === "fast") {
      ctx.strokeStyle = "rgba(210, 255, 180, 0.75)";
      ctx.lineWidth = Math.max(0.8, radius * 0.12);
      ctx.beginPath();
      ctx.arc(x, y, radius + 2.5, -0.9, 0.9);
      ctx.stroke();
    } else if (variant === "big") {
      ctx.strokeStyle = "rgba(150, 180, 120, 0.55)";
      ctx.lineWidth = Math.max(1.2, radius * 0.16);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "rgba(30, 48, 28, 0.85)";
      ctx.beginPath();
      ctx.arc(x - radius * 0.55, y - radius * 0.1, radius * 0.22, 0, TAU);
      ctx.arc(x + radius * 0.55, y - radius * 0.1, radius * 0.22, 0, TAU);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(180, 230, 193, 0.3)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();

    // Burning glow while standing in flame.
    if (zombie.burnTimer > 0) {
      ctx.globalAlpha = Math.min(1, zombie.burnTimer / 0.35) * 0.8;
      ctx.strokeStyle = "rgba(255, 140, 50, 0.9)";
      ctx.lineWidth = Math.max(1, radius * 0.18);
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 200, 90, 0.85)";
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.65, radius * 0.22, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Bite wind-up ring.
    if (zombie.isBiting) {
      const interval = biteIntervalSeconds();
      const progress = clamp(1 - zombie.biteTimer / interval, 0, 1);
      ctx.strokeStyle = `rgba(255, 126, 107, ${0.35 + progress * 0.45})`;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBeams() {
    if (beams.length === 0) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";

    for (const beam of beams) {
      const alpha = clamp(beam.life / beam.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(95, 185, 255, 0.5)";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(226, 248, 255, 0.98)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawParticles() {
    if (particles.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${particle.color})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (0.6 + alpha * 0.5), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRing(ring) {
    const alpha = clamp(ring.life / ring.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgb(${ring.color})`;
    ctx.lineWidth = ring.width;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.currentRadius || ring.radius, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawFloatingTexts() {
    if (texts.length === 0) return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 9px ${MONO}`;
    for (const text of texts) {
      const alpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.globalAlpha = Math.min(1, alpha * 1.8);
      ctx.fillStyle = `rgb(${text.color})`;
      fillScreenText(text.text, text.x, text.y);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Dynamic light occluders + shadowcasting
  // ---------------------------------------------------------------------------
  function addCircleSegments(segs, cx, cy, radius, count) {
    for (let i = 0; i < count; i += 1) {
      const a1 = (i / count) * TAU;
      const a2 = ((i + 1) / count) * TAU;
      segs.push({
        x1: cx + Math.cos(a1) * radius,
        y1: cy + Math.sin(a1) * radius,
        x2: cx + Math.cos(a2) * radius,
        y2: cy + Math.sin(a2) * radius,
      });
    }
  }

  function collectWallSegments() {
    const segs = [];
    for (const obj of buildObjects) {
      if (obj.type === "tree") {
        addCircleSegments(segs, obj.x, obj.y, Math.max(4, Math.min(obj.w, obj.h) * 0.12), 8);
        continue;
      }
      if (obj.type !== "wall") continue;
      const hw = obj.w / 2;
      const hh = obj.h / 2;
      const x1 = obj.x - hw;
      const y1 = obj.y - hh;
      const x2 = obj.x + hw;
      const y2 = obj.y + hh;
      // Four edges of the wall block.
      segs.push({ x1, y1, x2, y2: y1 });
      segs.push({ x1: x2, y1, x2, y2 });
      segs.push({ x1: x2, y1: y2, x2: x1, y2 });
      segs.push({ x1, y1: y2, x2: x1, y2: y1 });
    }
    return segs;
  }

  function getTreesNear(x, y, radius) {
    const out = [];
    const r2 = (radius + 24) * (radius + 24);
    for (const tree of trees) {
      const dx = tree.x - x;
      const dy = tree.y - y;
      if (dx * dx + dy * dy <= r2) out.push(tree);
    }
    return out;
  }

  function getTreeTrunkSegments(nearTrees) {
    const segs = [];
    for (const tree of nearTrees) {
      addCircleSegments(segs, tree.x, tree.y, tree.trunkRadius, 8);
    }
    return segs;
  }

  function segmentsNear(segments, x, y, radius) {
    const out = [];
    const minX = x - radius;
    const maxX = x + radius;
    const minY = y - radius;
    const maxY = y + radius;
    for (const seg of segments) {
      const sMinX = Math.min(seg.x1, seg.x2);
      const sMaxX = Math.max(seg.x1, seg.x2);
      const sMinY = Math.min(seg.y1, seg.y2);
      const sMaxY = Math.max(seg.y1, seg.y2);
      if (sMaxX < minX || sMinX > maxX || sMaxY < minY || sMinY > maxY) continue;
      out.push(seg);
    }
    return out;
  }

  function castLightRay(ox, oy, dx, dy, maxDist, segments) {
    let best = maxDist;
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      const sx = seg.x2 - seg.x1;
      const sy = seg.y2 - seg.y1;
      const denom = dx * sy - dy * sx;
      if (Math.abs(denom) < 1e-9) continue;
      const t = ((seg.x1 - ox) * sy - (seg.y1 - oy) * sx) / denom;
      if (t <= 0 || t >= best) continue;
      const u = ((seg.x1 - ox) * dy - (seg.y1 - oy) * dx) / denom;
      if (u < 0 || u > 1) continue;
      best = t;
    }
    return best;
  }

  function buildLightPolygon(ox, oy, radius, segments, startAngle, endAngle, cone) {
    const eps = 0.0006;
    const TAU2 = Math.PI * 2;
    const span = cone ? endAngle - startAngle : TAU2;
    const angles = [];
    const samples = cone ? 22 : 40;
    for (let i = 0; i <= samples; i += 1) {
      angles.push(startAngle + (span * i) / samples);
    }
    for (const seg of segments) {
      const corners = [
        [seg.x1, seg.y1],
        [seg.x2, seg.y2],
      ];
      for (const [px, py] of corners) {
        const a = Math.atan2(py - oy, px - ox);
        const rel = ((a - startAngle) % TAU2 + TAU2) % TAU2;
        if (cone && rel > span + 0.04) continue;
        const clamped = cone ? startAngle + Math.min(span, rel) : a;
        angles.push(clamped - eps, clamped, clamped + eps);
      }
    }
    angles.sort((a, b) => a - b);
    const points = [];
    let last = -Infinity;
    for (const a of angles) {
      if (a - last < 1e-5) continue;
      last = a;
      const dist = castLightRay(ox, oy, Math.cos(a), Math.sin(a), radius, segments);
      points.push({ x: ox + Math.cos(a) * dist, y: oy + Math.sin(a) * dist });
    }
    return points;
  }

  function fillLightShape(fctx, ox, oy, worldRadius, worldPoints, innerStop) {
    const p = worldToScreen(ox, oy);
    const sx = p.x * dpr;
    const sy = p.y * dpr;
    const r = worldRadius * camera.zoom * dpr;
    if (!worldPoints || worldPoints.length < 3) {
      const grad = fctx.createRadialGradient(sx, sy, r * innerStop, sx, sy, r);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.7, "rgba(0,0,0,0.9)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      fctx.fillStyle = grad;
      fctx.beginPath();
      fctx.arc(sx, sy, r, 0, TAU);
      fctx.fill();
      return;
    }
    fctx.beginPath();
    fctx.moveTo(sx, sy);
    for (let i = 0; i < worldPoints.length; i += 1) {
      const sp = worldToScreen(worldPoints[i].x, worldPoints[i].y);
      fctx.lineTo(sp.x * dpr, sp.y * dpr);
    }
    fctx.closePath();
    const grad = fctx.createRadialGradient(sx, sy, r * innerStop, sx, sy, r);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.7, "rgba(0,0,0,0.9)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    fctx.fillStyle = grad;
    fctx.fill();
  }

  function fillConeShape(fctx, ox, oy, worldRadius, worldPoints, startAngle, endAngle) {
    const p = worldToScreen(ox, oy);
    const sx = p.x * dpr;
    const sy = p.y * dpr;
    const r = worldRadius * camera.zoom * dpr;
    if (!worldPoints || worldPoints.length < 3) {
      const grad = fctx.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.55, "rgba(0,0,0,0.75)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      fctx.fillStyle = grad;
      fctx.beginPath();
      fctx.moveTo(sx, sy);
      fctx.arc(sx, sy, r, startAngle, endAngle);
      fctx.closePath();
      fctx.fill();
      return;
    }
    fctx.beginPath();
    fctx.moveTo(sx, sy);
    for (let i = 0; i < worldPoints.length; i += 1) {
      const sp = worldToScreen(worldPoints[i].x, worldPoints[i].y);
      fctx.lineTo(sp.x * dpr, sp.y * dpr);
    }
    fctx.closePath();
    const grad = fctx.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.75)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    fctx.fillStyle = grad;
    fctx.fill();
  }

  function drawFogOverlay() {
    if (!fogCtx) return;
    const fctx = fogCtx;
    const w = viewW * dpr;
    const h = viewH * dpr;
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, w, h);

    if (!darkMode) return;

    fctx.fillStyle = "rgba(0, 0, 0, 1)";
    fctx.fillRect(0, 0, w, h);

    fctx.globalCompositeOperation = "destination-out";

    const ambientRadius = CONFIG.visual.visibilityRadius;
    const coneRadius = CONFIG.visual.flashlightRange || 520;
    const halfAngle = 0.4;
    const wallSegments = collectWallSegments();

    const blueDots = [];
    for (const s of survivors) if (s.alive) blueDots.push(s);
    for (const squad of squads) {
      for (const s of squad.survivors) if (s.alive) blueDots.push(s);
    }
    for (const u of deployingUnits) blueDots.push(u);
    for (const u of returningUnits) blueDots.push(u);
    for (const d of evacuatingDefenders) blueDots.push(d);
    for (const z of safeZones) for (const d of z.defenders) blueDots.push(d);

    const shadowTrees = new Set();

    // Ambient glow around each Blue Dot, clipped by walls.
    for (const dot of blueDots) {
      const nearTrees = getTreesNear(dot.x, dot.y, ambientRadius);
      for (const tree of nearTrees) shadowTrees.add(tree);
      const near = segmentsNear(wallSegments, dot.x, dot.y, ambientRadius + 24)
        .concat(getTreeTrunkSegments(nearTrees));
      const points = near.length
        ? buildLightPolygon(dot.x, dot.y, ambientRadius, near, 0, TAU, false)
        : null;
      fillLightShape(fctx, dot.x, dot.y, ambientRadius, points, 0.35);
    }

    // Lamp pools, clipped by walls.
    for (const lamp of lamps) {
      if (lamp.active === false) continue;
      const nearTrees = getTreesNear(lamp.x, lamp.y, lamp.radius);
      for (const tree of nearTrees) shadowTrees.add(tree);
      const near = segmentsNear(wallSegments, lamp.x, lamp.y, lamp.radius + 24)
        .concat(getTreeTrunkSegments(nearTrees));
      const points = near.length
        ? buildLightPolygon(lamp.x, lamp.y, lamp.radius, near, 0, TAU, false)
        : null;
      fillLightShape(fctx, lamp.x, lamp.y, lamp.radius, points, 0.2);
    }

    // Directional flashlights, clipped by walls.
    for (const dot of blueDots) {
      const aim = typeof dot.aimAngle === "number" ? dot.aimAngle : 0;
      const barrelDist = (dot.radius || CONFIG.survivors.radius) + 4;
      const bx = dot.x + Math.cos(aim) * barrelDist;
      const by = dot.y + Math.sin(aim) * barrelDist;
      const startAngle = aim - halfAngle;
      const endAngle = aim + halfAngle;
      const dotConeRadius = dot.type === "sniper"
        ? (CONFIG.survivors.sniper.firingRange || 1040)
        : coneRadius;
      const nearTrees = getTreesNear(bx, by, dotConeRadius);
      for (const tree of nearTrees) shadowTrees.add(tree);
      const near = segmentsNear(wallSegments, bx, by, dotConeRadius + 24)
        .concat(getTreeTrunkSegments(nearTrees));
      const points = near.length
        ? buildLightPolygon(bx, by, dotConeRadius, near, startAngle, endAngle, true)
        : null;
      fillConeShape(fctx, bx, by, dotConeRadius, points, startAngle, endAngle);
    }

    fctx.globalCompositeOperation = "source-over";

    // Soft canopy shading: dense foliage reduces light underneath without
    // acting as a fully opaque wall.
    const view = visibleWorldRect();
    for (const tree of shadowTrees) {
      if (
        tree.x + tree.canopyRadius < view.left ||
        tree.x - tree.canopyRadius > view.right ||
        tree.y + tree.canopyRadius < view.top ||
        tree.y - tree.canopyRadius > view.bottom
      ) {
        continue;
      }
      const p = worldToScreen(tree.x, tree.y);
      const sx = p.x * dpr;
      const sy = p.y * dpr;
      const r = tree.canopyRadius * camera.zoom * dpr;
      const grad = fctx.createRadialGradient(sx, sy, r * 0.1, sx, sy, r);
      grad.addColorStop(0, `rgba(0, 0, 0, ${0.26 * tree.density})`);
      grad.addColorStop(0.6, `rgba(0, 0, 0, ${0.15 * tree.density})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      fctx.fillStyle = grad;
      fctx.beginPath();
      fctx.arc(sx, sy, r, 0, TAU);
      fctx.fill();
    }

    for (const obj of buildObjects) {
      if (obj.type !== "tree") continue;
      if (
        obj.x + obj.w / 2 < view.left ||
        obj.x - obj.w / 2 > view.right ||
        obj.y + obj.h / 2 < view.top ||
        obj.y - obj.h / 2 > view.bottom
      ) {
        continue;
      }
      const p = worldToScreen(obj.x, obj.y);
      const sx = p.x * dpr;
      const sy = p.y * dpr;
      const r = (Math.max(obj.w, obj.h) / 2) * camera.zoom * dpr;
      const grad = fctx.createRadialGradient(sx, sy, r * 0.1, sx, sy, r);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.2)");
      grad.addColorStop(0.6, "rgba(0, 0, 0, 0.11)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      fctx.fillStyle = grad;
      fctx.beginPath();
      fctx.arc(sx, sy, r, 0, TAU);
      fctx.fill();
    }
  }

  function drawScreenFlash() {
    if (game.flash <= 0) return;

    const alpha = Math.min(0.52, game.flash * 0.46);
    const gradient = ctx.createRadialGradient(
      viewW / 2,
      viewH / 2,
      Math.min(viewW, viewH) * 0.12,
      viewW / 2,
      viewH / 2,
      Math.max(viewW, viewH) * 0.72
    );
    gradient.addColorStop(0, `rgba(${game.flashColor}, 0)`);
    gradient.addColorStop(0.62, `rgba(${game.flashColor}, ${alpha * 0.25})`);
    gradient.addColorStop(1, `rgba(${game.flashColor}, ${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  function arenaCenter() {
    return { x: formation.x, y: formation.y };
  }

  // ---------------------------------------------------------------------------
  // HUD / UI
  // ---------------------------------------------------------------------------
  function syncHud(force = false) {
    const survivorsText = String(survivors.length).padStart(2, "0");
    const killsText = String(game.kills).padStart(3, "0");
    const timeText = formatTime(game.time);

    if (force || survivorsText !== hudCache.survivors) {
      dom.survivorsValue.textContent = survivorsText;
      dom.survivorsValue.classList.toggle("is-danger", survivors.length <= 2);
      hudCache.survivors = survivorsText;
    }

    if (dom.steelValue) dom.steelValue.textContent = String(steel);
    if (dom.gasValue) dom.gasValue.textContent = String(gas);
    updateRecruitMenu();

    if (force || killsText !== hudCache.kills) {
      dom.killsValue.textContent = killsText;
      hudCache.kills = killsText;
    }

    if (force || timeText !== hudCache.time) {
      dom.timeValue.textContent = timeText;
      hudCache.time = timeText;
    }

    const lost = CONFIG.survivors.startingCount - survivors.length;
    const pressure = clamp((game.time / 70 + lost * 0.075) * (CONFIG.gameplay ? CONFIG.gameplay.threatScale : 1), 0, 1);
    const computed = clamp(1 + Math.floor(pressure * 4.999), 1, 5);
    const override = CONFIG.gameplay ? CONFIG.gameplay.threatOverride : 0;
    const threatLevel = override > 0 ? clamp(override, 1, 5) : computed;
    const labels = ["Low", "Rising", "High", "Severe", "Critical"];

    if (force || threatLevel !== hudCache.threatLevel) {
      Array.from(dom.threatBars.children).forEach((bar, index) => {
        bar.classList.toggle("is-on", index < threatLevel);
      });
      dom.threatBars.classList.toggle("is-high", threatLevel >= 4);
      dom.threatBars.classList.toggle("is-critical", threatLevel >= 5);
      const label = labels[threatLevel - 1];
      dom.threatLabel.textContent = label;
      dom.threatLabel.classList.toggle("is-high", threatLevel >= 4);
      dom.threatLabel.classList.toggle("is-critical", threatLevel >= 5);
      hudCache.threatLevel = threatLevel;
      hudCache.threatLabel = label;
    }

    syncDeployUI(force);
  }

  function applyDayNight() {
    if (dayMode) {
      backgroundGradient = ctx.createRadialGradient(
        viewW * 0.5,
        viewH * 0.5,
        10,
        viewW * 0.5,
        viewH * 0.5,
        Math.max(viewW, viewH) * 0.76
      );
      backgroundGradient.addColorStop(0, "#1a2a20");
      backgroundGradient.addColorStop(0.45, "#0f1a14");
      backgroundGradient.addColorStop(1, "#060d09");
    } else {
      backgroundGradient = ctx.createRadialGradient(
        viewW * 0.5,
        viewH * 0.5,
        10,
        viewW * 0.5,
        viewH * 0.5,
        Math.max(viewW, viewH) * 0.76
      );
      backgroundGradient.addColorStop(0, "#091a12");
      backgroundGradient.addColorStop(0.45, "#050f0a");
      backgroundGradient.addColorStop(1, "#020604");
    }
    if (dom.dayNightText) {
      dom.dayNightText.textContent = dayMode ? "Day" : "Night";
    }
    if (dom.dayNightIcon) {
      dom.dayNightIcon.textContent = dayMode ? "☀️" : "🌙";
    }
    if (dom.dayNightToggle) {
      dom.dayNightToggle.setAttribute("aria-pressed", dayMode ? "true" : "false");
    }
  }

  function toggleDayNight() {
    dayMode = !dayMode;
    darkMode = !dayMode;
    CONFIG.visual.darkMode = darkMode;
    applyDayNight();
    syncDarkModeUI();
  }

  function toggleDarkMode() {
    darkMode = !darkMode;
    dayMode = !darkMode;
    CONFIG.visual.darkMode = darkMode;
    applyDayNight();
    syncDarkModeUI();
  }

  function syncDarkModeUI() {
    if (!dom.darkModeButton) return;
    dom.darkModeButton.classList.toggle("is-paused", darkMode);
    dom.darkModeButton.setAttribute("aria-pressed", darkMode ? "true" : "false");
    dom.darkModeButton.title = darkMode ? "Dark mode: on (V)" : "Dark mode: off (V)";
  }

  function toggleWorkers() {
    workersEnabled = !workersEnabled;
    CONFIG.workers.enabled = workersEnabled;
    syncWorkersUI();
  }

  function syncWorkersUI() {
    if (!dom.workersToggleButton) return;
    dom.workersToggleButton.classList.toggle("is-paused", !workersEnabled);
    dom.workersToggleButton.setAttribute("aria-pressed", workersEnabled ? "true" : "false");
    dom.workersToggleButton.title = workersEnabled ? "Workers: on (W)" : "Workers: off (W)";
    const text = document.getElementById("workersToggleText");
    if (text) text.textContent = workersEnabled ? "On" : "Off";
  }

  function syncWorkerAssignmentUI() {
    const steelBtn = document.getElementById("workerSteelButton");
    const gasBtn = document.getElementById("workerGasButton");
    if (steelBtn) {
      steelBtn.classList.toggle("is-active", workerAssignment === "steel");
      steelBtn.setAttribute("aria-pressed", workerAssignment === "steel" ? "true" : "false");
    }
    if (gasBtn) {
      gasBtn.classList.toggle("is-active", workerAssignment === "gas");
      gasBtn.setAttribute("aria-pressed", workerAssignment === "gas" ? "true" : "false");
    }
  }

  function setWorkerAssignment(type) {
    if (workerAssignment === type) {
      workerAssignment = null;
    } else {
      workerAssignment = type === "gas" ? "gas" : "steel";
    }
    syncWorkerAssignmentUI();
  }

  function updateBestLabels() {
    const formatted = formatTime(bestTime);
    dom.bestTimeValue.textContent = formatted;
  }

  function formatTime(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(whole / 60);
    const remainder = whole % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function showEvent(message) {
    window.clearTimeout(eventTimer);
    dom.eventFeed.textContent = message;
    dom.eventFeed.classList.add("is-visible");
    eventTimer = window.setTimeout(() => {
      dom.eventFeed.classList.remove("is-visible");
    }, 2600);
  }

  function hideEvent() {
    window.clearTimeout(eventTimer);
    dom.eventFeed.classList.remove("is-visible");
  }

  // ---------------------------------------------------------------------------
  // Group controls: virtual joystick + formation picker
  // ---------------------------------------------------------------------------
  function setupJoystick() {
    document.addEventListener("pointerup", () => resetGroupInput());
    document.addEventListener("pointercancel", () => resetGroupInput());
    window.addEventListener("blur", () => resetGroupInput());
    const joystick = dom.joystick;

    joystick.addEventListener("pointerdown", (event) => {
      if (mode !== "playing" && mode !== "build") return;
      if (joystickPointer !== null) return;

      event.preventDefault();
      joystickPointer = event.pointerId;
      try {
        joystick.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture can fail for synthetic or cancelled pointers.
      }
      joystick.classList.add("is-active");
      updateJoystickFromEvent(event);
    });

    joystick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== joystickPointer) return;
      event.preventDefault();
      updateJoystickFromEvent(event);
    });

    const release = (event) => {
      if (event.pointerId !== joystickPointer) return;
      joystickPointer = null;
      joystick.classList.remove("is-active");
      resetGroupInput();
    };

    joystick.addEventListener("pointerup", release);
    joystick.addEventListener("pointercancel", release);
    joystick.addEventListener("lostpointercapture", release);
  }

  function updateJoystickFromEvent(event) {
    const rect = dom.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const limit = rect.width * 0.3;

    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance > limit) {
      dx = (dx / distance) * limit;
      dy = (dy / distance) * limit;
    }

    let nx = dx / limit;
    let ny = dy / limit;
    const magnitude = Math.hypot(nx, ny);

    if (magnitude <= JOYSTICK_DEAD_ZONE) {
      groupInput.x = 0;
      groupInput.y = 0;
    } else {
      const scaled = Math.min(
        1,
        (magnitude - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE)
      );
      groupInput.x = (nx / magnitude) * scaled;
      groupInput.y = (ny / magnitude) * scaled;
    }

    dom.joystickKnob.style.setProperty("--jx", `${dx}px`);
    dom.joystickKnob.style.setProperty("--jy", `${dy}px`);
  }

  function resetGroupInput() {
    groupInput.x = 0;
    groupInput.y = 0;
    joystickPointer = null;
    dom.joystickKnob.style.setProperty("--jx", "0px");
    dom.joystickKnob.style.setProperty("--jy", "0px");
    dom.joystick.classList.remove("is-active");
  }

  function syncZoomUI() {
    if (!dom.zoomControl) return;
    const level = camera.targetZoom;
    for (const btn of dom.zoomControl.querySelectorAll("[data-zoom]")) {
      const preset = Number(btn.dataset.zoom);
      const active = Math.abs(level - preset) / preset < 0.12;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function syncFormationUI() {
    const active = FORMATIONS.find((item) => item.id === formation.style) || FORMATIONS[0];
    dom.formationName.textContent = active.name;
    dom.formationButton.dataset.formation = active.id;

    for (const option of dom.formationMenu.querySelectorAll("[data-formation]")) {
      const isActive = option.dataset.formation === active.id;
      option.setAttribute("aria-checked", isActive ? "true" : "false");
    }
  }

  function setFormationStyle(style) {
    if (!FORMATION_IDS.includes(style)) return;

    closeFormationMenu();
    if (formation.style === style) return;

    formation.style = style;
    applyFormationTargets();
    clampGroupToBounds();
    syncFormationUI();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const active = FORMATIONS.find((item) => item.id === style);
    showEvent(`${active.name} formation`);
  }

  function toggleFormationMenu() {
    if (dom.formationMenu.hidden) openFormationMenu();
    else closeFormationMenu();
  }

  function openFormationMenu() {
    if (mode !== "playing") return;
    closeDeployMenu();
    dom.formationMenu.hidden = false;
    dom.formationButton.setAttribute("aria-expanded", "true");
  }

  function closeFormationMenu() {
    dom.formationMenu.hidden = true;
    dom.formationButton.setAttribute("aria-expanded", "false");
  }

  function toggleDeployMenu() {
    if (dom.deployMenu.hidden) openDeployMenu();
    else closeDeployMenu();
  }

  function openDeployMenu() {
    if (mode !== "playing") return;
    closeFormationMenu();
    deployPanelOpen = true;
    dom.deployMenu.hidden = false;
    dom.deploySoldiersButton.setAttribute("aria-expanded", "true");
    syncDeployUI(true);
  }

  function closeDeployMenu() {
    deployPanelOpen = false;
    if (dom.deployMenu) dom.deployMenu.hidden = true;
    if (dom.deploySoldiersButton) {
      dom.deploySoldiersButton.setAttribute("aria-expanded", "false");
    }
  }

  let deployUiSignature = "";
  function syncDeployUI(force = false) {
    if (!dom.deploySoldiersButton) return;
    const totalAvailable = safeZones.reduce((sum, z) => sum + z.defenders.length, 0);
    const travellingCount = deployingUnits.length + evacuatingDefenders.length;
    const activeCount = survivors.length;

    dom.deployAvailableBadge.textContent = String(totalAvailable);

    if (dom.deployMenu.hidden && !force) return;

    dom.deployActiveCount.textContent = String(activeCount);
    dom.deployTravellingCount.textContent = String(travellingCount);
    dom.deployAvailableCount.textContent = String(totalAvailable);

    const sig = safeZones
      .map(
        (z) =>
          `${z.id}:${z.defenders.length}:${z.civilians.length}:${deploySelectionByZone.get(z.id) || 1}`
      )
      .join("|");
    if (!force && sig === deployUiSignature) return;
    deployUiSignature = sig;

    dom.deployZoneList.innerHTML = "";
    safeZones.forEach((zone, index) => {
      const avail = zone.defenders.length;
      const recruiting = zone.civilians.length;
      const selected = avail > 0
        ? clamp(deploySelectionByZone.get(zone.id) || 1, 1, avail)
        : 0;
      if (avail > 0) deploySelectionByZone.set(zone.id, selected);

      const card = document.createElement("div");
      card.className = "deploy-zone-card";
      card.innerHTML = `
        <div class="deploy-zone-top">
          <strong>Safe Zone 0${index + 1}</strong>
          <span class="deploy-zone-meta">${avail} available · ${recruiting} recruiting</span>
        </div>
        <div class="deploy-controls">
          <div class="deploy-stepper">
            <button class="deploy-step-btn" type="button" data-step-zone="${zone.id}" data-step="-1" ${avail <= 1 ? "disabled" : ""}>−</button>
            <span class="deploy-qty" data-qty-zone="${zone.id}">${selected}</span>
            <button class="deploy-step-btn" type="button" data-step-zone="${zone.id}" data-step="1" ${avail <= 1 ? "disabled" : ""}>+</button>
          </div>
          <div class="deploy-actions">
            <button class="deploy-confirm-btn" type="button" data-confirm-zone="${zone.id}" ${avail === 0 ? "disabled" : ""}>Confirm (${selected})</button>
            <button class="deploy-all-btn" type="button" data-all-zone="${zone.id}" ${avail === 0 ? "disabled" : ""}>Deploy All</button>
          </div>
        </div>
      `;
      dom.deployZoneList.appendChild(card);
    });
  }

  let squadUiSignature = "";
  function syncSquadUI(force = false) {
    if (!dom.squadBar) return;
    const all = [activeSquad, ...squads].filter(Boolean).sort((a, b) => a.id - b.id);
    const sig = all.map((s) => `${s.id}:${s.survivors.length}:${s === activeSquad}`).join("|") + "|split";
    if (!force && sig === squadUiSignature) {
      // Just update counts in place.
      const chips = dom.squadBar.querySelectorAll(".squad-chip:not(.squad-chip--split):not(.squad-chip--safezone)");
      chips.forEach((chip, i) => {
        const squad = all[i];
        if (squad) chip.textContent = `${squad.name} (${squad.survivors.length})`;
        chip.classList.toggle("is-active", squad === activeSquad);
      });
      const szBtn = dom.squadBar.querySelector(".squad-chip--safezone");
      if (szBtn) szBtn.classList.toggle("is-active", !!camera.lockedZone && camera.lockedZone === (safeZones[0] || null));
      return;
    }
    squadUiSignature = sig;
    dom.squadBar.innerHTML = "";
    // Safe zone camera-lock button (left of the squad chips).
    const safeZoneBtn = document.createElement("button");
    safeZoneBtn.type = "button";
    safeZoneBtn.className = "squad-chip squad-chip--safezone";
    safeZoneBtn.textContent = "Safe Zone";
    safeZoneBtn.addEventListener("click", () => {
      if (safeZones.length === 0) return;
      if (camera.lockedZone === safeZones[0]) {
        camera.lockedZone = null;
      } else {
        camera.lockedZone = safeZones[0];
      }
    });
    dom.squadBar.appendChild(safeZoneBtn);
    for (const squad of all) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "squad-chip" + (squad === activeSquad ? " is-active" : "");
      btn.textContent = `${squad.name} (${squad.survivors.length})`;
      btn.addEventListener("click", () => switchToSquad(squad));
      dom.squadBar.appendChild(btn);
    }
    const splitBtn = document.createElement("button");
    splitBtn.type = "button";
    splitBtn.className = "squad-chip squad-chip--split";
    splitBtn.textContent = "+ Split";
    splitBtn.addEventListener("click", () => createSquadFromSplit(1));
    dom.squadBar.appendChild(splitBtn);
  }

  function syncCommandUI() {
    if (!dom.commandBar) return;
    const cmd = (activeSquad && activeSquad.command) || "defend";
    for (const btn of dom.commandBar.querySelectorAll("[data-command]")) {
      const isActive = btn.dataset.command === cmd;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  let recruitZone = null;
  function openRecruitmentMenu(zone) {
    if (mode !== "playing") return;
    recruitZone = zone;
    if (dom.recruitMenu) dom.recruitMenu.hidden = false;
    updateRecruitMenu();
  }
  function closeRecruitmentMenu() {
    recruitZone = null;
    if (dom.recruitMenu) dom.recruitMenu.hidden = true;
  }
  function updateRecruitMenu() {
    if (dom.recruitSteel) dom.recruitSteel.textContent = String(steel);
    const hasWorker = recruitZone && (recruitZone.workers || []).some((w) => w.alive && w.state !== "inside" && w.state !== "recruiting");
    if (dom.recruitSoldierBtn) dom.recruitSoldierBtn.disabled = steel < 5 || !hasWorker;
    if (dom.recruitSniperBtn) dom.recruitSniperBtn.disabled = steel < 6 || !hasWorker;
    if (dom.recruitFlamethrowerBtn) dom.recruitFlamethrowerBtn.disabled = steel < 5 || gas < 10 || !hasWorker;
  }
  function recruitSoldier(type) {
    if (!recruitZone) return;
    const zone = recruitZone;
    const isFlame = type === "flamethrower";
    const steelCost = isFlame ? 5 : type === "sniper" ? 6 : 5;
    const gasCost = isFlame ? 10 : 0;

    if (steel < steelCost || gas < gasCost) {
      showEvent(isFlame ? "Need 10 Gas + 5 Steel" : "Not enough steel");
      return;
    }

    const available = (zone.workers || []).filter(
      (w) => w.alive && w.state !== "inside" && w.state !== "recruiting"
    );
    if (available.length === 0) {
      showEvent("No available workers");
      return;
    }
    const worker = isFlame
      ? available[Math.floor(Math.random() * available.length)]
      : available[0];

    // Deduct resources immediately, only after all checks pass.
    steel -= steelCost;
    gas -= gasCost;
    worker.state = "recruiting";
    zone.recruitments.push({
      worker,
      type,
      timer: 5,
      cost: steelCost,
      gasCost,
    });
    const label = isFlame ? "Flamethrower" : type === "sniper" ? "Sniper" : "Soldier";
    showEvent(`Recruiting ${label}...`);
    updateRecruitMenu();
    syncHud(true);
  }

  function syncControlVisibility() {
    const show = mode === "playing";
    const build = mode === "build";
    dom.joystick.hidden = !(show || build);
    dom.formationDock.hidden = !show;
    if (dom.squadBar) dom.squadBar.hidden = !show;
    if (dom.commandBar) dom.commandBar.hidden = !show;
    if (dom.buildSizePanel) dom.buildSizePanel.hidden = true;
    if (dom.buildPalette) dom.buildPalette.hidden = !build;

    if (!show && !build) {
      closeFormationMenu();
      closeDeployMenu();
      closeRecruitmentMenu();
      resetGroupInput();
    } else if (show) {
      syncDeployUI(true);
      syncSquadUI();
      syncCommandUI();
    }
  }

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------
  function togglePause(force) {
    const shouldPause =
      typeof force === "boolean" ? force : mode === "playing";

    if (shouldPause && mode === "playing") {
      mode = "paused";
      game.shake = 0;
      dom.pauseScreen.hidden = false;
      dom.pauseButton.classList.add("is-paused");
      dom.pauseButton.setAttribute("aria-label", "Resume simulation");
      pressedKeys.clear();
      resetGroupInput();
      closeTuning();
      syncControlVisibility();
      return;
    }

    if (!shouldPause && mode === "paused") {
      mode = "playing";
      dom.pauseScreen.hidden = true;
      dom.pauseButton.classList.remove("is-paused");
      dom.pauseButton.setAttribute("aria-label", "Pause simulation");
      syncControlVisibility();
    }
  }

  function toggleTuning() {
    if (dom.tuningPanel.hidden) openTuning();
    else closeTuning();
  }

  function openTuning() {
    dom.tuningPanel.hidden = false;
    dom.tuningPanel.setAttribute("aria-hidden", "false");
    dom.settingsButton.setAttribute("aria-expanded", "true");
  }

  function closeTuning() {
    dom.tuningPanel.hidden = true;
    dom.tuningPanel.setAttribute("aria-hidden", "true");
    dom.settingsButton.setAttribute("aria-expanded", "false");
  }

  function setRangeFill(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    const fill = ((value - min) / Math.max(0.0001, max - min)) * 100;
    input.style.setProperty("--fill", `${fill}%`);
  }

  function syncTuningUI() {
    dom.fireRateInput.value = String(CONFIG.survivors.shotsPerSecond);
    dom.magazineInput.value = String(CONFIG.survivors.weapon.magazineSize);
    dom.reloadInput.value = String(CONFIG.survivors.weapon.reloadSeconds);
    dom.aimSpeedInput.value = String(CONFIG.survivors.weapon.aimSpeed);
    dom.groupSpeedInput.value = String(CONFIG.survivors.group.speed);
    dom.spacingInput.value = String(CONFIG.survivors.group.formationSpacing);
    dom.responseInput.value = String(CONFIG.survivors.group.responsiveness);
    dom.biteRateInput.value = String(CONFIG.zombies.bitesPerSecond);
    dom.infectionInput.value = String(CONFIG.survivors.bitesToInfect);
    dom.speedInput.value = String(CONFIG.zombies.speed);
    dom.gunshotRadiusInput.value = String(CONFIG.zombies.activation.gunshotRadius);
    dom.killRadiusInput.value = String(CONFIG.zombies.activation.killRadius);
    dom.chainRadiusInput.value = String(CONFIG.zombies.activation.chainRadius);
    dom.civilianSightInput.value = String(CONFIG.zombies.activation.civilianDetectionRadius);
    dom.deactivationDelayInput.value = String(CONFIG.zombies.activation.deactivationDelay);

    dom.fireRateOutput.value = `${CONFIG.survivors.shotsPerSecond.toFixed(1)} / s`;
    dom.magazineOutput.value = `${weaponMagazineSize()} shots`;
    dom.reloadOutput.value = `${weaponReloadSeconds().toFixed(1)} s`;
    dom.aimSpeedOutput.value = `${Number(CONFIG.survivors.weapon.aimSpeed).toFixed(1)}`;
    dom.groupSpeedOutput.value = `${Math.round(CONFIG.survivors.group.speed)} px / s`;
    dom.spacingOutput.value = `${Math.round(CONFIG.survivors.group.formationSpacing)} px`;
    dom.responseOutput.value = `${Number(CONFIG.survivors.group.responsiveness.toFixed(1))}`;
    dom.biteRateOutput.value = `${CONFIG.zombies.bitesPerSecond.toFixed(1)} / s`;
    dom.infectionOutput.value = String(CONFIG.survivors.bitesToInfect);
    dom.speedOutput.value = `${Math.round(CONFIG.zombies.speed)} px / s`;
    dom.gunshotRadiusOutput.value = `${Math.round(CONFIG.zombies.activation.gunshotRadius)} px`;
    dom.killRadiusOutput.value = `${Math.round(CONFIG.zombies.activation.killRadius)} px`;
    dom.chainRadiusOutput.value = `${Math.round(CONFIG.zombies.activation.chainRadius)} px`;
    dom.civilianSightOutput.value = `${Math.round(CONFIG.zombies.activation.civilianDetectionRadius)} px`;
    dom.deactivationDelayOutput.value = `${Number(CONFIG.zombies.activation.deactivationDelay).toFixed(1)} s`;
    dom.spawnCountInput.value = String(CONFIG.zombies.initialWave);
    dom.spawnCountOutput.value = String(CONFIG.zombies.initialWave);
    dom.civilianSpeedInput.value = String(CONFIG.civilians.speed);
    dom.civilianSpeedOutput.value = `${CONFIG.civilians.speed.toFixed(1)}x`;
    dom.visibilityRadiusInput.value = String(CONFIG.visual.visibilityRadius);
    dom.visibilityRadiusOutput.value = `${Math.round(CONFIG.visual.visibilityRadius)} px`;
    dom.threatScaleInput.value = String(CONFIG.gameplay.threatScale);
    dom.threatScaleOutput.value = `${CONFIG.gameplay.threatScale.toFixed(1)}x`;
    dom.threatLevelSelect.value = String(CONFIG.gameplay.threatOverride);
    const labels = ["Auto", "Low", "Rising", "High", "Severe", "Critical"];
    dom.threatLevelSelectOutput.value = labels[CONFIG.gameplay.threatOverride];

    setRangeFill(dom.fireRateInput);
    setRangeFill(dom.magazineInput);
    setRangeFill(dom.reloadInput);
    setRangeFill(dom.aimSpeedInput);
    setRangeFill(dom.groupSpeedInput);
    setRangeFill(dom.spacingInput);
    setRangeFill(dom.responseInput);
    setRangeFill(dom.biteRateInput);
    setRangeFill(dom.infectionInput);
    setRangeFill(dom.speedInput);
    setRangeFill(dom.gunshotRadiusInput);
    setRangeFill(dom.killRadiusInput);
    setRangeFill(dom.chainRadiusInput);
    setRangeFill(dom.civilianSightInput);
    setRangeFill(dom.deactivationDelayInput);
    setRangeFill(dom.spawnCountInput);
    setRangeFill(dom.civilianSpeedInput);
    setRangeFill(dom.visibilityRadiusInput);
    setRangeFill(dom.threatScaleInput);
    updateStartRuleText();
  }

  function updateStartRuleText() {
    dom.ruleFireRate.innerHTML = `${formatRuleNumber(CONFIG.survivors.shotsPerSecond)}<small>/s</small>`;
    dom.ruleInfection.textContent = String(CONFIG.survivors.bitesToInfect);
    dom.ruleBiteRate.innerHTML = `${formatRuleNumber(CONFIG.zombies.bitesPerSecond)}<small>/s</small>`;
  }

  function formatRuleNumber(value) {
    return Number(value.toFixed(1)).toString();
  }

  function resetTuning() {
    CONFIG.survivors.shotsPerSecond = DEFAULT_CONFIG.survivors.shotsPerSecond;
    CONFIG.survivors.bitesToInfect = DEFAULT_CONFIG.survivors.bitesToInfect;
    CONFIG.survivors.weapon.magazineSize = DEFAULT_CONFIG.survivors.weapon.magazineSize;
    CONFIG.survivors.weapon.reloadSeconds = DEFAULT_CONFIG.survivors.weapon.reloadSeconds;
    CONFIG.survivors.group.speed = DEFAULT_CONFIG.survivors.group.speed;
    CONFIG.survivors.group.formationSpacing = DEFAULT_CONFIG.survivors.group.formationSpacing;
    CONFIG.survivors.group.responsiveness = DEFAULT_CONFIG.survivors.group.responsiveness;
    CONFIG.zombies.bitesPerSecond = DEFAULT_CONFIG.zombies.bitesPerSecond;
    CONFIG.zombies.speed = DEFAULT_CONFIG.zombies.speed;
    CONFIG.zombies.initialWave = DEFAULT_CONFIG.zombies.initialWave;
    CONFIG.zombies.maxGroupSize = DEFAULT_CONFIG.zombies.maxGroupSize;
    CONFIG.civilians.speed = DEFAULT_CONFIG.civilians.speed;
    CONFIG.visual.darkMode = DEFAULT_CONFIG.visual.darkMode;
    CONFIG.visual.visibilityRadius = DEFAULT_CONFIG.visual.visibilityRadius;
    CONFIG.gameplay.threatScale = DEFAULT_CONFIG.gameplay.threatScale;
    CONFIG.gameplay.threatOverride = DEFAULT_CONFIG.gameplay.threatOverride;
    CONFIG.workers.enabled = DEFAULT_CONFIG.workers.enabled;
    workersEnabled = CONFIG.workers.enabled;
    darkMode = CONFIG.visual.darkMode;
    dayMode = !darkMode;
    applyDayNight();
    syncDarkModeUI();
    syncWorkersUI();
    workerAssignment = "steel";
    syncWorkerAssignmentUI();
    syncTuningUI();
  }

  function loadBestTime() {
    try {
      const stored = Number(window.localStorage.getItem("zombdot.bestTime"));
      return Number.isFinite(stored) && stored > 0 ? stored : 0;
    } catch {
      return 0;
    }
  }

  function saveBestTime(value) {
    try {
      window.localStorage.setItem("zombdot.bestTime", String(value));
    } catch {
      // Local storage can be unavailable in hardened/privacy contexts.
    }
  }

  function bindEvents() {
    dom.startButton.addEventListener("click", () => startGame("survival"));
    dom.buildButton.addEventListener("click", startBuildMode);
    if (dom.map1Button) dom.map1Button.addEventListener("click", startMap1);

    if (dom.recruitClose) dom.recruitClose.addEventListener("click", closeRecruitmentMenu);
    if (dom.recruitSoldierBtn) dom.recruitSoldierBtn.addEventListener("click", () => recruitSoldier("soldier"));
    if (dom.recruitSniperBtn) dom.recruitSniperBtn.addEventListener("click", () => recruitSoldier("sniper"));
    if (dom.recruitFlamethrowerBtn) dom.recruitFlamethrowerBtn.addEventListener("click", () => recruitSoldier("flamethrower"));

    // Build palette
    if (dom.buildPalette) {
      dom.buildPalette.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-tool]");
        if (!btn) return;
        buildTool = btn.dataset.tool;
        for (const b of dom.buildPalette.querySelectorAll("[data-tool]")) {
          b.setAttribute("aria-pressed", b.dataset.tool === buildTool ? "true" : "false");
        }
      });
    }

    // Build mode: place and drag objects
    dom.canvas.addEventListener("mousedown", (event) => {
      if (mode !== "build") return;
      if (event.button !== 0) return;
      const rect = dom.canvas.getBoundingClientRect();
      const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);

      // Try select existing object
      const hit = buildObjects.slice().reverse().find((o) => {
        return Math.abs(world.x - o.x) <= o.w / 2 && Math.abs(world.y - o.y) <= o.h / 2;
      });
      if (hit) {
        buildSelectedId = hit.id;
        buildDragging = true;
        buildDragOffset = { x: world.x - hit.x, y: world.y - hit.y };
        event.preventDefault();
        return;
      }

      // If clicking on an existing safe zone or spawner, don't place new
      for (const zone of safeZones) {
        const d = Math.hypot(world.x - zone.x, world.y - zone.y);
        if (d <= zone.radius) {
          event.preventDefault();
          return;
        }
      }
      for (const sp of zombieSpawners) {
        if (Math.abs(world.x - sp.x) <= sp.w / 2 && Math.abs(world.y - sp.y) <= sp.h / 2) {
          event.preventDefault();
          return;
        }
      }

      // Place new object
      if (buildTool === "safe") {
        const szRadius = CONFIG.safeZones.radius;
        const segMax = CONFIG.safeZones.wallHealth;
        const segments = [];
        const segmentCount = 12;
        for (let s = 0; s < segmentCount; s += 1) {
          const centerAngle = -Math.PI / 2 + (s / segmentCount) * TAU;
          segments.push({
            index: s,
            isGate: s === 0,
            angleStart: centerAngle - TAU / (segmentCount * 2),
            angleEnd: centerAngle + TAU / (segmentCount * 2),
            centerAngle,
            health: segMax,
            maxHealth: segMax,
            seed: (safeZones.length + 1) * 13.7 + s * 4.3,
          });
        }
        safeZones.push({
          id: idSequence++,
          x: world.x,
          y: world.y,
          radius: szRadius,
          wallHealth: CONFIG.safeZones.wallHealth,
          maxWallHealth: CONFIG.safeZones.wallHealth,
          lastSyncedWallHealth: CONFIG.safeZones.wallHealth,
          gateOpen: 0,
          segments,
          capacity: CONFIG.safeZones.capacity,
          civilians: [],
          recruits: [],
          defenders: [],
          workers: [],
          turrets: [],
        });
        event.preventDefault();
      } else if (buildTool === "spawner") {
        zombieSpawners.push({
          id: idSequence++,
          x: world.x,
          y: world.y,
          w: 60,
          h: 60,
          timer: (CONFIG.zombies.waveIntervals && CONFIG.zombies.waveIntervals[0]) || 30,
          interval: 3,
        });
        event.preventDefault();
      } else if (buildTool === "wall") {
        const wallSize = 36;
        const wallX = Math.floor(world.x / wallSize) * wallSize + wallSize / 2;
        const wallY = Math.floor(world.y / wallSize) * wallSize + wallSize / 2;
        buildObjects.push({
          id: idSequence++,
          type: "wall",
          x: wallX,
          y: wallY,
          w: wallSize,
          h: wallSize,
        });
        buildSelectedId = buildObjects[buildObjects.length - 1].id;
        event.preventDefault();
      } else if (buildTool === "tree") {
        buildObjects.push({
          id: idSequence++,
          type: "tree",
          x: world.x,
          y: world.y,
          w: 40,
          h: 40,
        });
        buildSelectedId = buildObjects[buildObjects.length - 1].id;
        event.preventDefault();
      } else if (buildTool === "rescue") {
        // Rescue zones are visual markers for now
        buildObjects.push({
          id: idSequence++,
          type: "rescue",
          x: world.x,
          y: world.y,
          w: 120,
          h: 120,
        });
        buildSelectedId = buildObjects[buildObjects.length - 1].id;
        event.preventDefault();
      } else if (buildTool === "select") {
        // handled below
      }
    });

    dom.canvas.addEventListener("mousemove", (event) => {
      const rect = dom.canvas.getBoundingClientRect();
      lastCanvasPointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    });

    dom.canvas.addEventListener("mousemove", (event) => {
      if (mode !== "build") return;
      const rect = dom.canvas.getBoundingClientRect();
      const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);

      if (buildDragging && buildSelectedId != null) {
        const obj = buildObjects.find((o) => o.id === buildSelectedId);
        if (obj) {
          obj.x = world.x - buildDragOffset.x;
          obj.y = world.y - buildDragOffset.y;
          if (obj.type === "wall") {
            obj.x = Math.floor(obj.x / 36) * 36 + 18;
            obj.y = Math.floor(obj.y / 36) * 36 + 18;
          }
        }
        return;
      }

      if (buildTool === "wall") {
        const wallSize = 36;
        buildPreview = {
          x: Math.floor(world.x / wallSize) * wallSize + wallSize / 2,
          y: Math.floor(world.y / wallSize) * wallSize + wallSize / 2,
          w: wallSize,
          h: wallSize,
          type: buildTool,
        };
      } else {
        buildPreview = { x: world.x, y: world.y, w: 120, h: 120, type: buildTool };
      }
    });

    dom.canvas.addEventListener("mouseup", (event) => {
      if (mode !== "build") return;
      buildDragging = false;
    });

    dom.canvas.addEventListener("mouseleave", () => {
      if (mode !== "build") return;
      buildPreview = null;
      buildDragging = false;
    });

    document.addEventListener("keydown", (event) => {
      if (mode !== "build") return;
      if (event.key === "Delete" || event.key === "Backspace") {
        if (buildSelectedZoneId != null) {
          safeZones = safeZones.filter((z) => z.id !== buildSelectedZoneId);
          buildSelectedZoneId = null;
          if (dom.buildSizePanel) dom.buildSizePanel.hidden = true;
        } else if (buildSelectedSpawnerId != null) {
          zombieSpawners = zombieSpawners.filter((s) => s.id !== buildSelectedSpawnerId);
          buildSelectedSpawnerId = null;
          if (dom.buildSizePanel) dom.buildSizePanel.hidden = true;
        } else if (buildSelectedId != null) {
          buildObjects = buildObjects.filter((o) => o.id !== buildSelectedId);
          buildSelectedId = null;
        }
      }
    });

    if (dom.buildSizeSlider) {
      dom.buildSizeSlider.addEventListener("input", () => {
        const v = Number(dom.buildSizeSlider.value);
        if (dom.buildSizeValue) dom.buildSizeValue.textContent = String(v);
        const zone = safeZones.find((z) => z.id === buildSelectedZoneId);
        if (zone) {
          zone.radius = v;
        } else {
          const sp = zombieSpawners.find((s) => s.id === buildSelectedSpawnerId);
          if (sp) {
            sp.w = v;
            sp.h = v;
          } else {
            const obj = buildObjects.find((o) => o.id === buildSelectedId);
            if (obj) {
              obj.w = v;
              obj.h = v;
            }
          }
        }
      });
    }



    dom.retryButton.addEventListener("click", restartCurrentRun);
    dom.resumeButton.addEventListener("click", () => togglePause(false));
    dom.mainMenuButton.addEventListener("click", goToMainMenu);
    dom.pauseButton.addEventListener("click", () => togglePause());
    dom.restartButton.addEventListener("click", restartCurrentRun);

    dom.pauseScreen.addEventListener("click", (event) => {
      if (event.target === dom.pauseScreen) togglePause(false);
    });

    dom.settingsButton.addEventListener("click", toggleTuning);
    dom.closeTuningButton.addEventListener("click", closeTuning);
    dom.gameOverTuneButton.addEventListener("click", openTuning);
    dom.resetTuningButton.addEventListener("click", resetTuning);

    dom.formationButton.addEventListener("click", () => {
      if (dom.formationMenu.hidden) openFormationMenu();
      else closeFormationMenu();
    });

    if (dom.commandBar) {
      dom.commandBar.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-command]");
        if (!btn || !activeSquad) return;
        activeSquad.command = btn.dataset.command;
        if (activeSquad.path) { activeSquad.path = []; activeSquad.pathIndex = 0; }
        syncCommandUI();
        showEvent(`${activeSquad.name}: ${activeSquad.command}`);
      });
    }

    dom.dayNightToggle.addEventListener("click", toggleDayNight);
    dom.darkModeButton.addEventListener("click", toggleDarkMode);
    dom.workersToggleButton.addEventListener("click", toggleWorkers);
    const steelBtn = document.getElementById("workerSteelButton");
    const gasBtn = document.getElementById("workerGasButton");
    if (steelBtn) steelBtn.addEventListener("click", () => setWorkerAssignment("steel"));
    if (gasBtn) gasBtn.addEventListener("click", () => setWorkerAssignment("gas"));
    const lampBtn = document.getElementById("lampButton");
    if (lampBtn) lampBtn.addEventListener("click", placeLamp);

    dom.zoomControl.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-zoom]");
      if (!btn) return;
      const level = Number(btn.dataset.zoom);
      const p = lastCanvasPointer;
      if (p.x != null && p.y != null && p.x >= 0 && p.x <= viewW && p.y >= 0 && p.y <= viewH) {
        zoomAt(level, p.x, p.y);
      } else {
        setZoomLevel(level);
      }
    });

    dom.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const rect = dom.canvas.getBoundingClientRect();
        let delta = event.deltaY;
        if (event.deltaMode === 1) delta *= 16;
        delta = clamp(delta, -300, 300);
        zoomAt(
          camera.targetZoom * Math.exp(-delta * CONFIG.camera.wheelSensitivity),
          event.clientX - rect.left,
          event.clientY - rect.top
        );
      },
      { passive: false }
    );

    dom.deploySoldiersButton.addEventListener("click", toggleDeployMenu);
    dom.deployCloseButton.addEventListener("click", closeDeployMenu);

    dom.deployZoneList.addEventListener("click", (event) => {
      const stepBtn = event.target.closest("[data-step-zone]");
      if (stepBtn) {
        const zoneId = Number(stepBtn.dataset.stepZone);
        const delta = Number(stepBtn.dataset.step) || 0;
        const zone = safeZones.find((z) => z.id === zoneId);
        if (!zone || zone.defenders.length === 0) return;
        const current = clamp(deploySelectionByZone.get(zoneId) || 1, 1, zone.defenders.length);
        const next = clamp(current + delta, 1, zone.defenders.length);
        deploySelectionByZone.set(zoneId, next);
        syncDeployUI(true);
        return;
      }

      const confirmBtn = event.target.closest("[data-confirm-zone]");
      if (confirmBtn) {
        const zoneId = Number(confirmBtn.dataset.confirmZone);
        const zone = safeZones.find((z) => z.id === zoneId);
        if (!zone || zone.defenders.length === 0) return;
        const qty = clamp(deploySelectionByZone.get(zoneId) || 1, 1, zone.defenders.length);
        deploySoldiersFromZone(zoneId, qty);
        return;
      }

      const allBtn = event.target.closest("[data-all-zone]");
      if (allBtn) {
        const zoneId = Number(allBtn.dataset.allZone);
        const zone = safeZones.find((z) => z.id === zoneId);
        if (!zone || zone.defenders.length === 0) return;
        deploySoldiersFromZone(zoneId, zone.defenders.length);
      }
    });

    dom.formationMenu.addEventListener("click", (event) => {
      const option = event.target.closest("[data-formation]");
      if (!option) return;
      setFormationStyle(option.dataset.formation);
    });

    document.addEventListener("pointerdown", (event) => {
      if (dom.formationDock.contains(event.target)) return;
      if (!dom.formationMenu.hidden) closeFormationMenu();
      if (!dom.deployMenu.hidden) closeDeployMenu();
    });

    dom.fireRateInput.addEventListener("input", () => {
      CONFIG.survivors.shotsPerSecond = Number(dom.fireRateInput.value);
      dom.fireRateOutput.value = `${CONFIG.survivors.shotsPerSecond.toFixed(1)} / s`;
      setRangeFill(dom.fireRateInput);
      updateStartRuleText();
    });

    dom.magazineInput.addEventListener("input", () => {
      const size = Math.max(1, Math.floor(Number(dom.magazineInput.value)));
      CONFIG.survivors.weapon.magazineSize = size;
      dom.magazineOutput.value = `${size} shot${size === 1 ? "" : "s"}`;
      setRangeFill(dom.magazineInput);

      for (const survivor of survivors) {
        if (!survivor.reloading && survivor.shotsInMagazine > size) {
          survivor.shotsInMagazine = size;
        }
      }
    });

    dom.reloadInput.addEventListener("input", () => {
      CONFIG.survivors.weapon.reloadSeconds = Number(dom.reloadInput.value);
      dom.reloadOutput.value = `${weaponReloadSeconds().toFixed(1)} s`;
      setRangeFill(dom.reloadInput);
    });

    dom.aimSpeedInput.addEventListener("input", () => {
      CONFIG.survivors.weapon.aimSpeed = Number(dom.aimSpeedInput.value);
      dom.aimSpeedOutput.value = `${Number(CONFIG.survivors.weapon.aimSpeed).toFixed(1)}`;
      setRangeFill(dom.aimSpeedInput);
    });

    dom.groupSpeedInput.addEventListener("input", () => {
      CONFIG.survivors.group.speed = Number(dom.groupSpeedInput.value);
      dom.groupSpeedOutput.value = `${Math.round(CONFIG.survivors.group.speed)} px / s`;
      setRangeFill(dom.groupSpeedInput);
    });

    dom.spacingInput.addEventListener("input", () => {
      CONFIG.survivors.group.formationSpacing = Number(dom.spacingInput.value);
      dom.spacingOutput.value = `${Math.round(CONFIG.survivors.group.formationSpacing)} px`;
      setRangeFill(dom.spacingInput);
      applyFormationTargets();
      clampGroupToBounds();
    });

    dom.responseInput.addEventListener("input", () => {
      CONFIG.survivors.group.responsiveness = Number(dom.responseInput.value);
      dom.responseOutput.value = `${Number(CONFIG.survivors.group.responsiveness.toFixed(1))}`;
      setRangeFill(dom.responseInput);
    });

    dom.biteRateInput.addEventListener("input", () => {
      CONFIG.zombies.bitesPerSecond = Number(dom.biteRateInput.value);
      dom.biteRateOutput.value = `${CONFIG.zombies.bitesPerSecond.toFixed(1)} / s`;
      setRangeFill(dom.biteRateInput);
      updateStartRuleText();
    });

    dom.infectionInput.addEventListener("input", () => {
      CONFIG.survivors.bitesToInfect = Number(dom.infectionInput.value);
      dom.infectionOutput.value = String(CONFIG.survivors.bitesToInfect);
      setRangeFill(dom.infectionInput);
      updateStartRuleText();
    });

    dom.speedInput.addEventListener("input", () => {
      CONFIG.zombies.speed = Number(dom.speedInput.value);
      dom.speedOutput.value = `${Math.round(CONFIG.zombies.speed)} px / s`;
      setRangeFill(dom.speedInput);
    });

    dom.gunshotRadiusInput.addEventListener("input", () => {
      CONFIG.zombies.activation.gunshotRadius = Number(dom.gunshotRadiusInput.value);
      dom.gunshotRadiusOutput.value = `${Math.round(CONFIG.zombies.activation.gunshotRadius)} px`;
      setRangeFill(dom.gunshotRadiusInput);
    });

    dom.killRadiusInput.addEventListener("input", () => {
      CONFIG.zombies.activation.killRadius = Number(dom.killRadiusInput.value);
      dom.killRadiusOutput.value = `${Math.round(CONFIG.zombies.activation.killRadius)} px`;
      setRangeFill(dom.killRadiusInput);
    });

    dom.chainRadiusInput.addEventListener("input", () => {
      CONFIG.zombies.activation.chainRadius = Number(dom.chainRadiusInput.value);
      dom.chainRadiusOutput.value = `${Math.round(CONFIG.zombies.activation.chainRadius)} px`;
      setRangeFill(dom.chainRadiusInput);
    });

    dom.civilianSightInput.addEventListener("input", () => {
      CONFIG.zombies.activation.civilianDetectionRadius = Number(dom.civilianSightInput.value);
      dom.civilianSightOutput.value = `${Math.round(CONFIG.zombies.activation.civilianDetectionRadius)} px`;
      setRangeFill(dom.civilianSightInput);
    });

    dom.deactivationDelayInput.addEventListener("input", () => {
      CONFIG.zombies.activation.deactivationDelay = Number(dom.deactivationDelayInput.value);
      dom.deactivationDelayOutput.value = `${Number(CONFIG.zombies.activation.deactivationDelay).toFixed(1)} s`;
      setRangeFill(dom.deactivationDelayInput);
    });

    dom.spawnCountInput.addEventListener("input", () => {
      const v = Math.max(5, Math.floor(Number(dom.spawnCountInput.value)));
      CONFIG.zombies.initialWave = v;
      CONFIG.zombies.maxGroupSize = v;
      dom.spawnCountOutput.value = String(v);
      setRangeFill(dom.spawnCountInput);
    });

    dom.civilianSpeedInput.addEventListener("input", () => {
      CONFIG.civilians.speed = Number(dom.civilianSpeedInput.value);
      dom.civilianSpeedOutput.value = `${CONFIG.civilians.speed.toFixed(1)}x`;
      setRangeFill(dom.civilianSpeedInput);
    });

    dom.visibilityRadiusInput.addEventListener("input", () => {
      CONFIG.visual.visibilityRadius = Number(dom.visibilityRadiusInput.value);
      dom.visibilityRadiusOutput.value = `${Math.round(CONFIG.visual.visibilityRadius)} px`;
      setRangeFill(dom.visibilityRadiusInput);
    });

    dom.threatScaleInput.addEventListener("input", () => {
      CONFIG.gameplay.threatScale = Number(dom.threatScaleInput.value);
      dom.threatScaleOutput.value = `${CONFIG.gameplay.threatScale.toFixed(1)}x`;
      setRangeFill(dom.threatScaleInput);
    });

    dom.threatLevelSelect.addEventListener("change", () => {
      CONFIG.gameplay.threatOverride = Number(dom.threatLevelSelect.value);
      const labels = ["Auto", "Low", "Rising", "High", "Severe", "Critical"];
      dom.threatLevelSelectOutput.value = labels[CONFIG.gameplay.threatOverride];
      syncHud(true);
    });

    window.addEventListener("resize", resize);

    dom.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    // Recruitment station click (survival mode).
    dom.canvas.addEventListener("mousedown", (event) => {
      if (mode !== "playing") return;
      if (event.button !== 0) return;
      const rect = dom.canvas.getBoundingClientRect();
      const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      for (const zone of safeZones) {
        const rs = zone.recruitmentStation;
        if (!rs) continue;
        if (Math.abs(world.x - rs.x) <= rs.w / 2 && Math.abs(world.y - rs.y) <= rs.h / 2) {
          openRecruitmentMenu(zone);
          event.preventDefault();
          return;
        }
      }
    });

    // Click on a safe zone to lock the camera onto it. Unlock by moving.
    dom.canvas.addEventListener("mousedown", (event) => {
      if (mode !== "playing") return;
      if (event.button !== 0) return;
      const rect = dom.canvas.getBoundingClientRect();
      const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      for (const zone of safeZones) {
        const hw = (zone.w || zone.radius * 2) / 2;
        const hh = (zone.h || zone.radius * 2) / 2;
        if (Math.abs(world.x - zone.x) <= hw && Math.abs(world.y - zone.y) <= hh) {
          // Don't lock when clicking the recruitment station.
          const rs = zone.recruitmentStation;
          if (rs && Math.abs(world.x - rs.x) <= rs.w / 2 && Math.abs(world.y - rs.y) <= rs.h / 2) {
            return;
          }
          if (camera.lockedZone === zone) {
            camera.lockedZone = null;
          } else {
            camera.lockedZone = zone;
          }
          event.preventDefault();
          return;
        }
      }
      // Click elsewhere unlocks.
      camera.lockedZone = null;
    });

    // Build mode: drag safe zones
    dom.canvas.addEventListener("mousedown", (event) => {
      if (mode !== "build") return;
      if (event.button !== 0) return;
      const rect = dom.canvas.getBoundingClientRect();
      const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      // Check if clicking on a safe zone
      let hit = null;
      let hitType = null;
      for (const zone of safeZones) {
        const d = Math.hypot(world.x - zone.x, world.y - zone.y);
        if (d <= zone.radius) {
          hit = zone;
          hitType = "zone";
          break;
        }
      }
      // Check spawners (rectangular)
      if (!hit) {
        for (const sp of zombieSpawners) {
          if (Math.abs(world.x - sp.x) <= sp.w / 2 && Math.abs(world.y - sp.y) <= sp.h / 2) {
            hit = sp;
            hitType = "spawner";
            break;
          }
        }
      }
      if (hit) {
        buildDraggingZone = true;
        if (hitType === "zone") {
          buildSelectedZoneId = hit.id;
          buildSelectedSpawnerId = null;
        } else {
          buildSelectedSpawnerId = hit.id;
          buildSelectedZoneId = null;
        }
        buildDragZoneOffset = { x: world.x - hit.x, y: world.y - hit.y };
        // Show size panel next to the object
        if (dom.buildSizePanel) {
          dom.buildSizePanel.hidden = false;
          const sp = worldToScreen(hit.x, hit.y);
          dom.buildSizePanel.style.left = (sp.x + 20) + "px";
          dom.buildSizePanel.style.top = (sp.y - 20) + "px";
          if (dom.buildSizeSlider) {
            const size = hitType === "zone" ? hit.radius : Math.max(hit.w, hit.h);
            dom.buildSizeSlider.value = String(size);
            if (dom.buildSizeValue) dom.buildSizeValue.textContent = String(size);
          }
        }
        event.preventDefault();
        return;
      }
      // Clicking elsewhere hides the panel
      buildSelectedZoneId = null;
      buildSelectedSpawnerId = null;
      if (dom.buildSizePanel) dom.buildSizePanel.hidden = true;
    });
    dom.canvas.addEventListener("mousemove", (event) => {
      if (mode !== "build" || !buildDraggingZone) return;
      const rect = dom.canvas.getBoundingClientRect();
      const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
      if (buildSelectedZoneId != null) {
        const zone = safeZones.find((z) => z.id === buildSelectedZoneId);
        if (zone) {
          zone.x = world.x - buildDragZoneOffset.x;
          zone.y = world.y - buildDragZoneOffset.y;
          if (dom.buildSizePanel) {
            const sp = worldToScreen(zone.x, zone.y);
            dom.buildSizePanel.style.left = (sp.x + 20) + "px";
            dom.buildSizePanel.style.top = (sp.y - 20) + "px";
          }
        }
      } else if (buildSelectedSpawnerId != null) {
        const sp = zombieSpawners.find((s) => s.id === buildSelectedSpawnerId);
        if (sp) {
          sp.x = world.x - buildDragZoneOffset.x;
          sp.y = world.y - buildDragZoneOffset.y;
          if (dom.buildSizePanel) {
            const sp2 = worldToScreen(sp.x, sp.y);
            dom.buildSizePanel.style.left = (sp2.x + 20) + "px";
            dom.buildSizePanel.style.top = (sp2.y - 20) + "px";
          }
        }
      }
    });
    dom.canvas.addEventListener("mouseup", (event) => {
      if (mode !== "build") return;
      buildDraggingZone = false;
    });

    dom.canvas.addEventListener("mousedown", (event) => {
      if (event.button !== 2) return;
      event.preventDefault();
      isDrawingPath = true;
      pathDrawMoved = false;
      pathDrawStart = { x: event.clientX, y: event.clientY };
      drawnPath = [];
      const rect = dom.canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      drawnPath.push(screenToWorld(sx, sy));
    });

    dom.canvas.addEventListener("mousemove", (event) => {
      if (!isDrawingPath) return;
      const dx = event.clientX - pathDrawStart.x;
      const dy = event.clientY - pathDrawStart.y;
      if (Math.hypot(dx, dy) > 6) pathDrawMoved = true;
      if (!pathDrawMoved) return;
      const rect = dom.canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const w = screenToWorld(sx, sy);
      const last = drawnPath[drawnPath.length - 1];
      if (!last || Math.hypot(w.x - last.x, w.y - last.y) > 8) {
        drawnPath.push(w);
      }
    });

    dom.canvas.addEventListener("mouseup", (event) => {
      if (event.button !== 2 || !isDrawingPath) return;
      isDrawingPath = false;
      const rect = dom.canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const world = screenToWorld(sx, sy);
      const last = drawnPath[drawnPath.length - 1];
      if (last && Math.hypot(world.x - last.x, world.y - last.y) > 4) {
        drawnPath.push(world);
      }

      if (drawnPath.length >= 2) {
        // Follow the drawn path.
        if (activeSquad) {
          activeSquad.path = drawnPath.slice();
          activeSquad.pathIndex = 0;
          showEvent(`${activeSquad.name}: following path`);
        }
        drawnPath = [];
      } else {
        // Treat as a right-click selection.
        drawnPath = [];
        let best = null;
        let bestDist = 60 * 60;
        const candidates = [...survivors];
        for (const squad of squads) {
          if (squad.survivors) candidates.push(...squad.survivors);
        }
        for (const s of candidates) {
          if (!s.alive) continue;
          const d2 = (s.x - world.x) ** 2 + (s.y - world.y) ** 2;
          if (d2 < bestDist) {
            bestDist = d2;
            best = s;
          }
        }
        if (!best) return;
        let targetSquad = activeSquad;
        if (!survivors.includes(best)) {
          for (const squad of squads) {
            if (squad.survivors && squad.survivors.includes(best)) {
              targetSquad = squad;
              break;
            }
          }
        }
        if (targetSquad) switchToSquad(targetSquad);
      }
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isFormField =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      const key = event.key.toLowerCase();

      if (!isFormField && MOVEMENT_KEYS.has(key)) {
        if (mode === "playing") {
          event.preventDefault();
          pressedKeys.add(key);
        }
        return;
      }

      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "BUTTON" || target.tagName === "TEXTAREA")
      ) {
        if (event.key === "Escape") {
          if (!dom.formationMenu.hidden) closeFormationMenu();
          else if (!dom.tuningPanel.hidden) closeTuning();
          else if (mode === "paused") togglePause(false);
        }
        return;
      }

      if (key === "escape") {
        if (!dom.formationMenu.hidden) {
          closeFormationMenu();
        } else if (!dom.tuningPanel.hidden) {
          closeTuning();
        } else if (mode === "paused") {
          togglePause(false);
        } else if (mode === "playing") {
          togglePause(true);
        }
        return;
      }

      if (mode === "playing" && FORMATION_IDS[Number(key) - 1]) {
        setFormationStyle(FORMATION_IDS[Number(key) - 1]);
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (mode === "menu") startGame("survival");
        else if (mode === "playing" || mode === "paused") togglePause();
        else if (mode === "gameover" && !dom.gameOverScreen.hidden) restartCurrentRun();
        return;
      }

      if (event.key.toLowerCase() === "r" && mode !== "menu") {
        restartCurrentRun();
        return;
      }

      if (event.key.toLowerCase() === "c") {
        toggleTuning();
      }
      if (event.key.toLowerCase() === "v") {
        toggleDarkMode();
      }
    });

    document.addEventListener("keyup", (event) => {
      pressedKeys.delete(event.key.toLowerCase());
    });

    window.addEventListener("blur", () => {
      pressedKeys.clear();
      resetGroupInput();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && mode === "playing") togglePause(true);
    });
  }

  function resize() {
    const rect = dom.canvas.getBoundingClientRect();

    viewW = Math.max(320, rect.width || window.innerWidth);
    viewH = Math.max(320, rect.height || window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    dom.canvas.width = Math.round(viewW * dpr);
    dom.canvas.height = Math.round(viewH * dpr);
    if (fogCanvas) {
      fogCanvas.width = Math.round(viewW * dpr);
      fogCanvas.height = Math.round(viewH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    backgroundGradient = ctx.createRadialGradient(
      viewW * 0.5,
      viewH * 0.5,
      10,
      viewW * 0.5,
      viewH * 0.5,
      Math.max(viewW, viewH) * 0.76
    );
    applyDayNight();

    clampCameraToWorld();
    initMotes();

    if (mode === "menu") {
      placeSurvivors();
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(from, to, amount) {
    return from + (to - from) * amount;
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  // ---------------------------------------------------------------------------
  // Public debug / integration surface
  // ---------------------------------------------------------------------------
  window.ZOMBDOT = {
    config: CONFIG,
    defaults: DEFAULT_CONFIG,
    start: startGame,
    startMap1: startMap1,
    pause: () => togglePause(true),
    resume: () => togglePause(false),
    spawnWave,
    spawnZombieAt: spawnZombieDirect,
    setWorkerAssignment: setWorkerAssignment,
    addSteel: (n) => { steel += Number(n) || 0; syncHud(true); return steel; },
    addGas: (n) => { gas += Number(n) || 0; syncHud(true); return gas; },
    placeLamp,
    _addFlamethrower: () => {
      const s = createSoldier(formation.x + 24, formation.y, "flamethrower");
      survivors.push(s);
      return s.id;
    },
    _updateLamps: (dt) => { updateLamps(dt); return gas; },
    _updateZombieSpawners: (dt) => { updateZombieSpawners(dt); return zombies.length; },
    _spotWalls: () => buildObjects.filter((o) => o.civilianSpotWall).map((o) => ({ x: o.x, y: o.y, spotId: o.spotId })),
    _trees: () => trees.map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), trunk: t.trunkRadius, canopy: t.canopyRadius, type: t.type })),
    _setCamera: (x, y) => { camera.x = Number(x); camera.y = Number(y); clampCameraToWorld(); return { x: camera.x, y: camera.y, zoom: camera.zoom }; },
    _updateCivilians: (dt = 0.016) => { updateCivilians(dt); return {len: carriedCivilians.length, pos: carriedCivilians.map(c=>({x:c.x,y:c.y}))}; },
    _updateCamera: (dt = 0.016) => { updateCamera(dt); return camera.zoom; },
    _counts: () => ({zombies:zombies.length, particles:particles.length, texts:texts.length, rings:rings.length, beams:beams.length, civilians:civilians.length, carried:carriedCivilians.length}),
    _civilians: () => civilians.map(c=>({x:Math.round(c.x),y:Math.round(c.y)})),
    setFormation: setFormationStyle,
    setZoomLevel: setZoomLevel,
    deploySoldiers: deploySoldiersFromZone,
    moveGroup: (x, y) => {
      formation.x = Number(x);
      formation.y = Number(y);
      formation.vx = 0;
      formation.vy = 0;
      clampGroupToBounds();
    },
    getState: () => ({
      mode,
      mapId: currentMapId,
      time: game.time,
      kills: game.kills,
      infected: game.infected,
      bestTime,
      group: {
        x: Math.round(formation.x),
        y: Math.round(formation.y),
        vx: Number(formation.vx.toFixed(1)),
        vy: Number(formation.vy.toFixed(1)),
        facing: Number(formation.facing.toFixed(3)),
        radius: Math.round(formation.radius),
        style: formation.style,
        input: {
          x: Number(groupInput.x.toFixed(2)),
          y: Number(groupInput.y.toFixed(2)),
        },
        formations: FORMATION_IDS,
      },
      obstacles: obstacles.map((obstacle) => ({
        kind: obstacle.kind,
        x: Math.round(obstacle.x),
        y: Math.round(obstacle.y),
        radius: Math.round(obstacle.radius),
      })),
      survivors: survivors.map((survivor) => ({
        id: survivor.id,
        type: survivor.type,
        flameActive: !!survivor.flameActive,
        x: Math.round(survivor.x),
        y: Math.round(survivor.y),
        infections: survivor.infections,
        cooldown: Number(survivor.fireCooldown.toFixed(3)),
        flash: Number(survivor.flash.toFixed(3)),
        ammo: survivor.shotsInMagazine,
        reloading: survivor.reloading,
        reloadTimer: Number(survivor.reloadTimer.toFixed(3)),
        aimAngle: Number(survivor.aimAngle.toFixed(3)),
        vx: Number(survivor.vx.toFixed(1)),
        vy: Number(survivor.vy.toFixed(1)),
      })),
      zombies: zombies.map((zombie) => ({
        id: zombie.id,
        x: Math.round(zombie.x),
        y: Math.round(zombie.y),
        radius: Number(zombie.radius.toFixed(2)),
        health: Number((zombie.health || 0).toFixed(0)),
        biting: zombie.isBiting,
        biteTimer: Number(zombie.biteTimer.toFixed(3)),
        converted: zombie.converted,
        activated: !!zombie.activated,
        variant: zombie.variant || "normal",
        biteDamage: zombie.biteDamage || 1,
        speedScale: Number((zombie.speedScale || 1).toFixed(2)),
        deactivateTimer: Number((zombie.deactivateTimer || 0).toFixed(2)),
      })),
      civilians: civilians.map((c) => ({ id: c.id, x: Math.round(c.x), y: Math.round(c.y), infections: c.infections, threshold: c.bitesToInfect })),
      carriedCivilians: carriedCivilians.length,
      carriedCivilianDots: carriedCivilians.map((c) => ({ id: c.id, x: Math.round(c.x), y: Math.round(c.y), vx: Number(c.vx.toFixed(1)), vy: Number(c.vy.toFixed(1)) })),
      deployingCount: deployingUnits.length,
      deployingUnits: deployingUnits.map((u) => ({ id: u.id, x: Math.round(u.x), y: Math.round(u.y), zoneId: u.zoneId })),
      safeZones: safeZones.map((z) => ({ id: z.id, x: Math.round(z.x), y: Math.round(z.y), radius: z.radius, wallHealth: z.wallHealth, gateOpen: Number((z.gateOpen || 0).toFixed(2)), civilians: z.civilians.length, defenders: z.defenders.length, workers: (z.workers || []).length })),
      evacuationZones: evacuationZones.map((z) => ({ id: z.id, x: Math.round(z.x), y: Math.round(z.y), locked: z.locked, remaining: z.civiliansRemaining, completed: z.completed, civiliansInZone: (z.civilians || []).length, bites: z.bites || 0 })),
      steelMines: steelMines.map((m) => ({ id: m.id, x: Math.round(m.x), y: Math.round(m.y) })),
      gasStations: gasStations.map((g) => ({ id: g.id, x: Math.round(g.x), y: Math.round(g.y) })),
      lamps: lamps.map((l) => ({ id: l.id, x: Math.round(l.x), y: Math.round(l.y), radius: l.radius, active: l.active !== false, gasTimer: Number((l.gasTimer || 0).toFixed(1)) })),
      world: { width, height },
      camera: {
        x: Math.round(camera.x),
        y: Math.round(camera.y),
        zoom: Number(camera.zoom.toFixed(3)),
        targetZoom: camera.targetZoom,
      },
      steel: steel,
      gas: gas,
      viewer: {
        width: viewW,
        height: viewH,
        shooterCount: survivors.length + squads.reduce((n, sq) => n + (sq.survivors ? sq.survivors.length : 0), 0),
        zombieCount: zombies.length,
        frameParticles: particles.length,
        activeBeams: beams.length,
      },
    }),
  };

  init();
})();
