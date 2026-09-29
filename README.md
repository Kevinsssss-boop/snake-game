# 🐍 Snake Battle

A browser-based multiplayer Snake game — vanilla JavaScript, HTML5 Canvas, **zero runtime dependencies**.

**[▶ Play it live](https://kevinsssss-boop.github.io/snake-game/)**

---

## Overview

A single-file browser game: player vs. 10 AI snakes on a 4000×3000 world, with 16 visual skins,
4 power-up types, and a real-time leaderboard. Everything — rendering, audio, AI, physics —
is hand-written against the Canvas 2D and Web Audio APIs. No framework, no bundler, no `npm install`.

| | |
|---|---|
| **Play** | Player vs 10 NPCs with 3 distinct AI personalities (hunter / scavenger / survivor); or 2-player local versus |
| **World** | 4000×3000 scrolling world, 150 food orbs, camera follows the player |
| **Skins** | 16, each with its own renderer (neon glow, pixel art, metallic gradients, particle trails…) |
| **Power-ups** | Speed · Shield · Magnet · Ghost |
| **Sudden death** | From the 60-second mark the arena closes to 40% of its size — crossing the red line is instant death |
| **Polish** | 350-particle pool, synthesized SFX, minimap, kill feed, screen shake, 12 achievements, bounty system |

---

## Engineering notes

The interesting part of this project isn't the game — it's the four problems that showed up
while building it, and what they cost to fix.

### 1. Spatial hashing for collision detection

Naive collision is O(n²) across every snake segment × every food orb × every power-up.
With 11 snakes averaging 60 segments and 150 food orbs that's ~100k checks per frame.
A **uniform spatial hash grid** (`04_spatialhash.js`) buckets entities by cell, so each
query only touches its own neighbourhood — the per-frame cost is roughly linear in the
number of *nearby* entities rather than the total count.

### 2. Splitting a 4,100-line single file into 39 modules

Not because "modular is better" — because the file had hit a real ceiling. At ~4,100 lines
the editor tooling started mis-matching large code blocks, and adding one skin meant finding
three separate insertion points scattered hundreds of lines apart.

The split was **purely physical**: no logic, variable name, or function signature changed.
Modules are ordered by numeric filename prefix and concatenated by a ~30-line zero-dependency
`build.js`. Global state (`canvas`, `ctx`, `camX`, `camY`, `worldX()`…) deliberately stayed
global — those names appear in hundreds of places, and threading them through a module system
would have been a rewrite, not a refactor.

Result: adding a skin went from "find 3 insertion points in 4,100 lines" to "write one 60-line
file and add one array entry." Verified by comparing identifier counts and `node --check`
against the pre-split baseline.

### 3. Renderer strategy pattern instead of a switch statement

Nine renderers, each needing its own body/head/trail drawing. A `switch` on skin id would
have meant every new skin touching the core render loop — the exact coupling the split was
meant to remove. Instead each renderer registers itself in a dispatch table
(`17_renderers.js`), so a skin is self-contained.

### 4. Performance budget: effects first, then LOD

Particle explosions and per-segment glow are the visual identity of the game — cutting them
for frame rate would have been the wrong trade. Instead: a pre-allocated particle pool (no
per-frame allocation, no GC pauses), and level-of-detail that drops expensive effects for
off-screen or distant entities rather than removing them globally.

---

## Project structure

```
snake-game/
├── index.html              ← build output — the whole game, one file (~237 KB)
├── build.js                ← zero-dep build script (fs + path only)
├── snake_game.py           ← standalone tkinter version (classic grid rules)
├── src/
│   ├── index.template.html ← HTML skeleton with {{CSS}} / {{JS}} placeholders
│   ├── css/                ← 5 files
│   └── js/                 ← 34 files, ordered by numeric prefix
├── 项目需求文档.md          ← design + full requirements (Chinese)
├── 新手指南文档.md          ← player guide (Chinese)
└── 单人模式改造方案.md      ← single-player redesign notes (Chinese)
```

**`src/js/` load order** — the numeric prefix *is* the dependency order:

| Range | Contents |
|---|---|
| `00`–`09` | Core state, audio, storage, skins, spatial hash, particles, power-ups, snake class, AI, input |
| `11`–`16` | Physics, collision, food, main tick, game over, UI |
| `17`–`27` | Renderer registry, 9 renderers, live preview |
| `28`–`34` | Frame render, game loop, entry point, achievements, NPCs, bounty, events |

(`10` unused — that module was merged during the split.)

---

## Getting started

No installation. Open `index.html` in a browser, or:

```bash
python -m http.server 8000    # then visit http://localhost:8000
```

To rebuild after editing anything in `src/`:

```bash
node build.js                 # → index.html
```

`build.js` reads `src/index.template.html`, concatenates `src/css/*.css` and `src/js/*.js`
in filename order, injects them at the `{{CSS}}` / `{{JS}}` placeholders, and writes
`index.html`. Requires Node.js, but the *game* requires nothing.

### Controls

|  | Player 1 | Player 2 (2-player mode) |
|---|---|---|
| **Move** | Mouse steering by default — or arrow keys in keyboard mode | `W` `A` `S` `D` |
| **Boost** | `Space` or `Shift` | `Tab` |

`P` pause · `Escape` back to the menu. Touch devices get an on-screen virtual
joystick and a dedicated boost button.

> Player 1 defaults to **mouse steering**; switch to arrow-key control in the
> in-game settings. Boost burns a limited fuel bar that recharges when released.

---

## The tkinter version

`snake_game.py` is a separate, much simpler implementation — classic grid Snake with
wrap-around walls, written against `tkinter` so it runs on a bare Python install:

```bash
python snake_game.py
```

Arrow keys / `WASD` to move, `R` restart, `Space` pause, `Q` quit.
It shares no code with the browser game; it's here as a minimal reference implementation.

---

## License

No license file — all rights reserved.

---

<details>
<summary>中文说明</summary>

**贪吃蛇大作战** —— 纯 JavaScript + HTML5 Canvas 的浏览器游戏，**运行时零依赖**。

玩家对战 10 条 AI 蛇，4000×3000 的滚动世界，16 套皮肤（每套独立渲染器），
4 种道具（加速 / 护盾 / 磁铁 / 幽灵），实时排行榜、小地图、击杀日志。

整个游戏 —— 渲染、音效、AI、物理 —— 都是手写的，没有框架、没有打包器、不需要 `npm install`。

**工程上值得说的四件事**：

1. **空间哈希做碰撞检测** —— 朴素实现是每帧约 10 万次检测，改用均匀网格分桶后，
   单帧开销与「附近实体数」相关，而不是实体总数。
2. **把 4100 行单文件拆成 39 个模块** —— 不是「模块化更好」，是单文件确实撞到了天花板：
   编辑工具在大段匹配时开始出错，加一套皮肤要在相隔数百行的三处插入代码。
   拆分是**纯物理移动**，没有改任何逻辑、变量名或函数签名；模块按数字前缀排序，
   由 30 行的零依赖 `build.js` 拼接回来。
3. **渲染器用策略模式而不是 switch** —— 9 个渲染器各自向分派表注册，加皮肤不必碰核心渲染循环。
4. **性能取舍：先保效果，再上 LOD** —— 粒子爆炸和逐段辉光是这套视觉的辨识度，
   为了帧率砍掉它们是错的取舍。改用预分配粒子池（无逐帧分配、无 GC 停顿）
   + 对屏幕外/远处实体降级，而不是全局删效果。

`snake_game.py` 是另一份完全独立的 tkinter 简化版（走经典网格规则、可穿墙），
与浏览器版不共享代码，作为最小参考实现保留。

</details>
