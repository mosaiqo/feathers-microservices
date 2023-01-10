import { Channel } from 'amqplib'
import { InterfaceRequester } from '../types'
import { HttpRequester } from './http'
import { RpcRequester } from './rpc'

export class Requester {
	public static async create(options, channel: Channel, type = null) : Promise<InterfaceRequester> {
		const defaultType = 'RPC'
		const allowedTypes = ['HTTP', 'RPC']
		
		if (!allowedTypes.includes(type)) {
			type = defaultType
		}
		
		if (type === defaultType && channel === null) {
			throw new Error('If RPC type selected you need to provide a channel instance')
		}
		
		const requesters = {
			'HTTP': () => new HttpRequester({ ...options, excludeParams: ['provider', 'connection', 'resolve'] }),
			'RPC': () => new RpcRequester({ ...options,  excludeParams: ['provider', 'connection', 'resolve'] }, channel),
		}
		const requester = requesters[type]()
		await requester.init()
		
		return requester
		
	}
}

export default Requester