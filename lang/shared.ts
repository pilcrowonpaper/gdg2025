export function parseSpaces(bytes: Uint8Array, i: number): number {
	let size = 0;
	while (true) {
		if (i + size >= bytes.length) {
			break;
		}
		if (bytes[i + size] === CHAR_SPACE) {
			size++;
		} else {
			break;
		}
	}
	return size;
}

export function isAlphabet(charCode: number): boolean {
	return isUpperCaseAlphabet(charCode) || isLowerCaseAlphabet(charCode);
}

export function isASCIIStringCharacter(charCode: number): boolean {
	return charCode >= 32 && charCode <= 126;
}

export function isUpperCaseAlphabet(charCode: number): boolean {
	return charCode >= 65 && charCode <= 90;
}

export function isLowerCaseAlphabet(charCode: number): boolean {
	return charCode >= 97 && charCode <= 122;
}

export function isDigit(charCode: number): boolean {
	return charCode >= 48 && charCode <= 57;
}

const CHAR_SPACE = 32;
