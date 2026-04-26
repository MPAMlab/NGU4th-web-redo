export async function checkAchievements(db: D1Database, kindeId: string, context: { type: string, value?: any, [key: string]: any }) {
  // 1. 获取用户信息
  const user: any = await db.prepare("SELECT role, team FROM ngu4th_members WHERE kinde_id = ?").bind(kindeId).first();
  if (!user) return;

  // 2. 获取所有带触发器的成就模板
  const templates: any = await db.prepare("SELECT * FROM ngu4th_achievements WHERE trigger_type IS NOT NULL").all();
  
  const activeGame: any = await db.prepare("SELECT * FROM ngu4th_games WHERE status = 'active'").first();

  for (const tpl of templates.results) {
    let shouldGrant = false;

    switch (tpl.trigger_type) {
      case 'team_join':
        if (context.type === 'team_join' && user.team) shouldGrant = true;
        break;
      case 'role_eq':
        if (user.role === tpl.trigger_value) shouldGrant = true;
        break;
      case 'registration':
        if (context.type === 'registration') {
           shouldGrant = true;
           // 同时检查是否是 NGU3rd 引继玩家
           const isLegacy: any = await db.prepare("SELECT kinde_user_id FROM members WHERE kinde_user_id = ?").bind(kindeId).first();
           if (isLegacy) {
              // 如果是老玩家，且当前正在处理注册钩子，我们需要确保 legacy 成就也能被触发
           }
        }
        break;
      case 'legacy':
        // 专门的引继触发器
        if (context.type === 'registration') {
           const isLegacy: any = await db.prepare("SELECT kinde_user_id FROM members WHERE kinde_user_id = ?").bind(kindeId).first();
           if (isLegacy) shouldGrant = true;
        }
        break;
      case 'score_ge':
        // 单轮总分 >= n
        if (context.type === 'score' && context.value >= parseFloat(tpl.trigger_value || '0')) shouldGrant = true;
        break;
      case 'base_score_ge':
        // 单轮基础分 >= n (不考虑倍率)
        if (context.type === 'score' && context.baseScore >= parseFloat(tpl.trigger_value || '0')) shouldGrant = true;
        break;
      case 'joker_used':
        // 使用了小丑牌
        if (context.type === 'score' && context.jokerUsed) shouldGrant = true;
        break;
      case 'tarot_used':
        // 使用了塔罗牌
        if (context.type === 'score' && context.tarotId) shouldGrant = true;
        break;
      case 'any_fake_card_used':
        // 使用了任意假卡
        if (context.type === 'score' && context.fakeCards && context.fakeCards.length > 0) shouldGrant = true;
        break;
      case 'contribution_ge':
        // 最终贡献值 >= p (考虑到指数)
        if (context.type === 'score' && activeGame) {
           const team = user.team;
           if (team) {
              const exponent = team === 'red' ? (activeGame.red_exponent || 1) : (activeGame.blue_exponent || 1);
              // 获取该玩家所有回合的总基础分
              const totalBase: any = await db.prepare("SELECT SUM(total_score) as total FROM ngu4th_rounds WHERE player_id = ? AND game_id = ?")
                .bind(kindeId, activeGame.id).first();
              const finalP = Math.pow(totalBase.total || 0, exponent);
              if (finalP >= parseFloat(tpl.trigger_value || '0')) shouldGrant = true;
           }
        }
        break;
      case 'poker_hand_eq':
        if (context.type === 'score' && context.pokerHand === tpl.trigger_value) shouldGrant = true;
        break;
      case 'stamp_count':
        if (context.type === 'stamp') {
           const countResult: any = await db.prepare("SELECT COUNT(*) as count FROM ngu4th_stamps WHERE collector_id = ?").bind(kindeId).first();
           if (countResult.count >= parseInt(tpl.trigger_value || '0')) shouldGrant = true;
        }
        break;
      case 'staff_stamp_count':
        if (context.type === 'stamp') {
           const countResult: any = await db.prepare(`
              SELECT COUNT(*) as count FROM ngu4th_stamps s 
              JOIN ngu4th_members m ON s.scannee_id = m.kinde_id 
              WHERE s.collector_id = ? AND m.role = 'admin'
           `).bind(kindeId).first();
           if (countResult.count >= parseInt(tpl.trigger_value || '0')) shouldGrant = true;
        }
        break;
      case 'special_scannee':
        // 和特定人员集邮 (如 Om1t)
        if (context.type === 'stamp' && context.scanneeId === tpl.trigger_value) shouldGrant = true;
        break;
      case 'qr_text':
        // 扫纯文本 QR
        if (context.type === 'qr_text' && context.text === tpl.trigger_value) shouldGrant = true;
        break;
      case 'minigame_win':
        // 赢得特定小游戏或任意小游戏
        if (context.type === 'minigame_win') {
           if (!tpl.trigger_value || tpl.trigger_value === '' || context.minigameId === tpl.trigger_value) {
              shouldGrant = true;
           }
        }
        break;
    }

    if (shouldGrant) {
      await db.prepare("INSERT OR IGNORE INTO ngu4th_user_achievements (kinde_id, achievement_id) VALUES (?, ?)")
        .bind(kindeId, tpl.id).run();
    }
  }
}
