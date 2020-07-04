/*
Copyright 2020 Robert R Tipton of Dark Sky Innovative Solutions

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
If this software is used, proper attribution to Dark Sky Innovative Solutions (http://darkskyinnovation.com/) must be displayed.
If the algorithms or methods in the software are modified, Dark Sky Innovative Solutions must be referenced and it must be clearly stated that the algorithms have been modified.

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var winSize = 7;
var gWHORawData = null;
var selected = {
    'PH': false,
    'KR': false,
    'BE': false,
    'US': true
    };



async function setConutryCode() {
  await $.ajax('http://ip-api.com/json', {
        mimeType : '"text/json"',
        dataType :'json'
    }).then(function (data){
        var cc = data.countryCode;
          selected = {};
          selected[cc] = true;
          readData();
    });
}

function onLoad() {
    setConutryCode();
}

function begin() {
    winSize = 7;
    updateRadios();
    setSmoothingDays();
    displayAll();    
}

function displayAll() {
    displayData('cases');
    displayData('caseSlope');
    displayData('deaths');
    displayData('deathSlope');
}

function updateRadios() {
    var dataSet = getData();
    var keys = Object.keys(dataSet);
    
    var el = document.getElementById('countries');
    el.innerHTML = '<span style="float: left;">Pick Countries: </span>';
    var firstChar = -1;
    var divBegin = '<span style="float: left; width:20pt;" onmouseleave="onLeaveCountry(this)" onmouseenter="onEnterCountry(this)">';
    var alphaDiv = '';
    var divStyled = '<div style="display:none; position: absolute; background-color: rgb(245,245,255);">';
    var pad = '';
    keys.forEach(function(key){
        var checked = selected[key] ? 'checked' : '';

        var cd = dataSet[key];
        var curFirst = cd.name.toLowerCase().charCodeAt(0);
        if (firstChar === -1) {
            firstChar = curFirst;
            alphaDiv = divBegin;
            alphaDiv += pad + String.fromCharCode(firstChar).toUpperCase() + pad;
            alphaDiv += divStyled;
        } else if (curFirst !== firstChar) {
            firstChar++;
            if (alphaDiv !== divBegin) {
                el.innerHTML += alphaDiv;
                alphaDiv = divBegin;
                alphaDiv += String.fromCharCode(firstChar).toUpperCase() + '&nbsp;';
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

function onEnterCountry(el) {
    var sub = el.childNodes[1];
    sub.style.display = 'unset';
}

function onLeaveCountry(el) {
    var sub = el.childNodes[1];
    sub.style.display = 'none';
}

function clearAll() {
    var keys = Object.keys(selected);
    keys.forEach(function(key){
        var checkEl = document.getElementById(key);
        if (checkEl)
            checkEl.checked = false;
    });
    selected = {};
    displayAll();
}

var lastToggleSelected = [];
function toggleSelected(codes) {
    lastToggleSelected.forEach(function(item){
        var checkEl = document.getElementById(item);
        if (checkEl)
            checkEl.checked = false;
        selected[item] = false;
    });
    lastToggleSelected = codes;
    lastToggleSelected.forEach(function(item){
        var checkEl = document.getElementById(item);
        if (checkEl)
            checkEl.checked = true;
        selected[item] = true;
    });

    displayAll();
    return false;
}

function onChanged(el) {
    var item = el.id;
    selected[item] = !selected[item];
    displayAll();
}

function setSmoothingDays() {
    switch (winSize) {
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
    if (days != winSize) {
        winSize = days;
        setSmoothingDays();
        displayAll();
    }
}

function computeAverages(data, keys, selArr, idx, pop, result) {
    var scale = 7 / winSize;
    for (var i = 0; i < data.length; i++) {
        var sumCases = 0;
        var sumDeaths = 0;
        var steps = winSize;
        if (i < winSize)
            steps = i;
        for (var j = 0; j < steps; j++) {
            var dataIdx = i + j - (steps - 1);
            var d = data[dataIdx];
            sumCases += Number(d.dailyCases) / pop;
            sumDeaths += Number(d.dailyDeaths) / pop;
        }

        var t = data[i].date.getTime();
        if (!result.hasOwnProperty(t)) {
            var arr = [];
            for (var j = 0; j < selArr.length; j++) {
                arr.push({
                    'date': data[i].date,
                    'countryCode': selArr[j], 
                    'cases': 0, 
                    'deaths': 0,
                });
            }
            result[t] = arr;
        }

        var entry = result[t][idx];
        entry.cases = sumCases * scale; 
        entry.deaths = sumDeaths * scale;
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
            var caseAvg = 0, deathAvg = 0;
            var caseNumer = 0, denom = 0;
            var deathNumer = 0;
            var steps = winSize;
            if (j < winSize)
                steps = j;
            if (steps > 0) {
                for (var k = 0; k < steps; k++) {
                    var idx = j - (steps - 1) + k;
                    caseAvg += dataArr[idx][i].cases;
                    deathAvg += dataArr[idx][i].deaths;
                }

                caseAvg /= steps;
                deathAvg /= steps;

                var avgX = steps / 2.0;
                for (var k = 0; k < steps; k++) {
                    var idx = j - (steps - 1) + k;
                    caseNumer += (k - avgX) * (dataArr[idx][i].cases - caseAvg);
                    deathNumer += (k - avgX) * (dataArr[idx][i].deaths - deathAvg);

                    denom += (k - avgX) * (k - avgX);
                }
                entry.caseSlope = caseNumer / denom;
                entry.deathSlope = deathNumer / denom;
            } else {
                entry.caseSlope = 0;
                entry.deathSlope = 0;
            }
        }
    }
}

function genData(dataSet) {
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
 
        computeAverages(data, keys, selArr, idx, pop, result);

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
        deaths: {min: 0, max: -1.0e20 },
        caseSlope: {min: 1.0e20, max: -1.0e20 },
        deathSlope: {min: 1.0e20, max: -1.0e20 }
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
            if (ed.deaths > result.deaths.max) {
                result.deaths.max = ed.deaths;
            }

            if (ed.caseSlope > result.caseSlope.max) {
                result.caseSlope.max = ed.caseSlope;
            }
            if (ed.caseSlope < result.caseSlope.min) {
                result.caseSlope.min = ed.caseSlope;
            }

            if (ed.deathSlope > result.deathSlope.max) {
                result.deathSlope.max = ed.deathSlope;
            }
            if (ed.deathSlope < result.deathSlope.min) {
                result.deathSlope.min = ed.deathSlope;
            }
        });
    });
    
    return result;
}

function rgbOf(r,g,b) {
    return 'rgb(' + Math.round(r) + "," + Math.round(g) + ',' + Math.round(b) + ')';
}

function colorOf(idx) {
    var max = 200;
    var mid = 100;
    switch (idx) {
        case 0: 
            return rgbOf(0,0,max);
        case 1: 
            return rgbOf(0,max,0);
        case 2: 
            return rgbOf(max,0,0);
        case 3: 
            return rgbOf(max,max,0);
        case 4: 
            return rgbOf(max,0,max);
        case 5: 
            return rgbOf(0,max,max);

        case 6: 
            return rgbOf(max,mid,mid);
        case 7: 
            return rgbOf(mid,max,mid);
        case 8: 
            return rgbOf(mid,mid,max);
        case 9: 
            return rgbOf(max,max,mid);
        case 10: 
            return rgbOf(max,mid,max);
        case 11: 
            return rgbOf(mid,max,max);
    }
    return rgbOf(0,0,0);
}

function calRoundedHeight0(val) {
    if (val > 2000)
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

function drawYGridLine(env, y, label) {
        env.draw.polyline([[env.xOrigin,y], [env.xOrigin + env.graphWidth, y]]).fill('none').attr(
        {
            'stroke-width':'1', 
            'stroke': 'rgb(128,128,128)' 
        });

        var text = env.draw.text(function(add) {
          add.tspan(label).dy(y);
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
        drawYGridLine(env, y, yTick.toFixed(digits));
        yTick += yTS;
    }
    if (!drewZero) {
        yTick = 0;
        y = env.graphMin - env.graphHeight * ((yTick - yMinMAx.min) / yRange);
        drawYGridLine(env, y, yTick.toFixed(digits));
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
        if (date.getDay() === 0) {
            tone = 0.75 * 255;
            env.draw.polyline([[x, graphMin], [x, graphMax]]).fill('none').attr( { 'stroke-width':'1', 'stroke': rgbOf(tone, tone, tone)  });
        }
        if (date.getDate() === 1) {
            tone = 0;
            env.draw.polyline([[x, graphMin], [x, graphMax]]).fill('none').attr( { 'stroke-width':'1', 'stroke': rgbOf(tone, tone, tone) });

            var label = '' + (date.getMonth() + 1) + '/' + date.getDate();
            var path = 'M ' + (x - 20) + ' ' + (graphMin + 30) + ' l 0 -30';
            var text = env.draw.textPath(label, path);
        }
    }    
}

function genGraph(dataKind) {
    var whoData = getData();
    var dataSet = genData(whoData);
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
        env.draw.rect(env.graphWidth, env.graphHeight).attr({ 'fill': 'rgb(235,235,235)' }).move(env.xOrigin, env.graphMax);
        
    drawYGrid(env, dataKind);
    drawXGrid(env, dataArr);

    var polylines = {};
    var idx = 0;
    var w = dataArr.length;
    dataArr.forEach(function(data){
        data.forEach(function(cd){
            var countryCode = cd.countryCode;
            if (!polylines.hasOwnProperty(countryCode)) {
                polylines[countryCode] = [];
            }
            var points = polylines[countryCode];
            var val = 0;
            if (cd.hasOwnProperty(dataKind))
                val = cd[dataKind];
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
            var color = colorOf(idx);
            add.tspan(name).fill(color).newLine().dx(env.xOrigin);

            idx++;
        });
    }).font({
        family:   'TimesNewRoman'
      , size:     20
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
