import type {
	ExternalFunction,
	ExternalFunctions,
	FalseValue,
	NumberValue,
	StringValue,
	TrueValue,
	Value,
} from "./execute.js";

export function createStandardLibrary(): Map<string, ExternalFunction> {
	const functions: ExternalFunctions = new Map();
	functions.set("and", (args) => {
		if (args.length < 1) {
			throw new Error("Empty argument list");
		}
		for (let i = 0; i < args.length; i++) {
			if (args[i].type === "value.false") {
				const result: FalseValue = {
					type: "value.false",
				};
				return result;
			}
			if (args[i].type === "value.true") {
				continue;
			}
			throw new Error("Non-boolean value");
		}
		const result: TrueValue = {
			type: "value.true",
		};
		return result;
	});
	functions.set("or", (args) => {
		if (args.length < 1) {
			throw new Error("Empty argument list");
		}
		for (let i = 0; i < args.length; i++) {
			if (args[i].type === "value.true") {
				const result: TrueValue = {
					type: "value.true",
				};
				return result;
			}
			if (args[i].type === "value.true") {
				continue;
			}
			throw new Error("Non-boolean value");
		}
		const result: FalseValue = {
			type: "value.false",
		};
		return result;
	});
	functions.set("size", (args) => {
		if (args.length !== 1) {
			throw new Error("Expected 1 argument");
		}
		const arg = args[0];
		if (arg.type === "value.list") {
			const result: NumberValue = {
				type: "value.number",
				value100: arg.items.length * 100,
			};
			return result;
		}
		if (arg.type === "value.object") {
			const result: NumberValue = {
				type: "value.number",
				value100: arg.properties.size * 100,
			};
			return result;
		}
		throw new Error("Not a list or object value");
	});
	functions.set("size", (args) => {
		if (args.length !== 1) {
			throw new Error("Expected 1 argument");
		}
		const arg = args[0];
		if (arg.type === "value.list") {
			const result: NumberValue = {
				type: "value.number",
				value100: arg.items.length * 100,
			};
			return result;
		}
		if (arg.type === "value.object") {
			const result: NumberValue = {
				type: "value.number",
				value100: arg.properties.size * 100,
			};
			return result;
		}
		throw new Error("Not a list or object value");
	});
	functions.set("random", () => {
		const rand = Math.trunc(Math.random() * 100);
		const result: NumberValue = {
			type: "value.number",
			value100: rand,
		};
		return result;
	});
	functions.set("stringify", (args) => {
		if (args.length !== 1) {
			throw new Error("Expected 1 argument");
		}
		const arg = args[0];
		const stringified = stringifyValue(arg);
		const result: StringValue = {
			type: "value.string",
			string: stringified,
		};
		return result;
	});
	functions.set("sqrt", (args) => {
		if (args.length !== 1) {
			throw new Error("Expected 1 argument");
		}
		const arg = args[0];
		if (arg.type !== "value.number") {
			throw new Error("Not a number");
		}
		if (arg.value100 < 0) {
			throw new Error("Not a positive number");
		}
		const value100 = Math.trunc(Math.sqrt(arg.value100) * 10);
		const result: NumberValue = {
			type: "value.number",
			value100: value100,
		};
		return result;
	});
	functions.set("trunc", (args) => {
		if (args.length !== 1) {
			throw new Error("Expected 1 argument");
		}
		const arg = args[0];
		if (arg.type !== "value.number") {
			throw new Error("Not a number");
		}
		const value100 = Math.trunc(arg.value100 / 100);
		const result: NumberValue = {
			type: "value.number",
			value100: value100,
		};
		return result;
	});
	functions.set("format_int", (args) => {
		if (args.length !== 1) {
			throw new Error("Expected 1 argument");
		}
		const arg = args[0];
		if (arg.type !== "value.number") {
			throw new Error("Not a number");
		}
		if (arg.value100 % 100 !== 0) {
			throw new Error("Not an integer");
		}
		let formatted: string;
		if (arg.value100 > 0) {
			formatted = `${arg.value100 / 100}`;
		} else {
			formatted = `-${arg.value100 / 100}`;
		}
		const result: StringValue = {
			type: "value.string",
			string: formatted,
		};
		return result;
	});
	return functions;
}

export function stringifyValue(value: Value): string {
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
				const stringified = stringifyValue(value.items[i]);
				listContent += stringified;
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
				const stringifiedPropertyValue = stringifyValue(propertyValue);
				objectContent += `${propertyName}: ${stringifiedPropertyValue}`;
				if (i < propertyKeyValuePairs.length - 1) {
					objectContent += ", ";
				}
			}
			return `{ ${objectContent} }`;
		}
	}
}
