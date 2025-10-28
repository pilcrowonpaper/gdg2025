const frequencies: number[] = [
    32.703, 38.891, 43.654, 48.999, 58.27, 65.406, 77.782, 87.307, 97.999,
    116.541, 130.813, 155.563, 174.614, 195.998, 233.082, 261.626, 311.127,
    349.228, 391.995, 466.164, 523.251, 622.254, 698.456, 783.991, 932.328,
    1046.502, 1244.508, 1396.913, 1567.982, 1864.655, 2093.005, 2489.016,
    2793.826, 3135.963, 3729.31,
];

const durations: number[] = [300, 200, 150, 100, 75, 60, 50, 40, 30, 20];

export async function playAudio(audioClip: Clip): Promise<void> {
    const audioContext = new AudioContext();

    for (let i = 0; i < 10; i++) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const note = audioClip.notes[i];
        oscillator.type = note.type;
        oscillator.frequency.setValueAtTime(
            frequencies[note.pitch],
            audioContext.currentTime
        );
        if (note.volume > 0) {
            gainNode.gain.value = 0;
            gainNode.gain.linearRampToValueAtTime(
                note.volume,
                audioContext.currentTime + durations[audioClip.speed] / 1000
            );
            gainNode.gain.linearRampToValueAtTime(
                0,
                audioContext.currentTime +
                    durations[audioClip.speed] / 1000 +
                    0.03
            );
            oscillator.connect(gainNode).connect(audioContext.destination);
            oscillator.start();
            await new Promise<void>((r) =>
                setTimeout(r, durations[audioClip.speed])
            );
        } else {
            await new Promise((r) => setTimeout(r, durations[audioClip.speed]));
        }
    }
}

export interface Clip {
    speed: number;
    notes: Note[];
}

export interface Note {
    volume: number;
    pitch: number;
    type: NoteType;
}

export type NoteType = "sawtooth" | "sine" | "square" | "triangle";
