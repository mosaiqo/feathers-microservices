/* istanbul ignore file */
import { describe, expect, jest, test } from '@jest/globals'
import * as amqplib from 'amqplib'
export const mockIt = false
let testUrl = 'amqp://localhost:5672'
let devUrl = 'amqp://development:secret12345678@localhost:5672'

export const amqpUrl = mockIt ? testUrl : devUrl
let connection, channel

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
export const fakeConnection = async (config = {}) => {
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
	if (!connection) {
		connection = await amqplib.connect(amqpUrl)
	}
	
	if (!channel) {
		channel = await connection.createChannel()
	}
	
	await channel.assertExchange(exchanges.services, 'fanout', { durable: false })
	await channel.assertExchange(exchanges.events, 'fanout', { durable: false })
	
	await channel.assertQueue(queue)
	// console.log('Binding queue fake-queue to exchange fake-services')
	await channel.bindQueue(queue, exchanges.services, '')
	
	await channel.consume(queue, (data) => {
		const eventData = JSON.parse(`${Buffer.from(data.content)}`)
		// Comment out for log purposes
		// console.log('=================== FakeConnection ====================== \n',eventData, '\n','=================== End ======================')
		// console.log('Event received', eventData)
		events.push(eventData)
		channel.ack(data)
	}, {consumerTag: queue})
	const purge = async () => {
		events = []
		await channel.purgeQueue(queue)
		// channel.cancel(queue)
		// channel.close()
	}
	
	return {
		events: events,
		channel,
		check: async function (cb, id = null) {
			await new Promise((r) => setTimeout(r, 2000))
			await cb(id ? events.filter(e => e.id === id) : events)
			await purge()
		},
		purge
	}
}


beforeEach(() => {
	jest.clearAllMocks()
})
