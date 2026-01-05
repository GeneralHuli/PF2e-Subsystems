import { BasePF2eSub } from "../base-subsystem.js"

export class VPPF2eSub extends BasePF2eSub{
    static PARTS = {
        ...super.PARTS,
        details: { template: "modules/pf2e-subsystems/templates/partials/vp-sidebar.hbs", scrollable: [''] },
        actions: { ...super.PARTS.actions, templates: ["modules/pf2e-subsystems/templates/partials/vp-action-obstacle.hbs"] },
    }

    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        actions: {
            addAction: VPPF2eSub.addAction,
        }
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.parts = ['header', 'tabs', 'wrapper', 'details', 'description', 'actions', 'rewards'];
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Ensure templates configured for actions are available to the template
        context.actionTemplates = {};
        context.actionTemplates.obstacle = "modules/pf2e-subsystems/templates/partials/vp-action-obstacle.hbs";

        return context;
    }

    constructor(party, object, ...options) {
        object = foundry.utils.mergeObject(object, {
            title: "New Victory Points Activity",
            subType: "vpsubs",
            details: {
                endPoint: 20,
                points: 0,
                automatic: 0,
                turnBased: true,
            },
            actionTypes: ["obstacle"],
        }, {overwrite: false});
        super(party, object, options);
        
    }
    
    static async addAction(event, target) {
        super.addAction(event, target, {
            description: "New VP Action Description",
            points: 0,
        });
    }

}

