import { InterfaceMicroServicesOptions } from './types.d'
import { MicroService } from './microservice'

const init = function ( opts?: InterfaceMicroServicesOptions ) {
	return async function (app) {
		const microservice = new MicroService(app, opts)
		await microservice.init()
		
		return microservice
	}
}

init.default = init
export = init