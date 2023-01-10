import * as errors from '@feathersjs/errors'

export class RpcReplier {
	app
	options
	channel
	queue
	constructor (app, options, channel) {
		this.app = app
		this.options = options
		this.channel = channel
		this.queue = `${this.options.host}-service`
	}
	
	async init() {
		await this.channel.assertQueue(this.queue)
		await this.channel.consume(this.queue, async (msg) => {
			const event = JSON.parse(`${Buffer.from(msg.content)}`)
			const response = await this.respond(event.data)
			this.channel.sendToQueue(
				msg.properties.replyTo,
				Buffer.from(JSON.stringify(response)),
				{ correlationId: msg.properties.correlationId }
			)
			this.channel.ack(msg)
		})
	}
	
	async respond(event) {
		const path = event.path
		const method = event.type
		const params = event.params
		const id = event.id
		const data = event.data
		try {
			const service = this.app.service(path)
			
			// Mapping for providing correct parameters to each method
			const methods = {
				find: async () => await service[method](params),
				get: async () => await service[method](id, params),
				create: async () => await service[method](data, params),
				update: async() => await service[method](id, data, params),
				patch: async () => await service[method](id, data, params),
				remove: async () => await service[method](id,params)
			}
			return await methods[method]()
		} catch (e) {
			return { error: e.message, code: e.code }
		}
	}
}

export default RpcReplier