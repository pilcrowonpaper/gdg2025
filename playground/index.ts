import * as lang from "@lang";

const runButtonElement = document.getElementById("run-button");
if (!(runButtonElement instanceof HTMLButtonElement)) {
	throw new Error("Not a button element");
}

const textEditorElement = document.getElementById("input");
if (!(textEditorElement instanceof HTMLTextAreaElement)) {
	throw new Error("Not a textarea element");
}

const outputTextElement = document.getElementById("output-text");
if (!(outputTextElement instanceof HTMLPreElement)) {
	throw new Error("Not a pre element");
}

const storedScript = window.localStorage.getItem("script");
if (storedScript !== null) {
	textEditorElement.value = storedScript;
}

runButtonElement.addEventListener("click", () => {
	outputTextElement.innerText = "";

	const instructions = lang.parseScript(textEditorElement.value);
	const memory: lang.Memory = new Map();
	const externalFunctions = lang.createStandardLibrary();
	externalFunctions.set("log", (args) => {
		const outputItems: string[] = [];
		for (const value of args) {
			const formattedValue = formatLangValue(value);
			outputItems.push(formattedValue);
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
	const formattedResultValue = formatLangValue(result);
	outputTextElement.innerText += `[result] ${formattedResultValue}\n`;
});

textEditorElement.addEventListener("input", () => {
	window.localStorage.setItem("script", textEditorElement.value);
});

textEditorElement.addEventListener("keydown", (e) => {
	if (e.key === "Tab") {
		e.preventDefault();
		const start = textEditorElement.selectionStart;
		const end = textEditorElement.selectionEnd;

		textEditorElement.value = `${textEditorElement.value.slice(0, start)}\t${textEditorElement.value.slice(end)}`;

		textEditorElement.selectionStart = start + 1;
		textEditorElement.selectionEnd = start + 1;
	} else if (e.key === "Escape") {
		textEditorElement.blur();
		// TODO: focus next element
	}
});

export function formatLangValue(value: lang.Value): string {
	switch (value.type) {
		case "value.number": {
			const whole = Math.floor(Math.abs(value.value100) / 100);
			const decimal = Math.abs(value.value100) % 100;
			const decimalTenth = Math.floor(decimal / 10);
			const decimalHundredth = decimal % 10;
			if (value.value100 >= 0) {
				return `${whole}.${decimalTenth}${decimalHundredth}`;
			}
			return `-${whole}.${decimalTenth}${decimalHundredth}`;
		}
		case "value.string": {
			let stringContent = "";
			for (let i = 0; i < value.string.length; i++) {
				if (value.string[i] === "\n") {
					stringContent += "\\n";
				} else if (value.string[i] === "\t") {
					stringContent += "\\t";
				} else if (value.string[i] === '"') {
					stringContent += '\\"';
				} else if (value.string[i] === "\\") {
					stringContent += "\\\\";
				} else {
					stringContent += value.string[i];
				}
			}
			return `"${stringContent}"`;
		}
		case "value.true": {
			return "true";
		}
		case "value.false": {
			return "false";
		}
		case "value.null": {
			return "null";
		}
		case "value.list": {
			let listContent = "";
			for (let i = 0; i < value.items.length; i++) {
				const formattedItem = formatLangValue(value.items[i]);
				listContent += formattedItem;
				if (i < value.items.length - 1) {
					listContent += ", ";
				}
			}
			return `[ ${listContent} ]`;
		}
		case "value.object": {
			let objectContent = "";
			const propertyKeyValuePairs = Array.from(value.properties.entries());
			for (let i = 0; i < propertyKeyValuePairs.length; i++) {
				const [propertyName, propertyValue] = propertyKeyValuePairs[i];
				const formattedPropertyValue = formatLangValue(propertyValue);
				objectContent += `${propertyName}: ${formattedPropertyValue}`;
				if (i < propertyKeyValuePairs.length - 1) {
					objectContent += ", ";
				}
			}
			return `{ ${objectContent} }`;
		}
	}
}
