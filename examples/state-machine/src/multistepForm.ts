import { createMachine } from '@exo-store/machine';

const multistepFormMachine = createMachine((statechart, { store,  goto }) => {
    const clearErrorMessage = () => store.errorMessage = undefined;
    const isValid = (data: any) => {
        if (Math.random() > 0.5) throw new Error('Randomly invalid!');
    }
    const submitPayment = () => new Promise(resolve => {
        setTimeout(resolve, 2500);
    });
    return statechart`
    main machine multistepForm {
        initial state *enteringBeneficiary {}
        state *enteringDate {}
        state *confirming {}
        final state success {}
    }

    machine enteringBeneficiary {
        @done ${() => {
            console.log('done with enteringBeneficiary')
            goto('enteringDate')
        }}

        initial state idle {
            on:CONFIRM_BENEFICIARY ${({ info }) => {
                store.beneficiaryInfo = info;
                goto('.submitting')
            }}
            @exit ${() => clearErrorMessage()}
        }
        state submitting {
            @enter ${async () => {
                try {
                    isValid(store.beneficiaryInfo);
                    goto('.complete');
                } catch (e) {
                    store.errorMessage = e.message;
                    goto('.idle');
                }
            }}
        }

        final state complete {}
    }

    machine enteringDate {
        @done ${() => goto('confirming')}
        
        initial state idle {
            on:CONFIRM_DATE ${({ info }) => {
                store.dateInfo = info;
                goto('.submitting')
            }}
            on:BACK ${() => goto('enteringBeneficiary')}
            @exit ${() => clearErrorMessage()}
        }
        state submitting {
            @enter ${async () => {
                try {
                    isValid(store.dateInfo);
                    goto('.complete');
                } catch (e) {
                    store.errorMessage = e.message;
                    goto('.idle');
                }
            }}
        }
        final state complete {}
    }

    machine confirming {
        @done ${() => goto('success')}

        initial state idle {
            on:CONFIRM ${() => goto('.submitting')}

            on:BACK ${() => goto('enteringDate')}

            @exit ${() => clearErrorMessage()}
        }

        state submitting {
            @enter ${async () => {
                try {
                    await submitPayment();
                    goto('.complete');
                } catch (e) {
                    store.errorMessage = e.message;
                    goto('.idle');
                }
            }}
        }

        final state complete {}
    }
`
});

multistepFormMachine.subscribe(snapshot => {
    console.log(snapshot.state);
    console.log(snapshot.store);
})

declare var BACK: HTMLButtonElement;
declare var CONFIRM_BENEFICIARY: HTMLButtonElement;
declare var CONFIRM_DATE: HTMLButtonElement;
declare var CONFIRM: HTMLButtonElement;

BACK.addEventListener('click', () => {
    multistepFormMachine.send('BACK');
})

CONFIRM_BENEFICIARY.addEventListener('click', () => {
    multistepFormMachine.send('CONFIRM_BENEFICIARY', { info: { beneficiary: 'Nate' }});
})

CONFIRM_DATE.addEventListener('click', () => {
    multistepFormMachine.send('CONFIRM_DATE', { info: { date: new Date().toISOString() } });
})

CONFIRM.addEventListener('click', () => {
    multistepFormMachine.send('CONFIRM');
})

export default {}
