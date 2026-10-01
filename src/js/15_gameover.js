// ======================== 20. GAME OVER ========================
function endGame() {
  state = 'over';
  const sorted = [...snakes].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const player = snakes.find(s => s.isPlayer && !s.isPlayer2);
  const p2 = snakes.find(s => s.isPlayer2);

  // Calculate survive time (timer counts UP in endless/hunter, DOWN in other modes)
  const surviveTime = (mode === 'endless' || mode === 'hunter')
    ? timer
    : (CFG.GAME_DURATION - Math.max(0, timer));

  // Track survival time on player
  if (player) player._surviveTime = surviveTime;

  // ---- Achievement + Stats Updates ----
  if (player) {
    const prank = sorted.findIndex(s => s === player) + 1;
    playerStats.gamesPlayed++;
    playerStats.totalKills += player.kills;
    playerStats.totalFood += player.foodEaten;
    playerStats.totalScore += player.score;
    if (prank === 1) playerStats.rankFirst++;
    if (player.score > playerStats.bestScore) playerStats.bestScore = player.score;
    if (player.kills > playerStats.bestKills) playerStats.bestKills = player.kills;
    if (player.maxLength > playerStats.bestLength) playerStats.bestLength = player.maxLength;
    if (surviveTime > playerStats.bestTime) playerStats.bestTime = Math.round(surviveTime);
    _persistAchievements();

    // Check achievements
    checkAchievements(player);

    // Save to leaderboard
    saveLB({
      score: player.score,
      kills: player.kills,
      food: player.foodEaten,
      length: player.maxLength,
      time: surviveTime.toFixed(1),
      skin: player.skin.name,
      date: new Date().toLocaleDateString(),
      mode: mode,
    });
  }

  showPanel('game-over-panel');
  document.getElementById('btn-pause').classList.add('hidden');
  document.getElementById('hud-fuel').classList.add('hidden');
  document.getElementById('hud-powerup').classList.add('hidden');
  // 双人计分板也收起来 —— 成绩已经由面板上的对照表给出，留着只是重复
  document.getElementById('hud-p1').classList.add('hidden');
  document.getElementById('hud-p2').classList.add('hidden');

  // Title — mode-specific
  let aliveCount = 0;
  for (const s of snakes) { if (s.alive) aliveCount++; }

  // 双人对战单独一支：胜负要在两名真人之间决出。
  //
  // 原来这里没有 local 分支，于是直接落到下面的「你死了」——而 player 取的
  // 是 P1，所以 P2 独自存活时标题仍然写着「你死了」，赢家那行却念出 P2 的名字。
  // 更常见的情况是 P2 赢了却看不到自己的成绩：整个面板只显示 P1 的排名和得分。
  let versusWinner = '';
  if (mode === 'local') {
    const p1 = snakes.find(s => s.isPlayer && !s.isPlayer2);
    const p2s = snakes.find(s => s.isPlayer2);

    // 先看谁还活着；都活着（时间到）或都死了，就比分数
    if (p1 && p1.alive && !(p2s && p2s.alive)) versusWinner = 'P1';
    else if (p2s && p2s.alive && !(p1 && p1.alive)) versusWinner = 'P2';
    else if (p1 && p2s) {
      if (p1.score > p2s.score) versusWinner = 'P1';
      else if (p2s.score > p1.score) versusWinner = 'P2';
      else versusWinner = 'TIE';
    }

    document.getElementById('go-title').textContent =
      versusWinner === 'TIE' ? '🤝 平局' : (versusWinner ? `🏆 ${versusWinner} 获胜` : '对局结束');
    document.getElementById('go-winner').textContent =
      versusWinner === 'TIE' ? '两人得分相同'
        : versusWinner === 'P1' ? '玩家 1 胜出' : '玩家 2 胜出';
  } else if (mode === 'hunter') {
    document.getElementById('go-title').textContent = '🔪 狩猎结束';
    document.getElementById('go-winner').textContent = `你击杀了 ${player ? player.kills : 0} 条蛇！`;
  } else if (mode === 'endless') {
    document.getElementById('go-title').textContent = '💀 你死了';
    document.getElementById('go-winner').textContent = `存活了 ${Math.round(surviveTime)} 秒 | 得分: ${player ? player.score : 0}`;
  } else if (player && player.alive && aliveCount === 1) {
    document.getElementById('go-title').textContent = '🎉 胜利!';
    document.getElementById('go-winner').textContent = '你是最后的幸存者!';
  } else if (mode !== 'endless' && mode !== 'hunter' && timer <= 0) {
    document.getElementById('go-title').textContent = '⏰ 时间到';
    document.getElementById('go-winner').textContent = `🏆 ${winner ? (winner.npcName || winner.skin.name) : '-'} 获胜! (${winner ? winner.score : 0}分)`;
  } else {
    document.getElementById('go-title').textContent = '💀 你死了';
    document.getElementById('go-winner').textContent = `🏆 ${winner ? (winner.npcName || winner.skin.name) : '-'} 获胜! (${winner ? winner.score : 0}分)`;
  }

  const prank = sorted.findIndex(s => s === player) + 1;
  const resultEl = document.getElementById('go-result');
  const statsEl = document.getElementById('go-stats');
  const versusEl = document.getElementById('go-versus');

  if (mode === 'local') {
    // 双人：把「你的排名」换成两人对照
    const p1 = snakes.find(s => s.isPlayer && !s.isPlayer2);
    const p2s = snakes.find(s => s.isPlayer2);
    const rankOf = (s) => (s ? sorted.findIndex(x => x === s) + 1 : '-');

    const row = (label, s, isWin) =>
      `<div class="vs-row${isWin ? ' win' : ''}">` +
        `<span class="vs-name">${label}${s && !s.alive ? ' 💀' : ''}</span>` +
        `<span class="vs-score">${s ? s.score : 0} 分</span>` +
        `<span class="vs-rank">第 ${rankOf(s)} 名</span>` +
      `</div>`;

    versusEl.innerHTML =
      row('P1', p1, versusWinner === 'P1') + row('P2', p2s, versusWinner === 'P2');
    versusEl.classList.remove('hidden');
    resultEl.classList.add('hidden');
    statsEl.classList.add('hidden');
  } else {
    // 单人：恢复原来的两行，并确保上一局双人留下的对照表不会残留
    versusEl.classList.add('hidden');
    resultEl.classList.remove('hidden');
    statsEl.classList.remove('hidden');

    resultEl.textContent = `你的排名: 第 ${prank || '-'} 名 | 得分: ${player ? player.score : 0}`;

    if (player) {
      const finalLength = player.maxLength;
      const largestKill = player.kills > 0 ? ` | 击杀: ${player.kills}` : '';
      statsEl.textContent =
        `吃食物: ${player.foodEaten} | 最大长度: ${finalLength} | 存活: ${Math.round(surviveTime)}秒${largestKill}`;
    }
  }

  // Leaderboard
  const lb = loadLB();
  const lbEl = document.getElementById('go-lb');
  if (lb.length > 0) {
    let html = '<h3>🏆 排行榜 Top 10</h3>';
    const playerEntry = player ? { score: player.score, date: new Date().toLocaleDateString(), skin: player.skin.name } : null;
    lb.slice(0, 10).forEach((e, i) => {
      const isMe = playerEntry && e.score === playerEntry.score && e.date === playerEntry.date && e.skin === playerEntry.skin;
      html += `<div class="row${isMe ? ' me' : ''}"><span>${i + 1}. ${e.skin}</span><span>${e.score}分 🔪${e.kills || 0} ${e.mode ? '('+e.mode+')' : ''}</span></div>`;
    });
    lbEl.innerHTML = html;
  } else {
    lbEl.innerHTML = '<h3>🏆 排行榜</h3><div style="color:#888;font-size:12px">暂无记录</div>';
  }

  // Trigger shake
  if (player && !player.alive) triggerShake(14, 0.4);
}
