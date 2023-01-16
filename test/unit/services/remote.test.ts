import { describe, expect, jest, test } from '@jest/globals'
import * as errors from '@feathersjs/errors'
import { HttpRequester } from '../../../lib/requesters/http'
import { RemoteService } from '../../../lib/service/remote'

describe('RemoteService', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})
	
	test('should instantiate correctly',  () => {
		const requester = new HttpRequester({})
		const service = new RemoteService('path', requester)
		
		expect(service.path).toBe('path')
		expect(service.remote).toBe(true)
		expect(service.requester instanceof HttpRequester).toBeTruthy()
	})
	
	test('find works as expected',  async () => {
		const requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockReturnValue([{ _id: '1234', name: 'Some Name'}])
		
		const requester = new HttpRequester({})
		const service = new RemoteService('path', requester)
		const result = await service.find()
		
		expect(requesterMock).toHaveBeenCalledWith({ type: 'find', path: 'path', params: { provider: 'remote' }})
		expect(result).toStrictEqual([{ _id: '1234', name: 'Some Name'}])
		expect(service.path).toBe('path')
		expect(service.remote).toBe(true)
		expect(service.requester instanceof HttpRequester).toBeTruthy()
	})
	test('find fails as expected',  async () =>{
		let requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {status: 404 } })
		const params = { type: 'find', path: 'path', params: { provider: 'remote' }}
		let throwThis = async () => {
			const requester = new HttpRequester({})
			const service = new RemoteService('path', requester)
			await service.find()
		}
		
		await expect(throwThis()).rejects.toThrow(errors.NotFound)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ code: 'ECONNABORTED' })
		
		
		await expect(throwThis()).rejects.toThrow(errors.FeathersError)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {} })
		
		
		await expect(throwThis()).rejects.toThrow(Error)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			.mockRejectedValue({ response: null })
			// @ts-ignore
			// .mockReturnValue(() => { throw new Error })
		
		await expect(throwThis()).rejects.toThrow(errors.BadGateway)
		expect(requesterMock).toHaveBeenCalledWith(params)
	})
	
	test('get works as expected',  async () => {
		const requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockReturnValue({ _id: '1234', name: 'Some Name'})
		
		const requester = new HttpRequester({})
		const service = new RemoteService('path', requester)
		const result = await service.get('1234', {})
		
		expect(requesterMock).toHaveBeenCalledWith({ type: 'get', path: 'path', id: '1234', params:  { provider: 'remote' }})
		expect(result).toStrictEqual({ _id: '1234', name: 'Some Name'})
		expect(service.path).toBe('path')
		expect(service.remote).toBe(true)
		expect(service.requester instanceof HttpRequester).toBeTruthy()
	})
	test('get fails as expected',  async () => {
		let requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {status: 404 } })
		const id = 'custom-id'
		const params = { type: 'get', path: 'path', id, params:  { provider: 'remote' }}
		let throwThis = async () => {
			const requester = new HttpRequester({})
			const service = new RemoteService('path', requester)
			await service.get(id, {})
		}
		
		await expect(throwThis()).rejects.toThrow(errors.NotFound)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ code: 'ECONNABORTED' })
		
		
		await expect(throwThis()).rejects.toThrow(errors.FeathersError)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {} })
		
		
		await expect(throwThis()).rejects.toThrow(Error)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			.mockRejectedValue({ response: null })
			// @ts-ignore
			// .mockReturnValue(() => { throw new Error })
		
		await expect(throwThis()).rejects.toThrow(errors.BadGateway)
		expect(requesterMock).toHaveBeenCalledWith(params)
	})
	
	test('create works as expected',  async () => {
		const requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockReturnValue({ _id: '1234', name: 'Some Name'})
		
		const requester = new HttpRequester({})
		const service = new RemoteService('path', requester)
		const result = await service.create({name: 'Some Name'}, {})
		
		expect(requesterMock).toHaveBeenCalledWith({ type: 'create', path: 'path', data: {name: 'Some Name'}, params:  { provider: 'remote' }})
		expect(result).toStrictEqual({ _id: '1234', name: 'Some Name'})
		expect(service.path).toBe('path')
		expect(service.remote).toBe(true)
		expect(service.requester instanceof HttpRequester).toBeTruthy()
	})
	test('create fails as expected',  async () => {
		let requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {status: 404 } })
		const data = {name: 'Some Name'}
		const params = { type: 'create', path: 'path', data, params:  { provider: 'remote' }}
		let throwThis = async () => {
			const requester = new HttpRequester({})
			const service = new RemoteService('path', requester)
			await service.create(data, {})
		}
		
		await expect(throwThis()).rejects.toThrow(errors.NotFound)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ code: 'ECONNABORTED' })
		
		
		await expect(throwThis()).rejects.toThrow(errors.FeathersError)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {} })
		
		
		await expect(throwThis()).rejects.toThrow(Error)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			.mockRejectedValue({ response: null })
			// @ts-ignore
			// .mockReturnValue(() => { throw new Error })
		
		await expect(throwThis()).rejects.toThrow(errors.BadGateway)
		expect(requesterMock).toHaveBeenCalledWith(params)
	})
	
	test('update works as expected',  async () => {
		const requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockReturnValue({ _id: '1234', name: 'Some Name'})
		
		const requester = new HttpRequester({})
		const service = new RemoteService('path', requester)
		const result = await service.update('1234', {name: 'Some Name'}, {})
		
		expect(requesterMock).toHaveBeenCalledWith({ type: 'update', path: 'path', id: '1234', data: {name: 'Some Name'}, params:  { provider: 'remote' }})
		expect(result).toStrictEqual({ _id: '1234', name: 'Some Name'})
		expect(service.path).toBe('path')
		expect(service.remote).toBe(true)
		expect(service.requester instanceof HttpRequester).toBeTruthy()
	})
	test('update fails as expected',  async () => {
		let requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {status: 404 } })
		const id = '1234'
		const data = {name: 'Some Name'}
		const params = { type: 'update', path: 'path', id, data, params: { provider: 'remote' }}
		let throwThis = async () => {
			const requester = new HttpRequester({})
			const service = new RemoteService('path', requester)
			await service.update(id, data, {})
		}
		
		await expect(throwThis()).rejects.toThrow(errors.NotFound)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ code: 'ECONNABORTED' })
		
		
		await expect(throwThis()).rejects.toThrow(errors.FeathersError)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {} })
		
		
		await expect(throwThis()).rejects.toThrow(Error)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			.mockRejectedValue({ response: null })
			// @ts-ignore
			// .mockReturnValue(() => { throw new Error })
		
		await expect(throwThis()).rejects.toThrow(errors.BadGateway)
		expect(requesterMock).toHaveBeenCalledWith(params)
	})
	
	test('patch works as expected',  async () => {
		const requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockReturnValue({ _id: '1234', name: 'Some Name'})
		
		const requester = new HttpRequester({})
		const service = new RemoteService('path', requester)
		const result = await service.patch('1234', {name: 'Some Name'}, {})
		
		expect(requesterMock).toHaveBeenCalledWith({ type: 'patch', path: 'path', id: '1234', data: {name: 'Some Name'}, params:  { provider: 'remote' }})
		expect(result).toStrictEqual({ _id: '1234', name: 'Some Name'})
		expect(service.path).toBe('path')
		expect(service.remote).toBe(true)
		expect(service.requester instanceof HttpRequester).toBeTruthy()
	})
	test('patch fails as expected',  async () => {
		let requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {status: 404 } })
		const id = '1234'
		const data = {name: 'Some Name'}
		const params = { type: 'patch', path: 'path', id, data, params:  { provider: 'remote' }}
		let throwThis = async () => {
			const requester = new HttpRequester({})
			const service = new RemoteService('path', requester)
			await service.patch(id, data, {})
		}
		
		await expect(throwThis()).rejects.toThrow(errors.NotFound)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ code: 'ECONNABORTED' })
		
		
		await expect(throwThis()).rejects.toThrow(errors.FeathersError)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {} })
		
		
		await expect(throwThis()).rejects.toThrow(Error)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			.mockRejectedValue({ response: null })
			// @ts-ignore
			// .mockReturnValue(() => { throw new Error })
		
		await expect(throwThis()).rejects.toThrow(errors.BadGateway)
		expect(requesterMock).toHaveBeenCalledWith(params)
	})
	
	test('remove works as expected',  async () => {
		const requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockReturnValue({ _id: '1234', name: 'Some Name'})
		
		const requester = new HttpRequester({})
		const service = new RemoteService('path', requester)
		const result = await service.remove('1234', {})
		
		expect(requesterMock).toHaveBeenCalledWith({ type: 'remove', path: 'path', id: '1234', params:  { provider: 'remote' }})
		expect(result).toStrictEqual({ _id: '1234', name: 'Some Name'})
		expect(service.path).toBe('path')
		expect(service.remote).toBe(true)
		expect(service.requester instanceof HttpRequester).toBeTruthy()
	})
	test('remove fails as expected',  async () => {
		let requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {status: 404 } })
		const id = 'custom-id'
		const params = { type: 'remove', path: 'path', id, params:  { provider: 'remote' }}
		let throwThis = async () => {
			const requester = new HttpRequester({})
			const service = new RemoteService('path', requester)
			await service.remove(id, {})
		}
		
		await expect(throwThis()).rejects.toThrow(errors.NotFound)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ code: 'ECONNABORTED' })
		
		
		await expect(throwThis()).rejects.toThrow(errors.FeathersError)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			// @ts-ignore
			.mockRejectedValue({ response: {} })
		
		
		await expect(throwThis()).rejects.toThrow(Error)
		expect(requesterMock).toHaveBeenCalledWith(params)
		
		
		requesterMock = jest
			.spyOn(HttpRequester.prototype, 'send')
			.mockRejectedValue({ response: null })
		// @ts-ignore
		// .mockReturnValue(() => { throw new Error })
		
		await expect(throwThis()).rejects.toThrow(errors.BadGateway)
		expect(requesterMock).toHaveBeenCalledWith(params)
	})
})