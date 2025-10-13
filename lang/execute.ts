import type { ExpressionNode, ValueAccessorNode } from "./expression.js";
import type { InstructionNode, InstructionTargetModifierNode } from "./instruction.js";

export function executeInstructions(
	instructions: InstructionNode[],
	memory: Map<string, Value>,
	externalFunctions: ExternalFunctions,
): Value | null {
	let prevIfInstructionPassthrough = false;
	for (const instruction of instructions) {
		switch (instruction.type) {
			case "instruction.set": {
				if (instruction.targetNode.modifiers.length < 1) {
					const value = resolveExpression(instruction.valueNode, memory, externalFunctions);
					const copied = structuredClone(value);
					memory.set(instruction.targetNode.variableName, copied);
					break;
				}

				const value = memory.get(instruction.targetNode.variableName) ?? null;
				if (value === null) {
					throw new Error(`Variable ${instruction.targetNode.variableName} not defined`);
				}

				const copied = structuredClone(value);
				const reference = getValueReferenceFromInstructionTargetModifiers(
					copied,
					instruction.targetNode.modifiers.slice(0, -1),
					memory,

					externalFunctions,
				);

				const lastModifier = instruction.targetNode.modifiers[instruction.targetNode.modifiers.length - 1];
				switch (lastModifier.type) {
					case "instruction_target_modifier.index_accessor": {
						if (reference.type !== "value.list") {
							throw new Error("Index accessor on a non-list value");
						}
						const indexValue = resolveExpression(lastModifier.indexExpressionNode, memory, externalFunctions);
						if (indexValue.type !== "value.number") {
							throw new Error("Index not a number");
						}
						if (indexValue.value100 < 0) {
							throw new Error("Negative index");
						}
						if (!Number.isInteger(indexValue.value100)) {
							throw new Error("Fraction index");
						}
						const index = Math.floor(indexValue.value100 / 100);
						if (index >= reference.items.length) {
							throw new Error("Out of bounds");
						}

						const value = resolveExpression(instruction.valueNode, memory, externalFunctions);
						reference.items[index] = value;
						break;
					}
					case "instruction_target_modifier.property_accessor": {
						if (reference.type !== "value.object") {
							throw new Error("Property accessor on a non-object value");
						}

						const value = resolveExpression(instruction.valueNode, memory, externalFunctions);
						reference.properties.set(lastModifier.propertyName, value);
						break;
					}
				}

				memory.set(instruction.targetNode.variableName, copied);
				break;
			}

			case "instruction.do": {
				resolveExpression(instruction.expressionNode, memory, externalFunctions);
				break;
			}

			case "instruction.add": {
				const value = memory.get(instruction.targetNode.variableName) ?? null;
				if (value === null) {
					throw new Error(`Variable ${instruction.targetNode.variableName} not defined`);
				}

				const copied = structuredClone(value);
				const reference = getValueReferenceFromInstructionTargetModifiers(
					copied,
					instruction.targetNode.modifiers,
					memory,
					externalFunctions,
				);

				if (reference.type !== "value.list") {
					throw new Error("Cannot push on non-list value");
				}

				const itemValue = resolveExpression(instruction.valueNode, memory, externalFunctions);
				const copiedItemValue = structuredClone(itemValue);
				reference.items.push(copiedItemValue);

				memory.set(instruction.targetNode.variableName, copied);
				break;
			}

			case "instruction.return": {
				const value = resolveExpression(instruction.expressionNode, memory, externalFunctions);
				return value;
			}

			case "instruction.if": {
				let conditionSatisfied = true;
				for (const conditionNode of instruction.conditionNodes) {
					const conditionValue = resolveExpression(
						conditionNode,
						memory,

						externalFunctions,
					);
					if (conditionValue.type === "value.true") {
						continue;
					}
					if (conditionValue.type === "value.false") {
						conditionSatisfied = false;
						break;
					}
					throw new Error("Condition resolved to non-boolean value");
				}

				if (conditionSatisfied) {
					const returnedValue = executeInstructions(instruction.instructionNodes, memory, externalFunctions);
					if (returnedValue !== null) {
						return returnedValue;
					}
					break;
				}
				prevIfInstructionPassthrough = true;
				break;
			}

			case "instruction.elseif": {
				if (!prevIfInstructionPassthrough) {
					break;
				}

				let conditionSatisfied = true;
				for (const conditionNode of instruction.conditionNodes) {
					const conditionValue = resolveExpression(
						conditionNode,
						memory,

						externalFunctions,
					);
					if (conditionValue.type === "value.true") {
						continue;
					}
					if (conditionValue.type === "value.false") {
						conditionSatisfied = false;
						break;
					}
					throw new Error("Condition resolved to non-boolean value");
				}

				if (conditionSatisfied) {
					prevIfInstructionPassthrough = false;

					const returnedValue = executeInstructions(instruction.instructionNodes, memory, externalFunctions);
					if (returnedValue !== null) {
						return returnedValue;
					}
					break;
				}
				prevIfInstructionPassthrough = true;
				break;
			}

			case "instruction.else": {
				if (!prevIfInstructionPassthrough) {
					break;
				}
				const returnedValue = executeInstructions(instruction.instructionNodes, memory, externalFunctions);
				if (returnedValue !== null) {
					return returnedValue;
				}
				break;
			}

			case "instruction.while": {
				while (true) {
					let conditionSatisfied = true;
					for (const conditionNode of instruction.conditionNodes) {
						const conditionValue = resolveExpression(
							conditionNode,
							memory,

							externalFunctions,
						);
						if (conditionValue.type === "value.true") {
							continue;
						}
						if (conditionValue.type === "value.false") {
							conditionSatisfied = false;
							break;
						}
						throw new Error("Condition resolved to non-boolean value");
					}
					if (!conditionSatisfied) {
						break;
					}
					const returnedValue = executeInstructions(instruction.instructionNodes, memory, externalFunctions);
					if (returnedValue !== null) {
						return returnedValue;
					}
				}
				break;
			}

			case "instruction.for": {
				const startValue = resolveExpression(instruction.startNode, memory, externalFunctions);
				if (startValue.type !== "value.number") {
					throw new Error("Start value must be a number");
				}

				const endValue = resolveExpression(instruction.endNode, memory, externalFunctions);
				if (endValue.type !== "value.number") {
					throw new Error("End value must be a number");
				}

				let loopCount100 = startValue.value100;
				while (loopCount100 < endValue.value100) {
					const loopValue: NumberValue = {
						type: "value.number",
						value100: loopCount100,
					};
					memory.set(instruction.loopVariableName, loopValue);

					const returnValue = executeInstructions(instruction.instructionNodes, memory, externalFunctions);
					if (returnValue !== null) {
						return returnValue;
					}
					loopCount100 += 100;
				}
				break;
			}

			case "instruction.comment": {
				break;
			}
		}
	}

	return null;
}

function getValueReferenceFromInstructionTargetModifiers(
	value: Value,
	instructionTargetModifierNodes: InstructionTargetModifierNode[],
	memory: Memory,
	externalFunctions: ExternalFunctions,
): Value {
	let reference = value;
	for (let i = 0; i < instructionTargetModifierNodes.length; i++) {
		const modifier = instructionTargetModifierNodes[i];
		switch (modifier.type) {
			case "instruction_target_modifier.index_accessor": {
				if (reference.type !== "value.list") {
					throw new Error("Index accessor on a non-list value");
				}
				const indexValue = resolveExpression(modifier.indexExpressionNode, memory, externalFunctions);
				if (indexValue.type !== "value.number") {
					throw new Error("Index not a number");
				}
				if (indexValue.value100 < 0) {
					throw new Error("Negative index");
				}
				if (!Number.isInteger(indexValue.value100)) {
					throw new Error("Fraction index");
				}
				const index = Math.floor(indexValue.value100 / 100);
				if (index >= reference.items.length) {
					throw new Error("Out of bounds");
				}
				reference = reference.items[index];
				break;
			}
			case "instruction_target_modifier.property_accessor": {
				if (reference.type !== "value.object") {
					throw new Error("Index accessor on a non-object value");
				}
				const maybeReference = reference.properties.get(modifier.propertyName) ?? null;
				if (maybeReference === null) {
					throw new Error("Property not defined");
				}
				reference = maybeReference;
				break;
			}
		}
	}
	return reference;
}

export function resolveExpression(
	expressionNode: ExpressionNode,
	memory: Memory,
	externalFunctions: ExternalFunctions,
): Value {
	switch (expressionNode.type) {
		case "expression.number_literal": {
			const value: NumberValue = {
				type: "value.number",
				value100: expressionNode.value100,
			};
			return value;
		}
		case "expression.string_literal": {
			const value: StringValue = {
				type: "value.string",
				string: expressionNode.string,
			};
			return value;
		}
		case "expression.list_literal": {
			const items: Value[] = [];
			for (const itemExpressionNode of expressionNode.listItemNodes) {
				const itemValue = resolveExpression(itemExpressionNode, memory, externalFunctions);
				items.push(itemValue);
			}
			const value: ListValue = {
				type: "value.list",
				items: items,
			};
			return value;
		}
		case "expression.object_literal": {
			const properties = new Map<string, Value>();
			for (const [propertyName, propertyValueExpressionNode] of expressionNode.objectProperties) {
				const propertyValue = resolveExpression(propertyValueExpressionNode, memory, externalFunctions);
				properties.set(propertyName, propertyValue);
			}
			const value: ObjectValue = {
				type: "value.object",
				properties: properties,
			};
			return value;
		}
		case "expression.variable": {
			const maybeValue = memory.get(expressionNode.variableName) ?? null;
			if (maybeValue === null) {
				throw new Error(`Variable ${expressionNode.variableName} not defined`);
			}
			const value = getValueFromValueAccessors(
				maybeValue,
				expressionNode.valueAccessorNodes,
				memory,
				externalFunctions,
			);
			return value;
		}
		case "expression.special_word": {
			if (expressionNode.specialWord === "true") {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			if (expressionNode.specialWord === "false") {
				const value: FalseValue = {
					type: "value.false",
				};
				return value;
			}
			if (expressionNode.specialWord === "null") {
				const value: NullValue = {
					type: "value.null",
				};
				return value;
			}
			throw new Error("Unknown special word");
		}
		case "expression.function_call": {
			const externalFunction = externalFunctions.get(expressionNode.functionName) ?? null;
			if (externalFunction === null) {
				throw new Error(`Function ${expressionNode.functionName} not defined`);
			}
			const argumentValues: Value[] = [];
			for (const argumentExpressionNodes of expressionNode.argumentNodes) {
				const argumentValue = resolveExpression(argumentExpressionNodes, memory, externalFunctions);
				argumentValues.push(argumentValue);
			}
			const value = externalFunction(argumentValues);
			return value;
		}
		case "expression.add_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (leftValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (rightValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const value: NumberValue = {
				type: "value.number",
				value100: leftValue.value100 + rightValue.value100,
			};
			return value;
		}
		case "expression.minus_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (leftValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (rightValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const value: NumberValue = {
				type: "value.number",
				value100: leftValue.value100 - rightValue.value100,
			};
			return value;
		}
		case "expression.multiply_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (leftValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (rightValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const value: NumberValue = {
				type: "value.number",
				value100: Math.trunc((leftValue.value100 * rightValue.value100) / 100),
			};
			return value;
		}
		case "expression.divide_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (leftValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (rightValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const value: NumberValue = {
				type: "value.number",
				value100: Math.floor(leftValue.value100 / rightValue.value100),
			};
			return value;
		}
		case "expression.remainder_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (leftValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			if (leftValue.value100 % 100 !== 0) {
				throw new Error("Value must be an integer");
			}
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (rightValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			if (rightValue.value100 < 0) {
				throw new Error("Value must be positive");
			}
			if (rightValue.value100 % 100 !== 0) {
				throw new Error("Value must be an integer");
			}
			const value: NumberValue = {
				type: "value.number",
				value100: leftValue.value100 % rightValue.value100,
			};
			return value;
		}
		case "expression.equal_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (
				leftValue.type === "value.number" &&
				rightValue.type === "value.number" &&
				leftValue.value100 === rightValue.value100
			) {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			if (
				leftValue.type === "value.string" &&
				rightValue.type === "value.string" &&
				leftValue.string === rightValue.string
			) {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			if (leftValue.type === "value.true" && rightValue.type === "value.true") {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			if (leftValue.type === "value.false" && rightValue.type === "value.false") {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			if (leftValue.type === "value.null" && rightValue.type === "value.null") {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			// TODO: compare lists and objects?
			const value: FalseValue = {
				type: "value.false",
			};
			return value;
		}
		case "expression.not_equal_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (
				leftValue.type === "value.number" &&
				rightValue.type === "value.number" &&
				leftValue.value100 === rightValue.value100
			) {
				const value: FalseValue = {
					type: "value.false",
				};
				return value;
			}
			if (
				leftValue.type === "value.string" &&
				rightValue.type === "value.string" &&
				leftValue.string === rightValue.string
			) {
				const value: FalseValue = {
					type: "value.false",
				};
				return value;
			}
			if (leftValue.type === "value.true" && rightValue.type === "value.true") {
				const value: FalseValue = {
					type: "value.false",
				};
				return value;
			}
			if (leftValue.type === "value.false" && rightValue.type === "value.false") {
				const value: FalseValue = {
					type: "value.false",
				};
				return value;
			}
			if (leftValue.type === "value.null" && rightValue.type === "value.null") {
				const value: FalseValue = {
					type: "value.false",
				};
				return value;
			}
			if (leftValue.type === "value.list" && leftValue.type === "value.list") {
				// TODO
				const value: FalseValue = {
					type: "value.false",
				};
				return value;
			}
			if (leftValue.type === "value.object" && leftValue.type === "value.object") {
				// TODO
				const value: FalseValue = {
					type: "value.false",
				};
				return value;
			}

			const value: TrueValue = {
				type: "value.true",
			};
			return value;
		}
		case "expression.less_than_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (leftValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (rightValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			if (leftValue.value100 < rightValue.value100) {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			const value: FalseValue = {
				type: "value.false",
			};
			return value;
		}
		case "expression.less_than_or_equal_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (leftValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (rightValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			if (leftValue.value100 <= rightValue.value100) {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			const value: FalseValue = {
				type: "value.false",
			};
			return value;
		}
		case "expression.greater_than_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (leftValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (rightValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			if (leftValue.value100 > rightValue.value100) {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			const value: FalseValue = {
				type: "value.false",
			};
			return value;
		}
		case "expression.greater_than_or_equal_operator": {
			const leftValue = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (leftValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			const rightValue = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (rightValue.type !== "value.number") {
				throw new Error("Value must be a number");
			}
			if (leftValue.value100 >= rightValue.value100) {
				const value: TrueValue = {
					type: "value.true",
				};
				return value;
			}
			const value: FalseValue = {
				type: "value.false",
			};
			return value;
		}
		case "expression.group": {
			const value = resolveExpression(expressionNode.expressionNode, memory, externalFunctions);
			return value;
		}
	}
}

function getValueFromValueAccessors(
	value: Value,
	valueAccessorNodes: ValueAccessorNode[],
	memory: Memory,
	externalFunctions: ExternalFunctions,
): Value {
	let result = value;
	for (const valueAccessorNode of valueAccessorNodes) {
		switch (valueAccessorNode.type) {
			case "value_accessor.index": {
				if (result.type !== "value.list") {
					throw new Error("Cannot apply index value accessor on non-list value");
				}
				const indexValue = resolveExpression(valueAccessorNode.indexExpressionNode, memory, externalFunctions);
				if (indexValue.type !== "value.number") {
					throw new Error("Index not a number");
				}
				if (indexValue.value100 < 0) {
					throw new Error("Negative index");
				}
				if (!Number.isInteger(indexValue.value100)) {
					throw new Error("Fraction index");
				}
				const index = Math.floor(indexValue.value100 / 100);
				if (index >= result.items.length) {
					throw new Error("Out of bounds");
				}
				result = result.items[index];
				break;
			}
			case "value_accessor.property": {
				if (result.type !== "value.object") {
					throw new Error("Cannot apply property value accessor on non-object value");
				}
				const maybeValue = result.properties.get(valueAccessorNode.propertyName) ?? null;
				if (maybeValue === null) {
					throw new Error("Property not defined");
				}
				result = maybeValue;
			}
		}
	}
	return result;
}

export type Memory = Map<string, Value>;

export type ExternalFunctions = Map<string, ExternalFunction>;

export type ExternalFunction = (args: Value[]) => Value;

export type Value = NumberValue | StringValue | TrueValue | FalseValue | NullValue | ListValue | ObjectValue;

export interface NumberValue {
	type: "value.number";
	value100: number;
}

export interface StringValue {
	type: "value.string";
	string: string;
}

export interface TrueValue {
	type: "value.true";
}

export interface FalseValue {
	type: "value.false";
}

export interface NullValue {
	type: "value.null";
}

export interface ListValue {
	type: "value.list";
	items: Value[];
}

export interface ObjectValue {
	type: "value.object";
	properties: Map<string, Value>;
}
