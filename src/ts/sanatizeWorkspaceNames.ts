// convert all characters to lowercase
function toLowerCaseLetters(str: string) {
    return str.replace(/[A-Z]/g, (char) => char.toLowerCase());
}

// function to sanitize the workspace name
export function sanitizeWorkspaceName(workspaceName: string) {
    // remove all characters that are not letters, numbers or hyphens
    let sanitized = workspaceName.replace(/[^a-zA-Z0-9-]/g, '-');
    // remove multiple hyphens
    sanitized = sanitized.replace(/-{2,}/g, '-');
    // remove leading and trailing hyphens
    sanitized = sanitized.replace(/^-+|-+$/g, '');
    // limit the length to 20 characters
    sanitized = sanitized.substring(0, 19);
    // convert all characters to lowercase
    sanitized = toLowerCaseLetters(sanitized); 
    return sanitized;
}