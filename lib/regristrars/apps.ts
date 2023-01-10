import { HelloEvent } from '../events'
import { InterfaceRegistrar } from '../types'

export class AppsRegistrar implements InterfaceRegistrar {
	app
	constructor (app) {
		this.app = app
	}
	
	init() {}
	
	register(event: HelloEvent) {
		this.app.microservices[event.uuid] = event.data
	}
}

export default AppsRegistrar