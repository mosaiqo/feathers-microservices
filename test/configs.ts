/* istanbul ignore file */
import { expect, jest } from '@jest/globals'
import * as amqplib from 'amqplib'
import { v4 } from 'uuid'
import { clear } from './_mocks/AmqpLibMock'

export const mockIt = false
let testUrl = 'amqp://localhost:5672'
let devUrl = 'amqp://development:secret12345678@localhost:5672'

export const amqpUrl = mockIt ? testUrl : devUrl
let connection, channel, client

export const fakeRpcRequester = async (queue, data, channel, timesOut = false) => {
	let event = null
	queue = `${queue}-service`
	const correlationId = 'custom-correlation-id'
	const replyTo = await channel.assertQueue('test-reply-queue', { durable: false })
	channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { correlationId, replyTo: replyTo.queue })
	
	channel.consume(replyTo.queue, async (msg) => {
		event = JSON.parse(`${Buffer.from(msg.content)}`)
	},{ noAck: true })
	
	return {
		check: async function (cb, id = null) {
			await new Promise((r) => setTimeout(r, 2000))
			await cb(event)
		},
	}
}

export const fakeRpcResponder = async (queue, data, channel, timesOut = false) => {
	let event = null
	queue = `${queue}-service`
	channel.assertQueue(queue)
	channel.consume(queue, async (msg) => {
		event = JSON.parse(`${Buffer.from(msg.content)}`)
		expect(event.name).toBe('RPCRequestEvent')
		
		expect(msg.properties.correlationId).toBeDefined()
		expect(msg.properties.replyTo).toBeDefined()
		
		await channel.bindQueue(msg.properties.replyTo, '', '')
		channel.publish(
			'', '', Buffer.from(JSON.stringify(data)), { correlationId: msg.properties.correlationId }
		)
	})
	
	return {
		check: async function (cb, id = null) {
			await new Promise((r) => setTimeout(r, 2000))
			await cb(event)
		},
	}
}
let consumerTagCounter = 0
export const fakeConnection = async (config = {}) => {
	consumerTagCounter++
	let events = []
	const defaultQueue = 'microservices-test-queue'
	let { exchanges , queue } = {
		exchanges: {
			services: 'microservices-services',
			events: 'microservices-events'
		},
		queue: defaultQueue,
		...config
	}
	const uuid = v4()
	const consumerTag = `${queue}-${consumerTagCounter}-${uuid}`
	
	if (!connection) {
		connection = await amqplib.connect(amqpUrl, {clientProperties: { connection_name: 'fakeConnection'}})
	}
	
	if (!channel) {
		channel = await connection.createChannel()
	}
	
	await channel.assertExchange(exchanges.services, 'fanout', { durable: false })
	await channel.assertExchange(exchanges.events, 'fanout', { durable: false })
	
	await channel.assertQueue(consumerTag, { exclusive: true })
	await channel.purgeQueue(consumerTag)
	// console.log('Binding queue fake-queue to exchange fake-services')
	await channel.bindQueue(consumerTag, exchanges.services, '')
	
	await channel.consume(consumerTag, async (data) => {
		await new Promise((r) => setTimeout(r, 500))
		const eventData = JSON.parse(`${Buffer.from(data.content)}`)
		// Comment out for log purposes
		// console.log('Event received', data, eventData)
		events.push(eventData)
		channel.ack(data)
	}, {consumerTag})
	const purge = async () => {
		events = []
		console.log(await channel.checkQueue(consumerTag))
		await channel.purgeQueue(consumerTag)
		channel.cancel(consumerTag)
		channel.deleteExchange('microservices-services')
		console.log(await channel.checkQueue(consumerTag))
	}
	
	return {
		close: async function () {
			await new Promise((r) => setTimeout(r, 1000))
			connection.close()
		},
		check: async function (cb, timeout = 4000, clearAmqp = true) {
			await new Promise((r) => setTimeout(r, timeout))
			await cb(events)
			if (clearAmqp) {
				await clear()
			}
		},
		clear,
		purge
	}
}

export const closeConnections = async (connections) => {
	const { close } = await fakeConnection()
	close()
	
	for (const client of connections) {
		try {
			if (client){
				await client.close()
			}
		} catch (e) {
			console.log(e)
		}
	}
	connections = []
}


// jest.mock('amqplib', () => ({
// 	connect: () => mockAmqplib.connect()
// }))

beforeEach(() => {
	jest.clearAllMocks()
})
