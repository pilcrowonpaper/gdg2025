import type { ExpressionNode, ValueAccessorNode } from "./expression.js";
import type { InstructionNode, InstructionTargetModifierNode } from "./instruction.js";

export function executeInstructions(
	instructions: InstructionNode[],
	memory: Map<string, Value>,
	externalFunctions: ExternalFunctions,
): ExecuteInstructionResult {
	const executeInstructionsResult = executeInstructionsWithBreak(instructions, memory, externalFunctions);
	if (!executeInstructionsResult.ok) {
		return executeInstructionsResult;
	}
	const result: ExecuteInstructionSuccessResult = {
		ok: true,
		returnValue: executeInstructionsResult.returnValue,
	};
	return result;
}

export type ExecuteInstructionResult = ExecuteInstructionSuccessResult | ExecutionErrorResult;

export interface ExecuteInstructionSuccessResult {
	ok: true;
	returnValue: Value | null;
}

function executeInstructionsWithBreak(
	instructions: InstructionNode[],
	memory: Map<string, Value>,
	externalFunctions: ExternalFunctions,
): ExecuteInstructionsWithBreakResult {
	let prevIfInstructionPassthrough = false;
	for (const instruction of instructions) {
		switch (instruction.type) {
			case "instruction.set": {
				if (instruction.targetNode.modifiers.length < 1) {
					const resolveValueResult = resolveExpression(instruction.valueNode, memory, externalFunctions);
					if (!resolveValueResult.ok) {
						return resolveValueResult;
					}
					const copied = structuredClone(resolveValueResult.value);
					memory.set(instruction.targetNode.variableName, copied);
					break;
				}

				const variableValue = memory.get(instruction.targetNode.variableName) ?? null;
				if (variableValue === null) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: instruction.targetNode.startPosition,
						endPosition: instruction.targetNode.endPosition,
						message: `Variable ${instruction.targetNode.variableName} not defined`,
					};
					return result;
				}

				const copiedVariableValue = structuredClone(variableValue);
				const getReferenceResult = getValueReferenceFromInstructionTargetModifiers(
					copiedVariableValue,
					instruction.targetNode.modifiers.slice(0, -1),
					memory,

					externalFunctions,
				);
				if (!getReferenceResult.ok) {
					return getReferenceResult;
				}
				const reference = getReferenceResult.reference;

				const lastModifier = instruction.targetNode.modifiers[instruction.targetNode.modifiers.length - 1];
				switch (lastModifier.type) {
					case "instruction_target_modifier.index_accessor": {
						if (reference.type !== "value.list") {
							const result: ExecutionErrorResult = {
								ok: false,
								startPosition: lastModifier.startPosition,
								endPosition: lastModifier.endPosition,
								message: "Cannot index non-list value",
							};
							return result;
						}
						const resolveIndexResult = resolveExpression(lastModifier.indexExpressionNode, memory, externalFunctions);
						if (!resolveIndexResult.ok) {
							return resolveIndexResult;
						}
						const indexValue = resolveIndexResult.value;
						if (indexValue.type !== "value.number") {
							const result: ExecutionErrorResult = {
								ok: false,
								startPosition: lastModifier.startPosition,
								endPosition: lastModifier.endPosition,
								message: "Index not a number",
							};
							return result;
						}
						if (indexValue.value100 < 0) {
							const result: ExecutionErrorResult = {
								ok: false,
								startPosition: lastModifier.startPosition,
								endPosition: lastModifier.endPosition,
								message: "Negative index",
							};
							return result;
						}
						if (indexValue.value100 % 100 !== 0) {
							const result: ExecutionErrorResult = {
								ok: false,
								startPosition: lastModifier.startPosition,
								endPosition: lastModifier.endPosition,
								message: "Index not an integer",
							};
							return result;
						}
						const index = Math.floor(indexValue.value100 / 100);
						if (index >= reference.items.length) {
							const result: ExecutionErrorResult = {
								ok: false,
								startPosition: lastModifier.startPosition,
								endPosition: lastModifier.endPosition,
								message: "Index out of bounds",
							};
							return result;
						}

						const resolveValueResult = resolveExpression(instruction.valueNode, memory, externalFunctions);
						if (!resolveValueResult.ok) {
							return resolveValueResult;
						}
						reference.items[index] = resolveValueResult.value;
						break;
					}
					case "instruction_target_modifier.property_accessor": {
						if (reference.type !== "value.object") {
							const result: ExecutionErrorResult = {
								ok: false,
								startPosition: lastModifier.startPosition,
								endPosition: lastModifier.endPosition,
								message: "Cannot access property of non-object value",
							};
							return result;
						}

						const resolveValueResult = resolveExpression(instruction.valueNode, memory, externalFunctions);
						if (!resolveValueResult.ok) {
							return resolveValueResult;
						}
						reference.properties.set(lastModifier.propertyName, resolveValueResult.value);
						break;
					}
				}

				memory.set(instruction.targetNode.variableName, copiedVariableValue);
				break;
			}

			case "instruction.do": {
				const resolveExpressionResult = resolveExpression(instruction.expressionNode, memory, externalFunctions);
				if (!resolveExpressionResult.ok) {
					return resolveExpressionResult;
				}
				break;
			}

			case "instruction.add": {
				const value = memory.get(instruction.targetNode.variableName) ?? null;
				if (value === null) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: instruction.targetNode.startPosition,
						endPosition: instruction.targetNode.endPosition,
						message: `Variable ${instruction.targetNode.variableName} not defined`,
					};
					return result;
				}

				const copied = structuredClone(value);
				const getReferenceResult = getValueReferenceFromInstructionTargetModifiers(
					copied,
					instruction.targetNode.modifiers,
					memory,
					externalFunctions,
				);
				if (!getReferenceResult.ok) {
					return getReferenceResult;
				}
				const reference = getReferenceResult.reference;
				if (reference.type !== "value.list") {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: instruction.targetNode.startPosition,
						endPosition: instruction.targetNode.endPosition,
						message: "Cannot add element to non-list value",
					};
					return result;
				}

				const resolveItemValueResult = resolveExpression(instruction.valueNode, memory, externalFunctions);
				if (!resolveItemValueResult.ok) {
					return resolveItemValueResult;
				}
				const copiedItemValue = structuredClone(resolveItemValueResult.value);
				reference.items.push(copiedItemValue);

				memory.set(instruction.targetNode.variableName, copied);
				break;
			}

			case "instruction.return": {
				const resolveValueResult = resolveExpression(instruction.expressionNode, memory, externalFunctions);
				if (!resolveValueResult.ok) {
					return resolveValueResult;
				}
				const result: ExecuteInstructionsWithBreakResult = {
					ok: true,
					break: false,
					returnValue: resolveValueResult.value,
				};
				return result;
			}

			case "instruction.if": {
				let conditionSatisfied = true;
				for (const conditionNode of instruction.conditionNodes) {
					const resolveConditionValueResult = resolveExpression(conditionNode, memory, externalFunctions);
					if (!resolveConditionValueResult.ok) {
						return resolveConditionValueResult;
					}
					const conditionValue = resolveConditionValueResult.value;
					if (conditionValue.type === "value.true") {
						continue;
					}
					if (conditionValue.type === "value.false") {
						conditionSatisfied = false;
						break;
					}
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: conditionNode.startPosition,
						endPosition: conditionNode.endPosition,
						message: "Condition not true or false",
					};
					return result;
				}

				if (conditionSatisfied) {
					const executeInstructionsResult = executeInstructionsWithBreak(
						instruction.instructionNodes,
						memory,
						externalFunctions,
					);
					if (!executeInstructionsResult.ok) {
						return executeInstructionsResult;
					}
					if (executeInstructionsResult.break) {
						const result: ExecuteInstructionsWithBreakResult = {
							ok: true,
							break: true,
							returnValue: null,
						};
						return result;
					}
					if (executeInstructionsResult.returnValue !== null) {
						const result: ExecuteInstructionsWithBreakResult = {
							ok: true,
							break: false,
							returnValue: executeInstructionsResult.returnValue,
						};
						return result;
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
					const resolveConditionValueResult = resolveExpression(conditionNode, memory, externalFunctions);
					if (!resolveConditionValueResult.ok) {
						return resolveConditionValueResult;
					}
					const conditionValue = resolveConditionValueResult.value;
					if (conditionValue.type === "value.true") {
						continue;
					}
					if (conditionValue.type === "value.false") {
						conditionSatisfied = false;
						break;
					}
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: conditionNode.startPosition,
						endPosition: conditionNode.endPosition,
						message: "Condition not true or false",
					};
					return result;
				}

				if (conditionSatisfied) {
					prevIfInstructionPassthrough = false;

					const executeInstructionsResult = executeInstructionsWithBreak(
						instruction.instructionNodes,
						memory,
						externalFunctions,
					);
					if (!executeInstructionsResult.ok) {
						return executeInstructionsResult;
					}
					if (executeInstructionsResult.break) {
						const result: ExecuteInstructionsWithBreakResult = {
							ok: true,
							break: true,
							returnValue: null,
						};
						return result;
					}
					if (executeInstructionsResult.returnValue !== null) {
						const result: ExecuteInstructionsWithBreakResult = {
							ok: true,
							break: false,
							returnValue: executeInstructionsResult.returnValue,
						};
						return result;
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
				const executeInstructionsResult = executeInstructionsWithBreak(
					instruction.instructionNodes,
					memory,
					externalFunctions,
				);
				if (!executeInstructionsResult.ok) {
					return executeInstructionsResult;
				}
				if (executeInstructionsResult.break) {
					const result: ExecuteInstructionsWithBreakResult = {
						ok: true,
						break: true,
						returnValue: null,
					};
					return result;
				}
				if (executeInstructionsResult.returnValue !== null) {
					const result: ExecuteInstructionsWithBreakResult = {
						ok: true,
						break: false,
						returnValue: executeInstructionsResult.returnValue,
					};
					return result;
				}
				break;
			}

			case "instruction.while": {
				while (true) {
					let conditionSatisfied = true;
					for (const conditionNode of instruction.conditionNodes) {
						const resolveConditionValueResult = resolveExpression(conditionNode, memory, externalFunctions);
						if (!resolveConditionValueResult.ok) {
							return resolveConditionValueResult;
						}
						const conditionValue = resolveConditionValueResult.value;
						if (conditionValue.type === "value.true") {
							continue;
						}
						if (conditionValue.type === "value.false") {
							conditionSatisfied = false;
							break;
						}
						const result: ExecutionErrorResult = {
							ok: false,
							startPosition: conditionNode.startPosition,
							endPosition: conditionNode.endPosition,
							message: "Condition not true or false",
						};
						return result;
					}
					if (!conditionSatisfied) {
						break;
					}
					const executeInstructionsResult = executeInstructionsWithBreak(
						instruction.instructionNodes,
						memory,
						externalFunctions,
					);
					if (!executeInstructionsResult.ok) {
						return executeInstructionsResult;
					}
					if (executeInstructionsResult.break) {
						break;
					}
					if (executeInstructionsResult.returnValue !== null) {
						const result: ExecuteInstructionsWithBreakResult = {
							ok: true,
							break: false,
							returnValue: executeInstructionsResult.returnValue,
						};
						return result;
					}
				}
				break;
			}

			case "instruction.for": {
				const resolveStartValueResult = resolveExpression(instruction.startNode, memory, externalFunctions);
				if (!resolveStartValueResult.ok) {
					return resolveStartValueResult;
				}
				const startValue = resolveStartValueResult.value;
				if (startValue.type !== "value.number") {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: instruction.startNode.startPosition,
						endPosition: instruction.startNode.endPosition,
						message: "Start value not a number",
					};
					return result;
				}
				if (startValue.value100 % 100 !== 0) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: instruction.startNode.startPosition,
						endPosition: instruction.startNode.endPosition,
						message: "Start value not an integer",
					};
					return result;
				}

				const resolveEndValueResult = resolveExpression(instruction.endNode, memory, externalFunctions);
				if (!resolveEndValueResult.ok) {
					return resolveEndValueResult;
				}
				const endValue = resolveEndValueResult.value;
				if (endValue.type !== "value.number") {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: instruction.endNode.startPosition,
						endPosition: instruction.endNode.endPosition,
						message: "End value not a number",
					};
					return result;
				}
				if (endValue.value100 % 100 !== 0) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: instruction.endNode.startPosition,
						endPosition: instruction.endNode.endPosition,
						message: "End value not an integer",
					};
					return result;
				}

				let loopCount100 = startValue.value100;
				while (loopCount100 < endValue.value100) {
					const loopValue: NumberValue = {
						type: "value.number",
						value100: loopCount100,
					};
					memory.set(instruction.loopVariableName, loopValue);

					const executeInstructionsResult = executeInstructionsWithBreak(
						instruction.instructionNodes,
						memory,
						externalFunctions,
					);
					if (!executeInstructionsResult.ok) {
						return executeInstructionsResult;
					}
					if (executeInstructionsResult.break) {
						break;
					}
					if (executeInstructionsResult.returnValue !== null) {
						const result: ExecuteInstructionsWithBreakSuccessResult = {
							ok: true,
							break: false,
							returnValue: executeInstructionsResult.returnValue,
						};
						return result;
					}
					loopCount100 += 100;
				}
				break;
			}

			case "instruction.break": {
				const result: ExecuteInstructionsWithBreakSuccessResult = {
					ok: true,
					break: true,
					returnValue: null,
				};
				return result;
			}

			case "instruction.comment": {
				break;
			}
		}
	}

	const result: ExecuteInstructionsWithBreakSuccessResult = {
		ok: true,
		break: false,
		returnValue: null,
	};
	return result;
}

type ExecuteInstructionsWithBreakResult = ExecuteInstructionsWithBreakSuccessResult | ExecutionErrorResult;

interface ExecuteInstructionsWithBreakSuccessResult {
	ok: true;
	break: boolean;
	returnValue: Value | null;
}

function getValueReferenceFromInstructionTargetModifiers(
	value: Value,
	instructionTargetModifierNodes: InstructionTargetModifierNode[],
	memory: Memory,
	externalFunctions: ExternalFunctions,
): GetValueReferenceResult {
	let reference = value;
	for (let i = 0; i < instructionTargetModifierNodes.length; i++) {
		const modifier = instructionTargetModifierNodes[i];
		switch (modifier.type) {
			case "instruction_target_modifier.index_accessor": {
				if (reference.type !== "value.list") {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: modifier.startPosition,
						endPosition: modifier.endPosition,
						message: "Cannot index a non-list variable",
					};
					return result;
				}
				const resolveIndexResult = resolveExpression(modifier.indexExpressionNode, memory, externalFunctions);
				if (!resolveIndexResult.ok) {
					return resolveIndexResult;
				}
				const indexValue = resolveIndexResult.value;
				if (indexValue.type !== "value.number") {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: modifier.indexExpressionNode.startPosition,
						endPosition: modifier.indexExpressionNode.endPosition,
						message: "Index not a number",
					};
					return result;
				}
				if (indexValue.value100 < 0) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: modifier.indexExpressionNode.startPosition,
						endPosition: modifier.indexExpressionNode.endPosition,
						message: "Negative index",
					};
					return result;
				}
				if (indexValue.value100 % 100 !== 0) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: modifier.indexExpressionNode.startPosition,
						endPosition: modifier.indexExpressionNode.endPosition,
						message: "Index not an integer",
					};
					return result;
				}
				const index = Math.floor(indexValue.value100 / 100);
				if (index >= reference.items.length) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: modifier.indexExpressionNode.startPosition,
						endPosition: modifier.indexExpressionNode.endPosition,
						message: "Index out of bounds",
					};
					return result;
				}
				reference = reference.items[index];
				break;
			}
			case "instruction_target_modifier.property_accessor": {
				if (reference.type !== "value.object") {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: modifier.startPosition,
						endPosition: modifier.endPosition,
						message: "Cannot read property of a non-object value",
					};
					return result;
				}
				const maybeReference = reference.properties.get(modifier.propertyName) ?? null;
				if (maybeReference === null) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: modifier.startPosition,
						endPosition: modifier.endPosition,
						message: "Property not defined",
					};
					return result;
				}
				reference = maybeReference;
				break;
			}
		}
	}
	const result: GetValueReferenceSuccessResult = {
		ok: true,
		reference: reference,
	};
	return result;
}

type GetValueReferenceResult = GetValueReferenceSuccessResult | ExecutionErrorResult;

interface GetValueReferenceSuccessResult {
	ok: true;
	reference: Value;
}

function resolveExpression(
	expressionNode: ExpressionNode,
	memory: Memory,
	externalFunctions: ExternalFunctions,
): ResolveExpressionResult {
	switch (expressionNode.type) {
		case "expression.number_literal": {
			const value: NumberValue = {
				type: "value.number",
				value100: expressionNode.value100,
			};
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.string_literal": {
			const value: StringValue = {
				type: "value.string",
				string: expressionNode.string,
			};
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.list_literal": {
			const items: Value[] = [];
			for (const itemExpressionNode of expressionNode.listItemNodes) {
				const resolveItemResult = resolveExpression(itemExpressionNode, memory, externalFunctions);
				if (!resolveItemResult.ok) {
					return resolveItemResult;
				}
				items.push(resolveItemResult.value);
			}
			const value: ListValue = {
				type: "value.list",
				items: items,
			};
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.object_literal": {
			const properties = new Map<string, Value>();
			for (const [propertyName, propertyValueExpressionNode] of expressionNode.objectProperties) {
				const resolvePropertyValueResult = resolveExpression(propertyValueExpressionNode, memory, externalFunctions);
				if (!resolvePropertyValueResult.ok) {
					return resolvePropertyValueResult;
				}
				properties.set(propertyName, resolvePropertyValueResult.value);
			}
			const value: ObjectValue = {
				type: "value.object",
				properties: properties,
			};
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.variable": {
			const maybeValue = memory.get(expressionNode.variableName) ?? null;
			if (maybeValue === null) {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.startPosition,
					endPosition: expressionNode.endPosition,
					message: `Variable ${expressionNode.variableName} not defined`,
				};
				return result;
			}
			const getValueResult = getValueFromValueAccessors(
				maybeValue,
				expressionNode.valueAccessorNodes,
				memory,
				externalFunctions,
			);
			if (!getValueResult.ok) {
				return getValueResult;
			}
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: getValueResult.value,
			};
			return result;
		}
		case "expression.special_word": {
			if (expressionNode.specialWord === "true") {
				const value: TrueValue = {
					type: "value.true",
				};
				const result: ResolveExpressionSuccessResult = {
					ok: true,
					value: value,
				};
				return result;
			}
			if (expressionNode.specialWord === "false") {
				const value: FalseValue = {
					type: "value.false",
				};
				const result: ResolveExpressionSuccessResult = {
					ok: true,
					value: value,
				};
				return result;
			}
			if (expressionNode.specialWord === "null") {
				const value: NullValue = {
					type: "value.null",
				};
				const result: ResolveExpressionSuccessResult = {
					ok: true,
					value: value,
				};
				return result;
			}
			const result: ExecutionErrorResult = {
				ok: false,
				startPosition: expressionNode.startPosition,
				endPosition: expressionNode.endPosition,
				message: "Unknown special word",
			};
			return result;
		}
		case "expression.function_call": {
			const externalFunction = externalFunctions.get(expressionNode.functionName) ?? null;
			if (externalFunction === null) {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.startPosition,
					endPosition: expressionNode.endPosition,
					message: "Unknown function",
				};
				return result;
			}
			const argumentValues: Value[] = [];
			for (const argumentExpressionNodes of expressionNode.argumentNodes) {
				const resolveArgumentResult = resolveExpression(argumentExpressionNodes, memory, externalFunctions);
				if (!resolveArgumentResult.ok) {
					return resolveArgumentResult;
				}
				argumentValues.push(resolveArgumentResult.value);
			}
			const functionResult = externalFunction(argumentValues);
			if (!functionResult.ok) {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.startPosition,
					endPosition: expressionNode.endPosition,
					message: `Function error: ${functionResult.message}`,
				};
				return result;
			}
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: functionResult.returnValue,
			};
			return result;
		}
		case "expression.add_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			if (leftValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Left value not a number",
				};
				return result;
			}
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;
			if (rightValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Right value not a number",
				};
				return result;
			}
			const value: NumberValue = {
				type: "value.number",
				value100: leftValue.value100 + rightValue.value100,
			};
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.minus_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			if (leftValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Left value not a number",
				};
				return result;
			}
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;
			if (rightValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Right value not a number",
				};
				return result;
			}
			const value: NumberValue = {
				type: "value.number",
				value100: leftValue.value100 - rightValue.value100,
			};
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.multiply_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			if (leftValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Left value not a number",
				};
				return result;
			}
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;
			if (rightValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Right value not a number",
				};
				return result;
			}
			const value: NumberValue = {
				type: "value.number",
				value100: Math.trunc((leftValue.value100 * rightValue.value100) / 100),
			};
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.divide_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			if (leftValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Left value not a number",
				};
				return result;
			}
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;
			if (rightValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Right value not a number",
				};
				return result;
			}
			if (rightValue.value100 === 0) {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Zero divisor",
				};
				return result;
			}
			const value: NumberValue = {
				type: "value.number",
				value100: Math.floor(leftValue.value100 / rightValue.value100),
			};
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.remainder_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			if (leftValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Left value not a number",
				};
				return result;
			}
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;
			if (rightValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Right value not a number",
				};
				return result;
			}
			if (rightValue.value100 <= 0) {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Right value not positive",
				};
				return result;
			}
			if (rightValue.value100 % 100 !== 0) {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Right value not an integer",
				};
				return result;
			}
			const value: NumberValue = {
				type: "value.number",
				value100: leftValue.value100 % rightValue.value100,
			};
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.equal_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;

			let value: Value;
			if (
				leftValue.type === "value.number" &&
				rightValue.type === "value.number" &&
				leftValue.value100 === rightValue.value100
			) {
				value = {
					type: "value.true",
				};
			} else if (
				leftValue.type === "value.string" &&
				rightValue.type === "value.string" &&
				leftValue.string === rightValue.string
			) {
				value = {
					type: "value.true",
				};
			} else if (leftValue.type === "value.true" && rightValue.type === "value.true") {
				value = {
					type: "value.true",
				};
			} else if (leftValue.type === "value.false" && rightValue.type === "value.false") {
				value = {
					type: "value.true",
				};
			} else if (leftValue.type === "value.null" && rightValue.type === "value.null") {
				value = {
					type: "value.true",
				};
			} else {
				value = {
					type: "value.false",
				};
			}
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.not_equal_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;

			let value: Value;
			if (
				leftValue.type === "value.number" &&
				rightValue.type === "value.number" &&
				leftValue.value100 === rightValue.value100
			) {
				value = {
					type: "value.false",
				};
			} else if (
				leftValue.type === "value.string" &&
				rightValue.type === "value.string" &&
				leftValue.string === rightValue.string
			) {
				value = {
					type: "value.false",
				};
			} else if (leftValue.type === "value.true" && rightValue.type === "value.true") {
				value = {
					type: "value.false",
				};
			} else if (leftValue.type === "value.false" && rightValue.type === "value.false") {
				value = {
					type: "value.false",
				};
			} else if (leftValue.type === "value.null" && rightValue.type === "value.null") {
				value = {
					type: "value.false",
				};
			} else {
				value = {
					type: "value.true",
				};
			}
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.less_than_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			if (leftValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Left value not a number",
				};
				return result;
			}
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;
			if (rightValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Right value not a number",
				};
				return result;
			}

			let value: Value;
			if (leftValue.value100 < rightValue.value100) {
				value = {
					type: "value.true",
				};
			} else {
				value = {
					type: "value.false",
				};
			}
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.less_than_or_equal_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			if (leftValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Left value not a number",
				};
				return result;
			}
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;
			if (rightValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Right value not a number",
				};
				return result;
			}

			let value: Value;
			if (leftValue.value100 <= rightValue.value100) {
				value = {
					type: "value.true",
				};
			} else {
				value = {
					type: "value.false",
				};
			}
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.greater_than_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			if (leftValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Left value not a number",
				};
				return result;
			}
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;
			if (rightValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Right value not a number",
				};
				return result;
			}

			let value: Value;
			if (leftValue.value100 > rightValue.value100) {
				value = {
					type: "value.true",
				};
			} else {
				value = {
					type: "value.false",
				};
			}
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.greater_than_or_equal_operator": {
			const resolveLeftValueResult = resolveExpression(expressionNode.leftNode, memory, externalFunctions);
			if (!resolveLeftValueResult.ok) {
				return resolveLeftValueResult;
			}
			const leftValue = resolveLeftValueResult.value;
			if (leftValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.leftNode.startPosition,
					endPosition: expressionNode.leftNode.endPosition,
					message: "Left value not a number",
				};
				return result;
			}
			const resolveRightValueResult = resolveExpression(expressionNode.rightNode, memory, externalFunctions);
			if (!resolveRightValueResult.ok) {
				return resolveRightValueResult;
			}
			const rightValue = resolveRightValueResult.value;
			if (rightValue.type !== "value.number") {
				const result: ExecutionErrorResult = {
					ok: false,
					startPosition: expressionNode.rightNode.startPosition,
					endPosition: expressionNode.rightNode.endPosition,
					message: "Right value not a number",
				};
				return result;
			}

			let value: Value;
			if (leftValue.value100 >= rightValue.value100) {
				value = {
					type: "value.true",
				};
			} else {
				value = {
					type: "value.false",
				};
			}
			const result: ResolveExpressionSuccessResult = {
				ok: true,
				value: value,
			};
			return result;
		}
		case "expression.group": {
			const result = resolveExpression(expressionNode.expressionNode, memory, externalFunctions);
			return result;
		}
	}
}

type ResolveExpressionResult = ResolveExpressionSuccessResult | ExecutionErrorResult;

interface ResolveExpressionSuccessResult {
	ok: true;
	value: Value;
}

function getValueFromValueAccessors(
	value: Value,
	valueAccessorNodes: ValueAccessorNode[],
	memory: Memory,
	externalFunctions: ExternalFunctions,
): GetValueFromValueAccessorsResult {
	let resultValue = value;
	for (const valueAccessorNode of valueAccessorNodes) {
		switch (valueAccessorNode.type) {
			case "value_accessor.index": {
				if (resultValue.type !== "value.list") {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: valueAccessorNode.startPosition,
						endPosition: valueAccessorNode.endPosition,
						message: "Cannot index non-list value",
					};
					return result;
				}
				const resolveIndexValueResult = resolveExpression(
					valueAccessorNode.indexExpressionNode,
					memory,
					externalFunctions,
				);
				if (!resolveIndexValueResult.ok) {
					return resolveIndexValueResult;
				}
				const indexValue = resolveIndexValueResult.value;
				if (indexValue.type !== "value.number") {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: valueAccessorNode.startPosition,
						endPosition: valueAccessorNode.endPosition,
						message: "Index not a number",
					};
					return result;
				}
				if (indexValue.value100 < 0) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: valueAccessorNode.startPosition,
						endPosition: valueAccessorNode.endPosition,
						message: "Negative index number",
					};
					return result;
				}
				if (indexValue.value100 % 100 !== 0) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: valueAccessorNode.startPosition,
						endPosition: valueAccessorNode.endPosition,
						message: "Index not an integer",
					};
					return result;
				}
				const index = Math.floor(indexValue.value100 / 100);
				if (index >= resultValue.items.length) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: valueAccessorNode.startPosition,
						endPosition: valueAccessorNode.endPosition,
						message: "Index out of bounds",
					};
					return result;
				}
				resultValue = resultValue.items[index];
				break;
			}
			case "value_accessor.property": {
				if (resultValue.type !== "value.object") {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: valueAccessorNode.startPosition,
						endPosition: valueAccessorNode.endPosition,
						message: "Cannot read property of a non-object value",
					};
					return result;
				}
				const maybeValue = resultValue.properties.get(valueAccessorNode.propertyName) ?? null;
				if (maybeValue === null) {
					const result: ExecutionErrorResult = {
						ok: false,
						startPosition: valueAccessorNode.startPosition,
						endPosition: valueAccessorNode.endPosition,
						message: "Property not defined",
					};
					return result;
				}
				resultValue = maybeValue;
			}
		}
	}
	const result: GetValueFromValueAccessorsSuccessResult = {
		ok: true,
		value: resultValue,
	};
	return result;
}

type GetValueFromValueAccessorsResult = GetValueFromValueAccessorsSuccessResult | ExecutionErrorResult;

interface GetValueFromValueAccessorsSuccessResult {
	ok: true;
	value: Value;
}

export type Memory = Map<string, Value>;

export type ExternalFunctions = Map<string, ExternalFunction>;

export type ExternalFunction = (args: Value[]) => ExternalFunctionResult;

export type ExternalFunctionResult = ExternalFunctionSuccessResult | ExternalFunctionErrorResult;

export interface ExternalFunctionSuccessResult {
	ok: true;
	returnValue: Value;
}

export interface ExternalFunctionErrorResult {
	ok: false;
	message: string;
}

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

export interface ExecutionErrorResult {
	ok: false;
	startPosition: number;
	endPosition: number;
	message: string;
}
