import amqplib, { Channel } from 'amqplib'
import { DEFAULT_EXCHANGE_EVENTS, DEFAULT_EXCHANGE_SERVICES } from '../constants'
export class AmqpClient {
	url
	connection
	
	channel
	
	options
	
	constructor (url, options = {}) {
		this.url = url
		this.options = {
			exchanges: {
				services: DEFAULT_EXCHANGE_SERVICES,
				events: DEFAULT_EXCHANGE_EVENTS,
			},
			...options
		}
	}
	
	public async connect (): Promise<Channel> {
		this.connection =  await amqplib.connect(this.url)
		this.channel = await this.connection.createChannel()
		await this.channel.assertExchange(this.options.exchanges.services, 'fanout', { durable: false })
		await this.channel.assertExchange(this.options.exchanges.events, 'fanout', { durable: false })
		
		return this.channel
	}
}

export default AmqpClient