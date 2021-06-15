import { preprocess, lex, parse, StateNode, HandlerNode } from './compiler'
import type { MachineNode } from './compiler';
import deepEqual from 'fast-deep-equal/es6';

function statechart(strings: TemplateStringsArray, ...values: any[]) {
    const { template, slots } = preprocess(strings, values);
    const machines = parse(lex(template), slots);

    return machines;
}

export interface StatechartHandler {
    (payload?: any): void

}

export interface Statechart {
    (strings: TemplateStringsArray, ...values: (string|number|StatechartHandler)[]): MachineNode[]
};

interface State<Store> {
    state: string;
    store: Store;
}

type ExtractFromTuple<T extends readonly any[], E> =
    T extends [infer F, ...infer R] ? F extends E ? [F, ...ExtractFromTuple<R, E>] : ExtractFromTuple<R, E>
     : []

type KeysInner<T extends { [n: number]: unknown }> = T[number];
type KeysOuter<T> = T extends T ? keyof T : never;
type KeysOfTuple<T extends { [n: number]: unknown }> = KeysOuter<KeysInner<T>>;


interface MachineContext<Store, Events extends readonly { type: string }[]> {
    store: Store;
    goto(state: string): void;
    send<EventType extends Events[number]['type']>(type: EventType, payload?: Omit<ExtractFromTuple<Events, { type: EventType }>[0], 'type'>): void;
}

export interface CreateMachineOptions {
    debug?: boolean;
}

export function createMachine<Store extends Record<any, any>, Events extends readonly { type: string }[]>(init: (statechart: Statechart, context: MachineContext<Store, Events>) => MachineNode[], { debug = false }: CreateMachineOptions = {}) {
    let current: State<Store> = new Proxy({
        store: {},
    }, {
        set(target, prop, newValue, receiver) {
            const oldValue = Reflect.get(target, prop, receiver);
            if (deepEqual(newValue, oldValue)) return true;
            const success = Reflect.set(target, prop, newValue, receiver);
            if (success) notify();
            return success;
        }
    }) as State<Store>;
    const timeouts = new Set<number>();
    let subscriptions: Function[] = [];

    function subscribe(fn: (snapshot: Readonly<State<Store>>) => void) {
        subscriptions.push(fn);
        return () => {
            subscriptions.splice(subscriptions.indexOf(fn), 1);
        };
    }

    function notify() {
        let { state } = current
        if (/^main/.test(state)) {
            const mainMachine = getMachine('main');
            state = state.replace(/^main/, mainMachine.name);
        }
        if (/initial$/.test(state)) {
            const stateNode = resolveState(state);
            state = state.replace(/initial$/, stateNode.name);
        }
        let snapshot = Object.freeze(JSON.parse(JSON.stringify({ ...current, state })));
        subscriptions.forEach((fn) => fn(snapshot));
    }

    async function send(event: string, payload?: any): Promise<void> {
        let { state, changed } = await transition(current, event, payload);
        if (changed) {
            current.state = state;
        }
    }

    function goto(target: string) {
        let { state, changed } = doTransition(current, target);
        if (changed) {
            current.state = state;
        }
    }

    const machines = init(statechart, { store: current.store, goto, send });

    const getMachine = (name: string|'main'): MachineNode => {
        if (machines.length === 0) return machines[0];
        let machine: MachineNode|undefined;
        
        if (name === 'main') {
            machine = machines.find(m => m.main);
            if (!machine) throw new Error(`Unable to find a "main" machine. Did you forget to mark one of your machines as "main"?`);
            return machine;
        }

        machine = machines.find(m => m.name === name);
        if (!machine) throw new Error(`Unable to find a machine named "${name}"`)
        return machine;
    }

    const getState = (machineName: string, stateName: string|'initial'): StateNode => {
        const machine = getMachine(machineName);
        let stateDef: StateNode|undefined;
        
        if (stateName === 'initial') {
            stateDef = machine.states.find(state => state.initial);
            if (!stateDef) throw new Error(`Unable to find an "initial" state. Did you forget to mark one of your machines as "initial"?`);
        }
        else stateDef = machine.states.find(state => state.name === stateName);

        if (!stateDef) throw new Error(`Unable to find the "${stateName}" state on "${machine.name}" machine.`);
        return { ...stateDef, machine };
    }

    const getMachineAndStateNameFromTransition = (transitionTo: string): [string, string] => {
        const [machineOrStateName, maybeStateName] = transitionTo.split('.');
        let machineName = typeof maybeStateName !== 'undefined' ? machineOrStateName : 'main';
        if (!machineName) machineName = current.state.split('.')[0] ?? 'main';
        const stateName = maybeStateName ? maybeStateName : machineOrStateName;
        return [machineName, stateName];
    }

    const resolveState = (transitionTo: string = 'main.initial'): StateNode => {
        const [machineName, stateName] = getMachineAndStateNameFromTransition(transitionTo);
        const stateDef = getState(machineName, stateName);
        return stateDef;
    }

    function resolveHandlers(node: StateNode|MachineNode, type: 'at', handle: 'enter'|'exit'|'done'): HandlerNode[];
    function resolveHandlers(node: StateNode|MachineNode, type: 'on', handle: string): HandlerNode[];
    function resolveHandlers(node: StateNode|MachineNode, type: 'at'|'on', handle: string): HandlerNode[] {
        return node.handlers.filter(h => {
            const matches = h.type === type && h.handle === handle;
            if (type === 'on') return matches || (h.type === type && h.handle === '*');
            return matches;
        });
    }

    function queueWaitEvents(currentState: State<Store>, stateDef: StateNode) {
        const events = stateDef.handlers.filter(handler => handler.type === 'wait');
        if (events.length > 0) {
            events.forEach(event => {
                timeouts.add(setTimeout(() => {
                    console.log(`wait ${event.handle}`);
                    executeHandler(currentState, event.fn)
                }, event.handle as number));
            })
        }
    }

    async function executeHandler(currentState: State<Store>, fn?: (...args: any) => any, args: any[] = []): Promise<State<Store> & { changed: boolean }> {
        if (!fn) return { ...currentState, changed: false };

        try {
            fn(...args);
            return { ...currentState, changed: true };
        } catch (e) {
            if (e.type === 'transition') {
                const transitionTo = e.state;
                let nextStateDef = resolveState(transitionTo);
                if (nextStateDef) {
                    return doTransition(currentState, e.state);
                }
                return { ...currentState, changed: false }
            }

            throw e;
        }
    }

    /** @internal */
    function doTransition(currentState: State<Store>|null, transitionTo: string): State<Store> & { changed: boolean } {
        let currentStateDef = currentState ? resolveState(currentState.state) : null;
        let nextStateDef = resolveState(transitionTo);
        if (debug) {
            let currentMachine: string|null;
            if (currentState) {
                ([currentMachine] = getMachineAndStateNameFromTransition(currentState!.state));
            } else {
                currentMachine = null;
            }

            const [nextMachine] = getMachineAndStateNameFromTransition(transitionTo);

            if (nextMachine !== currentMachine) {
                console.log(`machine "${nextMachine}"`);
            }
        }
        if (nextStateDef) {
            if (nextStateDef.immediate) {
                return doTransition(currentState, nextStateDef.immediate);
            }

            if (currentStateDef) {
                const [exitHandler] = resolveHandlers(currentStateDef, 'at', 'exit');
                
                executeHandler(currentState!, exitHandler?.fn, []);
                if (debug) {
                    console.log(`exit`);
                }
            }
            const [nextMachineName, nextStateName] = getMachineAndStateNameFromTransition(transitionTo);
            const nextStateValue = nextMachineName === 'main' ? nextStateName : `${nextMachineName}.${nextStateName}`;
            current.state = nextStateValue;
            
            if (debug) {
                console.log(`${transitionTo === 'main.initial' ? 'initial ' : ''}state "${nextStateDef.name}"`);
                console.log(`enter`);
            }
            const [enterHandler] = resolveHandlers(nextStateDef, 'at', 'enter');
            executeHandler(current, enterHandler?.fn);
            queueWaitEvents(current, nextStateDef);
            if (nextStateDef.final) {
                nextStateDef.machine!.done = true;
                const [doneHandler] = resolveHandlers(nextStateDef!.machine!, 'at', 'done');
                executeHandler(current, doneHandler?.fn);
            } else if (nextStateDef.machine!.done) {
                nextStateDef.machine!.done = false;
            }
            
            return { ...current, changed: true };
        }

        if (!currentState && !nextStateDef) throw new Error(`Unable to initialize machine. Did you mark a "main" machine and an "initial" state?`);
        return { ...currentState!, changed: false };
    }

    async function transition(currentState: State<Store>, event: string, payload?: any): Promise<State<Store> & { changed: boolean }> {
        timeouts.forEach(timeout => clearTimeout(timeout));
        timeouts.clear();
        const currentStateDef = resolveState(currentState.state);
        const eventHandlers = resolveHandlers(currentStateDef, 'on', event);
        if (!(eventHandlers.length > 0)) return { ...currentState, changed: false };
        const results = await Promise.all(eventHandlers.map(eventHandler => executeHandler(currentState, eventHandler.fn, [payload])));
        return results.reduce((acc, curr) => ({ ...acc, ...curr, changed: acc.changed ? acc.changed : curr.changed }), {} as any);
    }

    doTransition(null, 'main.initial');
    return { subscribe, send };
}
