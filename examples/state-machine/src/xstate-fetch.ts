import { createMachine } from '@exo-store/machine';

interface ResolveEvent {
    type: 'RESOLVE';
    data?: any;
}
interface RejectEvent {
    type: 'REJECT';
    error?: string;
}
type FetchEvents = [ResolveEvent, RejectEvent];
interface FetchStore {
    data?: any;
    error?: string;
    retries: number;
}

const fetchMachine = createMachine<FetchStore, FetchEvents>((statechart, { goto, send, store }) => {
    store.retries = 0;

    return statechart`
        main machine fetch {
            initial state idle {
                on:FETCH ${() => goto('loading')}
            }

            state loading {
                @enter ${async () => {
                    if (store.error) store.error = undefined;
                    try {
                        const res = await fetch('https://pokeapi.co/api/v2/pokemon/ditto');
                        const data = await res.json();
                        send('RESOLVE', { data });
                    } catch (e) {
                        const error = e.message || 'An unknown error occured';
                        send('REJECT', { error });
                    }
                }}
                on:RESOLVE ${({ data }) => {
                    store.data = data;
                    goto('success')
                }}
                on:REJECT ${({ error }) => {
                    store.error = error;
                    goto('failure')
                }}
            }

            state failure {
                on:RETRY ${() => {
                    store.retries++;
                    goto('loading');
                }}
            }

            final state success {}
        }
    `
});


fetchMachine.subscribe((snapshot: any) => {
    console.log(snapshot.state);
    console.log(snapshot.store);
})

declare var FETCH: HTMLButtonElement;

FETCH.addEventListener('click', () => {
    fetchMachine.send('FETCH');
})
