import { createMachine } from '@exo-store/machine';


interface DebounceEvent {
    action: () => void;
}

// https://xstate-catalogue.com/machines/debounce
const { subscribe, send } = createMachine((statechart, { store, go }) => {
    return statechart`
        /* block comment 
         spanning multiple 
         lines */
        machine debounce {
            initial state idle {
                on:go ${({ action }: DebounceEvent) => {
                    store.action = action;
                    go('debouncing');
                }}
            }

            // line comment
            state debouncing {
                on:go ${({ action }: DebounceEvent) => {
                    store.action = action;
                    go('debouncing');
                }}

                wait:3s ${() => {
                    store.action()
                    store.action = undefined;
                    go('idle');
                }}
            }
        }
    `
}, { debug: true }
)

declare var button: HTMLButtonElement;
let i = 0;

button.addEventListener('click', () => {
    send('go', { action: () => alert(i) });
    i++;
})

export default {}
