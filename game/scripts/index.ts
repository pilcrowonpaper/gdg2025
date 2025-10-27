import * as shared from "@shared";
import * as storage from "@storage";

const globalScripts = storage.getScripts();
let textEditorTextAreaHistoryIndex = 0;
const textEditorTextAreaHistory: HistoryRecord[] = [];

init();

function init(): void {
	const editorBodyElement = getEditorBodyElement();
	const scriptSelectorElement = getScriptSelectorElement();
	const newScriptButtonElement = getNewScriptButtonElement();
	const renameScriptIdFormElement = getRenameScriptIdFormElement();
	const deleteScriptButtonElement = getDeleteScriptButtonElement();
	const textEditorTextElement = getTextEditorTextElement();
	const showScriptEditPageButtonElement = getShowScriptEditPageButtonElement();
	const showScriptConfigPageButtonElement = getShowScriptConfigPageButtonElement();

	showDefaultScript();

	showScriptEditPage();
	editorBodyElement.hidden = false;

	const initialHistoryRecord: HistoryRecord = {
		value: textEditorTextElement.value,
		selectionStart: 0,
		selectionEnd: 0,
	};
	textEditorTextAreaHistory.push(initialHistoryRecord);

	newScriptButtonElement.addEventListener("click", () => {
		const existingScriptIds: string[] = [];
		for (const scriptId of globalScripts.keys()) {
			existingScriptIds.push(scriptId);
		}
		const newScriptId = generateScriptId(existingScriptIds);
		storeScript(newScriptId, "");

		const scriptIds = shared.getSortedMapKeys(globalScripts);
		updateScriptSelectorOptions(scriptIds);
		scriptSelectorElement.value = newScriptId;

		updateTextEditor("");
	});

	scriptSelectorElement.addEventListener("change", () => {
		const script = globalScripts.get(scriptSelectorElement.value) ?? null;
		if (script === null) {
			throw new Error(`Script ${scriptSelectorElement.value} not exists`);
		}
		updateTextEditor(script);
		showScriptEditPage();
	});

	renameScriptIdFormElement.addEventListener("submit", (e) => {
		e.preventDefault();
		const formData = new FormData(renameScriptIdFormElement);
		const newScriptId = formData.get("new_script_id");
		if (typeof newScriptId !== "string" || newScriptId === "") {
			throw new Error("Invalid value");
		}
		if (globalScripts.has(newScriptId)) {
			throw new Error("Already exists");
		}

		globalScripts.delete(scriptSelectorElement.value);
		globalScripts.set(newScriptId, textEditorTextElement.value);

		const scriptIds = shared.getSortedMapKeys(globalScripts);
		updateScriptSelectorOptions(scriptIds);
		scriptSelectorElement.value = newScriptId;

		storage.setScripts(globalScripts);

		renameScriptIdFormElement.reset();
	});

	deleteScriptButtonElement.addEventListener("click", () => {
		const targetScriptId = scriptSelectorElement.value;
		globalScripts.delete(targetScriptId);
		for (const scriptSelectorElementChild of scriptSelectorElement) {
			if (scriptSelectorElementChild.innerText === targetScriptId) {
				scriptSelectorElementChild.remove();
			}
		}
		storage.setScripts(globalScripts);

		showDefaultScript();
		showScriptEditPage();
	});

	textEditorTextElement.addEventListener("input", () => {
		const value = textEditorTextElement.value;

		addTextEditorHistoryRecord(value, textEditorTextElement.selectionStart, textEditorTextElement.selectionEnd);

		const CHAR_CODE_NEWLINE = 10;
		let lineCount = 1;
		for (let i = 0; i < value.length; i++) {
			if (value.charCodeAt(i) === CHAR_CODE_NEWLINE) {
				lineCount++;
			}
		}
		textEditorTextElement.rows = lineCount;
		updateTextEditorLineCount(lineCount);

		storeScript(scriptSelectorElement.value, value);
	});

	textEditorTextElement.addEventListener("keydown", (e) => {
		textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionStart = textEditorTextElement.selectionStart;
		textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionEnd = textEditorTextElement.selectionEnd;

		if (e.key === "Tab") {
			e.preventDefault();
			const start = textEditorTextElement.selectionStart;
			const end = textEditorTextElement.selectionEnd;

			const newValue = `${textEditorTextElement.value.slice(0, start)}\t${textEditorTextElement.value.slice(end)}`;

			textEditorTextElement.value = newValue;
			textEditorTextElement.selectionStart = start + 1;
			textEditorTextElement.selectionEnd = start + 1;

			addTextEditorHistoryRecord(newValue, start + 1, start + 1);
			storeScript(scriptSelectorElement.id, newValue);
		} else if (e.key === "Escape") {
			textEditorTextElement.blur();
		} else if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
			e.preventDefault();
			if (textEditorTextAreaHistoryIndex < textEditorTextAreaHistory.length - 1) {
				textEditorTextAreaHistoryIndex++;
				const newValue = textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].value;
				updateTextEditor(newValue);
				storeScript(scriptSelectorElement.id, newValue);
				textEditorTextElement.selectionStart = textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionStart;
				textEditorTextElement.selectionEnd = textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionEnd;
			}
		} else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			if (textEditorTextAreaHistoryIndex > 0) {
				textEditorTextAreaHistoryIndex--;
				const newValue = textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].value;
				updateTextEditor(newValue);
				storeScript(scriptSelectorElement.id, newValue);
				textEditorTextElement.selectionStart = textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionStart;
				textEditorTextElement.selectionEnd = textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionEnd;
			}
		}
	});

	showScriptEditPageButtonElement.addEventListener("click", () => {
		showScriptEditPage();
	});

	showScriptConfigPageButtonElement.addEventListener("click", () => {
		showScriptConfigPage();
	});
}

interface HistoryRecord {
	value: string;
	selectionStart: number;
	selectionEnd: number;
}

function showScriptEditPage(): void {
	const scriptEditPageElement = getScriptEditPageElement();
	const scriptConfigPageElement = getScriptConfigPageElement();

	scriptEditPageElement.hidden = false;
	scriptConfigPageElement.hidden = true;
}

function showScriptConfigPage(): void {
	const scriptEditPageElement = getScriptEditPageElement();
	const scriptConfigPageElement = getScriptConfigPageElement();

	scriptEditPageElement.hidden = true;
	scriptConfigPageElement.hidden = false;
}

function generateScriptId(existingRecordIds: string[]): string {
	let num = 1;
	let id = "untitled-1";
	while (existingRecordIds.includes(id)) {
		num++;
		id = `untitled-${num}`;
	}
	return id;
}

function showDefaultScript(): void {
	const scriptSelectorElement = getScriptSelectorElement();
	if (globalScripts.size < 1) {
		globalScripts.set("untitled-1", "return 1 + 1");
	}

	const scriptIds = shared.getSortedMapKeys(globalScripts);
	updateScriptSelectorOptions(scriptIds);

	const initialScript = globalScripts.get(scriptSelectorElement.value) ?? null;
	if (initialScript === null) {
		throw new Error(`${scriptSelectorElement.value} not defined`);
	}
	updateTextEditor(initialScript);
}

function updateTextEditor(script: string): void {
	const textEditorTextElement = getTextEditorTextElement();

	textEditorTextElement.value = script;
	const CHAR_CODE_NEWLINE = 10;
	let lineCount = 1;
	for (let i = 0; i < script.length; i++) {
		if (script.charCodeAt(i) === CHAR_CODE_NEWLINE) {
			lineCount++;
		}
	}
	textEditorTextElement.rows = lineCount;
	updateTextEditorLineCount(lineCount);
}

function updateTextEditorLineCount(lineCount: number): void {
	const textEditorLineCountSectionElement = getTextEditorLineCountSectionElement();
	while (textEditorLineCountSectionElement.childElementCount > lineCount) {
		const lastChild = textEditorLineCountSectionElement.lastChild;
		if (lastChild !== null) {
			lastChild.remove();
		}
	}
	while (textEditorLineCountSectionElement.childElementCount < lineCount) {
		const lineCountElement = document.createElement("div");
		lineCountElement.innerText = `${textEditorLineCountSectionElement.childElementCount + 1}`;
		textEditorLineCountSectionElement.append(lineCountElement);
	}
}

function addTextEditorHistoryRecord(value: string, selectionStart: number, selectionEnd: number): void {
	textEditorTextAreaHistory.splice(textEditorTextAreaHistoryIndex + 1);
	if (textEditorTextAreaHistory.length > 100) {
		textEditorTextAreaHistory.shift();
	}
	textEditorTextAreaHistory.push({
		value: value,
		selectionStart: selectionStart,
		selectionEnd: selectionEnd,
	});
	textEditorTextAreaHistoryIndex = textEditorTextAreaHistory.length - 1;
}

function storeScript(scriptId: string, script: string): void {
	globalScripts.set(scriptId, script);

	storage.setScripts(globalScripts);
}

function updateScriptSelectorOptions(scriptIds: string[]): void {
	const scriptSelectorElement = getScriptSelectorElement();

	shared.removeHTMLElementChildren(scriptSelectorElement);

	for (let i = 0; i < scriptIds.length; i++) {
		const optionElement = document.createElement("option");
		optionElement.innerText = scriptIds[i];
		scriptSelectorElement.append(optionElement);
	}
}

function getEditorBodyElement(): HTMLDivElement {
	const ELEMENT_ID = "editor-body";

	const editorBodyElement = document.getElementById(ELEMENT_ID);
	if (!(editorBodyElement instanceof HTMLDivElement)) {
		throw new Error(`${ELEMENT_ID} not div element`);
	}
	return editorBodyElement;
}

function getScriptSelectorElement(): HTMLSelectElement {
	const ELEMENT_ID = "script-selector";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLSelectElement)) {
		throw new Error(`${ELEMENT_ID} not select element`);
	}
	return element;
}

function getNewScriptButtonElement(): HTMLButtonElement {
	const ELEMENT_ID = "new-script-button";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${ELEMENT_ID} not button element`);
	}
	return element;
}

function getRenameScriptIdFormElement(): HTMLFormElement {
	const ELEMENT_ID = "rename-script-id-form";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLFormElement)) {
		throw new Error(`${ELEMENT_ID} not input element`);
	}
	return element;
}

function getDeleteScriptButtonElement(): HTMLButtonElement {
	const ELEMENT_ID = "delete-script-button";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${ELEMENT_ID} not button element`);
	}
	return element;
}

function getTextEditorLineCountSectionElement(): HTMLDivElement {
	const ELEMENT_ID = "text-editor.line-count-section";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLDivElement)) {
		throw new Error(`${ELEMENT_ID} not div element`);
	}
	return element;
}

function getTextEditorTextElement(): HTMLTextAreaElement {
	const ELEMENT_ID = "text-editor.text";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLTextAreaElement)) {
		throw new Error(`${ELEMENT_ID} not textarea element`);
	}
	return element;
}

function getShowScriptEditPageButtonElement(): HTMLButtonElement {
	const ELEMENT_ID = "show-script-edit-page-button";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${ELEMENT_ID} not button element`);
	}
	return element;
}

function getShowScriptConfigPageButtonElement(): HTMLButtonElement {
	const ELEMENT_ID = "show-script-config-page-button";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLButtonElement)) {
		throw new Error(`${ELEMENT_ID} not button element`);
	}
	return element;
}

function getScriptEditPageElement(): HTMLDivElement {
	const ELEMENT_ID = "script-edit-page";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLDivElement)) {
		throw new Error(`${ELEMENT_ID} not div element`);
	}
	return element;
}

function getScriptConfigPageElement(): HTMLDivElement {
	const ELEMENT_ID = "script-config-page";

	const element = document.getElementById(ELEMENT_ID);
	if (!(element instanceof HTMLDivElement)) {
		throw new Error(`${ELEMENT_ID} not div element`);
	}
	return element;
}
