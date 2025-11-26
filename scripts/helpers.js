export function registerHandlebarsHelpers() {

    Handlebars.registerHelper("itemButton", (index, enrichedItem) => {
        var dom = document.createElement('div');
        dom.dataset.index = index;
        //dom.className = "itemBar"
        dom.innerHTML = enrichedItem + `<i class="fa fa-times-circle" data-index=${index} data-action="remove-item"></i>`

        return dom.outerHTML;
    });

    Handlebars.registerHelper("isEmpty", (obj) => {
        return Object.keys(obj).length === 0;
    })
}