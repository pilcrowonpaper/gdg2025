export const scriptsStorageKey = "scripts";

export function setScripts(scripts: Scripts): void {
    const recordsJSONArray: unknown[] = [];
    for (const [scriptId, script] of scripts.entries()) {
        recordsJSONArray.push({
            id: scriptId,
            script: script,
        });
    }
    localStorage.setItem(scriptsStorageKey, JSON.stringify(recordsJSONArray));
}

export function getScripts(): Scripts {
    const storedScripts = new Map<string, string>();

    const storedJSON = localStorage.getItem(scriptsStorageKey);
    if (storedJSON === null) {
        return storedScripts;
    }
    let parsedJSON: unknown;
    try {
        parsedJSON = JSON.parse(storedJSON);
    } catch {
        console.error("Failed to parse stored item");
        return storedScripts;
    }
    if (!Array.isArray(parsedJSON)) {
        console.error("Not an array");
        return storedScripts;
    }

    for (let i = 0; i < parsedJSON.length; i++) {
        const item: unknown = parsedJSON[i];
        if (typeof item !== "object" || item === null) {
            console.error("Item not an object");
            return storedScripts;
        }
        if (!("id" in item) || typeof item.id !== "string") {
            console.error("'id' not defined or invalid in item");
            return storedScripts;
        }
        if (!("script" in item) || typeof item.script !== "string") {
            console.error("'id' not defined or invalid in item");
            return storedScripts;
        }
        storedScripts.set(item.id, item.script);
    }

    return storedScripts;
}

export type Scripts = Map<string, string>;
