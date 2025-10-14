import type { ParseErrorResult } from "./shared.js";
import { isAlphabet, isDigit } from "./shared.js";

export function parseIdentifier(chars: Uint32Array, start: number): ParseIdentifierResult {
	let resultSize = 0;

	if (start + resultSize >= chars.length) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Unexpected termination",
		};
		return result;
	}
	if (!isAlphabet(chars[start + resultSize])) {
		const result: ParseErrorResult = {
			ok: false,
			position: start + resultSize,
			message: "Expected alphabet",
		};
		return result;
	}
	resultSize++;

	while (true) {
		if (start + resultSize >= chars.length) {
			break;
		}
		if (
			isAlphabet(chars[start + resultSize]) ||
			isDigit(chars[start + resultSize]) ||
			chars[start + resultSize] === CODE_POINT_UNDERSCORE
		) {
			resultSize++;
		} else {
			break;
		}
	}

	const identifier = String.fromCharCode(...Array.from(chars.slice(start, start + resultSize)));

	const result: ParseIdentifierResult = {
		ok: true,
		size: resultSize,
		identifier: identifier,
	};
	return result;
}

export type ParseIdentifierResult = ParseIdentifierSuccessResult | ParseErrorResult;

export interface ParseIdentifierSuccessResult {
	ok: true;
	identifier: string;
	size: number;
}

const CODE_POINT_UNDERSCORE = 95;
