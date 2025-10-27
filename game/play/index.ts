const gameElement = getGameElement();

const canvasContext = gameElement.getContext("2d");
if (canvasContext === null) {
	throw new Error("2d context not available");
}
setInterval(() => {
	const imageData = canvasContext.getImageData(0, 0, 16 * 12, 16 * 9);
	for (let i = 0; i < imageData.data.length / 4; i++) {
		imageData.data[i * 4] = 255;
		imageData.data[i * 4 + 3] = Math.floor(Math.random() * 256);
	}
	canvasContext.putImageData(imageData, 0, 0);
}, 10);

function getGameElement(): HTMLCanvasElement {
	const elementId = "game";
	const element = document.getElementById(elementId);
	if (!(element instanceof HTMLCanvasElement)) {
		throw new Error(`${element} not a canvas element`);
	}
	return element;
}
