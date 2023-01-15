import { describe, expect, jest, test } from '@jest/globals'
import { HelloEvent } from '../../../lib/events'

describe('HelloEvent', () => {
	test('can be created',  async () => {
		const event = HelloEvent.create('id', 'key', 'host', 'type', { app: 'app', service: 'service' },true, true)
		expect(event.id).toBe('id')
		expect(event.key).toBe('key')
		expect(event.uuid).toBe('key')
		expect(event.host).toBe('host')
		expect(event.type).toBe('type')
		expect(event.registrar).toBe(true)
		expect(event.publisher).toBe(true)
		expect(event.data).toStrictEqual({"host": "host", "key": "key", "type": "type", "registrar": true, "publisher": true, "queues": { app: 'app', service: 'service' }})
		expect(event.toJson()).toStrictEqual({id:'id', key:'key', name: 'HelloEvent', data: {"host": "host", "key": "key", "type": "type", "registrar": true, "publisher": true, "queues": { app: 'app', service: 'service' }}})
	})
	
	test('will fail on wrong event reconstruction',  async () => {
		const reconstruction = () => {
			HelloEvent.reconstruct({id:'id', key:'key', name: 'WrongEvent', data: { host:'host', type:'type', "registrar": true, "publisher": true, "queues": { app: 'app', service: 'service' } }})
		}
		
		expect(reconstruction).toThrow(Error)
	})
	
	test('can be reconstructed',  async () => {
		const event = HelloEvent.reconstruct({id:'id', key:'key', name: 'HelloEvent', data: { host:'host', type:'type', "registrar": true, "publisher": true, "queues": { app: 'app', service: 'service' }}})
		expect(event.id).toBe('id')
		expect(event.key).toBe('key')
		expect(event.host).toBe('host')
		expect(event.type).toBe('type')
		expect(event.registrar).toBe(true)
		expect(event.publisher).toBe(true)
		expect(event.data).toStrictEqual({"host": "host", "key": "key", "type": "type", "registrar": true, "publisher": true, "queues": { app: 'app', service: 'service' }})
		expect(event.toJson()).toStrictEqual({id:'id', key:'key', name: 'HelloEvent', data: {"host": "host", "key": "key", "type": "type", "registrar": true, "publisher": true, "queues": { app: 'app', service: 'service' }}})
	})
})