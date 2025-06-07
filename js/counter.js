import { getSettings, getVacations } from './settings.js';
import { getDefaultHolidays } from './holidays.js';

function formatDateLocal(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateRange(start, end) {
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startMonth = start.getMonth();
    const endMonth = end.getMonth();
    const startDate = start.getDate();
    const endDate = end.getDate();

    if (startYear === endYear && startMonth === endMonth) {
        return `${startDate}.–${endDate}.${endMonth+1}.${endYear}`;
    } else if (startYear === endYear) {
        return `${startDate}.${startMonth+1}.–${endDate}.${endMonth+1}.${endYear}`;
    } else {
        return `${startDate}.${startMonth+1}.${startYear}–${endDate}.${endMonth+1}.${endYear}`;
    }
}

function getWeekdayNameFi(day) {
    return ['sunnuntai', 'maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai'][day];
}

function getVacationForDate(date, vacations) {
    return vacations.find(v =>
        date >= v.start && date <= (v.end && v.end.length === 10 ? v.end : v.start)
    );
}

function getHolidaysForDate(date, holidays) {
    return holidays.filter(h => h.date === date);
}

function isWorkday(date, workWeekdays) {
    return workWeekdays.includes(date.getDay());
}

function getFreeTypesAndNames(date, vacations, holidays, workWeekdays) {
    const dateInLocalFormat = formatDateLocal(date);
    const types = [];
    const names = [];
    const currentVacation = getVacationForDate(dateInLocalFormat, vacations);

    if (currentVacation) {
        types.push('loma');
        if (currentVacation.name) names.push(currentVacation.name);
    }

    const todayHolidays = getHolidaysForDate(dateInLocalFormat, holidays);
    todayHolidays.forEach(h => {
        if (h.name) names.push(h.name);
    });
    if (todayHolidays.length > 0) {
        types.push('pyhä');
    }

    const isDateWorkday = isWorkday(date, workWeekdays);
    const day = date.getDay();
    const uniqueWeekend = [0, 6].filter(d => !workWeekdays.includes(d));

    if (!isDateWorkday && uniqueWeekend.length === 1 && day === uniqueWeekend[0]) {
        const dayName = getWeekdayNameFi(day);
        if (!types.includes(dayName)) types.unshift(dayName);
    }
    else if (!isDateWorkday && !currentVacation && todayHolidays.length === 0 && (day >= 1 && day <= 5)) {
        types.push(getWeekdayNameFi(day));
    }
    else if (!isDateWorkday && !currentVacation && todayHolidays.length === 0 && uniqueWeekend.length === 2 && (day === 0 || day === 6)) {
        types.push('viikonloppu');
    }

    return { types, names, currentVacation, isWorkday: isDateWorkday };
}

function getCurrentFreePeriod(today, vacations, holidays, workWeekdays) {
    const { types, names, currentVacation, isWorkday } = getFreeTypesAndNames(today, vacations, holidays, workWeekdays);

    let freeStart = new Date(today);
    let freeEnd = new Date(today);

    if (currentVacation) {
        freeStart = new Date(currentVacation.start);
        freeEnd = new Date(currentVacation.end && currentVacation.end.length === 10 ? currentVacation.end : currentVacation.start);
    } else if (!isWorkday) {
        freeStart = new Date(today);
        while (workWeekdays.includes(freeStart.getDay())) {
            freeStart.setDate(freeStart.getDate() - 1);
        }
        freeEnd = new Date(today);
        while (!workWeekdays.includes(freeEnd.getDay())) {
            freeEnd.setDate(freeEnd.getDate() + 1);
        }
        freeEnd.setDate(freeEnd.getDate() - 1);
    }

    return { types, names, currentVacation, isWorkday, freeStart, freeEnd };
}

function getHolidaysDuringPeriod(start, end, holidays) {
    let pyhat = [];
    let d = new Date(start);
    while (d <= end) {
        const currentDate = formatDateLocal(d);
        const dayHolidays = holidays.filter(h => h.date === currentDate);
        dayHolidays.forEach(h => {
            if (h.name && !pyhat.some(p => p.name === h.name && p.date === currentDate)) {
                pyhat.push({ name: h.name, date: currentDate });
            }
        });
        d.setDate(d.getDate() + 1);
    }
    return pyhat;
}

function getNextFreeAfter(date, vacations, holidays, workWeekdays) {
    let check = new Date(date);
    check.setHours(0,0,0,0);
    for (let i = 0; i < 366; i++) {
        const { types, names } = getFreeTypesAndNames(check, vacations, holidays, workWeekdays);
        if (types.length > 0) {
            return { date: new Date(check), types, names };
        }
        check.setDate(check.getDate() + 1);
    }
    return null;
}

function getWorkTimes(now, workdayStart, workdayEnd) {
    const [startHour, startMin] = workdayStart.split(':').map(Number);
    const [endHour, endMin] = workdayEnd.split(':').map(Number);
    const workStart = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(),
        startHour, startMin || 0, 0, 0
    );
    const workEnd = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(),
        endHour, endMin || 0, 0, 0
    );
    return { workStart, workEnd };
}

function getTimeLeft(now, workEnd) {
    let msLeft = workEnd - now;
    if (msLeft <= 0) return null;
    const hours = Math.floor(msLeft / (1000 * 60 * 60));
    msLeft -= hours * 1000 * 60 * 60;
    const minutes = Math.floor(msLeft / (1000 * 60));
    msLeft -= minutes * 1000 * 60;
    const seconds = Math.floor(msLeft / 1000);
    return { hours, minutes, seconds };
}

function getNextFreeStreakLength(startDate, vacations, holidays, workWeekdays) {
    let streak = 1;
    let d = new Date(startDate);
    while (true) {
        d.setDate(d.getDate() + 1);
        const types = getFreeTypesAndNames(d, vacations, holidays, workWeekdays).types;
        if (types.length === 0) break;
        streak++;
    }
    return streak;
}

function getNextFreeStreakNames(startDate, vacations, holidays, workWeekdays) {
    const streak = [];
    let d = new Date(startDate);
    let counted = new Set();

    while (true) {
        const { types, names } = getFreeTypesAndNames(d, vacations, holidays, workWeekdays);
        if (types.length === 0) break;

        if (names.length > 0) {
            names.forEach(n => {
                if (!counted.has(n)) {
                    streak.push(n);
                    counted.add(n);
                }
            });
        } else if (types.length > 0) {
            types.forEach(t => {
                if (!counted.has(t)) {
                    streak.push(t);
                    counted.add(t);
                }
            });
        }

        d.setDate(d.getDate() + 1);
        if (getFreeTypesAndNames(d, vacations, holidays, workWeekdays).types.length === 0) break;
    }
    return streak;
}

function renderCurrentFreeHeader(types, names) {
    if (types.includes('viikonloppu')) return 'viikonloppu';
    if (names.length > 0) return names[0];
    if (types.length > 0) return types[0];
    return '';
}

function renderCurrentFreeDate(freeStart, freeEnd) {
    if (formatDateLocal(freeStart) === formatDateLocal(freeEnd)) {
        return freeStart.toLocaleDateString('fi');
    } else {
        return formatDateRange(freeStart, freeEnd);
    }
}

function renderHolidaysDuringFree(pyhat) {
    if (pyhat.length === 0) return '';
    return `<div class="freeInfo">Myös ${pyhat.map(p => `${p.name} (${new Date(p.date).toLocaleDateString('fi')})`).join(', ')}</div>`;
}

function renderTimeRows(diffDays, hours, minutes, seconds) {
    const rows = [];
    if (diffDays > 0) {
        rows.push({
            value: diffDays,
            label: diffDays === 1 ? 'päivä' : 'päivää'
        });
    }
    if (diffDays > 0 || hours > 0) {
        rows.push({
            value: hours,
            label: hours === 1 ? 'tunti' : 'tuntia'
        });
    }
    if (diffDays > 0 || hours > 0 || minutes > 0) {
        rows.push({
            value: minutes,
            label: minutes === 1 ? 'minuutti' : 'minuuttia'
        });
    }
    rows.push({
        value: seconds,
        label: seconds === 1 ? 'sekunti' : 'sekuntia'
    });
    return rows;
}

function renderTimerHtml(timer) {
    return timer.map((l, i) =>
        `<div class="timerLine">
            <span class="timerValue">${l.value}</span>
            <span class="timerLabel">${l.label}</span>
        </div>`
    ).join('\n');
}

function renderNextFreeTimeCounter(isTodayWorkday, isNextFreeToday, diffDays, now, workEnd) {
    const endedMsg = `
        <div class="nextFreeTimer">
            <span class="timerLabel">Työpäivä on jo päättynyt – vapaa on alkanut!</span>
        </div>
    `;
    if (isTodayWorkday && !isNextFreeToday) {
        const timeLeft = getTimeLeft(now, workEnd);
        if (timeLeft) {
            let { hours, minutes, seconds } = timeLeft;
            if (diffDays === 1 && workEnd - now > 0) diffDays = 0;
            const timer = renderTimeRows(diffDays, hours, minutes, seconds);
            setHeadTitleFromTimer({ timer });
            return `
                <div class="nextFreeTimer">
                    ${renderTimerHtml(timer)}
                </div>
            `;
        } else {
            setHeadTitleFromTimer({ ended: true });
            return endedMsg;
        }
    } else if (isTodayWorkday && isNextFreeToday) {
        setHeadTitleFromTimer({ ended: true });
        return endedMsg;
    } else if (diffDays > 0) {
        const timer = [{
            value: diffDays,
            label: diffDays === 1 ? 'päivä' : 'päivää'
        }];
        setHeadTitleFromTimer({ timer });
        return `
            <div class="nextFreeTimer">
                ${renderTimerHtml(timer)}
            </div>
        `;
    } else {
        setHeadTitleFromTimer({ isFreeDayMode: true });
        return '';
    }
}

function getAfterDate(today, currentVacation, isWorkday, workWeekdays) {
    let d;
    if (currentVacation) {
        d = new Date(currentVacation.end && currentVacation.end.length === 10 ? currentVacation.end : currentVacation.start);
        d.setDate(d.getDate() + 1);
    } else if (!isWorkday) {
        d = new Date(today);
        while (!workWeekdays.includes(d.getDay())) {
            d.setDate(d.getDate() + 1);
        }
    } else {
        d = new Date(today);
        d.setDate(d.getDate() + 1);
    }
    return formatDateLocal(d);
}

function getNextFreeInfo(nextFree) {
    const visibleTypes = nextFree.types.filter(t => t !== 'pyhä');
    let label, name;
    if (
        visibleTypes.length === 1 &&
        nextFree.names.length === 1 &&
        ['sunnuntai', 'maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai'].includes(visibleTypes[0])
    ) {
        label = "Seuraava vapaa on ";
        name = `${visibleTypes[0]} (${nextFree.names[0]})`;
    } else if (nextFree.types.includes('loma')) {
        label = "Seuraava loma on";
        name = nextFree.names.join(', ');
    } else {
        label = "Seuraava vapaa on ";
        if (visibleTypes.length === 0 && nextFree.names.length > 0) {
            name = nextFree.names.join(', ');
        } else {
            name = visibleTypes.join(', ') + (nextFree.names.length ? ' – ' + nextFree.names.join(', ') : '');
        }
    }
    return { label, name };
}

function getNextFreeDayText(diffDays) {
    if (diffDays === 1) {
        return ', huomenna';
    } else if (diffDays > 1) {
        return `, ${diffDays} päivän päästä`;
    }
    return '';
}

function getNextFreeStreakInfo(nextFree, workWeekdays) {
    const streakNames = getNextFreeStreakNames(nextFree.date, getVacations(), getDefaultHolidays(), workWeekdays);
    const streakLength = getNextFreeStreakLength(nextFree.date, getVacations(), getDefaultHolidays(), workWeekdays);
    if (streakNames.length > 1) {
        return `<div class="freeInfo">Huom! Pitkä vapaa: ${streakNames.join(' ja ')} (${streakLength} päivää)</div>`;
    }
    return '';
}

function renderNextFree(nextFree, today) {
    if (!nextFree) {
        setHeadTitleFromTimer({});
        return `<div class="nextFree">Ei vapaita tiedossa.</div>`;
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    const now = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const nextFreeStart = new Date(nextFree.date);
    nextFreeStart.setHours(0, 0, 0, 0);
    let diffDays = Math.ceil((nextFreeStart - todayStart) / msPerDay);

    const settings = typeof getSettings === 'function' ? getSettings() : { weekdays: [1,2,3,4,5], workdayStart: '08:00', workdayEnd: '16:00' };
    const workWeekdays = settings.weekdays || [1,2,3,4,5];
    const workdayStart = settings.workdayStart || '08:00';
    const workdayEnd = settings.workdayEnd || '16:00';

    const isTodayWorkday = workWeekdays.includes(now.getDay());
    const isNextFreeToday = formatDateLocal(now) === formatDateLocal(nextFreeStart);

    const { workStart, workEnd } = getWorkTimes(now, workdayStart, workdayEnd);

    const dayText = getNextFreeDayText(diffDays);

    if (diffDays > 0 && isTodayWorkday && !isNextFreeToday && now >= workStart) {
        diffDays -= 1;
    }

    const { label, name } = getNextFreeInfo(nextFree);
    const streakText = getNextFreeStreakInfo(nextFree, workWeekdays);

    const showTimer = isTodayWorkday && diffDays >= 0;

    return `
        <div class="nextFree">${label} ${nextFree.date.toLocaleDateString('fi')} – ${name}${dayText}</div>
        ${streakText}
        ${showTimer ? renderNextFreeTimeCounter(isTodayWorkday, isNextFreeToday, diffDays, now, workEnd) : ''}
    `;
}

function setHeadTitleFromTimer({ isVacationMode, isHolidayMode, holidayName, isWeekendMode, isFreeDayMode, timer, ended }) {
    if (ended) {
        document.title = 'Työpäivä on jo päättynyt – vapaa on alkanut!';
        return;
    }
    if (isVacationMode) {
        document.title = 'Loma!';
    } else if (isHolidayMode) {
        document.title = holidayName ? `${holidayName}!` : 'Pyhä!';
    } else if (isWeekendMode) {
        document.title = 'Viikonloppu!';
    } else if (isFreeDayMode) {
        document.title = 'Vapaapäivä!';
    } else if (timer && timer.length) {
        document.title = timer.map(l => `${l.value} ${l.label}`).join(' ') + ' jäljellä';
    } else {
        document.title = 'Ei vapaita tiedossa';
    }
}

function setMainTitle(types, names, currentVacation, isWorkday, today, workWeekdays, vacations, holidays) {
    const mainTitle = document.getElementById('mainTitle');
    if (types.length > 0) {
        mainTitle.textContent = `Nyt on ${renderCurrentFreeHeader(types, names)}`;
    } else {
        let afterDate = getAfterDate(today, currentVacation, isWorkday, workWeekdays);
        const nextFree = getNextFreeAfter(afterDate, vacations, holidays, workWeekdays);
        const visibleTypes = nextFree ? nextFree.types.filter(t => t !== 'pyhä') : [];
        let name = '';
        if (
            nextFree &&
            visibleTypes.length === 1 &&
            nextFree.names.length === 1 &&
            ['sunnuntai', 'maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai'].includes(visibleTypes[0])
        ) {
            name = `${visibleTypes[0]} (${nextFree.names[0]})`;
        } else if (nextFree && nextFree.types.includes('loma')) {
            name = nextFree.names.join(', ');
        } else if (nextFree && visibleTypes.length === 0 && nextFree.names.length > 0) {
            name = nextFree.names.join(', ');
        } else if (nextFree) {
            name = visibleTypes.join(', ') + (nextFree.names.length ? ' – ' + nextFree.names.join(', ') : '');
        }
        mainTitle.textContent = `Seuraava vapaa: ${name}`;
    }
}

function renderCurrentFreeBlock(types, names, freeStart, freeEnd, today, currentVacation, isWorkday, workWeekdays, vacations, holidays) {
    const freeName = renderCurrentFreeHeader(types, names);
    const freeNameCapitalized = freeName.charAt(0).toUpperCase() + freeName.slice(1);
    let html = `<div class="currentFreeHeader">${freeNameCapitalized} ${renderCurrentFreeDate(freeStart, freeEnd)}</div>`;
    const pyhat = getHolidaysDuringPeriod(today, freeEnd, holidays);
    html += renderHolidaysDuringFree(pyhat);

    let afterDate = getAfterDate(today, currentVacation, isWorkday, workWeekdays);
    const nextFree = getNextFreeAfter(afterDate, vacations, holidays, workWeekdays);
    html += `${renderNextFree(nextFree, today)}`;
    return html;
}

function renderNextFreeBlock(today, currentVacation, isWorkday, workWeekdays, vacations, holidays) {
    let afterDate = getAfterDate(today, currentVacation, isWorkday, workWeekdays);
    const nextFree = getNextFreeAfter(afterDate, vacations, holidays, workWeekdays);
    return `${renderNextFree(nextFree, today)}`;
}

export function updateCounterView() {
    const container = document.getElementById('counterContainer');
    if (!container) return;

    const today = new Date();
    const { weekdays: workWeekdays } = getSettings();
    const vacations = getVacations();
    const holidays = getDefaultHolidays();

    const { types, names, currentVacation, isWorkday, freeStart, freeEnd } = getCurrentFreePeriod(today, vacations, holidays, workWeekdays);

    setHeadTitleFromTimer({
        isVacationMode: types.includes('loma'),
        isHolidayMode: types.includes('pyhä'),
        holidayName: names.length > 0 ? names[0] : undefined,
        isWeekendMode: types.includes('viikonloppu'),
        isFreeDayMode: (
            types.includes('lauantai') ||
            types.includes('sunnuntai') ||
            ['maanantai','tiistai','keskiviikko','torstai','perjantai'].some(d => types.includes(d))
        )
    });
    setMainTitle(types, names, currentVacation, isWorkday, today, workWeekdays, vacations, holidays);

    let html = '';
    if (types.length > 0) {
        html += renderCurrentFreeBlock(types, names, freeStart, freeEnd, today, currentVacation, isWorkday, workWeekdays, vacations, holidays);
    } else {
        html += renderNextFreeBlock(today, currentVacation, isWorkday, workWeekdays, vacations, holidays);
    }

    container.innerHTML = html;
}

if (typeof window !== 'undefined') {
    if (window.__lomaCounterInterval) {
        clearInterval(window.__lomaCounterInterval);
    }
    window.__lomaCounterInterval = setInterval(updateCounterView, 1000);
}

