import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import { AmqpLibMock } from '../../_mocks/AmqpLibMock'
import { DEFAULT_EXCHANGE_NAME } from '../../../lib/constants'
import { AmqpClient } from '../../../lib/clients'

jest.mock('amqplib', () => ({
	connect: () => AmqpLibMock.connect()
}))

describe('AMQP Client', () => {
	test('should instantiate with default values',  async () => {
		const { client } = await AmqpClient.connect('some-url')
		expect(client.url).toBe('some-url')
		expect(client.options).toStrictEqual({"exchange": DEFAULT_EXCHANGE_NAME})
	})
	
	test('custom exchanges can be provided',  async() => {
		const { client } = await AmqpClient.connect('some-url', { "exchange": DEFAULT_EXCHANGE_NAME })
		expect(client.url).toBe('some-url')
		expect(client.options).toStrictEqual({"exchange": DEFAULT_EXCHANGE_NAME})
	})
	
	test('connects correctly to server',  async () => {
		const { client } =  await AmqpClient.connect('some-url', { "exchange": DEFAULT_EXCHANGE_NAME })
		expect(client.url).toBe('some-url')
		expect(client.options).toStrictEqual({"exchange": DEFAULT_EXCHANGE_NAME})
	})
})