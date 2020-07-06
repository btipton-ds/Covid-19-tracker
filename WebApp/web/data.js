/*
Copyright 2020 Robert R Tipton of Dark Sky Innovative Solutions

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
If this software is used, proper attribution to Dark Sky Innovative Solutions (http://darkskyinnovation.com/) must be displayed.
If the algorithms or methods in the software are modified, Dark Sky Innovative Solutions must be referenced and it must be clearly stated that the algorithms have been modified.

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function dateOf(str) {
    // 2020-02-10
    var fields = str.split("-");
    return new Date(fields[0],fields[1] - 1, fields[2]);
}

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

function readData() {
  $.ajax('WHO-COVID-19-global-data.csv', 
    {
        mimeType : '"text/html"',
        dataType :'text'
    }).then(function (data){
        processWHOData(data);
        readUSAData();
//        begin();
    });
    
}

var gWorldDataMap = {};

async function readUSAData() {
  await $.ajax('https://covidtracking.com/api/v1/states/daily.json', 
    {
        mimeType : '"text/json"',
        dataType :'json'
    }).then(function (data){
        processUSAData(data);
        begin();
    });
    
}

function getData() {
    return gWorldDataMap;
}

function processWHOData(data) {
    var entries = data.split("\n");
    entries.forEach(function(str){
        if (str.indexOf('Date_reported') !== -1)
            return;
        
        var dateStr = str.substring(0, str.indexOf(","));
        str = str.substring(str.indexOf(",") + 1);
        
        var countryCode = str.substring(0, str.indexOf(","));
        str = str.substring(str.indexOf(",") + 1);
        
        var name = '';
        if (str.indexOf('"') == 0) {
            str = str.substring(1);
            name = str.substring(0, str.indexOf('"'));
            str = str.substring(str.indexOf('"') + 1);
        } else {
            name = str.substring(0, str.indexOf(','));
        }
            str = str.substring(str.indexOf(',') + 1);

        var fields = str.split(",");
        if (!gWorldDataMap.hasOwnProperty(countryCode)) {
            var pop = 1;
            var found = false;
            if (populationLUT.hasOwnProperty(name)) {
                pop = populationLUT[name];
                found = true;
            } else {
                var popKeys = Object.keys(populationLUT);
                popKeys.forEach(function(popKey){
                    if (popKey.includes(name) || name.includes(popKey)) {
                        pop = populationLUT[popKey];
                        found = true;
                    }
                });
            }
            if (found)
                pop /= 1.0e6;
//            else
//                console.error('Missing country name ' + name);

            var data = {
                name: name,
                population: pop, 
                region: fields[0], 
                data: []
            };
            gWorldDataMap[countryCode] = data;
        }
        var entry = {
            date: dateOf(dateStr),
            dailyCases: fields[1],
            dailyDeaths: fields[3]
        };

        gWorldDataMap[countryCode].data.push(entry);
    });
    return gWorldDataMap;
}

function processUSAData(data) {
    data.forEach(function(stateData){
        if (!usaPopulationLUT.hasOwnProperty(stateData.state)) {
            return;
        }
        var countryCode = 'US_' + stateData.state;
        var dateNum = stateData.date;
        var year = Math.trunc(dateNum / 10000);
        dateNum = dateNum - (year * 10000);
        var month = Math.trunc(dateNum / 100);
        var day = dateNum - (month * 100);

        if (!gWorldDataMap.hasOwnProperty(countryCode)) {
            var pop = usaPopulationLUT[stateData.state].pop / 1.0e6;
            
            var data = {
                name: usaPopulationLUT[stateData.state].name,
                population: pop, 
                region: 'US', 
                data: []
            };
            gWorldDataMap[countryCode] = data;
        }

        var entry = {
            date: new Date(year, month - 1, day),
            dailyCases: stateData.positiveIncrease,
            dailyDeaths: stateData.deathIncrease
        };

        gWorldDataMap[countryCode].data.push(entry);

    });
    
    var keys = Object.keys(gWorldDataMap);
    keys.forEach(function(key){
        var state = gWorldDataMap[key];
        state.data.sort(function(a, b){
            return a.date - b.date;
        });
    });

    return gWorldDataMap;
}