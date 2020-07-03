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

async function readData() {
  await $.ajax('WHO-COVID-19-global-data.csv', 
    {
        mimeType : '"text/html"',
        dataType :'text'
    }
          ).then(function (data){
        gWHORawData = data;
        begin();
    });
    
}

var whoDataMap = null;

function getData() {
    if (!gWHORawData)
        return;
    if (whoDataMap)
        return whoDataMap;
    var whoDataMap = {};
    var entries = gWHORawData.split("\n");
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
        if (!whoDataMap.hasOwnProperty(countryCode)) {
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
            whoDataMap[countryCode] = data;
        }
        var entry = {
            date: dateOf(dateStr),
            dailyCases: fields[1],
            dailyDeaths: fields[3]
        };

        whoDataMap[countryCode].data.push(entry);
    });
    return whoDataMap;
}
