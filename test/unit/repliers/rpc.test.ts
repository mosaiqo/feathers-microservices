import { feathers } from '@feathersjs/feathers'
import { describe, expect, jest, test } from '@jest/globals'
import memory from 'feathers-memory'
import { AppsPublisher } from '../../../lib/publishers'
import { AppConsumer } from '../../../lib/consumers'
import { fakeRpcRequester, amqpUrl } from '../../configs'
import { AmqpClient } from '../../../lib/clients'
import { RPCRequestEvent } from '../../../lib/events'
import { RpcReplier } from '../../../lib/repliers/rpc'
import * as amqplib from 'amqplib'
import { AmqpLibMock, getExchanges, getQueues } from '../../_mocks/AmqpLibMock'
jest.mock('amqplib', () => ({
	connect: () => AmqpLibMock.connect()
}))


describe('RPCReplier', () => {
	let channel, app, consumer, publisher
	
	beforeEach(async () => {
		jest.clearAllMocks()
		const client = await AmqpClient.connect(amqpUrl)
		channel = client.channel
		app = feathers()
		app.use('some-path', memory({
			store: [
				{ id: '0', name: 'One' },
				{ id: '1', name: 'Two' }
			]
		}))
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
	
	test('sets correct options',  async () => {
		
		const replier = await RpcReplier.create(app, 'key', consumer, publisher)
		
		expect(replier instanceof RpcReplier).toBeTruthy()
		expect(replier.consumer instanceof AppConsumer).toBeTruthy()
		// expect(replier.consumer instanceof AppConsumer).toBeTruthy()
	})
	
	test('replies correctly a find request',  async () => {
		const replier = await RpcReplier.create(app,'key', consumer, publisher)
		const event = RPCRequestEvent.create(null, 'key','find', 'some-path')
		
		const { check } = await fakeRpcRequester('custom-exchange', 'custom-namespace', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event.data.data).toStrictEqual([
				{ id: '0', name: 'One' },
				{ id: '1', name: 'Two' }
			])
		})
	})
	
	test('replies correctly a get request',  async () => {
		const replier = await RpcReplier.create(app, 'key',consumer, publisher)
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create('0', 'key','get', 'some-path')
		const { check } = await fakeRpcRequester('custom-exchange', 'custom-namespace', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event.data.data).toStrictEqual({ id: '0', name: 'One' })
		})
	})
	
	test('replies correctly a create request',  async () => {
		const replier = await RpcReplier.create(app, 'key', consumer, publisher)
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create(null, 'key','create', 'some-path', { id: '2', foo: 'bar-t-foo' })
		const { check } = await fakeRpcRequester('custom-exchange', 'custom-namespace', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event.data.data).toStrictEqual({ id: '2', foo: 'bar-t-foo' })
		})
	})
	
	test('replies correctly a update request',  async () => {
		const replier = await RpcReplier.create(app, 'key', consumer, publisher)
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create('0', 'key','update', 'some-path', { foo: 'bar' })
		const { check } = await fakeRpcRequester('custom-exchange', 'custom-namespace', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event.data.data).toStrictEqual({ id: '0', foo: 'bar' })
		})
	})
	
	test('replies correctly a patch request',  async () => {
		const replier = await RpcReplier.create(app, 'key', consumer, publisher)
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create('1', 'key','patch', 'some-path', { foo: 'bar' })
		const { check } = await fakeRpcRequester('custom-exchange', 'custom-namespace', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event.data.data).toStrictEqual({ id: '1', name: 'Two', foo: 'bar' })
		})
	})
	
	test('replies correctly a remove request',  async () => {
		const replier = await RpcReplier.create(app,'key', consumer, publisher)
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create('0', 'key', 'remove', 'some-path')
		const { check } = await fakeRpcRequester('custom-exchange', 'custom-namespace', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event.data.data).toStrictEqual({ id: '0', name: 'One' })
		})
	})
	
	test('throws proper error when service does not exist',  async () => {
		const replier = await RpcReplier.create(app, 'key', consumer, publisher)
		expect(replier instanceof RpcReplier).toBeTruthy()
		
		const event = RPCRequestEvent.create(null, 'key','find', 'non-existing-path')
		const { check } = await fakeRpcRequester('custom-exchange', 'custom-namespace', event.toJson(), channel)
		
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event.data.data).toStrictEqual( { error: "Can not find service 'non-existing-path'" } )
		})
	})
})