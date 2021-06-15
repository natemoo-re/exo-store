import { isKeyword, keywords } from './shared';

export const enum LexerState {
    inMachine,
    inBlockComment,
    inLineComment,
    inSlot
}

export type TokenType = 'keyword'|'word'|'symbol'|'slot'|'whitespace'|'comment';

export interface Token {
    start: number;
    end: number;
    value: string|number;
    type: TokenType|null;
}

function getTokenType(char: string): TokenType {
    switch (true) {
        case char === '@': return 'keyword';
        case /(\.|\*)/.test(char): return 'word';
        case /\w/.test(char): return 'word';
        case /\s/.test(char): return 'whitespace';
        case /\W/.test(char): return 'symbol';
        default: throw new Error('Unrecognized token type');
    }
}

export function lex(template: string) {
    let state = LexerState.inMachine;
    let tokens: typeof token[] = [];
    let token: Token = {
        start: 0,
        end: 0,
        value: '',
        type: null
    };
    let i = 0;

    const accept = (value: string = '', type: TokenType) => {
        token.end = i;
        tokens.push(token);
        token = {
            start: i,
            end: 0,
            value,
            type
        }
    }

    for (; i < template.length; i++) {
        const char = template.charAt(i);
        let type = getTokenType(char);

        if (type === 'symbol') {
            if (state === LexerState.inBlockComment || state === LexerState.inLineComment) type = 'comment';
            if (state === LexerState.inSlot) type = 'slot';
        }
        
        switch (true) {
            case state === LexerState.inSlot: {
                token.type = type;
                if (/\d/.test(char)) {
                    if (token.value === '${') token.value = char;
                    else token.value += char;
                };

                if (char === '}') {
                    token.value = Number.parseInt((token.value as string));
                    state = LexerState.inMachine;
                }
                break;
            }
            case state === LexerState.inBlockComment: {
                token.type = type;
                token.value += char;

                if (`${token.value}`.slice(-2) === '*/') state = LexerState.inMachine;
                break;
            }
            case state === LexerState.inLineComment: {
                token.type = 'comment';

                if (/\n/.test(char)) {
                    accept(char, type);
                    state = LexerState.inMachine
                    continue;
                } else {
                    token.type = type;
                    token.value += char;
                    break;
                }
            }
            case (token.type !== type): {
                if (token.type === 'word' && isKeyword(`${token.value}`)) {
                    token.type = 'keyword';
                }
                accept(char, type);
                break;
            }
            default: {
                token.value += char;

                if (token.value === '${') state = LexerState.inSlot;
                else if (token.value === '/*') state = LexerState.inBlockComment;
                else if (token.value === '//') state = LexerState.inLineComment;
                break;
            }
        }
    }

    return tokens.slice(1);
}
