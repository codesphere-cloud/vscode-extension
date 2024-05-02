const fs = require('fs');

// Funktion zum Lesen des Inhalts der Datei
export function readBashFile(filePath: string): string {
    try {
        // Dateiinhalt lesen
        const content = fs.readFileSync(filePath, 'utf-8');
        return content;
    } catch (err) {
        console.error('Fehler beim Lesen der Datei:', err);
        return '';
    }
}