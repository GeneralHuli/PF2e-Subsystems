import { BasePF2eSub } from "../base-subsystem.js"

export class InfiltrationPF2eSub extends BasePF2eSub {
    static PARTS = {
        ...super.PARTS,
        details: { template: "modules/pf2e-subsystems/templates/partials/infiltration-sidebar.hbs", scrollable: [''] },
        actions: { ...super.PARTS.actions, templates: [
            "modules/pf2e-subsystems/templates/partials/infiltration-action-obstacle.hbs",
            "modules/pf2e-subsystems/templates/partials/infiltration-action-complication.hbs",
            "modules/pf2e-subsystems/templates/partials/infiltration-action-opportunity.hbs",
            "modules/pf2e-subsystems/templates/partials/infiltration-action-preparation.hbs",
        ] },
    }

    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        actions: {
            addAction: InfiltrationPF2eSub.addAction,
        },
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.parts = ['header','tabs','wrapper','details','description','actions','rewards'];
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.actionTemplates = {};
        context.actionTemplates.obstacle = "modules/pf2e-subsystems/templates/partials/infiltration-action-obstacle.hbs";
        context.actionTemplates.complication = "modules/pf2e-subsystems/templates/partials/infiltration-action-complication.hbs";
        context.actionTemplates.opportunity = "modules/pf2e-subsystems/templates/partials/infiltration-action-opportunity.hbs";
        context.actionTemplates.preparation = "modules/pf2e-subsystems/templates/partials/infiltration-action-preparation.hbs";
        return context;
    }

    constructor(party, object, ...options) {
        object = foundry.utils.mergeObject(object, {
            title: "New Infiltration Activity",
            subType: "infiltrationsubs",
            details: {
                infiltrationPoints: 0,
                awarenessPoints: 0,
                edgePoints: 0,
            },
            actionTypes: ["obstacle","complication","opportunity","preparation"],
        }, {overwrite: false});
        super(party, object, options);
    }

    static async addAction(event, target, options = {}) {
        let actionType = target.dataset.type;
        let defaults = {};
        switch (actionType) {
            case 'obstacle':
                defaults = { description: "New Obstacle", infiltrationGain: 1, group: "individual", overcome: "" };
                break;
            case 'complication':
                defaults = { description: "New Complication", trigger: "", overcome: "" };
                break;
            case 'opportunity':
                defaults = { description: "New Opportunity", requirements: "" };
                break;
            case 'preparation':
                defaults = { description: "New Preparation", requirements: "" };
                break;
            default:
                defaults = {};
        }

        await super.addAction(event, target, { ...defaults, ...options });
    }

}
