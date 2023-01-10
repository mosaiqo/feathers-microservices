import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import mockAmqplib from 'mock-amqplib'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { AmqpClient } from '../../lib/clients'
import { Requester } from '../../lib/requesters'
import { HttpRequester } from '../../lib/requesters/http'
import { RpcRequester } from '../../lib/requesters/rpc'

jest.mock('amqplib')
jest.mock('amqplib', () => ({
	connect: () => mockAmqplib.connect()
}))
describe('Requester Factory', () => {
	let mock
	beforeAll(async () => {
		mock = new MockAdapter(axios)
	})
	
	test('should return a rcp requester by default',  async () => {
		const client = new AmqpClient('some-url')
		const channel = await client.connect()
		const requester = await Requester.create({ key: 'test-key' }, channel, null)
		expect(requester instanceof RpcRequester).toBeTruthy()
	})
	
	test('should return a http requester',  async () => {
		const requester = await Requester.create({ key: 'test-key' },  null,'HTTP')
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('should return a rcp requester',  async () => {
		const client = new AmqpClient('some-url')
		const channel = await client.connect()
		const requester = await Requester.create({ key: 'test-key' }, channel, 'RPC')
		expect(requester instanceof RpcRequester).toBeTruthy()
	})
	
	test('should return a rpc requester if wrong type provided',  async () => {
		const client = new AmqpClient('some-url')
		const channel = await client.connect()
		const requester = await Requester.create({ key: 'test-key' }, channel, 'other')
		expect(requester instanceof RpcRequester).toBeTruthy()
	})
	
	test('should throw error if RPC requested but no channel provided',   async () => {
		Requester.create({ key: 'test-key'}, null, null).catch(e => {
			expect(e instanceof Error).toBeTruthy()
			expect(e.message).toBe('If RPC type selected you need to provide a channel instance')
		})
	})
})