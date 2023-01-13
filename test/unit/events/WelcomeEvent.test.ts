import { describe, expect, jest, test } from '@jest/globals'
import { WelcomeEvent } from '../../../lib/events'

describe('WelcomeEvent', () => {
	const service = {
		name: 'service-1',
		key: 'key',
		service: 'service-1',
		host: 'host',
		path: 'service-1',
		methods: ['find', 'get', 'create', 'patch', 'remove'],
		events: ['created', 'updated', 'patched', 'removed']
	}
	
	test('can be created',  async () => {
		const event = WelcomeEvent.create('id', 'key', 'host', 'type', true, true, [service])
		expect(event.id).toBe('id')
		expect(event.key).toBe('key')
		expect(event.uuid).toBe('key')
		expect(event.host).toBe('host')
		expect(event.type).toBe('type')
		expect(event.registrar).toBe(true)
		expect(event.publisher).toBe(true)
		expect(event.services).toStrictEqual([service])
		expect(event.data).toStrictEqual({"host": "host", "key": "key", "type": "type", "registrar": true, "publisher": true, services: [service]})
		expect(event.toJson()).toStrictEqual({id:'id', key:'key', name: 'WelcomeEvent', data: {"host": "host", "key": "key", "type": "type", "registrar": true, "publisher": true, services: [service]}})
	})
	
	test('will fail on wrong event reconstruction',  async () => {
		const reconstruction = () => {
			WelcomeEvent.reconstruct({id:'id', key:'key', name: 'WrongEvent', data: { host:'host', type:'type', "registrar": true, "publisher": true, services: [service]}})
		}
		
		expect(reconstruction).toThrow(Error)
	})
	
	test('can be reconstructed',  async () => {
		const event = WelcomeEvent.reconstruct({id:'id', key:'key', name: 'WelcomeEvent', data: { host:'host', type:'type', "registrar": true, "publisher": true, "services": [service]}})
		expect(event.id).toBe('id')
		expect(event.key).toBe('key')
		expect(event.host).toBe('host')
		expect(event.type).toBe('type')
		expect(event.registrar).toBe(true)
		expect(event.publisher).toBe(true)
		expect(event.data).toStrictEqual({"host": "host", "key": "key", "type": "type", "registrar": true, "publisher": true, "services": [service]})
		expect(event.services).toStrictEqual([service])
		expect(event.toJson()).toStrictEqual({id:'id', key:'key', name: 'WelcomeEvent', data: {"host": "host", "key": "key", "type": "type", "registrar": true, "publisher": true, "services": [service]}})
	})
})