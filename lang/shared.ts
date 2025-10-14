export function parseSpaces(chars: Uint32Array, start: number): number {
	let size = 0;
	while (true) {
		if (start + size >= chars.length) {
			break;
		}
		if (chars[start + size] === CHAR_POINT_SPACE) {
			size++;
		} else {
			break;
		}
	}
	return size;
}

export function isAlphabet(char: number): boolean {
	return isUpperCaseAlphabet(char) || isLowerCaseAlphabet(char);
}

export function isUpperCaseAlphabet(char: number): boolean {
	return char >= 65 && char <= 90;
}

export function isLowerCaseAlphabet(char: number): boolean {
	return char >= 97 && char <= 122;
}

export function isDigit(char: number): boolean {
	return char >= 48 && char <= 57;
}

const CHAR_POINT_SPACE = 32;

export interface ParseErrorResult {
	ok: false;
	position: number;
	message: string;
}
