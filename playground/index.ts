import * as lang from "@lang";

const CHAR_CODE_NEWLINE = 10;

const runButtonElement = document.getElementById("run-button");
if (!(runButtonElement instanceof HTMLButtonElement)) {
	throw new Error("Not a button element");
}

const textEditorTextAreaElement = document.getElementById("editor-textarea");
if (!(textEditorTextAreaElement instanceof HTMLTextAreaElement)) {
	throw new Error("Not a textarea element");
}

const outputTextElement = document.getElementById("output-text");
if (!(outputTextElement instanceof HTMLPreElement)) {
	throw new Error("Not a pre element");
}

const storedScript = window.localStorage.getItem("script");
if (storedScript !== null) {
	textEditorTextAreaElement.value = storedScript;
	const lineCount = countCharacterCount(storedScript, CHAR_CODE_NEWLINE) + 1;
	textEditorTextAreaElement.rows = lineCount;
	updateEditorLineCountElement(lineCount);
}

runButtonElement.addEventListener("click", () => {
	outputTextElement.innerText = "";

	const instructions = lang.parseScript(textEditorTextAreaElement.value);
	const memory: lang.Memory = new Map();
	const externalFunctions = lang.createStandardLibrary();
	externalFunctions.set("log", (args) => {
		const outputItems: string[] = [];
		for (const value of args) {
			const stringified = lang.stringifyValue(value);
			outputItems.push(stringified);
		}
		outputTextElement.innerText += `[log] ${outputItems.join(", ")}\n`;

		const result: lang.NullValue = {
			type: "value.null",
		};
		return result;
	});
	externalFunctions.set("print", (args) => {
		if (args.length !== 1) {
			throw new Error("Expected single argument");
		}
		const value = args[0];
		if (value.type !== "value.string") {
			throw new Error("Expected string argument");
		}
		outputTextElement.innerText += value.string;

		const result: lang.NullValue = {
			type: "value.null",
		};
		return result;
	});
	const result = lang.executeInstructions(instructions, memory, externalFunctions);
	if (result === null) {
		return;
	}
	const stringifiedResultValue = lang.stringifyValue(result);
	outputTextElement.innerText += `[result] ${stringifiedResultValue}\n`;
});

textEditorTextAreaElement.addEventListener("input", () => {
	const value = textEditorTextAreaElement.value;
	window.localStorage.setItem("script", value);
	const lineCount = countCharacterCount(value, CHAR_CODE_NEWLINE) + 1;
	textEditorTextAreaElement.rows = lineCount;
	updateEditorLineCountElement(lineCount);
});

textEditorTextAreaElement.addEventListener("keydown", (e) => {
	if (e.key === "Tab") {
		e.preventDefault();
		const start = textEditorTextAreaElement.selectionStart;
		const end = textEditorTextAreaElement.selectionEnd;

		textEditorTextAreaElement.value = `${textEditorTextAreaElement.value.slice(
			0,
			start,
		)}\t${textEditorTextAreaElement.value.slice(end)}`;

		textEditorTextAreaElement.selectionStart = start + 1;
		textEditorTextAreaElement.selectionEnd = start + 1;
	} else if (e.key === "Escape") {
		textEditorTextAreaElement.blur();
		// TODO: focus next element
	}
});

function updateEditorLineCountElement(lineCount: number): void {
	const textEditorLineCountElement = document.getElementById("editor-line-count");
	if (!(textEditorLineCountElement instanceof HTMLDivElement)) {
		throw new Error("Not a div element");
	}
	while (textEditorLineCountElement.childElementCount > lineCount) {
		const lastChild = textEditorLineCountElement.lastChild;
		if (lastChild === null) {
			throw new Error("Expected last child to exist");
		}
		lastChild.remove();
	}
	while (textEditorLineCountElement.childElementCount < lineCount) {
		const lineCountElement = document.createElement("div");
		lineCountElement.innerText = `${textEditorLineCountElement.childElementCount + 1}`;
		textEditorLineCountElement.appendChild(lineCountElement);
	}
}

function countCharacterCount(s: string, charCode: number): number {
	let count = 0;
	for (let i = 0; i < s.length; i++) {
		if (s.charCodeAt(i) === charCode) {
			count++;
		}
	}
	return count;
}
