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
        //readUSAData();
        readUSACDCData();
        begin(true);
    });
    
}

var gWorldDataMap = {};

function readUSAData() {
  $.ajax('daily.json', 
    {
        mimeType : '"text/json"',
        dataType :'json'
    }).then(function (data){
        var allData = processUSAData(data);
        fixObviousErrors(allData);
        begin(false);
    });
    
}

function readUSACDCData() {
  $.ajax('daily_cdc.csv', 
    {
        mimeType : '"text/csv"',
        dataType :'text'
    }).then(function (data){
        var allData = processUSACDCData(data);
        fixObviousErrors(allData);
        begin(false);
    });
    
}

function isBadCaseDate(countryCode, dataRec) {
    for(var i = 0; i < CTData.badCaseEntries.length; i++) {
        var entry = CTData.badCaseEntries[i];
        if (countryCode !== entry.cc)
            continue;
        var entDate = entry.date;
        if (entDate.getFullYear() == dataRec.date.getFullYear() && entDate.getMonth() === dataRec.date.getMonth() && entDate.getDate() === dataRec.date.getDate())
            return true;
    }
    return false;
}

function fixObviousErrors(allData) {
    var keys = Object.keys(allData);
    keys.forEach(function(key){
        var e = allData[key];
        var data = e.data;
        for (var i = 0; i < data.length; i++) {
            if (i === data.length - 1) {
            } else if (i === 0) {
            } else {
                if (isBadCaseDate(key, data[i])) {
                    console.log('Patching ' + key + ': ' + data[i].date);
                    data[i].dailyCases = Math.max(data[i-1].dailyCases, data[i+1].dailyCases);
                } else {
                    if (data[i].dailyCases < 0) {
                        data[i].dailyCases = (data[i-1].dailyCases + data[i+1].dailyCases) / 2;
                        if (data[i].dailyCases < 0) {
                            data[i].dailyCases = Math.max(data[i-1].dailyCases, data[i+1].dailyCases);
                        }
                    }
                    if (data[i].dailyDeaths < 0) {
                        data[i].dailyDeaths = (data[i-1].dailyDeaths + data[i+1].dailyDeaths) / 2;
                        if (data[i].dailyDeaths < 0) {
                            data[i].dailyDeaths = Math.max(data[i-1].dailyDeaths, data[i+1].dailyDeaths);
                        }
                    }

                    var avg = 0, count = 0;
                    for (var j = -3; j <= 3; j++) {
                        var idx = i + j;
                        if (idx >= 0 && idx < data.length) {
                            avg += data[idx].dailyCases;
                            count++;
                        }
                    }

                    if (count > 1) {
                        avg /= count;
                        var avgSqr = 0
                        var span = 4;
                        for (var j = -span; j <= span; j++) {
                            var idx = i + j;
                            if (idx >= 0 && idx < data.length) {
                                var diff = data[idx].dailyCases - avg;
                                avgSqr += diff * diff;
                            }
                        }
                        avgSqr /= (count - 1);
                        var sigma = Math.sqrt(avgSqr);
                        var delta = Math.abs(data[i].dailyCases - avg);

                        if (data[i].dailyCases === 972) {
                            console.log('hit');
                        }

                        if (delta > 2 * sigma) {
                            data[i].dailyCases = Math.max(data[i-1].dailyCases, data[i+1].dailyCases);
                        }
                    }
                }
            }
        }
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
            dailyCases: Number(fields[1]),
            dailyDeaths: Number(fields[3]),
            dailyHospitalized: 0
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
            dailyDeaths: stateData.deathIncrease,
            dailyHospitalized: stateData.hospitalizedCurrently
        };

        gWorldDataMap[countryCode].data.push(entry);
/* Data screeing test DO NOT delete
        if (stateData.state === 'TN') {
            console.log(entry.date + ' ' + stateData.state + ': ' + stateData.positiveIncrease);
        }         
 */
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

function processUSACDCData(inputData) {
    var data = inputData.split('\n');
    var header = data[0].split(',');
    console.log(header);
    data.shift();

    data.forEach(function(row){
        var rowData = row.split(',');
        var dateArr = rowData[0].split('/');
        var stateData = {
            'date' : new Date(dateArr[2], dateArr[0] - 1, dateArr[1]),
            'state' : rowData[1],

            'totCases' : (rowData[2] === "") ? 0 : parseInt(rowData[2]),
            'totDeaths' : (rowData[7] === "") ? 0 : parseInt(rowData[7]),

            'positiveIncrease' : (rowData[5] === "") ? 0 : parseInt(rowData[5]),
            'deathIncrease' : (rowData[10] === "") ? 0 : parseInt(rowData[10]),
            'hospitalizedCurrently' : 0,
        };
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
            date: stateData.date,
            dailyCases: stateData.positiveIncrease,
            dailyDeaths: stateData.deathIncrease,
            dailyHospitalized: stateData.hospitalizedCurrently
        };

        gWorldDataMap[countryCode].data.push(entry);
/* Data screeing test DO NOT delete
        if (stateData.state === 'TN') {
            console.log(entry.date + ' ' + stateData.state + ': ' + stateData.positiveIncrease);
        }         
 */
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