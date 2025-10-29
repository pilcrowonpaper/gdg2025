export const scriptsStorageKey = "scripts";

export function setScripts(scripts: Scripts): void {
	const jsonArray = mapScriptsToJSONValue(scripts);
	localStorage.setItem(scriptsStorageKey, JSON.stringify(jsonArray));
}

export function getScripts(): Scripts {
	const stored = localStorage.getItem(scriptsStorageKey);
	if (stored === null) {
		const scripts = new Map();
		return scripts;
	}

	let jsonValue: unknown;
	try {
		jsonValue = JSON.parse(stored);
	} catch {
		console.error("Failed to parse stored item");
		const scripts = new Map();
		return scripts;
	}

	let scripts: Scripts;
	try {
		scripts = mapJSONValueToScripts(jsonValue);
	} catch (e) {
		if (e instanceof Error) {
			console.error(e.message);
		}
		const sprites = new Map();
		return sprites;
	}

	return scripts;
}

export function mapJSONValueToScripts(jsonValue: unknown): Scripts {
	const scripts = new Map<string, string>();

	if (!Array.isArray(jsonValue)) {
		throw new Error("Not an array");
	}

	for (let i = 0; i < jsonValue.length; i++) {
		const item: unknown = jsonValue[i];
		if (typeof item !== "object" || item === null) {
			throw new Error("Item not an object");
		}
		if (!("id" in item) || typeof item.id !== "string") {
			throw new Error("'id' not defined or invalid in item");
		}
		if (!("script" in item) || typeof item.script !== "string") {
			throw new Error("'id' not defined or invalid in item");
		}
		scripts.set(item.id, item.script);
	}

	return scripts;
}

export function mapScriptsToJSONValue(scripts: Scripts): unknown {
	const recordsJSONArray: unknown[] = [];
	for (const [scriptId, script] of scripts.entries()) {
		recordsJSONArray.push({
			id: scriptId,
			script: script,
		});
	}
	return recordsJSONArray;
}

export type Scripts = Map<string, string>;
