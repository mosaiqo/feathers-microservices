import { InterfaceConsumer, InterfacePublisher, InterfaceRequester } from '../types'
import { HttpRequester } from './http'
import { RpcRequester } from './rpc'

export class Requester {
	public static async create(options, consumer?: InterfaceConsumer | null, publisher?: InterfacePublisher | null) : Promise<InterfaceRequester> {
		const defaultType = 'HTTP'
		let type = options?.type
		const allowedTypes = ['HTTP', 'RPC']
		
		if (!allowedTypes.includes(type)) {
			type = defaultType
		}
		
		if (type === 'RPC' && (!consumer || !publisher)) {
			throw new Error('If RPC type selected you need to provide a consumer and a publisher instance')
		}
		
		const mappedOptions = { ...options, excludeParams: ['provider', 'connection', 'resolve'] }
		
		const requesters = {
			'HTTP': () => new HttpRequester(mappedOptions),
			'RPC': () => new RpcRequester(mappedOptions, consumer, publisher),
		}
		const requester = requesters[type]()
		await requester.init()
		
		return requester
		
	}
}

export default Requester