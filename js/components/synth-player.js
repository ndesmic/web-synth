const instruments = {
	sin: 0,
	square: 1,
	triangle: 2
};

class WcSynthPlayer extends HTMLElement {
	static observedAttributes = [];
	#isReady;
	#isPlaying;
	#instrument = 0;
	constructor() {
		super();
		this.bind(this);
	}
	bind(element) {
		element.attachEvents = element.attachEvents.bind(element);
		element.cacheDom = element.cacheDom.bind(element);
		element.render = element.render.bind(element);
		element.setupAudio = element.setupAudio.bind(element);
		element.onKeydown = element.onKeydown.bind(element);
		element.onKeyup = element.onKeyup.bind(element);
		element.play = element.play.bind(element);
		element.stop = element.stop.bind(element);
		element.changeInstrument = element.changeInstrument.bind(element);
	}
	render() {
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
				<div>Use the keyboard to play</div>
				<div id="note"></div>
				<div id="instrument"></div>
			`;
	}
	async setupAudio() {
		this.context = new AudioContext();
		await this.context.audioWorklet.addModule("./js/worklet/tone-processor.js");

		this.toneNode = new AudioWorkletNode(this.context, "tone-processor");
		this.toneNode.parameters.get("sampleRate").value = this.context.sampleRate;
	}
	async connectedCallback() {
		this.render();
		this.cacheDom();
		this.attachEvents();
		this.dom.instrument.textContent = `Instrument: sin`;
	}
	cacheDom() {
		this.dom = {
			note: this.shadowRoot.querySelector("#note"),
			instrument: this.shadowRoot.querySelector("#instrument")
		};
	}
	attachEvents() {
		document.addEventListener("keydown", this.onKeydown);
		document.addEventListener("keyup", this.onKeyup);
	}
	async onKeydown(e){
		if (!this.#isReady) {
			await this.setupAudio();
			this.#isReady = true;
		}
		switch(e.code){
			case "KeyA":
				this.play(220);
				this.dom.note.textContent = "A";
				break;
			case "KeyS":
				this.play(233); //A#
				this.dom.note.textContent = "A#";
				break;
			case "KeyD":
				this.play(247); //B
				this.dom.note.textContent = "B";
				break;
			case "KeyF":
				this.play(261); //C
				this.dom.note.textContent = "C";
				break;
			case "KeyG":
				this.play(277); //C#
				this.dom.note.textContent = "C#";
				break;
			case "KeyH":
				this.play(293); //D
				this.dom.note.textContent = "D";
				break;
			case "KeyJ":
				this.play(311); //D#
				this.dom.note.textContent = "D#";
				break;
			case "KeyK":
				this.play(329); //E
				this.dom.note.textContent = "E";
				break;
			case "KeyL":
				this.play(349); //F
				this.dom.note.textContent = "E#";
				break;
			case "Semicolon":
				this.play(370); //F#
				this.dom.note.textContent = "F#";
				break;
			case "Quote":
				this.play(392); //G
				this.dom.note.textContent = "G";
				break;
			case "Slash":
				this.play(415); //G#
				this.dom.note.textContent = "G#";
				break;
			case "Digit1":
				this.changeInstrument("sin");
				break;
			case "Digit2":
				this.changeInstrument("square");
				break;
			case "Digit3":
				this.changeInstrument("triangle");
				break;
			default:
				console.log(e.code);
		}
	}
	changeInstrument(name){
		this.#instrument = instruments[name];
		this.toneNode.parameters.get("type").value = this.#instrument;
		this.dom.instrument.textContent = `Instrument: ${name}`;
	}
	onKeyup(e){
		this.stop();
	}
	async play(frequency) {
		this.#isPlaying = true;
		this.toneNode.parameters.get("frequency").value = frequency;
		this.toneNode.connect(this.context.destination);
	}
	async stop() {
		if(this.#isPlaying){
			this.toneNode.disconnect(this.context.destination);
		}
		this.#isPlaying = false;
	}
	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}
}

customElements.define("synth-player", WcSynthPlayer);