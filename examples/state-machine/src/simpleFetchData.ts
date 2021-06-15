import { createMachine } from '@exo-store/machine';

const simpleFetchDataMachine = createMachine((statechart, { store, send, goto }) => statechart`
    main machine simpleFetchData {
        initial state *idle;

        state fetching {
            @enter ${async () => {
                try {
                    const res = await fetch('https://pokeapi.co/api/v2/pokemon/ditto');
                    const data = await res.json();
                    send('RESOLVE', { data });
                } catch (e) {
                    const message = e.message || 'An unknown error occured';
                    send('ERROR', { message });
                }
            }}

            on:* ${() => console.log('event')}

            on:FETCH ${() => goto('fetching')}
            
            on:CANCEL ${() => goto('idle')}

            on:RESOLVE ${({ data }) => {
                store.data = data;
                goto('idle.success');
            }}
            on:ERROR ${({ message }) => {
                store.error = message;
                goto('idle.errored');
            }}
        }
    }

    machine idle {
      initial state waiting {
        on:FETCH ${() => goto('fetching')}
      }
      final state success {
        @enter ${() => {
            store.error = undefined;
        }}
      }
      final state errored {}
    }
`);

simpleFetchDataMachine.subscribe(state => {
    console.log(state);
})

declare var button: HTMLButtonElement;
button.addEventListener('click', () => {
    simpleFetchDataMachine.send('FETCH');
})

export default {}
