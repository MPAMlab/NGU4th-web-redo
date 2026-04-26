const fs = require('fs');

function parseCSV(csv) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\n' || char === '\r') {
                if (currentCell || currentRow.length > 0) {
                    currentRow.push(currentCell.trim());
                    rows.push(currentRow);
                    currentCell = '';
                    currentRow = [];
                }
                if (char === '\r' && nextChar === '\n') i++;
            } else {
                currentCell += char;
            }
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    return rows;
}

// 1. Process Cards
const cardsContent = fs.readFileSync('牌库.csv', 'utf-8');
const cardsData = parseCSV(cardsContent).slice(1);
let cardsSql = '-- Migration: 0013_seed_v2.sql\n-- Description: Seed cards and achievements\n\nPRAGMA foreign_keys = OFF;\n\n';

cardsData.forEach(row => {
    if (row.length < 3) return;
    const [name, type_raw, description, multiplier_raw, exponent_raw] = row;
    if (!name || !type_raw) return;

    let type = 'fake';
    if (type_raw.includes('小丑')) type = 'joker';
    else if (type_raw.includes('星象') || type_raw.includes('塔罗')) type = 'tarot';
    else if (type_raw.includes('假卡')) type = 'fake';

    let multiplier = 1.0;
    let exponent_bonus = 0.0;
    let is_variable = 0;

    if (multiplier_raw === 'var' || exponent_raw === 'var') is_variable = 1;
    if (multiplier_raw && multiplier_raw !== 'var') multiplier = parseFloat(multiplier_raw) || 1.0;
    if (exponent_raw && exponent_raw !== 'var') exponent_bonus = parseFloat(exponent_raw) || 0.0;

    const escapedName = name.replace(/'/g, "''");
    const escapedType = type.replace(/'/g, "''");
    const escapedDesc = (description || '').replace(/'/g, "''");
    
    // For cards, we use REPLACE as we already ensured FK compatibility with PRAGMA OFF
    cardsSql += `INSERT OR REPLACE INTO ngu4th_cards (name, type, multiplier, exponent_bonus, is_variable, description) VALUES ('${escapedName}', '${escapedType}', ${multiplier}, ${exponent_bonus}, ${is_variable}, '${escapedDesc}');\n`;
});

// 2. Process Achievements
const achContent = fs.readFileSync('achievements.csv', 'utf-8');
const achData = parseCSV(achContent).slice(1);
achData.forEach(row => {
    // Expected: 名称,条件,获得场景,Trigger Type,Trigger Value
    if (row.length < 2) return;
    const [name, condition, scene, trigger_type, trigger_value] = row;
    if (!name) return;
    const escapedCond = (condition || '').replace(/'/g, "''");
    const escapedName = name.replace(/'/g, "''");
    const escapedScene = (scene || '').replace(/'/g, "''");
    const escapedTType = (trigger_type || '').replace(/'/g, "''");
    const escapedTValue = (trigger_value || '').replace(/'/g, "''");

    // Use INSERT OR IGNORE for achievements to prevent duplicate errors
    cardsSql += `INSERT OR IGNORE INTO ngu4th_achievements (name, condition, scene, trigger_type, trigger_value) VALUES ('${escapedName}', '${escapedCond}', '${escapedScene}', ${escapedTType ? `'${escapedTType}'` : 'NULL'}, ${escapedTValue ? `'${escapedTValue}'` : 'NULL'});\n`;
});

cardsSql += '\nPRAGMA foreign_keys = ON;';

fs.writeFileSync('migrations/0013_seed_v2.sql', cardsSql);
console.log('Successfully generated migrations/0013_seed_v2.sql');
