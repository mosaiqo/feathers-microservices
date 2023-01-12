import { feathers } from '@feathersjs/feathers'
import { describe, expect, jest, test } from '@jest/globals'
import { fakeRpcResponder, amqpUrl } from '../../configs'
import { AmqpClient } from '../../../lib/clients'
import { RpcRequester } from '../../../lib/requesters/rpc'
import * as amqplib from 'amqplib'
import { AmqpLibMock } from '../../_mocks/AmqpLibMock'

jest.setTimeout(8000)
jest.mock('amqplib', () => ({
	connect: () => AmqpLibMock.connect()
}))

describe.only('RpcRequester', () => {
	let channel
	beforeEach(async () => {
		jest.clearAllMocks()
		const client = await AmqpClient.connect(amqpUrl)
		channel = client.channel
	})
	
	test('sets correct options',  async () => {
		const requester = new RpcRequester({ host: 'host-remote' }, channel)
		await requester.init()
		
		// @ts-ignore
		expect(requester instanceof RpcRequester).toBeTruthy()
		expect(requester.queue).toBe('host-remote-service')
	})
	
	test('converts properly an object id to string',  async () => {
		const {check} = await fakeRpcResponder('host-remote', { foo: 'bar' }, channel)
		const requester = new RpcRequester({ host: 'host-remote' }, channel)
		await requester.init()
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'get', id: { custom: 'id'},  path: 'remote-service', params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'bar' })
		await check((event) => {
			expect(event.data.id).toBe(JSON.stringify({ custom: 'id'}))
		})
	})
	
	test('filters out correct params based on excludedParams',  async () => {
		const requester = new RpcRequester({ host: 'host-remote', excludeParams: ['bar'] }, channel)
		await requester.init()
		
		const { check } = await fakeRpcResponder('host-remote', { foo: 'bar' }, channel)
		const response = await requester.send({ type: 'find', path: 'remote-service', params: {
				bar: 'foo'
			}})
		expect(response).toStrictEqual({ foo: 'bar' })
		expect(requester instanceof RpcRequester).toBeTruthy()
		
		await check((event)  => {
			expect(event.data.params).toStrictEqual({})
		})
	})
	
	test('makes correct find request',  async () => {
		const { check } = await fakeRpcResponder('host-remote', { foo: 'bar' }, channel)
		const requester = new RpcRequester({ host: 'host-remote' }, channel)
		await requester.init()
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({ type: 'find', path: 'remote-service', params: {} })
		
		expect(response).toStrictEqual({ foo: 'bar' })
		await check((event)  => {
			expect(event.data.type).toBe('find')
			expect(event.data.params).toStrictEqual({})
		})
	})
	
	test('makes correct get request',  async () => {
		const { check } = await fakeRpcResponder('host-remote', { foo: 'bar' }, channel)
		const requester = new RpcRequester({ host: 'host-remote' }, channel)
		await requester.init()
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'get', id: 'custom-id', path: 'remote-service', params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'bar' })
		await check((event)  => {
			expect(event.data.id).toBe('custom-id')
			expect(event.data.type).toBe('get')
			expect(event.data.params).toStrictEqual({})
		})
	})
	
	test('makes correct update request',  async () => {
		const { check } = await fakeRpcResponder('host-remote', { foo: 'bar' }, channel)
		const requester = new RpcRequester({ host: 'host-remote' }, channel)
		await requester.init()
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'update', id: 'custom-id', path: 'remote-service', data: { foo: 'bar' }, params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'bar' })
		await check((event)  => {
			expect(event.data.id).toBe('custom-id')
			expect(event.data.type).toBe('update')
			expect(event.data.data).toStrictEqual( { foo: 'bar' })
			expect(event.data.params).toStrictEqual({})
		})
	})
	
	test('makes correct patch request',  async () => {
		const { check } = await fakeRpcResponder('host-remote', { foo: 'bar' }, channel)
		const requester = new RpcRequester({ host: 'host-remote' }, channel)
		await requester.init()
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'patch', id: 'custom-id', path: 'remote-service', data: { foo: 'bar' }, params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'bar' })
		await check((event)  => {
			expect(event.data.id).toBe('custom-id')
			expect(event.data.type).toBe('patch')
			expect(event.data.data).toStrictEqual( { foo: 'bar' })
			expect(event.data.params).toStrictEqual({})
		})
	})
	
	test('makes correct remove request',  async () => {
		const { check } = await fakeRpcResponder('host-remote', { foo: 'bar' }, channel)
		const requester = new RpcRequester({ host: 'host-remote' }, channel)
		await requester.init()
		expect(requester instanceof RpcRequester).toBeTruthy()
		const response = await requester.send({
			type: 'remove', id: 'custom-id', path: 'remote-service', params: {}
		})
		
		expect(response).toStrictEqual({ foo: 'bar' })
		await check((event)  => {
			expect(event.data.id).toBe('custom-id')
			expect(event.data.type).toBe('remove')
			expect(event.data.params).toStrictEqual({})
		})
	})
	
	test('fails for timeout after 5s',  async () => {
		// const { check } = await fakeRpcResponder('host-remote', { foo: 'bar' }, channel)
		const requester = new RpcRequester({ host: 'failed-remote' }, channel)
		await requester.init()
		expect(requester instanceof RpcRequester).toBeTruthy()
		
		await requester.send({
			type: 'remove', id: 'custom-id', path: 'remote-service', params: {}
		}).catch(e => {
			expect(e.response.data.message).toBe( "Request timed out")
			expect(e.response.data.status).toBe( 408)
		})
	})
})