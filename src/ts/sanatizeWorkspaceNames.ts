// Funktion, um alle Buchstaben in Kleinbuchstaben umzuwandeln
function toLowerCaseLetters(str: string) {
    return str.replace(/[A-Z]/g, (char) => char.toLowerCase());
}

// Funktion zum Bereinigen und Umwandeln des Workspace-Namens
export function sanitizeWorkspaceName(workspaceName: string) {
    // Entferne alle Zeichen außer Buchstaben, Zahlen und Bindestrichen
    let sanitized = workspaceName.replace(/[^a-zA-Z0-9-]/g, '-');
    // Entferne eventuelle Doppel-Bindestriche
    sanitized = sanitized.replace(/-{2,}/g, '-');
    // Entferne Bindestriche am Anfang und Ende
    sanitized = sanitized.replace(/^-+|-+$/g, '');
    // Begrenze auf die ersten 20 Zeichen
    sanitized = sanitized.substring(0, 19);
    // Mache alle Buchstaben zu Kleinbuchstaben
    sanitized = toLowerCaseLetters(sanitized); // Hier werden nur Buchstaben zu Kleinbuchstaben umgewandelt
    return sanitized;
}