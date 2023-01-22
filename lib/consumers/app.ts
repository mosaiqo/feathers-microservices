import { Channel } from 'amqplib'
import { HelloEvent, RPCRequestEvent, RPCResponseEvent, ServicesPublishedEvent, WelcomeEvent } from '../events'
import { InterfaceConsumer } from '../types'

export class AppConsumer implements InterfaceConsumer {
	private channel: Channel
	private exchange: string
	private queue: string
	private namespace: string
	private key: string
	private service: string
	private id: string
	private callbacks
	private events
	private topics = []
	
	constructor(channel: Channel, exchange, queue, key, namespace, service, id) {
		this.channel = channel
		this.exchange = exchange
		this.queue = queue
		this.key = key
		this.namespace = namespace
		this.service = service
		this.id = id
		this.callbacks = {}
		this.events = {
			HelloEvent: HelloEvent,
			WelcomeEvent: WelcomeEvent,
			RPCResponseEvent: RPCResponseEvent,
			RPCRequestEvent: RPCRequestEvent,
			ServicesPublishedEvent: ServicesPublishedEvent
		}
		this.generateTopics()
	}
	
	static async create(channel: Channel, exchange, queue, key, namespace, service, id): Promise<InterfaceConsumer> {
		const instance = new AppConsumer(channel, exchange, queue, key, namespace, service, id)
		await instance.init()
		return instance
	}
	
	generateTopics() {
		const namespace = this.namespace ? `${this.namespace}` : ''
		const service = this.namespace ? `${namespace}.${this.service}`: `${this.service}`
		const id = `${service}.${this.id}`
		
		this.topics.push(namespace)
		this.topics.push(service)
		this.topics.push(id)
	}
	async init () {
		// We ensure that the exchange exists
		await this.channel.assertExchange(
			this.exchange,
			'topic',
			{ durable: false }
		)
		
		// We ensure that the unique key for this app exists
		await this.channel.assertQueue(
			this.queue,
			{ durable: false, exclusive: true }
		)
		
		// console.log(`Binding queue ${this.queue} to exchange ${this.exchange} in ${this.key}`)
		// Finally we bind the queue to the exchange in order to get messages
		
		for (const topic of this.topics) {
			await this.channel.bindQueue(this.queue, this.exchange, topic)
		}
		
		// await this.channel.bindQueue(this.queue, this.exchange, `${this.namespace}.${this.service}`)
		// await this.channel.bindQueue(this.queue, this.exchange, `${this.namespace}.${this.service}.${this.id}`)
		//
		await this.channel.consume(this.queue, async (data) => {
			const eventData = JSON.parse(`${Buffer.from(data.content)}`)
			const eventProperties = data.properties
			// console.log(`Event received: ${eventData.name}`, eventData, data, this.key)
			// Avoid consuming our own events
			if(eventData.key !== this.key) {
				// console.log(`Received new ${eventData.name} from:`, eventData.key)
				let event = eventData
				if (this.events[eventData?.name]) {
					event = this.events[eventData?.name].reconstruct(eventData)
				}
				
				let callbacks = this.callbacks[eventData?.name] ? this.callbacks[eventData?.name] : this.callbacks.UnknownPublishedEvent
				if (callbacks) {
					for (const callback of callbacks) {
						callback(event, eventProperties)
					}
				}
			}
			
			this.channel.ack(data)
		})
	}
	
	async onHello(cb: (e: HelloEvent) => {}) {
		if (!this.callbacks.HelloEvent) this.callbacks.HelloEvent = []
		this.callbacks.HelloEvent.push(cb)
	}
	
	async onWelcome(cb: (e: WelcomeEvent) => {}) {
		if (!this.callbacks.WelcomeEvent) this.callbacks.WelcomeEvent = []
		this.callbacks.WelcomeEvent.push(cb)
	}
	
	async onServicesPublished(cb: (e: ServicesPublishedEvent) => {}) {
		if (!this.callbacks.ServicesPublishedEvent) this.callbacks.ServicesPublishedEvent = []
		this.callbacks.ServicesPublishedEvent.push(cb)
	}
	
	async onRpcRequest(cb: (e: RPCRequestEvent, p) => {}) {
		if (!this.callbacks.RPCRequestEvent) this.callbacks.RPCRequestEvent = []
		this.callbacks.RPCRequestEvent.push(cb)
	}
	
	async onRpcResponse(cb: (e: RPCResponseEvent, p) => {}) {
		if (!this.callbacks.RPCResponseEvent) this.callbacks.RPCResponseEvent = []
		this.callbacks.RPCResponseEvent.push(cb)
	}
	
	async onUnknownPublished(cb: (e) => {}) {
		if (!this.callbacks.UnknownPublishedEvent) this.callbacks.UnknownPublishedEvent = []
		this.callbacks.UnknownPublishedEvent.push(cb)
	}
}

export default AppConsumer