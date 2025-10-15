import * as lang from "@lang";

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

const executionTimeElement = document.getElementById("execution-time");
if (!(executionTimeElement instanceof HTMLParagraphElement)) {
	throw new Error("Not a p element");
}

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

runButtonElement.addEventListener("click", () => {
	outputTextElement.innerText = "";
	executionTimeElement.innerText = "";

	const parseScriptResult = lang.parseScript(textEditorTextAreaElement.value);
	if (!parseScriptResult.ok) {
		throw new Error(`${parseScriptResult.message} (position ${parseScriptResult.position})`);
	}
	const memory: lang.Memory = new Map();

	const start = performance.now();
	const result = lang.executeInstructions(parseScriptResult.instructions, memory, externalFunctions);
	executionTimeElement.innerText = `Execution time: ${Math.trunc(performance.now() - start)}ms`;
	if (result === null) {
		return;
	}
	const stringifiedResultValue = lang.stringifyValue(result);
	outputTextElement.innerText += `[result] ${stringifiedResultValue}\n`;
});

let textEditorTextAreaHistoryIndex = 0;
const textEditorTextAreaHistory: HistoryRecord[] = [
	{
		value: textEditorTextAreaElement.value,
		selectionStart: 0,
		selectionEnd: 0,
	},
];
interface HistoryRecord {
	value: string;
	selectionStart: number;
	selectionEnd: number;
}

textEditorTextAreaElement.addEventListener("input", () => {
	const script = textEditorTextAreaElement.value;
	window.localStorage.setItem("script", script);

	addTextEditorHistoryRecord(script, textEditorTextAreaElement.selectionStart, textEditorTextAreaElement.selectionEnd);

	const CHAR_CODE_NEWLINE = 10;
	let lineCount = 1;
	for (let i = 0; i < script.length; i++) {
		if (script.charCodeAt(i) === CHAR_CODE_NEWLINE) {
			lineCount++;
		}
	}
	textEditorTextAreaElement.rows = lineCount;
	updateEditorLineCountElement(lineCount);
});

textEditorTextAreaElement.addEventListener("keydown", (e) => {
	textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionStart = textEditorTextAreaElement.selectionStart;
	textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionEnd = textEditorTextAreaElement.selectionEnd;

	if (e.key === "Tab") {
		e.preventDefault();
		const start = textEditorTextAreaElement.selectionStart;
		const end = textEditorTextAreaElement.selectionEnd;

		const newValue = `${textEditorTextAreaElement.value.slice(
			0,
			start,
		)}\t${textEditorTextAreaElement.value.slice(end)}`;

		textEditorTextAreaElement.value = newValue;
		textEditorTextAreaElement.selectionStart = start + 1;
		textEditorTextAreaElement.selectionEnd = start + 1;

		addTextEditorHistoryRecord(newValue, start + 1, start + 1);
	} else if (e.key === "Escape") {
		textEditorTextAreaElement.blur();
	} else if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
		e.preventDefault();
		if (textEditorTextAreaHistoryIndex < textEditorTextAreaHistory.length - 1) {
			textEditorTextAreaHistoryIndex++;
			updateTextEditorValue(textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].value);
			textEditorTextAreaElement.selectionStart =
				textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionStart;
			textEditorTextAreaElement.selectionEnd = textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionEnd;
		}
	} else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
		e.preventDefault();
		if (textEditorTextAreaHistoryIndex > 0) {
			textEditorTextAreaHistoryIndex--;
			updateTextEditorValue(textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].value);
			textEditorTextAreaElement.selectionStart =
				textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionStart;
			textEditorTextAreaElement.selectionEnd = textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionEnd;
		}
	}
});

textEditorTextAreaElement.addEventListener("click", () => {
	textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionStart = textEditorTextAreaElement.selectionStart;
	textEditorTextAreaHistory[textEditorTextAreaHistoryIndex].selectionEnd = textEditorTextAreaElement.selectionEnd;
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

function updateTextEditorValue(value: string): void {
	const textEditorTextAreaElement = document.getElementById("editor-textarea");
	if (!(textEditorTextAreaElement instanceof HTMLTextAreaElement)) {
		throw new Error("Not a textarea element");
	}

	textEditorTextAreaElement.value = value;

	window.localStorage.setItem("script", value);

	const CHAR_CODE_NEWLINE = 10;
	let lineCount = 1;
	for (let i = 0; i < value.length; i++) {
		if (value.charCodeAt(i) === CHAR_CODE_NEWLINE) {
			lineCount++;
		}
	}
	textEditorTextAreaElement.rows = lineCount;
	updateEditorLineCountElement(lineCount);
}
