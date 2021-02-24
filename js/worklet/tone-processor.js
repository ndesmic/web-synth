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
	static parameterDescriptors = [
		{
			name: "sampleRate",
			defaultValue: 48000
		},
		{
			name: "type",
			defaultValue: 0
		}
	];
	#index = 0;
	#playingNotes = [];
	#baseFrequency = 440;
	#instrument = 0;
	constructor(){
		super();
		this.bind(this);
		this.port.onmessage = this.onMessage;
	}
	bind(processor){
		processor.onMessage = processor.onMessage.bind(processor);
	}
	onMessage(e){
		switch(e.data.type){
			case "playNotes":
				this.#playingNotes = e.data.notes;
				break;
			case "shiftBaseFrequency":
				this.#baseFrequency = this.#baseFrequency * frequencyPowerBase ** e.data.semitoneCount;
			case "changeInstrument":
				this.#instrument = e.data.instrument;
			default:
				throw new Error(`Unknown message send to tone-processor: ${e.data.type}`);
		}
	}
	process(inputs, outputs, parameters){
		const output = outputs[0];

		let generatorFunction;
		switch(this.#instrument){
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
			for(let i = 0; i < channel.length; i++){

				const frequencies = this.#playingNotes.map(n => this.#baseFrequency * frequencyPowerBase ** noteIndex[n]);
				const outValue = frequencies.reduce((value, frequency) => value + generatorFunction(frequency, this.#index / parameters.sampleRate[0]), 0);
				channel[i] = outValue;
				this.#index++;
			}
		});

		return true;
	}
}

registerProcessor("tone-processor", ToneProcessor);

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

function getSawWave(frequency, time, amplitude = 1){
	return (4 * amplitude / Math.PI) * (frequency * Math.PI * (time % (1 / frequency))) - (2 / Math.PI  * amplitude);
}

function getRSawWave(frequency, time, amplitude = 1) {
	return (4 * amplitude / Math.PI) * (1 - (frequency * Math.PI * (time % (1 / frequency)))) - (2 / Math.PI * amplitude);
}