const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { DragDrop } = foundry.applications.ux;

export class BasePF2eSub extends HandlebarsApplicationMixin(ApplicationV2) {
    #dragDrop
    type = 'pf2e-subsystem';
    static DEFAULT_OPTIONS = {
        tag: "form",
        classes: ['pf2e-subsystem', 'app', 'window-app', 'sheet', 'pf2e', 'action', 'item', 'themed', 'theme-light'],
        id: 'subsystems-configure',
        position: {
            width: 775,
            height: 500,
        },
        window: {
            title: 'Edit Subsystem',
            resizable: true,
            frame: true,
        },
        form: {
            handler: BasePF2eSub._onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            addReward: BasePF2eSub.addReward,
            removeReward: BasePF2eSub.removeReward,
            expandReward: BasePF2eSub.expandReward,
            addAction: BasePF2eSub.addAction,
            deleteAction: BasePF2eSub.removeAction,
            toggleSummary: BasePF2eSub.expandAction,
            removeRewardItem: BasePF2eSub.removeRewardItem,
            editAction: BasePF2eSub.editAction,
            saveAction: BasePF2eSub.saveAction,
        },
        dragDrop: [{ dropSelector: "[data-drop]" }]
    };
    
    static PARTS = {
        header: {template: "modules/pf2e-subsystems/templates/sub-header.hbs" },
        tabs: { template: "modules/pf2e-subsystems/templates/sub-tabs.hbs" },
        wrapper: { template: "modules/pf2e-subsystems/templates/sub-tab-wrapper.hbs" },
        description: { template: "modules/pf2e-subsystems/templates/sub-tab-description.hbs", scrollable: [''] },
        actions: { template: "modules/pf2e-subsystems/templates/sub-tab-actions.hbs", scrollable: [''] },
        rewards: { template: "modules/pf2e-subsystems/templates/sub-tab-rewards.hbs", scrollable: [''] },
    };

    static TABS = {
        primary: {
            tabs: [
                { id: 'description', label: 'Description' }, 
                { id: 'actions', label: 'Actions' }, 
                { id: 'rewards', label: 'Rewards' }
            ],
            initial: 'description',
        },
    };

    constructor(party, object, ...options) {
        super(options);
        this.#dragDrop = this.#createDragDropHandler();

        this.party = party;
        this.object = foundry.utils.mergeObject(object, {
            title: "New Activity",
            rewards: {},
            combined: true,
            teams: party ? {"party": party.members} : {},
            actions: {},
            actionTypes: [],
            id: foundry.utils.randomID(),
            subType: "custom",
            description: "",
            details: {},
        }, {overwrite: false});

        for(let actionType of this.object.actionTypes) {
            this.object.actions[actionType] = this.object.actions[actionType] || {};
        }
    }

    #createDragDropHandler() {
        return this.options.dragDrop.map((dd) => {
            dd.permissions = {
                drop: () => true,
            };
            dd.callbacks = {
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this),
            };
            return new DragDrop(dd);
        });
    }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.parts = ['header', 'tabs', 'wrapper', 'description', 'actions', 'rewards'];
        console.log("subsystem options", options)
        console.log("This", this)
    }

    async _prepareContext(options) {
        console.log("Preparing context with options", options);
        const context = {
            tabs: this._prepareTabs("primary"),
            object: this.object,
            enrichedContent: {
                description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.object.description)
            },
            owner: game.user.isGM,
            editable: true,
        };

        // Build enriched actions grouped by action type keyed by the type name.
        // Each action will include an `enrichedDescription` produced by the
        // Foundry TextEditor enrichment.
        const actionsByType = {};
        for (const [typeName, actions] of Object.entries(this.object.actions || {})) {
            const enrichedById = {};
            for (const [id, action] of Object.entries(actions || {})) {
                const enriched = { id };
                const stringKeys = Object.keys(action).filter(k => typeof action[k] === "string");
                await Promise.all(stringKeys.map(async (k) => {
                    enriched[k] = await foundry.applications.ux.TextEditor.implementation.enrichHTML(action[k] || "");
                }));
                enrichedById[id] = enriched;
            }
            actionsByType[typeName] = enrichedById;
        }

        context.enrichedContent.actions = actionsByType;

        console.log("context", context);
        return context;
    }

    async _preparePartContext(partId, context) {
        switch (partId) {
            case 'description':
            case 'actions':
            case 'rewards':
                context.tab = context.tabs[partId];
                break;
            default:
        }
        return context;
    }

    _onRender(context, options) {
        this.#dragDrop.forEach((dd) => dd.bind(this.element));

        const rewards = this.element.querySelectorAll(".rewards-forms");
        if (rewards[0]) {
            Sortable.create(rewards[0], {
                handle: ".drag-handle",
                animation: 200,
                direction: "vertical",
                dragClass: "drag-preview",
                dragoverBubble: false,
                easing: "cubic-bezier(1, 0, 0, 1)",
                fallbackOnBody: true,
                filter: "div.item-summary",
                ghostClass: "drag-gap",
                group: "rewards",
                preventOnFilter: false,
                swapThreshold: 0.25,
            
                // These options are from the Autoscroll plugin and serve as a fallback on mobile/safari/ie/edge
                // Other browsers use the native implementation
                scroll: true,
                scrollSensitivity: 30,
                scrollSpeed: 15,
            
                delay: 500,
                delayOnTouchOnly: true,
            });
        }

        if(this.object?.expandedReward) {
            this.expandReward(this.object.expandedReward, true);
        }
        if(this.object?.expandedAction) {
            //this.expandAction(this.object.expandedAction, true);
        }
    }

    async _onDrop(event) {
        console.log("Drop event:", event);
        const dropData = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        console.log("dropData", dropData);
        const element = event.target.closest('[data-drop]');
        const rewardID = element.dataset.id;

        $(element).removeClass('highlight');
        console.log("element", element)

        switch(element.className) {
            case "rewardItems":
                if(dropData.type === "Item") {
                    let item = await fromUuid(dropData.uuid);
                    this.addRewardItem(rewardID, item);
                }
                break;
            default:
                return;
        }

    }

    _onDragOver(event) {
        const element = event.target.closest('[data-drop]');

        if ($(element).hasClass('highlight')) return;

        $(element).addClass('highlight');

        element.addEventListener("dragleave", (event) => {$(element).removeClass('highlight')}, {once: true});
    }

    _configureProseMirrorPlugins(name, options = {}) {
        const plugins = super._configureProseMirrorPlugins(name, options);
        plugins.menu = foundry.prosemirror.ProseMirrorMenu.build(foundry.prosemirror.defaultSchema, {
            destroyOnSave: options.remove,
            onSave: () => this.saveEditor(name, options),
            compact: this.options.hasSidebar,
        });
        return plugins;
    }

    static async _onSubmit(event, form, formData) {
        console.log("event",event)
        console.log("form", form)
        console.log("formdata", formData)
        
        const data = foundry.utils.expandObject(formData.object);
        console.log("expanded data", data)
        this.object = foundry.utils.mergeObject(this.object, data);
        console.log("merged object", this.object);
        
        await this.party.subsystems.updateData(foundry.utils.deepClone(this.object))

        if(event.isTrusted)this.render();
    }

    static async addAction(event, target, options={}) {
        let actionType = target.dataset.type;
        console.log("options", options)
        let action = foundry.utils.mergeObject(options, {
            id: foundry.utils.randomID(),
            name: "New Action",
            description: "Give your action a description...",
            editable: true,
        }, {overwrite: false})
        console.log("action",action)

        this.object.actions[actionType][action.id] = action;

        await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));

        this.render();
    }

    static async removeAction(event, target) {
        let actionType = target.dataset.type;
        let id = target.dataset.id;
        Dialog.confirm({
            title: `Delete Action`,
            content: `<h4>Are You Sure?</h4><p>This Action will be permanently deleted and cannot be recovered.</p>`,
            yes: async () => {
                delete this.object.actions[actionType][id];
                await this.party.subsystems.deleteData(foundry.utils.deepClone(this.object), `actions.${actionType}.${id}`);
                this.render();
            },
            no: () => { return; },
        });
    }
    
    static async editAction(event, target) {
        let actionType = target.dataset.type;
        let id = target.dataset.id;
        let actionSummary = $(this.element).find(`.action-summary[data-id=${id}]`)[0];

        this.object.actions[actionType][id].editable = true;

        await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
        this.render();
    }

    static async saveAction(event, target) {
        let actionType = target.dataset.type;
        let id = target.dataset.id;

        this.object.actions[actionType][id].editable = false;

        await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
        this.render();
    }

    static async expandAction(event, target, fast=false) {
        let id = target.dataset.id;
        
        this.expandAction(id, fast);
    }

    async expandAction(id, fast = false) {
        const $html = $(this.element);
        const duration = fast ? 0 : 0.4

        for(const actionSummary of $html.find(".action-summary")) {
            if(actionSummary.dataset.id === id && actionSummary.hidden) {
                gsap.fromTo(
                    actionSummary,
                    { height: 0, opacity: 0, hidden: false },
                    { height: "auto", opacity: 1, duration},
                )
                //this.object.expandedAction = id;
                //this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
            }
            else if(actionSummary.dataset.id === id) {
                gsap.to(actionSummary, {
                    height: 0,
                    duration,
                    opacity: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                    margin: 0,
                    clearProps: "all",
                    onComplete: () => {
                        actionSummary.hidden = true;
                    },
                })
            }
        }
    }

    static async addReward() {
        let reward = {
            id: foundry.utils.randomID(),
            received: false,
            rank: 0,
            xp: 100,
            items: [],
            enrichedItems: [],
            notes: "",
            treasure: {
                cp: 0,
                sp: 0,
                gp: 0,
                pp: 0,
            }
        }
        this.object.rewards[reward.id] = reward;

        await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));

        this.render();
    }

    static async removeReward(event, target) {
        let id = target.dataset.id;
        Dialog.confirm({
            title: `Delete Reward`,
            content: `<h4>Are You Sure?</h4><p>This Reward will be permanently deleted and cannot be recovered.</p>`,
            yes: async () => {
                delete this.object.rewards[id];
                await this.party.subsystems.deleteData(foundry.utils.deepClone(this.object), `rewards.${id}`);
                this.render();
            },
            no: () => { return; },
        });
    }

    static async expandReward(event, target, fast = false) {
        let id = target.dataset.id;
        this.expandReward(id);
    }

    async expandReward(id, fast = false) {
        let allCollapsed = true;
        const $html = $(this.element);
        const duration = fast ? 0 : 0.4
        for(const rewardSummary of $html.find(".reward-summary")) {
            if(rewardSummary.dataset.id === id && rewardSummary.hidden) {
                gsap.fromTo(
                    rewardSummary,
                    { height: 0, opacity: 0, hidden: false },
                    { height: "auto", opacity: 1, duration},
                )
                this.object.expandedReward = id;
                allCollapsed = false;
                this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
            }
            else if(!rewardSummary.hidden) {
                gsap.to(rewardSummary, {
                    height: 0,
                    duration,
                    opacity: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                    margin: 0,
                    clearProps: "all",
                    onComplete: () => {
                        rewardSummary.hidden = true;
                    },
                })
            }
        }
        if(allCollapsed) {
            this.object.expandedReward = null;
            await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
        }
    }

    async addRewardItem(id, item) {
        console.log("item", item)
        let source = await fromUuid(item._stats.compendiumSource);
        console.log("source", source)
        if(!source) return;
        this.object.rewards[id].items.push(await foundry.utils.deepClone(source));
        this.object.rewards[id].enrichedItems.push(await TextEditor.enrichHTML(`@UUID[${source.uuid}]{${source.name}}`));

        await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
        this.render();
    }

    static async removeRewardItem(event, target) {
        let id = target.dataset.rewardid;
        let index = target.dataset.index;
        Dialog.confirm({
            title: `Remove Item`,
            content: `<h4>Are You Sure?</h4><p>This Item will be permanently removed and cannot be recovered.</p>`,
            yes: async () => {
                this.object.rewards[id].items.splice(index, 1);
                this.object.rewards[id].enrichedItems.splice(index, 1);

                await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
                this.render();
            },
            no: () => { return; },
        });
        
    }

    generateCheckPrompt(actionType, id) {
        this.checkPrompt = Hooks.on("preCreateChatMessage", (chatObj, chatDetails) => this.capturedCheckPromptMessage(chatObj, chatDetails, actionType, id))

        game.pf2e.gm.checkPrompt();
    }

    capturedCheckPromptMessage(chatObj, chatDetails, actionType, id) {
        if(!(chatDetails.content.search("@Check"))) {return;}

        let content = chatDetails.content.replaceAll("p>", "div>")
        console.log("content:", content)
        Hooks.off("preCreateChatMessage", this.checkPrompt)
    }

}