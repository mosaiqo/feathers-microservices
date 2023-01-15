import { Channel } from 'amqplib'
import makeDebug from 'debug'
import { HelloEvent, ServicesPublishedEvent, WelcomeEvent } from '../events'
import { InterfacePublisher } from '../types.d'

const debug = makeDebug('mosaiqo-feathers-microservices')

export class AppsPublisher implements InterfacePublisher {
	private channel: Channel
	private exchange: string
	private key: string
	private namespace: string
	
	private constructor(channel: Channel, exchange, key, namespace) {
		this.channel = channel
		this.namespace = namespace
		this.exchange = exchange
		this.key = key
	}
	
	static async create (channel: Channel, exchange, key, namespace) {
		const instance = new AppsPublisher(channel, exchange, key, namespace)
		
		await instance.init()
		
		return instance
	}
	
	async init () {
		// // We ensure that the exchange exists
		await this.channel.assertExchange(
			this.exchange,
			'topic',
			{ durable: false }
		)
	}
	
	async emitGreet(event: HelloEvent) {
		await this.channel.publish(
			this.exchange,
			this.namespace,
			Buffer.from(JSON.stringify(event.toJson()))
		)
	}
	
	async emitWelcome(event: WelcomeEvent) {
		await this.channel.publish(
			this.exchange,
			this.namespace,
			Buffer.from(JSON.stringify(event.toJson()))
		)
	}
	
	async emitServices(event: ServicesPublishedEvent) {
		await this.channel.publish(
			this.exchange,
			this.namespace,
			Buffer.from(JSON.stringify(event.toJson()))
		)
	}
	
	async requestRpc(event, properties) {
		this.channel.publish(
			this.exchange,
			properties.topic,
			Buffer.from(JSON.stringify(event.toJson())),
			properties
		)
	}
	
	async respondRpc(event, properties) {
		this.channel.sendToQueue(
			properties.replyTo,
			Buffer.from(JSON.stringify(event.toJson())),
			properties
		)
	}
}

export default AppsPublisher