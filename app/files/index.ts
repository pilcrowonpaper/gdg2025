import * as storage from "@storage";

init();

function init(): void {
	const importInputElement = getImportInputElement();
	const exportButtonElement = getExportButtonElement();
	const importErrorMessageElement = getImportMessageElement();

	exportButtonElement.addEventListener("click", () => {
		const scripts = storage.getScripts();
		const sprites = storage.getSprites();
		const audioClips = storage.getAudioClips();

		const scriptsJSONValue = storage.mapScriptsToJSONValue(scripts);
		const spritesJSONValue = storage.mapSpritesToJSONValue(sprites);
		const audioClipsJSONValue = storage.mapAudioClipsToJSONValue(audioClips);

		const fileJSONValue: unknown = {
			version: 1,
			scripts: scriptsJSONValue,
			sprites: spritesJSONValue,
			audio_clips: audioClipsJSONValue,
		};

		const gameJSON = JSON.stringify(fileJSONValue);
		const blob = new Blob([gameJSON]);

		const fileURL = window.URL.createObjectURL(blob);

		const linkElement = document.createElement("a");
		linkElement.download = "game.json";
		linkElement.href = fileURL;
		linkElement.click();
	});

	importInputElement.addEventListener("input", async () => {
		importErrorMessageElement.hidden = true;

		if (importInputElement.files === null) {
			return;
		}
		const file = importInputElement.files.item(0);
		if (file === null) {
			return;
		}
		const fileBytes = await file.arrayBuffer();
		const maybeJSON = new TextDecoder().decode(fileBytes);
		let jsonValue: unknown;
		try {
			jsonValue = JSON.parse(maybeJSON);
		} catch {
			showImportErrorMessage("Invalid JSON file");
			return;
		}

		if (typeof jsonValue !== "object" || jsonValue === null) {
			showImportErrorMessage("Invalid JSON file");
			return;
		}

		if (!("version" in jsonValue) || typeof jsonValue.version !== "number") {
			console.error("'scripts' not defined or invalid");
			showImportErrorMessage("Invalid JSON file");
			return;
		}
		if (jsonValue.version !== 1) {
			showImportErrorMessage("Unsupported file version");
			return;
		}

		if (!("scripts" in jsonValue) || typeof jsonValue.scripts !== "object" || jsonValue.scripts === null) {
			console.error("'scripts' not defined or invalid");
			showImportErrorMessage("Invalid JSON file");
			return;
		}
		let scripts: storage.Scripts;
		try {
			scripts = storage.mapJSONValueToScripts(jsonValue.scripts);
		} catch (e) {
			console.error(e);
			showImportErrorMessage("Invalid JSON file");
			return;
		}

		if (!("sprites" in jsonValue) || typeof jsonValue.sprites !== "object" || jsonValue.sprites === null) {
			console.error("'sprites' not defined or invalid");
			showImportErrorMessage("Invalid JSON file");
			return;
		}
		let sprites: storage.Sprites;
		try {
			sprites = storage.mapJSONValueToSprites(jsonValue.sprites);
		} catch (e) {
			console.error(e);
			showImportErrorMessage("Invalid JSON file");
			return;
		}

		if (!("audio_clips" in jsonValue) || typeof jsonValue.audio_clips !== "object" || jsonValue.audio_clips === null) {
			console.error("'audio_clips' not defined or invalid");
			showImportErrorMessage("Invalid JSON file");
			return;
		}
		let audioClips: storage.AudioClips;
		try {
			audioClips = storage.mapJSONValueToAudioClips(jsonValue.audio_clips);
		} catch (e) {
			console.error(e);
			showImportErrorMessage("Invalid JSON file");
			return;
		}

		storage.setScripts(scripts);
		storage.setSprites(sprites);
		storage.setAudioClips(audioClips);

		showImportSuccessMessage();
	});
}

function showImportErrorMessage(message: string): void {
	const importMessageElement = getImportMessageElement();

	importMessageElement.innerText = message;
	importMessageElement.style.color = "red";
	importMessageElement.hidden = false;
}

function showImportSuccessMessage(): void {
	const importMessageElement = getImportMessageElement();

	importMessageElement.innerText = "Saved game to device.";
	importMessageElement.style.color = "black";
	importMessageElement.hidden = false;
}

function getImportInputElement(): HTMLInputElement {
	const elementId = "import-input";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLInputElement)) {
		throw new Error(`${elementId} not an input element`);
	}
	return element;
}

function getExportButtonElement(): HTMLButtonElement {
	const elementId = "export-button";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${elementId} not a button element`);
	}
	return element;
}

function getImportMessageElement(): HTMLParagraphElement {
	const elementId = "import-message";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLParagraphElement)) {
		throw new Error(`${elementId} not a p element`);
	}
	return element;
}
