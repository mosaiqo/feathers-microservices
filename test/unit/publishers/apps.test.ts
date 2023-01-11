import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import mockAmqplib from 'mock-amqplib'
import { AmqpClient } from '../../../lib/clients'
import { AppsPublisher } from '../../../lib/publishers'
import { HelloEvent, ServicesPublishedEvent } from '../../../lib/events'
jest.mock('amqplib')
jest.mock('amqplib', () => ({
	connect: () => mockAmqplib.connect()
}))
describe('RabbitMQ AppsPublisher', () => {
	test('should connect',  async () => {
		const {channel} = await AmqpClient.connect('some-url')
		const publisher = new AppsPublisher(channel, 'custom-exchange',  'custom-key')
		await publisher.init()
	})
	
	test('emits HelloEvent',  async () => {
		const { channel } = await AmqpClient.connect('some-url')
		const publisher = new AppsPublisher(channel, 'custom-exchange',  'custom-key')
		await publisher.init()
		
		const event = HelloEvent.create('id', 'key', 'host', 'HTTP')
		await publisher.emitGreet(event)
		
		
		channel.assertQueue('test-queue')
		channel.bindQueue('test-queue', 'custom-exchange', '')
		channel.consume('test-queue', (data) => {
			const eventData = JSON.parse(`${Buffer.from(data.content)}`)
			expect(eventData.name === 'HelloEvent')
		})
	})
})