export type EventType = string | symbol
export type Handler<T = any> = (event: T) => void
export type WildcardHandler<T = any> = (type: keyof T, event: T[keyof T]) => void
export type EventHandlerList<T = any> = Array<Handler<T>>
export type WildCardEventHandlerList<T = any> = Array<WildcardHandler<T>>
export type EventHandlerMap<T = any> = Map<
    keyof T | '*',
    EventHandlerList<T[keyof T]> | WildCardEventHandlerList<T>
>

export interface Emitter<T = any> {
    all: EventHandlerMap<T>
    on<Key extends keyof T>(type: Key, handler: Handler<T[Key]>): void
    on(type: '*', handler: WildcardHandler<T>): void
    off<Key extends keyof T>(type: Key, handler?: Handler<T[Key]>): void
    off(type: '*', handler?: WildcardHandler<T>): void
    emit<Key extends keyof T>(type: Key, event: T[Key]): void
}

export const mitt = <T = any>(
    all?: EventHandlerMap<T>,
): Emitter<T> => {
    all = all || new Map()

    return {
        all,

        on<Key extends keyof T>(type: Key | '*', handler: Handler<T[Key]> | WildcardHandler<T>) {
            const handlers = all!.get(type)
            if (handlers) {
                handlers.push(handler as any)
            } else {
                all!.set(type, [handler] as any)
            }
        },

        off<Key extends keyof T>(type: Key | '*', handler?: Handler<T[Key]> | WildcardHandler<T>) {
            const handlers = all!.get(type)
            if (handlers) {
                if (handler) {
                    handlers.splice(handlers.indexOf(handler as any) >>> 0, 1)
                } else {
                    all!.set(type, [])
                }
            }
        },

        emit<Key extends keyof T>(type: Key, evt: T[Key]) {
            let handlers = all!.get(type) as EventHandlerList<T[Key]> | undefined
            if (handlers) {
                handlers.slice().forEach((handler) => {
                    handler(evt)
                })
            }
            const wildcardHandlers = all!.get('*') as WildCardEventHandlerList<T> | undefined
            if (wildcardHandlers) {
                wildcardHandlers.slice().forEach((handler) => {
                    handler(type, evt as any)
                })
            }
        },
    }
}
