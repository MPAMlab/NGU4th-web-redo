export async function checkAchievements(db: D1Database, kindeId: string, context: { type: string, value?: any, [key: string]: any }) {
  // 1. Get user profile
  const user: any = await db.prepare("SELECT role, team FROM ngu4th_members WHERE kinde_id = ?").bind(kindeId).first();
  if (!user) return;

  // 2. Find templates that might trigger
  const templates: any = await db.prepare("SELECT * FROM ngu4th_achievements WHERE trigger_type IS NOT NULL").all();
  
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
        if (context.type === 'registration') shouldGrant = true;
        break;
      case 'score_ge':
        if (context.type === 'score' && context.value >= parseFloat(tpl.trigger_value || '0')) shouldGrant = true;
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
        if (context.type === 'stamp' && context.scanneeId === tpl.trigger_value) shouldGrant = true;
        break;
      case 'minigame_win':
        if (context.type === 'minigame_win') shouldGrant = true;
        break;
      case 'fake_card_used':
        if (context.type === 'score' && context.fakeCards && context.fakeCards.split(',').includes(tpl.trigger_value)) shouldGrant = true;
        break;
      case 'any_fake_card_used':
        if (context.type === 'score' && context.fakeCards && context.fakeCards.length > 0) shouldGrant = true;
        break;
    }

    if (shouldGrant) {
      await db.prepare("INSERT OR IGNORE INTO ngu4th_user_achievements (kinde_id, achievement_id) VALUES (?, ?)")
        .bind(kindeId, tpl.id).run();
    }
  }
}
