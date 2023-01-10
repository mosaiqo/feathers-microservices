import { Channel } from 'amqplib'
import { HelloEvent, ServicesPublishedEvent } from '../events'
import { InterfaceConsumer } from '../types.d'

export class AppsConsumer implements InterfaceConsumer {
	private channel: Channel
	private exchange: string
	private queue: string
	private key: string
	private callbacks
	private events
	
	constructor(channel: Channel, exchange, queue, key) {
		this.channel = channel
		this.exchange = exchange
		this.queue = queue
		this.key = key
		
		this.callbacks = {}
		
		this.events = {
			HelloEvent: HelloEvent,
			ServicesPublishedEvent: ServicesPublishedEvent
		}
	}
	
	async init () {
		// We ensure that the exchange exists
		await this.channel.assertExchange(
			this.exchange,
			'fanout',
			{ durable: false }
		)
		
		// We ensure that the unique key for this app exists
		await this.channel.assertQueue(
			this.queue,
			{ exclusive: true }
		)
		
		// console.log(`Binding queue ${this.queue} to exchange ${this.exchange}`)
		// Finally we bind the queue to the exchange in order to get messages
		await this.channel.bindQueue(
			this.queue,
			this.exchange,
			''
		)
		
		await this.channel.consume(this.queue, async (data) => {
			const eventData = JSON.parse(`${Buffer.from(data.content)}`)
			// Avoid responding to our self
			if(eventData.key === this.key) return
			
			if (this.callbacks[eventData?.name]) {
				let event
				if (this.events[eventData?.name]) {
					const event = this.events[eventData?.name].reconstruct(eventData)
					this.callbacks[eventData?.name](event)
				}
			}
			
			this.channel.ack(data)
		})
	}
	
	async onHello(cb: (e: HelloEvent) => {}) {
		this.callbacks.HelloEvent = cb
	}
	
	async onServicesPublished(cb: (e: ServicesPublishedEvent) => {}) {
		this.callbacks.ServicesPublishedEvent = cb
	}
}

export default AppsConsumer