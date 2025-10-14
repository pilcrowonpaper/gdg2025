import type { ExpressionNode } from "./expression.js";
import { parseExpression } from "./expression.js";
import { parseIdentifier } from "./identifier.js";
import type { ParseErrorResult } from "./shared.js";
import { isAlphabet, isDigit, parseSpaces } from "./shared.js";

export function parseInstructions(chars: Uint32Array, start: number, level: number): ParseInstructionsResult {
	let resultSize = 0;
	const instructionNodes: InstructionNode[] = [];

	while (true) {
		let targetInstruction = true;
		for (let j = 0; j < level; j++) {
			if (start + resultSize + j >= chars.length) {
				targetInstruction = false;
				break;
			}
			if (chars[start + resultSize + j] !== CODE_POINT_TAB) {
				targetInstruction = false;
				break;
			}
		}
		if (!targetInstruction) {
			break;
		}
		resultSize += level;

		if (start + resultSize >= chars.length) {
			break;
		}
		if (chars[start + resultSize] === CODE_POINT_TAB) {
			throw new Error(`Unexpected tab at position ${start + resultSize}`);
		}
		const spacesSize = parseSpaces(chars, start + resultSize);
		resultSize += spacesSize;

		if (chars[start + resultSize] === CODE_POINT_NEWLINE) {
			resultSize++;
			continue;
		}

		const parseInstructionResult = parseInstruction(chars, start + resultSize, level);
		if (!parseInstructionResult.ok) {
			return parseInstructionResult;
		}
		instructionNodes.push(parseInstructionResult.node);
		resultSize += parseInstructionResult.size;
	}

	const result: ParseInstructionsSuccessResult = {
		ok: true,
		size: resultSize,
		nodes: instructionNodes,
	};
	return result;
}

export type ParseInstructionsResult = ParseInstructionsSuccessResult | ParseErrorResult;

export interface ParseInstructionsSuccessResult {
	ok: true;
	size: number;
	nodes: InstructionNode[];
}

function parseInstruction(chars: Uint32Array, start: number, level: number): ParseInstructionResult {
	let resultSize = 0;

	let spacesSize = parseSpaces(chars, start + resultSize);
	resultSize += spacesSize;

	const parseInstructionNameResult = parseInstructionName(chars, start + resultSize);
	if (!parseInstructionNameResult.ok) {
		return parseInstructionNameResult;
	}
	const instructionName = parseInstructionNameResult.instructionName;

	if (instructionName === "do") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(chars, start + resultSize);
		if (spacesSize < 1) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected spaces",
			};
			return result;
		}
		resultSize += spacesSize;

		const parseExpressionResult = parseExpression(chars, start + resultSize);
		if (!parseExpressionResult.ok) {
			return parseExpressionResult;
		}
		const doInstructionNode: DoInstructionNode = {
			type: "instruction.do",
			expressionNode: parseExpressionResult.node,
		};
		resultSize += parseExpressionResult.size;

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;
		}

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: doInstructionNode,
		};
		return result;
	}

	if (instructionName === "set") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(chars, start + resultSize);
		if (spacesSize < 1) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected spaces",
			};
			return result;
		}
		resultSize += spacesSize;

		const parseInstructionTargetResult = parseInstructionTarget(chars, start + resultSize);
		if (!parseInstructionTargetResult.ok) {
			return parseInstructionTargetResult;
		}
		const instructionTargetNode = parseInstructionTargetResult.node;
		resultSize += parseInstructionTargetResult.size;

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}
		if (chars[start + resultSize] !== CODE_POINT_COMMA) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected colon",
			};
			return result;
		}
		resultSize++;

		const parseVariableValueResult = parseExpression(chars, start + resultSize);
		if (!parseVariableValueResult.ok) {
			return parseVariableValueResult;
		}
		const setInstructionNode: SetInstructionNode = {
			type: "instruction.set",
			targetNode: instructionTargetNode,
			valueNode: parseVariableValueResult.node,
		};
		resultSize += parseVariableValueResult.size;

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;
		}

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: setInstructionNode,
		};
		return result;
	}

	if (instructionName === "add") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(chars, start + resultSize);
		if (spacesSize < 1) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected spaces",
			};
			return result;
		}
		resultSize += spacesSize;

		const parseInstructionTargetResult = parseInstructionTarget(chars, start + resultSize);
		if (!parseInstructionTargetResult.ok) {
			return parseInstructionTargetResult;
		}
		const instructionTargetNode = parseInstructionTargetResult.node;
		resultSize += parseInstructionTargetResult.size;

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
		}
		if (chars[start + resultSize] !== CODE_POINT_COMMA) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected colon",
			};
			return result;
		}
		resultSize++;

		const parseVariableValueResult = parseExpression(chars, start + resultSize);
		if (!parseVariableValueResult.ok) {
			return parseVariableValueResult;
		}
		const valueNode = parseVariableValueResult.node;
		resultSize += parseVariableValueResult.size;

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;
		}

		const addInstructionNode: AddInstructionNode = {
			type: "instruction.add",
			targetNode: instructionTargetNode,
			valueNode: valueNode,
		};

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: addInstructionNode,
		};
		return result;
	}

	if (instructionName === "if") {
		resultSize += parseInstructionNameResult.size;

		const conditionNodes: ExpressionNode[] = [];
		while (true) {
			const parseConditionResult = parseExpression(chars, start + resultSize);
			if (!parseConditionResult.ok) {
				return parseConditionResult;
			}
			conditionNodes.push(parseConditionResult.node);
			resultSize += parseConditionResult.size;

			spacesSize = parseSpaces(chars, start);
			resultSize += spacesSize;

			if (start + resultSize >= chars.length) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Unexpected termination",
				};
				return result;
			}
			if (chars[start + resultSize] === CODE_POINT_COLON) {
				resultSize++;
				break;
			}
			if (chars[start + resultSize] === CODE_POINT_COMMA) {
				resultSize++;
				continue;
			}
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected colon",
			};
			return result;
		}

		let instructionNodes: InstructionNode[];
		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(chars, start + resultSize, level + 1);
			if (!parseInstructionsResult.ok) {
				return parseInstructionsResult;
			}
			instructionNodes = parseInstructionsResult.nodes;
			resultSize += parseInstructionsResult.size;
		} else {
			instructionNodes = [];
		}

		const ifInstructionNode: IfInstructionNode = {
			type: "instruction.if",
			conditionNodes: conditionNodes,
			instructionNodes: instructionNodes,
		};

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: ifInstructionNode,
		};
		return result;
	}

	if (instructionName === "elseif") {
		resultSize += parseInstructionNameResult.size;

		const conditionNodes: ExpressionNode[] = [];
		while (true) {
			const parseConditionResult = parseExpression(chars, start + resultSize);
			if (!parseConditionResult.ok) {
				return parseConditionResult;
			}
			conditionNodes.push(parseConditionResult.node);
			resultSize += parseConditionResult.size;

			spacesSize = parseSpaces(chars, start);
			resultSize += spacesSize;

			if (start + resultSize >= chars.length) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Unexpected termination",
				};
				return result;
			}
			if (chars[start + resultSize] === CODE_POINT_COLON) {
				resultSize++;
				break;
			}
			if (chars[start + resultSize] === CODE_POINT_COMMA) {
				resultSize++;
				continue;
			}
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected colon",
			};
			return result;
		}

		let instructionNodes: InstructionNode[];
		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(chars, start + resultSize, level + 1);
			if (!parseInstructionsResult.ok) {
				return parseInstructionsResult;
			}
			instructionNodes = parseInstructionsResult.nodes;
			resultSize += parseInstructionsResult.size;
		} else {
			instructionNodes = [];
		}

		const elseifInstructionNode: ElseifInstructionNode = {
			type: "instruction.elseif",
			conditionNodes: conditionNodes,
			instructionNodes: instructionNodes,
		};

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: elseifInstructionNode,
		};
		return result;
	}

	if (instructionName === "else") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(chars, start);
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

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		let instructionNodes: InstructionNode[];
		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(chars, start + resultSize, level + 1);
			if (!parseInstructionsResult.ok) {
				return parseInstructionsResult;
			}
			instructionNodes = parseInstructionsResult.nodes;
			resultSize += parseInstructionsResult.size;
		} else {
			instructionNodes = [];
		}

		const elseInstructionNode: ElseInstructionNode = {
			type: "instruction.else",
			instructionNodes: instructionNodes,
		};

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: elseInstructionNode,
		};
		return result;
	}

	if (instructionName === "while") {
		resultSize += parseInstructionNameResult.size;

		const conditionNodes: ExpressionNode[] = [];
		while (true) {
			const parseConditionResult = parseExpression(chars, start + resultSize);
			if (!parseConditionResult.ok) {
				return parseConditionResult;
			}
			conditionNodes.push(parseConditionResult.node);
			resultSize += parseConditionResult.size;

			spacesSize = parseSpaces(chars, start);
			resultSize += spacesSize;

			if (start + resultSize >= chars.length) {
				throw new Error("Unexpected termination");
			}
			if (chars[start + resultSize] === CODE_POINT_COLON) {
				resultSize++;
				break;
			}
			if (chars[start + resultSize] === CODE_POINT_COMMA) {
				resultSize++;
				continue;
			}
			throw new Error(`Expected colon at position ${start + resultSize}`);
		}

		let instructionNodes: InstructionNode[];
		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(chars, start + resultSize, level + 1);
			if (!parseInstructionsResult.ok) {
				return parseInstructionsResult;
			}
			instructionNodes = parseInstructionsResult.nodes;
			resultSize += parseInstructionsResult.size;
		} else {
			instructionNodes = [];
		}

		const whileInstructionNode: WhileInstructionNode = {
			type: "instruction.while",
			conditionNodes: conditionNodes,
			instructionNodes: instructionNodes,
		};

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: whileInstructionNode,
		};
		return result;
	}

	if (instructionName === "return") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(chars, start + resultSize);
		if (spacesSize < 1) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected spaces",
			};
			return result;
		}
		resultSize += spacesSize;

		const parseExpressionResult = parseExpression(chars, start + resultSize);
		if (!parseExpressionResult.ok) {
			return parseExpressionResult;
		}
		const returnInstructionNode: ReturnInstructionNode = {
			type: "instruction.return",
			expressionNode: parseExpressionResult.node,
		};
		resultSize += parseExpressionResult.size;

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;
		}

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: returnInstructionNode,
		};
		return result;
	}

	if (instructionName === "break") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;
		}

		const breakInstructionNode: BreakInstructionNode = {
			type: "instruction.break",
		};

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: breakInstructionNode,
		};
		return result;
	}

	if (instructionName === "#") {
		resultSize += parseInstructionNameResult.size;

		while (true) {
			if (start + resultSize >= chars.length) {
				break;
			}
			if (chars[start + resultSize] === CODE_POINT_NEWLINE) {
				resultSize++;
				break;
			}
			resultSize++;
		}

		const commentInstructionNode: CommentInstructionNode = {
			type: "instruction.comment",
		};

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: commentInstructionNode,
		};
		return result;
	}

	if (instructionName === "for") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(chars, start + resultSize);
		if (spacesSize < 1) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Expected spaces",
			};
			return result;
		}
		resultSize += spacesSize;

		const parseLoopVariableNameResult = parseIdentifier(chars, start + resultSize);
		if (!parseLoopVariableNameResult.ok) {
			return parseLoopVariableNameResult;
		}
		const loopVariableName = parseLoopVariableNameResult.identifier;
		resultSize += parseLoopVariableNameResult.size;

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
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

		const parseStartResult = parseExpression(chars, start + resultSize);
		if (!parseStartResult.ok) {
			return parseStartResult;
		}
		const startExpressionNode = parseStartResult.node;
		resultSize += parseStartResult.size;

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		if (start + resultSize >= chars.length) {
			const result: ParseErrorResult = {
				ok: false,
				position: start + resultSize,
				message: "Unexpected termination",
			};
			return result;
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

		const parseEndResult = parseExpression(chars, start + resultSize);
		if (!parseEndResult.ok) {
			return parseEndResult;
		}
		const endExpressionResult = parseEndResult.node;
		resultSize += parseEndResult.size;

		spacesSize = parseSpaces(chars, start);
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

		spacesSize = parseSpaces(chars, start);
		resultSize += spacesSize;

		let instructionNodes: InstructionNode[];
		if (start + resultSize < chars.length) {
			if (chars[start + resultSize] !== CODE_POINT_NEWLINE) {
				const result: ParseErrorResult = {
					ok: false,
					position: start + resultSize,
					message: "Expected newline",
				};
				return result;
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(chars, start + resultSize, level + 1);
			if (!parseInstructionsResult.ok) {
				return parseInstructionsResult;
			}
			instructionNodes = parseInstructionsResult.nodes;
			resultSize += parseInstructionsResult.size;
		} else {
			instructionNodes = [];
		}

		const ifInstructionNode: ForInstructionNode = {
			type: "instruction.for",
			loopVariableName: loopVariableName,
			startNode: startExpressionNode,
			endNode: endExpressionResult,
			instructionNodes: instructionNodes,
		};

		const result: ParseInstructionSuccessResult = {
			ok: true,
			size: resultSize,
			node: ifInstructionNode,
		};
		return result;
	}

	const result: ParseErrorResult = {
		ok: false,
		position: start + resultSize,
		message: "Unknown instruction name",
	};
	return result;
}

type ParseInstructionResult = ParseInstructionSuccessResult | ParseErrorResult;

interface ParseInstructionSuccessResult {
	ok: true;
	size: number;
	node: InstructionNode;
}

function parseInstructionTarget(chars: Uint32Array, start: number): ParseInstructionTargetResult {
	let resultSize = 0;

	const parseVariableNameResult = parseIdentifier(chars, start + resultSize);
	if (!parseVariableNameResult.ok) {
		return parseVariableNameResult;
	}
	const variableName = parseVariableNameResult.identifier;
	resultSize += parseVariableNameResult.size;

	const modifiers: InstructionTargetModifierNode[] = [];
	while (true) {
		if (start + resultSize >= chars.length) {
			break;
		}
		if (chars[start + resultSize] === CODE_POINT_PERIOD) {
			const parsePropertyAccessorResult = parsePropertyAccessorInstructionTargetModifier(chars, start + resultSize);
			if (!parsePropertyAccessorResult.ok) {
				return parsePropertyAccessorResult;
			}
			modifiers.push(parsePropertyAccessorResult.node);
			resultSize += parsePropertyAccessorResult.size;
		} else if (chars[start + resultSize] === CODE_POINT_OPENING_BRACKET) {
			const parseIndexAccessorResult = parseIndexAccessorInstructionTargetModifier(chars, start + resultSize);
			if (!parseIndexAccessorResult.ok) {
				return parseIndexAccessorResult;
			}
			modifiers.push(parseIndexAccessorResult.node);
			resultSize += parseIndexAccessorResult.size;
		} else {
			break;
		}
	}

	const targetNode: InstructionTargetNode = {
		type: "instruction_target",
		variableName: variableName,
		modifiers: modifiers,
	};

	const result: ParseInstructionTargetSuccessResult = {
		ok: true,
		size: resultSize,
		node: targetNode,
	};
	return result;
}

type ParseInstructionTargetResult = ParseInstructionTargetSuccessResult | ParseErrorResult;

interface ParseInstructionTargetSuccessResult {
	ok: true;
	size: number;
	node: InstructionTargetNode;
}

function parsePropertyAccessorInstructionTargetModifier(
	chars: Uint32Array,
	start: number,
): ParsePropertyAccessorInstructionTargetModifierResult {
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
			message: "Expected period",
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

	const propertyAccessor: PropertyAccessorInstructionTargetModifierNode = {
		type: "instruction_target_modifier.property_accessor",
		propertyName: propertyName,
	};

	const result: ParsePropertyAccessorInstructionTargetModifierSuccessResult = {
		ok: true,
		size: resultSize,
		node: propertyAccessor,
	};
	return result;
}

type ParsePropertyAccessorInstructionTargetModifierResult =
	| ParsePropertyAccessorInstructionTargetModifierSuccessResult
	| ParseErrorResult;

interface ParsePropertyAccessorInstructionTargetModifierSuccessResult {
	ok: true;
	size: number;
	node: PropertyAccessorInstructionTargetModifierNode;
}

function parseIndexAccessorInstructionTargetModifier(
	chars: Uint32Array,
	start: number,
): ParseIndexAccessorInstructionTargetModifierResult {
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

	const indexAccessor: IndexAccessorInstructionTargetModifierNode = {
		type: "instruction_target_modifier.index_accessor",
		indexExpressionNode: indexExpressionNode,
	};

	const result: ParseIndexAccessorInstructionTargetModifierSuccessResult = {
		ok: true,
		size: resultSize,
		node: indexAccessor,
	};
	return result;
}

type ParseIndexAccessorInstructionTargetModifierResult =
	| ParseIndexAccessorInstructionTargetModifierSuccessResult
	| ParseErrorResult;

interface ParseIndexAccessorInstructionTargetModifierSuccessResult {
	ok: true;
	size: number;
	node: IndexAccessorInstructionTargetModifierNode;
}

function parseInstructionName(chars: Uint32Array, start: number): ParseInstructionNameResult {
	let resultSize = 0;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (isAlphabet(chars[start + resultSize]) || chars[start + resultSize] === CODE_POINT_NUMBER_SIGN) {
		resultSize++;
	} else {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected alphabet or number sign character",
		};
		return result;
	}

	while (true) {
		if (start + resultSize >= chars.length) {
			break;
		}
		if (
			isAlphabet(chars[start + resultSize]) ||
			isDigit(chars[start + resultSize]) ||
			chars[start + resultSize] === CODE_POINT_UNDERSCORE ||
			chars[start + resultSize] === CODE_POINT_NUMBER_SIGN
		) {
			resultSize++;
		} else {
			break;
		}
	}
	const instructionName = String.fromCharCode(...Array.from(chars.slice(start, start + resultSize)));

	const result: ParseInstructionNameSuccessResult = {
		ok: true,
		size: resultSize,
		instructionName: instructionName,
	};
	return result;
}

type ParseInstructionNameResult = ParseInstructionNameSuccessResult | ParseErrorResult;

interface ParseInstructionNameSuccessResult {
	ok: true;
	size: number;
	instructionName: string;
}

export type InstructionNode =
	| DoInstructionNode
	| SetInstructionNode
	| AddInstructionNode
	| IfInstructionNode
	| ElseifInstructionNode
	| ElseInstructionNode
	| ForInstructionNode
	| WhileInstructionNode
	| ReturnInstructionNode
	| BreakInstructionNode
	| CommentInstructionNode;

export interface DoInstructionNode {
	type: "instruction.do";
	expressionNode: ExpressionNode;
}

export interface SetInstructionNode {
	type: "instruction.set";
	targetNode: InstructionTargetNode;
	valueNode: ExpressionNode;
}

export interface AddInstructionNode {
	type: "instruction.add";
	targetNode: InstructionTargetNode;
	valueNode: ExpressionNode;
}

export interface IfInstructionNode {
	type: "instruction.if";
	conditionNodes: ExpressionNode[];
	instructionNodes: InstructionNode[];
}

export interface ElseifInstructionNode {
	type: "instruction.elseif";
	conditionNodes: ExpressionNode[];
	instructionNodes: InstructionNode[];
}

export interface ElseInstructionNode {
	type: "instruction.else";
	instructionNodes: InstructionNode[];
}

export interface ForInstructionNode {
	type: "instruction.for";
	loopVariableName: string;
	startNode: ExpressionNode;
	endNode: ExpressionNode;
	instructionNodes: InstructionNode[];
}

export interface WhileInstructionNode {
	type: "instruction.while";
	conditionNodes: ExpressionNode[];
	instructionNodes: InstructionNode[];
}

export interface ReturnInstructionNode {
	type: "instruction.return";
	expressionNode: ExpressionNode;
}

export interface BreakInstructionNode {
	type: "instruction.break";
}

export interface CommentInstructionNode {
	type: "instruction.comment";
}

export interface InstructionTargetNode {
	type: "instruction_target";
	variableName: string;
	modifiers: InstructionTargetModifierNode[];
}

export type InstructionTargetModifierNode =
	| PropertyAccessorInstructionTargetModifierNode
	| IndexAccessorInstructionTargetModifierNode;

export interface PropertyAccessorInstructionTargetModifierNode {
	type: "instruction_target_modifier.property_accessor";
	propertyName: string;
}

export interface IndexAccessorInstructionTargetModifierNode {
	type: "instruction_target_modifier.index_accessor";
	indexExpressionNode: ExpressionNode;
}

const CODE_POINT_TAB = 9;
const CODE_POINT_NEWLINE = 10;
const CODE_POINT_NUMBER_SIGN = 35;
const CODE_POINT_COMMA = 44;
const CODE_POINT_PERIOD = 46;
const CODE_POINT_COLON = 58;
const CODE_POINT_OPENING_BRACKET = 91;
const CODE_POINT_CLOSING_BRACKET = 93;
const CODE_POINT_UNDERSCORE = 95;
