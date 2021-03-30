const frequencyPowerBase = 2 ** (1 / 12);
const noteIndex = {
	"A": 0,
	"A#": 1,
	"Bb": 1,
	"B": 2,
	"C": 3,
	"C#": 4,
	"Db": 4,
	"D": 5,
	"D#": 6,
	"Eb": 6,
	"E": 7,
	"F": 8,
	"F#": 9,
	"Gb": 9,
	"G": 10,
	"G#": 11,
	"Ab": 11
};

class ToneProcessor extends AudioWorkletProcessor {
	#index = 0;
	#playingNotes = [];
	#debug = false;
	#debugFrames = [];
	#isSilent = true;
	#baseFrequency = 440;
	#instrument = 0;
	constructor() {
		super();
		this.bind(this);
		this.port.onmessage = this.onMessage;
	}
	bind(processor) {
		processor.onMessage = processor.onMessage.bind(processor);
	}
	onMessage(e) {
		switch (e.data.type) {
			case "noteDown": {
				const note = this.#playingNotes.find(n => n.note === e.data.note);
				if (!note) {
					this.#playingNotes.push({
						note: e.data.note,
						downTime: (this.#index / globalThis.sampleRate) * 1000
					});
				} else {
					note.downTime = (this.#index / globalThis.sampleRate) * 1000,
					note.upTime = null;
				}
				this.#isSilent = false;
				break;
			}
			case "noteUp": {
				const note = this.#playingNotes.find(n => n.note === e.data.note);
				if (note) {
					note.upTime = (this.#index / globalThis.sampleRate) * 1000;
				}
				break;
			}
			case "shiftBaseFrequency": {
				this.#baseFrequency = this.#baseFrequency * frequencyPowerBase ** e.data.semitoneCount;
				break;
			}
			case "changeInstrument": {
				this.#instrument = e.data.instrument;
				break;
			}
			case "startDebugCapture": {
				this.#debugFrames = [];
				this.#debug = true;
				console.log("Capturing debug data.");
				break;
			}
			case "endDebugCapture": {
				this.#debug = false;
				this.port.postMessage({ type: "debugInfo", data: this.#debugFrames });
				console.log("Ending debug data.");
				break;
			}
			default:
				throw new Error(`Unknown message sent to tone-processor: ${e.data.type}`);
		}
	}
	process(inputs, outputs, parameters) {
		if (this.#isSilent) return true;
		const output = outputs[0];

		let generatorFunction;
		switch (this.#instrument) {
			case 1:
				generatorFunction = getSquareWave;
				break;
			case 2:
				generatorFunction = getTriangleWave;
				break;
			case 3:
				generatorFunction = getSawWave;
				break;
			case 4:
				generatorFunction = getRSawWave;
				break;
			default:
				generatorFunction = getSinWave;
		}

		output.forEach(channel => {
			const notesToRemove = [];

			for (let i = 0; i < channel.length; i++) {
				const time = this.#index / globalThis.sampleRate;
				const timeMs = time * 1000;

				let value = 0;
				for (const note of this.#playingNotes) {
					const amplitude = envelope({
						attackMs: 100,
						attackAmplitude: 1,
						decayMs: 10,
						sustainAmplitide: 0.8,
						releaseMs: 100,
						maxMs: null
					})(note.downTime, note.upTime, timeMs);

					const frequency = this.#baseFrequency * frequencyPowerBase ** noteIndex[note.note];

					if (amplitude === 0 && note.upTime) {
						notesToRemove.push(note.note);
					}

					value += generatorFunction(frequency, time, amplitude);
				}

				channel[i] = value;
				if (this.#debug) {
					this.#debugFrames.push(value);
				}
				this.#index++;
			}

			this.#playingNotes = this.#playingNotes.filter(n => !notesToRemove.includes(n.note));

			if (this.#playingNotes.length === 0) {
				this.#isSilent = true;
				this.port.postMessage({ type: "silence" });
				console.log("Silent")
			}
		});

		return true;
	}
}

registerProcessor("tone-processor", ToneProcessor);

const envelope = ({ attackMs, attackAmplitude, decayMs, sustainAmplitide, releaseMs, maxMs }) =>
	(downTime, upTime, time) => {
		let amplitude = 0;
		if (time >= downTime) {
			const envelopeTime = time - downTime;

			if (!upTime) {
				if (envelopeTime <= attackMs) {
					amplitude = attackAmplitude * (envelopeTime / attackMs)
				} else if (envelopeTime < (decayMs + attackMs)) {
					amplitude = attackAmplitude + ((sustainAmplitide - attackAmplitude) * ((envelopeTime - attackMs) / decayMs));
				} else {
					amplitude = sustainAmplitide;
				}
			} else {
				const timeSinceRelease = time - upTime;
				if (timeSinceRelease < releaseMs) {
					amplitude = sustainAmplitide + ((0 - sustainAmplitide) * (timeSinceRelease / releaseMs));
				} else {
					amplitude = 0;
				}
			}

			if (maxMs && envelopeTime > maxMs) {
				amplitude = 0;
			}
		}
		if (amplitude < 0.001) {
			amplitude = 0;
		}
		return amplitude;
	};

function getSinWave(frequency, time, amplitude = 1) {
	return amplitude * Math.sin(frequency * 2 * Math.PI * time);
}

function getSquareWave(frequency, time, amplitude = 1) {
	const sinWave = Math.sin(frequency * 2 * Math.PI * time);
	return sinWave > 0.0
		? amplitude / Math.PI
		: -(amplitude / Math.PI);
}

function getTriangleWave(frequency, time, amplitude = 1) {
	return (2 * amplitude / Math.PI) * Math.asin(Math.sin(frequency * 2 * Math.PI * time));
}

function getSawWave(frequency, time, amplitude = 1) {
	return (4 * amplitude / Math.PI) * (frequency * Math.PI * (time % (1 / frequency))) - (2 / Math.PI * amplitude);
}

function getRSawWave(frequency, time, amplitude = 1) {
	return (4 * amplitude / Math.PI) * (1 - (frequency * Math.PI * (time % (1 / frequency)))) - (2 / Math.PI * amplitude);
}