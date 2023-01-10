import { v4 } from 'uuid'
export class RPCRequestEvent {
	name = 'RPCRequestEvent'
	_uuid
	id
	path
	
	internalData
	params
	type
	
	private constructor (id, type, path, data, params, uuid = null) {
		this._uuid = uuid || v4()
		this.id = id
		this.path = path
		this.internalData = data
		this.params = params
		this.type = type
	}
	
	get uuid () {
		return this._uuid
	}
	
	static create(id, type, path, data = null, params = {}) {
		return new RPCRequestEvent(id, type, path, data, params)
	}
	
	static reconstruct(eventData) {
		const {name, uuid, data} = eventData
		if (name !== this.name) {
			throw new Error(`This is not a valid ${this.name}Event.`)
		}
		return new RPCRequestEvent(data.id, data.type, data.path, data.data, data.params, uuid)
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
			id: this.uuid,
			data: this.data
		}
	}
}

export default RPCRequestEvent