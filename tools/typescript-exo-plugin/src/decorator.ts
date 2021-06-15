import { ScriptElementKind } from 'typescript';
import type { TemplateLanguageService, TemplateContext } from 'typescript-template-language-service-decorator';

export class ExoTemplateLanguageService implements TemplateLanguageService {
    constructor(private logger: { log: (s: string) => void }) {}
    getCompletionsAtPosition(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): ts.CompletionInfo {
        const line = context.text.split(/\n/g)[position.line];
        this.logger.log(line);
        return {
            isGlobalCompletion: true,
            isMemberCompletion: false,
            isNewIdentifierLocation: false,
            entries: [
                {
                    name: 'named',
                    kind: ScriptElementKind.letElement,
                    sortText: 'named'
                },
                {
                    name: 'state',
                    kind: ScriptElementKind.letElement,
                    sortText: 'state'
                },
                {
                    name: 'initial',
                    kind: ScriptElementKind.localClassElement,
                    sortText: 'initial'
                },
                {
                    name: 'on',
                    kind: ScriptElementKind.localClassElement,
                    sortText: 'on'
                },
                {
                    name: 'after',
                    kind: ScriptElementKind.localClassElement,
                    sortText: 'after'
                }
            ]
        };
    }
}
