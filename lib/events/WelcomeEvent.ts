export class WelcomeEvent {
	name = 'WelcomeEvent'
	id
	key
	registrar
	publisher
	queues = {app: null, service: null}
	services
	host
	type
	
	private constructor (id, key, host, type, queues, registrar, publisher, services) {
		this.id = id
		this.key = key
		this.host = host
		this.type = type
		this.queues = queues
		this.registrar = registrar
		this.publisher = publisher
		this.services = services
	}
	
	get uuid () {
		return this.key
	}
	
	static create(id, key, host, type, queues, registrar, publisher, services) {
		return new WelcomeEvent(id, key, host, type, queues, registrar, publisher, services)
	}
	
	static reconstruct(eventData) {
		const {id, key, name, data} = eventData
		if (name !== this.name) {
			throw new Error(`This is not a valid ${this.name}Event.`)
		}
		return new WelcomeEvent(id, key, data.host, data.type, data.queues, data.registrar, data.publisher, data.services)
	}
	
	get data () {
		return {
			key: this.key,
			host: this.host,
			type: this.type,
			registrar: this.registrar,
			publisher: this.publisher,
			queues: this.queues,
			services: this.services
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

export default WelcomeEvent