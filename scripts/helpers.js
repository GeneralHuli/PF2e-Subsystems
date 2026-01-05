export function registerHandlebarsHelpers() {

    Handlebars.registerHelper("itemButton", (index, enrichedItem, rewardID) => {
        var dom = document.createElement('div');
        dom.dataset.index = index;
        dom.innerHTML = enrichedItem + `<i class="fa fa-times-circle" data-index=${index} data-action="removeRewardItem" data-rewardID=${rewardID}></i>`
        return dom.outerHTML;
    });

    Handlebars.registerHelper("targetButton", (enrichedTarget, influenceID) => {
        var dom = document.createElement('div');
        dom.innerHTML = enrichedTarget + `<i class="fa fa-times-circle" data-action="removeTarget"></i>`
        return enrichedTarget + `<i class="fa fa-times-circle" data-action="removeTarget"></i>`
        return dom.outerHTML;
    });

    Handlebars.registerHelper("isEmpty", (obj) => {
        return Object.keys(obj).length === 0;
    })
}