import * as graphics from "@graphics";
import * as encoding from "@oslojs/encoding";

export const spritesStorageKey = "sprites";

export function getSprites(): Sprites {
    const sprites: Sprites = new Map();
    const stored = window.localStorage.getItem(spritesStorageKey);
    if (stored === null) {
        return sprites;
    }
    let parsedJSON: unknown;
    try {
        parsedJSON = JSON.parse(stored);
    } catch {
        console.error("Failed to parse stored item");
        return sprites;
    }
    if (!Array.isArray(parsedJSON)) {
        console.error("Not an array");
        return sprites;
    }

    for (let i = 0; i < parsedJSON.length; i++) {
        const item: unknown = parsedJSON[i];
        if (typeof item !== "object" || item === null) {
            console.error("Not an object");
            return sprites;
        }

        if (!("id" in item) || typeof item.id !== "string") {
            console.error("'id' not defined or invalid in object");
            return sprites;
        }

        if (!("pixels" in item) || typeof item.pixels !== "string") {
            console.error("'pixels' not defined or invalid in object");
            return sprites;
        }
        let spritePixels: Uint8Array;
        try {
            spritePixels = encoding.decodeBase64(item.pixels);
        } catch {
            console.error("'pixels' not defined or invalid in object");
            return sprites;
        }
        if (spritePixels.length !== graphics.spritePixelCount) {
            console.error("'pixels' not defined or invalid in object");
            return sprites;
        }

        sprites.set(item.id, spritePixels);
    }

    return sprites;
}

export function setSprites(sprites: Sprites): void {
    const recordsJSONArray: unknown[] = [];
    for (const [spriteId, spritePixels] of sprites.entries()) {
        const pixelsEncoded = encoding.encodeBase64(spritePixels);
        recordsJSONArray.push({
            id: spriteId,
            pixels: pixelsEncoded,
        });
    }
    localStorage.setItem(spritesStorageKey, JSON.stringify(recordsJSONArray));
}

export type Sprites = Map<string, Uint8Array>;
