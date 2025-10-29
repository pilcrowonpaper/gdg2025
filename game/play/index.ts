import * as graphics from "@graphics";
import * as lang from "@lang";
import * as storage from "@storage";

import { AudioPlayer, Renderer } from "./utils.js";

init();

async function init(): Promise<void> {
	const _sprites: storage.Sprites = new Map();
	const pixels = new Uint8Array(graphics.spritePixelCount);
	crypto.getRandomValues(pixels);
	for (let i = 0; i < pixels.byteLength; i++) {
		pixels[i] |= 0b11000000;
	}

	_sprites.set("dino-1", pixels);
	storage.setSprites(_sprites);

	const inputs: Inputs = new Set();

	window.addEventListener("keydown", (e) => {
		if (e.key === " ") {
			e.preventDefault();
			inputs.add("space");
		}
		if (e.key === "Enter") {
			e.preventDefault();
			inputs.add("enter");
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			inputs.add("down");
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			inputs.add("up");
		}
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			inputs.add("left");
		}
		if (e.key === "ArrowRight") {
			e.preventDefault();
			inputs.add("right");
		}
	});

	window.addEventListener("keyup", (e) => {
		if (e.key === " ") {
			e.preventDefault();
			inputs.delete("space");
		}
		if (e.key === "Enter") {
			e.preventDefault();
			inputs.delete("enter");
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			inputs.delete("down");
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			inputs.delete("up");
		}
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			inputs.delete("left");
		}
		if (e.key === "ArrowRight") {
			e.preventDefault();
			inputs.delete("right");
		}
	});

	const gameElementCanvasContext = getGameElementCanvasContext();

	const scripts = storage.getScripts();
	const sprites = storage.getSprites();
	const audioClips = storage.getAudioClips();

	const parsedScripts = new Map<string, ParsedScript>();
	for (const [scriptId, script] of scripts) {
		const parseScriptResult = lang.parseScript(script);
		if (!parseScriptResult.ok) {
			writeScriptParseError(scriptId, script, parseScriptResult);
			showOutput();
			return;
		}
		const parsed: ParsedScript = {
			id: scriptId,
			script: script,
			instructions: parseScriptResult.instructions,
		};
		parsedScripts.set(scriptId, parsed);
	}

	const initScript = parsedScripts.get("_init") ?? null;
	if (initScript === null) {
		throw new Error("_init not defined");
	}
	const updateInstructions = parsedScripts.get("_update") ?? null;
	if (updateInstructions === null) {
		throw new Error("_update not defined");
	}

	const standardLibrary = lang.createStandardLibrary();

	const initExecutionResult = lang.executeInstructions(initScript.instructions, new Map(), standardLibrary);
	if (!initExecutionResult.ok) {
		writeExecutionError(initScript.id, initScript.script, initExecutionResult);
		showOutput();
		return;
	}
	if (!initExecutionResult.returnValue) {
		throw new Error("_init must return a value");
	}
	const initialStateValue = initExecutionResult.returnValue;

	const renderer = new Renderer(gameElementCanvasContext);
	const audioPlayer = new AudioPlayer();

	const updateInstructionsExternalFunctions = lang.createStandardLibrary();
	updateInstructionsExternalFunctions.set("draw", (args) => {
		if (args.length !== 3) {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Expected 3 arguments",
			};
			return result;
		}
		const spriteIdValue = args[0];
		const spriteXPositionValue = args[1];
		const spriteYPositionValue = args[2];

		if (spriteIdValue.type !== "value.string") {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Not a string",
			};
			return result;
		}
		if (spriteXPositionValue.type !== "value.number") {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Not a number",
			};
			return result;
		}
		if (spriteYPositionValue.type !== "value.number") {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Not a number",
			};
			return result;
		}

		const sprite = sprites.get(spriteIdValue.string) ?? null;
		if (sprite === null) {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: `Sprite ${spriteIdValue.string} does not exist`,
			};
			return result;
		}

		renderer.pushSprite(
			sprite,
			Math.trunc(spriteXPositionValue.value100 / 100),
			Math.trunc(spriteYPositionValue.value100 / 100),
		);

		const returnValue: lang.NullValue = { type: "value.null" };
		const result: lang.ExternalFunctionSuccessResult = {
			ok: true,
			returnValue: returnValue,
		};
		return result;
	});

	updateInstructionsExternalFunctions.set("set_background_pixels", (args) => {
		if (args.length !== 3) {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Expected 3 arguments",
			};
			return result;
		}
		const solidColorValue = args[0];
		let solidColor: boolean;
		if (solidColorValue.type === "value.true") {
			solidColor = true;
		} else if (solidColorValue.type === "value.false") {
			solidColor = false;
		} else {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Not true or false",
			};
			return result;
		}

		const fullColorValue = args[1];
		let fullColor: boolean;
		if (fullColorValue.type === "value.true") {
			fullColor = true;
		} else if (fullColorValue.type === "value.false") {
			fullColor = false;
		} else {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Not true or false",
			};
			return result;
		}

		const colorIdValue = args[2];
		if (colorIdValue.type !== "value.number") {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Not a number",
			};
			return result;
		}
		const colorId = Math.trunc(colorIdValue.value100 / 100);

		const backgroundColor = graphics.resolvePixelColor(solidColor, fullColor, colorId);

		renderer.setBackgroundColor(backgroundColor);

		const returnValue: lang.NullValue = { type: "value.null" };
		const result: lang.ExternalFunctionSuccessResult = {
			ok: true,
			returnValue: returnValue,
		};
		return result;
	});

	updateInstructionsExternalFunctions.set("check_input", (args) => {
		if (args.length !== 1) {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Expected 1 argument",
			};
			return result;
		}

		const inputId = args[0];
		if (inputId.type !== "value.string") {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Not a string",
			};
			return result;
		}

		const on = inputs.has(inputId.string);
		if (!on) {
			const returnValue: lang.FalseValue = { type: "value.false" };
			const result: lang.ExternalFunctionSuccessResult = {
				ok: true,
				returnValue: returnValue,
			};
			return result;
		}

		const returnValue: lang.TrueValue = { type: "value.true" };
		const result: lang.ExternalFunctionSuccessResult = {
			ok: true,
			returnValue: returnValue,
		};
		return result;
	});

	updateInstructionsExternalFunctions.set("play", (args) => {
		if (args.length !== 1) {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Expected 1 argument",
			};
			return result;
		}

		const audioClipIdValue = args[0];
		if (audioClipIdValue.type !== "value.string") {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Not a string",
			};
			return result;
		}

		const audioClip = audioClips.get(audioClipIdValue.string) ?? null;
		if (audioClip === null) {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: `Audio clip ${audioClipIdValue.string} does not exist`,
			};
			return result;
		}

		audioPlayer.push(audioClip);

		const returnValue: lang.NullValue = { type: "value.null" };
		const result: lang.ExternalFunctionSuccessResult = {
			ok: true,
			returnValue: returnValue,
		};
		return result;
	});

	updateInstructionsExternalFunctions.set("run", (args) => {
		if (args.length !== 2) {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Expected 2 arguments",
			};
			return result;
		}

		const scriptIdValue = args[0];
		if (scriptIdValue.type !== "value.string") {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: "Not a string",
			};
			return result;
		}

		const parsedScript = parsedScripts.get(scriptIdValue.string) ?? null;
		if (parsedScript === null) {
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: `Script ${scriptIdValue.string} does not exist`,
			};
			return result;
		}

		const memory: lang.Memory = new Map();
		memory.set("input", args[1]);
		const executeResult = lang.executeInstructions(
			parsedScript.instructions,
			memory,
			updateInstructionsExternalFunctions,
		);
		if (!executeResult.ok) {
			writeExecutionError(parsedScript.id, parsedScript.script, executeResult);
			const result: lang.ExternalFunctionErrorResult = {
				ok: false,
				message: `Failed to execute ${parsedScript.id}`,
			};
			return result;
		}

		const result: lang.ExternalFunctionSuccessResult = {
			ok: true,
			returnValue: executeResult.returnValue,
		};
		return result;
	});

	await executeUpdateInstructions(
		updateInstructions,
		updateInstructionsExternalFunctions,
		initialStateValue,
		renderer,
		audioPlayer,
	);
}

interface ParsedScript {
	id: string;
	script: string;
	instructions: lang.InstructionNode[];
}
type Inputs = Set<string>;

async function executeUpdateInstructions(
	parsedUpdateScript: ParsedScript,
	externalFunctions: lang.ExternalFunctions,
	state: lang.Value,
	renderer: Renderer,
	audioPlayer: AudioPlayer,
): Promise<void> {
	const startMS = performance.now();

	const memory: lang.Memory = new Map();
	memory.set("state", state);
	const executeResult = lang.executeInstructions(parsedUpdateScript.instructions, memory, externalFunctions);
	if (!executeResult.ok) {
		writeExecutionError(parsedUpdateScript.id, parsedUpdateScript.script, executeResult);
		showOutput();
		return;
	}
	if (executeResult.returnValue === null) {
		throw new Error("_update must return next state");
	}
	const nextState = executeResult.returnValue;

	renderer.render();

	audioPlayer.play();

	const durationMS = performance.now() - startMS;

	await new Promise((r) => setTimeout(r, 10 - durationMS));

	executeUpdateInstructions(parsedUpdateScript, externalFunctions, nextState, renderer, audioPlayer);
}

function getGameElement(): HTMLCanvasElement {
	const elementId = "game";
	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLCanvasElement)) {
		throw new Error(`${element} not a canvas element`);
	}
	return element;
}

function getGameElementCanvasContext(): CanvasRenderingContext2D {
	const gameElement = getGameElement();
	const context = gameElement.getContext("2d");
	if (context === null) {
		throw new Error("Canvas context not available");
	}
	return context;
}

function writeScriptParseError(scriptId: string, script: string, errorResult: lang.ParseErrorResult): void {
	const chars = lang.parseString(script);
	const lineColumnPosition = getLineColumnPosition(chars, errorResult.position);
	writeToOutput(`[Parse error] @ ${scriptId}\n`, {
		color: "#ff3f3f",
		textDecoration: "none",
	});
	writeToOutput(
		`${errorResult.message} (line ${lineColumnPosition.line + 1}, column ${lineColumnPosition.column + 1}):\n`,
		{
			color: "white",
			textDecoration: "none",
		},
	);
	writeToOutput("\n", { color: "white", textDecoration: "none" });
	const lineChars = getLine(chars, lineColumnPosition.line);
	writeToOutput("*", {
		color: "gray",
		textDecoration: "none",
	});
	writeToOutput(String.fromCodePoint(...lineChars.subarray(0, lineColumnPosition.column)), {
		color: "gray",
		textDecoration: "none",
	});
	if (lineColumnPosition.column < lineChars.length) {
		writeToOutput(
			String.fromCodePoint(...lineChars.subarray(lineColumnPosition.column, lineColumnPosition.column + 1)),
			{
				color: "#ff3f3f",
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
	writeToOutput("\n", {
		color: "white",
		textDecoration: "none",
	});
}

function writeExecutionError(scriptId: string, script: string, errorResult: lang.ExecutionErrorResult): void {
	const chars = lang.parseString(script);
	const startLineColumnPosition = getLineColumnPosition(chars, errorResult.startPosition);
	const endLineColumnPosition = getLineColumnPosition(chars, errorResult.endPosition);
	writeToOutput(`[Execution error] @ ${scriptId}\n`, {
		color: "#ff3f3f",
		textDecoration: "none",
	});
	writeToOutput(
		`${errorResult.message} (line ${startLineColumnPosition.line + 1}, column ${startLineColumnPosition.column + 1}-${
			endLineColumnPosition.column
		}):\n`,
		{
			color: "white",
			textDecoration: "none",
		},
	);
	writeToOutput("\n", {
		color: "white",
		textDecoration: "none",
	});
	const lineChars = getLine(chars, startLineColumnPosition.line);
	writeToOutput("*", {
		color: "gray",
		textDecoration: "none",
	});
	writeToOutput(String.fromCodePoint(...lineChars.subarray(0, startLineColumnPosition.column)), {
		color: "gray",
		textDecoration: "none",
	});
	writeToOutput(
		String.fromCodePoint(...lineChars.subarray(startLineColumnPosition.column, endLineColumnPosition.column)),
		{
			color: "#ff3f3f",
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
	writeToOutput("\n", {
		color: "white",
		textDecoration: "none",
	});
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

interface LineColumnPosition {
	line: number;
	column: number;
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

function writeToOutput(message: string, attributes: OutputTextAttributes): void {
	const outputTextElement = getOutputTextElement();
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

function showOutput(): void {
	const outputElement = getOutputElement();
	outputElement.hidden = false;
}

function getOutputTextElement(): HTMLPreElement {
	const elementId = "output-text";
	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLPreElement)) {
		throw new Error(`${element} not a pre element`);
	}
	return element;
}

function getOutputElement(): HTMLDivElement {
	const elementId = "output";
	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLDivElement)) {
		throw new Error(`${element} not a dive element`);
	}
	return element;
}
