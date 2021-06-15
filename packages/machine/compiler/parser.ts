import type { Token } from './lexer';

const enum ParserState {
    inRoot,
    inMachine,
    inState,
    inHandler
}

export interface Node {
    comment?: string;
}

export interface MachineNode extends Node {
    nodeType: 'machine';
    name: string;
    main?: boolean;
    is?: string;
    done?: boolean;
    states: StateNode[];
    handlers: HandlerNode[];
}

export interface StateNode extends Node {
    nodeType: 'state';
    name: string;
    handlers: HandlerNode[];
    initial?: boolean;
    final?: boolean;
    immediate?: string;
    machine?: MachineNode;
}

export interface HandlerNode extends Node {
    nodeType: 'handler';
    type: 'at'|'on'|'wait';
    handle: string|number;
    fn: (...args: any[]) => any;
}

export function parseDuration(word: string): number {
    const [number] = word.match(/^((?:\.|\+|\-|\d*)\d*(?:(?:\.)\d*)?(?:e(?:\.|\+|\-|\d*)\d*)?)/gm) ?? [];
    if (!number) throw new Error(`Unable to parse "${word}"`);
    if (number.endsWith('.') || (number.indexOf('.') > -1 && number.split('.').length > 2)) throw new Error(`Invalid number "${word}"`);
    const suffix = word.replace(number, '');
    if (!['s', 'ms', 'm'].includes(suffix)) throw new Error(`Unexpected suffix "${suffix}" for duration "${word}"`);

    const num = Number(number);
    switch (suffix) {
        case 'ms': return num;
        case 's': return num * 1000;
        case 'm': return num * 1000 * 60;
        default: throw new Error(`Unable to parse "${word}"`);
    }
}

export function parseComment(comment: string) {
    return comment.trim().replace(/^(\/\/|\/\*)/, '').replace(/\*\/$/, '').trim();
}

export function parse(tokens: Token[], slots: unknown[]): MachineNode[] {
    tokens = tokens.filter(token => token.type !== 'whitespace');
    let prevState: ParserState|null = null;
    let state = ParserState.inRoot;
    let root: MachineNode[] = [];
    let machineNode: MachineNode;
    let stateNode: StateNode;
    let handlerNode: HandlerNode;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        let prev = tokens[i - 1];

        if (token.type === 'keyword') {
            switch (token.value) {
                case 'machine': {
                    if (machineNode!) root!.push(machineNode);
                    prevState = state;
                    state = ParserState.inMachine;
                    machineNode = {
                        nodeType: 'machine',
                        name: '',
                        states: [] as StateNode[],
                        handlers: [] as HandlerNode[]
                    } as MachineNode;
                    if (prev?.value === 'main') machineNode!.main = true;
                    break;
                }
                case 'state': {
                    prevState = state;
                    state = ParserState.inState;
                    stateNode = {
                        nodeType: 'state',
                        name: '',
                        handlers: [] as HandlerNode[],
                    } as StateNode;
                    if (prev?.value === 'initial' || prev?.value === 'final') stateNode![prev.value] = true;
                    break;
                }
                case '@':
                case 'on':
                case 'wait': {
                    prevState = state;
                    state = ParserState.inHandler;
                    handlerNode = {
                        nodeType: 'handler'
                    } as HandlerNode;
                    break;
                }
            }
        }

        switch (state) {
            case ParserState.inRoot: {
                break;
            }
            case ParserState.inMachine: {
                if (token.value === '{' || token.value === 'machine') break;
                if (token.value === '}') {
                    prevState = state;
                    state = ParserState.inRoot;
                    break;
                }
                if (token.type === 'word') {
                    if (prev.value === 'is') {
                        machineNode!['is'] = `${token.value}`;
                    } else {
                        machineNode!['name'] = `${token.value}`;
                    }
                    break;
                }
                break;
            }
            case ParserState.inState: {
                if (token.value === '{' || token.value === 'state') break;
                if (token.value === '}') {
                    prevState = state;
                    state = ParserState.inMachine;
                    break;
                }
                if (token.type === 'word') {
                    stateNode!['name'] = `${token.value}`;
                    if (stateNode!) {
                        machineNode!.states.push(stateNode);
                    }
                    break;
                }
                break;
            }
            case ParserState.inHandler: {
                if (token.value === '{' || token.value === ':') break;
                if (token.value === '}') {
                    prevState = state;
                    state = ParserState.inState;
                    break;
                }
                switch (token.type) {
                    case 'keyword': {
                        const key = (token.value === '@' ? 'at' : token.value) as HandlerNode['type'];
                        handlerNode!.type = key;
                        break;
                    }
                    case 'word': {
                        if (handlerNode!.type === 'wait') {
                            handlerNode!.handle = parseDuration(token.value as string);
                        } else {
                            handlerNode!.handle = token.value;
                        }
                        break;
                    }
                    case 'slot': {
                        const fn = slots[token.value as number];
                        if (typeof fn !== 'function') throw new Error(`${handlerNode!.type}:${handlerNode!.handle} must be a function`);
                        handlerNode!.fn = fn as (...args: any) => any;

                        let target = (prevState === ParserState.inMachine) ? machineNode! : stateNode!;
                        target!.handlers.push(handlerNode!);
                        state = prevState!;
                        break;
                    }
                    default: break;
                }
                break;
            }
        }
    }

    if (machineNode!) root.push(machineNode);
    if (root.length === 1 && !root[0].main) root[0].main = true;

    for (const machine of root) {
        machine.states = machine.states.map(state => {
            if (state.name[0] === '*') {
                const key = state.name.slice(1);
                const machineRef = root.find(m => m.name === key);
                if (!machineRef) throw new Error(`Unable to find machine "${key}" referenced by state "${machine.name}.${state.name}"`);
                return { ...state, name: state.name.slice(1), immediate: `${machineRef.name}.initial` };
            }
            return state;
        })
    }

    return root;
}
