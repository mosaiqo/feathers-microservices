import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import mockAmqplib from 'mock-amqplib'
import { AmqpClient } from '../../../lib/clients'
import { AppsConsumer } from '../../../lib/consumers'
import { HelloEvent, ServicesPublishedEvent } from '../../../lib/events'

jest.mock('amqplib', () => ({
	connect: () => mockAmqplib.connect()
}))

describe('RabbitMQ AppsConsumer', () => {
	test('should connect',  async () => {
		const { channel } = await AmqpClient.connect('some-url')
		const consumer = new AppsConsumer(channel, 'custom-exchange', 'custom-queue', 'custom-key')
		await consumer.init()
	})
	
	test('subscribes to HelloEvent',  async () => {
		const { channel } = await AmqpClient.connect('some-url')
		const consumer = new AppsConsumer(channel, 'custom-exchange', 'custom-queue', 'custom-key')
		await consumer.init()
		await consumer.onHello(async (e: HelloEvent) => {
			expect(e.name).toBe('HelloEvent')
			expect(e.id).toBe('id')
			expect(e.key).toBe('key')
			expect(e.host).toBe('host')
			expect(e.type).toBe('type')
		})
		
		const event = HelloEvent.create('id', 'key', 'host', 'type')
		channel.publish('custom-exchange', '', Buffer.from(JSON.stringify(event.toJson())))
	})
	
	test('subscribes to ServicesPublishedEvent',  async () => {
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
		const consumer = new AppsConsumer(channel, 'custom-exchange', 'custom-queue', 'custom-key')
		await consumer.init()
		await consumer.onServicesPublished(async (e: ServicesPublishedEvent) => {
			expect(e.name).toBe('ServicesPublishedEvent')
			expect(e.id).toBe('id')
			expect(e.key).toBe('key')
			expect(e.host).toBe('host')
			expect(e.services).toStrictEqual([service])
		})

		const event = ServicesPublishedEvent.create('id', 'key', 'host', [service])
		channel.publish('custom-exchange', '', Buffer.from(JSON.stringify(event.toJson())))
	})
})