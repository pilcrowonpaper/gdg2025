import * as graphics from "@graphics";
import * as shared from "@shared";
import * as storage from "@storage";
import { getBackgroundColor, setBackgroundColor } from "@storage";

const DEFAULT_BG = 255;

const sprites = storage.getSprites();
let backgroundGray = getBackgroundColor();

let selectedColorIndex: number = 0;

const undoStack: PixelAction[][] = [];
const redoStack: PixelAction[][] = [];

interface PixelAction {
	spriteId: string;
	pos: number;
	prevIndex: number;
	newIndex: number;
	wasSolid: boolean;
	becameSolid: boolean;
	prevFull: boolean;
	becameFull: boolean;
}

let currentActionBatch: PixelAction[] = [];
let drawing = false;
let touchedInBatch: Set<number> = new Set();

init();

function init(): void {
	getEditorBodyElement().hidden = false;
	setupColorPicker();
	setupBackgroundSlider();
	setupSpriteSelector();
	setupPointerDraw();
	setupUndoRedo();
	showInitialSprite();
	setupToolTypeSelector();
	setupPageToggle();
	setupConfigActions();
	setupClearAllButton();
	setupNewSpriteNotification();
}

function setupColorPicker(): void {
	const picker = getColorPickerElement();
	while (picker.firstChild) picker.removeChild(picker.firstChild);
	for (let i = 0; i < graphics.colors.length; i++) {
		const input = document.createElement("input");
		input.type = "radio";
		input.value = i.toString();
		input.name = "color";
		input.style.appearance = "none";
		input.style.cursor = "pointer";
		input.style.backgroundColor = graphics.colorToHexCode(graphics.colors[i]);
		if (i === 0) {
			input.checked = true;
			selectedColorIndex = 0;
		}
		input.addEventListener("change", () => {
			selectedColorIndex = Number(input.value);
			const tool = getToolTypeSelectorElement();
			if (tool.value === "eraser") {
				tool.value = "pen";
			}
		});
		picker.appendChild(input);
	}
}

function setupBackgroundSlider(): void {
	const slider = document.getElementById("background-color-slider") as HTMLInputElement;
	slider.value = String(DEFAULT_BG - backgroundGray);
	redrawCurrentSprite();
	slider.addEventListener("input", () => {
		backgroundGray = DEFAULT_BG - Number(slider.value);
		setBackgroundColor(backgroundGray);
		redrawCurrentSprite();
	});
}

function setupSpriteSelector(): void {
	getSpriteSelectorElement().addEventListener("change", () => {
		undoStack.splice(0);
		redoStack.splice(0);
		redrawCurrentSprite();
	});
}

function setupPointerDraw(): void {
	const canvas = getSpriteCanvasElement();
	canvas.addEventListener("pointerdown", (e) => {
		drawing = true;
		currentActionBatch = [];
		touchedInBatch = new Set();
		handleDraw(e);
	});
	canvas.addEventListener("pointermove", (e) => {
		if (drawing) {
			handleDraw(e);
		}
	});
	window.addEventListener("pointerup", () => {
		if (!drawing) {
			return;
		}
		drawing = false;
		if (currentActionBatch.length > 0) {
			undoStack.push(currentActionBatch);
			redoStack.splice(0);
		}
		saveSprites();
	});
}

function setupUndoRedo(): void {
	window.addEventListener("keydown", (e) => {
		const modKey = e.metaKey || e.ctrlKey;
		if (!modKey) {
			return;
		}
		if (e.key.toLowerCase() === "z") {
			e.preventDefault();
			if (e.shiftKey) {
				redo();
			} else {
				undo();
			}
		}
		if (e.key.toLowerCase() === "y") {
			e.preventDefault();
			redo();
		}
	});
}

function handleDraw(e: PointerEvent): void {
	const rect = getSpriteCanvasElement().getBoundingClientRect();
	const x = Math.floor((e.clientX - rect.left) / (rect.width / graphics.spriteSize));
	const y = Math.floor((e.clientY - rect.top) / (rect.height / graphics.spriteSize));
	const pos = graphics.getSpritePixelPositionFromCoordinates(x, y);
	const tool = getToolTypeSelectorElement().value;
	const spriteId = getSelectedSpriteId();
	if (tool === "bucket") {
		bucketFill(spriteId, pos, selectedColorIndex);
	} else {
		setPixelWithUndo(spriteId, pos, selectedColorIndex);
	}
	redrawCurrentSprite();
}

function bucketFill(spriteId: string, originPosition: number, newIndex: number): void {
	const sprite = sprites.get(spriteId) ?? null;
	if (sprite === null) {
		console.error(`Sprite ${spriteId} not defined`);
		return;
	}
	const origin = graphics.getPixel(sprite, originPosition);
	const targetSolid = origin.solid;
	const targetFull = origin.full;
	const targetIndex = origin.colorId;
	const wantSolid = getToolTypeSelectorElement().value !== "eraser";
	const wantFull = wantSolid;
	if (targetSolid === wantSolid && targetFull === wantFull && targetIndex === newIndex) {
		return;
	}
	const positionStack = [originPosition];
	const seenPositions = new Set<number>();
	while (positionStack.length > 0) {
		const position = positionStack.pop() ?? null;
		if (position === null) {
			throw new Error("Unexpected state");
		}
		if (seenPositions.has(position)) {
			continue;
		}
		seenPositions.add(position);
		const curr = graphics.getPixel(sprite, position);
		if (curr.solid !== targetSolid || curr.full !== targetFull || curr.colorId !== targetIndex) {
			continue;
		}
		if (touchedInBatch.has(position)) {
			continue;
		}
		currentActionBatch.push({
			spriteId,
			pos: position,
			prevIndex: curr.colorId,
			newIndex,
			wasSolid: curr.solid,
			becameSolid: wantSolid,
			prevFull: curr.full,
			becameFull: wantFull,
		});
		touchedInBatch.add(position);
		graphics.setPixel(sprite, position, wantSolid, wantFull, newIndex);
		const { x, y } = graphics.getSpriteCoordinatesFromPixelPosition(position);
		if (x > 0) {
			positionStack.push(position - 1);
		}
		if (x < graphics.spriteSize - 1) {
			positionStack.push(position + 1);
		}
		if (y > 0) {
			positionStack.push(position - graphics.spriteSize);
		}
		if (y < graphics.spriteSize - 1) {
			positionStack.push(position + graphics.spriteSize);
		}
	}
}

function drawSprite(sprite: Uint8Array): void {
	const canvas = getSpriteCanvasElement();
	const ctx = canvas.getContext("2d");
	if (ctx === null) {
		throw new Error("2d canvas context not defined");
	}
	const imageData = ctx.getImageData(0, 0, 16, 16);
	for (let i = 0; i < graphics.spritePixelCount; i++) {
		const color = graphics.getPixelColor(sprite, i);
		if (color === null) {
			imageData.data[i * 4] = backgroundGray;
			imageData.data[i * 4 + 1] = backgroundGray;
			imageData.data[i * 4 + 2] = backgroundGray;
			imageData.data[i * 4 + 3] = 255;
		} else {
			imageData.data[i * 4] = color.red;
			imageData.data[i * 4 + 1] = color.green;
			imageData.data[i * 4 + 2] = color.blue;
			imageData.data[i * 4 + 3] = 255;
		}
	}
	ctx.putImageData(imageData, 0, 0);
}

function setPixelWithUndo(spriteId: string, pos: number, newIndex: number): void {
	const sprite = sprites.get(spriteId) ?? null;
	if (sprite === null) {
		console.error(`Sprite ${spriteId} not defined`);
		return;
	}
	if (touchedInBatch.has(pos)) {
		return;
	}
	const raw = graphics.getPixel(sprite, pos);
	const tool = getToolTypeSelectorElement().value;
	const wantSolid = tool !== "eraser";
	const wantFull = wantSolid;
	if (raw.solid === wantSolid && raw.full === wantFull && raw.colorId === newIndex) {
		return;
	}
	currentActionBatch.push({
		spriteId,
		pos,
		prevIndex: raw.colorId,
		newIndex,
		wasSolid: raw.solid,
		becameSolid: wantSolid,
		prevFull: raw.full,
		becameFull: wantFull,
	});
	touchedInBatch.add(pos);
	graphics.setPixel(sprite, pos, wantSolid, wantFull, newIndex);
}

function undo(): void {
	const batch = undoStack.pop() ?? null;
	if (batch === null) {
		return;
	}
	for (let i = batch.length - 1; i >= 0; i--) {
		const a = batch[i];
		const sprite = sprites.get(a.spriteId) ?? null;
		if (sprite === null) {
			console.error(`Sprite ${a.spriteId} not defined`);
			continue;
		}
		graphics.setPixel(sprite, a.pos, a.wasSolid, a.prevFull, a.prevIndex);
	}
	redoStack.push(batch);
	saveSprites();
	redrawCurrentSprite();
}

function redo(): void {
	const batch = redoStack.pop();
	if (!batch) {
		return;
	}
	for (let i = 0; i < batch.length; i++) {
		const a = batch[i];
		const sprite = sprites.get(a.spriteId) ?? null;
		if (sprite === null) {
			console.error(`Sprite ${a.spriteId} not defined`);
			continue;
		}
		graphics.setPixel(sprite, a.pos, a.becameSolid, a.becameFull, a.newIndex);
	}
	undoStack.push(batch);
	saveSprites();
	redrawCurrentSprite();
}

function redrawCurrentSprite(): void {
	const sprite = sprites.get(getSelectedSpriteId());
	if (sprite) {
		drawSprite(sprite);
	}
}

function showInitialSprite(): void {
	if (sprites.size < 1) {
		const sprite = new Uint8Array(graphics.spritePixelCount);
		for (let i = 0; i < graphics.spritePixelCount; i++) {
			graphics.setPixel(sprite, i, false, false, 0);
		}
		sprites.set("untitled-1", sprite);
		saveSprites();
	}
	updateSpriteSelectorOptions();
	redrawCurrentSprite();
}

function saveSprites(): void {
	storage.setSprites(sprites);
}

function updateSpriteSelectorOptions(ids?: string[]): void {
	const el = getSpriteSelectorElement();
	shared.removeHTMLElementChildren(el);
	const list = ids ?? shared.getSortedMapKeys(sprites);
	for (const id of list) {
		const opt = document.createElement("option");
		opt.value = id;
		opt.textContent = id;
		el.append(opt);
	}
}

function setupToolTypeSelector(): void {
	getToolTypeSelectorElement().addEventListener("change", () => redrawCurrentSprite());
}

function setupPageToggle(): void {
	const editBtn = document.getElementById("show-sprite-edit-page-button") as HTMLButtonElement;
	const configBtn = document.getElementById("show-sprite-config-page-button") as HTMLButtonElement;
	editBtn.addEventListener("click", () => {
		showEditPage();
	});
	configBtn.addEventListener("click", () => {
		showConfigPage();
	});
}

function showEditPage(): void {
	const editPage = getEditPageElement();
	const configPage = getConfigPageElement();
	editPage.hidden = false;
	configPage.hidden = true;
}

function showConfigPage(): void {
	const editPage = getEditPageElement();
	const configPage = getConfigPageElement();
	editPage.hidden = true;
	configPage.hidden = false;
}

function setupConfigActions(): void {
	const form = document.getElementById("rename-sprite-id-form") as HTMLFormElement;
	form.addEventListener("submit", (e) => {
		e.preventDefault();
		const fd = new FormData(form);
		const raw = (fd.get("new_sprite_id") ?? "").toString().trim();
		const oldId = getSelectedSpriteId();
		if (raw.length === 0 || raw === oldId) {
			return;
		}
		const newId = raw;
		if (sprites.has(newId)) {
			alert(`${newId} はすでに存在します`);
			return;
		}
		const cur = sprites.get(oldId) ?? null;
		if (cur === null) {
			return;
		}

		sprites.delete(oldId);
		sprites.set(newId, cur);
		saveSprites();
		updateSpriteSelectorOptions();
		getSpriteSelectorElement().value = newId;
		redrawCurrentSprite();

		form.reset();
	});

	const delBtn = document.getElementById("delete-sprite-button") as HTMLButtonElement;

	delBtn.addEventListener("click", () => {
		const id = getSelectedSpriteId();
		sprites.delete(id);
		undoStack.splice(0);
		redoStack.splice(0);
		if (sprites.size === 0) {
			const nid = "untitled-1";
			const blank = new Uint8Array(graphics.spritePixelCount);
			sprites.set(nid, blank);
		}
		saveSprites();
		updateSpriteSelectorOptions();
		const next = shared.getSortedMapKeys(sprites)[0];
		getSpriteSelectorElement().value = next;
		redrawCurrentSprite();

		showEditPage();
	});
}
function setupClearAllButton(): void {
	const btn = document.getElementById("clear-all-button") as HTMLButtonElement;
	btn.addEventListener("click", () => {
		const id = getSelectedSpriteId();
		const sprite = sprites.get(id) ?? null;
		if (sprite === null) {
			return;
		}

		currentActionBatch = [];
		touchedInBatch = new Set();

		for (let i = 0; i < graphics.spritePixelCount; i++) {
			const raw = graphics.getPixel(sprite, i);
			currentActionBatch.push({
				spriteId: id,
				pos: i,
				prevIndex: raw.colorId,
				newIndex: 0,
				wasSolid: raw.solid,
				becameSolid: false,
				prevFull: raw.full,
				becameFull: false,
			});
			graphics.setPixel(sprite, i, false, false, 0);
		}

		undoStack.push(currentActionBatch);
		redoStack.length = 0;

		saveSprites();
		redrawCurrentSprite();
	});
}

function getSpriteCanvasElement(): HTMLCanvasElement {
	return document.getElementById("sprite-canvas") as HTMLCanvasElement;
}

function getColorPickerElement(): HTMLFieldSetElement {
	return document.getElementById("color-picker") as HTMLFieldSetElement;
}

function getSpriteSelectorElement(): HTMLSelectElement {
	return document.getElementById("sprite-selector") as HTMLSelectElement;
}

function getSelectedSpriteId(): string {
	return getSpriteSelectorElement().value;
}

function getEditorBodyElement(): HTMLDivElement {
	return document.getElementById("editor-body") as HTMLDivElement;
}

function getToolTypeSelectorElement(): HTMLSelectElement {
	return document.getElementById("tool-type-selector") as HTMLSelectElement;
}

function getEditPageElement(): HTMLElement {
	return document.getElementById("sprite-edit-page") as HTMLElement;
}

function getConfigPageElement(): HTMLElement {
	return document.getElementById("sprite-config-page") as HTMLElement;
}

function setupNewSpriteNotification(): void {
	const newBtn = document.getElementById("new-sprite-button") as HTMLButtonElement;
	const log = document.getElementById("log-area") as HTMLDivElement;

	newBtn.addEventListener("click", () => {
		const base = "untitled";
		let index = 1;
		while (sprites.has(`${base}-${index}`)) {
			index++;
		}

		const id = `${base}-${index}`;
		const sprite = new Uint8Array(graphics.spritePixelCount);

		for (let i = 0; i < graphics.spritePixelCount; i++) {
			graphics.setPixel(sprite, i, false, false, 0);
		}

		sprites.set(id, sprite);
		saveSprites();
		updateSpriteSelectorOptions();
		getSpriteSelectorElement().value = id;
		redrawCurrentSprite();

		log.textContent = `Created sprite: ${id}`;
		log.style.opacity = "1";
		log.hidden = false;
		setTimeout(() => {
			log.hidden = true;
		}, 2000);
	});
}
