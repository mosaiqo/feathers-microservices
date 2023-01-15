import { v4 } from 'uuid'
export class RPCResponseEvent {
	name = 'RPCResponseEvent'
	uuid
	id
	path
	key
	
	internalData
	params
	type
	
	private constructor (id, key, type, path, data, params, uuid = null) {
		this.uuid = uuid || v4()
		this.id = id
		this.key = key
		this.path = path
		this.internalData = data
		this.params = params
		this.type = type
	}
	static create(id, key, type, path, data = null, params = {}) {
		return new RPCResponseEvent(id, key, type, path, data, params)
	}
	
	static reconstruct(eventData) {
		const {name, uuid, key, data} = eventData
		if (name !== this.name) {
			throw new Error(`This is not a valid ${this.name}Event.`)
		}
		return new RPCResponseEvent(data.id, key, data.type, data.path, data.data, data.params, uuid)
	}
	
	get data () {
		return {
			id: this.id,
			data: this.internalData,
			params: this.params,
			path: this.path,
			type: this.type
		}
	}
	
	toJson() {
		return {
			name: this.name,
			key: this.key,
			id: this.uuid,
			data: this.data
		}
	}
}

export default RPCResponseEvent