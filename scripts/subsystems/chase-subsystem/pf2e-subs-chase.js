import { BasePF2eSub } from "../base-subsystem.js"

export class ChasePF2eSub extends BasePF2eSub {
    static PARTS = {
        ...super.PARTS,
        // details: { template: "modules/pf2e-subsystems/templates/partials/chase-sidebar.hbs", scrollable: [''] },
        actions: { ...super.PARTS.actions, templates: ["modules/pf2e-subsystems/templates/partials/chase-action-obstacle.hbs"] },
    }

    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        actions: {
            addAction: ChasePF2eSub.addAction,
        }
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.parts = ['header', 'tabs', 'wrapper', 'description', 'actions', 'rewards'];
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Ensure templates configured for actions are available to the template
        context.actionTemplates = {};
        context.actionTemplates.obstacle = "modules/pf2e-subsystems/templates/partials/chase-action-obstacle.hbs";

        return context;
    }

    constructor(party, object, ...options) {
        object = foundry.utils.mergeObject(object, {
            title: "New Chase Activity",
            subType: "chasesubs",
            actionTypes: ["obstacle"],
        }, {overwrite: false});
        super(party, object, options);
    }
    
    static async addAction(event, target) {
        super.addAction(event, target, {
            description: "New Chase Action Description",
            points: 0,
            overcome: "",
        });
    }
}