export class ServicesPublishedEvent {
	name = 'ServicesPublishedEvent'
	id
	key
	host
	services
	
	private constructor (id, key, host, services) {
		this.id = id
		this.key = key
		this.host = host
		this.services = services
	}
	
	get uuid () {
		return this.key
	}
	
	static create(id, key, host, services) {
		return new ServicesPublishedEvent(id, key, host, services)
	}
	
	static reconstruct(eventData) {
		const {id, key, name, data} = eventData
		if (name !== this.name) {
			throw new Error(`This is not a valid ${this.name}.`)
		}
		return new ServicesPublishedEvent(id, key, data.host, data.services)
	}
	
	get data () {
		return {
			key: this.key,
			host: this.host,
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

export default ServicesPublishedEvent