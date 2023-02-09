export class ServiceEvent {
	name = 'ServiceEvent'
	id
	key
	host
	service
	event
	_data
	
	private constructor (id, key, host, service, event, data) {
		this.id = id
		this.key = key
		this.host = host
		this.service = service
		this.event = event
		this._data = data
	}
	
	get uuid () {
		return this.key
	}
	
	static create (id, key, host, service, event, data) {
		return new ServiceEvent(id, key, host, service, event, data)
	}
	
	static reconstruct (eventData) {
		const { id, key, name, data } = eventData
		if (name !== this.name) {
			throw new Error(`This is not a valid ${ this.name }.`)
		}
		return new ServiceEvent(id, key, data.host, data.service, data.event, data.data)
	}
	
	get data () {
		return {
			key: this.key,
			host: this.host,
			service: this.service,
			event: this.event,
			data: this._data
		}
	}
	
	toJson () {
		return {
			name: this.name,
			id: this.id,
			key: this.key,
			data: this.data
		}
	}
}

export default ServiceEvent
