import {
	ServiceAddons as FeathersServiceAddons,
	FeathersService,
	Service as FService,
	ServiceInterface,
	Application as FeathersApplication
} from '@feathersjs/feathers/lib/declarations'

import { Channel, Connection } from 'amqplib'
import { EventEmitter } from 'events'
import { AmqpClient } from './clients'
import { HelloEvent, RPCRequestEvent, ServicesPublishedEvent, WelcomeEvent } from './events'
import { MicroServiceType } from './constants'

export declare interface InterfaceRequester {
	consumer?: InterfaceConsumer
	publisher?: InterfacePublisher
	
	init ()
	
	send (options)
	
	filterParams (params)
	
	idToString (id)
}

export declare interface InterfaceExchanges {
	services: string,
	events: string
}

export declare interface InterfaceMicroServicesOptions {
	id?: string,
	key?: string,
	queue?: string,
	namespace?: string | null,
	url?: string,
	register?: boolean,
	publish?: boolean,
	host?: string,
	service?: string
	name?: string
	exchange?: string
	type?: MicroServiceType
	public?: boolean | any
	debug?: boolean | string
	events?: Array<string>,
	methods?: Array<string>,
}

declare module '@feathersjs/feathers' {
	interface Application<Services = any, Settings = any> {
		microservices: {},
		
		/**
		 * Get the Feathers service instance for a path. This will
		 * be the service originally registered with Feathers functionality
		 * like hooks and events added.
		 *
		 * @param path The name of the service.
		 */
		microservice<L extends keyof Services & string> (
			path: L
		): FeathersService<this, keyof any extends keyof Services ? Service : Services[L]>
	}
	
	interface ServiceAddons<A = FeathersApplication, S = FService> {
		path: string
		
		remote: boolean
		
		requester: any
	}
}

export declare interface InterfaceAmqpClient {
	url: string,
	connection: Connection
	channel: Channel
	options
}

export declare type AmqpClientConnection = {
	client: AmqpClient,
	channel: Channel,
	connection: Connection,
}

export declare interface InterfaceConsumer {
	init ()
}

export declare interface InterfaceConsumer {
	onHello (cb?: Awaited<(event: HelloEvent) => Promise<void>>): Promise<void>
	
	onWelcome (cb?: Awaited<(event: WelcomeEvent) => Promise<void>>): Promise<void>
	
	onServicesPublished (cb?: Awaited<(event: any) => Promise<void>>): Promise<void>
	
	onRpcRequest (cb?: Awaited<(event: any, p: any) => Promise<void>>): Promise<void>
	
	onRpcResponse (cb?: Awaited<(event: any, p: any) => Promise<void>>): Promise<void>
	
	onUnknownPublished (cb?: Awaited<(event: any) => Promise<void>>): Promise<void>
}

export declare interface InterfacePublisher {
	init ()
	
}

export declare interface InterfacePublisher {
	emitServices (event: ServicesPublishedEvent): Promise<void>
	
	emitGreet (event: HelloEvent): Promise<void>
	
	emitWelcome (event: WelcomeEvent): Promise<void>
	
	requestRpc (event: RPCRequestEvent, p: any): Promise<void>
}

export declare interface InterfaceRegistrar {
	init ()
	
	register (event: HelloEvent)
}

type Registrar = InterfaceRegistrar
type Publisher = InterfacePublisher
type Consumer = InterfaceConsumer

type ConsumerMap = {
	[key: string]: Consumer
}

type PublisherMap = {
	[key: string]: Publisher
}

type RegistrarMap = {
	[key: string]: Registrar
}

export declare interface Service extends ServiceInterface {
	path: string
	remote: boolean
	requester: any
}
