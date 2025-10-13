import { parseIdentifier } from "./identifier.js";
import { isAlphabet, isDigit, parseSpaces } from "./shared.js";

export function parseExpression(bytes: Uint8Array, start: number): ParseExpressionElementResult {
	let resultSize = 0;

	const operators: Operator[] = [];
	const expressionNodes: ExpressionNode[] = [];

	while (true) {
		const parseElementResult = parseExpressionUnit(bytes, start + resultSize);
		expressionNodes.push(parseElementResult.node);
		resultSize += parseElementResult.size;

		const spacesSize = parseSpaces(bytes, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			break;
		}

		if (bytes[start + resultSize] === CHAR_CODE_PLUS) {
			operators.push("add");
			resultSize++;
			continue;
		}

		if (bytes[start + resultSize] === CHAR_CODE_HYPHEN) {
			operators.push("minus");
			resultSize++;
			continue;
		}

		if (bytes[start + resultSize] === CHAR_CODE_ASTERISK) {
			operators.push("multiply");
			resultSize++;
			continue;
		}

		if (bytes[start + resultSize] === CHAR_CODE_SLASH) {
			operators.push("divide");
			resultSize++;
			continue;
		}

		if (bytes[start + resultSize] === CHAR_CODE_PERCENT) {
			operators.push("remainder");
			resultSize++;
			continue;
		}

		if (bytes[start + resultSize] === CHAR_CODE_EQUAL) {
			if (start + resultSize >= bytes.length) {
				throw new Error("Unexpected termination");
			}
			if (bytes[start + resultSize + 1] === CHAR_CODE_EQUAL) {
				operators.push("equal");
				resultSize += 2;
				continue;
			}
			throw new Error(`Unexpected character at position ${start + resultSize}`);
		}

		if (bytes[start + resultSize] === CHAR_CODE_EXCLAMATION_MARK) {
			if (start + resultSize >= bytes.length) {
				throw new Error("Unexpected termination");
			}
			if (bytes[start + resultSize + 1] === CHAR_CODE_EQUAL) {
				operators.push("not_equal");
				resultSize += 2;
				continue;
			}
			throw new Error(`Unexpected character at position ${start + resultSize}`);
		}

		if (bytes[start + resultSize] === CHAR_CODE_OPENING_ANGLE_BRACKET) {
			if (start + resultSize + 1 >= bytes.length) {
				throw new Error("Unexpected termination");
			}
			if (bytes[start + resultSize + 1] === CHAR_CODE_OPENING_ANGLE_BRACKET) {
				operators.push("less_than");
				resultSize += 2;
				continue;
			}
			if (bytes[start + resultSize + 1] === CHAR_CODE_EQUAL) {
				operators.push("less_than_or_equal");
				resultSize += 2;
				continue;
			}
			throw new Error(`Unexpected character at position ${start + resultSize + 1}`);
		}

		if (bytes[start + resultSize + 1] === CHAR_CODE_CLOSING_ANGLE_BRACKET) {
			if (start + resultSize + 1 >= bytes.length) {
				throw new Error("Unexpected termination");
			}
			if (bytes[start + resultSize + 1] === CHAR_CODE_CLOSING_ANGLE_BRACKET) {
				operators.push("greater_than");
				resultSize += 2;
				continue;
			}
			if (bytes[start + resultSize + 1] === CHAR_CODE_EQUAL) {
				operators.push("greater_than_or_equal");
				resultSize += 2;
				continue;
			}
			throw new Error(`Unexpected character at position ${start + resultSize + 1}`);
		}

		break;
	}

	if (operators.length === 0) {
		const result: ParseExpressionResult = {
			size: resultSize,
			node: expressionNodes[0],
		};
		return result;
	}

	while (operators.length > 0) {
		let highestPriority = 0;
		let highestPriorityIndex = 0;
		for (let i = 0; i < operators.length; i++) {
			let operatorPriority: number;
			switch (operators[i]) {
				case "equal":
				case "not_equal": {
					operatorPriority = 0;
					break;
				}
				case "less_than":
				case "less_than_or_equal":
				case "greater_than":
				case "greater_than_or_equal": {
					operatorPriority = 1;
					break;
				}
				case "add":
				case "minus": {
					operatorPriority = 2;
					break;
				}
				case "multiply":
				case "divide":
				case "remainder": {
					operatorPriority = 3;
					break;
				}
			}
			if (operatorPriority > highestPriority) {
				highestPriority = operatorPriority;
				highestPriorityIndex = i;
			}
		}

		let combinedNode: ExpressionNode;
		switch (operators[highestPriorityIndex]) {
			case "add": {
				combinedNode = {
					type: "expression.add_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "minus": {
				combinedNode = {
					type: "expression.minus_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "multiply": {
				combinedNode = {
					type: "expression.multiply_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "divide": {
				combinedNode = {
					type: "expression.divide_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "remainder": {
				combinedNode = {
					type: "expression.remainder_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "equal": {
				combinedNode = {
					type: "expression.equal_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "not_equal": {
				combinedNode = {
					type: "expression.not_equal_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "less_than": {
				combinedNode = {
					type: "expression.less_than_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "less_than_or_equal": {
				combinedNode = {
					type: "expression.less_than_or_equal_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "greater_than": {
				combinedNode = {
					type: "expression.greater_than_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
			case "greater_than_or_equal": {
				combinedNode = {
					type: "expression.greater_than_or_equal_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
				};
				break;
			}
		}

		operators.splice(highestPriorityIndex, 1);
		expressionNodes.splice(highestPriorityIndex, 2, combinedNode);
	}

	const result: ParseExpressionResult = {
		size: resultSize,
		node: expressionNodes[0],
	};
	return result;
}

type Operator =
	| "add"
	| "minus"
	| "multiply"
	| "divide"
	| "remainder"
	| "equal"
	| "not_equal"
	| "less_than"
	| "less_than_or_equal"
	| "greater_than"
	| "greater_than_or_equal";

export interface ParseExpressionResult {
	size: number;
	node: ExpressionNode;
}

export function parseExpressionUnit(bytes: Uint8Array, start: number): ParseExpressionElementResult {
	let resultSize = 0;

	const spacesSize = parseSpaces(bytes, start + resultSize);
	resultSize += spacesSize;

	if (resultSize + start >= bytes.length) {
		throw new Error("Unexpected termination");
	}

	if (bytes[start + resultSize] === CHAR_CODE_DOUBLE_QUOTES) {
		const parseExpressionResult = parseStringLiteralExpression(bytes, start + resultSize);
		const expressionNode = parseExpressionResult.node;
		resultSize += parseExpressionResult.size;

		const result: ParseExpressionElementResult = {
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}

	if (bytes[start + resultSize] === CHAR_CODE_HYPHEN || isDigit(bytes[start + resultSize])) {
		const parseExpressionResult = parseNumberLiteralExpression(bytes, start + resultSize);
		const expressionNode = parseExpressionResult.node;
		resultSize += parseExpressionResult.size;

		const result: ParseExpressionElementResult = {
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}

	if (bytes[start + resultSize] === CHAR_CODE_OPENING_BRACKET) {
		const parseListLiteralExpressionResult = parseListLiteralExpression(bytes, start + resultSize);
		const expressionNode = parseListLiteralExpressionResult.node;
		resultSize += parseListLiteralExpressionResult.size;

		const result: ParseExpressionElementResult = {
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}

	if (bytes[start + resultSize] === CHAR_CODE_OPENING_BRACE) {
		const parseObjectLiteralExpressionResult = parseObjectLiteralExpression(bytes, start + resultSize);
		const expressionNode = parseObjectLiteralExpressionResult.node;
		resultSize += parseObjectLiteralExpressionResult.size;

		const result: ParseExpressionElementResult = {
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}

	if (bytes[start + resultSize] === CHAR_CODE_AT_SIGN) {
		const parseFunctionCallExpressionResult = parseFunctionCallExpression(bytes, start + resultSize);
		const functionCallExpressionNode = parseFunctionCallExpressionResult.node;
		resultSize += parseFunctionCallExpressionResult.size;

		const result: ParseExpressionElementResult = {
			size: resultSize,
			node: functionCallExpressionNode,
		};
		return result;
	}

	if (bytes[start + resultSize] === CHAR_CODE_DOLLAR_SIGN) {
		const parseVariableExpressionResult = parseVariableExpression(bytes, start + resultSize);
		const variableExpressionNode = parseVariableExpressionResult.node;
		resultSize += parseVariableExpressionResult.size;

		const result: ParseExpressionElementResult = {
			size: resultSize,
			node: variableExpressionNode,
		};
		return result;
	}

	if (isAlphabet(bytes[start + resultSize])) {
		const parseSpecialWordExpressionResult = parseSpecialWordExpressionNode(bytes, start + resultSize);
		const specialWordExpressionNode = parseSpecialWordExpressionResult.node;
		resultSize += parseSpecialWordExpressionResult.size;

		const result: ParseExpressionElementResult = {
			size: resultSize,
			node: specialWordExpressionNode,
		};
		return result;
	}

	if (bytes[start + resultSize] === CHAR_CODE_OPENING_PARENTHESIS) {
		resultSize++;

		const parseExpressionResult = parseExpression(bytes, start + resultSize);
		const groupExpressionNode: GroupExpressionNode = {
			type: "expression.group",
			expressionNode: parseExpressionResult.node,
		};
		resultSize += parseExpressionResult.size;

		const spacesSize = parseSpaces(bytes, start + resultSize);
		resultSize += spacesSize;

		if (resultSize + start >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[start + resultSize] !== CHAR_CODE_CLOSING_PARENTHESIS) {
			throw new Error(`Expected closing parenthesis at position ${start + resultSize}`);
		}
		resultSize++;

		const result: ParseExpressionElementResult = {
			size: resultSize,
			node: groupExpressionNode,
		};
		return result;
	}

	throw new Error(`Unknown character at position ${start + resultSize}`);
}

export interface ParseExpressionElementResult {
	size: number;
	node: ExpressionNode;
}

function parseStringLiteralExpression(bytes: Uint8Array, start: number): ParseStringLiteralExpressionResult {
	let resultSize = 0;
	const valueVariableBytes: number[] = [];

	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[start + resultSize] !== CHAR_CODE_DOUBLE_QUOTES) {
		throw new Error(`Expected double quotes at position ${start + resultSize}`);
	}
	resultSize++;

	while (true) {
		if (start >= bytes.length) {
			throw new Error("Unexpected termination");
		}

		if (bytes[start + resultSize] === CHAR_CODE_DOUBLE_QUOTES) {
			resultSize++;
			break;
		}

		if (bytes[start + resultSize] === CHAR_CODE_BACKSLASH) {
			if (start + resultSize + 1 >= bytes.length) {
				throw new Error("Unexpected termination");
			}

			if (bytes[start + resultSize + 1] === CHAR_CODE_LOWERCASE_N) {
				valueVariableBytes.push(10);
				resultSize += 2;
			} else if (bytes[start + resultSize] === CHAR_CODE_DOUBLE_QUOTES) {
				valueVariableBytes.push(bytes[start + resultSize]);
				resultSize += 2;
			} else if (bytes[start + resultSize] === CHAR_CODE_BACKSLASH) {
				valueVariableBytes.push(bytes[start + resultSize]);
				resultSize += 2;
			} else {
				throw new Error(`Unknown escape sequence at position ${start + resultSize}`);
			}
		} else if (isASCIIStringCharacter(bytes[start + resultSize])) {
			valueVariableBytes.push(bytes[start + resultSize]);
			resultSize++;
		} else {
			throw new Error(`Unknown character at position ${start + resultSize}`);
		}
	}

	const value = String.fromCharCode(...valueVariableBytes);
	const expressionNode: StringLiteralExpressionNode = {
		type: "expression.string_literal",
		string: value,
	};
	const result: ParseStringLiteralExpressionResult = {
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

interface ParseStringLiteralExpressionResult {
	size: number;
	node: StringLiteralExpressionNode;
}

function parseNumberLiteralExpression(bytes: Uint8Array, start: number): ParseNumberLiteralExpressionResult {
	let resultSize = 0;

	let positive = true;
	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[start + resultSize] === CHAR_CODE_HYPHEN) {
		positive = false;
		resultSize++;
	}

	let whole: number;
	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[start + resultSize] === CHAR_CODE_ZERO) {
		whole = 0;
		resultSize++;

		if (start + resultSize < bytes.length && isDigit(bytes[start + resultSize])) {
			throw new Error(`Unexpected digit at position ${start + resultSize}`);
		}
	} else {
		whole = bytes[start + resultSize] - 48;
		resultSize++;

		while (true) {
			if (start + resultSize >= bytes.length) {
				break;
			}
			if (!isDigit(bytes[start + resultSize])) {
				break;
			}
			whole = whole * 10 + (bytes[start + resultSize] - 48);
			resultSize++;
		}
	}

	if (start + resultSize >= bytes.length) {
		let value100: number;
		if (positive) {
			value100 = whole * 100;
		} else {
			value100 = whole * 100 * -1;
		}
		const expressionNode: NumberLiteralExpressionNode = {
			type: "expression.number_literal",
			value100: value100,
		};
		const result: ParseNumberLiteralExpressionResult = {
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}
	if (bytes[start + resultSize] !== CHAR_CODE_PERIOD) {
		let value100: number;
		if (positive) {
			value100 = whole * 100;
		} else {
			value100 = whole * 100 * -1;
		}
		const expressionNode: NumberLiteralExpressionNode = {
			type: "expression.number_literal",
			value100: value100,
		};
		const result: ParseNumberLiteralExpressionResult = {
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}
	resultSize++;

	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (!isDigit(bytes[start + resultSize])) {
		throw new Error(`Expected digit at position ${start + resultSize}`);
	}
	let decimal100 = (bytes[start + resultSize] - 48) * 10;
	resultSize++;

	if (start + resultSize >= bytes.length) {
		let value100: number;
		if (positive) {
			value100 = whole * 100 + decimal100;
		} else {
			value100 = (whole * 100 + decimal100) * -1;
		}
		const expressionNode: NumberLiteralExpressionNode = {
			type: "expression.number_literal",
			value100: value100,
		};
		const result: ParseNumberLiteralExpressionResult = {
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}
	if (!isDigit(bytes[start + resultSize])) {
		let value100: number;
		if (positive) {
			value100 = whole * 100 + decimal100;
		} else {
			value100 = (whole * 100 + decimal100) * -1;
		}
		const expressionNode: NumberLiteralExpressionNode = {
			type: "expression.number_literal",
			value100: value100,
		};
		const result: ParseNumberLiteralExpressionResult = {
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}
	decimal100 += bytes[start + resultSize] - 48;
	resultSize++;

	if (start + resultSize < bytes.length && isDigit(bytes[start + resultSize])) {
		throw new Error(`Unexpected digit at position ${start + resultSize}`);
	}

	let value100: number;
	if (positive) {
		value100 = whole * 100 + decimal100;
	} else {
		value100 = (whole * 100 + decimal100) * -1;
	}
	const expressionNode: NumberLiteralExpressionNode = {
		type: "expression.number_literal",
		value100: value100,
	};
	const result: ParseNumberLiteralExpressionResult = {
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

interface ParseNumberLiteralExpressionResult {
	size: number;
	node: NumberLiteralExpressionNode;
}

function parseFunctionCallExpression(bytes: Uint8Array, start: number): ParseFunctionCallExpression {
	let resultSize = 0;

	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[start + resultSize] !== CHAR_CODE_AT_SIGN) {
		throw new Error(`Expected at sign at position ${start + resultSize}`);
	}
	resultSize++;

	const parseFunctionNameResult = parseIdentifier(bytes, start + resultSize);
	const functionName = parseFunctionNameResult.identifier;
	resultSize += parseFunctionNameResult.size;

	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[start + resultSize] !== CHAR_CODE_OPENING_PARENTHESIS) {
		throw new Error(`Expected opening parenthesis at position ${start + resultSize}`);
	}
	resultSize++;

	const argumentNodes: ExpressionNode[] = [];
	while (true) {
		let spacesSize = parseSpaces(bytes, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}

		if (bytes[start + resultSize] === CHAR_CODE_CLOSING_PARENTHESIS) {
			resultSize++;

			break;
		}

		const parseArgumentResult = parseExpression(bytes, start + resultSize);
		argumentNodes.push(parseArgumentResult.node);
		resultSize += parseArgumentResult.size;

		spacesSize = parseSpaces(bytes, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[start + resultSize] === CHAR_CODE_CLOSING_PARENTHESIS) {
			resultSize++;

			break;
		}
		if (bytes[start + resultSize] !== CHAR_CODE_COMMA) {
			throw new Error(`Expected comma at position ${start + resultSize}`);
		}
		resultSize++;
	}

	const expressionNode: FunctionCallExpressionNode = {
		type: "expression.function_call",
		functionName: functionName,
		argumentNodes: argumentNodes,
	};
	const result: ParseFunctionCallExpression = {
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

interface ParseFunctionCallExpression {
	size: number;
	node: FunctionCallExpressionNode;
}

function parseSpecialWordExpressionNode(bytes: Uint8Array, start: number): ParseSpecialWordExpressionNode {
	let resultSize = 0;

	const parseSpecialWordResult = parseIdentifier(bytes, start + resultSize);
	const specialWord = parseSpecialWordResult.identifier;
	resultSize += parseSpecialWordResult.size;

	const specialWordExpressionNode: SpecialWordExpressionNode = {
		type: "expression.special_word",
		specialWord: specialWord,
	};

	const result: ParseSpecialWordExpressionNode = {
		size: resultSize,
		node: specialWordExpressionNode,
	};
	return result;
}

interface ParseSpecialWordExpressionNode {
	size: number;
	node: SpecialWordExpressionNode;
}

function parseVariableExpression(bytes: Uint8Array, start: number): ParseVariableExpressionResult {
	let resultSize = 0;

	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[start + resultSize] !== CHAR_CODE_DOLLAR_SIGN) {
		throw new Error(`Expected dollar sign at position ${start + resultSize}`);
	}
	resultSize++;

	const parseVariableNameResult = parseIdentifier(bytes, start + resultSize);
	const variableName = parseVariableNameResult.identifier;
	resultSize += parseVariableNameResult.size;

	const valueAccessorNodes: ValueAccessorNode[] = [];
	while (true) {
		if (start + resultSize >= bytes.length) {
			break;
		}
		if (bytes[start + resultSize] === CHAR_CODE_PERIOD) {
			const parsePropertyValueAccessorResult = parsePropertyValueAccessor(bytes, start + resultSize);
			valueAccessorNodes.push(parsePropertyValueAccessorResult.node);
			resultSize += parsePropertyValueAccessorResult.size;
		} else if (bytes[start + resultSize] === CHAR_CODE_OPENING_BRACKET) {
			const parseIndexValueAccessorResult = parseIndexValueAccessor(bytes, start + resultSize);
			valueAccessorNodes.push(parseIndexValueAccessorResult.node);
			resultSize += parseIndexValueAccessorResult.size;
		} else {
			break;
		}
	}

	const inputExpressionNode: VariableExpressionNode = {
		type: "expression.variable",
		variableName: variableName,
		valueAccessorNodes: valueAccessorNodes,
	};

	const result: ParseVariableExpressionResult = {
		size: resultSize,
		node: inputExpressionNode,
	};
	return result;
}

interface ParseVariableExpressionResult {
	size: number;
	node: VariableExpressionNode;
}

function parsePropertyValueAccessor(bytes: Uint8Array, start: number): ParsePropertyValueAccessorResult {
	let resultSize = 0;

	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[start + resultSize] !== CHAR_CODE_PERIOD) {
		throw new Error(`Expected period at position ${start + resultSize}`);
	}
	resultSize++;

	const parsePropertyNameResult = parseIdentifier(bytes, start + resultSize);
	const propertyName = parsePropertyNameResult.identifier;
	resultSize += parsePropertyNameResult.size;

	const propertyValueAccessorNode: PropertyValueAccessorNode = {
		type: "value_accessor.property",
		propertyName: propertyName,
	};

	const result: ParsePropertyValueAccessorResult = {
		size: resultSize,
		node: propertyValueAccessorNode,
	};
	return result;
}

interface ParsePropertyValueAccessorResult {
	size: number;
	node: PropertyValueAccessorNode;
}

function parseIndexValueAccessor(bytes: Uint8Array, start: number): ParseIndexValueAccessorResult {
	let resultSize = 0;

	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[start + resultSize] !== CHAR_CODE_OPENING_BRACKET) {
		throw new Error(`Expected period at position ${start + resultSize}`);
	}
	resultSize++;

	const parseIndexExpressionResult = parseExpression(bytes, start + resultSize);
	const indexExpressionNode = parseIndexExpressionResult.node;
	resultSize += parseIndexExpressionResult.size;

	const spacesSize = parseSpaces(bytes, start + resultSize);
	resultSize += spacesSize;

	if (bytes[start + resultSize] !== CHAR_CODE_CLOSING_BRACKET) {
		throw new Error(`Expected closing bracket at position ${start + resultSize}`);
	}
	resultSize++;

	const valueAccessorNode: IndexValueAccessorNode = {
		type: "value_accessor.index",
		indexExpressionNode: indexExpressionNode,
	};

	const result: ParseIndexValueAccessorResult = {
		size: resultSize,
		node: valueAccessorNode,
	};
	return result;
}

interface ParseIndexValueAccessorResult {
	size: number;
	node: IndexValueAccessorNode;
}

function parseListLiteralExpression(bytes: Uint8Array, start: number): ParseListLiteralExpressionResult {
	let resultSize = 0;

	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[start + resultSize] !== CHAR_CODE_OPENING_BRACKET) {
		throw new Error(`Expected opening bracket at position ${start + resultSize}`);
	}
	resultSize++;

	const listItemNodes: ExpressionNode[] = [];
	while (true) {
		let spacesSize = parseSpaces(bytes, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}

		if (bytes[start + resultSize] === CHAR_CODE_CLOSING_BRACKET) {
			resultSize++;

			break;
		}

		const parseItemResult = parseExpression(bytes, start + resultSize);
		listItemNodes.push(parseItemResult.node);
		resultSize += parseItemResult.size;

		spacesSize = parseSpaces(bytes, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[start + resultSize] === CHAR_CODE_CLOSING_BRACKET) {
			resultSize++;

			break;
		}
		if (bytes[start + resultSize] !== CHAR_CODE_COMMA) {
			throw new Error(`Expected comma at position ${start + resultSize}`);
		}
		resultSize++;
	}

	const expressionNode: ListLiteralExpressionNode = {
		type: "expression.list_literal",
		listItemNodes: listItemNodes,
	};
	const result: ParseListLiteralExpressionResult = {
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

interface ParseListLiteralExpressionResult {
	size: number;
	node: ListLiteralExpressionNode;
}

function parseObjectLiteralExpression(bytes: Uint8Array, i: number): ParseObjectLiteralExpressionResult {
	let resultSize = 0;

	if (i + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (bytes[i + resultSize] !== CHAR_CODE_OPENING_BRACE) {
		throw new Error(`Expected opening brace at position ${i + resultSize}`);
	}
	resultSize++;

	const objectProperties = new Map<string, ExpressionNode>();
	while (true) {
		let spacesSize = parseSpaces(bytes, i + resultSize);
		resultSize += spacesSize;

		if (i + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[i + resultSize] === CHAR_CODE_CLOSING_BRACE) {
			resultSize++;

			break;
		}

		const parsePropertyNameResult = parseIdentifier(bytes, i + resultSize);
		const propertyName = parsePropertyNameResult.identifier;
		resultSize += parsePropertyNameResult.size;

		spacesSize = parseSpaces(bytes, i + resultSize);
		resultSize += spacesSize;

		if (i + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[i + resultSize] !== CHAR_CODE_COLON) {
			throw new Error(`Expected colon at position ${i + resultSize}`);
		}
		resultSize++;

		const parsePropertyValueResult = parseExpression(bytes, i + resultSize);
		objectProperties.set(propertyName, parsePropertyValueResult.node);
		resultSize += parsePropertyValueResult.size;

		spacesSize = parseSpaces(bytes, i + resultSize);
		resultSize += spacesSize;

		if (i + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[i + resultSize] === CHAR_CODE_CLOSING_BRACE) {
			resultSize++;

			break;
		}
		if (bytes[i + resultSize] !== CHAR_CODE_COMMA) {
			throw new Error(`Expected comma at position ${i + resultSize}`);
		}
		resultSize++;
	}

	const expressionNode: ObjectLiteralExpressionNode = {
		type: "expression.object_literal",
		objectProperties: objectProperties,
	};
	const result: ParseObjectLiteralExpressionResult = {
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

interface ParseObjectLiteralExpressionResult {
	size: number;
	node: ObjectLiteralExpressionNode;
}

export type ExpressionNode =
	| NumberLiteralExpressionNode
	| StringLiteralExpressionNode
	| SpecialWordExpressionNode
	| ListLiteralExpressionNode
	| ObjectLiteralExpressionNode
	| VariableExpressionNode
	| FunctionCallExpressionNode
	| AddOperatorExpressionNode
	| MinusOperatorExpressionNode
	| MultiplyOperatorExpressionNode
	| DivideOperatorExpressionNode
	| RemainderOperatorExpressionNode
	| EqualOperatorExpressionNode
	| NotEqualOperatorExpressionNode
	| LessThanOperatorExpressionNode
	| LessThanOrEqualOperatorExpressionNode
	| GreaterThanOperatorExpressionNode
	| GreaterThanOrEqualOperatorExpressionNode
	| GroupExpressionNode;

export interface NumberLiteralExpressionNode {
	type: "expression.number_literal";
	value100: number;
}

export interface StringLiteralExpressionNode {
	type: "expression.string_literal";
	string: string;
}

export interface SpecialWordExpressionNode {
	type: "expression.special_word";
	specialWord: string;
}

export interface ListLiteralExpressionNode {
	type: "expression.list_literal";
	listItemNodes: ExpressionNode[];
}

export interface ObjectLiteralExpressionNode {
	type: "expression.object_literal";
	objectProperties: Map<string, ExpressionNode>;
}

export interface VariableExpressionNode {
	type: "expression.variable";
	variableName: string;
	valueAccessorNodes: ValueAccessorNode[];
}

export interface FunctionCallExpressionNode {
	type: "expression.function_call";
	functionName: string;
	argumentNodes: ExpressionNode[];
}

export interface AddOperatorExpressionNode {
	type: "expression.add_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface MinusOperatorExpressionNode {
	type: "expression.minus_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface MultiplyOperatorExpressionNode {
	type: "expression.multiply_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface DivideOperatorExpressionNode {
	type: "expression.divide_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface RemainderOperatorExpressionNode {
	type: "expression.remainder_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface EqualOperatorExpressionNode {
	type: "expression.equal_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface NotEqualOperatorExpressionNode {
	type: "expression.not_equal_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface LessThanOperatorExpressionNode {
	type: "expression.less_than_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface LessThanOrEqualOperatorExpressionNode {
	type: "expression.less_than_or_equal_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface GreaterThanOperatorExpressionNode {
	type: "expression.greater_than_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface GreaterThanOrEqualOperatorExpressionNode {
	type: "expression.greater_than_or_equal_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
}

export interface GroupExpressionNode {
	type: "expression.group";
	expressionNode: ExpressionNode;
}

export type ValueAccessorNode = PropertyValueAccessorNode | IndexValueAccessorNode;

export interface PropertyValueAccessorNode {
	type: "value_accessor.property";
	propertyName: string;
}

export interface IndexValueAccessorNode {
	type: "value_accessor.index";
	indexExpressionNode: ExpressionNode;
}

function isASCIIStringCharacter(charCode: number): boolean {
	return charCode >= 32 && charCode <= 126;
}

const CHAR_CODE_EXCLAMATION_MARK = 33;
const CHAR_CODE_DOUBLE_QUOTES = 34;
const CHAR_CODE_DOLLAR_SIGN = 36;
const CHAR_CODE_PERCENT = 37;
const CHAR_CODE_OPENING_PARENTHESIS = 40;
const CHAR_CODE_CLOSING_PARENTHESIS = 41;
const CHAR_CODE_ASTERISK = 42;
const CHAR_CODE_PLUS = 43;
const CHAR_CODE_COMMA = 44;
const CHAR_CODE_HYPHEN = 45;
const CHAR_CODE_PERIOD = 46;
const CHAR_CODE_SLASH = 47;
const CHAR_CODE_ZERO = 48;
const CHAR_CODE_COLON = 58;
const CHAR_CODE_OPENING_ANGLE_BRACKET = 60;
const CHAR_CODE_EQUAL = 61;
const CHAR_CODE_CLOSING_ANGLE_BRACKET = 62;
const CHAR_CODE_AT_SIGN = 64;
const CHAR_CODE_OPENING_BRACKET = 91;
const CHAR_CODE_BACKSLASH = 92;
const CHAR_CODE_CLOSING_BRACKET = 93;
const CHAR_CODE_OPENING_BRACE = 123;
const CHAR_CODE_CLOSING_BRACE = 125;
const CHAR_CODE_LOWERCASE_N = 110;
