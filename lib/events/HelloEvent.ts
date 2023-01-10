export class HelloEvent {
	name = 'HelloEvent'
	id
	key
	host
	type
	
	private constructor (id, key, host, type) {
		this.id = id
		this.key = key
		this.host = host
		this.type = type
	}
	
	get uuid () {
		return this.key
	}
	
	static create(id, key, host, type) {
		return new HelloEvent(id, key, host, type)
	}
	
	static reconstruct(eventData) {
		const {id, key, name, data} = eventData
		if (name !== this.name) {
			throw new Error(`This is not a valid ${this.name}Event.`)
		}
		return new HelloEvent(id, key, data.host, data.type)
	}
	
	get data () {
		return {
			key: this.key,
			host: this.host,
			type: this.type
		}
	}
	
	toJson() {
		return {
			name: this.name,
			id: this.id,
			key: this.key,
			data: this.data
		}
	}
}

export default HelloEvent