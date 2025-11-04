import type {
    ExternalFunction,
    ExternalFunctionErrorResult,
    ExternalFunctionSuccessResult,
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
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Empty argument list",
            };
            return result;
        }
        for (let i = 0; i < args.length; i++) {
            if (args[i].type === "value.false") {
                const returnValue: FalseValue = {
                    type: "value.false",
                };
                const result: ExternalFunctionSuccessResult = {
                    ok: true,
                    returnValue: returnValue,
                };
                return result;
            }
            if (args[i].type === "value.true") {
                continue;
            }
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Received non-boolean value",
            };
            return result;
        }
        const returnValue: TrueValue = {
            type: "value.true",
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("or", (args) => {
        if (args.length < 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Empty argument list",
            };
            return result;
        }
        for (let i = 0; i < args.length; i++) {
            if (args[i].type === "value.true") {
                const returnValue: TrueValue = {
                    type: "value.true",
                };
                const result: ExternalFunctionSuccessResult = {
                    ok: true,
                    returnValue: returnValue,
                };
                return result;
            }
            if (args[i].type === "value.false") {
                continue;
            }
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Received non-boolean value",
            };
            return result;
        }
        const returnValue: FalseValue = {
            type: "value.false",
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("size", (args) => {
        if (args.length !== 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Expected 1 argument",
            };
            return result;
        }
        const arg = args[0];
        if (arg.type === "value.list") {
            const returnValue: NumberValue = {
                type: "value.number",
                value100: arg.items.length * 100,
            };
            const result: ExternalFunctionSuccessResult = {
                ok: true,
                returnValue: returnValue,
            };
            return result;
        }
        if (arg.type === "value.object") {
            const returnValue: NumberValue = {
                type: "value.number",
                value100: arg.properties.size * 100,
            };
            const result: ExternalFunctionSuccessResult = {
                ok: true,
                returnValue: returnValue,
            };
            return result;
        }
        const result: ExternalFunctionErrorResult = {
            ok: false,
            message: "Argument not a list or object",
        };
        return result;
    });
    functions.set("random", () => {
        const rand = Math.trunc(Math.random() * 100);
        const returnValue: NumberValue = {
            type: "value.number",
            value100: rand,
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("stringify", (args) => {
        if (args.length !== 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Expected 1 argument",
            };
            return result;
        }
        const arg = args[0];
        const stringified = stringifyValue(arg);
        const returnValue: StringValue = {
            type: "value.string",
            string: stringified,
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("sqrt", (args) => {
        if (args.length !== 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Expected 1 argument",
            };
            return result;
        }
        const arg = args[0];
        if (arg.type !== "value.number") {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Not a number",
            };
            return result;
        }
        if (arg.value100 < 0) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Not a positive number or zero",
            };
            return result;
        }
        const value100 = Math.trunc(Math.sqrt(arg.value100) * 10);
        const returnValue: NumberValue = {
            type: "value.number",
            value100: value100,
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("floor", (args) => {
        if (args.length !== 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Expected 1 argument",
            };
            return result;
        }
        const arg = args[0];
        if (arg.type !== "value.number") {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Not a number",
            };
            return result;
        }
        const value100 = Math.floor(arg.value100 / 100) * 100;
        const returnValue: NumberValue = {
            type: "value.number",
            value100: value100,
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("ceil", (args) => {
        if (args.length !== 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Expected 1 argument",
            };
            return result;
        }
        const arg = args[0];
        if (arg.type !== "value.number") {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Not a number",
            };
            return result;
        }
        const value100 = Math.ceil(arg.value100 / 100) * 100;
        const returnValue: NumberValue = {
            type: "value.number",
            value100: value100,
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("abs", (args) => {
        if (args.length !== 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Expected 1 argument",
            };
            return result;
        }
        const arg = args[0];
        if (arg.type !== "value.number") {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Not a number",
            };
            return result;
        }
        const returnValue: NumberValue = {
            type: "value.number",
            value100: Math.abs(arg.value100),
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("trunc", (args) => {
        if (args.length !== 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Not a number",
            };
            return result;
        }
        const arg = args[0];
        if (arg.type !== "value.number") {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Not a number",
            };
            return result;
        }
        const value100 = Math.trunc(arg.value100 / 100) * 100;
        const returnValue: NumberValue = {
            type: "value.number",
            value100: value100,
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("format_int", (args) => {
        if (args.length !== 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Expected 1 argument",
            };
            return result;
        }
        const arg = args[0];
        if (arg.type !== "value.number") {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Not a number",
            };
            return result;
        }
        if (arg.value100 % 100 !== 0) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Not an integer",
            };
            return result;
        }
        let formatted: string;
        if (arg.value100 >= 0) {
            formatted = `${arg.value100 / 100}`;
        } else {
            formatted = `-${arg.value100 / 100}`;
        }
        const returnValue: StringValue = {
            type: "value.string",
            string: formatted,
        };
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: returnValue,
        };
        return result;
    });
    functions.set("max", (args) => {
        if (args.length < 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Expected 1 or more argument",
            };
            return result;
        }
        let maxIndex = 0;
        let maxValue: number | null = null;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.type !== "value.number") {
                const result: ExternalFunctionErrorResult = {
                    ok: false,
                    message: "Not a number",
                };
                return result;
            }
            if (maxValue === null || arg.value100 > maxValue) {
                maxIndex = i;
                maxValue = arg.value100;
            }
        }
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: args[maxIndex],
        };
        return result;
    });
    functions.set("min", (args) => {
        if (args.length < 1) {
            const result: ExternalFunctionErrorResult = {
                ok: false,
                message: "Expected 1 or more argument",
            };
            return result;
        }
        let minIndex = 0;
        let minValue: number | null = null;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.type !== "value.number") {
                const result: ExternalFunctionErrorResult = {
                    ok: false,
                    message: "Not a number",
                };
                return result;
            }
            if (minValue === null || arg.value100 < minValue) {
                minIndex = i;
                minValue = arg.value100;
            }
        }
        const result: ExternalFunctionSuccessResult = {
            ok: true,
            returnValue: args[minIndex],
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
            const propertyKeyValuePairs = Array.from(
                value.properties.entries()
            );
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
