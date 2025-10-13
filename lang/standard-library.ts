import type { ExternalFunction, ExternalFunctions, FalseValue, NullValue, NumberValue, TrueValue } from "./execute.js";

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
	functions.set("print", (args) => {
		console.log(...args);
		const result: NullValue = {
			type: "value.null",
		};
		return result;
	});
	functions.set("random", () => {
		const rand = Math.trunc(Math.random() * 100);
		const result: NumberValue = {
			type: "value.number",
			value100: rand * 100,
		};
		return result;
	});
	return functions;
}
