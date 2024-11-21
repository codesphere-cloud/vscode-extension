const fs = require('fs');


export function readBashFile(filePath: string): string {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content;
    } catch (err) {
        console.error('Fehler beim Lesen der Datei:', err);
        return '';
    }
}