
function getEasterDate(y) {
    const f = Math.floor,
        G = y % 19,
        C = f(y / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (y + f(y / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);
    return new Date(y, month - 1, day);
}

function getYearHolidays(y) {
    const easter = getEasterDate(y);
    const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
    const easterMonday = new Date(easter); easterMonday.setDate(easter.getDate() + 1);
    const ascensionDay = new Date(easter); ascensionDay.setDate(easter.getDate() + 39);
    const pentecost = new Date(easter); pentecost.setDate(easter.getDate() + 49);
    let midsummerEve, midsummerDay;
    for (let d = new Date(`${y}-06-20`); d.getMonth() === 5 && d.getDate() <= 26; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 5) midsummerEve = new Date(d);
        if (d.getDay() === 6) midsummerDay = new Date(d);
        if (midsummerEve && midsummerDay) break;
    }
    let allSaintsDay = null;
    for (let d = new Date(`${y}-10-31`); d.getMonth() === 9 || (d.getMonth() === 10 && d.getDate() <= 6); d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 6) {
            allSaintsDay = new Date(d);
            break;
        }
    }
    return [
        { date: `${y}-01-01`, name: "uudenvuodenpäivä" },
        { date: `${y}-01-06`, name: "loppiainen" },
        { date: `${y}-05-01`, name: "vappu" },
        { date: `${y}-12-06`, name: "itsenäisyyspäivä" },
        { date: `${y}-12-24`, name: "jouluaatto" },
        { date: `${y}-12-25`, name: "joulupäivä" },
        { date: `${y}-12-26`, name: "tapaninpäivä" },
        { date: `${goodFriday.getFullYear()}-${String(goodFriday.getMonth() + 1).padStart(2, '0')}-${String(goodFriday.getDate()).padStart(2, '0')}`, name: "pitkäperjantai" },
        { date: `${easter.getFullYear()}-${String(easter.getMonth() + 1).padStart(2, '0')}-${String(easter.getDate()).padStart(2, '0')}`, name: "pääsiäispäivä" },
        { date: `${easterMonday.getFullYear()}-${String(easterMonday.getMonth() + 1).padStart(2, '0')}-${String(easterMonday.getDate()).padStart(2, '0')}`, name: "2. pääsiäispäivä" },
        { date: `${ascensionDay.getFullYear()}-${String(ascensionDay.getMonth() + 1).padStart(2, '0')}-${String(ascensionDay.getDate()).padStart(2, '0')}`, name: "helatorstai" },
        { date: `${pentecost.getFullYear()}-${String(pentecost.getMonth() + 1).padStart(2, '0')}-${String(pentecost.getDate()).padStart(2, '0')}`, name: "helluntai" },
        midsummerEve ? { date: `${midsummerEve.getFullYear()}-${String(midsummerEve.getMonth() + 1).padStart(2, '0')}-${String(midsummerEve.getDate()).padStart(2, '0')}`, name: "juhannusaatto" } : null,
        midsummerDay ? { date: `${midsummerDay.getFullYear()}-${String(midsummerDay.getMonth() + 1).padStart(2, '0')}-${String(midsummerDay.getDate()).padStart(2, '0')}`, name: "juhannuspäivä" } : null,
        allSaintsDay ? { date: `${allSaintsDay.getFullYear()}-${String(allSaintsDay.getMonth() + 1).padStart(2, '0')}-${String(allSaintsDay.getDate()).padStart(2, '0')}`, name: "pyhäinpäivä" } : null
    ].filter(Boolean);
}

export function getDefaultHolidays() {
    const now = new Date();
    const year = now.getFullYear();
    let holidays = [];
    getYearHolidays(year).forEach(h => {
        const d = new Date(h.date);
        d.setHours(0, 0, 0, 0);
        if (d < now) {
            const nextYearHoliday = getYearHolidays(year + 1).find(nh => nh.name === h.name);
            if (nextYearHoliday) holidays.push(nextYearHoliday);
        }
        holidays.push(h);
    });
    return holidays;
}
