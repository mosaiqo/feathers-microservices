import { ServiceInterface } from '@feathersjs/feathers'
import makeDebug from 'debug'
import errorHandler from '../error-handler'

const debug = makeDebug('feathers-http-distributed:service')

export class RemoteService<Service> implements ServiceInterface {
	path
	requester
	remote
	isPublic
	options
	
	constructor (path, requester, options = {}) {
		this.options = { public: false, ...options }
		this.isPublic = this.options?.public || false
		this.path = path
		this.requester = requester
		this.remote = true
	}
	
	async find (params = {}) {
		debug('Requesting find() remote service on path ' + this.path, this.requester.filterParams(params))
		try {
			const result = await this.requester.send({ type: 'find', path: this.path, params })
			debug('Successfully find() remote service on path ' + this.path)
			return result
		} catch (error) {
			throw errorHandler(error)
		}
	}
	
	async get (id, params) {
		debug('Requesting get() remote service on path ' + this.path, id, this.requester.filterParams(params))
		try {
			const result = await this.requester.send({ type: 'get', path: this.path, id, params })
			debug('Successfully get() remote service on path ' + this.path)
			return result
		} catch (error) {
			throw errorHandler(error)
		}
	}
	
	async create (data, params) {
		debug('Requesting create() remote service on path ' + this.path, data, this.requester.filterParams(params))
		try {
			const result = await this.requester.send({ type: 'create', path: this.path, data, params })
			debug('Successfully create() remote service on path ' + this.path)
			return result
		} catch (error) {
			throw errorHandler(error)
		}
	}
	
	async update (id, data, params) {
		debug('Requesting update() remote service on path ' + this.path, id, data, this.requester.filterParams(params))
		try {
			const result = await this.requester.send({ type: 'update', path: this.path, id, data, params })
			debug('Successfully update() remote service on path ' + this.path)
			return result
		} catch (error) {
			throw errorHandler(error)
		}
	}
	
	async patch (id, data, params) {
		debug('Requesting patch() remote service on path ' + this.path, id, data, this.requester.filterParams(params))
		try {
			const result = await this.requester.send({ type: 'patch', path: this.path, id, data, params })
			debug('Successfully patch() remote service on path ' + this.path)
			return result
		} catch (error) {
			throw errorHandler(error)
		}
	}
	
	async remove (id, params) {
		debug('Requesting remove() remote service on path ' + this.path, id, this.requester.filterParams(params))
		try {
			const result = await this.requester.send({ type: 'remove', path: this.path, id, params })
			debug('Successfully remove() remote service on path ' + this.path)
			return result
		} catch (error) {
			throw errorHandler(error)
		}
	}
}

export default RemoteService
