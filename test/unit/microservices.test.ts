import * as errors from '@feathersjs/errors'
import { feathers } from '@feathersjs/feathers'
import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import memory from 'feathers-memory'
import { AmqpLibMock, getAll, clear } from '../_mocks/AmqpLibMock'
import { AmqpClient } from '../../lib/clients'
import { ServicesPublishedEvent, HelloEvent, WelcomeEvent } from '../../lib/events'
import { HttpRequester } from '../../lib/requesters/http'
import { RemoteService } from '../../lib/service'
import microservices from '../../lib'
import {
	DEFAULT_EXCHANGE_EVENTS,
	DEFAULT_EXCHANGE_NAME,
	DEFAULT_EXCHANGE_SERVICES,
	MicroServiceType
} from '../../lib/constants'
import { MicroService } from '../../lib/microservice'
import { amqpUrl, fakeConnection } from '../configs'

jest.mock('amqplib', () => ({
	connect: () => AmqpLibMock.connect()
}))

describe('Feathers plugin', () => {
	let channel, mock
	beforeAll(async () => {
		const client = await AmqpClient.connect(amqpUrl)
		channel = client.channel
		mock = new MockAdapter(axios)
	})
	beforeEach(async () => {
		mock.reset()
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
		expect(m.service).toBeDefined()
		expect(m.namespace).toBeDefined()
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
		expect(m.options.namespace).toBe(null)
		expect(m.options.url).toBeDefined()
		expect(m.options.url).toBe(amqpUrl)
		expect(m.options.type).toBeDefined()
		expect(m.options.type).toBe(MicroServiceType.RPC)
		expect(m.options.exchange).toBeDefined()
		expect(m.options.exchange).toBe(DEFAULT_EXCHANGE_NAME)
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
		await clear()
		const app = feathers()
		const m = await (microservices({
			key: 'unique-key',
			service: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.RPC,
			publish: true,
			register: true,
			exchange: 'custom-exchange-for-services'
		}))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
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
		expect(m.options.type).toBe(MicroServiceType.RPC)
		expect(m.options.exchange).toBeDefined()
		expect(m.options.exchange).toBe('custom-exchange-for-services')
		
		expect(m.queue).toBeDefined()
		expect(m.queue).toBe('custom-namespace.unique-key.unique-id')
		expect(m.exchange).toBeDefined()
		expect(m.exchange).toBe('custom-namespace.custom-exchange-for-services')
		
		await new Promise((r) => setTimeout(r, 1000))
		const {exchanges, queues} = getAll()
		const exchangesKeys = Object.keys(exchanges)
		const queuesKeys = Object.keys(queues)
		expect(exchangesKeys.length).toBe(2)
		expect(queuesKeys.length).toBe(1)
		expect(exchangesKeys).toEqual([
			'',
			'custom-namespace.custom-exchange-for-services'
		])
		expect(queuesKeys).toEqual([
			'custom-namespace.unique-key.unique-id'
		])
		
	})
	
	test('creates helper functions for microservices correctly', async () => {
		const requester = new HttpRequester({})
		const app = feathers()
		const m = await (microservices({
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			register: true,
			exchange: 'custom-exchange-for-services'
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
	
	test('default service is available', async () => {
		const app = feathers()
		const m = await (microservices({
			url: amqpUrl
		}))(app)
		
		app.use('/', memory({}))
		const service = app.service('/')
		expect(service).toBeTruthy()
		// @ts-ignore
		expect(service.remote).toBeUndefined()
		const { check } = await fakeConnection()
		await check(async (events) => {
			expect(events.length).toBe(0)
		})
	})
	
	test('subscribes correctly to new apps', async () => {
		const app = feathers()
		const m = await (microservices({
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			register: true,
			exchange: 'custom-exchange-for-services'
		}))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.consumer).toBeDefined()
		expect(m.registrar).toBeDefined()

		const event = HelloEvent.create('id', 'key', 'host', 'RPC', { app: '', service: '' }, true, true)
		channel.publish('custom-namespace.custom-exchange-for-services', 'custom-namespace', Buffer.from(JSON.stringify(event.toJson())))
		
		await new Promise((r) => setTimeout(r, 500))
		expect(app.microservices[event.uuid]).toBeDefined()
	})
	
	test('subscribes correctly to new services', async () => {
		const requester = new HttpRequester({})
		const serviceConfig = {
			name: 'service-1',
			key: 'key',
			service: 'remote-app',
			host: 'host',
			path: 'remote-service',
			methods: ['find', 'get', 'create', 'patch', 'remove'],
			events: ['created', 'updated', 'patched', 'removed']
		}
		const app = feathers()
		const m = await (microservices({
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			register: true,
			exchange: 'custom-exchange-for-services'
		}))(app)
		app.use('test-service', memory({}))
		
		app.microservices['key'] = { key: 'key', host: 'host', type: 'RPC' }
		// Just to test that it removes it properly
		app.use('remote-app::remote-service', new RemoteService('path', requester))
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.consumer).toBeDefined()

		const event = ServicesPublishedEvent.create('id', 'key', 'host', [serviceConfig])
		channel.publish(
			'custom-namespace.custom-exchange-for-services',
			'custom-namespace.unique-key',
			Buffer.from(JSON.stringify(event.toJson())))
		
		await new Promise((r) => setTimeout(r, 2000))
		expect(app.services['remote-app::remote-service']).toBeDefined()
	})
	
	test('by default remote services are not publicly available', async () => {
		mock.onGet('http://host-remote/remote-service')
			.reply(200, {})
		
		const serviceConfig = {
			name: 'service-1',
			key: 'key',
			service: 'remote-app',
			host: 'host-remote',
			path: 'remote-service',
			methods: ['find', 'get', 'create', 'patch', 'remove'],
			events: ['created', 'updated', 'patched', 'removed']
		}
		const app = feathers()
		app.hooks({
			before: {
				all: (h) => console.log(h.service.remote, h.service.isPublic)
			}
		})
		const m = await (microservices({
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			register: true,
			exchange: 'custom-exchange-for-services',
			public: false
		}))(app)
		app.use('test-service', memory({}))
		
		const event = WelcomeEvent.create(
			'id', 'key', 'host', MicroServiceType.HTTP, { app: '', service: '' }, true, true,
			[serviceConfig]
		)
		channel.publish('custom-namespace.custom-exchange-for-services', 'custom-namespace', Buffer.from(JSON.stringify(event.toJson())))
		
		await new Promise((r) => setTimeout(r, 500))
		expect(app.microservices[event.uuid]).toBeDefined()
		
		// app.use('remote-app::remote-service', new RemoteService(serviceConfig.path, requester))
		
		const service = app.service('test-service')
		// app.service('other-service')
		const fail = () => app.service('remote-app::remote-service')
		expect(app.services['remote-app::remote-service']).toBeDefined()
		// expect(app.services['remote-app/remote-service']).toBeUndefined()
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.app.microservices).toBeDefined()
		expect(m.app.microservice).toBeDefined()
		expect(service).toBeDefined()
		expect(fail).toThrow(Error)
	})
	
	test('all remote services can be set to be publicly available', async () => {
		mock.onGet('http://host-remote/remote-service')
			.reply(200, {})
		
		const serviceConfig = {
			name: 'service-1',
			key: 'key',
			service: 'remote-app',
			host: 'host-remote',
			path: 'remote-service',
			methods: ['find', 'get', 'create', 'patch', 'remove'],
			events: ['created', 'updated', 'patched', 'removed']
		}
		const app = feathers()
		
		const m = await (microservices({
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			register: true,
			exchange: 'custom-exchange-for-services',
			public: true // ["*"]
		}))(app)
		app.use('test-service', memory({}))
		
		const event = WelcomeEvent.create(
			'id', 'key', 'host', MicroServiceType.HTTP, { app: '', service: '' }, true, true,
			[serviceConfig]
		)
		channel.publish('custom-namespace.custom-exchange-for-services', 'custom-namespace', Buffer.from(JSON.stringify(event.toJson())))
		
		await new Promise((r) => setTimeout(r, 500))
		expect(app.microservices[event.uuid]).toBeDefined()
		
		// app.use('remote-app::remote-service', new RemoteService(serviceConfig.path, requester))
		
		const service = app.service('test-service')
		// app.service('other-service')
		// const fail = () => app.service('remote-app::remote-service')
		expect(app.services['remote-app/remote-service']).toBeDefined()
		expect(app.services['remote-app::remote-service']).toBeUndefined()
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.app.microservices).toBeDefined()
		expect(m.app.microservice).toBeDefined()
		expect(service).toBeDefined()
		
		await app.service('remote-app::remote-service').find({})
		
	})
	
	test('certain remote services can be set to be publicly available', async () => {
		mock.onGet('http://host-remote-1/remote-service-1')
			.reply(200, {})
		
		mock.onGet('http://host-remote-2/remote-service-1')
			.reply(200, {})
		
		mock.onGet('http://host-remote-2/remote-service-2')
			.reply(200, {})
		
		const serviceConfigs = {
			remoteApp1: [{
				name: 'service-1',
				key: 'key-1',
				service: 'remote-app-1',
				host: 'host-remote-1',
				path: 'remote-service-1',
				methods: ['find', 'get', 'create', 'patch', 'remove'],
				events: ['created', 'updated', 'patched', 'removed']
			}, {
				name: 'service-2',
				key: 'key-1',
				service: 'remote-app-1',
				host: 'host-remote-1',
				path: 'remote-service-2',
				methods: ['find', 'get', 'create', 'patch', 'remove'],
				events: ['created', 'updated', 'patched', 'removed']
			}],
			remoteApp2: [{
				name: 'service-1',
				key: 'key-2',
				service: 'remote-app-2',
				host: 'host-remote-2',
				path: 'remote-service-1',
				methods: ['find', 'get', 'create', 'patch', 'remove'],
				events: ['created', 'updated', 'patched', 'removed']
			}, {
				name: 'service-2',
				key: 'key-2',
				service: 'remote-app-2',
				host: 'host-remote-2',
				path: 'remote-service-2',
				methods: ['find', 'get', 'create', 'patch', 'remove'],
				events: ['created', 'updated', 'patched', 'removed']
			}]
		}
		const app = feathers()
		const m = await (microservices({
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			register: true,
			exchange: 'custom-exchange-for-services',
			public: [{
				service: 'remote-app-1',
				paths: ['remote-service-1']
			},
				{
				service: 'remote-app-2',
				paths: ['*']
			}]
		}))(app)
		app.use('test-service', memory({}))
		
		const events =  [
			WelcomeEvent.create(
			'id', 'key-1', 'host-remote-1', MicroServiceType.HTTP, { app: '', service: '' }, true, true,
			serviceConfigs.remoteApp1
			),
			WelcomeEvent.create(
			'id', 'key-2', 'host-remote-2', MicroServiceType.HTTP, { app: '', service: '' }, true, true,
			serviceConfigs.remoteApp2
			)
		]
		for (const event of events) {
			channel.publish('custom-namespace.custom-exchange-for-services', 'custom-namespace', Buffer.from(JSON.stringify(event.toJson())))
		}
		
		await new Promise((r) => setTimeout(r, 500))
		for (const event of events) {
			expect(app.microservices[event.uuid]).toBeDefined()
		}
		const service = app.service('test-service')
		
		expect(app.services['remote-app-1/remote-service-1']).toBeDefined()
		expect(app.services['remote-app-1::remote-service-1']).toBeUndefined()
		expect(app.services['remote-app-1/remote-service-2']).toBeUndefined()
		expect(app.services['remote-app-1::remote-service-2']).toBeDefined()
		
		expect(app.services['remote-app-2/remote-service-1']).toBeDefined()
		expect(app.services['remote-app-2::remote-service-1']).toBeUndefined()
		expect(app.services['remote-app-2/remote-service-2']).toBeDefined()
		expect(app.services['remote-app-2::remote-service-2']).toBeUndefined()
		
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.app.microservices).toBeDefined()
		expect(m.app.microservice).toBeDefined()
		expect(service).toBeDefined()
		
		await app.service('remote-app-1/remote-service-1').find({})
		
	})
	
	test('publishes correctly new services', async () => {
		const app = feathers()
		app.use('test-service', memory({}))
		const m = await (microservices({
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			exchange: 'custom-exchange-for-services'
		}))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.consumer).toBeDefined()
		
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
		const app = feathers()
		app.use('test-service', memory({}))
		const m = await (microservices({
			key: 'unique-key',
			id: 'unique-id',
			host: 'custom-host',
			namespace: 'custom-namespace',
			url: amqpUrl,
			type: MicroServiceType.HTTP,
			publish: true,
			exchange: 'custom-exchange-for-services'
		}))(app)
		
		expect(m instanceof MicroService).toBeTruthy()
		expect(m.consumer).toBeDefined()
		
		await new Promise((r) => setTimeout(r, 2000))
		app.service('test-service').create({ foo: 'bar' })
	})
})