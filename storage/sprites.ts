import * as graphics from "@graphics";
import * as encoding from "@oslojs/encoding";

export const spritesStorageKey = "sprites";

export function getSprites(): Sprites {
    const stored = window.localStorage.getItem(spritesStorageKey);
    if (stored === null) {
        const sprites = new Map();
        return sprites;
    }
    let jsonValue: unknown;
    try {
        jsonValue = JSON.parse(stored);
    } catch {
        console.error("Failed to parse stored item");
        const sprites = new Map();
        return sprites;
    }

    let sprites: Sprites;
    try {
        sprites = mapJSONValueToSprites(jsonValue);
    } catch (e) {
        if (e instanceof Error) {
            console.error(e.message);
        }
        const sprites = new Map();
        return sprites;
    }
    return sprites;
}

export function setSprites(sprites: Sprites): void {
    const jsonValue = mapSpritesToJSONValue(sprites);
    localStorage.setItem(spritesStorageKey, JSON.stringify(jsonValue));
}

export function mapJSONValueToSprites(jsonValue: unknown): Sprites {
    const sprites: Sprites = new Map();

    if (!Array.isArray(jsonValue)) {
        throw new Error("Not an array");
    }

    for (let i = 0; i < jsonValue.length; i++) {
        const item: unknown = jsonValue[i];
        if (typeof item !== "object" || item === null) {
            throw new Error("Not an object");
        }

        if (!("id" in item) || typeof item.id !== "string") {
            throw new Error("'id' not defined or invalid in object");
        }

        if (!("pixels" in item) || typeof item.pixels !== "string") {
            throw new Error("'pixels' not defined or invalid in object");
        }
        let spritePixels: Uint8Array;
        try {
            spritePixels = encoding.decodeBase64(item.pixels);
        } catch {
            throw new Error("'pixels' not defined or invalid in object");
        }
        if (spritePixels.length !== graphics.spritePixelCount) {
            throw new Error("'pixels' not defined or invalid in object");
        }

        sprites.set(item.id, spritePixels);
    }

    return sprites;
}

export function mapSpritesToJSONValue(sprites: Sprites): unknown {
    const jsonArray: unknown[] = [];
    for (const [spriteId, spritePixels] of sprites.entries()) {
        const pixelsEncoded = encoding.encodeBase64(spritePixels);
        jsonArray.push({
            id: spriteId,
            pixels: pixelsEncoded,
        });
    }
    return jsonArray;
}

export type Sprites = Map<string, Uint8Array>;
