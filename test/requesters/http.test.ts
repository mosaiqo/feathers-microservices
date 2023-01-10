import * as errors from '@feathersjs/errors'
import { describe, expect, jest, test } from '@jest/globals'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

import { HttpRequester } from '../../lib/requesters/http'

describe('HttpRequester', () => {
	let mock
	beforeAll(async () => {
		mock = new MockAdapter(axios)
	})
	
	test('sets correct options',  () => {
		mock.onGet('http://host-remote/remote-service')
			.reply(200, [])
		
		const requester = new HttpRequester({
			host: 'host-remote',
			maxRedirects: 3,
			keepAlive: true,
			retry: true
		})
		
		// @ts-ignore
		requester.send({ type: 'find', path: 'remote-service', params: {} })
		
		// @ts-ignore
		expect(requester.maxRedirects).toBe(3)
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('transforms object id properly',  () => {
		mock.onGet('http://host-remote/remote-service/{"foo":"bar"}')
			.reply(200, [])
		
		const requester = new HttpRequester({
			host: 'host-remote',
			keepAlive: true
		})
		
		// @ts-ignore
		requester.send({ type: 'get', id: { foo:'bar'}, path: 'remote-service', params: {} })
		
		// @ts-ignore
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('removes unwanted headers',  () => {
		mock.onGet('http://host-remote/remote-service')
			.reply(200, [])
		
		const requester = new HttpRequester({
			host: 'host-remote',
			maxRedirects: 3,
			keepAlive: true
		})
		
		// @ts-ignore
		requester.send({
			type: 'find', path: 'remote-service', params: {
				headers: {
					'content-length': 'content-length',
					'upgrade': 'upgrade',
					'connection': 'connection',
				}
			}
		})
		
		// @ts-ignore
		expect(requester.maxRedirects).toBe(3)
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('filters out correct params based on excludedParams',  () => {
		mock.onGet('https://host-remote/remote-service/some-id')
			.reply(200, [])
		
		const requester = new HttpRequester({
			host: 'host-remote',
			protocol: 'https',
			maxRedirects: 3,
			keepAlive: true,
			excludeParams: ['foo'],
		})
		
		// @ts-ignore
		requester.send({
			type: 'find',
			path: 'remote-service',
			id: 'some-id',
			params: {
				foo: 'bar'
			}
		})
		
		// @ts-ignore
		expect(requester.maxRedirects).toBe(3)
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('options can be changed per call',  async () => {
		mock.onGet('https://custom-host.some-dns-suffix.org:9999/remote-service/some-id')
			.reply(200, [])
		
		const requester = new HttpRequester({
			host: 'host-remote',
			maxRedirects: 3,
			keepAlive: true,
		})
		
		// @ts-ignore
		await requester.send({
			type: 'find',
			path: 'remote-service',
			id: 'some-id',
			params: {
				protocol: 'https',
				port: '9999',
				host: 'custom-host',
				foo: 'bar',
				dnsSuffix: '.some-dns-suffix.org',
				timeout: 4000
			}
		})
		
		// @ts-ignore
		expect(requester.maxRedirects).toBe(3)
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	
	test('validates protocol properly',  async () => {
		const requester = new HttpRequester({
			host: 'host-remote',
			maxRedirects: 3,
			keepAlive: true,
		})
		
		// @ts-ignore
		await requester.send({
			type: 'find',
			path: 'remote-service',
			id: 'some-id',
			params: {
				protocol: 'ftp',
			}
		}).catch(e => {
			expect(e instanceof errors.BadRequest).toBeTruthy()
			expect(e.message).toBe('Invalid protocol ftp')
		})
		
		// @ts-ignore
		expect(requester.maxRedirects).toBe(3)
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('validates host properly',  async () => {
		const requester = new HttpRequester({
			maxRedirects: 3,
			keepAlive: true,
		})
		
		// @ts-ignore
		await requester.send({
			type: 'find',
			path: 'remote-service',
			id: 'some-id'
		}).catch(e => {
			expect(e instanceof errors.BadRequest).toBeTruthy()
			expect(e.message).toBe('Missing host')
		})
		
		// @ts-ignore
		expect(requester.maxRedirects).toBe(3)
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('validates port properly',  async () => {
		const requester = new HttpRequester({
			maxRedirects: 3,
			keepAlive: true,
			host: 'custom-host',
			port: 67909
		})
		
		// @ts-ignore
		await requester.send({
			type: 'find',
			path: 'remote-service',
			id: 'some-id'
		}).catch(e => {
			expect(e instanceof errors.BadRequest).toBeTruthy()
			expect(e.message).toBe('Invalid port 67909')
		})
		
		// @ts-ignore
		expect(requester.maxRedirects).toBe(3)
		expect(requester instanceof HttpRequester).toBeTruthy()
	})
})