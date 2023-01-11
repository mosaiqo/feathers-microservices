import { feathers } from '@feathersjs/feathers'
import { describe, expect, jest, test } from '@jest/globals'
import memory from 'feathers-memory'
import { fakeRpcRequester, amqpUrl } from '../../configs'
import { AmqpClient } from '../../../lib/clients'
import { RPCRequestEvent } from '../../../lib/events'
import { RpcReplier } from '../../../lib/repliers/rpc'
import * as amqplib from 'amqplib'
import mockAmqplib from 'mock-amqplib'
jest.mock('amqplib', () => ({
	connect: () => mockAmqplib.connect()
}))


describe('RPCReplier', () => {
	let channel, app
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
	})
	
	test('sets correct options',  async () => {
		const replier = new RpcReplier(app, { host: 'host-remote' }, channel)
		await replier.init()
		
		expect(replier instanceof RpcReplier).toBeTruthy()
		expect(replier.queue).toBe('host-remote-service')
	})
	
	test('replies correctly a find request',  async () => {
		const replier = new RpcReplier(app, { host: 'host-remote' }, channel)
		await replier.init()
		const event = RPCRequestEvent.create(null, 'find', 'some-path')
		const {check} = await fakeRpcRequester('host-remote', event.toJson(), channel)
		
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event).toStrictEqual([
				{ id: '0', name: 'One' },
				{ id: '1', name: 'Two' }
			])
		})
	})
	
	test('replies correctly a get request',  async () => {
		const replier = new RpcReplier(app, { host: 'host-remote' }, channel)
		await replier.init()
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create('0', 'get', 'some-path')
		const {check} = await fakeRpcRequester('host-remote', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event).toStrictEqual({ id: '0', name: 'One' })
		})
	})
	
	test('replies correctly a create request',  async () => {
		const replier = new RpcReplier(app, { host: 'host-remote' }, channel)
		await replier.init()
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create(null, 'create', 'some-path', { id: '2', foo: 'bar-t-foo' })
		const {check} = await fakeRpcRequester('host-remote', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event).toStrictEqual({ id: '2', foo: 'bar-t-foo' })
		})
	})
	
	test('replies correctly a update request',  async () => {
		const replier = new RpcReplier(app, { host: 'host-remote' }, channel)
		await replier.init()
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create('0', 'update', 'some-path', { foo: 'bar' })
		const {check} = await fakeRpcRequester('host-remote', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event).toStrictEqual({ id: '0', foo: 'bar' })
		})
	})
	
	test('replies correctly a patch request',  async () => {
		const replier = new RpcReplier(app, { host: 'host-remote' }, channel)
		await replier.init()
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create('0', 'patch', 'some-path', { foo: 'bar' })
		const {check} = await fakeRpcRequester('host-remote', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event).toStrictEqual({ id: '0', name: 'One', foo: 'bar' })
		})
	})
	
	test('replies correctly a remove request',  async () => {
		const replier = new RpcReplier(app, { host: 'host-remote' }, channel)
		await replier.init()
		expect(replier instanceof RpcReplier).toBeTruthy()
		const event = RPCRequestEvent.create('0', 'remove', 'some-path')
		const {check} = await fakeRpcRequester('host-remote', event.toJson(), channel)
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event).toStrictEqual({ id: '0', name: 'One' })
		})
	})
	
	test('throws proper error when service does not exist',  async () => {
		const replier = new RpcReplier(app, { host: 'host-remote' }, channel)
		await replier.init()
		expect(replier instanceof RpcReplier).toBeTruthy()
		
		const event = RPCRequestEvent.create(null, 'find', 'non-existing-path')
		const { check } = await fakeRpcRequester('host-remote', event.toJson(), channel)
		
		await check((event) => {
			expect(replier instanceof RpcReplier).toBeTruthy()
			expect(event).toStrictEqual( { error: "Can not find service 'non-existing-path'" } )
		})
	})
})