const fs = require('fs');

const content = fs.readFileSync('ngu4th_cards_260413.csv', 'utf-8');

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

const data = parseCSV(content);
const body = data.slice(1);

let sql = '-- Migration: 0011_seed_new_cards.sql\n-- Description: Seed cards from updated CSV\n\n';

body.forEach(row => {
    // Expected structure: name,type,multiplier,exponent_bonus,is_variable,description
    if (row.length < 6) return;
    const [name, type, multiplier, exponent_bonus, is_variable, description] = row;
    
    if (!name || !type) return;

    const escapedName = name.replace(/'/g, "''");
    const escapedType = type.replace(/'/g, "''");
    const escapedDesc = description.replace(/'/g, "''");

    sql += `INSERT OR IGNORE INTO ngu4th_cards (name, type, multiplier, exponent_bonus, is_variable, description) VALUES ('${escapedName}', '${escapedType}', ${parseFloat(multiplier) || 1.0}, ${parseFloat(exponent_bonus) || 0.0}, ${parseInt(is_variable) || 0}, '${escapedDesc}');\n`;
});

fs.writeFileSync('migrations/0011_seed_new_cards.sql', sql);
console.log('Successfully generated migrations/0011_seed_new_cards.sql');
