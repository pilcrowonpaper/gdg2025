import type * as audio from "@audio";

export const audioClipsStorageKey = "audio_clips";

export function getAudioClips(): AudioClips {
    const storedAudioClips: AudioClips = new Map();
    const stored = window.localStorage.getItem(audioClipsStorageKey);
    if (stored === null) {
        return storedAudioClips;
    }
    let parsedJSON: unknown;
    try {
        parsedJSON = JSON.parse(stored);
    } catch {
        console.error("Failed to parse stored item");
        return storedAudioClips;
    }
    if (!Array.isArray(parsedJSON)) {
        console.error("Not an array");
        return storedAudioClips;
    }

    for (let i = 0; i < parsedJSON.length; i++) {
        const item: unknown = parsedJSON[i];
        if (typeof item !== "object" || item === null) {
            console.error("Not an object");
            return storedAudioClips;
        }

        if (!("id" in item) || typeof item.id !== "string") {
            console.error("'id' not defined or invalid in object");
            return storedAudioClips;
        }
        if (
            !("speed" in item) ||
            typeof item.speed !== "number" ||
            !Number.isInteger(item.speed) ||
            item.speed < 0 ||
            item.speed > 9
        ) {
            console.error("'speed' not defined or invalid in object");
            return storedAudioClips;
        }
        const speed = item.speed;

        if (!("notes" in item) || !Array.isArray(item.notes)) {
            console.error("'notes' not defined or invalid in object");
            return storedAudioClips;
        }
        const notes: audio.Note[] = [];
        for (let j = 0; j < item.notes.length; j++) {
            const notesItem: unknown = item.notes[j];
            if (typeof notesItem !== "object" || notesItem === null) {
                console.error("Not an object");
                return storedAudioClips;
            }
            if (
                !("volume" in notesItem) ||
                typeof notesItem.volume !== "number" ||
                notesItem.volume < 0 ||
                notesItem.volume > 10
            ) {
                console.error("'volume' not defined or invalid in object");
                return storedAudioClips;
            }
            const noteVolume = notesItem.volume;

            if (
                !("pitch" in notesItem) ||
                typeof notesItem.pitch !== "number" ||
                !Number.isInteger(notesItem.pitch) ||
                notesItem.pitch < 0 ||
                notesItem.pitch > 34
            ) {
                console.error("'volume' not defined or invalid in object");
                return storedAudioClips;
            }
            const notePitch = notesItem.pitch;

            if (!("type" in notesItem) || typeof notesItem.type !== "string") {
                console.error("'type' not defined or invalid in object");
                return storedAudioClips;
            }
            let noteType: audio.NoteType;
            if (notesItem.type === "sawtooth") {
                noteType = "sawtooth";
            } else if (notesItem.type === "sine") {
                noteType = "sine";
            } else if (notesItem.type === "square") {
                noteType = "square";
            } else if (notesItem.type === "triangle") {
                noteType = "triangle";
            } else {
                console.error("'type' not defined or invalid in object");
                return storedAudioClips;
            }

            const note: audio.Note = {
                pitch: notePitch,
                volume: noteVolume,
                type: noteType,
            };
            notes.push(note);
        }
        const audioClip: audio.Clip = {
            speed: speed,
            notes,
        };
        storedAudioClips.set(item.id, audioClip);
    }

    return storedAudioClips;
}

export function setAudioClips(audioClips: AudioClips): void {
    const recordsJSONArray: unknown[] = [];
    for (const [audioClipId, audioClip] of audioClips.entries()) {
        const notesJSONArray: unknown[] = [];
        for (let i = 0; i < audioClip.notes.length; i++) {
            notesJSONArray.push({
                type: audioClip.notes[i].type,
                pitch: audioClip.notes[i].pitch,
                volume: audioClip.notes[i].volume,
            });
        }
        recordsJSONArray.push({
            id: audioClipId,
            speed: audioClip.speed,
            notes: notesJSONArray,
        });
    }
    localStorage.setItem(
        audioClipsStorageKey,
        JSON.stringify(recordsJSONArray)
    );
}

export type AudioClips = Map<string, audio.Clip>;
