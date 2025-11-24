// ==UserScript==
// @name         RoM - Better Depot
// @namespace    http://tampermonkey.net/
// @version      3
// @description  ItemShop - Besseres Depo
// @author       You
// @match        https://eu-shop-runesofmagic.gameforge.com/depotitems*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gameforge.com
// @grant        none
// ==/UserScript==
(function () {
    'use strict';
    const items = {};
    let num = 0;
    async function takeItemByName(name, count, reload) {
        num = num + 1;
        const data = items[name];
        if (!data) {
            console.log(`${name} not found`);
            return;
        }
        if (count == null) count = data.urls.length;
        count = Math.max(1, Math.min(count, data.urls.length));
        for (let i = 0; i < count; i++) {
            const viewUrl = data.urls.pop();
            const popup = $(await (await fetch(viewUrl)).text());
            const oneChar = popup.find('.one_char');
            const transaction = oneChar.data('transactionId') || '';
            const player = oneChar.data('playerId') || '-1';
            const server = oneChar.data('serverId') || '-1';
            const url = popup.filter('script').html().match(/distributionURL = "(.+)";/)[1];
            const getUrl = url
                .replace(/%selection%/, '-1')
                .replace(/%amount%/, '1') // immer 1 pro Request
                .replace(/%server%/, server)
                .replace(/%player%/, player)
                .replace(/%transaction%/, transaction);
            await (await fetch(getUrl)).text();
            updateEntryCount(name); // Anzeige + Dropdown-Optionen aktualisieren
        }
        num = num - 1;
        if (reload && num === 0) {
            window.location.reload();
        }
    }
    // Dropdown erstellen (mit Styles für Breite + Scrollbar)
    function createCountDropdown(initialMax) {
        const dropdown = $(`
            <div class="dropdown" style="display:inline-block; margin-right:6px;">
                <button class="dropdown-toggle" type="button" data-toggle="dropdown" style="width: 60px;">
                    <span class="dropdown-selection" data-count="1">1</span>
                    <span class="btn-default"><span class="caret"></span></span>
                </button>
                <ul class="dropdown-menu" style="max-height: 200px; overflow-y: auto; width: 60px;"></ul>
            </div>
        `);
        rebuildDropdownMenu(dropdown, initialMax);
        return dropdown;
    }
    function rebuildDropdownMenu(dropdown, maxCount) {
        const menu = dropdown.find('.dropdown-menu');
        menu.empty();
        let current = parseInt(dropdown.find('.dropdown-selection').data('count'), 10);
        if (!Number.isFinite(current) || current < 1) current = 1;
        for (let i = 1; i <= maxCount; i++) {
            menu.append(`<li><a class="dropdown-option" data-count="${i}" href="#"><span>${i}</span></a></li>`);
        }
        menu.find('.dropdown-option').on('click', function (e) {
            e.preventDefault();
            const c = $(this).data('count');
            dropdown.find('.dropdown-selection').data('count', c).text(c);
        });
        if (current > maxCount) {
            dropdown.find('.dropdown-selection').data('count', maxCount).text(maxCount);
        }
    }
    function doEntry(index, entry) {
        const name = entry.attr('data-sort-name');
        const url = entry.find('button.assign[href*=depot]').attr('href');
        if (items[name]) {
            items[name].urls.push(url);
            entry.remove();
            return;
        }
        items[name] = {
            obj: entry,
            name,
            urls: [url],
        };
        const pd = $(entry.find('.price_desc'));
        pd.children().remove();
        const dropdown = createCountDropdown(1);
        const take = $('<button class="btn-default assign"><span style="font-size: 11px;">Nehmen</span></button>')
        .css({
            "margin-left": "4px",
            "height": "26px",
            "padding": "2px 6px",
            "float": "none",
            "display": "inline-block",
            "vertical-align": "middle"
        });
        const takeAll = $('<button class="btn-default assign"><span style="font-size: 11px;">Alle Nehmen</span></button>')
        .css({
            "float": "right",
            "height": "26px",
            "padding": "2px 6px"
        });
        take.on('click', () => {
            const val = parseInt(dropdown.find('.dropdown-selection').data('count'), 10) || 1;
            takeItemByName(name, val, true);
        });
        takeAll.on('click', () => takeItemByName(name, null, true));
        pd.append(dropdown);
        pd.append(take);
        pd.append(takeAll);
    }
    function updateEntryCount(name) {
        const entry = items[name];
        if (!entry) return;
        entry.obj.find('.card-heading').html(`${entry.urls.length} x ${entry.name}`);
        const pd = entry.obj.find('.price_desc');
        const dd = pd.find('.dropdown');
        if (dd.length) {
            rebuildDropdownMenu(dd, entry.urls.length);
        }
    }
    function depotpage() {
        const depotitems = $('li.depot-item.shown');
        depotitems.each((index, e) => doEntry(index, $(e)));
        // jetzt, wo alle zusammengeführt sind, Max-Werte + Anzeige aktualisieren
        Object.keys(items).forEach(name => updateEntryCount(name));
    }
    depotpage();
})();

