import type * as ts from 'typescript/lib/tsserverlibrary';
import { decorateWithTemplateLanguageService } from 'typescript-template-language-service-decorator';
import { ExoTemplateLanguageService } from './decorator';

export default (mod: { typescript: typeof ts }) => {
    return {
        create(info: ts.server.PluginCreateInfo): ts.LanguageService {
            const logger = {
                log: (s: string) => info.project.log(s)
            }

            return decorateWithTemplateLanguageService(
                mod.typescript,
                info.languageService,
                info.project,
                new ExoTemplateLanguageService(logger),
                { tags: ['statechart'], enableForStringWithSubstitutions: true },
                { logger }
            )
        }
    };
};
