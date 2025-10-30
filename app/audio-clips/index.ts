import * as audio from "@audio";
import * as shared from "@shared";
import * as storage from "@storage";

const globalAudioClips = storage.getAudioClips();

const pentatonicScalePitches = [
	0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29, 31, 34, 36, 39, 41, 43, 46, 48, 51, 53, 55, 58,
];

init();

function init() {
	const editorBodyElement = getEditorBodyElement();
	const playButtonElement = getPlayButtonElement();
	const speedSliderElement = getSpeedSliderElement();
	const noteTypeSelectorElement = getNoteTypeSelectorElement();
	const audioClipSelectorElement = getAudioClipSelectorElement();
	const newAudioClipButtonElement = getNewAudioClipButton();
	const showAudioClipEditPageButtonElement = getShowAudioClipEditPageButtonElement();
	const showAudioClipConfigPageButtonElement = getShowAudioClipConfigPageButtonElement();
	const renameAudioClipIdFormElement = getRenameAudioClipIdFormElement();
	const deleteAudioClipButtonElement = getDeleteAudioClipButtonElement();
	const notesTableElement = getNotesTableElement();

	const volumeSliderElements: HTMLInputElement[] = [];
	const pitchSliderElements: HTMLInputElement[] = [];

	for (let i = 0; i < audio.clipNoteCount; i++) {
		const orderTableDataElement = document.createElement("td");
		orderTableDataElement.innerText = (i + 1).toString();

		const volumeSliderElement = document.createElement("input");
		volumeSliderElement.type = "range";
		volumeSliderElement.min = "0";
		volumeSliderElement.max = "15";
		volumeSliderElement.classList.add("volume-slider");
		volumeSliderElements.push(volumeSliderElement);
		const volumeSliderTableDataElement = document.createElement("td");
		volumeSliderTableDataElement.append(volumeSliderElement);

		const pitchSliderElement = document.createElement("input");
		pitchSliderElement.type = "range";
		pitchSliderElement.min = "0";
		pitchSliderElement.max = "24";
		pitchSliderElement.classList.add("pitch-slider");
		pitchSliderElements.push(pitchSliderElement);
		const pitchSliderTableDataElement = document.createElement("td");
		pitchSliderTableDataElement.append(pitchSliderElement);

		const tableRowElement = document.createElement("tr");
		tableRowElement.append(orderTableDataElement, volumeSliderTableDataElement, pitchSliderTableDataElement);

		notesTableElement.append(tableRowElement);
	}

	showDefaultAudioClip(pitchSliderElements, volumeSliderElements);

	showAudioClipEditPage();
	editorBodyElement.hidden = false;

	let stopPreviousAudioClip: audio.StopFunction | null = null;
	playButtonElement.addEventListener("click", () => {
		if (stopPreviousAudioClip !== null) {
			stopPreviousAudioClip();
		}
		const audioClip = getCurrentAudioClip(pitchSliderElements, volumeSliderElements);
		stopPreviousAudioClip = audio.playClip(audioClip);
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

		updateAudioClipEditor(newAudioClip, pitchSliderElements, volumeSliderElements);
	});

	audioClipSelectorElement.addEventListener("change", () => {
		const audioClip = globalAudioClips.get(audioClipSelectorElement.value) ?? null;
		if (audioClip === null) {
			throw new Error(`Audio clip ${audioClipSelectorElement.value} not exists`);
		}
		updateAudioClipEditor(audioClip, pitchSliderElements, volumeSliderElements);
		showAudioClipEditPage();
	});

	showAudioClipEditPageButtonElement.addEventListener("click", () => {
		showAudioClipEditPage();
	});

	showAudioClipConfigPageButtonElement.addEventListener("click", () => {
		showAudioClipConfigPage();
	});

	speedSliderElement.addEventListener("change", () => {
		storeCurrentAudioClip(pitchSliderElements, volumeSliderElements);
	});

	noteTypeSelectorElement.addEventListener("change", () => {
		storeCurrentAudioClip(pitchSliderElements, volumeSliderElements);
	});

	for (const pitchSliderElement of pitchSliderElements) {
		pitchSliderElement.addEventListener("change", () => {
			storeCurrentAudioClip(pitchSliderElements, volumeSliderElements);
		});
	}

	for (const volumeSliderElement of volumeSliderElements) {
		volumeSliderElement.addEventListener("change", () => {
			storeCurrentAudioClip(pitchSliderElements, volumeSliderElements);
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
		const audioClip = getCurrentAudioClip(pitchSliderElements, volumeSliderElements);
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

		showDefaultAudioClip(pitchSliderElements, volumeSliderElements);
		showAudioClipEditPage();
	});
}

function showDefaultAudioClip(pitchSliderElements: HTMLInputElement[], volumeSliderElements: HTMLInputElement[]): void {
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
	updateAudioClipEditor(initialAudioClip, pitchSliderElements, volumeSliderElements);
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

function updateAudioClipEditor(
	audioClip: audio.Clip,
	pitchSliderElements: HTMLInputElement[],
	volumeSliderElements: HTMLInputElement[],
): void {
	const speedSliderElement = getSpeedSliderElement();
	const noteTypeSelectorElement = getNoteTypeSelectorElement();

	speedSliderElement.value = audioClip.speed.toString();

	for (let i = 0; i < audio.clipNoteCount; i++) {
		const note = audio.getNote(audioClip.notes, i);
		let sliderPitchValue = pentatonicScalePitches.indexOf(note.pitch);
		if (sliderPitchValue < 0) {
			sliderPitchValue = 0;
		}
		pitchSliderElements[i].value = sliderPitchValue.toString();
		volumeSliderElements[i].value = note.volume.toString();
		noteTypeSelectorElement.value = note.type.toString();
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
	const notes = new Uint8Array(audio.clipNotesByteSize);
	for (let i = 0; i < audio.clipNoteCount; i++) {
		const note: audio.Note = {
			type: 0,
			pitch: 0,
			volume: 0,
		};
		audio.setNote(notes, i, note);
	}
	const audioClip: audio.Clip = {
		speed: 4,
		notes: notes,
	};
	return audioClip;
}

function getCurrentAudioClip(
	pitchSliderElements: HTMLInputElement[],
	volumeSliderElements: HTMLInputElement[],
): audio.Clip {
	const noteTypeSelectorElement = getNoteTypeSelectorElement();
	const speedSliderElement = getSpeedSliderElement();

	const notes = new Uint8Array(audio.clipNotesByteSize);
	for (let i = 0; i < audio.clipNoteCount; i++) {
		const pentatonicScalePitch = Number(pitchSliderElements[i].value);
		const note: audio.Note = {
			type: Number(noteTypeSelectorElement.value),
			pitch: pentatonicScalePitches[pentatonicScalePitch],
			volume: Number(volumeSliderElements[i].value),
		};
		audio.setNote(notes, i, note);
	}

	const audioClip: audio.Clip = {
		speed: Number(speedSliderElement.value),
		notes: notes,
	};
	return audioClip;
}

function storeCurrentAudioClip(
	pitchSliderElements: HTMLInputElement[],
	volumeSliderElements: HTMLInputElement[],
): void {
	const audioClipSelectorElement = getAudioClipSelectorElement();
	const audioClip = getCurrentAudioClip(pitchSliderElements, volumeSliderElements);
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

function getNotesTableElement(): HTMLTableElement {
	const elementId = "notes-table";

	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLTableElement)) {
		throw new Error(`${elementId} not table element`);
	}
	return element;
}
