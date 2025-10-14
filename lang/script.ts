import type { InstructionNode } from "./instruction.js";
import { parseInstructions } from "./instruction.js";
import type { ParseErrorResult } from "./shared.js";

export function parseScript(script: string): ParseScriptResult {
	const chars = parseString(script);

	const parseInstructionsResult = parseInstructions(chars, 0, 0);
	if (!parseInstructionsResult.ok) {
		return parseInstructionsResult;
	}
	const result: ParseScriptSuccessResult = {
		ok: true,
		instructions: parseInstructionsResult.nodes,
	};
	return result;
}

export type ParseScriptResult = ParseScriptSuccessResult | ParseErrorResult;

export interface ParseScriptSuccessResult {
	ok: true;
	instructions: InstructionNode[];
}

function parseString(s: string): Uint32Array {
	const chars = new Uint32Array(s.length);
	let size = 0;

	const bytes = new TextEncoder().encode(s);
	let i = 0;
	while (i < bytes.length) {
		if (bytes[i] >> 7 === 0) {
			chars[size] = bytes[i];
			size++;
			i++;
		} else {
			let continuationByteCount = 0;
			if (bytes[i] >> 5 === 0b110) {
				continuationByteCount = 1;
				chars[size] |= (bytes[i] & 0x1f) << 6;
			} else if (bytes[i] >> 4 === 0b1110) {
				continuationByteCount = 2;
				chars[size] |= (bytes[i] & 0x0f) << 12;
			} else if (bytes[i] >> 3 === 0b11110) {
				continuationByteCount = 3;
				chars[size] |= (bytes[i] & 0x07) << 18;
			}
			i++;
			for (let j = 0; j < continuationByteCount; j++) {
				chars[size] |= (bytes[i + j] & 0x3f) << ((continuationByteCount - j - 1) * 6);
			}
			size++;
			i += continuationByteCount;
		}
	}

	return chars.subarray(0, size);
}
