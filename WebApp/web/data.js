
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
  await $.ajax({
    url:'WHO-COVID-19-global-data.csv'
  }).then(function (data){
        gWHORawData = data;
        begin();
    });
    
}
function getData() {
    if (!gWHORawData)
        return;
    var map = {};
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
        if (!map.hasOwnProperty(countryCode)) {
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
            map[countryCode] = data;
        }
        var entry = {
            date: dateOf(dateStr),
            dailyCases: fields[1],
            dailyDeaths: fields[3]
        };

        map[countryCode].data.push(entry);
    });
    return map;
}
