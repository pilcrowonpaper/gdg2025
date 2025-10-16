import * as lang from "@lang";

const runButtonElement = document.getElementById("run-button");
if (!(runButtonElement instanceof HTMLButtonElement)) {
	throw new Error("Not a button element");
}

const textEditorTextAreaElement = document.getElementById("editor-textarea");
if (!(textEditorTextAreaElement instanceof HTMLTextAreaElement)) {
	throw new Error("Not a textarea element");
}

const executionTimeElement = document.getElementById("execution-time-message");
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
	writeToOutput(`[log] ${outputItems.join(", ")}\n`, {
		color: "black",
		textDecoration: "none",
	});

	const returnValue: lang.NullValue = {
		type: "value.null",
	};
	const result: lang.ExternalFunctionSuccessResult = {
		ok: true,
		returnValue: returnValue,
	};
	return result;
});
externalFunctions.set("print", (args) => {
	if (args.length !== 1) {
		const result: lang.ExternalFunctionErrorResult = {
			ok: false,
			message: "Expected 1 argument",
		};
		return result;
	}
	const value = args[0];
	if (value.type !== "value.string") {
		const result: lang.ExternalFunctionErrorResult = {
			ok: false,
			message: "Not a string",
		};
		return result;
	}
	writeToOutput(value.string, {
		color: "black",
		textDecoration: "none",
	});

	const returnValue: lang.NullValue = {
		type: "value.null",
	};
	const result: lang.ExternalFunctionSuccessResult = {
		ok: true,
		returnValue: returnValue,
	};
	return result;
});

runButtonElement.addEventListener("click", () => {
	resetEditorLineCountColor();
	clearOutput();
	executionTimeElement.innerText = "";

	const script = textEditorTextAreaElement.value;
	const parseScriptResult = lang.parseScript(script);
	if (!parseScriptResult.ok) {
		const chars = lang.parseString(script);
		const lineColumnPosition = getLineColumnPosition(chars, parseScriptResult.position);
		writeToOutput(
			`[Parse error] ${parseScriptResult.message} (line ${
				lineColumnPosition.line + 1
			}, column ${lineColumnPosition.column + 1}):\n`,
			{
				color: "red",
				textDecoration: "none",
			},
		);
		const lineChars = getLine(chars, lineColumnPosition.line);
		writeToOutput(String.fromCodePoint(...lineChars.subarray(0, lineColumnPosition.column)), {
			color: "gray",
			textDecoration: "none",
		});
		if (lineColumnPosition.column < lineChars.length) {
			writeToOutput(
				String.fromCodePoint(...lineChars.subarray(lineColumnPosition.column, lineColumnPosition.column + 1)),
				{
					color: "red",
					textDecoration: "underline",
				},
			);
		} else {
			writeToOutput(" ", {
				color: "red",
				textDecoration: "underline",
			});
		}

		writeToOutput(String.fromCodePoint(...lineChars.subarray(lineColumnPosition.column + 1)), {
			color: "gray",
			textDecoration: "none",
		});
		writeToOutput("\n", {
			color: "gray",
			textDecoration: "none",
		});

		markEditorLineAsError(lineColumnPosition.line);
		return;
	}
	const memory: lang.Memory = new Map();

	const start = performance.now();
	const result = lang.executeInstructions(parseScriptResult.instructions, memory, externalFunctions);
	if (!result.ok) {
		const chars = lang.parseString(script);
		const startLineColumnPosition = getLineColumnPosition(chars, result.startPosition);
		const endLineColumnPosition = getLineColumnPosition(chars, result.endPosition);
		writeToOutput(
			`[Execution error] ${result.message} (line ${
				startLineColumnPosition.line + 1
			}, column ${startLineColumnPosition.column + 1}-${endLineColumnPosition.column}):\n`,
			{
				color: "red",
				textDecoration: "none",
			},
		);
		const lineChars = getLine(chars, startLineColumnPosition.line);
		writeToOutput(String.fromCodePoint(...lineChars.subarray(0, startLineColumnPosition.column)), {
			color: "gray",
			textDecoration: "none",
		});
		writeToOutput(
			String.fromCodePoint(...lineChars.subarray(startLineColumnPosition.column, endLineColumnPosition.column)),
			{
				color: "red",
				textDecoration: "underline",
			},
		);
		writeToOutput(String.fromCodePoint(...lineChars.subarray(endLineColumnPosition.column)), {
			color: "gray",
			textDecoration: "none",
		});
		writeToOutput("\n", {
			color: "gray",
			textDecoration: "none",
		});

		markEditorLineAsError(startLineColumnPosition.line);
		return;
	}
	executionTimeElement.innerText = `Execution time: ${Math.trunc(performance.now() - start)}ms`;
	if (result.returnValue === null) {
		return;
	}
	const stringifiedResultValue = lang.stringifyValue(result.returnValue);
	writeToOutput(`[result] ${stringifiedResultValue}\n`, {
		color: "black",
		textDecoration: "none",
	});
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
	resetEditorLineCountColor();

	const script = textEditorTextAreaElement.value;
	window.localStorage.setItem("playground:script", script);

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

function markEditorLineAsError(linePosition: number): void {
	const textEditorLineCountElement = document.getElementById("editor-line-count");
	if (!(textEditorLineCountElement instanceof HTMLDivElement)) {
		throw new Error("Not a div element");
	}

	for (const child of textEditorLineCountElement.children) {
		if (child instanceof HTMLDivElement && child.innerText === (linePosition + 1).toString()) {
			child.style.backgroundColor = "red";
			child.style.color = "white";
		}
	}
}

function resetEditorLineCountColor(): void {
	const textEditorLineCountElement = document.getElementById("editor-line-count");
	if (!(textEditorLineCountElement instanceof HTMLDivElement)) {
		throw new Error("Not a div element");
	}

	for (const child of textEditorLineCountElement.children) {
		if (child instanceof HTMLDivElement) {
			child.style.backgroundColor = "transparent";
			child.style.color = "black";
		}
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

	window.localStorage.setItem("playground:script", value);

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

function writeToOutput(message: string, attributes: OutputTextAttributes): void {
	const outputTextElement = document.getElementById("output-text");
	if (!(outputTextElement instanceof HTMLPreElement)) {
		throw new Error("Not a pre element");
	}
	const outputSpanElement = document.createElement("span");
	outputSpanElement.innerText = message;
	outputSpanElement.style.color = attributes.color;
	outputSpanElement.style.textDecoration = attributes.textDecoration;
	outputSpanElement.style.textDecorationColor = attributes.color;
	outputTextElement.appendChild(outputSpanElement);
}

interface OutputTextAttributes {
	color: string;
	textDecoration: string;
}

function clearOutput(): void {
	const outputTextElement = document.getElementById("output-text");
	if (!(outputTextElement instanceof HTMLPreElement)) {
		throw new Error("Not a pre element");
	}
	while (outputTextElement.firstChild !== null) {
		outputTextElement.removeChild(outputTextElement.firstChild);
	}
}

function getLineColumnPosition(chars: Uint32Array, position: number): LineColumnPosition {
	const CHAR_POINT_NEWLINE = 10;

	let column = 0;
	let line = 0;
	for (let i = 0; i < position; i++) {
		if (chars[i] === CHAR_POINT_NEWLINE) {
			column = 0;
			line++;
		} else {
			column++;
		}
	}

	const lineColumnPosition: LineColumnPosition = {
		line: line,
		column: column,
	};
	return lineColumnPosition;
}

function getLine(chars: Uint32Array, lineIndex: number): Uint32Array {
	const CHAR_POINT_NEWLINE = 10;

	let start = 0;
	let currentLineIndex = 0;
	while (currentLineIndex < lineIndex) {
		if (chars[start] === CHAR_POINT_NEWLINE) {
			currentLineIndex++;
		} else {
		}
		start++;
	}

	let end = start;
	while (end < chars.length && chars[end] !== CHAR_POINT_NEWLINE) {
		end++;
	}
	return chars.slice(start, end);
}

interface LineColumnPosition {
	line: number;
	column: number;
}
