import * as errors from '@feathersjs/errors'
import { feathers } from '@feathersjs/feathers'
import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import memory from 'feathers-memory'
import mockAmqplib from 'mock-amqplib'
import { AmqpClient } from '../lib/clients'
import { ServicesPublishedEvent, HelloEvent } from '../lib/events'
import { HttpRequester } from '../lib/requesters/http'
import { RemoteService } from '../lib/service'
import microservices from '../lib'
import { DEFAULT_EXCHANGE_EVENTS, DEFAULT_EXCHANGE_SERVICES, MicroServiceType } from '../lib/constants'
import { MicroService } from '../lib/microservice'
import { amqpUrl } from './configs'

jest.mock('amqplib')
jest.mock('amqplib', () => ({
	connect: () => mockAmqplib.connect()
}))

describe('Feathers plugin', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})
	
	test('it requires app to init', async () => {
		const app = feathers()
		const m = await (microservices({ url: amqpUrl }))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
	})
	test('default values are created for config', async () => {
		const app = feathers()
		const m = await (microservices({ url: amqpUrl }))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.queue).toBeDefined()
		expect(m.key).toBeDefined()
		expect(m.id).toBeDefined()
		
		expect(m.options.name).toBeDefined()
		expect(m.options.name).toBe(m.id)
		expect(m.options.host).toBeDefined()
		expect(m.options.host).toBe(m.id)
		
		// Deprecate this
		expect(m.options.service).toBeDefined()
		expect(m.options.service).toBe(m.id)
		
		expect(m.options.publish).toBeDefined()
		expect(m.options.publish).toBe(false)
		
		expect(m.options.register).toBeDefined()
		expect(m.options.register).toBe(false)
		
		expect(m.options.namespace).toBeDefined()
		expect(m.options.namespace).toBe('')
		expect(m.options.url).toBeDefined()
		expect(m.options.url).toBe(amqpUrl)
		expect(m.options.type).toBeDefined()
		expect(m.options.type).toBe(MicroServiceType.RPC)
		expect(m.options.exchanges).toBeDefined()
		expect(m.options.exchanges).toStrictEqual({
			services: DEFAULT_EXCHANGE_SERVICES,
			events: DEFAULT_EXCHANGE_EVENTS
		})
	})
	test('host config is required if type is http', async () => {
		let throwThis = async () => {
			const app = feathers()
			const m = await microservices({
				url: amqpUrl,
				type: MicroServiceType.HTTP
			})(app)
		};
	
		await expect(throwThis()).rejects.toThrow(errors.NotAcceptable)
	})
	test('specific config can be defined', async () => {
		const app = feathers()
		const m = await (microservices({
			queue: 'test-queue',
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			register: true,
			exchanges: {
				services: 'custom-exchange-for-services',
				events: 'custom-exchange-for-events'
			}
		}))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.queue).toBeDefined()
		expect(m.queue).toBe('test-queue')
		expect(m.key).toBeDefined()
		expect(m.key).toBe('unique-key')
		expect(m.id).toBeDefined()
		expect(m.id).toBe('unique-id')
		expect(m.options.namespace).toBeDefined()
		expect(m.options.namespace).toBe('custom-namespace')
		
		expect(m.options.publish).toBeDefined()
		expect(m.options.publish).toBe(true)
		
		expect(m.options.register).toBeDefined()
		expect(m.options.register).toBe(true)
		
		expect(m.options.url).toBeDefined()
		expect(m.options.url).toBe(amqpUrl)
		expect(m.options.type).toBeDefined()
		expect(m.options.type).toBe(MicroServiceType.HTTP)
		expect(m.options.exchanges).toBeDefined()
		expect(m.options.exchanges).toStrictEqual({
			services: 'custom-exchange-for-services',
			events: 'custom-exchange-for-events'
		})
	})
	test('creates helper functions for microservices correctly', async () => {
		const requester = new HttpRequester({})
		const app = feathers()
		const m = await (microservices({
			queue: 'test-queue',
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			register: true,
			exchanges: {
				services: 'custom-exchange-for-services',
				events: 'custom-exchange-for-events'
			}
		}))(app)
		app.use('test-service', memory({}))
		app.use('remote-service', new RemoteService('path', requester))
		
		const service = app.service('test-service')
		const fail = () => app.service('remote-service')
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.app.microservices).toBeDefined()
		expect(m.app.microservice).toBeDefined()
		expect(service).toBeDefined()
		expect(fail).toThrow(Error)
	})
	
	test('subscribes correctly to new apps', async () => {
		const client = new AmqpClient('some-url')
		const channel = await client.connect()
		
		const app = feathers()
		const m = await (microservices({
			queue: 'test-queue',
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			register: true,
			exchanges: {
				services: 'custom-exchange-for-services',
				events: 'custom-exchange-for-events'
			}
		}))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.consumers.app).toBeDefined()
		expect(m.registrars.app).toBeDefined()

		const event = HelloEvent.create('id', 'key', 'host', 'RPC')
		channel.publish('custom-exchange-for-services', '', Buffer.from(JSON.stringify(event.toJson())))
		
		await new Promise((r) => setTimeout(r, 4000))
		expect(app.microservices[event.uuid]).toBeDefined()
	})
	
	test('subscribes correctly to new services', async () => {
		const client = new AmqpClient('some-url')
		const channel = await client.connect()
		const requester = new HttpRequester({})
		const serviceConfig = {
			name: 'service-1',
			key: 'service-1',
			service: 'remote-app',
			host: 'host',
			path: 'remote-service',
			methods: ['find', 'get', 'create', 'patch', 'remove'],
			events: ['created', 'updated', 'patched', 'removed']
		}
		
		const app = feathers()
		const m = await (microservices({
			queue: 'test-queue',
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			register: true,
			exchanges: {
				services: 'custom-exchange-for-services',
				events: 'custom-exchange-for-events'
			}
		}))(app)
		app.use('test-service', memory({}))
		app.microservices['service-1'] = serviceConfig
		// Just to test that it removes it properly
		app.use('remote-app::remote-service', new RemoteService('path', requester))
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.consumers.app).toBeDefined()

		const event = ServicesPublishedEvent.create('id', 'key', 'host', [serviceConfig])
		channel.publish('custom-exchange-for-services', '', Buffer.from(JSON.stringify(event.toJson())))
		
		await new Promise((r) => setTimeout(r, 2000))
		expect(app.services['remote-app::remote-service']).toBeDefined()
	})
	test('subscribes correctly to new apps', async () => {
		const client = new AmqpClient('some-url')
		const channel = await client.connect()
		
		const app = feathers()
		const m = await (microservices({
			queue: 'test-queue',
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			register: true,
			exchanges: {
				services: 'custom-exchange-for-services',
				events: 'custom-exchange-for-events'
			}
		}))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.consumers.app).toBeDefined()
		expect(m.registrars.app).toBeDefined()

		const event = HelloEvent.create('id', 'key', 'host', 'RPC')
		channel.publish('custom-exchange-for-services', '', Buffer.from(JSON.stringify(event.toJson())))
		
		await new Promise((r) => setTimeout(r, 4000))
		expect(app.microservices[event.uuid]).toBeDefined()
	})
	test('publishes correctly new services', async () => {
		const client = new AmqpClient('some-url')
		const channel = await client.connect()
		const app = feathers()
		app.use('test-service', memory({}))
		const m = await (microservices({
			queue: 'test-queue',
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			exchanges: {
				services: 'custom-exchange-for-services',
				events: 'custom-exchange-for-events'
			}
		}))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.consumers.app).toBeDefined()
		
		await new Promise((r) => setTimeout(r, 2000))
		expect(app.services['test-service']).toBeDefined()
		// we bind the original service queue for testing purposes
		// channel.bindQueue('unique-id-unique-id', '', '')
		
		const event = {
			data: {
				path: 'test-service',
				type: 'find',
				params: {}
			}
		}
		
		channel.sendToQueue('unique-id-unique-id', Buffer.from(JSON.stringify(event)))
	})
	
	test('publishes correctly new events', async () => {
		// TODO: This test must me pullished!
		const client = new AmqpClient('some-url')
		const channel = await client.connect()
		const app = feathers()
		app.use('test-service', memory({}))
		const m = await (microservices({
			queue: 'test-queue',
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			exchanges: {
				services: 'custom-exchange-for-services',
				events: 'custom-exchange-for-events'
			}
		}))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.consumers.app).toBeDefined()
		
		await new Promise((r) => setTimeout(r, 2000))
		app.service('test-service').create({ foo: 'bar' })
	})
})