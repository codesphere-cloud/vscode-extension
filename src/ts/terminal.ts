import axios from 'axios';


// Diese Funktion sendet einen POST-Request an die API, um die Teams abzurufen
export async function executeTerminalCommand(accessToken: string): Promise<any[]> {
    try {
        const response = await axios.post('https://codesphere.com/workspace-agent/executeOrThrow', {
            args: ["echo", "Hello World!"]
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (response.data.code === "Ok") {
            console.log("command executed successfully:");
            console.log(response.data.data); // Hier können Sie die Teams-Liste im Konsolenlog anzeigen lassen
            return response.data.data;
        } else {
            throw new Error(`Fehler beim Abrufen des commands: ${response.data.errMessage}`);
        }
    } catch (error) {
        throw new Error(`Fehler beim Abrufen der Teams: ${error}`);
    }
}