import { InterfaceMicroServicesOptions } from './types'

export const DEFAULT_PROTOCOL = 'http'
export const DEFAULT_TIMEOUT = 0
export const INTERNAL_REQUEST_HEADER = 'X-Internal-Request'

export const AXIOS_HTTP_METHODS = {
	find: 'get',
	get: 'get',
	create: 'post',
	update: 'put',
	patch: 'patch',
	remove: 'delete'
}

export const DEFAULT_EXCHANGE_NAME = 'microservices-services'
export const DEFAULT_EXCHANGE_SERVICES = 'microservices-services'
export const DEFAULT_EXCHANGE_EVENTS = 'microservices-events'

export enum MicroServiceType {
	HTTP = 'HTTP',
	RPC = 'RPC'
}

export const MicroServicesOptionsDefaults: InterfaceMicroServicesOptions = {
	url: 'amqp://localhost:5672',
	type: MicroServiceType.RPC,
	namespace: null,
	publish: false,
	register: false,
	debug: false,
	public: false,
	exchange: DEFAULT_EXCHANGE_NAME,
}


export default {
	DEFAULT_PROTOCOL,
	DEFAULT_TIMEOUT,
	INTERNAL_REQUEST_HEADER,
	AXIOS_HTTP_METHODS
}


