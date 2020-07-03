/*
Copyright 2020 Robert R Tipton of Dark Sky Innovative Solutions

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
If this software is used, proper attribution to Dark Sky Innovative Solutions (http://darkskyinnovation.com/) must be displayed.
If the algorithms or methods in the software are modified, Dark Sky Innovative Solutions must be referenced and it must be clearly stated that the algorithms have been modified.

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function displayAll() {
    displayData('cases');
    displayData('caseSlope');
    displayData('deaths');
}
var gWHORawData = null;

function onLoad() {
    readData();
}

function begin() {
    updateRadios();
    displayAll();    
}

var selected = {
    'PH': false,
    'KR': false,
    'BE': false,
    'US': true
    };

function updateRadios() {
    var dataSet = getData();
    var keys = Object.keys(dataSet);
    
    selection = {};
    
    var el = document.getElementById('countries');
    el.innerHTML = '<span style="float: left;">Pick Countries: </span>';
    var firstChar = -1;
    var divBegin = '<span style="float: left;" onmouseleave="onLeaveCountry(this)" onmouseenter="onEnterCountry(this)">';
    var alphaDiv = '';
    var divStyled = '<apan style="display:none; position: absolute; z-index: 1; background-color: rgb(245,245,255);">';
    keys.forEach(function(key){
        selection[key]=  (key === 'US');
        var checked = selection[key] ? 'checked' : '';

        var cd = dataSet[key];
        var curFirst = cd.name.toLowerCase().charCodeAt(0);
        if (firstChar === -1) {
            firstChar = curFirst;
            alphaDiv = divBegin;
            alphaDiv += String.fromCharCode(firstChar).toUpperCase() + '&nbsp;';
            alphaDiv += divStyled;
        } else if (curFirst !== firstChar) {
            firstChar++;
            if (alphaDiv !== divBegin) {
                el.innerHTML += alphaDiv + '</span></span>';
                alphaDiv = divBegin;
                alphaDiv += String.fromCharCode(firstChar).toUpperCase() + '&nbsp;';
                alphaDiv += divStyled;
            }
        }

        alphaDiv += '<div>';
        alphaDiv += '<input id="' + key + '" type="checkbox" onchange="onChanged(this.id)" ' + checked + '>';
        alphaDiv += '<label for="' + key + '">' + cd.name + '</label>';
        alphaDiv += '</div>';
    });
    
    if (alphaDiv !== divBegin) {
        el.innerHTML += alphaDiv + '</div>';
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

function onChanged(item) {
    selected[item] = !selected[item];
    displayAll();
}

function computeAverages(data, keys, selArr, idx, pop, result) {
    var winSize = 7;
    for (var i = (winSize - 1); i < data.length; i++) {
        var sumCases = 0;
        var sumDeaths = 0;
        for (var j = 0; j < winSize; j++) {
            var dataIdx = i + j - (winSize - 1);
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
        entry.cases = sumCases; 
        entry.deaths = sumDeaths;
    }
    
}

function computeSlopes(dataArr) {
    var winSize = 7;
    var d = dataArr;
    // inver the loop
    var numSel = d[0].length;
    for (var i = 0; i < numSel; i++) {
        for (var j = (winSize - 1); j < dataArr.length; j++) {
            var caseAvg = 0, deathAvg = 0;
            for (var k = 0; k < winSize; k++) {
                var idx = j - (winSize - 1) + k;
                caseAvg += dataArr[idx][i].cases;
                deathAvg += dataArr[idx][i].deaths;
            }

            caseAvg /= winSize;
            deathAvg /= winSize;

            var caseNumer = 0, denom = 0;
            var deathNumer = 0;
            var avgX = winSize / 2.0;
            for (var k = 0; k < winSize; k++) {
                var idx = j - (winSize - 1) + k;
                caseNumer += (k - avgX) * (dataArr[idx][i].cases - caseAvg);
                deathNumer += (k - avgX) * (dataArr[idx][i].deaths - deathAvg);

                denom += (k - avgX) * (k - avgX);
            }
            var entry = dataArr[j][i];
            entry.caseSlope = caseNumer / denom;
            entry.deathSlope = deathNumer / denom;
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
    return 'rgb(' + r + "," + g + ',' + b + ')';
}

function colorOf(idx) {
    var max = 200;
    var mid = 100;
    switch (idx) {
        case 0: 
            return rgbOf(max,0,0);
        case 1: 
            return rgbOf(0,max,0);
        case 2: 
            return rgbOf(0,0,max);
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
        return 5000;
    else if (val > 1000)
        return 2000;
    else if (val > 500)
        return 1000;
    else if (val > 300)
        return 500;
    else if (val > 100)
        return 300;
    else if (val > 50)
        return 100;
    else if (val > 30)
        return 50;
    else if (val > 10)
        return 30;
    else if (val > 5)
        return 10;
    else if (val > 3)
        return 5;
    else if (val > 1)
        return 3;
    else
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

function drawYGrid(env, dataKind) {
    var yRange = calRoundedHeight(env.minMax[dataKind]);
    var yHeight = yRange.max - yRange.min;
    var yTickSize = yHeight / 10;
    var yTick = yRange.min;
    while (yTick <= yHeight) {
        var y = env.yOrigin + env.graphHeight * (1 - ((yTick - yRange.min) / yHeight));
        env.draw.polyline([[env.xOrigin,y], [env.xOrigin + env.graphWidth, y]]).fill('none').attr(
        {
            'stroke-width':'1', 
            'stroke': 'rgb(128,128,128)' 
        });

        var text = env.draw.text(function(add) {
          add.tspan(yTick).dy(y);
        });
        yTick += yTickSize;
    }
    return yRange;
}

function drawXGrid(env, dataArr) {
    for (var i = 0; i < dataArr.length; i++) {
        var date;
        var vals = dataArr[i];
        vals.forEach(function(cd){
            if (cd.date)
                date = cd.date;
        });
        if (date.getDay() === 0) {
            var x = env.xOrigin + env.graphWidth * (i / dataArr.length);
            env.draw.polyline([[x, env.yOrigin], [x, env.yOrigin + env.graphHeight]]).fill('none').attr(
            {
                'stroke-width':'1', 
                'stroke': 'rgb(128,128,128)' 
            });

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
        yOrigin: 25
    };
    
    var rightMargin = 50;
    env.graphHeight = env.imageHeight - env.yOrigin; 
    env.graphWidth = env.imageWidth - env.xOrigin - rightMargin;

    var el = document.getElementById(dataKind);
    el.innerHTML = '';
    
    
    env.draw = SVG().addTo('#' + dataKind).size(env.imageWidth, env.imageHeight);
    env.draw.rect(env.graphWidth, env.graphHeight).attr({ 'fill': 'rgb(235,235,235)' }).move(env.xOrigin, env.yOrigin);
    var yRange = drawYGrid(env, dataKind);
    drawXGrid(env, dataArr);

    var polylines = {};
    var idx = 0;
    var w = dataArr.length;
    var yMin = yRange.min;
    var yHeight = yRange.max - yRange.min;
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
            var scaledY = (val - yMin) / yHeight ;
            var pt = [env.xOrigin + env.graphWidth * (idx / w), env.yOrigin + env.graphHeight * (1 - scaledY)];
            points.push(pt);
        });
        idx++;
    });
 
    idx = 0;
    var countryCodes = Object.keys(polylines);
    
    var text = env.draw.text(function(add) {
        add.tspan("").newLine().dx(env.xOrigin);
        countryCodes.forEach(function(countryCode){
            var cd = whoData[countryCode];
            var name = '--- ' + cd.name;        
            var color = colorOf(idx);
            add.tspan(name).fill(color).newLine().dx(env.xOrigin);

            idx++;
        });
    });

    idx  = 0;
    countryCodes.forEach(function(countryCode){
        var points = polylines[countryCode];
        var color = colorOf(idx);
        env.draw.polyline(points).fill('none').attr({ 'stroke-width':'3', 'stroke': color });

        idx++;
    });
}

function displayData(dataKind) {
    genGraph(dataKind);
}
