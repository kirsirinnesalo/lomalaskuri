import { loadSettingsToUI, initSettingsEvents } from './settings.js';
import { renderCalendar } from './calendar.js';
import { updateCounterView } from './counter.js';

function updateAllViews() {
    loadSettingsToUI();
    renderCalendar();
    updateCounterView();
}

document.addEventListener('DOMContentLoaded', async function () {
    const response = await fetch('html/settings.html');
    const html = await response.text();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const template = tempDiv.querySelector('template');
    if (template) {
        document.getElementById('settingsContainer').appendChild(template.content.cloneNode(true));
    }

    initSettingsEvents();
    updateAllViews();
});

document.addEventListener('settings:saved', () => {
    updateAllViews();
});

