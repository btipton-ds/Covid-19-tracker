
function onLoad() {
    updateRadios();
    displayData('cases');
    displayData('deaths');
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
    el.innerHTML = '';
    var firstChar = -1;
    var divBegin = '<div style="float: left;" onmouseleave="onLeaveCountry(this)" onmouseenter="onEnterCountry(this)">';
    var alphaDiv = '';
    var divStyled = '<div style="display:none; position: absolute; top: 20px; z-index: 1; background-color: rgb(245,245,255);">';
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
                el.innerHTML += alphaDiv + '</div></div>';
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
    displayData('cases');
    displayData('deaths');
}

function genData() {
    var dataSet = getData();
    var result = {};

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
 
        for (var i = 6; i < data.length; i++) {
            var sumDailyCases = 0;
            var sumDailyDeaths = 0;
            for (var j = 0; j < 7; j++) {
                var dataIdx = i + j - 6;
                var d = data[dataIdx];
                sumDailyCases += Number(d.dailyCases);
                sumDailyDeaths += Number(d.dailyDeaths);
            }

            var t = data[i].date.getTime();
            if (!result.hasOwnProperty(t)) {
                var arr = [];
                for (var j = 0; j < selArr.length; j++) {
                    arr.push({
                        'date': data[i].date,
                        'countryCode': keys[j], 
                        'cases': 0, 
                        'deaths': 0
                    });
                }
                result[t] = arr;
            }
            
            var entry = result[t][idx];
            entry.cases = sumDailyCases / pop; 
            entry.deaths = sumDailyDeaths / pop; 
        }
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
        cases: -1e20,
        deaths: -1e20
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
            if (ed.cases > result.cases) {
                result.cases = ed.cases;
            }
            if (ed.deaths > result.deaths) {
                result.deaths = ed.deaths;
            }
        });
    });
    
    return result;
}

function colorOf(idx) {
    switch (idx) {
        case 0: 
            return 'rgb(255,0,0)';
        case 1: 
            return 'rgb(0,255,0)';
        case 2: 
            return 'rgb(0,0,255)';
        case 3: 
            return 'rgb(255,255,0)';
    }
    return 'rgb(0,0,0)';
}

function calRoundedHeight(maxY) {
    if (maxY > 2000)
        return 5000;
    else if (maxY > 1000)
        return 2000;
    else if (maxY > 500)
        return 1000;
    else if (maxY > 300)
        return 500;
    else if (maxY > 100)
        return 300;
    else if (maxY > 50)
        return 100;
    else if (maxY > 30)
        return 50;
    else if (maxY > 10)
        return 30;
    else
        return 10;
}

function drawYGrid(env, dataKind) {
    var yHeight = calRoundedHeight(env.minMax[dataKind]);
    var yTickSize = yHeight / 10;
    var yTick = 0;
    while (yTick <= yHeight) {
        var y = env.yOrigin + env.graphHeight * (1 - (yTick / yHeight));
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
    return yHeight;
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
            var x = env.xOrigin + env.graphWidth * (1 - (i / dataArr.length));
            env.draw.polyline([[env.xOrigin + x, env.yOrigin], [env.xOrigin + x, env.yOrigin + env.graphHeight]]).fill('none').attr(
            {
                'stroke-width':'1', 
                'stroke': 'rgb(128,128,128)' 
            });

        }
    }    
}

function genGraph(dataKind) {
    var dataSet = genData();
    var env = {
        minMax: getMinMax(dataSet),
        imageHeight: 800, 
        imageWidth: 800,
        xOrigin: 50, 
        yOrigin: 25
    };
    env.graphHeight = env.imageHeight - env.yOrigin; 
    env.graphWidth = env.imageWidth - env.xOrigin;

    var dataArr = [];
    var dataKeys = Object.keys(dataSet);
    dataKeys.sort(function(a,b){
        return Number(a) - Number(b);
    });
    dataKeys.forEach(function(key){
        dataArr.push(dataSet[key]);
    });

    var el = document.getElementById(dataKind);
    el.innerHTML = '';
    
    
    env.draw = SVG().addTo('#' + dataKind).size(env.imageWidth, env.imageHeight);
    env.draw.rect(env.graphWidth, env.graphHeight).attr({ 'fill': 'rgb(235,235,235)' }).move(env.xOrigin, env.yOrigin);
    var yHeight = drawYGrid(env, dataKind);
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
            var scaledY = cd[dataKind] / yHeight;
            var pt = [env.xOrigin + env.graphWidth * (idx / w), env.yOrigin + env.graphHeight * (1 - scaledY)];
            points.push(pt);
        });
        idx++;
    });
 
    idx = 0;
    var plKeys = Object.keys(polylines);
    plKeys.forEach(function(plKey){
        var points = polylines[plKey];
        var color = colorOf(idx);
        env.draw.polyline(points).fill('none').attr({ 'stroke-width':'3', 'stroke': color });
        idx++;
    });
}

function displayData(dataKind) {
    genGraph(dataKind);
}
