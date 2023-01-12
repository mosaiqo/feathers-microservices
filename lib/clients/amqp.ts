import * as amqplib from 'amqplib'
import { AmqpClientConnection, InterfaceAmqpClient } from '../types'
import { DEFAULT_EXCHANGE_EVENTS, DEFAULT_EXCHANGE_SERVICES } from '../constants'
export class AmqpClient implements InterfaceAmqpClient {
	url: string
	connection: amqplib.Connection
	channel: amqplib.Channel
	options
	private constructor (url, options) {
		this.url = url
		this.options = {
			exchanges: {
				services: DEFAULT_EXCHANGE_SERVICES,
				events: DEFAULT_EXCHANGE_EVENTS,
			},
			...options
		}
	}
	static async connect (url, options = {}): Promise<AmqpClientConnection> {
		const instance = new AmqpClient(url, options)
		const socketOptions = { clientProperties: {} }
		
		if (instance.options.name) {
			socketOptions.clientProperties =  { connection_name: instance.options.name }
		}
		
		instance.connection =  await amqplib.connect(instance.url, socketOptions)
		instance.channel = await instance.connection.createChannel()
		await instance.channel.assertExchange(instance.options.exchanges.services, 'fanout', { durable: false })
		await instance.channel.assertExchange(instance.options.exchanges.events, 'fanout', { durable: false })
		
		return { client: instance, channel: instance.channel, connection: instance.connection }
	}
}

export default AmqpClient