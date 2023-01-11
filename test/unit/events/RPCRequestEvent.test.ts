import { describe, expect, jest, test } from '@jest/globals'
import { RPCRequestEvent } from '../../../lib/events'

describe('RPCRequestEvent', () => {
	test('can be created',  async () => {
		const event = RPCRequestEvent.create('id', 'type',  'path', { foo: 'bar' })
		expect(event.id).toBe('id')
		expect(event._uuid).toBeDefined()
		expect(event.type).toBe('type')
		expect(event.path).toBe('path')
		expect(event.internalData).toStrictEqual({ foo: 'bar'})
		expect(event.data.params).toStrictEqual({})
		expect(event.toJson()).toStrictEqual({name: 'RPCRequestEvent', id: event.uuid, data: { id:'id', data: { foo: 'bar'}, path:'path', type:'type', params: {} }})
	})
	
	test('will fail on wrong event reconstruction',  async () => {
		const reconstruction = () => {
			RPCRequestEvent.reconstruct({id:'id', key:'key', name: 'WrongEvent', data: { data: { foo: 'bar'}, path:'path', type:'type', params: {}   }})
		}
		
		expect(reconstruction).toThrow(Error)
	})
	
	test('can be reconstructed',  async () => {
		const event = RPCRequestEvent.reconstruct({name: 'RPCRequestEvent', uuid: 'custom-id', data: {id:'id', data: { foo: 'bar'}, path:'path', type:'type' , params: {} }})
		expect(event.id).toBe('id')
		expect(event._uuid).toBe('custom-id')
		expect(event.type).toBe('type')
		expect(event.path).toBe('path')
		expect(event.internalData).toStrictEqual({ foo: 'bar'})
		expect(event.data).toStrictEqual({ id:'id', data: { foo: 'bar'}, path:'path', type:'type', params: {}} )
		expect(event.toJson()).toStrictEqual({name: 'RPCRequestEvent', id: 'custom-id', data: { id:'id', data: { foo: 'bar'}, path:'path', type:'type', params: {} }})
	})
})