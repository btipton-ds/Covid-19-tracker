/*
Copyright 2020 Robert R Tipton of Dark Sky Innovative Solutions

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
If this software is used, proper attribution to Dark Sky Innovative Solutions (http://darkskyinnovation.com/) must be displayed.
If the algorithms or methods in the software are modified, Dark Sky Innovative Solutions must be referenced and it must be clearly stated that the algorithms have been modified.

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

class BadDate {
  constructor(cc, year, month, day) {  // Constructor
    this.cc = cc;
    this.date = new Date(year, month - 1, day);
  }    
}

var CTData = {
    winSize: 7,
    listSize: 91,
    selected: {},
    openPopups: [],
    popupTimeout: null,
    lastEntry: [],
    badCaseEntries:[ // WARNING. Be very careful with this. If you're confident that an entry is bad, this will replace it with the interpolated value of the neighbors.
        new BadDate('US_SC', 2020, 7, 7),
    ],
    hospTerminated: new Date(2020, 7 - 1, 14),
    hospitalCostFactor: (7000 / 1.0e6),
    hospitalDays: {},
    totalHospitalDays: 0
};

async function setConutryCode() {
  await $.ajax('http://ip-api.com/json', {
        mimeType : '"text/json"',
        dataType :'json'
    }).then(function (data){
        var cc = data.countryCode;
        CTData.countryCode = cc;

        if (cc === 'PH')
            document.body.style['background-image'] = 'url("back_ground_ph.jpg")';
        CTData.selected = {};
        CTData.selected[cc] = true;
        readData();
    });
}

function onLoad() {
    setConutryCode();
}

function begin() {
    CTData.winSize = 7;
    updateCountryRadios();
    updateUSAStateRadios();
    setSmoothingDays();
    computeLatest();
    displayAll();
    showTab('cases-tab');
}

function displayAll() {
    displayData('cases');
    displayData('caseSlope');
    displayData('hospitalized')
    displayData('hospitalizedSlope')
    displayData('deaths');
    displayData('deathSlope');
}

function updateCountryRadios() {
    var dataSet = getData();
    var keys = Object.keys(dataSet);
    
    var el = document.getElementById('countries');
    el.innerHTML = '<span class="picker">Pick Countries: </span>';
    var firstChar = -1;
    var divBegin = '<span>';
    var alphaDiv = '';
    var divStyled = '<div onmouseleave="onLeaveCountry(this)" onmousemove="keepLastPopupOpen()" style="display:none; position: absolute; background-color: rgb(245,245,255);">';
    var pad = '';
    var lastName = '';
    keys.forEach(function(key){
        if (key.indexOf('US_') !== -1)
            return;
        var checked = CTData.selected[key] ? 'checked' : '';

        var cd = dataSet[key];
        var curFirst = cd.name.toLowerCase().charCodeAt(0);
        if (firstChar === -1) {
            firstChar = curFirst;
            alphaDiv = divBegin;
            alphaDiv += '<button class="letter-button" onclick="onEnterCountry(this)">' + String.fromCharCode(firstChar).toUpperCase()  + '</button>';
            alphaDiv += divStyled;
        } else if (curFirst !== firstChar) {
            firstChar = curFirst;
            if (alphaDiv !== divBegin) {
                el.innerHTML += alphaDiv;
                alphaDiv = divBegin;
                alphaDiv += '<button type="button" class="letter-button" onclick="onEnterCountry(this)">' + String.fromCharCode(firstChar).toUpperCase()  + '</button>';
                alphaDiv += divStyled;
            }
        }

        lastName = cd.name;
        alphaDiv += '<div>';
        alphaDiv += '<input id="' + key + '" type="checkbox" onchange="onChanged(this)" ' + checked + '>';
        alphaDiv += '<label for="' + key + '">' + cd.name + '</label>';
    });
    
    if (alphaDiv !== divBegin && lastName !== '') {
        el.innerHTML += alphaDiv;
    }
}

function updateUSAStateRadios() {
    var dataSet = getData();
    var keys = Object.keys(dataSet);
    
    var el = document.getElementById('usa_states');
    el.innerHTML = '<span class="picker">Pick US States: </span>';
    var firstChar = -1;
    var divBegin = '<span>';
    var alphaDiv = '';
    var divStyled = '<div onmouseleave="onLeaveCountry(this)" onmousemove="keepLastPopupOpen()" style="display:none; position: absolute; background-color: rgb(245,245,255);">';
    var pad = '';
    keys.forEach(function(key){
        if (key.indexOf('US_') === -1)
            return;
        var checked = CTData.selected[key] ? 'checked' : '';

        var cd = dataSet[key];
        var curFirst = cd.name.toLowerCase().charCodeAt(0);
        if (firstChar === -1) {
            firstChar = curFirst;
            alphaDiv = divBegin;
            alphaDiv += '<button class="letter-button" onclick="onEnterCountry(this)">' + String.fromCharCode(firstChar).toUpperCase()  + '</button>';
            alphaDiv += divStyled;
        } else if (curFirst !== firstChar) {
            firstChar = curFirst;
            if (alphaDiv !== divBegin) {
                el.innerHTML += alphaDiv;
                alphaDiv = divBegin;
                alphaDiv += '<button type="button" class="letter-button" onclick="onEnterCountry(this)">' + String.fromCharCode(firstChar).toUpperCase()  + '</button>';
                alphaDiv += divStyled;
            }
        }

        alphaDiv += '<div>';
        alphaDiv += '<input id="' + key + '" type="checkbox" onchange="onChanged(this)" ' + checked + '>';
        alphaDiv += '<label for="' + key + '">' + cd.name + '</label>';
    });
    
    if (alphaDiv !== divBegin) {
        el.innerHTML += alphaDiv;
    }
}

function closePopups() {
    CTData.openPopups.forEach(function(el){
        el.style.display = 'none';
    });
    CTData.openPopups = [];    
}

function keepLastPopupOpen() {
    if (CTData.openPopups.length > 0) {
    if (CTData.popupTimeout)
        clearTimeout(CTData.popupTimeout);
        CTData.openPopups[CTData.openPopups.length - 1].style.display = 'unset';
        CTData.popupTimeout = setTimeout(function(){
            closePopups();
            CTData.popupTimeout = null;
        }, 3000);
    }
}

function onEnterCountry(el) {
    if (CTData.popupTimeout)
        clearTimeout(CTData.popupTimeout);

    closePopups();
    var divEl = el.nextElementSibling;
    divEl.style.display = 'unset';
    CTData.openPopups.push(divEl);
    CTData.popupTimeout = setTimeout(function(){
        closePopups();
        CTData.popupTimeout = null;
    }, 3000);
}

function onLeaveCountry(el) {
    el.style.display = 'none';
}

function clearAll() {
    var keys = Object.keys(CTData.selected);
    keys.forEach(function(key){
        var checkEl = document.getElementById(key);
        if (checkEl)
            checkEl.checked = false;
    });
    CTData.selected = {};
    displayAll();
}

var lastToggleSelected = [];
function toggleSelected(codes) {
    lastToggleSelected.forEach(function(item){
        var checkEl = document.getElementById(item);
        if (checkEl)
            checkEl.checked = false;
        CTData.selected[item] = false;
    });
    lastToggleSelected = codes;
    lastToggleSelected.forEach(function(item){
        var checkEl = document.getElementById(item);
        if (checkEl)
            checkEl.checked = true;
        CTData.selected[item] = true;
    });

    displayAll();
    return false;
}

function onChanged(el) {
    keepLastPopupOpen();
    var item = el.id;
    CTData.selected[item] = !CTData.selected[item];
    displayAll();
}

function setSmoothingDays() {
    switch (CTData.winSize) {
        case 7: 
            document.getElementById('days_7').checked = true;
            document.getElementById('days_14').checked = false;
            document.getElementById('days_21').checked = false;
            break;
        case 14: 
            document.getElementById('days_7').checked = false;
            document.getElementById('days_14').checked = true;
            document.getElementById('days_21').checked = false;
            break;
        case 21: 
            document.getElementById('days_7').checked = false;
            document.getElementById('days_14').checked = false;
            document.getElementById('days_21').checked = true;
            break;
        default:
            break;
    }    
}

function daysSmoothingChanged(days) {
    if (days != CTData.winSize) {
        CTData.winSize = days;
        setSmoothingDays();
        displayAll();
    }
}

function computeAverages(data, countryCode, selArr, idx, pop, result) {
    var scale = 7 / CTData.winSize;
    if (CTData.hospitalDays.hasOwnProperty(countryCode)) {
        CTData.hospitalDays[countryCode].total = 0;
    }
    
    for (var i = 0; i < data.length; i++) {
        if (data[i].date.toString().indexOf('Invalid') !== -1)
            continue;

        var sumCases = 0;
        var sumDeaths = 0;
        var sumHospitalized = 0;
        var steps = CTData.winSize;
        if (i < CTData.winSize)
            steps = i;
        for (var j = 0; j < steps; j++) {
            var dataIdx = i + j - (steps - 1);
            var d = data[dataIdx];
            sumCases += d.dailyCases / pop;
            sumDeaths += d.dailyDeaths / pop;
            sumHospitalized += d.dailyHospitalized;
        }

        var t = data[i].date.getTime();
        if (!result.hasOwnProperty(t)) {
            var arr = [];
            for (var j = 0; j < selArr.length; j++) {
                arr.push({
                    valid: false,
                    'date': data[i].date,
                    'countryCode': selArr[j], 
                    'cases': 0, 
                    'deaths': 0,
                    'hospitalized' : 0
                });
            }
            result[t] = arr;
        }

        var entry = result[t][idx];
        entry.valid = true;
        entry.cases = sumCases * scale; 
        entry.deaths = sumDeaths * scale;
        if (steps > 0)
            entry.hospitalized = sumHospitalized / steps;
        else 
            entry.hospitalized = 0;
            
        var hospitalized = data[i].dailyHospitalized;
        CTData.totalHospitalDays += hospitalized;
        if (hospitalized > 0) {
            if (!CTData.hospitalDays.hasOwnProperty(countryCode)) {
                CTData.hospitalDays[countryCode] = {
                    last: 0,
                    total: 0
                }
            }
            CTData.hospitalDays[countryCode].last = entry.hospitalized;
            CTData.hospitalDays[countryCode].total += hospitalized;
        }
    }
}

function computeSlopes(dataArr) {
    if (dataArr.length === 0)
        return;

    var d = dataArr;
    // inver the loop
    var numSel = d[0].length;
    for (var i = 0; i < numSel; i++) {
        for (var j = 0; j < dataArr.length; j++) {
            var entry = dataArr[j][i];
            var caseAvg = 0, deathAvg = 0, hospitalizedAvg = 0;
            var denom = 0;
            var caseNumer = 0, deathNumer = 0, hospitalizedNumer = 0;
            var steps = 7;
            if (j < steps)
                steps = j;
            if (steps > 0) {
                for (var k = 0; k < steps; k++) {
                    var idx = j - (steps - 1) + k;
                    caseAvg += dataArr[idx][i].cases;
                    deathAvg += dataArr[idx][i].deaths;
                    hospitalizedAvg += dataArr[idx][i].hospitalized;
                }

                caseAvg /= steps;
                deathAvg /= steps;
                hospitalizedAvg /= steps;

                var avgX = steps / 2.0;
                for (var k = 0; k < steps; k++) {
                    var idx = j - (steps - 1) + k;
                    caseNumer += (k - avgX) * (dataArr[idx][i].cases - caseAvg);
                    deathNumer += (k - avgX) * (dataArr[idx][i].deaths - deathAvg);
                    hospitalizedNumer += (k - avgX) * (dataArr[idx][i].hospitalized - hospitalizedAvg);

                    denom += (k - avgX) * (k - avgX);
                }
                entry.caseSlope = caseNumer / denom;
                entry.deathSlope = deathNumer / denom;
                entry.hospitalizedSlope = hospitalizedNumer / denom;
            } else {
                entry.caseSlope = 0;
                entry.deathSlope = 0;
                entry.hospitalizedSlope = 0;
            }
        }
    }
}

function genData(dataSet, selected) {
    var result = {}; // TODO Change the result to an array. We need the map to order the unsynchronized dates.

    var selArr = [];
    var keys = Object.keys(selected);
    keys.forEach(function(key){
        if (selected[key])
            selArr.push(key);
    });

    var idx = 0;
    selArr.forEach(function(countryCode){
        if (!dataSet.hasOwnProperty(countryCode))
            return;

        var countryData = dataSet[countryCode];
        var pop = countryData.population;
        var data = countryData.data;
 
        computeAverages(data, countryCode, selArr, idx, pop, result);

        idx++;
    });

    return result;
}

function dumpData(data) {
    var keys = Object.keys(data);
    keys.sort(function(a,b){
        return Number(a) - Number(b);
    });
    keys.forEach(function(key){
        var cd = data[key];
        var str = key;
        cd.forEach(function(x){
            str += ", " + x.date + ": " + x.countryCode;
        });
        console.log(str);
    });
}

function getMinMax(data) {
    var result = {
        minDate: new Date(Date.now()),
        cases: {min: 0, max: -1.0e20 },
        hospitalized: {min: 0, max: -1.0e20 },
        deaths: {min: 0, max: -1.0e20 },
        caseSlope: {min: 1.0e20, max: -1.0e20 },
        deathSlope: {min: 1.0e20, max: -1.0e20 },
        hospitalizedSlope: {min: 0, max: -1.0e20 }
    };
    
    var entries = Object.keys(data);
    entries.forEach(function(key){
        var entryData = data[key];
        if (!entryData)
            return;
        entryData.forEach(function(ed) {
            var minTime = result.minDate.getTime();
            var entryTime = ed.date.getTime();
            if (entryTime < minTime) {
                result.minDate = ed.date;
            }

            if (ed.cases > result.cases.max) {
                result.cases.max = ed.cases;
            }

            if (ed.hospitalized > result.hospitalized.max) {
                result.hospitalized.max = ed.hospitalized;
            }

            if (ed.deaths > result.deaths.max) {
                result.deaths.max = ed.deaths;
            }

            if (ed.caseSlope > result.caseSlope.max) {
                result.caseSlope.max = ed.caseSlope;
            }
            if (ed.caseSlope < result.caseSlope.min) {
                result.caseSlope.min = ed.caseSlope;
            }

            if (ed.hospitalizedSlope > result.hospitalizedSlope.max) {
                result.hospitalizedSlope.max = ed.hospitalizedSlope;
            }
            if (ed.hospitalizedSlope < result.hospitalizedSlope.min) {
                result.hospitalizedSlope.min = ed.hospitalizedSlope;
            }

            if (ed.deathSlope > result.deathSlope.max) {
                result.deathSlope.max = ed.deathSlope;
            }
            if (ed.deathSlope < result.deathSlope.min) {
                result.deathSlope.min = ed.deathSlope;
            }
        });
    });
    
    result.hospitalized.min *= CTData.hospitalCostFactor;
    result.hospitalized.max *= CTData.hospitalCostFactor;
    result.hospitalizedSlope.min *= CTData.hospitalCostFactor;
    result.hospitalizedSlope.max *= CTData.hospitalCostFactor;

    return result;
}

function rgbOf(r,g,b) {
    return 'rgb(' + Math.round(r) + "," + Math.round(g) + ',' + Math.round(b) + ')';
}

function colorOf(idx) {
    var w = .85;
    var mid = 100;
    switch (idx) {
        case 0: 
            return rgbOf(0,0,w * 255);
        case 1: 
            return rgbOf(0,w * 255,0);
        case 2: 
            return rgbOf(w * 255,0,0);
        case 3: 
            return rgbOf(w * 255, w * 165,0);
        case 4: 
            return rgbOf(w * 255,0,w * 255);
        case 5: 
            return rgbOf(0,w * 255,w * 255);

        case 6: 
            return rgbOf(w * 255,mid,mid);
        case 7: 
            return rgbOf(w * 255, w * 165, mid);
        case 8: 
            return rgbOf(mid,mid,w * 255);
        case 9: 
            return rgbOf(w * 255,w * 255,mid);
        case 10: 
            return rgbOf(w * 255,mid,w * 255);
        case 11: 
            return rgbOf(mid,w * 255,w * 255);
    }
    return rgbOf(0,0,0);
}

function calRoundedHeight0(val) {
    if (val > 5000)
        return Math.round((val + 999) / 1000) * 1000;
    else if (val > 2000)
        return Math.round((val + 499) / 500) * 500;
    else if (val > 1000)
        return Math.round((val + 199) / 200) * 200;
    else if (val > 500)
        return Math.round((val + 99) / 100) * 100;
    else if (val > 100)
        return Math.round((val + 49) / 50) * 50;
    else if (val > 10)
        return Math.round((val + 9) / 10) * 10;
    else if (val > 5)
        return Math.round((val + 4) / 5) * 5;
    else if (val > 1)
        return Math.round((val + 0.9) / 1) * 1;
    else if (val > .1)
        return Math.round((val + 0.09) / .1) * .1;
    else if (val > .01)
        return Math.round((val + 0.009) / .01) * .01;
    else if (val > .001)
        return Math.round((val + 0.0009) / .001) * .001;
    return 0;
}

function calRoundedHeight(minMax) {
    var result = {min:0, max: 1};

    if (minMax.min < 0)
        result.min = -calRoundedHeight0(-minMax.min);
    else
        result.min = calRoundedHeight0(minMax.min);

    var range = minMax.max - result.min;
    
    range = calRoundedHeight0(range);
    result.max = result.min + range;

    return result;
}

function drawYGridLine(env, y, label, dataKind) {
    env.draw.polyline([[env.xOrigin,y], [env.xOrigin + env.graphWidth, y]]).fill('none').attr(
        {
            'stroke-width':'1', 
            'stroke': 'rgb(128,128,128)' 
        });

        var text = env.draw.text(function(add) {
          if (dataKind.indexOf('hospital') !== -1) {
            add.tspan('$' + label + 'm/d').dy(y);
          } else {
            add.tspan(label + '/m').dy(y);
          }
        }).font({
        family:   'TimesNewRoman',
        size:     '11pt'
    });
}

function drawYGrid(env, dataKind) {
    var yMinMAx = calRoundedHeight(env.minMax[dataKind]);
    var yRange = yMinMAx.max - yMinMAx.min;
    var yTS = 0.001;

    var numTicks = Math.round(yRange / yTS);
    while (numTicks > 10) {
        if (yTS === .001 || yTS === 0.01 || yTS === 0.1 || yTS === 1 || yTS === 10 || yTS === 100)
            yTS *= 2;
        else if (yTS === .002 || yTS === 0.02 || yTS === 0.2 || yTS === 2 || yTS === 20 || yTS === 200)
            yTS *= 2.5;
        else if (yTS === .005 || yTS === 0.05 || yTS === 0.5 || yTS === 5 || yTS === 50 || yTS === 500)
            yTS *= 2;
        numTicks = Math.round(yRange / yTS);
    }
    yTS = yRange / numTicks;
    var digits = 3;
    if (yTS < 0.01)
        digits = 3;
    else if (yTS < 0.1)
        digits = 2;
    else if (yTS < 1)
        digits = 1;
    else digits = 0;

    var drewZero = false;
    var yTick = yMinMAx.min, y;
    for (var i = 0; i <= numTicks; i++) {
        y = env.graphMin - env.graphHeight * ((yTick - yMinMAx.min) / yRange);
        if (Math.abs(yTick) < 1.0e-6) {
            yTick = 0;
            drewZero = true;
        }
        drawYGridLine(env, y, yTick.toFixed(digits), dataKind);
        yTick += yTS;
    }
    if (!drewZero) {
        yTick = 0;
        y = env.graphMin - env.graphHeight * ((yTick - yMinMAx.min) / yRange);
        drawYGridLine(env, y, yTick.toFixed(digits), dataKind);
    }
    return yMinMAx;
}

function drawXGrid(env, dataArr) {
    for (var i = 0; i < dataArr.length; i++) {
        var date;
        var vals = dataArr[i];
        vals.forEach(function(cd){
            if (cd.date)
                date = cd.date;
        });
        
        var tone;
        var graphMin = env.graphMin;
        var graphMax = env.graphMax;
        var x = env.xOrigin + env.graphWidth * (i / dataArr.length);
        var baseLine = 12;
        if (date.getDay() === 0) {
            tone = 0.75 * 255;
            env.draw.polyline([[x, graphMin], [x, graphMax]]).fill('none').attr( { 'stroke-width':'1', 'stroke': rgbOf(tone, tone, tone)  });

            var label = '' + date.getDate();
            var path = 'M ' + (x - baseLine) + ' ' + (graphMin + 20) + ' l 0 -30';
            var text = env.draw.textPath(label, path).font({ size: 11 });
        }

        if (date.getDate() === 1) {
            tone = 0;
            env.draw.polyline([[x, graphMin], [x, graphMax]]).fill('none').attr( { 'stroke-width':'1', 'stroke': rgbOf(tone, tone, tone) });

            var label = '' + (date.getMonth() + 1) + '/' + date.getDate();
            var path = 'M ' + (x - baseLine) + ' ' + (graphMin + 50) + ' l 0 -30';
            var text = env.draw.textPath(label, path);
        }
    }    
}

function computeLatest() {
    var whoData = getData();
    var selected = [];
    var allKeys = Object.keys(whoData);
    allKeys.forEach(function(key){
        if (whoData.hasOwnProperty(key)) {
            selected[key] = true;
        }
    });

    var dataSet = genData(whoData, selected);
    var dataArr = [];
    var dataKeys = Object.keys(dataSet);
    dataKeys.sort(function(a, b){
        return Number(a) - Number(b);
    });

    CTData.inHospital = 0;
    var hospKeys = Object.keys(CTData.hospitalDays);
    hospKeys.forEach(function(key){
        CTData.inHospital += CTData.hospitalDays[key].last;
    });

    dataKeys.forEach(function(key){
        var de = dataSet[key];
        if (de.hospit)
        dataArr.push(de);
    });

    computeSlopes(dataArr);
    
    if (CTData.totalHospitalDays > 0) {
        var el = document.getElementById('USA_COST');
        if (el.innerHTML === '') {
            el.innerHTML = '$' + (CTData.totalHospitalDays * CTData.hospitalCostFactor / 1000).toFixed(1) + ' Billion';
            var days = 1 / (CTData.inHospital * CTData.hospitalCostFactor / 1000);
            el.innerHTML += ' + $1 Billion every ' + days.toFixed(1) + ' days.';
        }
    }

    var countryMap = {};
    var numFound = 0;
    // Loop over dates
    for (var idx = dataArr.length - 1; idx >= 0; idx--) {
        var entries = dataArr[idx];
        if (!entries)
            continue;
        
        for (var cntIdx = 0; cntIdx < entries.length; cntIdx++) {
            var ce = entries[cntIdx];
            if (ce.valid && !countryMap.hasOwnProperty(ce.countryCode)) { 
                countryMap[ce.countryCode] = ce;
                numFound++;
            }
        }
        if (numFound > entries.length - 50)
            break;
    }
    
    var countryKeys = Object.keys(countryMap);
    countryKeys.forEach(function(key){
        CTData.lastEntry.push(countryMap[key]);
    });
    
    CTData.latestStatistics = countryMap;
    
    makeSorted();
}

function leaderString(count, name, cases, caseSlope, colorize) {
    var abbrName = name;
    var maxLen = 40;
    if (abbrName.length > maxLen) {
        abbrName = abbrName.substr(0, maxLen) + '...';
    }
    if (caseSlope < 0)
        return '<span class="leader_count">' + count + '</span>' + 
            '<span class="leader_name">' + abbrName + '</span>' + 
            '<span class="leader_value">' + cases.toFixed(1) + '</span>' + 
            '<span class="leader_value leader_grn">' + caseSlope.toFixed(1) + ' / d</span>' + 
            '<br>';
    else 
        return '<span class="leader_count">' + count + '</span>' + 
            '<span class="leader_name">' + abbrName + '</span>' + 
            '<span class="leader_value">' + cases.toFixed(1) + '</span>' + 
            '<span class="leader_value leader_red"> +' + caseSlope.toFixed(1) + ' / d</span>' + 
            '<br>';
}

function addSorted(elId, list, key) {
    var whoData = getData();
    var i, count, ce, cd;
    var isUsa = elId.indexOf('_usa_') !== -1;

    var numToDisplay = isUsa ? 26 : CTData.listSize;
    var el = document.getElementById(elId);
    el.innerHTML += '<span class="leader-title">Highest</span><br>';
    count = 1;
    for (i = 0; i < list.length; i++) {
        ce = list[i];
        var val = ce[key];
        if ((isUsa && (ce.countryCode.indexOf('US_') === 0)) || (!isUsa && (ce.countryCode.indexOf('US_') !== 0))) {
            if (val !== 0) {
                cd = whoData[ce.countryCode];
                el.innerHTML += leaderString(count, cd.name, ce.cases, ce.caseSlope);
                count++;
                if (count > numToDisplay)
                    break;
            }
        }
    }
}

function addSortedRev(elId, list, key) {
    var whoData = getData();
    var i, count, ce, cd;
    var isUsa = elId.indexOf('_usa_') !== -1;
    var numToDisplay = isUsa ? 26 : CTData.listSize;

    var el = document.getElementById(elId);
    el.innerHTML += '<span class="leader-title">Lowest</span><br>';
    count = 1;
    for (i = list.length - 1; i >= 0; i--) {
        ce = list[i];
        var val = ce[key];
        if ((isUsa && (ce.countryCode.indexOf('US_') === 0)) || (!isUsa && (ce.countryCode.indexOf('US_') !== 0))) {
            if (val !== 0) {
                cd = whoData[ce.countryCode];
                el.innerHTML += leaderString(count, cd.name, ce.cases, ce.caseSlope);
                count++;
                if (count > numToDisplay)
                    break;
            }
        }
    }
}

function calDaysTil0 (data) {
    if (data.cases === 0)
        return 0;
    else if (data.cases > 0 && data.caseSlope < 0) {
        var t = data.cases / -data.caseSlope;
        return t;
    }
    else 
        return 1e20;
}

function makeSorted() {
    var arr;
    CTData.lastEntry.sort(function(a,b){
        var daysTil0a = calDaysTil0(a);
        var daysTil0b = calDaysTil0(b);
        if (daysTil0a > daysTil0b)
            return -1;
        else if (daysTil0a < daysTil0b)
            return 1;
        else if (a.caseSlope > b.caseSlope)
            return -1;
        else if (a.caseSlope < b.caseSlope)
            return 1;
        return 0;
    });

    arr = [];
    CTData.lastEntry.forEach(function(entry){
        arr.push(entry);
    });
    addSorted('leading_world_max_ncrs', arr, 'caseSlope');
    addSortedRev('leading_world_min_ncrs', arr, 'caseSlope');
    addSorted('leading_usa_max_ncrs', arr, 'caseSlope');
    addSortedRev('leading_usa_min_ncrs', arr, 'caseSlope');

    CTData.lastEntry.sort(function(a,b){
        if (a.cases > b.cases)
            return -1;
        else if (a.cases < b.cases)
            return 1;
        return 0;
    });
    arr = [];
    CTData.lastEntry.forEach(function(entry){
        arr.push(entry);
    });
    addSorted('leading_world_max_cases', arr, 'cases');
    addSortedRev('leading_world_min_cases', arr, 'cases');
    addSorted('leading_usa_max_cases', arr, 'cases');
    addSortedRev('leading_usa_min_cases', arr, 'cases');


}

function DataAfter(sampleDate, testDate) {
    if (!testDate)
        return false;

    if (sampleDate.getYear() < testDate.getYear())
        return false;
    else if (sampleDate.getYear() > testDate.getYear())
        return true;
    if (sampleDate.getMonth() < testDate.getMonth())
        return false;
    else if (sampleDate.getMonth() > testDate.getMonth())
        return true;
    if (sampleDate.getDate() < testDate.getDate())
        return false;
    return true;
}

function genGraph(dataKind) {
    var whoData = getData();
    var dataSet = genData(whoData, CTData.selected);
    var dataArr = [];
    var dataKeys = Object.keys(dataSet);
    dataKeys.sort(function(a,b){
        return Number(a) - Number(b);
    });
    dataKeys.forEach(function(key){
        dataArr.push(dataSet[key]);
    });

    computeSlopes(dataArr);

    var env = {
        minMax: getMinMax(dataArr),
        imageHeight: 800, 
        imageWidth: 800,
        xOrigin: 50, 
        yOrigin: 75
    };
    
    var rightMargin = 50;
    var topMargin = 20;
    env.graphHeight = env.imageHeight - env.yOrigin - topMargin; 
    env.graphWidth = env.imageWidth - env.xOrigin - rightMargin;
    env.graphMin = env.imageHeight - env.yOrigin;
    env.graphMax = env.imageHeight - env.yOrigin - env.graphHeight;
    

    var el = document.getElementById(dataKind);
    el.innerHTML = '';
    
    var yMinMAx = calRoundedHeight(env.minMax[dataKind]);
    var yMin = yMinMAx.min;
    var yHeight = yMinMAx.max - yMinMAx.min;
    var scaledY;
    
    env.draw = SVG().addTo('#' + dataKind).size(env.imageWidth, env.imageHeight);
    if (dataKind.toLowerCase().indexOf('slope') != -1) {
        scaledY = (0 - yMin) / yHeight ;
        var greenZoneHeight = env.graphHeight * scaledY;
        var redZoneHeight = env.graphHeight - greenZoneHeight;
        env.draw.rect(env.graphWidth, redZoneHeight).attr({ 'fill': 'rgb(255,225,225)' }).move(env.xOrigin, env.graphMin - env.graphHeight);
        env.draw.rect(env.graphWidth, greenZoneHeight).attr({ 'fill': 'rgb(225,255,225)' }).move(env.xOrigin, env.graphMin - greenZoneHeight);
    } else
        env.draw.rect(env.graphWidth, env.graphHeight).attr({ 'fill': 'rgb(250,250,255)' }).move(env.xOrigin, env.graphMax);
        
    drawYGrid(env, dataKind);
    drawXGrid(env, dataArr);

    var polylines = {};
    var lastDataSample = {};
    var idx = 0;
    var w = dataArr.length;
    dataArr.forEach(function(data){
        data.forEach(function(cd){
            if (!cd.valid)
                return;
            var countryCode = cd.countryCode;
            if (!polylines.hasOwnProperty(countryCode)) {
                polylines[countryCode] = [];
                lastDataSample[countryCode] = 0;
            }
            var points = polylines[countryCode];
            var val = 0;
            if (cd.hasOwnProperty(dataKind))
                val = cd[dataKind];
            var testDate = CTData.hospTerminated;
            if (dataKind.indexOf('hospital') !== -1) {
                if (val <= 0.0001 && cd.date && testDate && DataAfter(cd.date, testDate)) 
                    val = lastDataSample[countryCode];
                lastDataSample[countryCode] = val;
                val *= CTData.hospitalCostFactor;
            }
            scaledY = (val - yMin) / yHeight ;
            var pt = [env.xOrigin + env.graphWidth * (idx / w), env.graphMin - env.graphHeight * scaledY];
            points.push(pt);
        });
        idx++;
    });
 
    idx = 0;
    var countryCodes = Object.keys(polylines);
    
    var text = env.draw.text(function(add) {
        add.tspan("").newLine().dx(env.xOrigin);
        add.tspan("Dark Sky Innovative Solutions.").fill('rgb(0,0,127)').newLine().dx(env.xOrigin);
        countryCodes.forEach(function(countryCode){
            var cd = whoData[countryCode];
            var name = '--- ' + cd.name;
            if ((dataKind.indexOf('hospital') !== -1) && CTData.hospitalDays.hasOwnProperty(countryCode)) {
                var hd = CTData.hospitalDays[countryCode];
                var totalCost = hd.total * CTData.hospitalCostFactor;
                if (totalCost >= 1000) 
                    name += ' $' + (totalCost / 1000).toFixed(1) + ' B total + ';
                else 
                    name += ' $' + totalCost.toFixed(1) + ' M total + ';
                    
                name += '$' + (hd.last * CTData.hospitalCostFactor).toFixed(1) + ' M / day';
            }
            var color = colorOf(idx);
            add.tspan(name).fill(color).newLine().dx(env.xOrigin);

            idx++;
        });
    }).font({
        family:   'TimesNewRoman',
        size:     20
    });

    idx  = 0;
    countryCodes.forEach(function(countryCode){
        var points = polylines[countryCode];
        var color = colorOf(idx);
        env.draw.polyline(points).fill('none').attr({ 'stroke-width':'2', 'stroke': color });

        idx++;
    });
}

function displayData(dataKind) {
    genGraph(dataKind);
}

function showReadMe() {
    var el = document.getElementById("read-me-div");
    el.style.display = 'unset';
}

function hideReadMe(force) {
    var evt = window.event;
    var el = document.getElementById("read-me-div");
    if (!force && evt.target !== el)
        return;
    el.style.display = 'none';
}

function showTab(tabId) {
    var tabs = [
        'cases-tab',
        'deaths-tab',
        'hospital-tab',
        'leaders-world-tab',
        'leaders-usa-tab'
    ];
    
    tabs.forEach(function(tab){
        var el = document.getElementById(tab);
        el.style.display = tab === tabId ? 'inline-block' : 'none';
    });
}