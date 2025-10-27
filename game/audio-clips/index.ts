import * as audio from "@audio";
import * as shared from "@shared";
import * as storage from "@storage";

const globalAudioClips = storage.getAudioClips();

init();

function init() {
	const editorBodyElement = getEditorBodyElement();
	const playButtonElement = getPlayButtonElement();
	const speedSliderElement = getSpeedSliderElement();
	const noteTypeSelectorElement = getNoteTypeSelectorElement();
	const pitchSliderElements = getPitchSliderElements();
	const volumeSliderElements = getVolumeSliderElements();
	const audioClipSelectorElement = getAudioClipSelectorElement();
	const newAudioClipButtonElement = getNewAudioClipButton();
	const showAudioClipEditPageButtonElement = getShowAudioClipEditPageButtonElement();
	const showAudioClipConfigPageButtonElement = getShowAudioClipConfigPageButtonElement();
	const renameAudioClipIdFormElement = getRenameAudioClipIdFormElement();
	const deleteAudioClipButtonElement = getDeleteAudioClipButtonElement();

	showDefaultAudioClip();

	showAudioClipEditPage();
	editorBodyElement.hidden = false;

	playButtonElement.addEventListener("click", async () => {
		const notes: audio.Note[] = [];
		for (let i = 0; i < 10; i++) {
			notes.push({
				type: noteTypeSelectorElement.value as audio.NoteType,
				pitch: Number(pitchSliderElements[i].value),
				volume: Number(volumeSliderElements[i].value),
			});
		}

		const audioClip: audio.Clip = {
			speed: Number(speedSliderElement.value),
			notes: notes,
		};
		await audio.playAudio(audioClip);
	});

	newAudioClipButtonElement.addEventListener("click", () => {
		const existingAudioClipIds: string[] = [];
		for (const audioClipId of globalAudioClips.keys()) {
			existingAudioClipIds.push(audioClipId);
		}
		const newAudioClipId = generateAudioClipId(existingAudioClipIds);
		const newAudioClip = createDefaultAudioClip();
		storeAudioClip(newAudioClipId, newAudioClip);

		const audioClipIds = shared.getSortedMapKeys(globalAudioClips);
		updateAudioClipSelectorOptions(audioClipIds);
		audioClipSelectorElement.value = newAudioClipId;

		updateAudioClipEditor(newAudioClip);
	});

	audioClipSelectorElement.addEventListener("change", () => {
		const audioClip = globalAudioClips.get(audioClipSelectorElement.value) ?? null;
		if (audioClip === null) {
			throw new Error(`Audio clip ${audioClipSelectorElement.value} not exists`);
		}
		updateAudioClipEditor(audioClip);
		showAudioClipEditPage();
	});

	showAudioClipEditPageButtonElement.addEventListener("click", () => {
		showAudioClipEditPage();
	});

	showAudioClipConfigPageButtonElement.addEventListener("click", () => {
		showAudioClipConfigPage();
	});

	speedSliderElement.addEventListener("change", () => {
		storeCurrentAudioClip();
	});

	noteTypeSelectorElement.addEventListener("change", () => {
		storeCurrentAudioClip();
	});

	for (const pitchSliderElement of pitchSliderElements) {
		pitchSliderElement.addEventListener("change", () => {
			storeCurrentAudioClip();
		});
	}

	for (const volumeSliderElement of volumeSliderElements) {
		volumeSliderElement.addEventListener("change", () => {
			storeCurrentAudioClip();
		});
	}

	renameAudioClipIdFormElement.addEventListener("submit", (e) => {
		e.preventDefault();
		const formData = new FormData(renameAudioClipIdFormElement);
		const newAudioClipId = formData.get("new_audio_clip_id");
		if (typeof newAudioClipId !== "string" || newAudioClipId === "") {
			throw new Error("Invalid value");
		}
		if (globalAudioClips.has(newAudioClipId)) {
			throw new Error("Already exists");
		}

		globalAudioClips.delete(audioClipSelectorElement.value);
		const audioClip = getCurrentAudioClip();
		globalAudioClips.set(newAudioClipId, audioClip);

		const audioClipIds = shared.getSortedMapKeys(globalAudioClips);
		updateAudioClipSelectorOptions(audioClipIds);
		audioClipSelectorElement.value = newAudioClipId;

		storage.setAudioClips(globalAudioClips);

		renameAudioClipIdFormElement.reset();
	});

	deleteAudioClipButtonElement.addEventListener("click", () => {
		const targetAudioClipId = audioClipSelectorElement.value;
		globalAudioClips.delete(targetAudioClipId);
		for (const audioClipSelectorElementChild of audioClipSelectorElement) {
			if (audioClipSelectorElementChild.innerText === targetAudioClipId) {
				audioClipSelectorElementChild.remove();
			}
		}
		storage.setAudioClips(globalAudioClips);

		showDefaultAudioClip();
		showAudioClipEditPage();
	});
}

function showDefaultAudioClip(): void {
	const audioClipSelectorElement = getAudioClipSelectorElement();

	if (globalAudioClips.size < 1) {
		const defaultAudioClip = createDefaultAudioClip();
		globalAudioClips.set("untitled-1", defaultAudioClip);
	}

	const audioClipIds = shared.getSortedMapKeys(globalAudioClips);
	updateAudioClipSelectorOptions(audioClipIds);

	const initialAudioClip = globalAudioClips.get(audioClipSelectorElement.value) ?? null;
	if (initialAudioClip === null) {
		throw new Error(`${audioClipSelectorElement.value} not defined`);
	}
	updateAudioClipEditor(initialAudioClip);
}

function updateAudioClipSelectorOptions(audioClipIds: string[]): void {
	const audioClipSelectorElement = getAudioClipSelectorElement();

	shared.removeHTMLElementChildren(audioClipSelectorElement);

	for (let i = 0; i < audioClipIds.length; i++) {
		const optionElement = document.createElement("option");
		optionElement.innerText = audioClipIds[i];
		audioClipSelectorElement.append(optionElement);
	}
}

function updateAudioClipEditor(audioClip: audio.Clip): void {
	const speedSliderElement = getSpeedSliderElement();
	const noteTypeSelectorElement = getNoteTypeSelectorElement();
	const pitchSliderElements = getPitchSliderElements();
	const volumeSliderElements = getVolumeSliderElements();

	speedSliderElement.value = audioClip.speed.toString();

	for (let i = 0; i < audioClip.notes.length; i++) {
		pitchSliderElements[i].value = audioClip.notes[i].pitch.toString();
		volumeSliderElements[i].value = audioClip.notes[i].volume.toString();
		noteTypeSelectorElement.value = audioClip.notes[i].type;
	}
}

function generateAudioClipId(existingRecordIds: string[]): string {
	let num = 1;
	let id = "untitled-1";
	while (existingRecordIds.includes(id)) {
		num++;
		id = `untitled-${num}`;
	}
	return id;
}

function showAudioClipEditPage(): void {
	const audioClipEditPageElement = getAudioClipEditPageElement();
	const audioClipConfigPageElement = getAudioClipConfigPageElement();

	audioClipEditPageElement.hidden = false;
	audioClipConfigPageElement.hidden = true;
}

function showAudioClipConfigPage(): void {
	const audioClipEditPageElement = getAudioClipEditPageElement();
	const audioClipConfigPageElement = getAudioClipConfigPageElement();

	audioClipEditPageElement.hidden = true;
	audioClipConfigPageElement.hidden = false;
}

function createDefaultAudioClip(): audio.Clip {
	const audioClip: audio.Clip = {
		speed: 5,
		notes: [],
	};
	for (let i = 0; i < 10; i++) {
		const note: audio.Note = {
			type: "sawtooth",
			pitch: 0,
			volume: 0,
		};
		audioClip.notes.push(note);
	}
	return audioClip;
}

function getCurrentAudioClip(): audio.Clip {
	const speedSliderElement = getSpeedSliderElement();
	const noteTypeSelectorElement = getNoteTypeSelectorElement();
	const pitchSliderElements = getPitchSliderElements();
	const volumeSliderElements = getVolumeSliderElements();

	const audioClip: audio.Clip = {
		speed: Number(speedSliderElement.value),
		notes: [],
	};
	for (let i = 0; i < 10; i++) {
		let noteType: audio.NoteType;
		if (noteTypeSelectorElement.value === "sawtooth") {
			noteType = "sawtooth";
		} else if (noteTypeSelectorElement.value === "sine") {
			noteType = "sine";
		} else if (noteTypeSelectorElement.value === "square") {
			noteType = "square";
		} else if (noteTypeSelectorElement.value === "triangle") {
			noteType = "triangle";
		} else {
			throw new Error("Invalid note type value");
		}
		const note: audio.Note = {
			pitch: Number(pitchSliderElements[i].value),
			volume: Number(volumeSliderElements[i].value),
			type: noteType,
		};
		audioClip.notes.push(note);
	}

	return audioClip;
}

function storeCurrentAudioClip(): void {
	const audioClipSelectorElement = getAudioClipSelectorElement();
	const audioClip = getCurrentAudioClip();
	storeAudioClip(audioClipSelectorElement.value, audioClip);
}

function storeAudioClip(audioClipId: string, audioClip: audio.Clip): void {
	globalAudioClips.set(audioClipId, audioClip);

	storage.setAudioClips(globalAudioClips);
}

function getEditorBodyElement(): HTMLDivElement {
	const elementId = "editor-body";

	const editorBodyElement = document.getElementById(elementId);
	if (!(editorBodyElement instanceof HTMLDivElement)) {
		throw new Error(`${elementId} not div element`);
	}
	return editorBodyElement;
}

function getAudioClipSelectorElement(): HTMLSelectElement {
	const elementId = "audio-clip-selector";
	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLSelectElement)) {
		throw new Error(`${elementId} not a select element`);
	}
	return element;
}

function getNewAudioClipButton(): HTMLButtonElement {
	const elementId = "new-audio-clip-button";
	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${elementId} not a button element`);
	}
	return element;
}

function getPlayButtonElement(): HTMLButtonElement {
	const elementId = "play-button";
	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${elementId} not a button element`);
	}
	return element;
}

function getSpeedSliderElement(): HTMLInputElement {
	const elementId = "speed-slider";
	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLInputElement)) {
		throw new Error(`${elementId} not an input element`);
	}
	return element;
}

function getNoteTypeSelectorElement(): HTMLSelectElement {
	const elementId = "note-type-selector";
	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLSelectElement)) {
		throw new Error(`${elementId} not a select element`);
	}
	return element;
}

function getPitchSliderElements(): HTMLInputElement[] {
	const elementClassName = "pitch-slider";
	const elements = document.getElementsByClassName(elementClassName);
	const inputElements: HTMLInputElement[] = [];
	for (let i = 0; i < 10; i++) {
		const orderAttribute = `${i + 1}`;
		let inputElement: HTMLInputElement | null = null;
		for (const element of elements) {
			if (!(element instanceof HTMLInputElement)) {
				throw new Error(`${elementClassName} not an input element`);
			}
			if (element.dataset.order === orderAttribute) {
				inputElement = element;
			}
		}
		if (inputElement === null) {
			throw new Error(`data-order=${orderAttribute} not defined`);
		}
		inputElements.push(inputElement);
	}

	return inputElements;
}

function getVolumeSliderElements(): HTMLInputElement[] {
	const elementClassName = "volume-slider";
	const elements = document.getElementsByClassName(elementClassName);
	const inputElements: HTMLInputElement[] = [];
	for (let i = 0; i < 10; i++) {
		const orderAttribute = `${i + 1}`;
		let inputElement: HTMLInputElement | null = null;
		for (const element of elements) {
			if (!(element instanceof HTMLInputElement)) {
				throw new Error(`${elementClassName} not an input element`);
			}
			if (element.dataset.order === orderAttribute) {
				inputElement = element;
			}
		}
		if (inputElement === null) {
			throw new Error(`data-order=${orderAttribute} not defined`);
		}
		inputElements.push(inputElement);
	}

	return inputElements;
}

function getShowAudioClipEditPageButtonElement(): HTMLButtonElement {
	const elementId = "show-audio-clip-edit-page-button";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${elementId} not button element`);
	}
	return element;
}

function getShowAudioClipConfigPageButtonElement(): HTMLButtonElement {
	const elementId = "show-audio-clip-config-page-button";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${elementId} not button element`);
	}
	return element;
}

function getAudioClipEditPageElement(): HTMLDivElement {
	const elementId = "audio-clip-edit-page";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLDivElement)) {
		throw new Error(`${elementId} not div element`);
	}
	return element;
}

function getAudioClipConfigPageElement(): HTMLDivElement {
	const elementId = "audio-clip-config-page";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLDivElement)) {
		throw new Error(`${elementId} not div element`);
	}
	return element;
}

function getRenameAudioClipIdFormElement(): HTMLFormElement {
	const elementId = "rename-audio-clip-id-form";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLFormElement)) {
		throw new Error(`${elementId} not input element`);
	}
	return element;
}

function getDeleteAudioClipButtonElement(): HTMLButtonElement {
	const elementId = "delete-audio-clip-button";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${elementId} not button element`);
	}
	return element;
}
