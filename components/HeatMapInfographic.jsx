/* @flow */

import React from 'react'

import { API_LINK } from '../constants/api'
import $ from "jquery"
import Tooltip from 'rc-tooltip';
import Slider from 'rc-slider';
import { Series } from 'pandas-js';
import { HeatMap } from 'nivo'
import { Charts, ChartContainer, ChartRow, YAxis, LineChart,Resizable } from "react-timeseries-charts"
import { TimeSeries, TimeRange, sum } from "pondjs";

import _ from 'lodash';
import 'rc-slider/assets/index.css';
import 'rc-tooltip/assets/bootstrap.css';


const createSliderWithTooltip = Slider.createSliderWithTooltip;
const Range = createSliderWithTooltip(Slider.Range);
const Handle = Slider.Handle;

class HeatMapInfographic extends React.Component {

   constructor (props: Object) {
    super(props)

    if(
        this.props.api === undefined || 
        this.props.dateField === undefined || 
        this.props.infographicDefinitions === undefined 
      ) {
      throw "Invalid Props"
    }
    
    const now = new Date()
    const currentYear = now.getFullYear()
    const years = _.range(this.props.infographicDefinitions.startYear, currentYear+1)
    const slider_marks = years.slice(1,100).reduce(function(result, item, index, array) {
      result[item] = item;
      return result;
    }, {})
    const minTime = new Date(this.props.infographicDefinitions.startYear,1,1);

    this.state = {
      API_LINK: API_LINK,
      title: this.props.infographicDefinitions.title,
      api: this.props.api,
      selection:  null,
      tracker:   null,
      sparklineData:  null,
      timerange:  null,
      queries:  this.props.infographicDefinitions.queries,
      xTerms: [],
      step: 1,
      min: this.props.infographicDefinitions.startYear+1,
      max: currentYear,
      defaultValue: currentYear,
      currentValue: currentYear,
      startYear: this.props.infographicDefinitions.startYear,
      endYear: currentYear,
      countBy: this.props.infographicDefinitions.countBy,
      slider_marks: slider_marks,
      years: years,
      minTime: minTime,
      maxTime: now,
      enablePanZoom: false,
      defaultTimeRange: new TimeRange([minTime, now]),
      _rows: [],
      original_rows: []
    }

    this.changeValue = this.changeValue.bind(this)
    this.onClick = this.onClick.bind(this)
    this.togglePanZoom = this.togglePanZoom.bind(this)
  }

  componentDidMount () {
    this._getAllData().then((res) => {
      this.setState({
        all_data: res.data,
        keys: res.keys,
        data: res.data[this.state.defaultValue],
        timeseries: res.timeseries,
      })
      this.onClick(this.props.infographicDefinitions.defaults)
    })
  }

  fetchJSON (url: string): Object {  
    return new Promise((resolve, reject) => {
      $.getJSON(url)
        .done((json) => resolve(json, url))
        .fail((xhr, status, err) => reject(status + err.message));
    });
  }

  _getAllData () {
    const l = Object.values(this.state.queries),
          urls = [],
          that = this;

    l.forEach(function(param){
      that.state.years.forEach(function(year){
        var url = `${that.state.API_LINK}${that.state.api}.json?search=${that.props.dateField}[${year}0101+TO+${year}1231]`
        if(param != ""){
          url += "+AND+" + param
        }
        url += `&count=${that.state.countBy}`
        urls.push(url)
      })
    })

    const emptyYearsArray = this.state.years.map(y => 0);

    let filesPromise = Promise.resolve([]);
    const itemPromises = urls.map(this.fetchJSON);
    filesPromise = Promise.all(itemPromises).then((results) => {
      var d = [],
          e = {},
          allResult = {}, 
          final = {},
          keys = [],
          response = {},
          yearsObj = {};

      results.forEach(function(item, index) {
        var url = urls[index],
            urlSplit = url.split("&")[0].split("AND+"),
            s = urlSplit.length == 1 ? "all" : urlSplit[1].split(':')[1],
            dayRegex = /\d{1,8}/,
            dayRegexMatch = url.match(dayRegex),
            year = null,
            yearPosition = null;
        
        if(dayRegexMatch.length){
          year = parseInt(dayRegexMatch[0].slice(0,4))

          that.state.years.forEach(function(y, idx){
            if(y == year){
              yearPosition = idx;
            }
          })
        }

        var terms = item.results.map(v => {
          var d = v.term.split('(')
          that.state.xTerms[d[0]] = v.term
          return d[0]
        });

        // define data structure
        if(final[s] == undefined){
          var local_dict = {}
          terms.forEach(function(term){
            local_dict[term] = $.extend(true, [], emptyYearsArray)
          })
          final[s] = local_dict;
        } 
        // add extra categories
        else {
          terms.forEach(function(term){
            // term not found
            if(final[s][term] == undefined){
              final[s][term] = $.extend(true, [], emptyYearsArray)
            }
          })
        }

        // now that data structure has been built, add the data to timeseries for
        // coresponding year
        item.results.forEach(function(v){
          var term = v.term.split('(')[0]
          final[s][term][yearPosition] = v.count
        })        

      })

      var sorter = {};
      Object.keys(final.all).forEach(function(key){
        var sum = final.all[key].reduce(function (a, b) {
          return a + b;
        }, 0);
        sorter[key] = sum;
      })

      var sorted_keys = Object.keys(sorter).sort(function(a,b){return sorter[a]-sorter[b]}).reverse();

      sorted_keys.forEach(function(key, idx){
        if(idx <= 15){
          keys.push(key)
        }
        Object.keys(final).forEach(function(category){
          // remove keys after limit
          if(idx > 15){
            delete final[category][key]
          } 
          // make sure we fill keys with empty array if not already covered...
          else {
            if (final[category][key] == undefined){
              final[category][key] = $.extend(true, [], emptyYearsArray)
            }
          }
        })
      })

      Object.keys(final).forEach(function(k){
        response[k] = {}
        Object.keys(final[k]).forEach(function(category){
          const original_series = new Series(final[k][category])
          var r = original_series.diff().shift(-1)

          var g = _.zip(r._data._tail.array, original_series._data)
          
          var YOYs = [];

          g.forEach(function(zipped){
            if(zipped[0] != null){
              var z = null;
              if(zipped[0] > 0 && zipped[1] == 0){
                z = 1
              } else if (zipped[0] == 0 && zipped[1] == 0){
                z = 0
              } else {
                z = zipped[0]/zipped[1];
              }

              YOYs.push(z);
            }
          })

          response[k][category] = YOYs;
        })
      })

      that.state.years.slice(1,100).forEach(function(y,idx){
        var data = [];
        Object.keys(response).forEach(function(k){
          const f = {
            "_type": k
          }
          Object.keys(response[k]).forEach(function(category, index){
            var yoy = response[k][category][idx];
            f[category] = Math.floor(yoy * 100);
          })
          data.push(f)
        })
        yearsObj[y] = data;
      })

      return { 
        "data": yearsObj,
        "keys": keys,
        "timeseries": response
      }
    })

    return filesPromise

  }

  onClick(node, event){
    if(node.value === '-') return
    var xKey = this.state.xTerms[node['xKey']],
        yKey = this.state.queries[node['yKey'].toLowerCase()] === "" ? "" :  ("+AND+" + this.state.queries[node['yKey'].toLowerCase()]),
        url = `${this.state.API_LINK}${this.state.api}.json?search=${this.props.infographicDefinitions.countBy}:` + xKey + yKey + `&count=${this.props.dateField}`,
        that = this;

    let filesPromise = Promise.resolve([]);
    filesPromise = Promise.all([url].map(this.fetchJSON)).then(function(results) {
      var series = new TimeSeries({
        name: "timeseries",
        columns: ["time","value"],
        points: results[0].results.map(function(i){
            let x = i.time.slice(0,4) + '-' + i.time.slice(4,6) + '-' + i.time.slice(6,8)
            return [new Date(x), i.count]
       }) 
      }).yearlyRollup({
        aggregation: {
          value: {
            value: sum()
          }
        },
        toTimeEvents : true
      })

      that.setState({
        sparklineData: series,
        sparklindDataMax: series.max(),
        timerange: new TimeRange(that.state.minTime, new Date(that.state.currentValue+1, 1,20)),
        currentXkey: node['xKey'].charAt(0).toUpperCase() + node['xKey'].slice(1).toLowerCase(),
        currentYkey: node['yKey'].charAt(0).toUpperCase() + node['yKey'].slice(1).toLowerCase()
      })
    })

  }

  changeValue (d){
    this.setState({
      currentValue : d,
      data: this.state.all_data[d],
      timerange: new TimeRange(this.state.minTime, new Date(d+1, 1,20))
    })
  }

  togglePanZoom (){
    this.setState({
      enablePanZoom: this.state.enablePanZoom ? false : true
    })
  }

  render (): ?React.Element {
    if (!this.state.data) return <span />

    const handle = (props) => {
      const { value, dragging, index, ...restProps } = props;
      return (
        <Tooltip
          prefixCls="rc-slider-tooltip"
          overlay={value}
          visible={dragging}
          placement="top"
          key={index}
        >
          <Handle value={value} {...restProps} />
        </Tooltip>
      );
    };

    return (
        <section className='float-r infographic-container'>
        <h3 className="interactive-infographic-header-title">{this.state.title} </h3>
          <div className="heatmap-header">
            <p className="interactive-infographic-center"> Selected Year - <i className="interactive-infographic-bold">{this.state.currentValue}</i></p>
            <Slider 
              className="interactive-infographic-left"
              min={this.state.min} 
              max={this.state.max} 
              defaultValue={this.state.defaultValue}
              marks={this.state.slider_marks}
              handle={handle} 
              onAfterChange={this.changeValue}
              step={this.state.step}
            />
          </div>
          <HeatMap
            data={this.state.data}
            keys={this.state.keys}
            onClick={this.onClick}
            {...this.props.infographicDefinitions.heatMapConfig}
          />
          <button className="heatmap-infographic-zoom-button" onClick={this.togglePanZoom }> { this.state.enablePanZoom ? 'Disable' : 'Enable' } Zoom</button>
          { !this.state.sparklineData ? null : 
            <h3 className="interactive-infographic-center"> {this.props.infographicDefinitions.yName}: {this.state.currentYkey}, {this.props.infographicDefinitions.xName}: {this.state.currentXkey} </h3> 
          }
          { !this.state.sparklineData ? null : 
            <Resizable>
              <ChartContainer 
                timeRange={this.state.timerange} 
                width={this.props.infographicDefinitions.chartConfig.width}
                enablePanZoom={this.state.enablePanZoom}
                onTimeRangeChanged={timerange => { this.setState({ timerange }) }}
                trackerPosition={this.state.tracker}
                onTrackerChanged={tracker => this.setState({ tracker })}
                minTime={this.state.minTime}
                maxTime={this.state.maxTime}
                showGrid={this.props.infographicDefinitions.chartConfig.showGrid}
              >
                  <ChartRow height={this.props.infographicDefinitions.chartConfig.chartRowHeight}>
                      <YAxis 
                        id="axis1"
                        max={this.state.sparklindDataMax}
                        {...this.props.infographicDefinitions.chartConfig.yAxis}
                      />
                      <Charts>
                          <LineChart 
                            axis="axis1"
                            series={this.state.sparklineData}
                            style={this.props.infographicDefinitions.chartConfig.lineStyle}
                            interpolation={this.props.infographicDefinitions.chartConfig.interpolation}
                            highlight={this.state.highlight}
                            onHighlightChange={highlight => this.setState({ highlight })}
                            selection={this.state.selection}
                            onSelectionChange={selection => this.setState({ selection })}
                          />
                      </Charts>
                  </ChartRow>
              </ChartContainer>
            </Resizable>
          }
        </section>
    )
  }
}

export default HeatMapInfographic