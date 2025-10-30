export const colors: Color[] = [
	{ red: 0, green: 0, blue: 0 },
	{ red: 224, green: 60, blue: 40 },
	{ red: 255, green: 255, blue: 255 },
	{ red: 215, green: 215, blue: 215 },
	{ red: 168, green: 168, blue: 168 },
	{ red: 123, green: 123, blue: 123 },
	{ red: 52, green: 52, blue: 52 },
	{ red: 21, green: 21, blue: 21 },
	{ red: 13, green: 32, blue: 48 },
	{ red: 65, green: 93, blue: 102 },
	{ red: 113, green: 166, blue: 161 },
	{ red: 189, green: 255, blue: 202 },
	{ red: 37, green: 226, blue: 205 },
	{ red: 10, green: 152, blue: 172 },
	{ red: 0, green: 82, blue: 128 },
	{ red: 0, green: 96, blue: 75 },
	{ red: 32, green: 181, blue: 98 },
	{ red: 88, green: 211, blue: 50 },
	{ red: 19, green: 157, blue: 8 },
	{ red: 0, green: 78, blue: 0 },
	{ red: 23, green: 40, blue: 8 },
	{ red: 55, green: 109, blue: 3 },
	{ red: 106, green: 180, blue: 23 },
	{ red: 140, green: 214, blue: 18 },
	{ red: 190, green: 235, blue: 113 },
	{ red: 238, green: 255, blue: 169 },
	{ red: 182, green: 193, blue: 33 },
	{ red: 147, green: 151, blue: 23 },
	{ red: 204, green: 143, blue: 21 },
	{ red: 255, green: 187, blue: 49 },
	{ red: 255, green: 231, blue: 55 },
	{ red: 246, green: 143, blue: 55 },
	{ red: 173, green: 78, blue: 26 },
	{ red: 35, green: 23, blue: 18 },
	{ red: 92, green: 60, blue: 13 },
	{ red: 174, green: 108, blue: 55 },
	{ red: 197, green: 151, blue: 130 },
	{ red: 226, green: 215, blue: 181 },
	{ red: 79, green: 21, blue: 7 },
	{ red: 130, green: 60, blue: 61 },
	{ red: 218, green: 101, blue: 94 },
	{ red: 225, green: 130, blue: 137 },
	{ red: 245, green: 183, blue: 132 },
	{ red: 255, green: 233, blue: 197 },
	{ red: 255, green: 130, blue: 206 },
	{ red: 207, green: 60, blue: 113 },
	{ red: 135, green: 22, blue: 70 },
	{ red: 163, green: 40, blue: 179 },
	{ red: 204, green: 105, blue: 228 },
	{ red: 213, green: 156, blue: 252 },
	{ red: 254, green: 201, blue: 237 },
	{ red: 226, green: 201, blue: 255 },
	{ red: 166, green: 117, blue: 254 },
	{ red: 106, green: 49, blue: 202 },
	{ red: 90, green: 25, blue: 145 },
	{ red: 33, green: 22, blue: 64 },
	{ red: 61, green: 52, blue: 165 },
	{ red: 98, green: 100, blue: 220 },
	{ red: 155, green: 160, blue: 239 },
	{ red: 152, green: 220, blue: 255 },
	{ red: 91, green: 168, blue: 255 },
	{ red: 10, green: 137, blue: 255 },
	{ red: 2, green: 74, blue: 202 },
	{ red: 0, green: 23, blue: 125 },
];

export interface Color {
	red: number;
	green: number;
	blue: number;
}

export function colorToHexCode(color: Color): string {
	const red = byteToHexString(color.red);
	const green = byteToHexString(color.green);
	const blue = byteToHexString(color.blue);
	return `#${red}${green}${blue}`;
}

function byteToHexString(byte: number): string {
	const alphabet = "0123456789abcdef";
	return alphabet[byte >> 4] || alphabet[byte & 0xf];
}

export function setPixel(pixels: Uint8Array, i: number, solid: boolean, fullColor: boolean, colorId: number): void {
	let byte = colorId;
	if (solid) {
		byte |= 0x80;
	}
	if (fullColor) {
		byte |= 0x40;
	}
	pixels[i] = byte;
}

export function getPixelColor(pixels: Uint8Array, i: number): Color | null {
	const pixel = getPixel(pixels, i);
	const color = resolvePixelColor(pixel.solid, pixel.full, pixel.colorId);
	return color;
}

export function resolvePixelColor(solidColor: boolean, fullColor: boolean, colorId: number): Color | null {
	if (!solidColor) {
		return null;
	}
	if (fullColor) {
		return colors[colorId];
	}
	const baseColor = colors[colorId];
	const color: Color = {
		red: Math.floor(baseColor.red / 2),
		green: Math.floor(baseColor.green / 2),
		blue: Math.floor(baseColor.blue / 2),
	};
	return color;
}

export function getSpriteCoordinatesFromPixelPosition(position: number): Coordinates {
	const coordinates: Coordinates = {
		x: position % 16,
		y: Math.floor(position / 16),
	};
	return coordinates;
}

export function getSpritePixelPositionFromCoordinates(coordinates: Coordinates): number {
	return coordinates.x + coordinates.y * 16;
}

export interface Coordinates {
	x: number;
	y: number;
}

export const spritePixelCount = 256;

export function getPixel(pixels: Uint8Array, i: number): Pixel {
	const byte = pixels[i];
	return {
		solid: byte >> 7 === 1,
		full: ((byte >> 6) & 0x01) === 1,
		colorId: byte & 0x3f,
	};
}
export interface Pixel {
	solid: boolean;
	full: boolean;
	colorId: number;
}

export const spriteSize = 16;
