import * as errors from '@feathersjs/errors'
import { feathers } from '@feathersjs/feathers'
import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
import mockAmqplib from 'mock-amqplib'
import microservices from '../../lib'
import { amqpUrl } from '../configs'

jest.mock('amqplib')
jest.mock('amqplib', () => ({
	connect: () => mockAmqplib.connect()
}))

describe('Feathers plugin', () => {
	test('it instantiate properly', async () => {
		const app = feathers()
		app.configure(microservices({ url: amqpUrl }))
		
		expect(app.microservices).toBeDefined()
		expect(app.microservice).toBeDefined()
	})
})