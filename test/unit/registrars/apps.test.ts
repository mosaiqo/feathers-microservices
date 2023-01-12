import { describe, expect, test } from '@jest/globals'
import { feathers } from '@feathersjs/feathers'
import { HelloEvent } from '../../../lib/events'
import { AppsRegistrar } from '../../../lib/regristrars'

describe('Apps Registrars', () => {
	let app = feathers()
	app.microservices = {}
	
	test('it should register a new app on an HelloEvent',  () => {
		const registrar = new AppsRegistrar(app)
		registrar.register(HelloEvent.create('app-id', 'app-key', 'host', 'HTTP'))
		expect(registrar.app).toBe(app)
		expect(app.microservices).toStrictEqual({"app-key": { "host": "host", "key": "app-key", "type": "HTTP"}})
	})
})