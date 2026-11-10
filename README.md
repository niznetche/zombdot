# ZOMBDOT

A zero-dependency canvas survival game built around simple dot characters.

Six blue dots hold an outpost while an endless green horde closes in. You steer
the whole squad with a joystick, choose its formation, and the blue dots
auto-target and fire at nearby zombies. Zombies swarm the nearest blue dot,
bite on contact, and turn it green after enough bites.

## Play

Open `index.html` in a modern browser. No install, build step, or server is
required.

For local development, any static file server also works.

## Mobile and Expo Go

The game stays a single static page with no runtime dependencies. The joystick
and formation menu use Pointer Events with `touch-action: none`, so drag and tap
work on iOS and Android touchscreens. To run it in Expo Go, point a WebView
(for example `react-native-webview`) at the bundled `index.html`, or serve the
page through Expo's web support; the game code itself needs no changes.

## Controls

| Input | Action |
| --- | --- |
| **Space** | Pause / resume (or start from the title screen) |
| **R** | Restart the run |
| **C** | Open / close the live tuning panel |
| **WASD / arrows** | Move the squad (desktop alternative to the joystick) |
| **1 – 4** | Pick circle, line, square, or triangle |
| **Esc** | Close the formation menu / tuning panel, or pause |

Drag the virtual joystick in the bottom-left to move the whole group; tap the
formation button in the bottom-right to change shape. Aiming and firing stay
automatic. The goal is simply to survive as long as possible.

## Group movement and formations

The joystick moves a single central group position, not individual dots. Every
survivor seeks its own slot around that centre, so the squad keeps its shape
while travelling and re-forms automatically when a survivor is infected.

| Formation | Shape |
| --- | --- |
| **Circle** | Evenly spaced ring for balanced coverage |
| **Line** | Horizontal line perpendicular to the travel direction |
| **Square** | Compact rectangular block |
| **Triangle** | Spearhead pointing in the travel direction |

Switching formations, moving, and shooting all happen at the same time. Dots
glide into their new slots, keep a minimum spacing, and add a little positional
wobble so the group does not look robotic.

## Mechanics

| Mechanic | Default |
| --- | --- |
| Starting blue survivors | 6 |
| Survivor fire rate | 2 shots / second each |
| Survivor firing range | 260 px |
| Group move speed | 140 px / second |
| Formation spacing | 34 px between dots |
| Magazine size | 30 shots |
| Reload time | 1 second |
| Zombie speed | 160 px / second |
| Zombie bite rate | 2 bites / second |
| Bites to infect | 3 |
| Shot result | 2 rifle hits kill a zombie; a sniper kills in 1 |

The squad outruns any single zombie, but the horde arrives from every side, so
positioning and formation choice decide how long the blue dots last. Formations
recompute their slots from the current survivor count, so losing a dot never
leaves a hole in the shape.

Rocks block movement and create chokepoints. Survivors and zombies steer around
them and cannot pass through, but rifle shots pass over them. Obstacles are
regenerated at the start of every run.

Each blue dot carries a rifle that visibly tracks the nearest zombie in range.
Every 30 shots the rifle runs dry and reloads for one second, shown by an amber
progress ring around the survivor.

Each blue dot also has an infection counter shown as three arcs around it. A
blue dot that reaches the bite threshold immediately becomes a regular green
zombie and starts attacking the remaining survivors.

The spawn director ramps up over time. Spawn groups grow every five seconds and
the interval between waves shrinks for the first 70 seconds, so the horde
eventually outpaces six survivors.

Sleeping zombies wander aimlessly until they sense a civilian within 200 px, a
gunshot within 500 px, or a zombie death within 500 px. Woken zombies run toward
the disturbance and only bite once they physically reach a target. Each one also
wakes every sleeping zombie within 100 px, so a dense horde can cascade awake in
a chain reaction; a zombie that has already woken never triggers the chain a
second time.

A woken zombie stays active while any valid target is inside its detection range
(civilians 200 px, other targets 500 px). If the current target dies or moves out
of range, it immediately retargets anything else in range. Only when no target
remains does a 1.5-second grace timer start; when it expires the zombie returns
to random wandering and can be woken again later. The timer prevents targets
near the edge of the detection radius from causing rapid on/off switching.
Inactive wanderers steer back toward the playfield and turn away from obstacles
or walls when pinned, so they stay visible instead of drifting off the map. A
zombie that cannot reach the noise that woke it gives up after 6 seconds and
falls back to the normal deactivation flow. Zombies can also detect civilians
sheltering in locked Civilian Spots through the enclosure; they attack the spot's
perimeter, and after 400 bites the spot unlocks and the civilians escape.

## Configuration

All tuning values live in the `CONFIG` object at the top of `game.js`:

```js
const DEFAULT_CONFIG = {
  survivors: {
    startingCount: 6,
    radius: 13,
    shotsPerSecond: 2,
    firingRange: 260,
    bitesToInfect: 3,
    group: {
      speed: 140,
      responsiveness: 12,
      formationSpacing: 34,
      formationEase: 10,
      jitter: 2.6,
      boundaryMargin: 20,
    },
    weapon: {
      name: "Rifle",
      magazineSize: 30,
      reloadSeconds: 1,
    },
  },
  zombies: {
    radius: 8,
    health: 100,
    speed: 160,
    bitesPerSecond: 2.0,
    speedVariance: 0.14,
    spawnMargin: 34,
    initialWave: 0,
    spawnIntervalStart: 9999,
    spawnIntervalMin: 0.18,
    spawnRampSeconds: 70,
    groupGrowthSeconds: 5,
    maxGroupSize: 8,
    scatteredCount: 0,
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
    rockCount: 6,
    rockRadiusMin: 20,
    rockRadiusMax: 34,
  },
  visual: {
    maxDeltaSeconds: 0.05,
  },
};
```

Rates are per second and distances are canvas pixels. The live **Tuning** panel
can adjust many values while the game is running, including fire rate, magazine
size, reload time, group speed, formations, bite rate, bites to infect, zombie
speed, the gunshot/kill/chain/civilian detection radii, and the deactivation
delay. Each survivor carries the weapon defined under `survivors.weapon`; change
`magazineSize` and `reloadSeconds` there to rebalance every survivor.

`group.responsiveness` controls how quickly the squad accelerates toward the
joystick direction, and `group.formationEase` controls how aggressively dots
chase their slots. `group.jitter` adds the small natural wobble.

For debugging and integration, the game exposes `window.ZOMBDOT`:

```js
ZOMBDOT.config                       // Live configuration object
ZOMBDOT.getState()                   // Current run, survivors, and zombies
ZOMBDOT.start()                      // Start a fresh run
ZOMBDOT.pause() / ZOMBDOT.resume()
ZOMBDOT.spawnWave(count)
ZOMBDOT.spawnZombieAt(x, y)
ZOMBDOT.setFormation("circle" | "line" | "square" | "triangle")
ZOMBDOT.moveGroup(x, y)
```

Best survival time is stored locally in the browser.

## Rescue, bases and defence

Yellow civilians spawn around the map. Move the squad near them to rescue them; they ride in the formation centre. Bring them to a safe zone to register them, then they recruit into reserve soldiers after a short delay. Deploy reserves with the **Deploy** button or send active soldiers back with **Return**. Turrets near safe zones auto-fire when assigned an operator (assign/recall via the **Turret**/**Recall** buttons). Evacuation zones start locked; reach their entrance to open them and rescue the civilians inside.
