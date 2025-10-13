import { isAlphabet, isDigit } from "./shared";

export function parseIdentifier(bytes: Uint8Array, i: number): ParseIdentifierResult {
	let resultSize = 0;

	if (i + resultSize >= bytes.length) {
		throw new Error("Unexpected termination");
	}
	if (!isAlphabet(bytes[i + resultSize])) {
		throw new Error(`Expected alphabet at position ${i + resultSize}`);
	}
	resultSize++;

	while (true) {
		if (i + resultSize >= bytes.length) {
			break;
		}
		if (
			isAlphabet(bytes[i + resultSize]) ||
			isDigit(bytes[i + resultSize]) ||
			bytes[i + resultSize] === CHAR_CODE_UNDERSCORE
		) {
			resultSize++;
		} else {
			break;
		}
	}

	const identifier = new TextDecoder().decode(bytes.slice(i, i + resultSize));

	const result: ParseIdentifierResult = {
		size: resultSize,
		identifier: identifier,
	};
	return result;
}

export interface ParseIdentifierResult {
	size: number;
	identifier: string;
}

const CHAR_CODE_UNDERSCORE = 95;
