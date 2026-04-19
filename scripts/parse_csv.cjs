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
const cardsContent = fs.readFileSync('ngu4th_cards_260413.csv', 'utf-8');
const cardsData = parseCSV(cardsContent).slice(1);
let cardsSql = '-- Migration: 0013_seed_v2.sql\n-- Description: Seed cards and achievements\n\n';

cardsData.forEach(row => {
    if (row.length < 6) return;
    const [name, type, multiplier, exponent_bonus, is_variable, description] = row;
    if (!name || !type) return;
    const escapedName = name.replace(/'/g, "''");
    const escapedType = type.replace(/'/g, "''");
    const escapedDesc = description.replace(/'/g, "''");
    cardsSql += `INSERT OR IGNORE INTO ngu4th_cards (name, type, multiplier, exponent_bonus, is_variable, description) VALUES ('${escapedName}', '${escapedType}', ${parseFloat(multiplier) || 1.0}, ${parseFloat(exponent_bonus) || 0.0}, ${parseInt(is_variable) || 0}, '${escapedDesc}');\n`;
});

// 2. Process Achievements
const achContent = fs.readFileSync('achievements.csv', 'utf-8');
const achData = parseCSV(achContent).slice(1);
achData.forEach(row => {
    // Columns: 条件,名称,获得场景,备注
    if (row.length < 2) return;
    const [condition, name, scene, notes] = row;
    if (!name) return;
    const escapedCond = (condition || '').replace(/'/g, "''");
    const escapedName = name.replace(/'/g, "''");
    const escapedScene = (scene || '').replace(/'/g, "''");
    const escapedNotes = (notes || '').replace(/'/g, "''");
    cardsSql += `INSERT OR IGNORE INTO ngu4th_achievements (name, condition, scene, notes) VALUES ('${escapedName}', '${escapedCond}', '${escapedScene}', '${escapedNotes}');\n`;
});

fs.writeFileSync('migrations/0013_seed_v2.sql', cardsSql);
console.log('Successfully generated migrations/0013_seed_v2.sql');
