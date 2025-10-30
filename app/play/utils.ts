import * as audio from "@audio";
import * as graphics from "@graphics";

export class Renderer {
    private renderQueue: SpriteRenderQueue = [];
    private backgroundColor: graphics.Color | null = null;
    private canvasContext: CanvasRenderingContext2D;

    constructor(canvasContext: CanvasRenderingContext2D) {
        this.canvasContext = canvasContext;
    }

    public pushSprite(
        spritePixels: Uint8Array,
        x: number,
        y: number,
        flipX: boolean,
        flipY: boolean
    ): void {
        const record: SpriteRenderQueueItem = {
            spritePixels: spritePixels,
            x: x,
            y: y,
            flipX: flipX,
            flipY: flipY,
        };
        this.renderQueue.push(record);
    }

    public setBackgroundColor(color: graphics.Color | null): void {
        this.backgroundColor = color;
    }

    public render(): void {
        const imageData = this.canvasContext.getImageData(
            0,
            0,
            this.canvasContext.canvas.width,
            this.canvasContext.canvas.height
        );
        if (this.backgroundColor !== null) {
            for (let i = 0; i < imageData.data.length / 4; i++) {
                imageData.data[i * 4] = this.backgroundColor.red;
                imageData.data[i * 4 + 1] = this.backgroundColor.green;
                imageData.data[i * 4 + 2] = this.backgroundColor.blue;
                imageData.data[i * 4 + 3] = 255;
            }
        } else {
            for (let i = 0; i < imageData.data.length / 4; i++) {
                imageData.data[i * 4] = 0;
                imageData.data[i * 4 + 1] = 0;
                imageData.data[i * 4 + 2] = 0;
                imageData.data[i * 4 + 3] = 0;
            }
        }
        this.backgroundColor = null;

        for (const queueItem of this.renderQueue) {
            const resolvedX = queueItem.x;
            const resolvedY = 72 - (queueItem.y - 72);

            const canvasXStart = resolvedX - 8;
            const canvasYStart = resolvedY - 8;
            const canvasXEnd = resolvedX + 8;
            const canvasYEnd = resolvedY + 8;

            let renderStartX: number;
            if (canvasXStart > 0) {
                renderStartX = canvasXStart;
            } else {
                renderStartX = 0;
            }

            let renderStartY: number;
            if (canvasYStart > 0) {
                renderStartY = canvasYStart;
            } else {
                renderStartY = 0;
            }

            let spriteLeftOffset: number;
            if (canvasXStart >= 0) {
                spriteLeftOffset = 0;
            } else {
                spriteLeftOffset = Math.abs(canvasXStart);
            }

            let spriteTopOffset: number;
            if (canvasYStart >= 0) {
                spriteTopOffset = 0;
            } else {
                spriteTopOffset = Math.abs(canvasYStart);
            }

            let spriteRightOffset = 0;
            if (canvasXEnd > this.canvasContext.canvas.width) {
                spriteRightOffset =
                    canvasXEnd - this.canvasContext.canvas.width;
            }
            let spriteBottomOffset = 0;
            if (canvasYEnd > this.canvasContext.canvas.height) {
                spriteBottomOffset =
                    canvasYEnd - this.canvasContext.canvas.height;
            }

            if (
                spriteLeftOffset >= 16 ||
                spriteTopOffset >= 16 ||
                spriteRightOffset >= 16 ||
                spriteBottomOffset >= 16
            ) {
                continue;
            }

            for (
                let i = 0;
                i < 16 - spriteLeftOffset - spriteRightOffset;
                i++
            ) {
                for (
                    let j = 0;
                    j < 16 - spriteTopOffset - spriteBottomOffset;
                    j++
                ) {
                    let spriteX = spriteLeftOffset + i;
                    let spriteY = spriteTopOffset + j;

                    if (queueItem.flipX) {
                        spriteX = 15 - spriteX;
                    }
                    if (queueItem.flipY) {
                        spriteY = 15 - spriteY;
                    }

                    const pixelPosition =
                        graphics.getSpritePixelPositionFromCoordinates(
                            spriteX,
                            spriteY
                        );
                    const color = graphics.getPixelColor(
                        queueItem.spritePixels,
                        pixelPosition
                    );
                    if (color !== null) {
                        const index =
                            (renderStartX +
                                i +
                                (renderStartY + j) *
                                    this.canvasContext.canvas.width) *
                            4;
                        imageData.data[index] = color.red;
                        imageData.data[index + 1] = color.green;
                        imageData.data[index + 2] = color.blue;
                        imageData.data[index + 3] = 255;
                    }
                }
            }
        }

        this.canvasContext.putImageData(imageData, 0, 0);

        this.renderQueue.splice(0);
    }
}

type SpriteRenderQueue = SpriteRenderQueueItem[];

interface SpriteRenderQueueItem {
    x: number;
    y: number;
    spritePixels: Uint8Array;
    flipX: boolean;
    flipY: boolean;
}

export class AudioPlayer {
    private audioClips: audio.Clip[] = [];

    public push(audioClip: audio.Clip): void {
        this.audioClips.push(audioClip);
    }

    public play(): void {
        for (const audioClip of this.audioClips) {
            audio.playClip(audioClip);
        }
        this.audioClips.splice(0);
    }
}
