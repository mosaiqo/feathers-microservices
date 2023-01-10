import http from 'http'
import https from 'https'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import * as errors from '@feathersjs/errors'
import { InterfaceRequester } from '../types'

import {
	DEFAULT_PROTOCOL,
	DEFAULT_TIMEOUT,
	INTERNAL_REQUEST_HEADER,
	AXIOS_HTTP_METHODS
} from '../constants'

export class HttpRequester implements InterfaceRequester {
	protocol
	host
	port
	dnsSuffix
	pathToHost
	timeout
	proxy
	excludeParams
	maxRedirects
	keepAlive
	internalRequestHeader
	
	constructor (options) {
		options = {
			...options.serviceConfig,
			...options
		}
		this.protocol = options.protocol || DEFAULT_PROTOCOL
		this.host = options.host
		this.port = options.port
		this.dnsSuffix = options.dnsSuffix || ''
		this.pathToHost = options.pathToHost
		this.timeout = options.timeout || DEFAULT_TIMEOUT
		this.proxy = options.proxy
		this.excludeParams = options.excludeParams
		this.maxRedirects = options.maxRedirects
		this.keepAlive = options.keepAlive
		this.internalRequestHeader = options.internalRequestHeader || INTERNAL_REQUEST_HEADER
		
		if (options.retry) { axiosRetry(axios, options.retry) }
	}
	
	async init () {}
	
	async send (options) {
		// @ts-ignore
		const { type, path, id, data, params } = { params: {}, ...options }
		const serviceProtocol = params.protocol || this.protocol
		const serviceHostPrefix = (params.host || this.host)
		const servicePort = params.port || this.port || this.getProtocolPort(serviceProtocol)
		
		this.validateProtocol(serviceProtocol)
		this.validateHost(serviceHostPrefix)
		this.validatePort(servicePort)
		
		const dnsSuffix = params.dnsSuffix !== undefined ? params.dnsSuffix : this.dnsSuffix
		const serviceHost = serviceHostPrefix + dnsSuffix
		
		const url = this.getUrl(serviceProtocol, serviceHost, servicePort, path, id)
		
		let proxy = {
			...this.proxy,
			...params.proxy
		}
		
		if (!Object.keys(proxy).length) { proxy = false }
		
		if (params.headers) {
			delete params.headers['content-length']
			delete params.headers['upgrade']
			delete params.headers['connection']
		}
		
		const requestOptions = {
			proxy,
			headers: {
				'content-type': 'application/json',
				[this.internalRequestHeader]: JSON.stringify(this.filterParams(params)),
				...params.headers
			},
			timeout: params.timeout !== undefined ? params.timeout : this.timeout
		}
		if (this.maxRedirects !== undefined) {
			// @ts-ignore
			requestOptions.maxRedirects = this.maxRedirects
		}
		
		if (this.keepAlive) {
			// @ts-ignore
			requestOptions.httpAgent = new http.Agent({ keepAlive: true })
			// @ts-ignore
			requestOptions.httpsAgent = new https.Agent({ keepAlive: true })
		}
		
		const httpMethod = AXIOS_HTTP_METHODS[type]
		const args = data ? [url, data, requestOptions] : [url, requestOptions]
		const result = await axios[httpMethod](...args)
		return result.data
	}
	
	validateProtocol (value) {
		if (value !== 'http' && value !== 'https') { throw new errors.BadRequest(`Invalid protocol ${ value }`) }
	}
	
	validateHost (value) {
		if (!value) { throw new errors.BadRequest('Missing host') }
	}
	
	validatePort (value) {
		if (!(value > 0 && value <= 65535)) { throw new errors.BadRequest(`Invalid port ${ value }`) }
	}
	
	getProtocolPort (protocol) {
		if (protocol === 'http') { return 80 } else if (protocol === 'https') { return 443 }
	}
	
	getUrl (protocol, host, port, path, id) {
		const fullPath = id ? `${ path }/${ this.idToString(id) }` : path
		const isKnownPort = (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)
		let url = `${ protocol }://${ host }`
		
		if (!isKnownPort) { url += `:${ port }` }
		
		url += `/${ fullPath }`
		
		return url
	}
	
	filterParams (params) {
		if (!this.excludeParams) { return params }
		const result = { ...params }
		
		for (const param of this.excludeParams) { delete result[param] }
		
		return result
	}
	
	idToString (id) {
		if (typeof id === 'object') { return JSON.stringify(id) }
		
		return `${ id }`
	}
}

export default HttpRequester
