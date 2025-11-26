import { PF2e_Subsystems as PFSS } from "./pf2e-subsystems.js"

export const HooksPF2e_Subsystems = {
    listen() {
        Hooks.once("ready", () => {
            console.log("PF2e Subsystems | Starting pf2e-subsystems");
        });

        Hooks.once("init", async function () {
            console.log("PF2e Subsystems | Initializing pf2e-subsystems");
            let templates = [
                "modules/pf2e-subsystems/templates/subsystems.hbs",
                //"modules/pf2e-subsystems/templates/partials/vp-sidebar.hbs",

                //"modules/pf2e-subsystems/templates/partials/edit-vp-action.hbs",
                //"modules/pf2e-subsystems/templates/partials/summary-vp-action.hbs",
            ]
            await loadTemplates(templates);

            $('head').append($('<script src="https://raw.githack.com/SortableJS/Sortable/master/Sortable.js"></script>'))
        });

        Hooks.on("renderActorSheet", async function(actorSheet, html, obj) {
            if (!(obj.actor.type === "party")) {return;};

            let party = actorSheet.actor;

            window.myHTML = html

            if(!party.subsystems) {
                party.subsystems = await new PFSS(party, html);
            }
            else await party.subsystems.initSubsystems(html);

            if(party.subsystems.renderTab) {
                party.sheet._tabs[0].activate('subsystems');
                party.subsystems.renderTab = false;
            }
            
        });
    }
}