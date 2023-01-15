import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import { AmqpLibMock, clear, getQueues } from '../../_mocks/AmqpLibMock'
import { AmqpClient } from '../../../lib/clients'
import { AppConsumer } from '../../../lib/consumers'
import { HelloEvent, ServicesPublishedEvent } from '../../../lib/events'

jest.mock('amqplib', () => ({
	connect: () => AmqpLibMock.connect()
}))

describe('RabbitMQ AppConsumer', () => {
	beforeEach(async () => {
		await clear()
	})
	test('should connect',  async () => {
		const { channel } = await AmqpClient.connect('some-url')
		const consumer = await AppConsumer.create(channel,
			'custom-exchange',
			'custom-queue',
			'custom-key',
			'custom-namespace',
			'custom-service',
			'custom-id'
			)
		expect(consumer instanceof AppConsumer).toBeTruthy()
	})
	
	test('subscribes to HelloEvent',  async () => {
		const events = []
		const { channel } = await AmqpClient.connect('some-url')
		const consumer = await AppConsumer.create(
			channel,
			'custom-exchange',
			'custom-queue',
			'custom-namespace',
			'custom-namespace',
			'custom-service',
			'custom-id'
		)
		await consumer.onHello(async (e: HelloEvent) => {
			events.push(e)
			expect(e).toBeDefined()
			expect(e.name).toBe('HelloEvent')
			expect(e.id).toBe('id')
			expect(e.key).toBe('key')
			expect(e.host).toBe('host')
			expect(e.type).toBe('type')
		})
		const event = HelloEvent.create('id', 'key', 'host', 'type', {},true, true)
		channel.publish('custom-exchange', 'custom-namespace',Buffer.from(JSON.stringify(event.toJson())))
		
		expect(events.length).toBe(1)
	})
	
	test('subscribes to ServicesPublishedEvent',  async () => {
		const events = []
		const service = {
			name: 'service-1',
			key: 'key',
			service: 'service-1',
			host: 'host',
			path: 'service-1',
			methods: ['find', 'get', 'create', 'patch', 'remove'],
			events: ['created', 'updated', 'patched', 'removed']
		}
		const { channel } = await AmqpClient.connect('some-url')
		const consumer = await AppConsumer.create(
			channel,
			'custom-exchange',
			'custom-queue',
			'custom-key',
			'custom-namespace',
			'custom-service',
			'custom-id'
		)
		await consumer.onServicesPublished(async (e: ServicesPublishedEvent) => {
			events.push(e)
			expect(e.name).toBe('ServicesPublishedEvent')
			expect(e.id).toBe('id')
			expect(e.key).toBe('key')
			expect(e.host).toBe('host')
			expect(e.services).toStrictEqual([service])
		})

		const event = ServicesPublishedEvent.create('id', 'key', 'host', [service])
		channel.publish('custom-exchange', 'custom-namespace', Buffer.from(JSON.stringify(event.toJson())))
		expect(events.length).toBe(1)
	})
	
	test('subscribes to Unknown events',  async () => {
		const events = []
		const service = {
			name: 'service-1',
			key: 'key',
			service: 'service-1',
			host: 'host',
			path: 'service-1',
			methods: ['find', 'get', 'create', 'patch', 'remove'],
			events: ['created', 'updated', 'patched', 'removed']
		}
		const { channel } = await AmqpClient.connect('some-url')
		const consumer = await AppConsumer.create(
			channel,
			'custom-exchange',
			'custom-queue',
			'custom-key',
			'custom-namespace',
			'custom-service',
			'custom-id'
		)
		await consumer.onUnknownPublished(async (e) => {
			events.push(e)
			expect(e).toStrictEqual({name: 'NotRegisteredEvent', id:'id', key:'key', host: 'host'})
		})

		const event = {name: 'NotRegisteredEvent', id:'id', key:'key', host: 'host'}
		channel.publish('custom-exchange', 'custom-namespace', Buffer.from(JSON.stringify(event)))
		expect(events.length).toBe(1)
	})
})