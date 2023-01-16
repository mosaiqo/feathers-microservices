import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import { AppConsumer } from '../../../lib/consumers'
import { AppsPublisher } from '../../../lib/publishers'
import { amqpUrl } from '../../configs'
import { AmqpLibMock } from '../../_mocks/AmqpLibMock'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { AmqpClient } from '../../../lib/clients'
import { Requester } from '../../../lib/requesters'
import { HttpRequester } from '../../../lib/requesters/http'
import { RpcRequester } from '../../../lib/requesters/rpc'

jest.mock('amqplib', () => ({
	connect: () => AmqpLibMock.connect()
}))
describe('Requester Factory', () => {
	let mock
	let channel, consumer, publisher
	beforeAll(async () => {
		mock = new MockAdapter(axios)
	})
	
	beforeEach(async () => {
		jest.clearAllMocks()
		const client = await AmqpClient.connect(amqpUrl)
		channel = client.channel
		
		consumer = await AppConsumer.create(
			channel,
			'custom-exchange',
			'custom-queue',
			'custom-key',
			'custom-namespace',
			'custom-service',
			'custom-id',
		)
		
		publisher = await AppsPublisher.create(
			channel,
			'custom-exchange',
			'custom-key',
			'custom-namespace'
		)
		
	})
	
	test('should return a http requester by default',  async () => {
		const {channel} = await AmqpClient.connect('some-url')
		const requester = await Requester.create({ key: 'test-key' }, consumer, publisher)
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('should return a http requester',  async () => {
		const requester = await Requester.create({ key: 'test-key', type: 'HTTP' })
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('should return a rcp requester',  async () => {
		const {channel} = await AmqpClient.connect('some-url')
		const requester = await Requester.create({
			current: { key: 'test-key' },
			remote: { service: 'remote-service' },
			type: 'RPC'
		}, consumer, publisher)
		expect(requester instanceof RpcRequester).toBeTruthy()
	})
	
	test('should return a http requester if wrong type provided',  async () => {
		const {channel} = await AmqpClient.connect('some-url')
		const requester = await Requester.create({ key: 'test-key', type: 'other' })
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('should throw error if RPC requested but no channel provided',   async () => {
		Requester.create({ key: 'test-key', type: 'RPC'})
			.catch(e => {
				expect(e instanceof Error).toBeTruthy()
				expect(e.message).toBe('If RPC type selected you need to provide a consumer and a publisher instance')
			})
	})
})