const fs = require('fs');

const content = fs.readFileSync('牌库.csv', 'utf-8');

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

let sql = '-- Migration: 0005_seed_cards.sql\n-- Description: Seed card library from CSV\n\n';

body.forEach(row => {
    if (row.length < 3) return;
    const [name, type, description] = row;
    if (!name || !type) return;

    const escapedName = name.replace(/'/g, "''");
    const escapedType = type.replace(/'/g, "''");
    const escapedDesc = description.replace(/'/g, "''");

    sql += `INSERT OR IGNORE INTO ngu4th_cards (name, type, description) VALUES ('${escapedName}', '${escapedType}', '${escapedDesc}');\n`;
});

fs.writeFileSync('migrations/0005_seed_cards.sql', sql);
console.log('Successfully generated migrations/0005_seed_cards.sql');
