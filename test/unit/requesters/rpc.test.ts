import { feathers } from '@feathersjs/feathers'
import { describe, expect, jest, test } from '@jest/globals'
import { RPCRequestEvent, RPCResponseEvent } from '../../../lib/events'
import { AppConsumer } from '../../../lib/consumers'
import { AppsPublisher } from '../../../lib/publishers'
import { fakeRpcResponder, amqpUrl } from '../../configs'
import { AmqpClient } from '../../../lib/clients'
import { RpcRequester } from '../../../lib/requesters/rpc'
import * as amqplib from 'amqplib'
import { AmqpLibMock, getAll, getExchanges } from '../../_mocks/AmqpLibMock'

jest.setTimeout(8000)
jest.mock('amqplib', () => ({
	connect: () => AmqpLibMock.connect()
}))

describe.only('RpcRequester', () => {
	let channel, consumer, publisher, event
	beforeEach(async () => {
		jest.clearAllMocks()
		event = RPCResponseEvent.create('id', 'type', 'path', { foo: 'bar' }, {})
		const client = await AmqpClient.connect(amqpUrl)
		channel = client.channel
		
		consumer = await AppConsumer.create(
			channel,
			'custom-exchange',
			'custom-queue',
			'custom-key',
			'custom-namespace',
			'custom-service',
			'custom-id'
		)
		
		publisher = await AppsPublisher.create(
			channel,
			'custom-exchange',
			'custom-key',
			'custom-namespace'
		)
		
	})
	
	test('sets correct options', async () => {
		const requester = await RpcRequester.create({
			current: { host: 'host-remote', key: 'key' },
			remote: { service: 'host-remote' },
			replyTo: 'test-reply-queue'
		}, consumer, publisher)
		
		// @ts-ignore
		expect(requester instanceof RpcRequester).toBeTruthy()
		expect(requester.consumer instanceof AppConsumer).toBeTruthy()
		expect(requester.publisher instanceof AppsPublisher).toBeTruthy()
	})
	
	test('converts properly an object id to string', async () => {
		event = RPCResponseEvent.create({ custom: 'id' }, 'key', 'type', 'path', { foo: 'bar' }, {})
		const { check } = await fakeRpcResponder(
			'test-queue',
			{
				exchange: 'custom-exchange',
				service: 'custom-service',
				topic: 'custom-namespace.custom-service'
			},
			event,
			channel
		)
		
		const requester = await RpcRequester.create({
				replyTo: 'custom-queue',
				current: { host: 'custom-host', key: 'key', namespace: 'custom-namespace' },
				remote: {
					service: 'custom-service'
				}
			},
			consumer,
			publisher
		)
		
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'get', id: { custom: 'id' }, path: 'remote-service', params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'bar' })
		await check((event) => {
			expect(event.data.id).toBe(JSON.stringify({ custom: 'id' }))
		})
	})
	
	test('filters out correct params based on excludedParams', async () => {
		const requester = await RpcRequester.create({
				replyTo: 'custom-queue',
				excludeParams: ['bar'],
				current: {
					key: 'custom-host',
					host: 'custom-host',
					namespace: 'custom-namespace'
				},
				remote: {
					service: 'custom-service'
				}
			},
			consumer,
			publisher
		)
		const { check } = await fakeRpcResponder(
			'test-queue',
			{
				exchange: 'custom-exchange',
				service: 'custom-service',
				topic: 'custom-namespace.custom-service'
			},
			RPCResponseEvent.create({ custom: 'id' }, 'key', 'type', 'path', { foo: 'bar' }, {}),
			channel
		)
		const response = await requester.send({
			type: 'find', path: 'remote-service', params: { bar: 'foo' }
		})
		expect(response).toStrictEqual({ 'foo': 'bar' })
		expect(requester instanceof RpcRequester).toBeTruthy()
		
		await check((event) => {
			expect(event.data.params).toStrictEqual( { provider: 'remote' })
		})
	})
	
	test('makes correct find request', async () => {
		const requester = await RpcRequester.create({
				replyTo: 'custom-queue',
				excludeParams: ['bar'],
				current: {
					host: 'custom-host',
					key: 'key',
					namespace: 'custom-namespace'
				},
				remote: {
					service: 'custom-service'
				}
			},
			consumer,
			publisher
		)
		const { check } = await fakeRpcResponder(
			'test-queue',
			{
				exchange: 'custom-exchange',
				service: 'custom-service',
				topic: 'custom-namespace.custom-service'
			},
			RPCResponseEvent.create({ custom: 'id' }, 'key', 'type', 'path', [{ foo: 'bar' }], {}),
			channel
		)
		
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({ type: 'find', path: 'remote-service', params: {} })
		
		expect(response).toStrictEqual([{ foo: 'bar' }])
		await check((event) => {
			expect(event.data.type).toBe('find')
			expect(event.data.params).toStrictEqual( { provider: 'remote' })
		})
	})
	
	test('makes correct get request', async () => {
		const requester = await RpcRequester.create({
				replyTo: 'custom-queue',
				current: {
					host: 'custom-host',
					namespace: 'custom-namespace',
					key: 'key'
				},
				remote: { service: 'custom-service' }
				
			},
			consumer,
			publisher
		)
		const { check } = await fakeRpcResponder(
			'test-queue',
			{
				exchange: 'custom-exchange',
				service: 'custom-service',
				topic: 'custom-namespace.custom-service'
			},
			RPCResponseEvent.create({ custom: 'id' }, 'key', 'type', 'path', { foo: 'bar' }, {}),
			channel
		)
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'get', id: 'custom-id', path: 'remote-service', params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'bar' })
		await check((event) => {
			expect(event.data.id).toBe('custom-id')
			expect(event.data.type).toBe('get')
			expect(event.data.params).toStrictEqual( { provider: 'remote' })
		})
	})
	
	test('makes correct update request', async () => {
		const requester = await RpcRequester.create({
				replyTo: 'custom-queue',
				current: {
					host: 'custom-host',
					namespace: 'custom-namespace',
					key: 'key'
				},
				remote: {
					service: 'custom-service'
				}
			},
			consumer,
			publisher
		)
		const { check } = await fakeRpcResponder(
			'test-queue',
			{
				exchange: 'custom-exchange',
				service: 'custom-service',
				topic: 'custom-namespace.custom-service'
			},
			RPCResponseEvent.create({ custom: 'id' }, 'key', 'type', 'path', { foo: 'baz' }, {}),
			channel
		)
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'update', id: 'custom-id', path: 'remote-service', data: { foo: 'baz' }, params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'baz' })
		await check((event) => {
			expect(event.data.id).toBe('custom-id')
			expect(event.data.type).toBe('update')
			expect(event.data.data).toStrictEqual({ foo: 'baz' })
			expect(event.data.params).toStrictEqual( { provider: 'remote' })
		})
	})
	
	test('makes correct patch request', async () => {
		const requester = await RpcRequester.create({
				replyTo: 'custom-queue',
				current: {
					host: 'custom-host',
					namespace: 'custom-namespace',
					key: 'key'
				},
				remote: {
					service: 'custom-service'
				}
			},
			consumer,
			publisher
		)
		const { check } = await fakeRpcResponder(
			'test-queue',
			{
				exchange: 'custom-exchange',
				service: 'custom-service',
				topic: 'custom-namespace.custom-service'
			},
			RPCResponseEvent.create({ custom: 'id' }, 'key', 'type', 'path', { foo: 'baz' }, {}),
			channel
		)
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'patch', id: 'custom-id', path: 'remote-service', data: { foo: 'baz' }, params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'baz' })
		await check((event) => {
			expect(event.data.id).toBe('custom-id')
			expect(event.data.type).toBe('patch')
			expect(event.data.data).toStrictEqual({ foo: 'baz' })
			expect(event.data.params).toStrictEqual( { provider: 'remote' })
		})
	})
	
	test('makes correct remove request', async () => {
		const requester = await RpcRequester.create({
				replyTo: 'custom-queue',
				current: {
					host: 'custom-host',
					namespace: 'custom-namespace',
					key: 'key'
				},
				remote: {
					service: 'custom-service',
				}
			},
			consumer,
			publisher
		)
		const { check } = await fakeRpcResponder(
			'test-queue',
			{
				exchange: 'custom-exchange',
				service: 'custom-service',
				topic: 'custom-namespace.custom-service'
			},
			RPCResponseEvent.create({ custom: 'id' }, 'key', 'type', 'path', { foo: 'bar' }, {}),
			channel
		)
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'remove', id: 'custom-id', path: 'remote-service', params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'bar' })
		await check((event) => {
			expect(event.data.id).toBe('custom-id')
			expect(event.data.type).toBe('remove')
			expect(event.data.params).toStrictEqual( { provider: 'remote' })
		})
	})
	
	test('fails for timeout after 5s', async () => {
		const requester = await RpcRequester.create({
			current: {
				host: 'failed-remote',
				key: 'key'
			},
			remote: {
				service: 'non-existent-service'
			}
		}, consumer, publisher)
		expect(requester instanceof RpcRequester).toBeTruthy()
		
		await requester.send({
			type: 'remove', id: 'custom-id', path: 'remote-service', params: {}
		}).catch(e => {
			expect(e.response.data.message).toBe('Request timed out')
			expect(e.response.data.status).toBe(408)
		})
	})
})