import { stripSlashes } from '@feathersjs/commons'
import * as errors from '@feathersjs/errors'
import type { Entries } from 'type-fest'
import { v4 } from 'uuid'

import {
	ConsumerMap,
	InterfaceConsumer,
	InterfaceMicroServicesOptions, InterfacePublisher, InterfaceRegistrar,
	PublisherMap,
	RegistrarMap,
	Service
} from './types'
import { MicroServicesOptionsDefaults, MicroServiceType } from './constants'
import { AppsRegistrar } from './regristrars'
import { HelloEvent, ServicesPublishedEvent, WelcomeEvent } from './events'
import { AppsPublisher } from './publishers'
import { RpcReplier } from './repliers'
import { Requester } from './requesters'
import { RemoteService } from './service'
import { AmqpClient } from './clients'
import { AppConsumer } from './consumers'

export class MicroService {
	app
	options: InterfaceMicroServicesOptions
	exchange: string
	queue: string
	channel
	client
	key: string
	service: string
	host: string
	namespace: string
	name: string
	id: string
	publisher: InterfacePublisher
	registrar: InterfaceRegistrar
	consumer: InterfaceConsumer
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
		this.service = options.service || this.key
		this.host = options.host || this.key
		this.namespace = options.namespace || ''
		this.name = `${ this.host }-${ this.id }`
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
		
		this.generateQueue()
		this.generateExchange()
		this.createHelperFunctions(app)
	}
	
	generateExchange() {
		const namespace = this.namespace ? `${this.namespace}.` : ''
		const name = this.options.exchange
		
		this.exchange = `${namespace}${name}`
	}
	
	generateQueue() {
		const namespace = this.namespace ? `${this.namespace}.` : ''
		const service = this.service
		const suffix = `.${this.id}`
		
		this.queue = `${namespace}${service}${suffix}`
		
	}
	
	createHelperFunctions (app) {
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
			exchange: this.exchange,
			name: this.name
		})
		
		this.client = channel
		this.channel = channel
	}
	
	async createConsumers () {
		this.consumer = await AppConsumer.create(
			this.client,
			this.exchange,
			this.queue,
			this.key,
			this.namespace,
			this.service,
			this.id
		)
	}
	
	async createPublishers () {
		this.publisher = await AppsPublisher.create(this.client, this.exchange, this.key, this.namespace)
	}
	
	async createRegistrars () {
		this.registrar = await AppsRegistrar.create(this.app)
	}
	
	async subscribeToNewApps () {
		await this.consumer.onHello(async (event: HelloEvent) => {
			this.registrar.register(event)
			// if (this.greeted) {
				await this.publishForNewcomers()
			// }
		})
		
		await this.consumer.onWelcome(async (event: WelcomeEvent) => {
			this.registrar.register(event)
			await this.registerServices(event?.data?.services)
		})
	}
	
	async subscribeToNewService () {
		if (!this.options.register) { return }
		await this.consumer.onServicesPublished(async (event) => {
			await this.registerServices(event?.data?.services)
		})
	}
	
	async registerServices (services) {
		for (const serviceConfig of services) {
			const registerPath = `${ serviceConfig.service }::${ serviceConfig.path }`
			const service = this.app.services[registerPath]
			if (service && service.remote) {
				if (this.app.unuse && typeof this.app.unuse === 'function') {
					this.app.unuse(registerPath)
				}
				delete this.app[registerPath]
			}
			
			const microserviceConfig = this.app.microservices[serviceConfig.key]
			// In case the config is not there we return early
			// if (!microserviceConfig) return
			const options = {
				config: {
					...microserviceConfig,
					...serviceConfig,
				},
				key: this.key,
				type: microserviceConfig.type,
				replyTo: this.queue,
				namespace: this.namespace,
				service: this.service
			}
			const requester = await Requester.create(options, this.consumer, this.publisher )
			const registerExternalPath = `/${ serviceConfig.service }/${ serviceConfig.path }`
			
			// Register our service on the Feathers application
			this.app.use(registerExternalPath, new RemoteService(serviceConfig.path, requester))
			
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
		const replier = await RpcReplier.create(this.app, this.key, this.consumer, this.publisher)
		
		const services = await this.getLocalServicesConfig()
		await this.announceServices(services)
		await this.registerEventListenersForServices(services)
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
					// Todo: move this into publisher and create a specific event
					const eventData = { path: serviceConfig.path, service: this.options.service, event: event, result: data }
					await this.channel.publish(this.exchange, '', Buffer.from(JSON.stringify(eventData)))
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
					service: this.service,
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
		await this.publisher.emitServices(event)
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
			this.queue,
			this.options.register,
			this.options.publish
		)
		await this.publisher.emitGreet(event)
		this.greeted = true
	}
	
	
	async publishForNewcomers () {
		const services = await this.getLocalServicesConfig()
		const event = WelcomeEvent.create(
			this.id,
			this.key,
			this.options.host,
			this.options.type,
			this.queue,
			this.options.register,
			this.options.publish,
			services
		)
		await this.publisher.emitWelcome(event)
	}
}

export default MicroService