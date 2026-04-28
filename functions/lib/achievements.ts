export async function checkAchievements(db: D1Database, kindeId: string, context: { type: string, value?: any, [key: string]: any }) {
  try {
    // 1. 获取用户信息
    const user: any = await db.prepare("SELECT role, team FROM ngu4th_members WHERE kinde_id = ?").bind(kindeId).first();
    if (!user) return;

    // 2. 获取所有带触发器的成就模板
    let templates: any;
    try {
      templates = await db.prepare("SELECT * FROM ngu4th_achievements WHERE trigger_type IS NOT NULL").all();
    } catch (e) {
      console.error("Failed to fetch achievements templates:", e);
      return;
    }
    
    if (!templates || !templates.results || templates.results.length === 0) return;
    
    let activeGame: any = null;
    try {
      activeGame = await db.prepare("SELECT * FROM ngu4th_games WHERE status = 'active'").first();
    } catch (e) {
      console.error("Failed to fetch active game:", e);
    }

    for (const tpl of templates.results) {
      try {
        let shouldGrant = false;

        switch (tpl.trigger_type) {
          case 'team_join':
            if (context.type === 'team_join' && user.team) shouldGrant = true;
            break;
          case 'role_eq':
            if (user.role === tpl.trigger_value) shouldGrant = true;
            break;
          case 'registration':
            if (context.type === 'registration') shouldGrant = true;
            break;
          case 'legacy':
            if (context.type === 'registration') {
               const isLegacy: any = await db.prepare("SELECT kinde_id FROM members WHERE kinde_id = ?").bind(kindeId).first();
               if (isLegacy) shouldGrant = true;
            }
            break;
          case 'score_ge':
            if (context.type === 'score' && context.value >= parseFloat(tpl.trigger_value || '0')) shouldGrant = true;
            break;
          case 'base_score_ge':
            if (context.type === 'score' && context.baseScore >= parseFloat(tpl.trigger_value || '0')) shouldGrant = true;
            break;
          case 'joker_used':
            if (context.type === 'score' && context.jokerUsed) shouldGrant = true;
            break;
          case 'tarot_used':
            if (context.type === 'score' && context.tarotId) shouldGrant = true;
            break;
          case 'any_fake_card_used':
            if (context.type === 'score' && context.fakeCards && context.fakeCards.length > 0) shouldGrant = true;
            break;
          case 'contribution_ge':
            if (context.type === 'score' && activeGame) {
               const team = user.team;
               if (team) {
                  const currentExp = team === 'red' ? (activeGame.red_exponent || 1.0) : (activeGame.blue_exponent || 1.0);
                  
                  // New Formula: (Sum of Base ^ Global Exp) * Product of Multipliers
                  const agg: any = await db.prepare(`
                    SELECT 
                      SUM(base_score) as sumBase
                    FROM ngu4th_rounds 
                    WHERE player_id = ? AND game_id = ?
                  `).bind(kindeId, activeGame.id).first();
                  
                  // For multipliers, we need to fetch all and multiply
                  const data: any = await db.prepare(`
                    SELECT multiplier FROM ngu4th_rounds 
                    WHERE player_id = ? AND game_id = ?
                  `).bind(kindeId, activeGame.id).all();
                  
                  let prodMult = 1.0;
                  (data.results || []).forEach((r: any) => {
                    prodMult *= (r.multiplier || 1.0);
                  });

                  const finalP = Math.pow(agg.sumBase || 0, currentExp) * prodMult;
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
               if (countResult && countResult.count >= parseInt(tpl.trigger_value || '0')) shouldGrant = true;
            }
            break;
          case 'staff_stamp_count':
            if (context.type === 'stamp') {
               const countResult: any = await db.prepare(`
                  SELECT COUNT(*) as count FROM ngu4th_stamps s 
                  JOIN ngu4th_members m ON s.scannee_id = m.kinde_id 
                  WHERE s.collector_id = ? AND m.role = 'admin'
               `).bind(kindeId).first();
               if (countResult && countResult.count >= parseInt(tpl.trigger_value || '0')) shouldGrant = true;
            }
            break;
          case 'special_scannee':
            if (context.type === 'stamp' && context.scanneeId === tpl.trigger_value) shouldGrant = true;
            break;
          case 'qr_text':
            if (context.type === 'qr_text' && context.text === tpl.trigger_value) shouldGrant = true;
            break;
          case 'minigame_win':
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
      } catch (innerErr) {
        console.error(`Error processing achievement ${tpl.name}:`, innerErr);
      }
    }
  } catch (globalErr) {
    console.error("Global error in checkAchievements:", globalErr);
  }
}
