import type { ExpressionNode } from "./expression.js";
import { parseExpression } from "./expression.js";
import { parseIdentifier } from "./identifier.js";
import { isAlphabet, isDigit, parseSpaces } from "./shared.js";

export function parseInstructions(bytes: Uint8Array, start: number, level: number): ParseInstructionsResult {
	let resultSize = 0;
	const instructionNodes: InstructionNode[] = [];

	while (true) {
		let targetInstruction = true;
		for (let j = 0; j < level; j++) {
			if (start + resultSize + j >= bytes.length) {
				targetInstruction = false;
				break;
			}
			if (bytes[start + resultSize + j] !== CHAR_CODE_TAB) {
				targetInstruction = false;
				break;
			}
		}
		if (!targetInstruction) {
			break;
		}
		resultSize += level;

		if (start + resultSize >= bytes.length) {
			break;
		}
		if (bytes[start + resultSize] === CHAR_CODE_TAB) {
			throw new Error(`Unexpected tab at position ${start + resultSize}`);
		}
		const spacesSize = parseSpaces(bytes, start + resultSize);
		resultSize += spacesSize;

		if (bytes[start + resultSize] === CHAR_CODE_NEWLINE) {
			resultSize++;
			continue;
		}

		const parseInstructionResult = parseInstruction(bytes, start + resultSize, level);
		instructionNodes.push(parseInstructionResult.node);
		resultSize += parseInstructionResult.size;
	}

	const result: ParseInstructionsResult = {
		size: resultSize,
		nodes: instructionNodes,
	};
	return result;
}

interface ParseInstructionsResult {
	size: number;
	nodes: InstructionNode[];
}

function parseInstruction(bytes: Uint8Array, start: number, level: number): ParseInstructionResult {
	let resultSize = 0;

	let spacesSize = parseSpaces(bytes, start + resultSize);
	resultSize += spacesSize;

	const parseInstructionNameResult = parseInstructionName(bytes, start + resultSize);
	const instructionName = parseInstructionNameResult.instructionName;

	if (instructionName === "do") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(bytes, start + resultSize);
		if (spacesSize < 1) {
			throw new Error(`Expected spaces at position ${start + resultSize}`);
		}
		resultSize += spacesSize;

		const parseExpressionResult = parseExpression(bytes, start + resultSize);
		const doInstructionNode: DoInstructionNode = {
			type: "instruction.do",
			expressionNode: parseExpressionResult.node,
		};
		resultSize += parseExpressionResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;
		}

		const result: ParseInstructionResult = {
			size: resultSize,
			node: doInstructionNode,
		};
		return result;
	}

	if (instructionName === "set") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(bytes, start + resultSize);
		if (spacesSize < 1) {
			throw new Error(`Expected spaces at position ${start + resultSize}`);
		}
		resultSize += spacesSize;

		const parseInstructionTargetResult = parseInstructionTarget(bytes, start + resultSize);
		const instructionTargetNode = parseInstructionTargetResult.node;
		resultSize += parseInstructionTargetResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[start + resultSize] !== CHAR_CODE_COMMA) {
			throw new Error(`Expected comma at position ${start + resultSize}`);
		}
		resultSize++;

		const parseVariableValueResult = parseExpression(bytes, start + resultSize);
		const setInstructionNode: SetInstructionNode = {
			type: "instruction.set",
			targetNode: instructionTargetNode,
			valueNode: parseVariableValueResult.node,
		};
		resultSize += parseVariableValueResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;
		}

		const result: ParseInstructionResult = {
			size: resultSize,
			node: setInstructionNode,
		};
		return result;
	}

	if (instructionName === "add") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(bytes, start + resultSize);
		if (spacesSize < 1) {
			throw new Error(`Expected spaces at position ${start + resultSize}`);
		}
		resultSize += spacesSize;

		const parseInstructionTargetResult = parseInstructionTarget(bytes, start + resultSize);
		const instructionTargetNode = parseInstructionTargetResult.node;
		resultSize += parseInstructionTargetResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error(`Unexpected end of line at position ${start + resultSize}`);
		}
		if (bytes[start + resultSize] !== CHAR_CODE_COMMA) {
			throw new Error(`Expected comma at position ${start + resultSize}`);
		}
		resultSize++;

		const parseVariableValueResult = parseExpression(bytes, start + resultSize);
		const valueNode = parseVariableValueResult.node;
		resultSize += parseVariableValueResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;
		}

		const addInstructionNode: AddInstructionNode = {
			type: "instruction.add",
			targetNode: instructionTargetNode,
			valueNode: valueNode,
		};

		const result: ParseInstructionResult = {
			size: resultSize,
			node: addInstructionNode,
		};
		return result;
	}

	if (instructionName === "if") {
		resultSize += parseInstructionNameResult.size;

		const conditionNodes: ExpressionNode[] = [];
		while (true) {
			const parseConditionResult = parseExpression(bytes, start + resultSize);
			conditionNodes.push(parseConditionResult.node);
			resultSize += parseConditionResult.size;

			spacesSize = parseSpaces(bytes, start);
			resultSize += spacesSize;

			if (start + resultSize >= bytes.length) {
				throw new Error("Unexpected termination");
			}
			if (bytes[start + resultSize] === CHAR_CODE_COLON) {
				resultSize++;
				break;
			}
			if (bytes[start + resultSize] === CHAR_CODE_COMMA) {
				resultSize++;
				continue;
			}
			throw new Error(`Expected colon at position ${start + resultSize}`);
		}

		let instructionNodes: InstructionNode[];
		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(bytes, start + resultSize, level + 1);
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

		const result: ParseInstructionResult = {
			size: resultSize,
			node: ifInstructionNode,
		};
		return result;
	}

	if (instructionName === "elseif") {
		resultSize += parseInstructionNameResult.size;

		const conditionNodes: ExpressionNode[] = [];
		while (true) {
			const parseConditionResult = parseExpression(bytes, start + resultSize);
			conditionNodes.push(parseConditionResult.node);
			resultSize += parseConditionResult.size;

			spacesSize = parseSpaces(bytes, start);
			resultSize += spacesSize;

			if (start + resultSize >= bytes.length) {
				throw new Error("Unexpected termination");
			}
			if (bytes[start + resultSize] === CHAR_CODE_COLON) {
				resultSize++;
				break;
			}
			if (bytes[start + resultSize] === CHAR_CODE_COMMA) {
				resultSize++;
				continue;
			}
			throw new Error(`Expected colon at position ${start + resultSize}`);
		}

		let instructionNodes: InstructionNode[];
		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(bytes, start + resultSize, level + 1);
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

		const result: ParseInstructionResult = {
			size: resultSize,
			node: elseifInstructionNode,
		};
		return result;
	}

	if (instructionName === "else") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[start + resultSize] !== CHAR_CODE_COLON) {
			throw new Error(`Expected colon at position ${start + resultSize}`);
		}
		resultSize++;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		let instructionNodes: InstructionNode[];
		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(bytes, start + resultSize, level + 1);
			instructionNodes = parseInstructionsResult.nodes;
			resultSize += parseInstructionsResult.size;
		} else {
			instructionNodes = [];
		}

		const elseInstructionNode: ElseInstructionNode = {
			type: "instruction.else",
			instructionNodes: instructionNodes,
		};

		const result: ParseInstructionResult = {
			size: resultSize,
			node: elseInstructionNode,
		};
		return result;
	}

	if (instructionName === "while") {
		resultSize += parseInstructionNameResult.size;

		const conditionNodes: ExpressionNode[] = [];
		while (true) {
			const parseConditionResult = parseExpression(bytes, start + resultSize);
			conditionNodes.push(parseConditionResult.node);
			resultSize += parseConditionResult.size;

			spacesSize = parseSpaces(bytes, start);
			resultSize += spacesSize;

			if (start + resultSize >= bytes.length) {
				throw new Error("Unexpected termination");
			}
			if (bytes[start + resultSize] === CHAR_CODE_COLON) {
				resultSize++;
				break;
			}
			if (bytes[start + resultSize] === CHAR_CODE_COMMA) {
				resultSize++;
				continue;
			}
			throw new Error(`Expected colon at position ${start + resultSize}`);
		}

		let instructionNodes: InstructionNode[];
		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(bytes, start + resultSize, level + 1);
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

		const result: ParseInstructionResult = {
			size: resultSize,
			node: whileInstructionNode,
		};
		return result;
	}

	if (instructionName === "return") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(bytes, start + resultSize);
		if (spacesSize < 1) {
			throw new Error(`Expected spaces at position ${start + resultSize}`);
		}
		resultSize += spacesSize;

		const parseExpressionResult = parseExpression(bytes, start + resultSize);
		const returnInstructionNode: ReturnInstructionNode = {
			type: "instruction.return",
			expressionNode: parseExpressionResult.node,
		};
		resultSize += parseExpressionResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;
		}

		const result: ParseInstructionResult = {
			size: resultSize,
			node: returnInstructionNode,
		};
		return result;
	}

	if (instructionName === "break") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;
		}

		const breakInstructionNode: BreakInstructionNode = {
			type: "instruction.break",
		};

		const result: ParseInstructionResult = {
			size: resultSize,
			node: breakInstructionNode,
		};
		return result;
	}

	if (instructionName === "#") {
		resultSize += parseInstructionNameResult.size;

		while (true) {
			if (start + resultSize >= bytes.length) {
				break;
			}
			if (bytes[start + resultSize] === CHAR_CODE_NEWLINE) {
				resultSize++;
				break;
			}
			resultSize++;
		}

		const commentInstructionNode: CommentInstructionNode = {
			type: "instruction.comment",
		};

		const result: ParseInstructionResult = {
			size: resultSize,
			node: commentInstructionNode,
		};
		return result;
	}

	if (instructionName === "for") {
		resultSize += parseInstructionNameResult.size;

		spacesSize = parseSpaces(bytes, start + resultSize);
		if (spacesSize < 1) {
			throw new Error(`Expected spaces at position ${start + resultSize}`);
		}
		resultSize += spacesSize;

		const parseLoopVariableNameResult = parseIdentifier(bytes, start + resultSize);
		const loopVariableName = parseLoopVariableNameResult.identifier;
		resultSize += parseLoopVariableNameResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[start + resultSize] !== CHAR_CODE_COMMA) {
			throw new Error(`Expected comma at position ${start + resultSize}`);
		}
		resultSize++;

		const parseStartResult = parseExpression(bytes, start + resultSize);
		const startExpressionNode = parseStartResult.node;
		resultSize += parseStartResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[start + resultSize] !== CHAR_CODE_COMMA) {
			throw new Error(`Expected comma at position ${start + resultSize}`);
		}
		resultSize++;

		const parseEndResult = parseExpression(bytes, start + resultSize);
		const endExpressionResult = parseEndResult.node;
		resultSize += parseEndResult.size;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		if (start + resultSize >= bytes.length) {
			throw new Error("Unexpected termination");
		}
		if (bytes[start + resultSize] !== CHAR_CODE_COLON) {
			throw new Error(`Expected colon at position ${start + resultSize}`);
		}
		resultSize++;

		spacesSize = parseSpaces(bytes, start);
		resultSize += spacesSize;

		let instructionNodes: InstructionNode[];
		if (start + resultSize < bytes.length) {
			if (bytes[start + resultSize] !== CHAR_CODE_NEWLINE) {
				throw new Error(`Expected newline at position ${start + resultSize}`);
			}
			resultSize++;

			const parseInstructionsResult = parseInstructions(bytes, start + resultSize, level + 1);
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

		const result: ParseInstructionResult = {
			size: resultSize,
			node: ifInstructionNode,
		};
		return result;
	}

	throw new Error(`Unknown instruction name at position ${start + resultSize}`);
}

interface ParseInstructionResult {
	size: number;
	node: InstructionNode;
}

function parseInstructionTarget(bytes: Uint8Array, start: number): ParseInstructionTargetResult {
	let resultSize = 0;

	const parseVariableNameResult = parseIdentifier(bytes, start + resultSize);
	const variableName = parseVariableNameResult.identifier;
	resultSize += parseVariableNameResult.size;

	const modifiers: InstructionTargetModifierNode[] = [];
	while (true) {
		if (start + resultSize >= bytes.length) {
			break;
		}
		if (bytes[start + resultSize] === CHAR_CODE_PERIOD) {
			const parsePropertyAccessorResult = parsePropertyAccessorInstructionTargetModifier(bytes, start + resultSize);
			modifiers.push(parsePropertyAccessorResult.node);
			resultSize += parsePropertyAccessorResult.size;
		} else if (bytes[start + resultSize] === CHAR_CODE_OPENING_BRACKET) {
			const parseIndexAccessorResult = parseIndexAccessorInstructionTargetModifier(bytes, start + resultSize);
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

	const result: ParseInstructionTargetResult = {
		size: resultSize,
		node: targetNode,
	};
	return result;
}

interface ParseInstructionTargetResult {
	size: number;
	node: InstructionTargetNode;
}

function parsePropertyAccessorInstructionTargetModifier(
	bytes: Uint8Array,
	start: number,
): ParsePropertyAccessorInstructionTargetModifierResult {
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

	const propertyAccessor: PropertyAccessorInstructionTargetModifierNode = {
		type: "instruction_target_modifier.property_accessor",
		propertyName: propertyName,
	};

	const result: ParsePropertyAccessorInstructionTargetModifierResult = {
		size: resultSize,
		node: propertyAccessor,
	};
	return result;
}

interface ParsePropertyAccessorInstructionTargetModifierResult {
	size: number;
	node: PropertyAccessorInstructionTargetModifierNode;
}

function parseIndexAccessorInstructionTargetModifier(
	bytes: Uint8Array,
	start: number,
): ParseIndexAccessorInstructionTargetModifierResult {
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

	const indexAccessor: IndexAccessorInstructionTargetModifierNode = {
		type: "instruction_target_modifier.index_accessor",
		indexExpressionNode: indexExpressionNode,
	};

	const result: ParseIndexAccessorInstructionTargetModifierResult = {
		size: resultSize,
		node: indexAccessor,
	};
	return result;
}

interface ParseIndexAccessorInstructionTargetModifierResult {
	size: number;
	node: IndexAccessorInstructionTargetModifierNode;
}

function parseInstructionName(bytes: Uint8Array, start: number): ParseInstructionNameResult {
	let resultSize = 0;

	if (start + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (isAlphabet(bytes[start + resultSize]) || bytes[start + resultSize] === CHAR_CODE_NUMBER_SIGN) {
		resultSize++;
	} else {
		throw new Error(`Expected alphabet or hash at position ${start + resultSize}`);
	}

	while (true) {
		if (start + resultSize >= bytes.length) {
			break;
		}
		if (
			isAlphabet(bytes[start + resultSize]) ||
			isDigit(bytes[start + resultSize]) ||
			bytes[start + resultSize] === CHAR_CODE_UNDERSCORE ||
			bytes[start + resultSize] === CHAR_CODE_NUMBER_SIGN
		) {
			resultSize++;
		} else {
			break;
		}
	}

	const instructionName = new TextDecoder().decode(bytes.slice(start, start + resultSize));

	const result: ParseInstructionNameResult = {
		size: resultSize,
		instructionName: instructionName,
	};
	return result;
}

interface ParseInstructionNameResult {
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

const CHAR_CODE_TAB = 9;
const CHAR_CODE_NEWLINE = 10;
const CHAR_CODE_NUMBER_SIGN = 35;
const CHAR_CODE_COMMA = 44;
const CHAR_CODE_PERIOD = 46;
const CHAR_CODE_COLON = 58;
const CHAR_CODE_OPENING_BRACKET = 91;
const CHAR_CODE_CLOSING_BRACKET = 93;
const CHAR_CODE_UNDERSCORE = 95;
