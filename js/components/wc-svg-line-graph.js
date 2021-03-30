const pointDefaults = {
	x: 0,
	y: 0,
	color: "#ff0000",
	size: 2,
	shape: "circle"
};

function windowValue(v, vmin, vmax, flipped = false) {
	v = flipped ? -v : v;
	return (v - vmin) / (vmax - vmin);
}
function center(vlength, vmin, vmax) {
	const center = (vmax - vmin) / 2;
	return center - (vlength / 2);
}
function trimObject(obj) {
	return Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== undefined));
}

export class WcSvgLineGraph extends HTMLElement {
	#points = [];
	#width = 320;
	#height = 240;
	#xmax = 100;
	#xmin = -100;
	#ymax = 100;
	#ymin = -100;
	#func;
	#step = 1;
	static observedAttributes = ["points", "func", "step", "width", "height", "xmin", "xmax", "ymin", "ymax"];
	constructor() {
		super();
		this.bind(this);
	}
	bind(element) {
		element.attachEvents.bind(element);
	}
	render() {
		this.innerHTML = "";
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("width", this.#width);
		svg.setAttribute("height", this.#height);
		const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		background.setAttribute("width", this.#width);
		background.setAttribute("height", this.#height);
		background.setAttribute("fill", "white");
		svg.appendChild(background);
		const guides = document.createElementNS("http://www.w3.org/2000/svg", "path");
		guides.setAttribute("stroke-width", 1.0);
		guides.setAttribute("stroke", "black");
		guides.setAttribute("d", `M0,${this.#height / 2} H${this.#width} M${this.#width / 2},0 V${this.#height}`);
		svg.appendChild(guides);
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("fill", "none");
		path.setAttribute("stroke-width", 1.0);
		path.setAttribute("stroke", "red");
		const pathData = ["M"];
		if(this.#func){
			try {
				const x = this.#xmin;
				const y = this.#func(x);
				const tx = (windowValue(x, this.#xmin, this.#xmax) * this.#width).toFixed(2);
				const ty = (windowValue(y, this.#ymin, this.#ymax, true) * this.#height).toFixed(2);
				pathData.push(tx, ty);

				for(let x = this.#xmin + this.#step; x < this.#xmax; x += this.#step){
					const y = this.#func(x);
					const tx = windowValue(x, this.#xmin, this.#xmax) * this.#width;
					const ty = windowValue(y, this.#ymin, this.#ymax, true) * this.#height;
					pathData.push("L", tx.toFixed(2), ty.toFixed(2));
				}
			} catch (ex){
				const div = document.createElement("div");
				div.textContent = ex.toString();
				this.appendChild(div);
			}
		} else if(this.#points){
			const x = this.#points[0].x;
			const y = this.#points[0].y;
			const tx = (windowValue(x, this.#xmin, this.#xmax) * this.#width).toFixed(2);
			const ty = (windowValue(y, this.#ymin, this.#ymax, true) * this.#height).toFixed(2);
			pathData.push(tx, ty);

			for(let i = 1; i < this.#points.length; i++){
				const p = this.#points[i];
				//const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
				//circle.setAttribute("cx", windowValue(p.x, this.#xmin, this.#xmax) * this.#width);
				//circle.setAttribute("cy", windowValue(p.y, this.#ymin, this.#ymax, true) * this.#height);
				//circle.setAttribute("id", "c" + i);
				//circle.setAttribute("r", p.size);
				//circle.setAttribute("fill", p.color);
				//svg.appendChild(circle);

				const tx = windowValue(p.x, this.#xmin, this.#xmax) * this.#width;
				const ty = windowValue(p.y, this.#ymin, this.#ymax, true) * this.#height;
				pathData.push("L", tx.toFixed(2), ty.toFixed(2));
			}
		}
		path.setAttribute("d", pathData.join(" "));
		svg.appendChild(path);
		this.appendChild(svg);
	}
	attachEvents() {

	}
	connectedCallback() {
		this.render();
		this.attachEvents();
	}
	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}
	set points(value) {
		if(typeof(value) === "string"){
			value = JSON.parse(value);
		}
		if (Array.isArray(value[0])) { //array shorthand
			value = value.map(p => {
				return trimObject({
					x: p[0],
					y: p[1],
					color: p[2],
					size: p[3],
					shape: p[4]
				});
			});
		}
		value = value.map(p => ({ ...pointDefaults, ...p }));
		this.#points = value;
		this.render();
	}
	get points() {
		return this.#points;
	}
	set width(value) {
		this.#width = parseFloat(value);
	}
	get width() {
		return this.#width;
	}
	set height(value) {
		this.#height = parseFloat(value);
	}
	get height() {
		return this.#height;
	}
	set xmax(value) {
		this.#xmax = parseFloat(value);
	}
	get xmax() {
		return this.#xmax;
	}
	set xmin(value) {
		this.#xmin = parseFloat(value);
	}
	get xmin() {
		return this.#xmin;
	}
	set ymax(value) {
		this.#ymax = parseFloat(value);
	}
	get ymax() {
		return this.#ymax;
	}
	set ymin(value) {
		this.#ymin = parseFloat(value);
	}
	get ymin() {
		return this.#ymin;
	}
	set func(value){
		this.#func = new Function(["x"], value);
		this.render();
	}
	set step(value){
		this.#step = parseFloat(value);
	}
}

customElements.define("wc-svg-line-graph", WcSvgLineGraph);
