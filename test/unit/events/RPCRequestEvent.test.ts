import { describe, expect, jest, test } from '@jest/globals'
import { RPCRequestEvent } from '../../../lib/events'

describe('RPCRequestEvent', () => {
	test('can be created',  async () => {
		const event = RPCRequestEvent.create('id', 'key', 'type',  'path')
		expect(event.id).toBe('id')
		expect(event.uuid).toBeDefined()
		expect(event.key).toBe('key')
		expect(event.type).toBe('type')
		expect(event.path).toBe('path')
		expect(event.internalData).toStrictEqual(null)
		expect(event.data.params).toStrictEqual({})
		expect(event.toJson()).toStrictEqual({name: 'RPCRequestEvent', id: event.uuid, key: 'key', data: { id:'id', data: null, path:'path', type:'type', params: {} }})
	})
	
	test('will fail on wrong event reconstruction',  async () => {
		const reconstruction = () => {
			RPCRequestEvent.reconstruct({id:'id', key:'key', name: 'WrongEvent', data: { data: { foo: 'bar'}, path:'path', type:'type', params: {}   }})
		}
		
		expect(reconstruction).toThrow(Error)
	})
	
	test('can be reconstructed',  async () => {
		const event = RPCRequestEvent.reconstruct({name: 'RPCRequestEvent', key: 'key', uuid: 'custom-id', data: {id:'id', data: { foo: 'bar'}, path:'path', type:'type' , params: {} }})
		expect(event.id).toBe('id')
		expect(event.uuid).toBe('custom-id')
		expect(event.key).toBe('key')
		expect(event.type).toBe('type')
		expect(event.path).toBe('path')
		expect(event.internalData).toStrictEqual({ foo: 'bar'})
		expect(event.data).toStrictEqual({ id:'id', data: { foo: 'bar'}, path:'path', type:'type', params: {}} )
		expect(event.toJson()).toStrictEqual({name: 'RPCRequestEvent', id: 'custom-id', key: 'key', data: { id:'id', data: { foo: 'bar'}, path:'path', type:'type', params: {} }})
	})
})