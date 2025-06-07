import { getDefaultHolidays } from './holidays.js';

export const DEFAULT_VACATION_NAME = 'loma';

let lastRemovedVacation = null;
let lastRemovedVacationIndex = null;

export function getSettings() {
    let workdayStart = localStorage.getItem('workdayStart') || '09:00';
    let workdayEnd = localStorage.getItem('workdayEnd') || '16:30';
    let weekdays = [1,2,3,4,5];
    try { 
        weekdays = JSON.parse(localStorage.getItem('workWeekdays')) || [1,2,3,4,5]; 
    } catch {}
    return { workdayStart, workdayEnd, weekdays };
}

function setSettings(settings) {
    localStorage.setItem('workdayStart', settings.workdayStart);
    localStorage.setItem('workdayEnd', settings.workdayEnd);
    localStorage.setItem('workWeekdays', JSON.stringify(settings.weekdays));
}

function saveWorkdaySettings() {
    const weekdays = Array.from(document.querySelectorAll('.weekday-cb'))
        .filter(cb => cb.checked)
        .map(cb => Number(cb.value));
    setSettings({
        workdayStart: document.getElementById('workdayStart').value,
        workdayEnd: document.getElementById('workdayEnd').value,
        weekdays
    });
    showSaveNotice();
    document.dispatchEvent(new Event('settings:saved'));
}

export function getVacations() {
    let vacations = [];
    try {
        vacations = JSON.parse(localStorage.getItem('vacations')) || [];
    } catch { }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    vacations = vacations.filter(v => new Date(v.end) >= today);
    return vacations;
}

function setVacations(vacations) {
    localStorage.setItem('vacations', JSON.stringify(vacations));
}

function showSaveNotice() {
    const notice = document.getElementById('saveNotice');
    notice.style.display = 'block';
    clearTimeout(notice._timeout);
    notice._timeout = setTimeout(() => {
        notice.style.display = 'none';
    }, 2200);
}

function showRemoveNotice() {
    const notice = document.getElementById('removeNotice');
    notice.style.display = 'block';
    clearTimeout(notice._timeout);
    notice._timeout = setTimeout(() => {
        notice.style.display = 'none';
        lastRemovedVacation = null;
        lastRemovedVacationIndex = null;
    }, 4000);
}

function formatDateFi(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function renderHolidays() {
    const holidays = getDefaultHolidays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureHolidays = holidays.filter(h => {
        const d = new Date(h.date);
        d.setHours(0, 0, 0, 0);
        return d >= today;
    });
    futureHolidays.sort((a, b) => a.date.localeCompare(b.date));
    const ul = document.getElementById('holidaysList');
    ul.innerHTML = '';
    if (futureHolidays.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'ei pyhäpäiviä';
        li.style.color = '#888';
        li.style.fontStyle = 'italic';
        ul.appendChild(li);
    } else {
        futureHolidays.forEach(h => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="date-fi">${formatDateFi(h.date)}</span> (${h.name})`;
            ul.appendChild(li);
        });
    }
}

function renderVacations() {
    const vacations = getVacations();
    const ul = document.getElementById('vacationsList');
    ul.innerHTML = '';
    if (vacations.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Ei tulevia lomia';
        li.style.color = '#888';
        li.style.fontStyle = 'italic';
        ul.appendChild(li);
    } else {
        vacations.forEach((v, i) => {
            const name = v.name && v.name.trim() ? v.name : 'loma';
            const startText = formatDateFi(v.start);
            const isSingleDay = !v.end || v.start === v.end;
            const endText = isSingleDay ? startText : formatDateFi(v.end);
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="vacation-date">
                    <span class="start">${!isSingleDay ? startText : ''}</span>
                    <span class="dash">${!isSingleDay ? '–' : ''}</span>
                    <span class="end">${endText}</span>
                </span>
                (${name})
                <button class="remove-vacation" data-index="${i}" title="Poista">&#10006;</button>
            `;
            ul.appendChild(li);
        });
    }
}

export function loadSettingsToUI() {
    const { workdayStart, workdayEnd, weekdays } = getSettings();
    document.getElementById('workdayStart').value = workdayStart;
    document.getElementById('workdayEnd').value = workdayEnd;
    document.querySelectorAll('.weekday-cb').forEach(cb => {
        cb.checked = weekdays.includes(Number(cb.value));
    });
    renderHolidays();
    renderVacations();
}

export function initSettingsEvents() {
    const settingsToggle = document.getElementById('settingsToggle');
    if (settingsToggle) {
        settingsToggle.addEventListener('click', function() {
            const modal = document.getElementById('settingsModal');
            if (modal.classList.contains('active')) {
                modal.classList.remove('active');
                this.classList.remove('active');
                loadSettingsToUI();
            } else {
                modal.classList.add('active');
                this.classList.add('active');
                loadSettingsToUI();
            }
        });
    }

    document.addEventListener('mousedown', function (e) {
        const modal = document.getElementById('settingsModal');
        const toggle = document.getElementById('settingsToggle');
        if (
            modal.classList.contains('active') &&
            !modal.querySelector('.modal-content').contains(e.target) &&
            !toggle.contains(e.target)
        ) {
            modal.classList.remove('active');
            toggle.classList.remove('active');
            loadSettingsToUI();
        }
    });

    const saveSettingsButton = document.getElementById('saveSettings');
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', function () {
            saveWorkdaySettings();
            loadSettingsToUI();
        });
    }

    const vacationForm = document.getElementById('vacationForm');
    if (vacationForm) {
        vacationForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const start = document.getElementById('vacationStart').value;
            const end = document.getElementById('vacationEnd').value;
            const name = document.getElementById('vacationName').value.trim() || DEFAULT_VACATION_NAME;
            if (!start) return;
            let vacations = getVacations();
            vacations.push({ start, end: end && end >= start ? end : start, name });
            setVacations(vacations);
            document.getElementById('vacationStart').value = '';
            document.getElementById('vacationEnd').value = '';
            document.getElementById('vacationName').value = '';
            showSaveNotice();
            saveWorkdaySettings();
            loadSettingsToUI();
        });
    }

    const vacationsList = document.getElementById('vacationsList');
    if (vacationsList) {
        document.getElementById('vacationsList').addEventListener('click', function (e) {
            if (e.target.classList.contains('remove-vacation')) {
                const idx = parseInt(e.target.getAttribute('data-index'));
                let vacations = getVacations();
                lastRemovedVacation = vacations[idx];
                lastRemovedVacationIndex = idx;
                vacations.splice(idx, 1);
                setVacations(vacations);
                showRemoveNotice();
                saveWorkdaySettings();
                loadSettingsToUI();
            }
        });

        document.getElementById('undoRemoveVacation').addEventListener('click', function () {
            if (lastRemovedVacation !== null && lastRemovedVacationIndex !== null) {
                let vacations = getVacations();
                vacations.splice(lastRemovedVacationIndex, 0, lastRemovedVacation);
                setVacations(vacations);
                lastRemovedVacation = null;
                lastRemovedVacationIndex = null;
                document.getElementById('removeNotice').style.display = 'none';
                saveWorkdaySettings();
                loadSettingsToUI();
            }
        });
    }
}

