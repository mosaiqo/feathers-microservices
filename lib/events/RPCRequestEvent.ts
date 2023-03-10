import { v4 } from 'uuid'
export class RPCRequestEvent {
	name = 'RPCRequestEvent'
	uuid
	id
	path
	key
	internalData
	params
	type
	
	private constructor (id, key, type, path, data, params, uuid = null) {
		this.key = key
		this.uuid = uuid || v4()
		this.id = id
		this.path = path
		this.internalData = data
		this.params = params
		this.type = type
	}
	
	static create(id, key, type, path, data = null, params = {}) {
		return new RPCRequestEvent(id, key, type, path, data, params)
	}
	
	static reconstruct(eventData) {
		const {name, uuid, key, data} = eventData
		if (name !== this.name) {
			throw new Error(`This is not a valid ${this.name}Event.`)
		}
		return new RPCRequestEvent(data.id, key, data.type, data.path, data.data, data.params, uuid)
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

export default RPCRequestEvent