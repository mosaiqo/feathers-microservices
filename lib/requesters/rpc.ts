import * as errors from '@feathersjs/errors'
import { InterfaceRequester } from '../types'
import { RPCRequestEvent } from '../events'
import { v4 } from 'uuid'
import {
	DEFAULT_PROTOCOL,
	DEFAULT_TIMEOUT,
	INTERNAL_REQUEST_HEADER,
	AXIOS_HTTP_METHODS
} from '../constants'

export class RpcRequester implements InterfaceRequester{
	excludeParams
	options
	channel
	queue
	replyTo
	responses
	timeouts
	constructor (options, channel) {
		this.options = options
		this.queue = `${this.options.host}-service`
		this.excludeParams = options.excludeParams
		this.channel = channel
		this.responses = {}
		this.timeouts = {}
	}
	async init() {
		this.replyTo = await this.channel.assertQueue('', { durable: false })
		this.channel.consume(this.replyTo.queue, async (msg) => {
			const event = JSON.parse(`${Buffer.from(msg.content)}`)
			const correlationId = msg.properties.correlationId
			// How to send this to the response
			if (this.responses[correlationId]) {
				this.responses[correlationId].resolve(event)
			}
			
			if (this.timeouts[correlationId]) {
				clearTimeout(this.timeouts[correlationId])
			}
			
		},{ noAck: true })
	}
	async send (options) {
		return new Promise((resolve, reject) => {
			const defaults = { id: null, data: {}, params: {} }
			const correlationId = v4()
			this.responses[correlationId] = null
			this.timeouts[correlationId] = null
			// @ts-ignore
			const { type, path, id, data, params } = { ...defaults, ...options }
			const event = RPCRequestEvent.create(
				this.idToString(id), type, path, data, this.filterParams(params)
			)

			// How to do this?
			this.responses[correlationId] = null
			
			this.channel.sendToQueue(
				this.queue,
				Buffer.from(JSON.stringify(event.toJson())),
				{ correlationId, replyTo: this.replyTo.queue }
			)
			
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
			
		})
	}
	
	filterParams (params) {
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
