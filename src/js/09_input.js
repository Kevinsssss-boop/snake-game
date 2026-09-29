// ======================== 10. INPUT ========================
const keysHeld = {};
let mouseX = 0, mouseY = 0, mouseActive = false;
// Virtual joystick
let vJoyActive = false, vJoyId = null, vJoyBaseX = 0, vJoyBaseY = 0, vJoyDX = 0, vJoyDY = 0;
// Boost button touch
let boostTouchId = null;

document.addEventListener('keydown', e => {
  initAudio(); keysHeld[e.key] = true;
  if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
  if (e.key === 'Escape') { e.preventDefault(); if (state === 'playing' || state === 'paused') backToHome(); }

  // Step 1.3: Keyboard control boost keys
  if (state === 'playing') {
    // Space or LShift for boost (works for both mouse and keyboard mode)
    if (e.key === ' ' || e.key === 'Shift') {
      e.preventDefault();
      const p = getPlayer();
      if (p) p.boosting = true;
    }
    // Tab = P2 加速（双人对战）。
    // 教学卡片一直写着「W A S D 移动 + Tab 加速」，但这个键从来没接上：
    // getPlayer2() 定义了却全项目无人调用，而 getPlayer() 明确排除 P2
    // （`s.isPlayer && !s.isPlayer2`），keyup 又只释放 P1 —— 结果 P2 能动、不能加速。
    // 必须 preventDefault：Tab 默认会把焦点移出 canvas，不拦截的话按一次就再也收不到键盘事件。
    if (e.key === 'Tab') {
      e.preventDefault();
      const p2 = getPlayer2();
      if (p2) p2.boosting = true;
    }
    // Prevent default for arrow keys to avoid page scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }
});
document.addEventListener('keyup', e => {
  keysHeld[e.key] = false;
  // Step 1.3: Release boost on Space or LShift
  if (e.key === ' ' || e.key === 'Shift') {
    snakes.forEach(s => { if (s.isPlayer && !s.isPlayer2) s.boosting = false; });
  }
  // Tab 释放 P2 加速。分开写而不是并进上面那个 forEach：
  // Space/Shift 归 P1，Tab 归 P2，两者的释放互不影响。
  if (e.key === 'Tab') {
    const p2 = getPlayer2();
    if (p2) p2.boosting = false;
  }
});

const canvas = document.getElementById('game');
canvas.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; mouseActive = true; });
canvas.addEventListener('click', () => { mouseActive = true; });
canvas.addEventListener('touchmove', e => { e.preventDefault(); mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; mouseActive = true; }, { passive: false });
canvas.addEventListener('touchstart', e => { e.preventDefault(); mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; mouseActive = true; }, { passive: false });

// Virtual joystick (mobile)
const vJoyZone = document.getElementById('vjoy-zone');
const vJoyKnob = document.getElementById('vjoy-knob');
const vJoyBase = document.getElementById('vjoy-base');
const boostBtn = document.getElementById('boost-btn');

function isMobile() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }

vJoyZone.addEventListener('touchstart', e => {
  e.preventDefault();
  if (vJoyActive) return;
  const t = e.changedTouches[0];
  vJoyId = t.identifier;
  vJoyActive = true;
  vJoyBaseX = t.clientX; vJoyBaseY = t.clientY;
  vJoyDX = 0; vJoyDY = 0;
  vJoyBase.style.left = vJoyBaseX + 'px';
  vJoyBase.style.top = vJoyBaseY + 'px';
  vJoyBase.style.display = 'block';
  vJoyKnob.style.display = 'block';
}, { passive: false });

vJoyZone.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === vJoyId) {
      vJoyDX = t.clientX - vJoyBaseX;
      vJoyDY = t.clientY - vJoyBaseY;
      const dist = Math.sqrt(vJoyDX * vJoyDX + vJoyDY * vJoyDY);
      const maxDist = 45;
      if (dist > maxDist) { vJoyDX = vJoyDX / dist * maxDist; vJoyDY = vJoyDY / dist * maxDist; }
      vJoyKnob.style.left = (vJoyBaseX + vJoyDX) + 'px';
      vJoyKnob.style.top = (vJoyBaseY + vJoyDY) + 'px';
    }
  }
}, { passive: false });

function endVJoy() {
  vJoyActive = false; vJoyId = null; vJoyDX = 0; vJoyDY = 0;
  vJoyBase.style.display = 'none'; vJoyKnob.style.display = 'none';
}
vJoyZone.addEventListener('touchend', e => { for (const t of e.changedTouches) { if (t.identifier === vJoyId) endVJoy(); } });
vJoyZone.addEventListener('touchcancel', endVJoy);

boostBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  const p = getPlayer(); if (p) p.boosting = true;
  boostTouchId = e.changedTouches[0].identifier;
});
boostBtn.addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === boostTouchId) { const p = getPlayer(); if (p) p.boosting = false; boostTouchId = null; }
  }
});
boostBtn.addEventListener('touchcancel', () => { const p = getPlayer(); if (p) p.boosting = false; boostTouchId = null; });
