import { parseIdentifier } from "./identifier.js";
import type { ParseErrorResult } from "./shared.js";
import { isAlphabet, isDigit, parseSpaces } from "./shared.js";

export function parseExpression(chars: Uint32Array, start: number): ParseExpressionResult {
	let resultSize = 0;

	const operators: Operator[] = [];
	const expressionNodes: ExpressionNode[] = [];

	while (true) {
		const parseElementResult = parseExpressionUnit(chars, start + resultSize);
		if (!parseElementResult.ok) {
			return parseElementResult;
		}
		expressionNodes.push(parseElementResult.node);
		resultSize += parseElementResult.size;

		const spacesSize = parseSpaces(chars, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			break;
		}

		if (chars[start + resultSize] === CODE_POINT_PLUS) {
			operators.push("add");
			resultSize++;
			continue;
		}

		if (chars[start + resultSize] === CODE_POINT_HYPHEN) {
			operators.push("minus");
			resultSize++;
			continue;
		}

		if (chars[start + resultSize] === CODE_POINT_ASTERISK) {
			operators.push("multiply");
			resultSize++;
			continue;
		}

		if (chars[start + resultSize] === CODE_POINT_SLASH) {
			operators.push("divide");
			resultSize++;
			continue;
		}

		if (chars[start + resultSize] === CODE_POINT_PERCENT) {
			operators.push("remainder");
			resultSize++;
			continue;
		}

		if (chars[start + resultSize] === CODE_POINT_EQUAL) {
			if (start + resultSize >= chars.length) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Unexpected termination",
				};
				return result;
			}
			if (chars[start + resultSize + 1] === CODE_POINT_EQUAL) {
				operators.push("equal");
				resultSize += 2;
				continue;
			}
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected character",
			};
			return result;
		}

		if (chars[start + resultSize] === CODE_POINT_EXCLAMATION_MARK) {
			if (start + resultSize >= chars.length) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Unexpected termination",
				};
				return result;
			}
			if (chars[start + resultSize + 1] === CODE_POINT_EQUAL) {
				operators.push("not_equal");
				resultSize += 2;
				continue;
			}
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected character",
			};
			return result;
		}

		if (chars[start + resultSize] === CODE_POINT_OPENING_ANGLE_BRACKET) {
			if (start + resultSize + 1 >= chars.length) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Unexpected termination",
				};
				return result;
			}
			if (chars[start + resultSize + 1] === CODE_POINT_OPENING_ANGLE_BRACKET) {
				operators.push("less_than");
				resultSize += 2;
				continue;
			}
			if (chars[start + resultSize + 1] === CODE_POINT_EQUAL) {
				operators.push("less_than_or_equal");
				resultSize += 2;
				continue;
			}
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected character",
			};
			return result;
		}

		if (chars[start + resultSize] === CODE_POINT_CLOSING_ANGLE_BRACKET) {
			if (start + resultSize + 1 >= chars.length) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Unexpected termination",
				};
				return result;
			}
			if (chars[start + resultSize + 1] === CODE_POINT_CLOSING_ANGLE_BRACKET) {
				operators.push("greater_than");
				resultSize += 2;
				continue;
			}
			if (chars[start + resultSize + 1] === CODE_POINT_EQUAL) {
				operators.push("greater_than_or_equal");
				resultSize += 2;
				continue;
			}
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected character",
			};
			return result;
		}

		break;
	}

	if (operators.length === 0) {
		const result: ParseExpressionSuccessResult = {
			ok: true,
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
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
			case "minus": {
				combinedNode = {
					type: "expression.minus_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
			case "multiply": {
				combinedNode = {
					type: "expression.multiply_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
			case "divide": {
				combinedNode = {
					type: "expression.divide_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
			case "remainder": {
				combinedNode = {
					type: "expression.remainder_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
			case "equal": {
				combinedNode = {
					type: "expression.equal_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
			case "not_equal": {
				combinedNode = {
					type: "expression.not_equal_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: start + resultSize,
				};
				break;
			}
			case "less_than": {
				combinedNode = {
					type: "expression.less_than_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
			case "less_than_or_equal": {
				combinedNode = {
					type: "expression.less_than_or_equal_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
			case "greater_than": {
				combinedNode = {
					type: "expression.greater_than_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
			case "greater_than_or_equal": {
				combinedNode = {
					type: "expression.greater_than_or_equal_operator",
					leftNode: expressionNodes[highestPriorityIndex],
					rightNode: expressionNodes[highestPriorityIndex + 1],
					startPosition: expressionNodes[highestPriorityIndex].startPosition,
					endPosition: expressionNodes[highestPriorityIndex + 1].endPosition,
				};
				break;
			}
		}

		operators.splice(highestPriorityIndex, 1);
		expressionNodes.splice(highestPriorityIndex, 2, combinedNode);
	}

	const result: ParseExpressionSuccessResult = {
		ok: true,
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

export type ParseExpressionResult = ParseExpressionSuccessResult | ParseErrorResult;

export interface ParseExpressionSuccessResult {
	ok: true;
	size: number;
	node: ExpressionNode;
}

export function parseExpressionUnit(chars: Uint32Array, start: number): ParseExpressionUnitResult {
	let resultSize = 0;

	const spacesSize = parseSpaces(chars, start + resultSize);
	resultSize += spacesSize;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}

	if (chars[start + resultSize] === CODE_POINT_DOUBLE_QUOTES) {
		const parseExpressionResult = parseStringLiteralExpression(chars, start + resultSize);
		if (!parseExpressionResult.ok) {
			return parseExpressionResult;
		}
		const expressionNode = parseExpressionResult.node;
		resultSize += parseExpressionResult.size;

		const result: ParseExpressionUnitSuccessResult = {
			ok: true,
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}

	if (chars[start + resultSize] === CODE_POINT_HYPHEN || isDigit(chars[start + resultSize])) {
		const parseExpressionResult = parseNumberLiteralExpression(chars, start + resultSize);
		if (!parseExpressionResult.ok) {
			return parseExpressionResult;
		}
		const expressionNode = parseExpressionResult.node;
		resultSize += parseExpressionResult.size;

		const result: ParseExpressionUnitSuccessResult = {
			ok: true,
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}

	if (chars[start + resultSize] === CODE_POINT_OPENING_BRACKET) {
		const parseListLiteralExpressionResult = parseListLiteralExpression(chars, start + resultSize);
		if (!parseListLiteralExpressionResult.ok) {
			return parseListLiteralExpressionResult;
		}
		const expressionNode = parseListLiteralExpressionResult.node;
		resultSize += parseListLiteralExpressionResult.size;

		const result: ParseExpressionUnitSuccessResult = {
			ok: true,
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}

	if (chars[start + resultSize] === CODE_POINT_OPENING_BRACE) {
		const parseObjectLiteralExpressionResult = parseObjectLiteralExpression(chars, start + resultSize);
		if (!parseObjectLiteralExpressionResult.ok) {
			return parseObjectLiteralExpressionResult;
		}
		const expressionNode = parseObjectLiteralExpressionResult.node;
		resultSize += parseObjectLiteralExpressionResult.size;

		const result: ParseExpressionUnitSuccessResult = {
			ok: true,
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}

	if (chars[start + resultSize] === CODE_POINT_AT_SIGN) {
		const parseFunctionCallExpressionResult = parseFunctionCallExpression(chars, start + resultSize);
		if (!parseFunctionCallExpressionResult.ok) {
			return parseFunctionCallExpressionResult;
		}
		const functionCallExpressionNode = parseFunctionCallExpressionResult.node;
		resultSize += parseFunctionCallExpressionResult.size;

		const result: ParseExpressionUnitSuccessResult = {
			ok: true,
			size: resultSize,
			node: functionCallExpressionNode,
		};
		return result;
	}

	if (chars[start + resultSize] === CODE_POINT_DOLLAR_SIGN) {
		const parseVariableExpressionResult = parseVariableExpression(chars, start + resultSize);
		if (!parseVariableExpressionResult.ok) {
			return parseVariableExpressionResult;
		}
		const variableExpressionNode = parseVariableExpressionResult.node;
		resultSize += parseVariableExpressionResult.size;

		const result: ParseExpressionUnitSuccessResult = {
			ok: true,
			size: resultSize,
			node: variableExpressionNode,
		};
		return result;
	}

	if (isAlphabet(chars[start + resultSize])) {
		const parseSpecialWordExpressionResult = parseSpecialWordExpression(chars, start + resultSize);
		if (!parseSpecialWordExpressionResult.ok) {
			return parseSpecialWordExpressionResult;
		}
		const specialWordExpressionNode = parseSpecialWordExpressionResult.node;
		resultSize += parseSpecialWordExpressionResult.size;

		const result: ParseExpressionUnitSuccessResult = {
			ok: true,
			size: resultSize,
			node: specialWordExpressionNode,
		};
		return result;
	}

	if (chars[start + resultSize] === CODE_POINT_OPENING_PARENTHESIS) {
		const parseGroupExpressionResult = parseExpressionGroupExpression(chars, start + resultSize);
		if (!parseGroupExpressionResult.ok) {
			return parseGroupExpressionResult;
		}
		const expressionGroupExpressionNode = parseGroupExpressionResult.node;
		resultSize += parseGroupExpressionResult.size;

		const result: ParseExpressionUnitSuccessResult = {
			ok: true,
			size: resultSize,
			node: expressionGroupExpressionNode,
		};
		return result;
	}

	const result: ParseErrorResult = {
		ok: false,
		position: resultSize + start,
		message: "Unknown character",
	};
	return result;
}

export type ParseExpressionUnitResult = ParseExpressionUnitSuccessResult | ParseErrorResult;

export interface ParseExpressionUnitSuccessResult {
	ok: true;
	size: number;
	node: ExpressionNode;
}

function parseStringLiteralExpression(chars: Uint32Array, start: number): ParseStringLiteralExpressionResult {
	let resultSize = 0;
	const valueVariableChars: number[] = [];

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_DOUBLE_QUOTES) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected double quotes",
		};
		return result;
	}
	resultSize++;

	while (true) {
		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}

		if (chars[start + resultSize] === CODE_POINT_DOUBLE_QUOTES) {
			resultSize++;
			break;
		}

		if (chars[start + resultSize] === CODE_POINT_BACKSLASH) {
			if (start + resultSize + 1 >= chars.length) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Unexpected termination",
				};
				return result;
			}

			if (chars[start + resultSize + 1] === CODE_POINT_LOWERCASE_N) {
				valueVariableChars.push(CODE_POINT_NEWLINE);
				resultSize += 2;
			} else if (chars[start + resultSize + 1] === CODE_POINT_DOUBLE_QUOTES) {
				valueVariableChars.push(CODE_POINT_DOUBLE_QUOTES);
				resultSize += 2;
			} else if (chars[start + resultSize + 1] === CODE_POINT_BACKSLASH) {
				valueVariableChars.push(CODE_POINT_BACKSLASH);
				resultSize += 2;
			} else if (chars[start + resultSize + 1] === CODE_POINT_LOWERCASE_T) {
				valueVariableChars.push(CODE_POINT_TAB);
				resultSize += 2;
			} else {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Unknown escape sequence",
				};
				return result;
			}
		} else {
			valueVariableChars.push(chars[start + resultSize]);
			resultSize++;
		}
	}

	const value = String.fromCodePoint(...valueVariableChars);
	const expressionNode: StringLiteralExpressionNode = {
		type: "expression.string_literal",
		string: value,
		startPosition: start,
		endPosition: start + resultSize,
	};
	const result: ParseStringLiteralExpressionSuccessResult = {
		ok: true,
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

type ParseStringLiteralExpressionResult = ParseStringLiteralExpressionSuccessResult | ParseErrorResult;

interface ParseStringLiteralExpressionSuccessResult {
	ok: true;
	size: number;
	node: StringLiteralExpressionNode;
}

function parseNumberLiteralExpression(chars: Uint32Array, start: number): ParseNumberLiteralExpressionResult {
	let resultSize = 0;

	let positive = true;
	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] === CODE_POINT_HYPHEN) {
		positive = false;
		resultSize++;
	}

	let whole: number;
	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] === CODE_POINT_ZERO) {
		whole = 0;
		resultSize++;

		if (start + resultSize < chars.length && isDigit(chars[start + resultSize])) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected digit",
			};
			return result;
		}
	} else {
		whole = chars[start + resultSize] - 48;
		resultSize++;

		while (true) {
			if (start + resultSize >= chars.length) {
				break;
			}
			if (!isDigit(chars[start + resultSize])) {
				break;
			}
			whole = whole * 10 + (chars[start + resultSize] - 48);
			resultSize++;
		}
	}

	if (start + resultSize >= chars.length) {
		let value100: number;
		if (positive) {
			value100 = whole * 100;
		} else {
			value100 = whole * 100 * -1;
		}
		const expressionNode: NumberLiteralExpressionNode = {
			type: "expression.number_literal",
			value100: value100,
			startPosition: start,
			endPosition: start + resultSize,
		};
		const result: ParseNumberLiteralExpressionResult = {
			ok: true,
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_PERIOD) {
		let value100: number;
		if (positive) {
			value100 = whole * 100;
		} else {
			value100 = whole * 100 * -1;
		}
		const expressionNode: NumberLiteralExpressionNode = {
			type: "expression.number_literal",
			value100: value100,
			startPosition: start,
			endPosition: start + resultSize,
		};
		const result: ParseNumberLiteralExpressionResult = {
			ok: true,
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}
	resultSize++;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (!isDigit(chars[start + resultSize])) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected digit",
		};
		return result;
	}
	let decimal100 = (chars[start + resultSize] - 48) * 10;
	resultSize++;

	if (start + resultSize >= chars.length) {
		let value100: number;
		if (positive) {
			value100 = whole * 100 + decimal100;
		} else {
			value100 = (whole * 100 + decimal100) * -1;
		}
		const expressionNode: NumberLiteralExpressionNode = {
			type: "expression.number_literal",
			value100: value100,
			startPosition: start,
			endPosition: start + resultSize,
		};
		const result: ParseNumberLiteralExpressionResult = {
			ok: true,
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}
	if (!isDigit(chars[start + resultSize])) {
		let value100: number;
		if (positive) {
			value100 = whole * 100 + decimal100;
		} else {
			value100 = (whole * 100 + decimal100) * -1;
		}
		const expressionNode: NumberLiteralExpressionNode = {
			type: "expression.number_literal",
			value100: value100,
			startPosition: start,
			endPosition: start + resultSize,
		};
		const result: ParseNumberLiteralExpressionResult = {
			ok: true,
			size: resultSize,
			node: expressionNode,
		};
		return result;
	}
	decimal100 += chars[start + resultSize] - 48;
	resultSize++;

	if (start + resultSize < chars.length && isDigit(chars[start + resultSize])) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected digit",
		};
		return result;
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
		startPosition: start,
		endPosition: start + resultSize,
	};
	const result: ParseNumberLiteralExpressionSuccessResult = {
		ok: true,
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

type ParseNumberLiteralExpressionResult = ParseNumberLiteralExpressionSuccessResult | ParseErrorResult;

interface ParseNumberLiteralExpressionSuccessResult {
	ok: true;
	size: number;
	node: NumberLiteralExpressionNode;
}

function parseFunctionCallExpression(chars: Uint32Array, start: number): ParseFunctionCallExpressionResult {
	let resultSize = 0;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_AT_SIGN) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected at sign",
		};
		return result;
	}
	resultSize++;

	const parseFunctionNameResult = parseIdentifier(chars, start + resultSize);
	if (!parseFunctionNameResult.ok) {
		return parseFunctionNameResult;
	}
	const functionName = parseFunctionNameResult.identifier;
	resultSize += parseFunctionNameResult.size;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_OPENING_PARENTHESIS) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected open parenthesis",
		};
		return result;
	}
	resultSize++;

	const argumentNodes: ExpressionNode[] = [];
	while (true) {
		let spacesSize = parseSpaces(chars, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}

		if (chars[start + resultSize] === CODE_POINT_CLOSING_PARENTHESIS) {
			resultSize++;

			break;
		}

		const parseArgumentResult = parseExpression(chars, start + resultSize);
		if (!parseArgumentResult.ok) {
			return parseArgumentResult;
		}
		argumentNodes.push(parseArgumentResult.node);
		resultSize += parseArgumentResult.size;

		spacesSize = parseSpaces(chars, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}
		if (chars[start + resultSize] === CODE_POINT_CLOSING_PARENTHESIS) {
			resultSize++;

			break;
		}
		if (chars[start + resultSize] !== CODE_POINT_COMMA) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected comma",
			};
			return result;
		}
		resultSize++;
	}

	const expressionNode: FunctionCallExpressionNode = {
		type: "expression.function_call",
		functionName: functionName,
		argumentNodes: argumentNodes,
		startPosition: start,
		endPosition: start + resultSize,
	};
	const result: ParseFunctionCallSuccessExpressionResult = {
		ok: true,
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

type ParseFunctionCallExpressionResult = ParseFunctionCallSuccessExpressionResult | ParseErrorResult;

interface ParseFunctionCallSuccessExpressionResult {
	ok: true;
	size: number;
	node: FunctionCallExpressionNode;
}

function parseSpecialWordExpression(chars: Uint32Array, start: number): ParseSpecialWordExpressionResult {
	let resultSize = 0;

	const parseSpecialWordResult = parseIdentifier(chars, start + resultSize);
	if (!parseSpecialWordResult.ok) {
		return parseSpecialWordResult;
	}
	const specialWord = parseSpecialWordResult.identifier;
	resultSize += parseSpecialWordResult.size;

	const specialWordExpressionNode: SpecialWordExpressionNode = {
		type: "expression.special_word",
		specialWord: specialWord,
		startPosition: start,
		endPosition: start + resultSize,
	};

	const result: ParseSpecialWordExpressionSuccessResult = {
		ok: true,
		size: resultSize,
		node: specialWordExpressionNode,
	};
	return result;
}

type ParseSpecialWordExpressionResult = ParseSpecialWordExpressionSuccessResult | ParseErrorResult;

interface ParseSpecialWordExpressionSuccessResult {
	ok: true;
	size: number;
	node: SpecialWordExpressionNode;
}

function parseVariableExpression(chars: Uint32Array, start: number): ParseVariableExpressionResult {
	let resultSize = 0;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_DOLLAR_SIGN) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected dollar sign",
		};
		return result;
	}
	resultSize++;

	const parseVariableNameResult = parseIdentifier(chars, start + resultSize);
	if (!parseVariableNameResult.ok) {
		return parseVariableNameResult;
	}
	const variableName = parseVariableNameResult.identifier;
	resultSize += parseVariableNameResult.size;

	const valueAccessorNodes: ValueAccessorNode[] = [];
	while (true) {
		if (start + resultSize >= chars.length) {
			break;
		}
		if (chars[start + resultSize] === CODE_POINT_PERIOD) {
			const parsePropertyValueAccessorResult = parsePropertyValueAccessor(chars, start + resultSize);
			if (!parsePropertyValueAccessorResult.ok) {
				return parsePropertyValueAccessorResult;
			}
			valueAccessorNodes.push(parsePropertyValueAccessorResult.node);
			resultSize += parsePropertyValueAccessorResult.size;
		} else if (chars[start + resultSize] === CODE_POINT_OPENING_BRACKET) {
			const parseIndexValueAccessorResult = parseIndexValueAccessor(chars, start + resultSize);
			if (!parseIndexValueAccessorResult.ok) {
				return parseIndexValueAccessorResult;
			}
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
		startPosition: start,
		endPosition: start + resultSize,
	};

	const result: ParseVariableExpressionSuccessResult = {
		ok: true,
		size: resultSize,
		node: inputExpressionNode,
	};
	return result;
}

type ParseVariableExpressionResult = ParseVariableExpressionSuccessResult | ParseErrorResult;

interface ParseVariableExpressionSuccessResult {
	ok: true;
	size: number;
	node: VariableExpressionNode;
}

function parsePropertyValueAccessor(chars: Uint32Array, start: number): ParsePropertyValueAccessorResult {
	let resultSize = 0;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_PERIOD) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	resultSize++;

	const parsePropertyNameResult = parseIdentifier(chars, start + resultSize);
	if (!parsePropertyNameResult.ok) {
		return parsePropertyNameResult;
	}
	const propertyName = parsePropertyNameResult.identifier;
	resultSize += parsePropertyNameResult.size;

	const propertyValueAccessorNode: PropertyValueAccessorNode = {
		type: "value_accessor.property",
		propertyName: propertyName,
		startPosition: start,
		endPosition: start + resultSize,
	};

	const result: ParsePropertyValueAccessorSuccessResult = {
		ok: true,
		size: resultSize,
		node: propertyValueAccessorNode,
	};
	return result;
}

type ParsePropertyValueAccessorResult = ParsePropertyValueAccessorSuccessResult | ParseErrorResult;

interface ParsePropertyValueAccessorSuccessResult {
	ok: true;
	size: number;
	node: PropertyValueAccessorNode;
}

function parseIndexValueAccessor(chars: Uint32Array, start: number): ParseIndexValueAccessorResult {
	let resultSize = 0;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_OPENING_BRACKET) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected period",
		};
		return result;
	}
	resultSize++;

	const parseIndexExpressionResult = parseExpression(chars, start + resultSize);
	if (!parseIndexExpressionResult.ok) {
		return parseIndexExpressionResult;
	}
	const indexExpressionNode = parseIndexExpressionResult.node;
	resultSize += parseIndexExpressionResult.size;

	const spacesSize = parseSpaces(chars, start + resultSize);
	resultSize += spacesSize;

	if (chars[start + resultSize] !== CODE_POINT_CLOSING_BRACKET) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected closing bracket",
		};
		return result;
	}
	resultSize++;

	const valueAccessorNode: IndexValueAccessorNode = {
		type: "value_accessor.index",
		indexExpressionNode: indexExpressionNode,
		startPosition: start,
		endPosition: start + resultSize,
	};

	const result: ParseIndexValueAccessorSuccessResult = {
		ok: true,
		size: resultSize,
		node: valueAccessorNode,
	};
	return result;
}

type ParseIndexValueAccessorResult = ParseIndexValueAccessorSuccessResult | ParseErrorResult;

interface ParseIndexValueAccessorSuccessResult {
	ok: true;
	size: number;
	node: IndexValueAccessorNode;
}

function parseListLiteralExpression(chars: Uint32Array, start: number): ParseListLiteralExpressionResult {
	let resultSize = 0;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_OPENING_BRACKET) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected opening bracket",
		};
		return result;
	}
	resultSize++;

	const listItemNodes: ExpressionNode[] = [];
	while (true) {
		let spacesSize = parseSpaces(chars, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}

		if (chars[start + resultSize] === CODE_POINT_CLOSING_BRACKET) {
			resultSize++;

			break;
		}

		const parseItemResult = parseExpression(chars, start + resultSize);
		if (!parseItemResult.ok) {
			return parseItemResult;
		}
		listItemNodes.push(parseItemResult.node);
		resultSize += parseItemResult.size;

		spacesSize = parseSpaces(chars, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}
		if (chars[start + resultSize] === CODE_POINT_CLOSING_BRACKET) {
			resultSize++;

			break;
		}
		if (chars[start + resultSize] !== CODE_POINT_COMMA) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected comma",
			};
			return result;
		}
		resultSize++;
	}

	const expressionNode: ListLiteralExpressionNode = {
		type: "expression.list_literal",
		listItemNodes: listItemNodes,
		startPosition: start,
		endPosition: start + resultSize,
	};
	const result: ParseListLiteralExpressionSuccessResult = {
		ok: true,
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

type ParseListLiteralExpressionResult = ParseListLiteralExpressionSuccessResult | ParseErrorResult;

interface ParseListLiteralExpressionSuccessResult {
	ok: true;
	size: number;
	node: ListLiteralExpressionNode;
}

function parseObjectLiteralExpression(chars: Uint32Array, start: number): ParseObjectLiteralExpressionResult {
	let resultSize = 0;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_OPENING_BRACE) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected opening brace",
		};
		return result;
	}
	resultSize++;

	const objectProperties = new Map<string, ExpressionNode>();
	while (true) {
		let spacesSize = parseSpaces(chars, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}
		if (chars[start + resultSize] === CODE_POINT_CLOSING_BRACE) {
			resultSize++;

			break;
		}

		const parsePropertyNameResult = parseIdentifier(chars, start + resultSize);
		if (!parsePropertyNameResult.ok) {
			return parsePropertyNameResult;
		}
		const propertyName = parsePropertyNameResult.identifier;
		resultSize += parsePropertyNameResult.size;

		spacesSize = parseSpaces(chars, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}
		if (chars[start + resultSize] !== CODE_POINT_COLON) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected colon",
			};
			return result;
		}
		resultSize++;

		const parsePropertyValueResult = parseExpression(chars, start + resultSize);
		if (!parsePropertyValueResult.ok) {
			return parsePropertyValueResult;
		}
		objectProperties.set(propertyName, parsePropertyValueResult.node);
		resultSize += parsePropertyValueResult.size;

		spacesSize = parseSpaces(chars, start + resultSize);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}
		if (chars[start + resultSize] === CODE_POINT_CLOSING_BRACE) {
			resultSize++;

			break;
		}
		if (chars[start + resultSize] !== CODE_POINT_COMMA) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected comma",
			};
			return result;
		}
		resultSize++;
	}

	const expressionNode: ObjectLiteralExpressionNode = {
		type: "expression.object_literal",
		objectProperties: objectProperties,
		startPosition: start,
		endPosition: start + resultSize,
	};
	const result: ParseObjectLiteralExpressionSuccessResult = {
		ok: true,
		size: resultSize,
		node: expressionNode,
	};
	return result;
}

type ParseObjectLiteralExpressionResult = ParseObjectLiteralExpressionSuccessResult | ParseErrorResult;

interface ParseObjectLiteralExpressionSuccessResult {
	ok: true;
	size: number;
	node: ObjectLiteralExpressionNode;
}

function parseExpressionGroupExpression(chars: Uint32Array, start: number): ParseExpressionGroupExpressionResult {
	let resultSize = 0;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_OPENING_PARENTHESIS) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected opening parenthesis",
		};
		return result;
	}
	resultSize++;

	const parseExpressionResult = parseExpression(chars, start + resultSize);
	if (!parseExpressionResult.ok) {
		return parseExpressionResult;
	}
	const expressionNode = parseExpressionResult.node;
	resultSize += parseExpressionResult.size;

	const spacesSize = parseSpaces(chars, start + resultSize);
	resultSize += spacesSize;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (chars[start + resultSize] !== CODE_POINT_CLOSING_PARENTHESIS) {
		const result: ParseErrorResult = {
			ok: false,
			position: resultSize + start,
			message: "Expected closing parenthesis",
		};
		return result;
	}
	resultSize++;

	const expressionGroupExpressionNode: ExpressionGroupExpressionNode = {
		type: "expression.group",
		expressionNode: expressionNode,
		startPosition: start,
		endPosition: start + resultSize,
	};
	const result: ParseExpressionGroupExpressionResult = {
		ok: true,
		size: resultSize,
		node: expressionGroupExpressionNode,
	};
	return result;
}

type ParseExpressionGroupExpressionResult = ParseExpressionGroupExpressionSuccessResult | ParseErrorResult;

interface ParseExpressionGroupExpressionSuccessResult {
	ok: true;
	size: number;
	node: ExpressionGroupExpressionNode;
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
	| ExpressionGroupExpressionNode;

export interface NumberLiteralExpressionNode {
	type: "expression.number_literal";
	value100: number;
	startPosition: number;
	endPosition: number;
}

export interface StringLiteralExpressionNode {
	type: "expression.string_literal";
	string: string;
	startPosition: number;
	endPosition: number;
}

export interface SpecialWordExpressionNode {
	type: "expression.special_word";
	specialWord: string;
	startPosition: number;
	endPosition: number;
}

export interface ListLiteralExpressionNode {
	type: "expression.list_literal";
	listItemNodes: ExpressionNode[];
	startPosition: number;
	endPosition: number;
}

export interface ObjectLiteralExpressionNode {
	type: "expression.object_literal";
	objectProperties: Map<string, ExpressionNode>;
	startPosition: number;
	endPosition: number;
}

export interface VariableExpressionNode {
	type: "expression.variable";
	variableName: string;
	valueAccessorNodes: ValueAccessorNode[];
	startPosition: number;
	endPosition: number;
}

export interface FunctionCallExpressionNode {
	type: "expression.function_call";
	functionName: string;
	argumentNodes: ExpressionNode[];
	startPosition: number;
	endPosition: number;
}

export interface AddOperatorExpressionNode {
	type: "expression.add_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface MinusOperatorExpressionNode {
	type: "expression.minus_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface MultiplyOperatorExpressionNode {
	type: "expression.multiply_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface DivideOperatorExpressionNode {
	type: "expression.divide_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface RemainderOperatorExpressionNode {
	type: "expression.remainder_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface EqualOperatorExpressionNode {
	type: "expression.equal_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface NotEqualOperatorExpressionNode {
	type: "expression.not_equal_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface LessThanOperatorExpressionNode {
	type: "expression.less_than_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface LessThanOrEqualOperatorExpressionNode {
	type: "expression.less_than_or_equal_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface GreaterThanOperatorExpressionNode {
	type: "expression.greater_than_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface GreaterThanOrEqualOperatorExpressionNode {
	type: "expression.greater_than_or_equal_operator";
	rightNode: ExpressionNode;
	leftNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export interface ExpressionGroupExpressionNode {
	type: "expression.group";
	expressionNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

export type ValueAccessorNode = PropertyValueAccessorNode | IndexValueAccessorNode;

export interface PropertyValueAccessorNode {
	type: "value_accessor.property";
	propertyName: string;
	startPosition: number;
	endPosition: number;
}

export interface IndexValueAccessorNode {
	type: "value_accessor.index";
	indexExpressionNode: ExpressionNode;
	startPosition: number;
	endPosition: number;
}

const CODE_POINT_TAB = 9;
const CODE_POINT_NEWLINE = 10;
const CODE_POINT_EXCLAMATION_MARK = 33;
const CODE_POINT_DOUBLE_QUOTES = 34;
const CODE_POINT_DOLLAR_SIGN = 36;
const CODE_POINT_PERCENT = 37;
const CODE_POINT_OPENING_PARENTHESIS = 40;
const CODE_POINT_CLOSING_PARENTHESIS = 41;
const CODE_POINT_ASTERISK = 42;
const CODE_POINT_PLUS = 43;
const CODE_POINT_COMMA = 44;
const CODE_POINT_HYPHEN = 45;
const CODE_POINT_PERIOD = 46;
const CODE_POINT_SLASH = 47;
const CODE_POINT_ZERO = 48;
const CODE_POINT_COLON = 58;
const CODE_POINT_OPENING_ANGLE_BRACKET = 60;
const CODE_POINT_EQUAL = 61;
const CODE_POINT_CLOSING_ANGLE_BRACKET = 62;
const CODE_POINT_AT_SIGN = 64;
const CODE_POINT_OPENING_BRACKET = 91;
const CODE_POINT_BACKSLASH = 92;
const CODE_POINT_CLOSING_BRACKET = 93;
const CODE_POINT_OPENING_BRACE = 123;
const CODE_POINT_CLOSING_BRACE = 125;
const CODE_POINT_LOWERCASE_N = 110;
const CODE_POINT_LOWERCASE_T = 116;
