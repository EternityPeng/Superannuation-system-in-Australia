// initial settings:
var minFrameNum = 0;
var maxFrameNum = 0;

var firstYear = 2019;

var t_max_min = 1;
var t_max_max = 30;

var m_sim_min = 1;
var m_sim_max = 50;

var colored_lines = false;
var history_data = false;
var data_points = false;
var show_percentiles = false;

var percentiles = ["5", "25", "50", "75", "95"];    // 5%, 25%, 50%, 75%, 95%
var num_percentiles = percentiles.length; //fixed at 5

var percentileColors = ["red", "navy", "green", "navy", "red"];

var colormap_init = 0.3;

// true to indicate not playing animation yet:
var initPlay = true;

var yearOffset = 2018;

var animateSpeed = 600;    // in milliseconds

// lg = "line graph"
var lg_title_font_size = "30pt";
var lg_axis_font_size = "18pt";
var lg_label_font_size = "22pt";

//var graph_background_color = "LavenderBlush";
var graph_background_color = "White";

var tooltip_color = "blue";
var tooltip_radius = 14;

var datapoint_radius = 2;

var line_type = d3.curveMonotoneX;
//var line_type = d3.curveCardinal;

var tduration = 0;//2500;
var tdelay = 0;//300;
var transition_easing = d3.easeSin;

var light_line_color = "#aaaaaa";
var dark_line_color = "#666666";

var thin_line_width = 2;
var thick_line_width = 4;

var pct_line_width = 4;
var pct_dash = "20, 30";

var pct_sum_steps = 60;
var pct_interval = Math.round(5000/pct_sum_steps);
var pct_counter = 0;
var pct_timer;


//Function to send a POST request to python for the SUPA model data.
//This will return a JSON encoded string containing the times,
//simulated data that have been computed.
function getSupaData() {
    var jqXHR = $.ajax({
        type: "POST",
        url: "http://" + ip_addr + ":5001/supa_main",
        async: false,
        //timeout: 18000,
        data: {curve: 1}
    });

    var str = jqXHR.statusText;
    return jqXHR.responseText;
}

function findArraysMax(data) {
  datamax = Math.max.apply(Math, data[0]);
  for (i=1; i<data.length; i++) {
    newmax = Math.max.apply(Math, data[i]);
    if (newmax > datamax)
      datamax = newmax;
  }
  return datamax;
}

function adjustMax(datamax) {
  if (datamax > 0)
    newmax = 1.05 * datamax;
  else
    newmax = 0.95 * datamax;
  return newmax;
}

function adjustMin(datamin) {
  if (datamin > 0)
    newmin = 0.95 * datamin;
  else
    newmin = 1.05 * datamin;
  return newmin;
}

function findArraysMin(data) {
  datamin = Math.min.apply(Math, data[0]);
  for (i=1; i<data.length; i++) {
    newmin = Math.min.apply(Math, data[i]);
    if (newmin < datamin)
      datamin = newmin;
  }
  return datamin;
}

/**
  Round the an input value to the nearest n.
  @param {number} number - Number to round.
  @param {integer} n - Round number to the nearest n.
  @return {number} The input number rounded to the nearest n.

  Function that rounds the number to the nearest n (Rounding up).
  e.g. number=67.7, n=10 => returns 70.
*/
function roundToMaxNearest(number, n) {
  var number2 = number;
  if (number2 > 0)
    number2 = number2*1.01;
  else
    number2 = number2*0.99;
  var maxNearest = Math.ceil(number2/n) * n;
  var diff = maxNearest - number;
  var fraction = diff/n;
  if (fraction <= 0.5)
    maxNearest += n;
  return maxNearest;
}

function roundToMinNearest(number, n) {
  var number2 = number;
  if (number2 < 0)
    number2 = number2*1.01;
  else
    number2 = number2*0.99;
  var minNearest = Math.floor(number2/n) * n;
  var diff = number - minNearest;
  var fraction = diff/n;
  if (fraction <= 0.5)
    minNearest -= n;
  return minNearest;
}

function calRoundFactor(maxNum, minNum) {
  var range = maxNum - minNum;
  var roundFactor = 1;
  while (range < 1.5) {
    roundFactor /= 10;
    range *= 10;
  }
  return roundFactor;
}

var formatFloat = function(float, precision) {
  return float.toFixed(precision);
}

var lg_x_tooltipLabel = function(d) {
  return "Year: " + formatFloat(d.x, 0);
}

var lg_y_tooltipLabel = function(d) {
  return formatFloat(d.y, 5);
}

var bisectValues =
  d3.bisector(function(d) {
    return d.x;
  }).left;

/**
  Function called when the user updates the number of years/paths.
  This will update the plot with the appropriate line data.
*/
function frameChangeUpdate(userChanging = true){

  var newFrame = parseInt(document.getElementById("frameNumber").value);

  var newNumYears = parseInt(document.getElementById("numYears").value);

  if (newFrame >= maxFrameNum) {
    newFrame = maxFrameNum-1;
    document.getElementById("frameNumber").value = newFrame;
  }

  for (var i = 0; i < max_num_graphs; i++) {
    var d1 = graphs[i].findPoint(newFrame);
    graphs[i].updateTooltips(d1);
  }

  if (newNumYears > t_max_max) {
    newNumYears = t_max_max;
    document.getElementById("numYears").value = newNumYears;

    ss = "[" + t_max_min.toString() + ", " + t_max_max.toString() + "]";
    alert("The allowable range of number of years is " + ss);
  }

  if (newNumYears < t_max_min) {
    newNumYears = t_max_min;
    document.getElementById("numYears").value = newNumYears;

    ss = "[" + t_max_min.toString() + ", " + t_max_max.toString() + "]";
    alert("The allowable range of number of years is " + ss);
  }

  var newNumPaths = parseInt(document.getElementById("numPaths").value);

  if (newNumPaths > m_sim_max) {
    newNumPaths = m_sim_max;
    document.getElementById("numPaths").value = newNumPaths;

    ss = "[" + m_sim_min.toString() + ", " + m_sim_max.toString() + "]";
    alert("The allowable range of number of paths is " + ss);
  }

  if (newNumPaths < m_sim_min) {
    newNumPaths = m_sim_min;
    document.getElementById("numPaths").value = newNumPaths;

    ss = "[" + m_sim_min.toString() + ", " + m_sim_max.toString() + "]";
    alert("The allowable range of number of paths is " + ss);
  }
}

/*
  Update the path in the global state, and set new colours.
  first = true when the LHS priceline graph is being constructed,
        = false otherwise.
*/
function pathUpdate(first) {
  // not call frameChangeUpdate() when line graph is being constructed:
  if (!first) {
    frameChangeUpdate(false);
  }
}

/*
  Function that automatically plays the animation of the
  switching boundaries from frame 0 to end of frame.
*/
function animateFunc() {
    var animateVar = document.getElementById("playAnimation").value;

    if (animateVar === "Play Animation") {
        document.getElementById("playAnimation").value = "Pause Animation";

        if (initPlay) {
          // start animation from minFrameNum
          document.getElementById("frameNumber").value = minFrameNum;
          initPlay = false;
        }

        // increment frame number every 0.1 sec.
        var intervalHolder = setInterval(move, animateSpeed);

        function move() {
            var frame = document.getElementById("frameNumber");

            var playAnimation = document.getElementById("playAnimation").value;

            if (playAnimation === "Pause Animation" && parseInt(frame.value) < maxFrameNum) {
                frame.dispatchEvent(new Event('change'));
                frame.value++;
            }
            else {
                // udpate screen for last frame:
                //frame.dispatchEvent(new Event('change'));

                clearInterval(intervalHolder);
                document.getElementById("playAnimation").value = "Play Animation";

                if (parseInt(frame.value) >= maxFrameNum)
                {
                  // reset frame number to 0, so that
                  // it is easier to restart animation again:
                  document.getElementById("frameNumber").value = minFrameNum;
                }
            }
        }
    }
    else {
        document.getElementById("playAnimation").value = "Play Animation";
    }
}

function vis_showBorders() {
  for (var i=0; i<graphs.length; i++)
    graphs[i].showBorders();
}

/*
  Convert an array of dictionaries that is plottable into
  a dictionary of arrays.

  Ex: graphable = [
        {"x": 1, "y": 10},
        {"x": 2, "y": 20},
        {"x": 3, "y": 30},
        {"x": 4, "y": 40},
        {"x": 5, "y": 50}];

      convertToUngraphable(graphable, "x", "y", "xdata", "ydata");

      ungraphable === {"xdata": [1, 2, 3, 4, 5], "ydata":[10, 20, 30, 40, 50]};
*/
function convertToUngraphable(graphable, key1 = "x", key2 = "y",
  newkey1 = "x", newkey2 = "y") {

  var ungraphable = {};

  newkey1List = [];
  newkey2List = [];

  for (var i = 0; i < graphable.length; i++) {
    newkey1List.push(graphable[i][key1]);
    newkey2List.push(graphable[i][key2]);
  }

  ungraphable[newkey1] = newkey1List;
  ungraphable[newkey2] = newkey2List;

  return ungraphable;
}

function displayCircles(turnOnFlag) {
  var opacity;
  if (turnOnFlag === true )
    opacity = 1;
  else
    opacity = 0;

  for (var j=0; j<graphs.length; j++)
  {
    var circles1 = graphs[j].vis.select("svg")
                                .selectAll("circle");

    circles1.style("opacity", opacity);
  }
}

function getNewGraph(containerId, index, line_variable, percent_variable, tt, tt_pct, colors) {
  var graphID = index.toString();
  graph = new multilineGraph(containerId, {
      "title": graphTitles[index],
      "xlabel": xlabels[0],
      "ylabel": ylabels[index],
      "lineColors": colors,
      "percentileColors": percentileColors,
      "graphID": graphID,
      "ytooltipAxis": 0,
      "allowDrag": false,
      "allowDelete": false,
      "width": pricelineAspectRatioWidth,
      "height": pricelineAspectRatioHeight
    }, tt, line_variable, percent_variable, tt_pct);

  return graph;
}

//Function to send a POST request to python to generate a new random path.
//This will return a JSON encoded string that make up the new path.
function getNewSupaData() {
    var jqXHR = $.ajax({
        type: "POST",
        url: "http://" + ip_addr + ":5000/supa_recalculate",
        async: false,
        data: $('form').serialize(),
        error: function(error){
            console.log(error);
        }
    });
    return jqXHR.responseText;
}
//modified to colors with colormap: GnBu
function findColors(lineLen) {
  var allColors = new Array(lineLen).fill(light_line_color);
  if (colored_lines) //check if to show colored lines
  {
    for (var ii = 0; ii < lineLen; ii++) {
        var n = ((ii/lineLen)*(1-colormap_init))+colormap_init; //linspace starting from 0.3
        var colormap = interpolateLinearly(n,GnBu);
        var r = colormap[0]*255;
        var g = colormap[1]*255;
        var b = colormap[2]*255;
        allColors[ii] = 'rgb('+r+', '+g+', '+b+')';
        if (ii >= lineLen) break;
    }
  }
  else{
    allColors[lineLen] = dark_line_color;
  }
  return allColors;
}

function recalculateAndUpdateGraphs()
{
    var frame = document.getElementById("frameNumber");
    frame.value = 0;
    frame.dispatchEvent(new Event('change'));  // update graphs
}

function updateNumYears(newVal) {
  document.getElementById("numYears").value = newVal;
}

function updateNumYears_Slider(newVal) {
  document.getElementById("rangeNumYears").value = newVal;
  frameChangeUpdate(false);
}

function updateNumPaths(newVal) {
  document.getElementById("numPaths").value = newVal;
}

function updateNumPaths_Slider(newVal) {
  document.getElementById("rangeNumPaths").value = newVal;
  frameChangeUpdate(false);
}

function updateMultiLines() {
  var colors = findColors(m_sim);

  graphs[0].updateData(qt_all, qt_pct, tt_all, tt_pct, colors);
  graphs[1].updateData(wt_all, wt_pct, tt_all, tt_pct, colors);
  graphs[2].updateData(lt_all, lt_pct, tt_all, tt_pct, colors);
  graphs[3].updateData(st_all, st_pct, tt_all, tt_pct, colors);
  graphs[4].updateData(ct_all, ct_pct, tt_all, tt_pct, colors);
  graphs[5].updateData(yt_all, yt_pct, tt_all, tt_pct, colors);
  graphs[6].updateData(dt_all, dt_pct, tt_all, tt_pct, colors);
  graphs[7].updateData(pt_all, pt_pct, tt_all, tt_pct, colors);

  graphs[8].updateData(et_all, et_pct, tt_all, tt_pct, colors);
  graphs[9].updateData(nt_all, nt_pct, tt_all, tt_pct, colors);
  graphs[10].updateData(bt_all, bt_pct, tt_all, tt_pct, colors);
  graphs[11].updateData(ot_all, ot_pct, tt_all, tt_pct, colors);
  graphs[12].updateData(ht_all, ht_pct, tt_all, tt_pct, colors);
  graphs[13].updateData(ut_all, ut_pct, tt_all, tt_pct, colors);

  var frame = document.getElementById("frameNumber");
  frame.value = minFrameNum;
  frame.dispatchEvent(new Event('change'));  // update graphs
}

function updateFromCheckboxes() {
  colored_lines = document.getElementById("checked_color").checked;
  history_data = document.getElementById("checked_hist").checked;
  data_points = document.getElementById("checked_datapoints").checked;
  show_percentiles = document.getElementById("checked_percentiles").checked;
}

function changeLinesColors() {
  updateFromCheckboxes();
  updateMultiLines();
}

function displayDataPoints() {
  updateFromCheckboxes();
  displayCircles(data_points);
}

// Function that recalculates the number of years / paths for the user.
function recalculatePathFunc() {
  updateFromCheckboxes();

  var supaData = getNewSupaData();
  supaData = JSON.parse(supaData);

  m_sim = supaData["m_sim"];

  tt = supaData["t"];

  qt = supaData["qt"];
  wt = supaData["wt"];
  lt = supaData["lt"];
  st = supaData["st"];
  ct = supaData["ct"];
  yt = supaData["yt"];
  dt = supaData["dt"];
  pt = supaData["pt"];

  et = supaData["et"];
  nt = supaData["nt"];
  bt = supaData["bt"];
  ot = supaData["ot"];
  ht = supaData["ht"];
  ut = supaData["ut"];

  [tt_all, qt_all, wt_all, lt_all, st_all, ct_all, yt_all, dt_all, pt_all,
           et_all, nt_all, bt_all, ot_all, ht_all, ut_all] = updateFromHistData();

  updateMultiLines();

  displayCircles(data_points);
}

function updateFrameLimits(ttemp) {
  minFrameNum = ttemp[0];
  maxFrameNum = ttemp[ttemp.length-1]+1;
}

function addYears() {
  var len = tt.length;
  tt_years = new Array(len);
  for (var i=0; i<len; i++) {
    tt_years[i] = tt[i] + firstYear;
  }
  return tt_years;
}

function getLastElement(arr) {
  if (history_data)
    return arr;
  else
    return [arr[arr.length-1]];
}

function getPctLastElement(arr) {
  return [arr[arr.length-1]];
}

function updateFromHistData() {
  tt_years = addYears();

  var rows = qt.length; //number of paths
  var cols = qt[0].length; //number of years

  var qt_temp = new Array(rows);
  var wt_temp = new Array(rows);
  var lt_temp = new Array(rows);
  var st_temp = new Array(rows);
  var ct_temp = new Array(rows);
  var yt_temp = new Array(rows);
  var dt_temp = new Array(rows);
  var pt_temp = new Array(rows);

  var et_temp = new Array(rows);
  var nt_temp = new Array(rows);
  var bt_temp = new Array(rows);
  var ot_temp = new Array(rows);
  var ht_temp = new Array(rows);
  var ut_temp = new Array(rows);

  var tt_temp = getLastElement(hist_t).concat(tt_years);

  for (var r=0; r<rows; r++)
  {
    qt_temp[r] = getLastElement(hist_qt).concat(qt[r]);
    wt_temp[r] = getLastElement(hist_wt).concat(wt[r]);
    lt_temp[r] = getLastElement(hist_lt).concat(lt[r]);
    st_temp[r] = getLastElement(hist_st).concat(st[r]);
    ct_temp[r] = getLastElement(hist_ct).concat(ct[r]);
    yt_temp[r] = getLastElement(hist_yt).concat(yt[r]);
    dt_temp[r] = getLastElement(hist_dt).concat(dt[r]);
    pt_temp[r] = getLastElement(hist_pt).concat(pt[r]);

    et_temp[r] = getLastElement(hist_et).concat(et[r]);
    nt_temp[r] = getLastElement(hist_nt).concat(nt[r]);
    bt_temp[r] = getLastElement(hist_bt).concat(bt[r]);
    ot_temp[r] = getLastElement(hist_ot).concat(ot[r]);
    ht_temp[r] = getLastElement(hist_ht).concat(ht[r]);
    ut_temp[r] = getLastElement(hist_ut).concat(ut[r]);
  }

  updateFrameLimits(tt_temp);

  return [tt_temp, qt_temp, wt_temp, lt_temp, st_temp, ct_temp, yt_temp, dt_temp, pt_temp,
                   et_temp, nt_temp, bt_temp, ot_temp, ht_temp, ut_temp];
}

function extractArray(p, cols) {
  len = p.length;
  var p_temp = new Array(len);
  for (var i=0; i<len; i++) {
    p_temp[i] = p[i].slice(0,cols);
  }
  return p_temp;
}

function updatePercentiles() {
  var tt_temp = getPctLastElement(hist_t).concat(tt_years);

  var cols = tt_temp.length;

  var qt_temp = extractArray(percentile_qt, cols);
  var wt_temp = extractArray(percentile_wt, cols);
  var lt_temp = extractArray(percentile_lt, cols);
  var st_temp = extractArray(percentile_st, cols);
  var ct_temp = extractArray(percentile_ct, cols);
  var yt_temp = extractArray(percentile_yt, cols);
  var dt_temp = extractArray(percentile_dt, cols);
  var pt_temp = extractArray(percentile_pt, cols);

  var et_temp = extractArray(percentile_et, cols);
  var nt_temp = extractArray(percentile_nt, cols);
  var bt_temp = extractArray(percentile_bt, cols);
  var ot_temp = extractArray(percentile_ot, cols);
  var ht_temp = extractArray(percentile_ht, cols);
  var ut_temp = extractArray(percentile_ut, cols);

  return [tt_temp, qt_temp, wt_temp, lt_temp, st_temp, ct_temp, yt_temp, dt_temp, pt_temp,
                   et_temp, nt_temp, bt_temp, ot_temp, ht_temp, ut_temp];
}

function addHistoricalData() {
  updateFromCheckboxes();

  [tt_all, qt_all, wt_all, lt_all, st_all, ct_all, yt_all, dt_all, pt_all,
           et_all, nt_all, bt_all, ot_all, ht_all, ut_all] = updateFromHistData();

  [tt_pct, qt_pct, wt_pct, lt_pct, st_pct, ct_pct, yt_pct, dt_pct, pt_pct,
           et_pct, nt_pct, bt_pct, ot_pct, ht_pct, ut_pct] = updatePercentiles();

  updateMultiLines();

  displayCircles(data_points);
}

function animatePercentiles() {
  var fraction = pct_counter/pct_sum_steps;

  graphs[0].animate_pct(fraction);
  graphs[1].animate_pct(fraction);
  graphs[2].animate_pct(fraction);
  graphs[3].animate_pct(fraction);
  graphs[4].animate_pct(fraction);
  graphs[5].animate_pct(fraction);
  graphs[6].animate_pct(fraction);
  graphs[7].animate_pct(fraction);

  graphs[8].animate_pct(fraction);
  graphs[9].animate_pct(fraction);
  graphs[10].animate_pct(fraction);
  graphs[11].animate_pct(fraction);
  graphs[12].animate_pct(fraction);
  graphs[13].animate_pct(fraction);

  pct_counter++;
  if (pct_counter > pct_sum_steps)
    pct_counter = 0;

  pct_timer = setTimeout(animatePercentiles, pct_interval);
}

function showPercentiles() {
  if (document.getElementById("checked_percentiles").checked)
  {
    document.getElementById("checked_color").checked = false;
    document.getElementById("checked_datapoints").checked = false;

    document.getElementById("pct_05").innerHTML = "- - - &nbsp;&nbsp; &nbsp;5%, 95%";
    document.getElementById("pct_25").innerHTML = "- - - &nbsp;&nbsp; 25%, 75%";
    document.getElementById("pct_50").innerHTML = "- - - &nbsp;&nbsp; 50%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
    document.getElementById("div_pct").style.display = "block";

    pct_counter = 0;
    pct_timer = setTimeout(animatePercentiles, pct_interval);
  }
  else{
    document.getElementById("div_pct").style.display = "none";
    clearTimeout(pct_timer);
  }
  addHistoricalData();
}

function getPercentileArray(supaData, hist, name) {
  var percentile_temp = new Array(num_percentiles);
  for (var i=0; i<percentiles.length; i++)
  {
    var temp = supaData[name + percentiles[i]];
    percentile_temp[i] = getPctLastElement(hist).concat(temp);
  }
  return percentile_temp;
}

/*
  New functions added.
  changeTab - to change tab and show single economic variable graph
  interpolateLinearly - interpolates the colormap to get colors **Credits to timothygebhard
*/

function changeTab(tabNum){
  var x = document.getElementsByClassName("tab");
  var y = document.getElementsByClassName("tab-button");
  if (tabNum == "00"){
    for (var i=0; i < x.length; i++)
    {
      x[i].removeAttribute("style");
      x[i].style.width = "50%";
      for (var j=0; j<y.length;j++){
        y[j].classList.remove("tab-active");
      }

      document.getElementById("tab"+tabNum).classList.add("tab-active");
    }
  }else{
    for (var i=0; i < x.length; i++)
    {
      x[i].style.display = "none";
      for (var j=0; j<y.length;j++){
        y[j].classList.remove("tab-active");
      }
    }
    document.getElementById("td"+tabNum).style.display = "block";
    document.getElementById("td"+tabNum).style.width = "100%";
    document.getElementById("tab"+tabNum).classList.add("tab-active");
  }

}

function enforceBounds(x) {
  if (x < 0) {
    return 0;
  } else if (x > 1){
    return 1;
  } else {
    return x;
  }
}

function interpolateLinearly(x, values) {
    // Split values into four lists
    var x_values = [];
    var r_values = [];
    var g_values = [];
    var b_values = [];
    for (i in values) {
        x_values.push(values[i][0]);
        r_values.push(values[i][1][0]);
        g_values.push(values[i][1][1]);
        b_values.push(values[i][1][2]);
    }
    var i = 1;
    while (x_values[i] < x) {
        i = i+1;
    }
    i = i-1;
    var width = Math.abs(x_values[i] - x_values[i+1]);
    var scaling_factor = (x - x_values[i]) / width;
    // Get the new color values though interpolation
    var r = r_values[i] + scaling_factor * (r_values[i+1] - r_values[i])
    var g = g_values[i] + scaling_factor * (g_values[i+1] - g_values[i])
    var b = b_values[i] + scaling_factor * (b_values[i+1] - b_values[i])
    return [enforceBounds(r), enforceBounds(g), enforceBounds(b)];
}
