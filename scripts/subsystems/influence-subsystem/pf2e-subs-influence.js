import { BasePF2eSub } from "../base-subsystem.js"

export class InfluencePF2eSub extends BasePF2eSub {
    static PARTS = {
        ...super.PARTS,
        details: { template: "modules/pf2e-subsystems/templates/partials/influence-sidebar.hbs", scrollable: [''] },
        actions: { ...super.PARTS.actions, templates: [
            "modules/pf2e-subsystems/templates/partials/influence-action-discover.hbs",
            "modules/pf2e-subsystems/templates/partials/influence-action-influence.hbs"
        ] },
    }

    static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        actions: {
            addAction: InfluencePF2eSub.addAction,
            removeTarget: InfluencePF2eSub.removeTarget,
        },
        classes: [...super.DEFAULT_OPTIONS.classes, "wide-details"],
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.parts = ['header', 'tabs', 'wrapper', 'details', 'description', 'actions', 'rewards'];
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Expose any configured action templates to the template context
        context.actionTemplates = {};
        context.actionTemplates.discover = "modules/pf2e-subsystems/templates/partials/influence-action-discover.hbs";
        context.actionTemplates.influence = "modules/pf2e-subsystems/templates/partials/influence-action-influence.hbs";
        if(this.object.details.targetUUID) {
        context.enrichedContent.target = await foundry.applications.ux.TextEditor.implementation.enrichHTML(`@UUID[${this.object.details.targetUUID}]{${this.object.details.target.name}}`);
        }

        return context;
    }

    constructor(party, object, ...options) {
        object = foundry.utils.mergeObject(object, {
            title: "New Influence Activity",
            subType: "influencesubs",
            details: {
                targetUUID: "",
                target: {},
                targetPerception: 10,
                targetWill: 10,
                targetResistance: "",
                targetWeakness: "",
                targetBackground: "",
                targetAppearance: "",
                targetPersonality: "",
                targetPenalty: "",
                influencePoints: 0,
            },
            actionTypes: ["discover", "influence"],
        }, {overwrite: false});
        super(party, object, options);
    }
    
    static async addAction(event, target) {
        const action = {};

        switch(target.dataset.type) {
            case "discover":
                action.description = "New Discover Action Description";
                action.DC = 10;
                break;
            case "influence":
                action.description = "New Influence Action Description";
                action.DC = 10;
                break;
        }
        super.addAction(event, target, action);
    }

    async _onDrop(event) {
        console.log("Influence Drop event:", event);
        const dropData = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        console.log("dropData", dropData);
        const element = event.target.closest('[data-drop]');
        console.log("element", element)
        console.log("element.className", element.className);

        switch(element.className) {
            case "influenceTarget highlight":
                console.log("element.className", element.className);
                if(dropData.type === "Actor") {
                    let actor = await fromUuid(dropData.uuid);
                    this.addTarget(actor);
                }
                break;
            default:
                super._onDrop(event);
                return;
        }

    }

    async addTarget(actor) {
        let source = await fromUuid(actor._stats.compendiumSource);
        if(!source) source = await fromUuid(actor.uuid);
        if(!source) return;

        if(this.object.details.targetUUID) {
            await Dialog.confirm({
                title: `Set Influence Target`,
                content: `<h4>Set ${source.name} as Influence Target?</h4><p>This will replace any existing target.</p>`,
                yes: async () => {
                    this.object.details.target = await foundry.utils.deepClone(source);
                    this.object.details.targetUUID = source.uuid;

                    await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
                    this.render();
                },
                no: () => { return; },
            });
        } else {
            this.object.details.target = await foundry.utils.deepClone(source);
            this.object.details.targetUUID = source.uuid;

            await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
            this.render();
        }
    }

    static async removeTarget(event, target) {
        Dialog.confirm({
            title: `Remove Target`,
            content: `<h4>Are You Sure?</h4><p>This target will be permanently removed and cannot be recovered.</p>`,
            yes: async () => {
                this.object.details.target = {};
                this.object.details.targetUUID = "";

                await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
                this.render();
            },
            no: () => { return; },
        });
    }
}
