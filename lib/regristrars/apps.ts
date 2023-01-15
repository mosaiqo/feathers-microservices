import { HelloEvent } from '../events'
import { InterfaceRegistrar } from '../types'

export class AppsRegistrar implements InterfaceRegistrar {
	app
	constructor (app) {
		this.app = app
	}
	
	async init() {}
	
	static async create(app) {
		const instance = new AppsRegistrar(app)
		await instance.init()
		return instance
	}
	
	register(event: HelloEvent) {
		this.app.microservices[event.uuid] = event.data
	}
}

export default AppsRegistrar