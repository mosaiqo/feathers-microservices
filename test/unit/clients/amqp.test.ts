import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import { AmqpLibMock } from '../../_mocks/AmqpLibMock'
import {
	DEFAULT_EXCHANGE_EVENTS,
	DEFAULT_EXCHANGE_SERVICES
} from '../../../lib/constants'
import { AmqpClient } from '../../../lib/clients'

jest.mock('amqplib', () => ({
	connect: () => AmqpLibMock.connect()
}))

describe('AMQP Client', () => {
	test('should instantiate with default values',  async () => {
		const { client } = await AmqpClient.connect('some-url')
		expect(client.url).toBe('some-url')
		expect(client.options).toStrictEqual({"exchanges": { "services": DEFAULT_EXCHANGE_SERVICES, "events": DEFAULT_EXCHANGE_EVENTS}})
	})
	
	test('custom exchanges can be provided',  async() => {
		const { client } = await AmqpClient.connect('some-url', { exchanges: { services: 'custom-service-exchange' , events: 'custom-event-exchange'} })
		expect(client.url).toBe('some-url')
		expect(client.options).toStrictEqual({"exchanges": { "services": 'custom-service-exchange', "events": 'custom-event-exchange'}})
	})
	
	test('connects correctly to server',  async () => {
		const { client } =  await AmqpClient.connect('some-url', { exchanges: { services: 'custom-service-exchange' , events: 'custom-event-exchange'} })
		expect(client.url).toBe('some-url')
		expect(client.options).toStrictEqual({"exchanges": { "services": 'custom-service-exchange', "events": 'custom-event-exchange'}})
	})
})