import * as audio from "@audio";
import * as encoding from "@oslojs/encoding";

export const audioClipsStorageKey = "audio_clips";

export function getAudioClips(): AudioClips {
	const stored = window.localStorage.getItem(audioClipsStorageKey);
	if (stored === null) {
		const audioClips = new Map();
		return audioClips;
	}

	let jsonValue: unknown;
	try {
		jsonValue = JSON.parse(stored);
	} catch {
		console.error("Failed to parse stored item");
		const audioClips = new Map();
		return audioClips;
	}

	let audioClips: AudioClips;
	try {
		audioClips = mapJSONValueToAudioClips(jsonValue);
	} catch (e) {
		if (e instanceof Error) {
			console.error(e.message);
		}
		const audioClips = new Map();
		return audioClips;
	}

	return audioClips;
}

export function setAudioClips(audioClips: AudioClips): void {
	const jsonValue = mapAudioClipsToJSONValue(audioClips);
	localStorage.setItem(audioClipsStorageKey, JSON.stringify(jsonValue));
}

export function mapJSONValueToAudioClips(jsonValue: unknown): AudioClips {
	const audioClips: AudioClips = new Map();

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
		if (
			!("speed" in item) ||
			typeof item.speed !== "number" ||
			!Number.isInteger(item.speed) ||
			item.speed < 0 ||
			item.speed > 9
		) {
			throw new Error("'speed' not defined or invalid in object");
		}
		const speed = item.speed;

		if (!("notes" in item) || typeof item.notes !== "string") {
			throw new Error("'notes' not defined or invalid in object");
		}
		let notes: Uint8Array;
		try {
			notes = encoding.decodeBase64(item.notes);
		} catch {
			throw new Error("'pixels' not defined or invalid in object");
		}
		if (notes.length !== audio.clipNotesByteSize) {
			throw new Error("'pixels' not defined or invalid in object");
		}

		const audioClip: audio.Clip = {
			speed: speed,
			notes,
		};
		audioClips.set(item.id, audioClip);
	}

	return audioClips;
}

export function mapAudioClipsToJSONValue(audioClips: AudioClips): unknown {
	const jsonArray: unknown[] = [];
	for (const [audioClipId, audioClip] of audioClips.entries()) {
		const encodedNotes = encoding.encodeBase64(audioClip.notes);
		jsonArray.push({
			id: audioClipId,
			speed: audioClip.speed,
			notes: encodedNotes,
		});
	}
	return jsonArray;
}

export type AudioClips = Map<string, audio.Clip>;
