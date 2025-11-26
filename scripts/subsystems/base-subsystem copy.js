export class BasePF2eSub extends FormApplication {
    type = 'pf2e-subsystem';

    constructor(party, object, ...options) {
        super(object, options);
        this.party = party;
        this.object = foundry.utils.mergeObject(this.object, {
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

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: 'Edit Subsystem',
            id: 'subsystems-configure',
            classes: ['pf2e-subsystem', 'sheet', 'pf2e', 'action', 'item'],
            template: "modules/pf2e-subsystems/templates/edit-subsystem.hbs",
            width: 775,
            height: 500,
            closeOnSubmit: false,
            submitOnChange: true,
            resizable: true,
            tabs: [
                {
                    navSelector: ".tabs",
                    contentSelector: ".sheet-body",
                    initial: "description",
                },
            ],
            hasSidebar: true,
            dragDrop: [
                { dropSelector: ".itemBar" },
            ]
        });
    }

    async getData(options = {}) {
        const data = super.getData(options);
        data.title = this.object.title;

        const enrichedContent = {};
        enrichedContent.description = await TextEditor.enrichHTML(this.object.description)

        return {
            ...data,
            enrichedContent: enrichedContent,
            owner: game.user.isGM,
            editable: true,
        };
    }

    activateListeners($html) {
        super.activateListeners($html);

        for (const button of $html.find("a.remove-reward")) {
            button.addEventListener("click", async () => {
                await this.removeReward(button.dataset.id)
            });
        }

        const addReward = $html.find("[data-action=add-reward]")
        addReward[0]?.addEventListener("click", async () => {
            await this.addReward()
        });

        for(const reward of $html.find("section.rewards-form")) {
            let id = reward.dataset.id;

            for(const icon of $(reward).find("[data-action=remove-item]")) {
                icon.addEventListener("click", () => {
                    this.removeRewardItem(id, icon.dataset.index);
                });
            }
        }

        for(const rewardTitle of $html.find("[data-action=expand-reward]")) {
            rewardTitle.addEventListener("click", () => {
                this.expandReward($html, rewardTitle.dataset.id);
            });
        }

        for(const expandAction of $html.find("[data-action=toggle-summary]")) {
            expandAction.addEventListener("click", () => {
                let id = $(expandAction).closest("li")[0].dataset.id;
                this.expandAction($html, id)
            });
        }

        for(const editAction of $html.find("[data-action=edit-action]")) {
            editAction.addEventListener("click", async () => {
                let id = editAction.dataset.id;
                let actionSummary = $html.find(`.action-summary[data-id=${id}]`)[0];
                let type = editAction.dataset.type;
                let icon = $(editAction).find("i")[0];

                if(editAction.dataset.tooltip === "Edit Action") {
                    if(actionSummary.hidden) this.expandAction($html, id);
                    actionSummary.innerHTML = await this.editActionHTML(type, id);

                    icon.classList.remove("fa-edit");
                    icon.classList.add("fa-save");
                    editAction.dataset.tooltip = "Save Action";
                }
                else {
                    actionSummary.innerHTML = await this.saveActionHTML(type, id);

                    icon.classList.remove("fa-save");
                    icon.classList.add("fa-edit");
                    editAction.dataset.tooltip = "Edit Action";
                }

                this.activateListeners($(actionSummary));

            });
        }

        for(const addAction of $html.find("[data-action=add-action]")) {
            addAction.addEventListener("click", () => {
                this.addAction(addAction.dataset.type)
            });
        }

        for(const deleteAction of $html.find("[data-action=delete-action]")) {
            deleteAction.addEventListener("click", () => {
                console.log("data",deleteAction.dataset)
                this.removeAction(deleteAction.dataset.type, deleteAction.dataset.id);
            });
        }

        const rewards = $html.find(".rewards-forms");
        if (rewards[0]) {
            Sortable.create(rewards[0], {
                handle: ".drag-handle",
                animation: 200,
                direction: "vertical",
                dragClass: "drag-preview",
                dragoverBubble: true,
                easing: "cubic-bezier(1, 0, 0, 1)",
                fallbackOnBody: true,
                filter: "div.item-summary",
                ghostClass: "drag-gap",
                group: "inventory",
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
            this.expandReward($(this._element[0]), this.object.expandedReward, true);
        }
    }

    async _onDrop(event) {
        const rewardID = event.target.dataset.id;
        const dropData = TextEditor.getDragEventData(event);
        const element = event.target.closest('.itemBar');

        $(element).removeClass('highlight');

        if(dropData.type === "Item") {
            let item = await fromUuid(dropData.uuid);
            this.addRewardItem(rewardID, item);
        }

    }

    _onDragOver(event) {
        const element = event.target.closest('.itemBar');

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

    async _updateObject(_event, formData) {
        console.log("event",_event)
        console.log("formdata", formData)

        for(let [name, value] of Object.entries(formData)) {
            name = name.split(".");
            switch (name.length) {
                case 1:
                    this.object[name[0]] = value;
                    break;
                case 2:
                    this.object[name[0]][name[1]] = value;
                    break;
                case 3:
                    this.object[name[0]][name[1]][name[2]] = value;
                    break;
                case 4:
                    this.object[name[0]][name[1]][name[2]][name[3]] = value;
                    break;
            }
        }
        
        await this.party.subsystems.updateData(foundry.utils.deepClone(this.object))
    }

    async addAction(actionType, options = {}) {
        let action = foundry.utils.mergeObject(options, {
            id: foundry.utils.randomID(),
            name: "New Action",
            description: "",
        },{overwrite: false} )
        console.log("action",action)

        this.object.actions[actionType][action.id] = action;

        await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));

        this.render();
    }

    async removeAction(actionType, id) {
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
    
    async editActionHTML(actionType, id) {
        let actionData = this.object.actions[actionType][id];

        const actionHTML = await foundry.applications.handlebars.renderTemplate(actionData.editTemplate, actionData);

        return actionHTML;
    }

    async saveActionHTML(actionType, id) {
        let actionData = this.object.actions[actionType][id];

        const actionHTML = await foundry.applications.handlebars.renderTemplate(actionData.summaryTemplate, actionData);

        return actionHTML;
    }

    async expandAction($html, id, fast=false) {
        const duration = fast ? 0 : 0.4
        for(const actionSummary of $html.find(".action-summary")) {
            if(actionSummary.dataset.id === id && actionSummary.hidden) {
                gsap.fromTo(
                    actionSummary,
                    { height: 0, opacity: 0, hidden: false },
                    { height: "auto", opacity: 1, duration},
                )
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

    async addReward() {
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

    async removeReward(id) {
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

    async expandReward($html, id, fast = false) {
        var allCollapsed = true;
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
        if(!source) return;
        this.object.rewards[id].items.push(await foundry.utils.deepClone(source));
        this.object.rewards[id].enrichedItems.push(await TextEditor.enrichHTML(`@UUID[${source.uuid}]{${source.name}}`));

        await this.party.subsystems.updateData(foundry.utils.deepClone(this.object));
        this.render();
    }

    async removeRewardItem(id, index) {
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