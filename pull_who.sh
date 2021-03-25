wget https://covid19.who.int/WHO-COVID-19-global-data.csv
mv WHO-COVID-19-global-data.csv public_html/covid_tracker

wget https://covidtracking.com/api/v1/states/daily.json
mv daily.json                   public_html/covid_tracker

wget https://data.cdc.gov/api/views/9mfq-cb36/rows.csv?accessType=DOWNLOAD
mv United_States_COVID-19_Cases_and_Deaths_by_State_over_Time.csv /covid_tracker/daily_cdc.csv