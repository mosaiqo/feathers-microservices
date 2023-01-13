import { Channel } from 'amqplib'
import makeDebug from 'debug'
import { HelloEvent, ServicesPublishedEvent, WelcomeEvent } from '../events'
import { InterfacePublisher } from '../types.d'

const debug = makeDebug('mosaiqo-feathers-microservices')

export class AppsPublisher implements InterfacePublisher {
	private channel: Channel
	private exchange: string
	private key: string
	
	constructor(channel: Channel, exchange, key) {
		this.channel = channel
		this.exchange = exchange
		this.key = key
	}
	
	async init () {
		// We ensure that the exchange exists
		await this.channel.assertExchange(
			this.exchange,
			'fanout',
			{ durable: false }
		)
	}
	
	async emitGreet(event: HelloEvent) {
		await this.channel.publish(
			this.exchange,
			'',
			Buffer.from(JSON.stringify(event.toJson()))
		)
	}
	
	async emitWelcome(event: WelcomeEvent) {
		await this.channel.publish(
			this.exchange,
			'',
			Buffer.from(JSON.stringify(event.toJson()))
		)
	}
	
	async emitServices(event: ServicesPublishedEvent) {
		await this.channel.publish(
			this.exchange,
			'',
			Buffer.from(JSON.stringify(event.toJson()))
		)
	}
}

export default AppsPublisher