/**
 * Event Emitter implementation
 */

import { EventName, IEventEmitter } from '../types/events';
import { Logger } from '../utils/Logger';

/**
 * Event handler with metadata
 */
interface HandlerEntry<T = unknown> {
  handler: (event: T) => void | Promise<void>;
  once: boolean;
  async: boolean;
  priority: number;
}

/**
 * Event Emitter class
 */
export class EventEmitter implements IEventEmitter {
  private events = new Map<EventName, HandlerEntry[]>();
  private maxListeners = 10;
  private logger = Logger.getInstance();

  /**
   * Add an event listener
   */
  on<T>(
    event: EventName,
    handler: (event: T) => void | Promise<void>,
    config?: { once?: boolean; async?: boolean; priority?: number },
  ): void {
    const entry: HandlerEntry<T> = {
      handler: handler as (event: unknown) => void | Promise<void>,
      once: config?.once ?? false,
      async: config?.async ?? false,
      priority: config?.priority ?? 0,
    };

    const handlers = this.events.get(event) ?? [];

    // Check max listeners
    if (handlers.length >= this.maxListeners) {
      this.logger.warn(
        `MaxListenersExceeded: Event '${event}' has ${handlers.length} listeners. ` +
          `Consider increasing maxListeners or removing unused listeners.`,
      );
    }

    // Add handler and sort by priority (higher priority first)
    handlers.push(entry as HandlerEntry);
    handlers.sort((a, b) => b.priority - a.priority);

    this.events.set(event, handlers);
  }

  /**
   * Add a one-time event listener
   */
  once<T>(
    event: EventName,
    handler: (event: T) => void | Promise<void>,
    config?: { async?: boolean; priority?: number },
  ): void {
    this.on(event, handler, { ...config, once: true });
  }

  /**
   * Remove an event listener
   */
  off<T>(event: EventName, handler: (event: T) => void | Promise<void>): void {
    const handlers = this.events.get(event);
    if (!handlers) return;

    const index = handlers.findIndex((entry) => entry.handler === handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      this.events.delete(event);
    } else {
      this.events.set(event, handlers);
    }
  }

  /**
   * Emit an event
   */
  emit<T>(event: EventName, data: T): void {
    const handlers = this.events.get(event);
    if (!handlers || handlers.length === 0) return;

    // Create a copy to avoid modification during iteration
    const handlersToExecute = [...handlers];

    // Remove once handlers
    const remainingHandlers = handlers.filter((entry) => !entry.once);
    if (remainingHandlers.length > 0) {
      this.events.set(event, remainingHandlers);
    } else {
      this.events.delete(event);
    }

    // Execute handlers
    for (const entry of handlersToExecute) {
      try {
        if (entry.async) {
          // Execute async handlers without waiting
          void this.executeAsyncHandler(entry.handler, data, event);
        } else {
          // Execute sync handlers
          const result = entry.handler(data);
          if (result instanceof Promise) {
            // Handle unexpected promise from sync handler
            void result.catch((error) => {
              this.handleError(error, event);
            });
          }
        }
      } catch (error) {
        this.handleError(error, event);
      }
    }
  }

  /**
   * Emit an event and wait for all handlers
   */
  async emitAsync<T>(event: EventName, data: T): Promise<void> {
    const handlers = this.events.get(event);
    if (!handlers || handlers.length === 0) return;

    // Create a copy to avoid modification during iteration
    const handlersToExecute = [...handlers];

    // Remove once handlers
    const remainingHandlers = handlers.filter((entry) => !entry.once);
    if (remainingHandlers.length > 0) {
      this.events.set(event, remainingHandlers);
    } else {
      this.events.delete(event);
    }

    // Execute all handlers and wait
    const promises: Promise<void>[] = [];

    for (const entry of handlersToExecute) {
      promises.push(this.executeAsyncHandler(entry.handler, data, event));
    }

    await Promise.all(promises);
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: EventName): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: EventName): number {
    return this.events.get(event)?.length ?? 0;
  }

  /**
   * Get all event names
   */
  eventNames(): EventName[] {
    return Array.from(this.events.keys());
  }

  /**
   * Set max listeners
   */
  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }

  /**
   * Get max listeners
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  /**
   * Execute async handler
   */
  private async executeAsyncHandler(
    handler: (event: unknown) => void | Promise<void>,
    data: unknown,
    event: EventName,
  ): Promise<void> {
    try {
      await handler(data);
    } catch (error) {
      this.handleError(error, event);
    }
  }

  /**
   * Handle errors in event handlers
   */
  protected handleError(error: unknown, event: EventName): void {
    console.error(`Error in event handler for '${event}':`, error);

    // Emit error event if not already handling an error event
    if (event !== EventName.Error) {
      this.emit(EventName.Error, {
        error: error instanceof Error ? error : new Error(String(error)),
        context: { event },
        timestamp: new Date(),
        eventId: `error-${Date.now()}`,
      });
    }
  }
}
