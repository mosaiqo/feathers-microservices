import * as errors from '@feathersjs/errors'
import { AppConsumer } from '../consumers'
import { AppsPublisher } from '../publishers'
import { RPCRequestEvent, RPCResponseEvent } from '../events'

export class RpcReplier {
	app
	key
	consumer
	publisher
	private constructor (app, key, consumer: AppConsumer, publisher: AppsPublisher) {
		this.app = app
		this.key = key
		this.consumer = consumer
		this.publisher = publisher
	}
	
	async init() {
		await this.consumer.onRpcRequest(async (e: RPCRequestEvent, p) => {
			const response = await this.respond(e)
			const event = RPCResponseEvent.create(e.id, this.key, e.type, e.path, response, e.params)
			await this.publisher.respondRpc(event, p)
		})
	}
	
	static async create(app, key, queue, channel) {
		const instance = new RpcReplier(app, key, queue, channel)
		await instance.init()
		
		return instance
	}
	
	async respond(event: RPCRequestEvent) {
		const { data } = event.toJson()
		const path = data.path
		const method = data.type
		const params = data.params
		const id = data.id
		try {
			const service = this.app.service(path)
			
			// Mapping for providing correct parameters to each method
			const methods = {
				find: async () => await service.find(params),
				get: async () => await service.get(id, params),
				create: async () => await service.create(data.data, params),
				update: async() => await service.update(id, data.data, params),
				patch: async () => await service.patch(id, data.data, params),
				remove: async () => await service.remove(id,params)
			}
			return await methods[method]()
		} catch (e) {
			return { error: e.message, code: e.code }
		}
	}
}

export default RpcReplier