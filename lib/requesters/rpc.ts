import * as errors from '@feathersjs/errors'
import { InterfaceConsumer, InterfacePublisher, InterfaceRequester } from '../types'
import { RPCRequestEvent, RPCResponseEvent } from '../events'
import { v4 } from 'uuid'

export class RpcRequester implements InterfaceRequester {
	excludeParams
	options
	consumer?: InterfaceConsumer
	publisher?: InterfacePublisher
	topic
	replyTo
	namespace
	service
	key
	responses
	timeouts
	constructor (options, consumer: InterfaceConsumer, publisher: InterfacePublisher) {
		this.options = options
		this.replyTo = options.replyTo
		this.excludeParams = options.excludeParams
		
		this.key = options.current.key
		this.namespace = options.current.namespace
		
		this.service = options.remote.service
		
		
		this.consumer = consumer
		this.publisher = publisher
		this.responses = {}
		this.timeouts = {}
	}
	async init() {
		this.generateTopic()
		await this.consumer.onRpcResponse(async (e: RPCResponseEvent, p) => {
			const correlationId = p.correlationId
			if (this.responses[correlationId]) {
				this.responses[correlationId].resolve(e.toJson().data.data)
			}
			
			if (this.timeouts[correlationId]) {
				clearTimeout(this.timeouts[correlationId])
			}
		})
	}
	
	static async create(options, consumer, publisher) {
		const instance = new RpcRequester(options, consumer, publisher)
		await instance.init()
		
		return instance
	}
	
	
	async send (options) {
		return new Promise((resolve, reject) => {
			const defaults = { id: null, data: {}, params: {} }
			const correlationId = v4()
			this.responses[correlationId] = 'foo' // null
			this.timeouts[correlationId] = null
			// @ts-ignore
			const { type, path, id, data, params } = { ...defaults, ...options }
			const event = RPCRequestEvent.create(
				this.idToString(id),
				this.key,
				type,
				path,
				data,
				this.filterParams(params)
			)

			// How to do this?
			this.responses[correlationId] = { resolve, reject }
			this.timeouts[correlationId] = setTimeout(() => {
				if (this.responses[correlationId]) {
					reject({
						response: {
							data: { request: event.toJson(), status: 408, message: 'Request timed out' }
						}
					})
					delete this.responses[correlationId]
				}
				
				if (this.timeouts[correlationId]) {
					clearTimeout(this.timeouts[correlationId])
				}
			}, 5000)
			this.publisher.requestRpc(event, { topic: this.topic, correlationId, replyTo: this.replyTo })
		})
	}
	
	generateTopic() {
		const namespace = this.namespace ? `${this.namespace}.` : ''
		const service = this.service
		
		this.topic = `${namespace}${service}`
	}
	
	filterParams (params) {
		params.provider = 'remote'
		if (!this.excludeParams) { return params }
		
		const result = { ...params }
		
		for (const param of this.excludeParams) {
			delete result[param]
		}
		
		return result
	}
	
	idToString (id) {
		if (typeof id === 'object') { return JSON.stringify(id) }
		
		return id
	}
}

export default RpcRequester
