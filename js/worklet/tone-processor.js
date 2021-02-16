class ToneProcessor extends AudioWorkletProcessor {
	#index = 0;
	static parameterDescriptors = [
		{
			name: "sampleRate",
			defaultValue: 48000
		},
		{
			name: "frequency",
			defaultValue: 220
		},
		{
			name: "type",
			defaultValue: 0
		}
	];

	process(inputs, outputs, parameters){
		const output = outputs[0];

		let generatorFunction;
		switch(parameters.type[0]){
			case 1:
				generatorFunction = getSquareWave;
				break;
			case 2:
				generatorFunction = getTriangleWave;
				break;
			default:
				generatorFunction = getSinWave;
		}

		output.forEach(channel => {
			for(let i = 0; i < channel.length; i++){
				channel[i] = generatorFunction(parameters.frequency[0], this.#index / parameters.sampleRate[0]);
				this.#index++;
			}
		});
		return true;
	}
}

registerProcessor("tone-processor", ToneProcessor);

function getSinWave(frequency, time) {
	return 0.5 * Math.sin(frequency * 2 * Math.PI * time);
}

function getSquareWave(frequency, time) {
	const sinWave = Math.sin(frequency * 2 * Math.PI * time);
	return sinWave > 0.0
		? 0.2
		: -0.2;
}

function getTriangleWave(frequency, time) {
	return Math.asin(Math.sin(frequency * 2 * Math.PI * time));
}