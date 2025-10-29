const frequencies: number[] = [
	16.3516, 17.32391, 18.35405, 19.44544, 20.60172, 21.82676, 23.12465, 24.49971, 25.95654, 27.5, 29.13524, 30.86771,
	32.7032, 34.64783, 36.7081, 38.89087, 41.20344, 43.65353, 46.2493, 48.99943, 51.91309, 55.0, 58.27047, 61.73541,
	65.40639, 69.29566, 73.41619, 77.78175, 82.40689, 87.30706, 92.49861, 97.99886, 103.8262, 110.0, 116.5409, 123.4708,
	130.8128, 138.5913, 146.8324, 155.5635, 164.8138, 174.6141, 184.9972, 195.9977, 207.6523, 220.0, 233.0819, 246.9417,
	261.6256, 277.1826, 293.6648, 311.127, 329.6276, 349.2282, 369.9944, 391.9954, 415.3047, 440.0, 466.1638, 493.8833,
];

const durations: number[] = [2000, 1000, 500, 250, 125, 62, 31, 15];

export const clipNoteCount = 16;
export const clipNotesByteSize = clipNoteCount * 2;

export function playClip(clip: Clip): StopFunction {
	const audioContext = new AudioContext();

	const oscillators: OscillatorNode[] = [];
	for (let i = 0; i < clipNoteCount; i++) {
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const note = getNote(clip.notes, i);
		let boost = 1;
		if (note.type === 0) {
			oscillator.type = "sawtooth";
			boost = 0.2;
		} else if (note.type === 1) {
			oscillator.type = "sine";
		} else if (note.type === 2) {
			oscillator.type = "square";
			boost = 0.2;
		} else if (note.type === 3) {
			oscillator.type = "triangle";
		}
		oscillator.frequency.setValueAtTime(frequencies[note.pitch], 0);

		if (note.volume > 0) {
			gainNode.gain.value = 0;
			gainNode.gain.setValueAtTime(0, audioContext.currentTime + (durations[clip.speed] * i) / 1000);
			gainNode.gain.linearRampToValueAtTime(
				(note.volume / 15) * boost,
				audioContext.currentTime + (durations[clip.speed] * (i + 0.5)) / 1000,
			);
			gainNode.gain.setValueAtTime(
				(note.volume / 15) * boost,
				audioContext.currentTime + (durations[clip.speed] * (i + 1)) / 1000,
			);
			gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + (durations[clip.speed] * (i + 1.5)) / 1000);
			oscillator.connect(gainNode).connect(audioContext.destination);
			oscillator.start();
			oscillator.stop(audioContext.currentTime + (durations[clip.speed] * (i + 2)) / 1000);
		}
		oscillators.push(oscillator);
	}

	return () => {
		for (const oscillator of oscillators) {
			oscillator.disconnect();
		}
	};
}

export type StopFunction = () => void;

export interface Clip {
	speed: number;
	notes: Uint8Array;
}

export function getNote(notes: Uint8Array, position: number): Note {
	const byte1 = notes[position * 2];
	const byte2 = notes[position * 2 + 1];

	const noteType = byte1 >> 4;
	const volume = byte1 & 0xf;
	const pitch = byte2 >> 2;
	const note: Note = {
		type: noteType,
		pitch: pitch,
		volume: volume,
	};
	return note;
}

export function setNote(notes: Uint8Array, position: number, note: Note): void {
	notes[position * 2] = (note.type << 4) | note.volume;
	notes[position * 2 + 1] = note.pitch << 2;
}

export interface Note {
	volume: number;
	pitch: number;
	type: number;
}
