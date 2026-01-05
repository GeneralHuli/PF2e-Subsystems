import { BasePF2eSub } from "../base-subsystem.js"

export class ResearchPF2eSub extends BasePF2eSub {
    static PARTS = {
        ...super.PARTS,
        details: { template: "modules/pf2e-subsystems/templates/partials/research-sidebar.hbs", scrollable: [''] },
        actions: { ...super.PARTS.actions, templates: ["modules/pf2e-subsystems/templates/partials/research-action-research.hbs"] },
    }

    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        actions: {
            addAction: ResearchPF2eSub.addAction,
        }
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.parts = ['header', 'tabs', 'wrapper', 'details', 'description', 'actions', 'rewards'];
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Expose any configured action templates to the template context
        context.actionTemplates = context.actionTemplates || {};
        context.actionTemplates.research = "modules/pf2e-subsystems/templates/partials/research-action-research.hbs";

        return context;
    }

    constructor(party, object, ...options) {
        object = foundry.utils.mergeObject(object, {
            title: "New Research Activity",
            subType: "researchsubs",
            details: {
                researchPoints: 0,
            },
            actionTypes: ["research"],
        }, {overwrite: false});
        super(party, object, options);
    }
    
    static async addAction(event, target) {
        super.addAction(event, target, {
            description: "New Research Action",
            maxRP: 0,
            dc: 10,
        });
    }
}
