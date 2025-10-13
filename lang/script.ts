import type { InstructionNode } from "./instruction.js";
import { parseInstructions } from "./instruction.js";

export function parseScript(script: string): InstructionNode[] {
	const bytes = new TextEncoder().encode(script);

	const result = parseInstructions(bytes, 0, 0);
	return result.nodes;
}
