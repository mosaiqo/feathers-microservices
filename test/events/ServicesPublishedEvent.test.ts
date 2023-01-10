import { describe, expect, jest, test } from '@jest/globals'
import { ServicesPublishedEvent } from '../../lib/events'

describe('ServicesPublishedEvent', () => {
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
		const event = ServicesPublishedEvent.create('id', 'key', 'host', [service])
		expect(event.id).toBe('id')
		expect(event.uuid).toBe('key')
		expect(event.key).toBe('key')
		expect(event.host).toBe('host')
		expect(event.services[0]).toBe(service)
		expect(event.data).toStrictEqual({"host": "host", "key": "key", "services": [service]})
		expect(event.toJson()).toStrictEqual({id:'id', key:'key', name: 'ServicesPublishedEvent', data: {"host": "host", "key": "key", "services": [service]}})
	})
	
	test('will fail on wrong event reconstruction',  async () => {
		const reconstruction = () => {
			ServicesPublishedEvent.reconstruct({id:'id', key:'key', name: 'WrongEvent', data: { host:'host', services: []}})
		}
		
		expect(reconstruction).toThrow(Error)
	})
	
	test('can be reconstructed',  async () => {
		const event = ServicesPublishedEvent.reconstruct({ id:'id', key:'key', name: 'ServicesPublishedEvent', data: { host:'host', services: [service] }})
		expect(event.id).toBe('id')
		expect(event.key).toBe('key')
		expect(event.host).toBe('host')
		expect(event.services[0]).toBe(service)
		expect(event.data).toStrictEqual({"host": "host", "key": "key", "services": [service]})
		expect(event.toJson()).toStrictEqual({id:'id', key:'key', name: 'ServicesPublishedEvent', data: {"host": "host", "key": "key", "services": [service]}})
	})
})