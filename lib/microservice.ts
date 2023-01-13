import { stripSlashes } from '@feathersjs/commons'
import * as errors from '@feathersjs/errors'
import type { Entries } from 'type-fest'
import { v4 } from 'uuid'

import { ConsumerMap, InterfaceMicroServicesOptions, PublisherMap, RegistrarMap, Service } from './types'
import { MicroServicesOptionsDefaults, MicroServiceType } from './constants'
import { AppsRegistrar } from './regristrars'
import { HelloEvent, ServicesPublishedEvent, WelcomeEvent } from './events'
import { AppsPublisher } from './publishers'
import { RpcReplier } from './repliers'
import { Requester } from './requesters'
import { RemoteService } from './service'
import { AmqpClient } from './clients'
import { AppsConsumer } from './consumers'

export class MicroService {
	app
	options: InterfaceMicroServicesOptions
	consumer
	channel
	client
	key: string
	name: string
	queue: string
	id: string
	consumers: ConsumerMap = {}
	publishers: PublisherMap = {}
	registrars: RegistrarMap = {}
	debug: boolean | string = false
	greeted: boolean = false
	/**
	 * This will create the communications channels for the microservices
	 * @param app
	 * @param options
	 */
	constructor (app, options?: InterfaceMicroServicesOptions) {
		this.id = options?.id || v4()
		this.key = options?.key || options?.host || v4()
		this.name = `${ this.key }-${ this.id }`
		this.queue = this.createUniqueQueue(this.id, this.key, options)
		this.debug = options?.debug
		
		if (options?.type === MicroServiceType.HTTP && !options?.host) {
			throw new errors.NotAcceptable('options.host is required then options.type is http')
		}
		
		// Set defaults in case not all options are provided
		this.options = {
			...MicroServicesOptionsDefaults,
			name: this.id,
			service: this.id,
			host: this.id,
			...options
		}
		
		this.createHelperFunctions(app)
	}
	
	async createHelperFunctions (app) {
		// Save app for later use
		this.app = app
		
		// Create a specific microservices list
		this.app.microservices = {}
		
		// Reuse the service method in order to have a specific microservices method
		this.app.microservice = app.service
		
		// Override the service method to avoid calling remote services from here
		this.app.service = function (path) {
			const location = stripSlashes(path) || '/'
			const current = this.services[location]
			if (current?.remote) {
				throw new Error('Current service is remote `app.service(path)` is not supported. Use `app.microservice(path)` instead.')
			}
			return this.microservice(path)
		}.bind(this.app)
	}
	
	/**
	 * Connects to the queue and inits the microservices
	 */
	async init () {
		await this.createClient()
		await this.createConsumers()
		await this.createPublishers()
		await this.createRegistrars()
		await this.subscribeToNewApps()
		await this.subscribeToNewService()
		
		await this.publish()
	}
	
	async createClient () {
		const { channel, connection } = await AmqpClient.connect(this.options.url, {
			exchanges: this.options.exchanges,
			name: this.name
		})
		
		this.client = channel
		this.channel = channel
	}
	
	async createConsumers () {
		this.consumers.app = new AppsConsumer(this.client, this.options.exchanges.services, this.queue, this.key)
		
		for (const consumer of Object.values(this.consumers)) {
			await consumer.init()
		}
	}
	
	async createPublishers () {
		this.publishers.app = new AppsPublisher(this.client, this.options.exchanges.services, this.key)
		
		for (const publisher of Object.values(this.publishers)) {
			await publisher.init()
		}
	}
	
	async createRegistrars () {
		this.registrars.app = new AppsRegistrar(this.app)
		
		for (const registrar of Object.values(this.registrars)) {
			await registrar.init()
		}
	}
	
	async subscribeToNewApps () {
		await this.consumers.app.onHello(async (event: HelloEvent) => {
			this.registrars.app.register(event)
			if (this.greeted) {
				await this.publishForNewcomers()
			}
		})
		
		await this.consumers.app.onWelcome(async (event: WelcomeEvent) => {
			this.registrars.app.register(event)
			await this.registerServices(event?.data?.services)
		})
	}
	
	async subscribeToNewService () {
		if (!this.options.register) { return }
		await this.consumers.app.onServicesPublished(async (event) => {
			await this.registerServices(event?.data?.services)
		})
	}
	
	async registerServices (services) {
		for (const serviceConfig of services) {
			const registerPath = `${ serviceConfig.service }::${ serviceConfig.path }`
			const service = this.app.services[registerPath]
			if (service && service.remote) {
				// this.app.unuse(eventData.path)
				delete this.app[registerPath]
			}
			
			const microserviceConfig = this.app.microservices[serviceConfig.key]
			// In case the config is not there we return early
			// if (!microserviceConfig) return
			
			const requester = await Requester.create({
				...microserviceConfig,
				...serviceConfig
			}, this.channel, microserviceConfig.type)
			
			// Register our service on the Feathers application
			this.app.use(
				registerPath,
				new RemoteService(serviceConfig.path, requester)
				// {
				//   // A list of all methods this service exposes externally
				//   methods: eventData.methods,
				//   // You can add additional custom events to be sent to clients here
				//   events: eventData.events
				// }
			)
		}
	}
	
	/**
	 * Publishes all the local services
	 */
	async publishServices () {
		if (!this.options.publish) { return }
		
		const services = await this.getLocalServicesConfig()
		await this.announceServices(services)
		await this.registerEventListenersForServices(services)
		
		// const queue = 'host-remote-service' //`${this.options.service}-${this.options.id}`
		
		// await this.channel.assertQueue(queue)
		
		const replier = new RpcReplier(this.app, {
			host: this.options.host
		}, this.channel)
		await replier.init()
	}
	
	/**
	 * Creates the proper event listeners for the services
	 * @param services
	 */
	async registerEventListenersForServices (services) {
		for (const serviceConfig of services) {
			const service = this.app.service(serviceConfig.path)
			// Register event listeners for service
			for (const event of serviceConfig.events) {
				service.on(event, async (data) => {
					const eventData = { path: serviceConfig.path, service: this.options.service, event: event, result: data }
					await this.channel.publish(this.options.exchanges.events, '', Buffer.from(JSON.stringify(eventData)))
				})
			}
		}
	}
	
	/**
	 * Gets over all the local services and creates a specific config for each service
	 */
	async getLocalServicesConfig () {
		const services = []
		for (const [name, service] of Object.entries(this.app.services) as Entries<Service>) {
			if (!service.remote) {
				const serviceConfig = {
					name,
					key: this.key,
					service: this.options.service,
					host: this.options.host,
					path: `${ name }`,
					methods: ['find', 'get', 'create', 'patch', 'remove'],
					events: ['created', 'updated', 'patched', 'removed']
				}
				services.push(serviceConfig)
			}
		}
		
		return services
	}
	
	/**
	 * This publishes an event with all the registered services in the app
	 * @param services array An array of services configuration.
	 */
	async announceServices (services) {
		const event = ServicesPublishedEvent.create(this.id, this.key, this.options.host, services)
		await this.publishers.app.emitServices(event)
	}
	
	async publish () {
		await this.publishApp()
		await this.publishServices()
	}
	
	/**
	 * Creates the needed exchange and queue for communication
	 */
	async publishApp () {
		const event = HelloEvent.create(
			this.id,
			this.key,
			this.options.host,
			this.options.type,
			this.options.register,
			this.options.publish
		)
		await this.publishers.app.emitGreet(event)
		
		this.greeted = true
	}
	
	
	async publishForNewcomers () {
		const services = await this.getLocalServicesConfig()
		const event = WelcomeEvent.create(
			this.id,
			this.key,
			this.options.host,
			this.options.type,
			this.options.register,
			this.options.publish,
			services
		)
		await this.publishers.app.emitWelcome(event)
	}
	
	private createUniqueQueue (id: string, key: string, options: InterfaceMicroServicesOptions) {
		let queue = options?.queue || `${ this.key }-service`
		const uuid = v4()
		
		return `${ queue }-${ uuid }`
	}
}

export default MicroService