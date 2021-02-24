const instruments = {
	sin: 0,
	square: 1,
	triangle: 2,
	saw: 3,
	reverseSaw: 4
};

const keyToNote = {
	"KeyA": "A",
	"KeyS": "A#",
	"KeyD": "B",
	"KeyF": "C",
	"KeyG": "C#",
	"KeyH": "D",
	"KeyJ": "D#",
	"KeyK": "E",
	"KeyL": "F",
	"Semicolon": "F#",
	"Quote": "G",
	"Slash": "G#"
};

class WcSynth extends HTMLElement {
	static observedAttributes = [];
	#isReady;
	#playingNotes = [];
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
			instrument: this.shadowRoot.querySelector("#instrument"),
			frequencyBase: this.shadowRoot.querySelector("#frequency-base")
		};
	}
	attachEvents() {
		document.addEventListener("keydown", this.onKeydown);
		document.addEventListener("keyup", this.onKeyup);
	}
	async onKeydown(e){
		if(e.repeat) return;
		if (!this.#isReady) {
			await this.setupAudio();
			this.#isReady = true;
		}
		switch(e.code){
			case "Digit1":
				this.changeInstrument("sin");
				break;
			case "Digit2":
				this.changeInstrument("square");
				break;
			case "Digit3":
				this.changeInstrument("triangle");
				break;
			case "Digit4":
				this.changeInstrument("saw");
				break;
			case "Digit5":
				this.changeInstrument("reverseSaw");
				break;
			case "ArrowLeft":
				this.shiftBaseFrequency(-12);
				break;
			case "ArrowRight":
				this.shiftBaseFrequency(12);
				break;
			default:
				if(keyToNote[e.code]){
					this.play(keyToNote[e.code]);
				} else {
					console.log(e.code);
				}
		}
	}
	onKeyup(e) {
		if (keyToNote[e.code]) {
			this.stop(keyToNote[e.code]);
		}
	}
	changeInstrument(name){
		const instrument = instruments[name];
		this.toneNode.port.postMessage({ type: "changeInstrument", instrument: instrument });
		this.dom.instrument.textContent = `Instrument: ${name}`;
	}
	shiftBaseFrequency(semitoneCount){
		this.toneNode.port.postMessage({ type: "shiftBaseFrequency", semitoneCount });
	}
	async play(note) {
		this.#playingNotes.push(note);
		this.#playingNotes.sort();
		this.dom.note.textContent = `Note: ${this.#playingNotes.join(", ")}`;
		this.toneNode.port.postMessage({ type: "playNotes", notes: this.#playingNotes });
		this.toneNode.connect(this.context.destination);
	}
	async stop(note) {
		this.#playingNotes = this.#playingNotes.filter(n => n != note);
		this.toneNode.port.postMessage({ type: "playNotes", notes: this.#playingNotes });
		if(this.#playingNotes.length === 0){
			this.toneNode.disconnect(this.context.destination);
		}
	}
	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}
}

customElements.define("wc-synth", WcSynth);