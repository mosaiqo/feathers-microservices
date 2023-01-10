import * as errors from '@feathersjs/errors'

export const errorHandler = function (error) {
	const { convert } = errors
	const err = error.response ? error.response.data || error.response : error
	let feathersError
	if (error.response) {
		if (err.status === 404) {
			feathersError = new errors.NotFound(err)
		}
	} else if (err.code) {
		if (err.code === 'ECONNABORTED') {
			// @ts-ignore
			feathersError = new errors.FeathersError(err, 'GatewayTimeout', 504, 'gateway-timeout')
		}
	} else {
		feathersError = new errors.BadGateway(err)
	}
	
	if (!feathersError) {
		feathersError = convert(err)
	}
	
	delete feathersError.isAxiosError
	delete feathersError.config
	
	return feathersError
}

export default errorHandler
