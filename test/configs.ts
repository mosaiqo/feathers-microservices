/* istanbul ignore file */
import { expect, jest } from '@jest/globals'
import * as amqplib from 'amqplib'
import { DEFAULT_EXCHANGE_NAME } from '../lib/constants'
import { RPCRequestEvent } from '../lib/events'
import { v4 } from 'uuid'
import { clear } from './_mocks/AmqpLibMock'

export const mockIt = false
let testUrl = 'amqp://localhost:5672'
let devUrl = 'amqp://development:secret12345678@localhost:5672'

export const amqpUrl = mockIt ? testUrl : devUrl
let connection, channel, client

export const fakeRpcRequester = async (queue, topic, data, channel, timesOut = false) => {
	let event = null
	const correlationId = 'custom-correlation-id'
	const replyTo = await channel.assertQueue('test-reply-queue', { durable: false })
	
	channel.publish(queue, topic, Buffer.from(JSON.stringify(data)), { correlationId, replyTo: replyTo.queue })
	
	channel.consume(replyTo.queue, async (msg) => {
		event = JSON.parse(`${Buffer.from(msg.content)}`)
	},{ noAck: true })
	
	return {
		check: async function (cb, id = null) {
			await new Promise((r) => setTimeout(r, 20))
			await cb(event)
		},
	}
}

export const fakeRpcResponder = async (queue, {exchange, service, topic}, event: RPCRequestEvent, channel, timesOut = false) => {
	let receivedEvent = null
	channel.assertQueue(queue)
	channel.bindQueue(queue, exchange, topic)
	channel.consume(queue, async (msg) => {
		receivedEvent = JSON.parse(`${Buffer.from(msg.content)}`)
		expect(receivedEvent.name).toBe('RPCRequestEvent')
		
		expect(msg.properties.correlationId).toBeDefined()
		expect(msg.properties.replyTo).toBeDefined()
		// await channel.bindQueue(msg.properties.replyTo, '', '')
		channel.sendToQueue(
			msg.properties.replyTo,
			Buffer.from(JSON.stringify(event.toJson())),
			{ correlationId: msg.properties.correlationId }
		)
	})
	
	return {
		check: async function (cb, id = null) {
			await new Promise((r) => setTimeout(r, 20))
			await cb(receivedEvent)
		},
	}
}
let consumerTagCounter = 0
export const fakeConnection = async (config = {}) => {
	consumerTagCounter++
	let events = []
	const defaultQueue = 'microservices-test-queue'
	let { exchange , queue, topics } = {
		exchange: DEFAULT_EXCHANGE_NAME,
		queue: defaultQueue,
		topics: [''],
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
	
	await channel.assertExchange(exchange, 'topic', { durable: false })
	
	await channel.assertQueue(consumerTag, { exclusive: true })
	await channel.purgeQueue(consumerTag)
	// console.log('Binding queue fake-queue to exchange fake-services')
	for (const topic of topics) {
		// console.log(exchange, consumerTag, topic)
		await channel.bindQueue(consumerTag, exchange, topic)
	}
	
	await channel.consume(consumerTag, async (data) => {
		await new Promise((r) => setTimeout(r, 500))
		const eventData = JSON.parse(`${Buffer.from(data.content)}`)
		// Comment out for log purposes
		// console.log('Event received', data, eventData)
		events.push({...eventData, date: new Date()})
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
		check: async function (cb, timeout = 550, clearAmqp = true) {
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
