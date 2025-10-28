import * as graphics from "@graphics";
import * as shared from "@shared";
import * as storage from "@storage";
import { getBackgroundColor, setBackgroundColor } from "@storage";


// ===================================
// DOM Helpers
// ===================================
const getSpriteCanvasElement = () => document.getElementById("sprite-canvas") as HTMLCanvasElement;
const getColorPickerElement = () => document.getElementById("color-picker") as HTMLFieldSetElement;
const getSpriteSelectorElement = () => document.getElementById("sprite-selector") as HTMLSelectElement;
const getSelectedSpriteId = () => getSpriteSelectorElement().value;
const getEditorBodyElement = () => document.getElementById("editor-body") as HTMLDivElement;
function getToolTypeSelectorElement(): HTMLSelectElement {
  const el = document.getElementById("tool-type-selector");
  if (!(el instanceof HTMLSelectElement)) {
    throw new Error("tool-type-selector not select");
  }
  return el;
}



const GRID_SIZE = 16;
const DEFAULT_BG = 255;

let sprites = storage.getSprites();
let backgroundGray = getBackgroundColor();

const undoStack: PixelAction[] = [];
const redoStack: PixelAction[] = [];

type PixelAction = {
  spriteId: string;
  pos: number;
  prevColor: number;
  newColor: number;
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});

function init(): void {
  getEditorBodyElement().hidden = false;
  setupColorPicker();
  setupBackgroundSlider();
  setupSpriteSelector();
  setupPointerDraw();
  setupUndoRedo();

  showInitialSprite();
  setupToolTypeSelector();

}

// ===================================
// Setup UI
// ===================================
function setupColorPicker(): void {
  const picker = getColorPickerElement();
  for (let i = 0; i < graphics.colors.length; i++) {
    const input = document.createElement("input");
    input.type = "radio";
    input.value = i.toString();
    input.checked = i === 0;
    input.style.backgroundColor = graphics.colorToHexCode(graphics.colors[i]);
    input.name = "color";
    picker.append(input);
  }
}

function setupBackgroundSlider(): void {
  const slider = document.getElementById("background-color-slider") as HTMLInputElement;
  slider.value = String(DEFAULT_BG - backgroundGray);

  redrawCurrentSprite();
    slider.addEventListener("input", () => {
    backgroundGray = DEFAULT_BG - parseInt(slider.value);
    console.log("backgroundGray", backgroundGray); 
    setBackgroundColor(backgroundGray);
    redrawCurrentSprite();
    });

}

function setupSpriteSelector(): void {
  getSpriteSelectorElement().addEventListener("change", redrawCurrentSprite);
}

function setupPointerDraw(): void {
  const canvas = getSpriteCanvasElement();
  let drawing = false;

  canvas.addEventListener("pointerdown", e => {
    drawing = true;
    handleDraw(e);
  });
  canvas.addEventListener("pointermove", e => {
    if (drawing) handleDraw(e);
  });
  window.addEventListener("pointerup", () => (drawing = false));
}

function setupUndoRedo(): void {
  window.addEventListener("keydown", e => {
    const mod = navigator.platform.toUpperCase().includes("MAC") ? e.metaKey : e.ctrlKey;
    if (!mod) return;

    if (e.key.toLowerCase() === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    }
    if (e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    }
  });
}

// ===================================
// Drawing
// ===================================
function handleDraw(e: PointerEvent): void {
  const rect = getSpriteCanvasElement().getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / (rect.width / GRID_SIZE));
  const y = Math.floor((e.clientY - rect.top) / (rect.height / GRID_SIZE));
  const pos = graphics.getSpritePixelPositionFromCoordinates({ x, y });

  const spriteId = getSelectedSpriteId();

  setPixelWithUndo(spriteId, pos, getDrawColor());
  saveSprites();
  redrawCurrentSprite();
}

function drawSprite(sprite: Uint8Array): void {
  const canvas = getSpriteCanvasElement();
  const ctx = canvas.getContext("2d")!;
  const size = canvas.width / GRID_SIZE;

  // ✅ 背景色をまず描画
  ctx.fillStyle = `rgb(${backgroundGray},${backgroundGray},${backgroundGray})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ✅ 透明 pixel は背景のまま
  for (let i = 0; i < graphics.spritePixelCount; i++) {
    const { x, y } = graphics.getSpriteCoordinatesFromPixelPosition(i);
    const color = graphics.getPixelColor(sprite, i);

    if (color !== null) {
      ctx.fillStyle = `rgb(${color.red},${color.green},${color.blue})`;
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
}


// ===================================
// Undo / Redo
// ===================================
function setPixelWithUndo(spriteId: string, pos: number, newColor: number): void {
  const sprite = sprites.get(spriteId)!;
  const currentColor = graphics.getPixelColor(sprite, pos);

  const prevColor =
    currentColor === null
      ? 0
      : graphics.colors.findIndex(
          c =>
            c.red === currentColor.red &&
            c.green === currentColor.green &&
            c.blue === currentColor.blue
        );

  if (prevColor === newColor) return;

  undoStack.push({ spriteId, pos, prevColor, newColor });
  redoStack.length = 0;

    const tool = getToolTypeSelectorElement().value;
    const solid = tool === "pen";
    graphics.setPixel(sprite, pos, solid, false, newColor);

}

function undo(): void {
  const action = undoStack.pop();
  if (!action) return;

  const sprite = sprites.get(action.spriteId)!;
  graphics.setPixel(sprite, action.pos, true, false, action.prevColor);
  redoStack.push(action);
  saveSprites();
  redrawCurrentSprite();
}

function redo(): void {
  const action = redoStack.pop();
  if (!action) return;

  const sprite = sprites.get(action.spriteId)!;
  graphics.setPixel(sprite, action.pos, true, false, action.newColor);
  undoStack.push(action);
  saveSprites();
  redrawCurrentSprite();
}

// ===================================
// Sprite Storage & Helpers
// ===================================
function redrawCurrentSprite(): void {
  const sprite = sprites.get(getSelectedSpriteId());
  if (sprite) drawSprite(sprite);
}

function showInitialSprite(): void {
  if (sprites.size < 1) {
    const sprite = new Uint8Array(graphics.spritePixelCount);
    for (let i = 0; i < graphics.spritePixelCount; i++) {
      graphics.setPixel(sprite, i, true, false, 0); // ← solid = true
    }
    sprites.set("untitled-1", sprite);
    saveSprites();
  }
  updateSpriteSelectorOptions();
  redrawCurrentSprite();
}

function saveSprites(): void {
  storage.setSprites(sprites);
}

function updateSpriteSelectorOptions(): void {
  const el = getSpriteSelectorElement();
  shared.removeHTMLElementChildren(el);
  shared.getSortedMapKeys(sprites).forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    el.append(opt);
  });
}

function setupToolTypeSelector(): void {
  const tool = getToolTypeSelectorElement();
  tool.addEventListener("change", () => {
    console.log("Tool changed to:", tool.value);
    redrawCurrentSprite();
  });
}



function getDrawColor(): number {
  const toolType = getToolTypeSelectorElement().value;
  if (toolType === "eraser") {
    return 0; // always return transparent / default background
  }

  const picker = getColorPickerElement();
  for (const child of picker.children) {
    if (child instanceof HTMLInputElement && child.checked) {
      return Number(child.value);
    }
  }
  return 0;
}


;(window as any).clearSprite = () => {
  const id = getSelectedSpriteId();
  const sprite = new Uint8Array(graphics.spritePixelCount);
  for (let i = 0; i < graphics.spritePixelCount; i++) {
    graphics.setPixel(sprite, i, false, false, 0);
  }
  sprites.set(id, sprite);
  saveSprites();
  redrawCurrentSprite();
};
