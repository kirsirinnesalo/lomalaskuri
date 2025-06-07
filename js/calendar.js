import { getVacations } from './settings.js';
import { getDefaultHolidays } from './holidays.js';

let calendarYear = (new Date()).getFullYear();
let calendarMonth = (new Date()).getMonth();

export function renderCalendar() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;

    const vacations = getVacations();
    const holidays = getDefaultHolidays();
    const year = calendarYear;
    const month = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const weekdays = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
    const monthName = firstDay.toLocaleString('fi', { month: 'long', year: 'numeric' });

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    let html = `<div class="calendar-wrapper">
        <div class="calendar-today-link-row">
            <a href="#" id="calendarTodayLink" class="calendar-today-link"${isCurrentMonth ? ' style="visibility:hidden;pointer-events:none;"' : ''}>Tänään</a>
        </div>
        <div class="calendar-header">
            <button id="prevMonthBtn">&#8592;</button>
            <span>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
            <button id="nextMonthBtn">&#8594;</button>
        </div>
        <table class="calendar-table">
            <thead>
                <tr>${weekdays.map(d => `<th>${d}</th>`).join('')}</tr>
            </thead>
            <tbody>
                <tr>
    `;

    let startDay = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startDay; i++) html += `<td></td>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month, day);
        let isHoliday = holidays.some(h => h.date === dateStr);
        let isVacation = vacations.some(v =>
            dateStr >= v.start && dateStr <= (v.end || v.start)
        );
        let isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        let tdClass = '';
        if (isHoliday) tdClass = 'calendar-legend-holiday';
        else if (isVacation) tdClass = 'calendar-legend-vacation';
        else if (isWeekend) tdClass = 'calendar-legend-weekend';

        if (isCurrentMonth && day === today.getDate()) {
            tdClass += (tdClass ? ' ' : '') + 'calendar-today';
        }

        let title = '';
        if (isHoliday) {
            const h = holidays.find(h => h.date === dateStr);
            title += h ? h.name : '';
        }
        if (isVacation) {
            const v = vacations.find(v => dateStr >= v.start && dateStr <= (v.end || v.start));
            if (title) title += ', ';
            title += v && v.name ? v.name : 'loma';
        }
        if (isWeekend && !isHoliday && !isVacation) {
            title = 'viikonloppu';
        }
        html += `<td class="${tdClass}" title="${title}">${day}</td>`;
        if ((startDay + day) % 7 === 0 && day !== daysInMonth) html += '</tr><tr>';
    }

    let endDay = (startDay + daysInMonth) % 7;
    if (endDay !== 0) for (let i = endDay; i < 7; i++) html += `<td></td>`;

    html += '</tr></tbody></table>';
    html += `<div class="calendar-legend">
        <span class="calendar-legend-swatch calendar-legend-holiday"></span> Pyhä
        <span class="calendar-legend-swatch calendar-legend-vacation"></span> Loma
        <span class="calendar-legend-swatch calendar-legend-weekend"></span> Viikonloppu
    </div></div>`;

    container.innerHTML = html;

    initCalendarEvents();
}

function initCalendarEvents() {
    document.getElementById('prevMonthBtn').onclick = function () {
        calendarMonth--;
        if (calendarMonth < 0) {
            calendarMonth = 11;
            calendarYear--;
        }
        renderCalendar();
    };

    document.getElementById('nextMonthBtn').onclick = function () {
        calendarMonth++;
        if (calendarMonth > 11) {
            calendarMonth = 0;
            calendarYear++;
        }
        renderCalendar();
    };

    const todayLink = document.getElementById('calendarTodayLink');
    if (todayLink) {
        todayLink.onclick = function (e) {
            e.preventDefault();
            const today = new Date();
            calendarYear = today.getFullYear();
            calendarMonth = today.getMonth();
            renderCalendar();
        };
    }
}
