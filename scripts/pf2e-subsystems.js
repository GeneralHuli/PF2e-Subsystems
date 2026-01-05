import { HooksPF2e_Subsystems } from "./hooks.js";
import { VPPF2eSub } from "./subsystems/vp-subsystem/pf2e-subs-vp.js";
import { ChasePF2eSub } from "./subsystems/chase-subsystem/pf2e-subs-chase.js";
import { InfluencePF2eSub } from "./subsystems/influence-subsystem/pf2e-subs-influence.js";
import { ResearchPF2eSub } from "./subsystems/research-subsystem/pf2e-subs-research.js";
import { InfiltrationPF2eSub } from "./subsystems/infiltration-subsystem/pf2e-subs-infiltration.js";
import { registerHandlebarsHelpers } from "./helpers.js"

const SUBSYSTEMS = {
    vpsubs: {classObj: VPPF2eSub, name: "Victory Points", view: "vpsubs"},
    chasesubs: {classObj: ChasePF2eSub, name: "Chase", view: "chasesubs"},
    influencesubs: {classObj: InfluencePF2eSub, name: "Influence", view: "influencesubs"},
    researchsubs: {classObj: ResearchPF2eSub, name: "Research", view: "researchsubs"},
    infiltrationsubs: {classObj: InfiltrationPF2eSub, name: "Infiltration", view: "infiltrationsubs"},
}

//Register the Hooks and Handlebars Helpers
HooksPF2e_Subsystems.listen();
registerHandlebarsHelpers();

class PF2e_Subsystems {
    subNav = $(`<a data-tab="subsystems">Subsystems</a>`);
    template = "modules/pf2e-subsystems/templates/subsystems.hbs";

    constructor(party, html) {
        this.renderTab = false;
        this.party = party;
        this.currentView = SUBSYSTEMS[Object.keys(SUBSYSTEMS)[0]].view;

        this.subsystemData = this.getSubsystemData()

        this.initSubsystems(html);
    };

    getSubsystemData() {
        let _obj = (this.party.getFlag('pf2e-subsystems','subsystems') ?? {});

        return foundry.utils.deepClone(_obj);
        //return _obj;
    };

    async updateData(object) {
        if(!(this.subsystemData[object.subType])) this.subsystemData[object.subType] = {};
        this.subsystemData[object.subType][object.id] = object

        //this.renderTab = true;
        //await this.party.setFlag('pf2e-subsystems','subsystems', {[object.subType]: {[`-=${object.id}`]: null }});
        this.renderTab = true;
        await this.party.setFlag('pf2e-subsystems','subsystems', foundry.utils.deepClone(this.subsystemData))
    }

    async deleteData(object, path) {
        if(!(this.subsystemData[object.subType])) this.subsystemData[object.subType] = {};
        this.subsystemData[object.subType][object.id] = object

        this.renderTab = true;
        path = path.split(".")

        switch (path.length) {
            case 1:
                await this.party.setFlag('pf2e-subsystems','subsystems', {[object.subType]: {[object.id]: {[`-=${path[0]}`]: null}}});
                break;
            case 2:
                await this.party.setFlag('pf2e-subsystems','subsystems', {[object.subType]: {[object.id]: {[path[0]]: {[`-=${path[1]}`]: null}}}});
                break;
            case 3:
                await this.party.setFlag('pf2e-subsystems','subsystems', {[object.subType]: {[object.id]: {[path[0]]: {[path[1]]: {[`-=${path[2]}`]: null}}}}});
                break;
            case 4:
                await this.party.setFlag('pf2e-subsystems','subsystems', {[object.subType]: {[object.id]: {[path[0]]: {[path[1]]: {[path[2]]: {[`-=${path[3]}`]: null}}}}}});
                break;
        }
    }

    async initSubsystems(html) {
        console.log("Initializing subsystems")
        this.html = html;
        let element = this.html.find(".sub-nav");

        let tab = await foundry.applications.handlebars.renderTemplate([this.template], this.getData())

        element.append(this.subNav);
        element = this.html.find(".container");
        element.append(tab);

        this.setSummaryView(this.currentView);
        this.activateListeners();
    };

    deleteSubsystem(id) {
        let type = this.currentView
        let title = this.subsystemData[type][id].title

        Dialog.confirm({
            title: `Delete Activity: ${title}`,
            content: `<h4>Are You Sure?</h4><p>This Activity will be permanently deleted and cannot be recovered.</p>`,
            yes: () => {
                this.renderTab = true;
                this.party.setFlag('pf2e-subsystems', 'subsystems', {[type]: {[`-=${id}`]: null }})
                delete this.subsystemData[type][id];
            },
            no: () => { return; },
        });
    }

    newSubsystem({subType, ...data}) {
        let subsystem = new SUBSYSTEMS[subType].classObj(this.party, {...data});
        this.updateData(subsystem.object);
        return subsystem;
    };

    editSubsystem({subType, id=null}) {
        let subsystem;
        if(id) {
            subsystem = this.newSubsystem(this.subsystemData[subType][id])
        }
        else {
            subsystem = this.newSubsystem({subType: subType});
        };
        
        subsystem.render(true);
    };

    getData() {
        return{
            subsystems: SUBSYSTEMS,
            isGM: game.user.isGM,
            activities: this.subsystemData,
        };
    };

    activateListeners() {
        // Control active subsystem summary
        for (const button of this.html.find("[data-action=change-subsystem]")) {
            button.addEventListener("click", () => {
                this.setSummaryView(button.dataset.view ?? "vpsubs");
            });
        }
        
        for (const activity of this.html.find(".activity")) {
            let title = $(activity).find(".title")[0];
            title.addEventListener("click", () => {
                this.editSubsystem({subType: this.currentView, id: activity?.dataset.id});
            });
        }

        for(const activity of this.html.find("section.activity[data-id]")) {
            let id = activity.dataset.id;
            for(const button of $(activity).find("[data-action=delete-activity]")) {
                button.addEventListener("click", () => {
                    this.deleteSubsystem(id);
                })
            }
        }

    }

    setSummaryView(view) {
        const content = this.html.find('[data-tab=subsystems]')
        if(!content) return;

        const viewElements = content.find('[data-view]:not([data-action=change-subsystem])');
        for (const element of viewElements) {
            element.hidden = view !== element.dataset.view;
        }

        // Add active css classes to the buttons for styling
        for (const button of content.find("[data-action=change-subsystem]")) {
            button.classList.toggle("active", button.dataset.view === view)
        }

        this.currentView = view;
    }
}

export {PF2e_Subsystems};