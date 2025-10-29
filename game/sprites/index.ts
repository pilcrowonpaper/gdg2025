import * as graphics from "@graphics"
import * as shared from "@shared"
import * as storage from "@storage"
import { getBackgroundColor, setBackgroundColor } from "@storage"

const getSpriteCanvasElement = () => document.getElementById("sprite-canvas") as HTMLCanvasElement
const getColorPickerElement = () => document.getElementById("color-picker") as HTMLFieldSetElement
const getSpriteSelectorElement = () => document.getElementById("sprite-selector") as HTMLSelectElement
const getSelectedSpriteId = () => getSpriteSelectorElement().value
const getEditorBodyElement = () => document.getElementById("editor-body") as HTMLDivElement
function getToolTypeSelectorElement(): HTMLSelectElement {
  const el = document.getElementById("tool-type-selector")
  if (!(el instanceof HTMLSelectElement)) throw new Error()
  return el
}

const GRID_SIZE = 16
const DEFAULT_BG = 255
const WRAP_PALETTE_EVERY_8 = true

let sprites = storage.getSprites()
let backgroundGray = getBackgroundColor()

let selectedColorIndex: number = 0

type PixelAction = {
  spriteId: string
  pos: number
  prevIndex: number
  newIndex: number
  wasSolid: boolean
  becameSolid: boolean
  prevFull: boolean
  becameFull: boolean
}
const undoStack: PixelAction[][] = []
const redoStack: PixelAction[][] = []
let currentActionBatch: PixelAction[] = []
let drawing = false
let touchedInBatch: Set<number> = new Set()

document.addEventListener("DOMContentLoaded", () => init())

function init(): void {
  getEditorBodyElement().hidden = false
  setupColorPicker()
  setupBackgroundSlider()
  setupSpriteSelector()
  setupPointerDraw()
  setupUndoRedo()
  showInitialSprite()
  setupToolTypeSelector()
  setupPageToggle()
  setupConfigActions()
  setupClearAllButton()
  setupNewSpriteNotification()
}

function setupColorPicker(): void {
  const picker = getColorPickerElement()
  if (WRAP_PALETTE_EVERY_8) {
    picker.style.display = "grid"
    picker.style.gridTemplateColumns = "repeat(8, 24px)"
    picker.style.gap = "20px"
  } else {
    picker.style.display = ""
    picker.style.gridTemplateColumns = ""
    picker.style.gap = ""
  }
  while (picker.firstChild) picker.removeChild(picker.firstChild)
  for (let i = 0; i < graphics.colors.length; i++) {
    const input = document.createElement("input")
    input.type = "radio"
    input.value = i.toString()
    input.name = "color"
    input.style.appearance = "none"
    input.style.cursor = "pointer"
    input.style.backgroundColor = graphics.colorToHexCode(graphics.colors[i])
    if (i === 0) {
      input.checked = true
      selectedColorIndex = 0
    }
    input.addEventListener("change", () => {
      selectedColorIndex = Number(input.value)
      const tool = getToolTypeSelectorElement()
      if (tool.value === "eraser") tool.value = "pen"
    })
    picker.appendChild(input)
  }
}

function setupBackgroundSlider(): void {
  const slider = document.getElementById("background-color-slider") as HTMLInputElement
  slider.value = String(DEFAULT_BG - backgroundGray)
  redrawCurrentSprite()
  slider.addEventListener("input", () => {
    backgroundGray = DEFAULT_BG - parseInt(slider.value)
    setBackgroundColor(backgroundGray)
    redrawCurrentSprite()
  })
}

function setupSpriteSelector(): void {
  getSpriteSelectorElement().addEventListener("change", redrawCurrentSprite)
}

function setupPointerDraw(): void {
  const canvas = getSpriteCanvasElement()
  canvas.addEventListener("pointerdown", (e) => {
    drawing = true
    currentActionBatch = []
    touchedInBatch = new Set()
    handleDraw(e)
  })
  canvas.addEventListener("pointermove", (e) => {
    if (drawing) handleDraw(e)
  })
  window.addEventListener("pointerup", () => {
    if (!drawing) return
    drawing = false
    if (currentActionBatch.length > 0) {
      undoStack.push(currentActionBatch)
      redoStack.length = 0
    }
    saveSprites()
  })
}

function setupUndoRedo(): void {
  window.addEventListener("keydown", (e) => {
    const mod = navigator.platform.toUpperCase().includes("MAC") ? e.metaKey : e.ctrlKey
    if (!mod) return
    if (e.key.toLowerCase() === "z") {
      e.preventDefault()
      e.shiftKey ? redo() : undo()
    }
    if (e.key.toLowerCase() === "y") {
      e.preventDefault()
      redo()
    }
  })
}

function handleDraw(e: PointerEvent): void {
  const rect = getSpriteCanvasElement().getBoundingClientRect()
  const x = Math.floor((e.clientX - rect.left) / (rect.width / GRID_SIZE))
  const y = Math.floor((e.clientY - rect.top) / (rect.height / GRID_SIZE))
  const pos = graphics.getSpritePixelPositionFromCoordinates({ x, y })
  const tool = getToolTypeSelectorElement().value
  const spriteId = getSelectedSpriteId()
  if (tool === "bucket") {
    bucketFill(spriteId, pos, selectedColorIndex)
  } else {
    setPixelWithUndo(spriteId, pos, selectedColorIndex)
  }
  redrawCurrentSprite()
}

function bucketFill(spriteId: string, pos: number, newIndex: number): void {
  const sprite = sprites.get(spriteId)!
  const origin = graphics.getPixelRaw(sprite, pos)
  const targetSolid = origin.solid
  const targetFull = origin.full
  const targetIndex = origin.colorId
  const wantSolid = getToolTypeSelectorElement().value !== "eraser"
  const wantFull = wantSolid
  if (targetSolid === wantSolid && targetFull === wantFull && targetIndex === newIndex) return
  const stack = [pos]
  const seen = new Set<number>()
  while (stack.length) {
    const p = stack.pop()!
    if (seen.has(p)) continue
    seen.add(p)
    const curr = graphics.getPixelRaw(sprite, p)
    if (curr.solid !== targetSolid || curr.full !== targetFull || curr.colorId !== targetIndex) continue
    if (touchedInBatch.has(p)) continue
    currentActionBatch.push({
      spriteId,
      pos: p,
      prevIndex: curr.colorId,
      newIndex,
      wasSolid: curr.solid,
      becameSolid: wantSolid,
      prevFull: curr.full,
      becameFull: wantFull,
    })
    touchedInBatch.add(p)
    graphics.setPixel(sprite, p, wantSolid, wantFull, newIndex)
    const { x, y } = graphics.getSpriteCoordinatesFromPixelPosition(p)
    if (x > 0) stack.push(p - 1)
    if (x < GRID_SIZE - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - GRID_SIZE)
    if (y < GRID_SIZE - 1) stack.push(p + GRID_SIZE)
  }
}

function drawSprite(sprite: Uint8Array): void {
  const canvas = getSpriteCanvasElement()
  const ctx = canvas.getContext("2d")!
  const size = canvas.width / GRID_SIZE
  ctx.fillStyle = `rgb(${backgroundGray},${backgroundGray},${backgroundGray})`
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < graphics.spritePixelCount; i++) {
    const color = graphics.getPixelColor(sprite, i)
    if (!color) continue
    const { x, y } = graphics.getSpriteCoordinatesFromPixelPosition(i)
    ctx.fillStyle = `rgb(${color.red},${color.green},${color.blue})`
    ctx.fillRect(x * size, y * size, size, size)
  }
}

function setPixelWithUndo(spriteId: string, pos: number, newIndex: number): void {
  const sprite = sprites.get(spriteId)!
  if (touchedInBatch.has(pos)) return
  const raw = graphics.getPixelRaw(sprite, pos)
  const tool = getToolTypeSelectorElement().value
  const wantSolid = tool !== "eraser"
  const wantFull = wantSolid
  if (raw.solid === wantSolid && raw.full === wantFull && raw.colorId === newIndex) return
  currentActionBatch.push({
    spriteId,
    pos,
    prevIndex: raw.colorId,
    newIndex,
    wasSolid: raw.solid,
    becameSolid: wantSolid,
    prevFull: raw.full,
    becameFull: wantFull,
  })
  touchedInBatch.add(pos)
  graphics.setPixel(sprite, pos, wantSolid, wantFull, newIndex)
}

function undo(): void {
  const batch = undoStack.pop()
  if (!batch) return
  for (let i = batch.length - 1; i >= 0; i--) {
    const a = batch[i]
    const sprite = sprites.get(a.spriteId)!
    graphics.setPixel(sprite, a.pos, a.wasSolid, a.prevFull, a.prevIndex)
  }
  redoStack.push(batch)
  saveSprites()
  redrawCurrentSprite()
}

function redo(): void {
  const batch = redoStack.pop()
  if (!batch) return
  for (let i = 0; i < batch.length; i++) {
    const a = batch[i]
    const sprite = sprites.get(a.spriteId)!
    graphics.setPixel(sprite, a.pos, a.becameSolid, a.becameFull, a.newIndex)
  }
  undoStack.push(batch)
  saveSprites()
  redrawCurrentSprite()
}

function redrawCurrentSprite(): void {
  const sprite = sprites.get(getSelectedSpriteId())
  if (sprite) drawSprite(sprite)
}

function showInitialSprite(): void {
  if (sprites.size < 1) {
    const sprite = new Uint8Array(graphics.spritePixelCount)
    for (let i = 0; i < graphics.spritePixelCount; i++) {
      graphics.setPixel(sprite, i, false, false, 0)
    }
    sprites.set("untitled-1", sprite)
    saveSprites()
  }
  updateSpriteSelectorOptions()
  redrawCurrentSprite()
}

function saveSprites(): void {
  storage.setSprites(sprites)
}

function updateSpriteSelectorOptions(ids?: string[]): void {
  const el = getSpriteSelectorElement()
  shared.removeHTMLElementChildren(el)
  const list = ids ?? shared.getSortedMapKeys(sprites)
  for (const id of list) {
    const opt = document.createElement("option")
    opt.value = id
    opt.textContent = id
    el.append(opt)
  }
}

function setupToolTypeSelector(): void {
  getToolTypeSelectorElement().addEventListener("change", () => redrawCurrentSprite())
}

function getDrawColorIndex(): number {
  const toolType = getToolTypeSelectorElement().value
  if (toolType === "eraser") return selectedColorIndex
  return selectedColorIndex
}

;(window as any).clearSprite = () => {
  const id = getSelectedSpriteId()
  const sprite = new Uint8Array(graphics.spritePixelCount)
  for (let i = 0; i < graphics.spritePixelCount; i++) {
    graphics.setPixel(sprite, i, false, false, 0)
  }
  sprites.set(id, sprite)
  saveSprites()
  redrawCurrentSprite()
}

function setupPageToggle(): void {
  const editBtn = document.getElementById("show-sprite-edit-page-button")!
  const configBtn = document.getElementById("show-sprite-config-page-button")!
  const editPage = document.getElementById("sprite-edit-page")!
  const configPage = document.getElementById("sprite-config-page")!
  editBtn.addEventListener("click", () => {
    editPage.hidden = false
    configPage.hidden = true
  })
  configBtn.addEventListener("click", () => {
    editPage.hidden = true
    configPage.hidden = false
  })
}

function setupConfigActions(): void {
  const form = document.getElementById("rename-sprite-id-form") as HTMLFormElement | null
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault()
      const fd = new FormData(form)
      const raw = (fd.get("new_sprite_id") ?? "").toString().trim()
      const oldId = getSelectedSpriteId()
      if (raw.length === 0 || raw === oldId) return
      const newId = raw
      if (sprites.has(newId)) {
        alert(`${newId} はすでに存在します`)
        return
      }
      const cur = sprites.get(oldId)
      if (!cur) return
      sprites.delete(oldId)
      sprites.set(newId, cur)
      saveSprites()
      updateSpriteSelectorOptions()
      getSpriteSelectorElement().value = newId
      redrawCurrentSprite()
    })
  }
  const delBtn = document.getElementById("delete-sprite-button") as HTMLButtonElement | null
  if (delBtn) {
    delBtn.addEventListener("click", () => {
      const id = getSelectedSpriteId()
      sprites.delete(id)
      if (sprites.size === 0) {
        const nid = "untitled-1"
        const blank = new Uint8Array(graphics.spritePixelCount)
        sprites.set(nid, blank)
      }
      saveSprites()
      updateSpriteSelectorOptions()
      const next = shared.getSortedMapKeys(sprites)[0]
      getSpriteSelectorElement().value = next
      redrawCurrentSprite()
    })
  }
}
function setupClearAllButton(): void {
  const btn = document.getElementById("clear-all-button") as HTMLButtonElement
  if (!btn) return
  btn.addEventListener("click", () => {
    const id = getSelectedSpriteId()
    const sprite = sprites.get(id)
    if (!sprite) return

    currentActionBatch = []
    touchedInBatch = new Set()

    for (let i = 0; i < graphics.spritePixelCount; i++) {
      const raw = graphics.getPixelRaw(sprite, i)
      currentActionBatch.push({
        spriteId: id,
        pos: i,
        prevIndex: raw.colorId,
        newIndex: 0,
        wasSolid: raw.solid,
        becameSolid: false,
        prevFull: raw.full,
        becameFull: false,
      })
      graphics.setPixel(sprite, i, false, false, 0)
    }

    undoStack.push(currentActionBatch)
    redoStack.length = 0

    saveSprites()
    redrawCurrentSprite()
  })
}

function setupNewSpriteNotification(): void {
  const newBtn = document.getElementById("new-sprite-button") as HTMLButtonElement
  const log = document.getElementById("log-area") as HTMLDivElement
  if (!newBtn || !log) return

  newBtn.addEventListener("click", () => {
    const base = "untitled"
    let index = 1
    while (sprites.has(`${base}-${index}`)) index++

    const id = `${base}-${index}`
    const sprite = new Uint8Array(graphics.spritePixelCount)

    for (let i = 0; i < graphics.spritePixelCount; i++) {
      graphics.setPixel(sprite, i, false, false, 0)
    }

    sprites.set(id, sprite)
    saveSprites()
    updateSpriteSelectorOptions()
    getSpriteSelectorElement().value = id
    redrawCurrentSprite()

    log.textContent = `Created sprite: ${id}`
    log.style.opacity = "1"
    setTimeout(() => {
      log.style.opacity = "0"
    }, 2000)
  })
}
