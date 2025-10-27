import * as graphics from "@graphics";
import * as shared from "@shared";
import * as storage from "@storage";

const transparencyColorId = 7;

const globalSprites = storage.getSprites();

init();

let mousedown = false;

function init(): void {
    const editorBodyElement = getEditorBodyElement()
    const spriteCanvasElement = getSpriteCanvasElement();
    const colorPicketElement = getColorPickerElement();

    for (let i = 0; i < graphics.colors.length; i++) {
        if (i !== transparencyColorId) {
            const inputElement = document.createElement("input");
            inputElement.type = "radio";
            inputElement.value = i.toString();
            if (i === 0) {
                inputElement.checked = true;
            }
            const hexCode = graphics.colorToHexCode(graphics.colors[i]);
            inputElement.ariaLabel = hexCode;
            inputElement.style.backgroundColor = hexCode;
            inputElement.name = "color";
            colorPicketElement.append(inputElement);
        }
    }

    showDefaultSprite();
    editorBodyElement.hidden = false

    spriteCanvasElement.addEventListener("mousedown", (e) => {
        mousedown = true;
        const colorId = getCurrentColor();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = Math.floor((e.pageX - target.offsetLeft) / (rect.width / 16));
        const y = Math.floor((e.pageY - target.offsetTop) / (rect.height / 16));
        draw(x, y, graphics.colors[colorId]);
    });

    spriteCanvasElement.addEventListener("touchstart", (e) => {
        mousedown = true;
        if (e.touches.length !== 1) {
            return;
        }
        const colorId = getCurrentColor();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = Math.floor(
            (e.touches[0].pageX - target.offsetLeft) / (rect.width / 16)
        );
        const y = Math.floor(
            (e.touches[0].pageY - target.offsetTop) / (rect.height / 16)
        );
        draw(x, y, graphics.colors[colorId]);
    });

    window.addEventListener("mouseup", () => {
        mousedown = false;
    });

    window.addEventListener("touchend", () => {
        mousedown = false;
    });

    spriteCanvasElement.addEventListener("mousemove", (e) => {
        if (!mousedown) {
            return;
        }
        const colorId = getCurrentColor();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = Math.floor((e.pageX - target.offsetLeft) / (rect.width / 16));
        const y = Math.floor((e.pageY - target.offsetTop) / (rect.height / 16));
        draw(x, y, graphics.colors[colorId]);
    });

    spriteCanvasElement.addEventListener("touchmove", (e) => {
        if (!mousedown || e.touches.length !== 1) {
            return;
        }
        const colorId = getCurrentColor();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = Math.floor(
            (e.touches[0].pageX - target.offsetLeft) / (rect.width / 16)
        );
        const y = Math.floor(
            (e.touches[0].pageY - target.offsetTop) / (rect.height / 16)
        );
        draw(x, y, graphics.colors[colorId]);
    });
}

function draw(x: number, y: number, color: graphics.Color): void {
    const spriteCanvasElement = getSpriteCanvasElement();
    const context = spriteCanvasElement.getContext("2d");
    if (context === null) {
        throw new Error("Context not defined");
    }
    const imageData = context.getImageData(x, y, 1, 1);
    imageData.data[0] = color.red;
    imageData.data[1] = color.green;
    imageData.data[2] = color.blue;
    imageData.data[3] = 255; // no transparency
    context.putImageData(imageData, x, y);
}

function getCurrentColor(): number {
    const colorPickerElement = getColorPickerElement();
    for (const childElement of colorPickerElement.children) {
        if (childElement instanceof HTMLInputElement) {
            if (childElement.checked) {
                return Number(childElement.value);
            }
        }
    }
    return 0;
}

function getCurrentToolType(): ToolType {
    const toolTypeSelectorElement = getToolTypeSelectorElement();
    if (toolTypeSelectorElement.value === "pen") {
        return "pen";
    }
    if (toolTypeSelectorElement.value === "eraser") {
        return "eraser";
    }
    throw new Error("Invalid tool type selector value");
}

type ToolType = "pen" | "eraser";

function generateSpriteId(existingRecordIds: string[]): string {
    let num = 1;
    let id = "untitled-1";
    while (existingRecordIds.includes(id)) {
        num++;
        id = `untitled-${num}`;
    }
    return id;
}

function showDefaultSprite(): void {
    const spriteSelectorElement = getSpriteSelectorElement();
    if (globalSprites.size < 1) {
        const defaultSprite = createDefaultSprite();
        globalSprites.set("untitled-1", defaultSprite);
        storage.setSprites(globalSprites);
    }

    const spriteIds = shared.getSortedMapKeys(globalSprites);
    updateSpriteSelectorOptions(spriteIds);

    const initialSprite =
        globalSprites.get(spriteSelectorElement.value) ?? null;
    if (initialSprite === null) {
        throw new Error(`${spriteSelectorElement.value} not defined`);
    }
    drawSprite(initialSprite);
}

function updateSpriteSelectorOptions(spriteIds: string[]): void {
    const spriteSelectorElement = getSpriteSelectorElement();

    shared.removeHTMLElementChildren(spriteSelectorElement);

    for (let i = 0; i < spriteIds.length; i++) {
        const optionElement = document.createElement("option");
        optionElement.innerText = spriteIds[i];
        spriteSelectorElement.append(optionElement);
    }
}

function createDefaultSprite(): graphics.Sprite {
    const sprite: graphics.Sprite = {
        transparencyColorId: transparencyColorId,
        pixels: new Uint8Array(graphics.spritePixelsByteSize),
    };
    for (let i = 0; i < graphics.spritePixelCount; i++) {
        graphics.setPixelColor(sprite.pixels, i, transparencyColorId);
    }
    return sprite;
}

function drawSprite(sprite: graphics.Sprite): void {
    for (let i = 0; i < graphics.spritePixelCount; i++) {
        const coordinates = graphics.getSpriteCoordinatesFromPixelPosition(i);
        const colorId = graphics.getPixelColor(sprite.pixels, i);
        if (colorId === transparencyColorId) {
            const transparencyColor: graphics.Color = {
                red: 239,
                green: 239,
                blue: 239,
            };
            draw(coordinates.x, coordinates.y, transparencyColor);
        } else {
            draw(coordinates.x, coordinates.y, graphics.colors[colorId]);
        }
    }
}

function getEditorBodyElement(): HTMLDivElement {
	const elementId = "editor-body";

	const editorBodyElement = document.getElementById(elementId);
	if (!(editorBodyElement instanceof HTMLDivElement)) {
		throw new Error(`${elementId} not div element`);
	}
	return editorBodyElement;
}

function getSpriteSelectorElement(): HTMLSelectElement {
    const elementId = "sprite-selector";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLSelectElement)) {
        throw new Error(`${elementId} not select element`);
    }
    return element;
}

function getNewSpriteButtonElement(): HTMLButtonElement {
    const elementId = "new-sprite-button";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLButtonElement)) {
        throw new Error(`${elementId} not button element`);
    }
    return element;
}

function getRenameSpriteIdFormElement(): HTMLFormElement {
    const elementId = "rename-sprite-id-form";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLFormElement)) {
        throw new Error(`${elementId} not input element`);
    }
    return element;
}

function getDeleteSpriteButtonElement(): HTMLButtonElement {
    const elementId = "delete-sprite-button";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLButtonElement)) {
        throw new Error(`${elementId} not button element`);
    }
    return element;
}

function getShowSpriteEditPageButtonElement(): HTMLButtonElement {
    const elementId = "show-sprite-edit-page-button";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLButtonElement)) {
        throw new Error(`${elementId} not button element`);
    }
    return element;
}

function getShowSpriteConfigPageButtonElement(): HTMLButtonElement {
    const elementId = "show-sprite-config-page-button";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLButtonElement)) {
        throw new Error(`${elementId} not button element`);
    }
    return element;
}

function getSpriteEditPageElement(): HTMLDivElement {
    const elementId = "sprite-edit-page";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLDivElement)) {
        throw new Error(`${elementId} not div element`);
    }
    return element;
}

function getSpriteConfigPageElement(): HTMLDivElement {
    const elementId = "sprite-config-page";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLDivElement)) {
        throw new Error(`${elementId} not div element`);
    }
    return element;
}

function getToolTypeSelectorElement(): HTMLSelectElement {
    const elementId = "tool-type-selector";
    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLSelectElement)) {
        throw new Error(`${elementId} not a select element`);
    }
    return element;
}

function getColorPickerElement(): HTMLFieldSetElement {
    const elementId = "color-picker";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLFieldSetElement)) {
        throw new Error(`${elementId} not fieldset element`);
    }
    return element;
}

function getSpriteCanvasElement(): HTMLCanvasElement {
    const elementId = "sprite-canvas";

    const element = document.getElementById(elementId);
    if (!(element instanceof HTMLCanvasElement)) {
        throw new Error(`${elementId} not canvas element`);
    }
    return element;
}
