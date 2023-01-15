export class HelloEvent {
	name = 'HelloEvent'
	id
	key
	registrar
	publisher
	
	queues = {app: null, service: null}
	host
	type
	
	private constructor (id, key, host, type, queues, registrar, publisher) {
		this.id = id
		this.key = key
		this.host = host
		this.type = type
		this.queues = queues
		this.registrar = registrar
		this.publisher = publisher
	}
	
	get uuid () {
		return this.key
	}
	
	static create(id, key, host, type, queues, registrar, publisher) {
		return new HelloEvent(id, key, host, type, queues, registrar, publisher)
	}
	
	static reconstruct(eventData) {
		const {id, key, name, data} = eventData
		if (name !== this.name) {
			throw new Error(`This is not a valid ${this.name}Event.`)
		}
		return new HelloEvent(id, key, data.host, data.type, data.queues, data.registrar, data.publisher)
	}
	
	get data () {
		return {
			key: this.key,
			host: this.host,
			type: this.type,
			queues: this.queues,
			registrar: this.registrar,
			publisher: this.publisher
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