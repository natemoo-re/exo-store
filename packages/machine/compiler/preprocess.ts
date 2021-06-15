export function preprocess(strings: TemplateStringsArray, slots: any[]) {
    let template = '';
    for (let i = 0; i < strings.length; i++) {
        template += strings[i];
        if (i !== strings.length - 1) {
            const key = `\${${i}}`;
            const value = slots[i];
            if (typeof value === 'string' || typeof value === 'number') {
                template += `${value}`;
            } else {
                template += key;
            }
        }
    }
    return { template, slots };
}
