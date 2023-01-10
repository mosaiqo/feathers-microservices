import * as errors from '@feathersjs/errors'
import { feathers } from '@feathersjs/feathers'
import { channel } from 'diagnostics_channel'
import { AmqpClient } from '../lib/clients'
import { MicroServiceType } from '../lib/constants'
import { describe, expect, jest, test } from '@jest/globals'
import * as assert from 'assert'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import memory from 'feathers-memory'
import * as amqplib from 'amqplib'
import mockAmqplib from 'mock-amqplib'
import microservices from '../lib'
import {v4} from 'uuid'
import { amqpUrl, fakeConnection, fakeRpcResponder } from './configs'

jest.setTimeout(6000)

jest.mock('amqplib')
jest.mock('amqplib', () => ({
	connect: () => mockAmqplib.connect()
}))

describe('Integration test', () => {
	describe('Initialization', () => {
		test('is CommonJS compatible', () => {
			assert.strictEqual(typeof require('../lib'), 'function')
		})
		test('without options', async () => {
			const id = v4()
			// given
			const app = feathers().configure(microservices({
				id,
				url: amqpUrl
			}))
			// then
			expect(app).toBeTruthy()
			// @ts-ignore
			expect(app.microservice).toBeTruthy()
			// @ts-ignore
			expect(app.microservices).toBeTruthy()
			// Test proper events
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events[0].name).toBe('HelloEvent')
				expect(events.length).toBe(1)
			})
		})
		
		test('with options', async () => {
			// given
			const app = feathers()
				.configure(microservices({
					url: amqpUrl,
					key: 'unique-app-name',
					host: 'my-host'
				}))

			// then
			expect(app).toBeTruthy()

			// @ts-ignore
			expect(app.microservice).toBeTruthy()
			// @ts-ignore
			expect(app.microservices).toBeTruthy()

			// Test proper events
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events[0].name).toBe('HelloEvent')
				expect(events[0].key).toBe('unique-app-name')
				expect(events[0].data.host).toBe('my-host')
				expect(events.length).toBe(1)
			})
		})
	})
	
	describe('Applications are registered properly', () => {
		test('it publishes events in correct order', async () => {
			// Create fake connection to see events
			const app = feathers()
				.configure(microservices({
					url: amqpUrl,
					publish: true,
					key: 'app-local',
					host: 'host-local',
					service: 'service-two'
				}))

			app.use('/local-service', memory({}))
			const localService = app.service('local-service')
			expect(localService).toBeTruthy()

			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events[0].name).toBe('HelloEvent')
				expect(events[0].key).toBe('app-local')
				expect(events[1].name).toBe('ServicesPublishedEvent')
				expect(events[1].key).toBe('app-local')
			})
		})
		
		test('default registers for rpc', async () => {
			// given
			const remoteApp = feathers()
				.configure(microservices({
					url: amqpUrl,
					publish: true,
					key: 'app-remote',
					host: 'host-remote',
					service: 'service-one',
					debug: 'remote'
				}))
			remoteApp.use('/remote-service', memory({}))
			
			const localApp = feathers()
				.configure(microservices({
					url: amqpUrl,
					register: true,
					key: 'app-local',
					host: 'host-local',
					service: 'service-two',
					debug: 'local'
				}))
			localApp.use('/local-service', memory({}))

			const localService = localApp.service('local-service')

			// then

			// Test proper events
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events.length).toBe(3)
				let currentEvent = events[0]
				expect(currentEvent.name).toBe('HelloEvent')
				expect(currentEvent.key).toBe('app-remote')
				expect(currentEvent.data.host).toBe('host-remote')
				
				currentEvent = events[2]
				expect(currentEvent.name).toBe('ServicesPublishedEvent')
				expect(currentEvent.key).toBe('app-remote')
				expect(currentEvent.data.host).toBe('host-remote')
				expect(Array.isArray(currentEvent.data.services)).toBeTruthy()
				expect(currentEvent.data.services .length).toBe(1)
				
				currentEvent = events[1]
				expect(currentEvent.name).toBe('HelloEvent')
				expect(currentEvent.key).toBe('app-local')
				expect(currentEvent.data.host).toBe('host-local')
				
				const microservice = remoteApp.microservices['app-local']
				expect(microservice).toBeTruthy()
				expect(microservice.key).toBe('app-local')
				expect(microservice.host).toBe('host-local')
				expect(microservice.type).toBe(MicroServiceType.RPC)
				expect(localService).toBeTruthy()
				
			})
		})
		
		test('can register as rpc service', async () => {
			// given
			const remoteApp = feathers()
				.configure(microservices({
					url: amqpUrl,
					publish: true,
					key: 'app-remote',
					host: 'host-remote',
					service: 'service-one',
					type: MicroServiceType.RPC
				}))
			remoteApp.use('/remote-service', memory({}))


			const localApp = feathers()
				.configure(microservices({
					register: true,
					key: 'app-local',
					host: 'host-local',
					service: 'service-two'
				}))
			localApp.use('/local-service', memory({}))

			const localService = localApp.service('local-service')

			// then

			// Test proper events
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events.length).toBe(3)
				let currentEvent = events[0]
				expect(currentEvent.name).toBe('HelloEvent')
				expect(currentEvent.key).toBe('app-remote')
				expect(currentEvent.data.host).toBe('host-remote')

				currentEvent = events[1]
				expect(currentEvent.name).toBe('HelloEvent')
				expect(currentEvent.key).toBe('app-local')
				expect(currentEvent.data.host).toBe('host-local')

				currentEvent = events[2]
				expect(currentEvent.name).toBe('ServicesPublishedEvent')
				expect(currentEvent.key).toBe('app-remote')
				expect(currentEvent.data.host).toBe('host-remote')
				expect(Array.isArray(currentEvent.data.services)).toBeTruthy()
				expect(currentEvent.data.services .length).toBe(1)
				
				const microservice = remoteApp.microservices['app-local']

				expect(microservice).toBeTruthy()
				expect(microservice.key).toBe('app-local')
				expect(microservice.host).toBe('host-local')
				expect(microservice.type).toBe(MicroServiceType.RPC)
				expect(localService).toBeTruthy()
			})
		})
		
		test('can register as http service', async () => {
			// given
			const localApp = feathers()
				.configure(microservices({
					register: true,
					key: 'app-local',
					host: 'host-local',
					service: 'service-two'
				}))
			localApp.use('/local-service', memory({}))
			const localService = localApp.service('local-service')
			
			const remoteApp = feathers()
				.configure(microservices({
					url: amqpUrl,
					publish: true,
					key: 'app-remote',
					host: 'host-remote',
					service: 'service-one',
					type: MicroServiceType.HTTP
				}))
			remoteApp.use('/remote-service', memory({}))
			// then

			// Test proper events
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events.length).toBe(3)
				let currentEvent = events[0]
				expect(currentEvent.name).toBe('HelloEvent')
				expect(currentEvent.key).toBe('app-remote')
				expect(currentEvent.data.host).toBe('host-remote')

				currentEvent = events[1]
				expect(currentEvent.name).toBe('HelloEvent')
				expect(currentEvent.key).toBe('app-local')
				expect(currentEvent.data.host).toBe('host-local')

				currentEvent = events[2]
				expect(currentEvent.name).toBe('ServicesPublishedEvent')
				expect(currentEvent.key).toBe('app-remote')
				expect(currentEvent.data.host).toBe('host-remote')
				expect(Array.isArray(currentEvent.data.services)).toBeTruthy()
				expect(currentEvent.data.services .length).toBe(1)

				// @ts-ignore
				const microservice = localApp.microservices['app-remote']

				expect(microservice).toBeTruthy()
				expect(microservice.key).toBe('app-remote')
				expect(microservice.host).toBe('host-remote')
				expect(microservice.type).toBe(MicroServiceType.HTTP)
				expect(localService).toBeTruthy()
			})
		})
		
		test('can re-register an existing service', async () => {
			// TODO: Review this test
			const microserviceConfig = {
				url: amqpUrl,
				publish: true,
				key: 'app-remote',
				host: 'host-remote',
				service: 'service-one'
			}
			
			const remoteApp = feathers().configure(microservices(microserviceConfig))
			remoteApp.use('/remote-service', memory({}))
			const otherApp = feathers().configure(microservices(microserviceConfig))
			otherApp.use('/remote-service', memory({}))
			
			const localApp = feathers()
				.configure(microservices({
					url: amqpUrl,
					register: true,
					key: 'app-local',
					host: 'host-local',
					service: 'service-two'
				}))
			localApp.use('/local-service', memory({}))
			
			const localService = localApp.service('local-service')
			expect(localService).toBeTruthy()
			
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events.length).toBe(5)
				// @ts-ignore
				const remoteService = localApp.microservice('service-one::remote-service')
				expect(remoteService).toBeTruthy()
			})
		})
	})
	
	describe('Services should be published',  () => {
		test('default service is available', async () => {
			const app = feathers().configure(microservices({
				url: amqpUrl,
				key: 'unique-app-name',
				host: 'my-host'
			}))
			app.use('/', memory({}))
			const service = app.service('/')
			
			expect(service).toBeTruthy()
			// @ts-ignore
			expect(service.remote).toBeUndefined()
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events.length).toBe(1)
			})
		})
		
		test('local services are available', async () => {
			const app = feathers().configure(microservices({
				url: amqpUrl,
				key: 'unique-app-name',
				host: 'my-host'
			}))
			app.use('/local-service', memory({}))
			const service = app.service('local-service')

			expect(service).toBeTruthy()
			// @ts-ignore
			expect(service.remote).toBeUndefined()
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events.length).toBe(1)
			})
		})
		
		test('local services are published', async () => {
			const app = feathers().configure(microservices({
				url: amqpUrl,
				key: 'unique-app-name',
				host: 'my-host',
				publish: true,
			}))
			app.use('/local-service', memory({}))
			const service = app.service('local-service')

			expect(service).toBeTruthy()
			// @ts-ignore
			expect(service.remote).toBeUndefined()

			// Test proper events
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events.length).toBe(2)
				expect(events[0].name).toBe('HelloEvent')
				expect(events[0].key).toBe('unique-app-name')
				expect(events[0].data.host).toBe('my-host')

				expect(events[1].name).toBe('ServicesPublishedEvent')
				expect(events[1].key).toBe('unique-app-name')
				expect(events[1].data.host).toBe('my-host')
				expect(Array.isArray(events[1].data.services)).toBeTruthy()
				expect(events[1].data.services .length).toBe(1)
			})
		})
		
		test('remote service are registered', async () => {
			// given
			const remoteApp = feathers()
				.configure(microservices({
					url: amqpUrl,
					publish: true,
					key: 'app-remote',
					host: 'host-remote',
					service: 'service-one'
				}))
			remoteApp.use('/remote-service', memory({}))
			
			const localApp = feathers()
				.configure(microservices({
					register: true,
					key: 'app-local',
					host: 'host-local',
					service: 'service-two'
				}))
			localApp.use('/local-service', memory({}))

			const localService = localApp.service('local-service')
			// then

			// Test proper events
			const { check } = await fakeConnection()
			await check(async (events) => {
				expect(events.length).toBe(3)
				let currentEvent = events[0]
				expect(currentEvent.name).toBe('HelloEvent')
				expect(currentEvent.key).toBe('app-remote')
				expect(currentEvent.data.host).toBe('host-remote')

				currentEvent = events[1]
				expect(currentEvent.name).toBe('HelloEvent')
				expect(currentEvent.key).toBe('app-local')
				expect(currentEvent.data.host).toBe('host-local')

				currentEvent = events[2]
				expect(currentEvent.name).toBe('ServicesPublishedEvent')
				expect(currentEvent.key).toBe('app-remote')
				expect(currentEvent.data.host).toBe('host-remote')
				expect(Array.isArray(currentEvent.data.services)).toBeTruthy()
				expect(currentEvent.data.services .length).toBe(1)
				// @ts-ignore
				const remoteService = localApp.microservice('service-one::remote-service')

				expect(localService).toBeTruthy()
				expect(remoteService).toBeTruthy()
			})
		})
	})
	describe('Call remote service with http client', () => {
		let app
		let remoteApp, localApp, mock

		beforeAll(async () => {
			mock = new MockAdapter(axios)
			remoteApp = feathers()
				.configure(microservices({
					url: amqpUrl,
					publish: true,
					key: 'app-remote',
					host: 'host-remote',
					service: 'service-one',
					type: MicroServiceType.HTTP,
				}))
			remoteApp.use('/remote-service', memory({}))

			localApp = feathers()
				.configure(microservices({
					url: amqpUrl,
					register: true,
					key: 'app-local',
					host: 'host-local',
					service: 'service-two',
					type: MicroServiceType.HTTP,
				}))

			localApp.use('/local-service', memory({}))
			const localService = localApp.service('local-service')
			expect(localService).toBeTruthy()

			await new Promise((r) => setTimeout(r, 1000))
			// @ts-ignore
			const remoteService = localApp.microservice('service-one::remote-service')
			expect(remoteService).toBeTruthy()
			expect(Object.keys(localApp.microservices).length).toBe(1)
		})

		beforeEach(async () => {
			app = feathers()
				.configure(microservices())
		})
		afterEach(() => {
			mock.reset()
		})

		test('does not allow to use service method for remote services', async () => {
			try {
				const service = localApp.service('service-one::remote-service')
			} catch (e) {
				expect(e).toBeDefined()
				expect(e instanceof Error).toBeTruthy()
			}
		})

		test('allows to use service method for local services', async () => {
			const service = localApp.service('local-service')
			// @ts-ignore
			expect(service.remote).toBeUndefined()
			// @ts-ignore
			expect(service).toBeDefined()
		})

		test('allows to use microservice method for remote services', async () => {
			const { check } = await fakeConnection()
			const service = localApp.microservice('service-one::remote-service')
			// @ts-ignore
			expect(service.remote).toBeDefined()
			// @ts-ignore
			expect(service).toBeDefined()
		})

		test('handles correct event handlers for events', async () => {
			const service = localApp.service('local-service')
			service.create({ 'foo': 'bar' })
		})

		test('can use find method on remote service', async () => {
			// given
			const data = [
				{ _id: '1123312321', name: 'One' },
				{ _id: '2123312321', name: 'Two' }
			]
			mock.onGet('http://host-remote/remote-service')
				.reply(200, data)

			const { check } = await fakeConnection()
			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.find({})

			// then
			expect(response).toBeDefined()
			expect(mock.history.get[0].url).toEqual('http://host-remote/remote-service')
			expect(response).toEqual(data)
		})

		test('find method on remote service fails', async () => {
			let service
			// given
			mock.onGet('http://host-remote/remote-service')
				.reply(404)

			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.find({}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.NotFound).toBeTruthy()
			})

			mock.onGet('http://host-remote/remote-service')
				.networkError()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.find({}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.BadGateway).toBeTruthy()
			})

			mock.onGet('http://host-remote/remote-service')
				.timeout()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.find({}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})

			mock.onGet('http://host-remote/remote-service')
				.reply(function (config) {
					return [
						500,
						new errors.GeneralError()
					];
				})
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.find({}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})
		})

		test('can use get method on remote service', async () => {
			// given
			const data = { _id: '1234567890', name: 'One' }
			mock.onGet('http://host-remote/remote-service/1234567890')
				.reply(200, data)

			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.get('1234567890', {})
			// then
			expect(response).toBeDefined()
			expect(mock.history.get[0].url).toEqual('http://host-remote/remote-service/1234567890')
			expect(response).toEqual(data)
		})

		test('get method on remote service fails', async () => {
			let service
			// given
			mock.onGet('http://host-remote/remote-service/1234567')
				.reply(404)

			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.get('1234567').catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.NotFound).toBeTruthy()
			})

			mock.onGet('http://host-remote/remote-service/1234567')
				.networkError()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
				await service.get('1234567').catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.BadGateway).toBeTruthy()
			})

			mock.onGet('http://host-remote/remote-service/1234567')
				.timeout()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
				await service.get('1234567').catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})

			mock.onGet('http://host-remote/remote-service/1234567')
				.reply(function (config) {
					return [
						500,
						new errors.GeneralError()
					];
				})
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
				await service.get('1234567').catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})
		})

		test('can use create method on remote service', async () => {
			// given
			const data = { _id: '1234567890', name: 'One' }
			mock.onPost('http://host-remote/remote-service')
				.reply(201, data)

			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.create({ name: 'One' })
			// then
			expect(response).toBeDefined()
			expect(mock.history.post[0].url).toEqual('http://host-remote/remote-service')
			expect(mock.history.post[0].data).toEqual(JSON.stringify({ name: 'One' }))
			expect(response).toEqual(data)
		})

		test('create method on remote service fails', async () => {
			let service
			// given
			mock.onPost('http://host-remote/remote-service')
				.reply(404)

			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.create({}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.NotFound).toBeTruthy()
			})

			mock.onPost('http://host-remote/remote-service')
				.networkError()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.create({}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.BadGateway).toBeTruthy()
			})

			mock.onPost('http://host-remote/remote-service')
				.timeout()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.create({}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})

			mock.onPost('http://host-remote/remote-service')
				.reply(function (config) {
					return [
						500,
						new errors.GeneralError()
					];
				})
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.create({}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})
		})

		test('can use patch method on remote service', async () => {
			// given
			const data = { _id: '1234567890', name: 'Changed', foo: 'bar' }
			mock.onGet('http://host-remote/remote-service/1234567890')
				.reply(200, { _id: '1234567890', name: 'One', foo: 'bar' })

			mock.onPatch('http://host-remote/remote-service/1234567890')
				.reply(200, data)

			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			await service.get('1234567890')
			const response = await service.patch('1234567890', { name: 'Changed' })
			// then
			expect(response).toBeDefined()
			expect(mock.history.get[0].url).toEqual('http://host-remote/remote-service/1234567890')
			expect(mock.history.patch[0].url).toEqual('http://host-remote/remote-service/1234567890')
			expect(mock.history.patch[0].data).toEqual(JSON.stringify({ name: 'Changed' }))
			expect(response).toEqual(data)
		})

		test('patch method on remote service fails', async () => {
			let service
			// given
			mock.onPatch('http://host-remote/remote-service/1234567')
				.reply(404)

			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.patch('1234567', {}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.NotFound).toBeTruthy()
			})

			mock.onPatch('http://host-remote/remote-service/1234567')
				.networkError()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.patch('1234567', {}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.BadGateway).toBeTruthy()
			})

			mock.onPatch('http://host-remote/remote-service/1234567')
				.timeout()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.patch('1234567', {}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})

			mock.onPatch('http://host-remote/remote-service/1234567')
				.reply(function (config) {
					return [
						500,
						new errors.GeneralError()
					];
				})
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.patch('1234567', {}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})
		})

		test('can use update method on remote service', async () => {
			// given
			const data = { _id: '1234567890', name: 'Changed' }
			mock.onGet('http://host-remote/remote-service/1234567890')
				.reply(200, { _id: '1234567890', name: 'One',  foo: 'bar' })

			mock.onPut('http://host-remote/remote-service/1234567890')
				.reply(200, data)

			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			await service.get('1234567890')
			const response = await service.update('1234567890', { name: 'Changed' })
			// then
			expect(response).toBeDefined()
			expect(mock.history.get[0].url).toEqual('http://host-remote/remote-service/1234567890')
			expect(mock.history.put[0].url).toEqual('http://host-remote/remote-service/1234567890')
			expect(mock.history.put[0].data).toEqual(JSON.stringify({ name: 'Changed' }))
			expect(response).toEqual(data)
		})

		test('update method on remote service fails', async () => {
			let service
			// given
			mock.onPut('http://host-remote/remote-service/1234567')
				.reply(404)

			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.update('1234567', {}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.NotFound).toBeTruthy()
			})

			mock.onPut('http://host-remote/remote-service/1234567')
				.networkError()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.update('1234567', {}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.BadGateway).toBeTruthy()
			})

			mock.onPut('http://host-remote/remote-service/1234567')
				.timeout()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.update('1234567', {}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})

			mock.onPut('http://host-remote/remote-service/1234567')
				.reply(function (config) {
					return [
						500,
						new errors.GeneralError()
					];
				})
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.update('1234567', {}).catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})
		})

		test('can use remove method on remote service', async () => {
			// given
			const data = { _id: '1234567890', name: 'One' }
			mock.onGet('http://host-remote/remote-service/1234567890')
				.reply(200, data)

			mock.onDelete('http://host-remote/remote-service/1234567890')
				.reply(200, data)

			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			await service.get('1234567890')
			const response = await service.remove('1234567890')
			// then
			expect(response).toBeDefined()
			expect(mock.history.get[0].url).toEqual('http://host-remote/remote-service/1234567890')
			expect(mock.history.delete[0].url).toEqual('http://host-remote/remote-service/1234567890')
			expect(response).toEqual(data)
		})

		test('remove method on remote service fails', async () => {
			let service
			// given
			mock.onDelete('http://host-remote/remote-service/1234567')
				.reply(404)

			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.remove('1234567').catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.NotFound).toBeTruthy()
			})

			mock.onDelete('http://host-remote/remote-service/1234567')
				.networkError()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.remove('1234567').catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.BadGateway).toBeTruthy()
			})

			mock.onDelete('http://host-remote/remote-service/1234567')
				.timeout()
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.remove('1234567').catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})

			mock.onDelete('http://host-remote/remote-service/1234567')
				.reply(function (config) {
					return [
						500,
						new errors.GeneralError()
					];
				})
			// @ts-ignore
			service = localApp.microservice('service-one::remote-service')
			await service.remove('1234567').catch((error) => {
				expect(error).toBeDefined()
				expect(error instanceof errors.FeathersError).toBeTruthy()
			})
		})

		test('params headers are correctly removed', async () => {
			// given
			mock.onGet('http://host-remote/remote-service')
				.reply(200, [])

			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.find({ headers: { 'content-length': '123', 'upgrade': 'true', 'connection': 'websockets'}})
			// then
			expect(response).toBeDefined()
			expect(mock.history.get[0].headers['content-length']).toBeUndefined()
			expect(mock.history.get[0].headers['upgrade']).toBeUndefined()
			expect(mock.history.get[0].headers['connection']).toBeUndefined()
			expect(mock.history.get[0].url).toEqual('http://host-remote/remote-service')
			expect(response).toEqual([])
		})
	})
	describe('Call remote service with rpc client', () => {
		let remoteApp, localApp
		beforeAll(async () => {
			remoteApp = feathers()
				.configure(microservices({
					url: amqpUrl,
					publish: true,
					key: 'app-remote',
					host: 'host-remote',
					service: 'service-one',
					type: MicroServiceType.RPC
				}))
			remoteApp.use('/remote-service', memory({
				store: [
					{ id: '0', name: 'One' },
					{ id: '1', name: 'Two' },
					{ id: '2', name: 'Three' },
					{ id: '3', name: 'Four' },
					{ id: '4', name: 'Five' }
				]
			}))

			localApp = feathers()
				.configure(microservices({
					register: true,
					key: 'app-local',
					host: 'host-local',
					service: 'service-two'
				}))

			localApp.use('/local-service', memory({}))
			const localService = localApp.service('local-service')
			expect(localService).toBeTruthy()
			
			const {check} = await fakeConnection()
			await check((events) => {
				// @ts-ignore
				const remoteService = localApp.microservice('service-one::remote-service')
				expect(remoteService).toBeTruthy()
				expect(Object.keys(localApp.microservices).length).toBe(1)
			})
		})

		test('can use find method on remote service', async () => {
			// given
			const data = [
				{ id: '0', name: 'One' },
				{ id: '1', name: 'Two' },
				{ id: '2', name: 'Three' },
				{ id: '3', name: 'Four' },
				{ id: '4', name: 'Five' }
			]
			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.find({})
			// then
			expect(response).toBeDefined()
			expect(response).toEqual(data)
		})
		
		
		test('can use get method on remote service', async () => {
			// given
			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.get(0)
			// then
			expect(response).toBeDefined()
			expect(response).toEqual({ id: '0', name: 'One' })
		})
		
		test('can use create method on remote service', async () => {
			// given
			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.create({ id: '5', name: 'Six' })
			// then
			expect(response).toBeDefined()
			expect(response).toEqual({ id: '5', name: 'Six' })
		})
		
		test('can use update method on remote service', async () => {
			// given
			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.update(0, { id: '0', foo: 'bar' })
			// then
			expect(response).toBeDefined()
			expect(response).toEqual({ id: '0',  foo: 'bar' })
		})
		
		test('can use patch method on remote service', async () => {
			// given
			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.patch(1, { foo: 'bar' })
			// then
			expect(response).toBeDefined()
			expect(response).toEqual({ id: '1', name: 'Two', foo: 'bar' })
		})
		
		test('can use remove method on remote service', async () => {
			// given
			// @ts-ignore
			const service = localApp.microservice('service-one::remote-service')
			const response = await service.remove(2)
			// then
			expect(response).toBeDefined()
			expect(response).toEqual({ id: '2', name: 'Three'})
		})
	})
})