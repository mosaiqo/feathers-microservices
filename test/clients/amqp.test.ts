import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import mockAmqplib from 'mock-amqplib'
import {
	DEFAULT_EXCHANGE_EVENTS,
	DEFAULT_EXCHANGE_SERVICES
} from '../../lib/constants'
import { AmqpClient } from '../../lib/clients'

jest.mock('amqplib')
jest.mock('amqplib', () => ({
	connect: () => mockAmqplib.connect()
}))

describe('AMQP Client', () => {
	test('should instantiate with default values',  () => {
		const client = new AmqpClient('some-url')
		expect(client.url).toBe('some-url')
		expect(client.options).toStrictEqual({"exchanges": { "services": DEFAULT_EXCHANGE_SERVICES, "events": DEFAULT_EXCHANGE_EVENTS}})
	})
	
	test('custom exchanges can be provided',  () => {
		const client = new AmqpClient('some-url', { exchanges: { services: 'custom-service-exchange' , events: 'custom-event-exchange'} })
		expect(client.url).toBe('some-url')
		expect(client.options).toStrictEqual({"exchanges": { "services": 'custom-service-exchange', "events": 'custom-event-exchange'}})
	})
	
	test('connects correctly to server',  async () => {
		const client = new AmqpClient('some-url', { exchanges: { services: 'custom-service-exchange' , events: 'custom-event-exchange'} })
		const channel = await client.connect()
		expect(client.url).toBe('some-url')
		expect(client.options).toStrictEqual({"exchanges": { "services": 'custom-service-exchange', "events": 'custom-event-exchange'}})
	})
})