import { BasePF2eSub } from "../base-subsystem.js"

export class VPPF2eSub extends BasePF2eSub{
    static PARTS = {
        ...super.PARTS,
        details: { template: "modules/pf2e-subsystems/templates/partials/vp-sidebar.hbs", scrollable: true},
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.parts = ['header', 'tabs', 'details', 'content'];
        console.log("subsystem parts", this.PARTS);
    }

    constructor(party, object, ...options) {
        object = foundry.utils.mergeObject(object, {
            title: "New Victory Points Activity",
            subType: "vpsubs",
            details: {
                template: "modules/pf2e-subsystems/templates/partials/vp-sidebar.hbs",
                endPoint: 20,
                points: 0,
                automatic: 0,
                turnBased: true,
            },
            actionTypes: ["obstacle"],
        }, {overwrite: false});
        super(party, object, options);
        
    }
    
    async addAction (actionType) {
        super.addAction(actionType, {
            hasChecks: true,
            checkRolls: "",
            success: [2,1,0,-1],
            actionPoints: 0,
            editTemplate: "modules/pf2e-subsystems/templates/partials/edit-vp-action.hbs",
            summaryTemplate: "modules/pf2e-subsystems/templates/partials/summary-vp-action.hbs",
        });
    }

    activateListeners($html) {
        super.activateListeners($html);

        for(const checkPrompt of $html.find(".checkPrompt")) {
            checkPrompt.addEventListener("click", () => {
                console.log("check clicked")
                this.generateCheckPrompt("typetype","idid");
            })
        }
    }

}

