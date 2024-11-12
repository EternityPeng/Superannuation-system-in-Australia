
// initial settings:
var initFrameNum = 0;

// turn on "View Price Tooltip"?
var tooltipOn = true;

// turn on "Update Switching Boundary with Price Observation"?
var dynamicUpdateOn = true;

// turn on "Display Current Operating Regime"?
var updatePriceDotOn = true;

// turn on "Enable Price Editing"?
var priceEditOn = false;

// true to indicate not playing animation yet:
var initPlay = true;

var tooltip_color = "blue";

var datapoint_radius = 3;

var vis_circle_radius1 = 12;
var vis_circle_radius2 = 4;

var vis_circle_border1 = 3;
var vis_circle_border2 = 2;

var animateSpeed = 300;    // in milliseconds

var title_font_size = 30;
var axis_font_size = 25;

// simulation parameters:

var int_rate = 0.10;  //Risk-Free Interest Rate.
var inf_rate = 0.08;  //Rate of Inflation.

var property_rate = 0.02; //Property Rate, lambda1, lambda2

var discount_rate = int_rate + property_rate;

var depletionRate = 10; //The rate of mine depletion (in million pounds) per year.

var numDecisions = 2;   //Number of decisions per time period (year)

// depletion rate (in million pounds) per decision time, 
// i.e. depletion rate (in million pounds) per half year
var reductionRate = depletionRate / numDecisions; // = depletionRate * dt

var extract_rate = 0.5; // = $0.5 mine extraction cost / pounds
                        // = cost associated with each extraction $ / pounds, 
                        //   when mine is open (including maintenance cost).
                        // extract_rate * depletionRate = extraction cost / year 
                        // = $5 million / year

var maint_cost = 0.5;  // The cost of maintenance per year for any non-abandoned mine, 
                       // i.e. basic maintenance cost per year when mine is closed 
                       // = $0.5 million per year

var taxRate = 0.5;     // royalty (t1) + income (t2)

var switch_cost = 0.2; // The switching cost (in million $) associated with changing
                       // from open to closed or vice-versa regimes.
                       // (independent of size of mine in pounds)

var dt = 1/numDecisions;   // = 0.5 year = The time between each decision (years).
                           // total 120 times: corresponding to total 60 years

//Function to send a POST request to python for the mine data. 
//This will return a JSON encoded string containing the times,
//prices and selection matrix that has been computed.
function getMineData() {
    var jqXHR = $.ajax({
        type: "POST",
        url: "http://" + ip_addr + ":5001/mine_main",
        async: false,
        //timeout: 18000,
        data: {curve: 1}
    });
    
    var str = jqXHR.statusText;

    return jqXHR.responseText;
}

//Function to send a POST request to python to generate a new random path. 
//This will return a JSON encoded string containing the y values (prices)
//that make up the new path.
function getNewPath() {
    var jqXHR = $.ajax({
        type: "POST",
        url: "http://" + ip_addr + ":5001/mine_recalculate",
        async: false,
        //timeout: 18000,
        data: {curve: 1}
    });

    return jqXHR.responseText;
}

/*
  Function that returns the col column of a matrix. 
  Equivalent to an array slicing method in other languages.

  Ex: input = [[1, 2, 3],
               [3, 4, 5],
               [5, 6, 7]];
      getCol(input, 1) === [2, 4, 6] //The 2nd column of the matrix
                                       (columns are indexed from 0).
      getCol(input, 3) will throw an error as matrix[i][3] will not exist for any i.
*/
function getCol(matrix, col) {
   var column = [];

   for (var i=0; i<matrix.length; i++) {
        column.push(matrix[i][col]);
   }

   return column;
}

var getVisLabels = function(xmin, xmax) {
   var labels = [];

   for (var i=xmin; i<=xmax/10; i++) {
        labels.push(i*10);
   }

   return labels;
}

/*
  Function that takes in the price path and 
  returns the path and colour of the reserve levels.

  Ex: prices = [1.16, 1.10, 0.71, 0.72, 0.29, 0.98, ...];
      reserveLevel = getReserveLevel(mineData, prices, 5);
      reserveLevel === {"reserve": [145, 140, 135, 130, 125, 120, ...],
                        "colours": [openColourRegime, openColourRegime, closedColourRegime, closedColourRegime, abandonedColourRegime, abandonedColourRegime],
                        "regime": ["open", "open", "closed", "closed", "abandoned", "abandoned"]};
                        
  Meanings of value0 = open to closed
              value1 = closed to abandoned
              value2 = closed to open
              value3 = open to abandoned
              
  There are 120 times. Each time has 4 values above * 30 reserve levels. 
  If currently open: 
    if price > value0 => open; 
    if price < value0 then: if price > value3 => closed else abandoned.
  If currently closed: 
    if price > value2 => open; 
    if price < value2 then: if price > value1 => closed else abandoned.
    
  If it is open, at next time reserve will become reserve level - 1;
  If it is closed, at next time reserve level remains unchanged, 
    but its status can become "open" if price is high enough later.
  If it is abandoned, at next time reserve level remains unchanged, 
    but its status will still be "abandoned" for all later times 
      whatever high price will be later.
  If reserve level becomes 0, its status with be "depleted".
  
  "Hysteresis" means no switching:
  That is, "open" remains "open", or "closed" remains "closed".

  *****
  NOTE: Specifics will change based on reductionRate and 
  the values of the switching boundary matrix stored in mineData.
  Values shown were made up assuming a mine with initial reserve 145, and 
  price varying linearly downward such that at time t = 3,4 the mine is closed, and 
  at time t = 5 the mine is abandoned. Therefore at t = 6 the mine is still abandoned
  regardless of the significantly higher price.
  *****
*/
function getReserveLevel(mineData, prices, reductionRate = 5) {
    var levels = [];  // array of decreasing reserve levels
    var colours = []; // corresponding array of colors (e.g. open color, etc)
    var regime = [];  // corresponding array of comments (e.g. "open", etc)

    var previouslyClosed = false;
    var abandoned = false;
    var depleted = false;
    
    // reserves (an array): 0, 5, 10, 15, 20, 25, ..., 145 (length = 30)
    var maxReserve2 = Math.max.apply(Math, mineData["data"]["value0"]["reserves"]);//145
    var lastReserve = maxReserve2;  //starts from 145

    // times (an array): 0, 1, 2, 3, 4, ..., 119 (length - 120)
    var maxTime = mineData["data"]["value0"]["times"].length;  //120
    
    var i = 0;
    var maxReserveInd = getCol(mineData["data"]["value3"]["matrix"], i).length - 1; //29

    levels.push(lastReserve);       //145
    colours.push(openColourRegime);
    regime.push("open");            // initially mine assumed "open" at time i=0

    // i = time index
    for (i = 1; i < maxTime; i++) {
        // reserveInd = current reserve index: starts from 0 (between 0 and 29)
        var reserveInd = maxReserveInd - (lastReserve / reductionRate);

        if (!previouslyClosed && lastReserve !== 0 && !abandoned && i !== 0) {
            // not decrement if previously closed or abandoned:
            lastReserve -= reductionRate;  // 140, 135, ..., 0
        }

        if (lastReserve === 0 || depleted) {
            // if 0 reserve => depleted status:
            depleted = true;
            levels.push(lastReserve);
            colours.push(depletedColourRegime);
            regime.push("depleted");
            continue;
        }
        
        if (abandoned) {
            abandoned = true;
            levels.push(lastReserve);
            colours.push(abandonedColourRegime);
            regime.push("abandoned");
            continue;
        }
        
        var currentPrice = prices[i];
        var value0Price = mineData["data"]["value0"]["matrix"][reserveInd][i];
        var value1Price = mineData["data"]["value1"]["matrix"][reserveInd][i];
        var value2Price = mineData["data"]["value2"]["matrix"][reserveInd][i];
        var value3Price = mineData["data"]["value3"]["matrix"][reserveInd][i];

        if (previouslyClosed) {
          // previously closed:
          if (currentPrice > value2Price) {
            levels.push(lastReserve);
            colours.push(openColourRegime);
            regime.push("open");
            previouslyClosed = false;
          } else {
            previouslyClosed = true;
            if (currentPrice > value1Price) {
              levels.push(lastReserve);
              colours.push(closedColourRegime);
              regime.push("closed");
            } else {
              abandoned = true;
              levels.push(lastReserve);
              colours.push(abandonedColourRegime);
              regime.push("abandoned");
            }
          }
        }
        else {
          // previously open:
          if (currentPrice > value0Price) {
            levels.push(lastReserve);
            colours.push(openColourRegime);
            regime.push("open");
            previouslyClosed = false;
          } else {
            previouslyClosed = true;
            if (currentPrice > value3Price) {
              levels.push(lastReserve);
              colours.push(closedColourRegime);
              regime.push("closed");
            } else {
              abandoned = true;
              levels.push(lastReserve);
              colours.push(abandonedColourRegime);
              regime.push("abandoned");
            }
          }
        }
    }

    // return a dictionary of the 3 arrays of 120 elements each:
    return {"reserve": levels, "colours": colours, "regime": regime};
}

function appendReserveLevel0() {
  var numberOfLines = Object.keys(mineData["data"]).length;

  for (var i = 0; i < numberOfLines; i++) {
      var currentValues = mineData["data"]["value"+i];
      
      var reserves = currentValues["reserves"];
      var xmax = reserves[reserves.length-1]+5;
      reserves.push(xmax);
      
      var matrix = currentValues["matrix"];
      matrix.push(matrix[matrix.length-1]);
  }
  
  mineData["xmax"] = xmax;
}

/**
  Round the an input value to the nearest n.
  @param {number} number - Number to round.
  @param {integer} n - Round number to the nearest n.
  @return {number} The input number rounded to the nearest n.

  Function that rounds the number to the nearest n (Rounding up).
  Data for this function typically comes from getRoundInd.
  e.g. number=67.7, n=10 => returns 70.
*/
function roundToNearest(number, n) {
  if (number < 1) {
    return 1;
  }
  return Math.ceil(number/n) * n;
}

//(Unused) function that is called by a zoom event and handles the zooming functionality.
function zoomed() {
    visualiser.select("#line" + 0).attr("d", lineData[0].d3Line(lineData[0].data))
    visualiser.select(".x.axis").call(xAxis);
    visualiser.select(".y.axis").call(yAxisLeft);
}

var sb_xAxisLabel = function(mineData) {
  return mineData["xlabel"];
}

var sb_yAxisLeftLabel = function(mineData) {
  return mineData["ylabel"];
}

var sb_title = function(mineData) {
  var newFrame = document.getElementById("frameNumber").value;
  var yearStr = " years)";
  if (newFrame < 3) yearStr = " year)";
  return mineData["title"] + " ("  + 
    formatFloat(newFrame * dt, 1) + yearStr;
}

/**
  Function to convert a dictionary containing 2 arrays into 
  an array of dictionaries used for plotting graph data.
  
  key1 and key2 correspond to the x and y key names in the original dictionary.
  newkey1 and newkey2 are the key names used to store data in the new dictionaries.

  Ex: ungraphable = {"xdata": [1, 2, 3, 4, 5], "ydata":[10, 20, 30, 40, 50]};
      convertToGraphable(ungraphable, "xdata", "ydata", "x", "y");
      graphable === [{"x": 1, "y": 10}, {"x": 2, "y": 20}, {"x": 3, "y": 30}, 
                     {"x": 4, "y": 40}, {"x": 5, "y": 50}];
*/
function convertToGraphable(ungraphable, key1 = "reserve", key2 = "prices", 
  newkey1 = "x", newkey2 = "y")
{
  var graphable = []

  for (var i = 0; i < ungraphable[key1].length; i++) {
    newdict = {}
    newdict[newkey1] = ungraphable[key1][i]
    newdict[newkey2] = ungraphable[key2][i]
    graphable.push(newdict)
  }

  return graphable
}

/**
  Variable storing a function that returns an array with the graphable data 
  for all of the lines. This can be used to update the line data 
  which will be required when users change the frame number, or 
  when animation is occurring.

  frame corresponds to a time value between 0 and 119;
  lineList is an array with 4 items:
    lineList[i] corresponds to 30 points of valuei of mineData at time=frame# 
      for all reserve levels, where i = 0 to 3;
*/
var getLineList = function (frame) {
    var lineList = [];

    for (var i = 0; i < lineData.length; i++) {
      lineList.push(
        convertToGraphable(
          {"reserve": lineData[i][frame]["reserve"], 
           "prices": lineData[i][frame]["prices"]}
        )
      )
    }

    return lineList;
}

var getLineList2 = function (lineList) {
    var newLineList = [];

    for (var i = 0; i < lineList.length; i++) {
      var array1 = lineList[i];
      
      var array2 = [];
      for (var j = 0; j < array1.length-1; j++) {
        array2.push(array1[j]);
        if (array1[j+1].y == 0) {
          break;
        }
      }
      
      if ((j == array1.length-1) && (array1[j].y != 0)) {
        array2.push(array1[j]);
      }
      
      newLineList.push(array2);
    }

    return newLineList;
}

var getLineList3 = function (lineList) {
    var newLineList = [];

    for (var i = 0; i < lineList.length; i++) {
      var array1 = lineList[i];
      
      var array2 = [];
      var addpoint = false;
      for (var j = 0; j < array1.length-1; j++) {
        array2.push(array1[j]);
        if ((array1[j+1].y == 0) && (!addpoint)) {
          array2.push({x: array1[j].x, y: 0});
          addpoint = true;
        }
      }
      array2.push(array1[j]);
      
      newLineList.push(array2);
    }

    return newLineList;
}

var formatFloat = function(float, precision) {
  return float.toFixed(precision);
}

var sb_x_tooltipLabel = function(data) {
  return "Reserves: " + (maxReserve - data.x);
}

var sb_y_tooltipLabel = function(data) {
  return "$ " + formatFloat(data.y, 2);
}

//Inflation at time t:
var inf_t = function (x, t) {
  return x*Math.exp(inf_rate * t);
};

/**
  Function that calculates the profits from the unoptimal strategy 
  of a mine that is always being open, until it is depleted. 
  This will return either a formatted float (for legend)
  or an unformatted float (for other function calculations).

  Parameters:
    - mineData: The data for the mine.
    - data: The point corresponding to the current timestep. 
      Will be of form {"x": currentTimeStep, "y": price[currentTimeStep]}
    - format: Boolean (true/false) corresponding to whether or not 
      the returned float should be rounded to 2 d.p. Default === false.
    - reductionRate: The rate at which the mine depletes its reserves 
      per decision time. Default === 5.
*/
function calculateFullOpenProfit(mineData, data, format = false) {
    var maxNumYears = (maxReserve + reductionRate) / depletionRate;
    var maxNumReductions = (maxNumYears * numDecisions) - 1;  // for mine always open
    var numReductions = Math.min(data.x, maxNumReductions);

    // profit at time 0:
    var profitPerExtractionBeforeTax = 
      reductionRate * (mineData["path"][0] - extract_rate);
    var profit = taxRate * profitPerExtractionBeforeTax;  // profit after tax

    // for profit at other times:
    for (var i = 1; i <= numReductions; i++) {
        var discount = Math.exp(-discount_rate*i*dt);
        
        profit += discount * taxRate * reductionRate * 
          (mineData["path"][i] - inf_t(extract_rate, dt * i));
    }

    return format === false ? profit : formatFloat(profit, 2);
}

/**
  Function that calculates the profits from the optimal strategy of a mine 
  using switching boundaries decisions. 
  This will return either a formatted float (for legend) or 
  an unformatted float (for other function calculations).
  
  Parameters:
    - mineData: The data for the mine.
    - data: The point corresponding to the current timestep. 
      Will be of form {"x": currentTimeStep, "y": price[currentTimeStep]}
    - format: Boolean (true/false) corresponding to whether or not 
      the returned float should be rounded to 2 d.p. Default === false.
    - reductionRate: The rate at which the mine depletes its reserves 
      per decision time. Default === 5.
*/
function calculateOptimalStrategyProfit(mineData, data, format = false) {

    var profit = taxRate * reductionRate * (mineData["path"][0] - extract_rate);

    if (data.x === 0) { //First time step
        return format === false ? profit : formatFloat(profit, 2);
    }

    for (var i = 1; i <= data.x; i++) {

        var discount = Math.exp(-discount_rate*i*dt);
        
        //Mine was previously open.
        if (reserveLevels["regime"][i-1] === "open") {

            //Mine is currently open.
            if (reserveLevels["regime"][i] === "open") {
                profit += discount * taxRate * reductionRate * 
                  (mineData["path"][i] - inf_t(extract_rate, dt * i));
            }

            //Mine is currently closed.
            else if (reserveLevels["regime"][i] === "closed") {
                profit += discount * (-inf_t(switch_cost, dt * i) 
                                      -inf_t(maint_cost, dt * i) * dt);
            }

            //If going open to abandoned we do nothing to the profit.
            else if (reserveLevels["regime"][i] === "abandoned" || 
                     reserveLevels["regime"][i] === "depleted") {
                return format === false ? profit : formatFloat(profit, 2);
            }
        }

        //Mine was previously closed.
        else if (reserveLevels["regime"][i-1] === "closed") {

            //Mine is currently open.
            if (reserveLevels["regime"][i] === "open") {
                profit += discount * (taxRate * reductionRate * 
                  (mineData["path"][i] - inf_t(extract_rate, dt * i))
                                       - inf_t(switch_cost, dt * i));
            }

            //Mine is currently closed.
            else if (reserveLevels["regime"][i] === "closed") {
                profit += - discount * inf_t(maint_cost, dt * i) * dt;
            }

            //If going closed to abandoned we do nothing to the profit
            else if (reserveLevels["regime"][i] === "abandoned" || 
                     reserveLevels["regime"][i] === "depleted") {
                return format === false ? profit : formatFloat(profit, 2);
            }
        }
    }

    return format === false ? profit : formatFloat(profit, 2);
}

/**
  Function calculates the current savings from the optimal and full regimes. 
  The saving is for the current timestep only, and is used
  to calculate accumulated value in the calculateAccumValue() function.
*/
function calculateSaving (mineData, data, format = false) {
    var value = calculateOptimalStrategyProfit(mineData, data, false) - 
                calculateFullOpenProfit(mineData, data, false);

    return format === false ? value : formatFloat(value, 2);
}

/**
  Function that extracts all elements {"x": xVal, "y": yVal} 
  from the front of pathData where the y component is 0.
*/
function extractZeroValues(pathData) {
    extractedData = [];

    for (var i = pathData.length - 1; i >= 0; i--) {
        var ydata = pathData[i].y;  // undefined => return empty array
        
        if (pathData[i].y === 0) {
            extractedData.push(pathData[i]);
        }
        else {
            return extractedData;
        }
    }

    return extractedData;
}

/**
  A function that returns the d3 description of areas based on 
  the current formulae for the lines and an array of line indices.
*/
function makeZoneData (lines, paths) {
    var returnData = [];

    var pathTop = lines[paths[0]];

    var pathBelow1 = lines[paths[1]];
    var pathBelow2 = lines[paths[2]];

    for (var i = 0; i < pathTop.length; i++) {
        // each time, store the top point + 1 higher below point:
        returnData.push(
          [pathTop[i], 
           pathBelow1[i].y > pathBelow2[i].y ? 
             pathBelow1[i] : pathBelow2[i]]);
    }

    // return an array of 30 arrays, each having the top and bottom points:
    return returnData;
}

function capitalizeFirstLetter(str) {
  return str[0].toUpperCase() + str.substring(1);
}

/**
  Function called when the user updates the frame number,
  which corresponds to a decision time (between 0 and 119). 
  This will update the RHS plot with the appropriate line data.
*/
function frameChangeUpdate(userChanging = true){

    //Select the RHS graph and declare a transition.
    var svg = d3.select("#visualisation").transition();

    var newFrame = document.getElementById("frameNumber").value;

    if (newFrame >= lineData[0].length) {
      newFrame = lineData[0].length - 1;
      document.getElementById("frameNumber").value = newFrame;

      if (userChanging) {
        alert("You have reached the maximum frame number");
      }
    }
    
    var timeForAnimation = 0; //Time in milliseconds.

    checkVisYScale(newFrame);
    
    var newLines = getLineList(newFrame);
    var newLines2 = getLineList2(newLines);
    var newLines3 = getLineList3(newLines);

    //Select the areas using the names given and update.
    
    svg.select("#vis_title").text(sb_title(mineData));
    
    // fill the "open" color above the closed to open line:
    svg.select("#areaOpen")
       .duration(0)
       .attr("d", areaAbove(newLines2[2]));

    // fill the "infeasible" color above the y=0 line:
    var infeasibleData = extractZeroValues(newLines3[2]);

    svg.select("#areaInfeasible")
       .duration(0)
       .attr("d", areaAbove(infeasibleData));

    // fill the "abandoned" color below the closed to abandoned line:
    svg.select("#areaAbandoned")
        .duration(0)
        .attr("d", areaBelow(newLines2[1]));

    // fill the 4 colors for hysteresis, afo, afc, closed regions in RHS graph:
    for (var i = 0; i < newLines2.length; i++) {
        svg.select("#area"+i)
            .duration(timeForAnimation)
            .attr("d", area(makeZoneData(newLines2, regionBounds[i])));
    }

    // draw the 4 lines: o>c, c>a, c>o, o>a:
    for (var i = 0; i < newLines2.length; i++) {
      svg.select("#line"+i)
          .duration(timeForAnimation)
          .attr("d", lineFunc(newLines2[i]));
    }

    // graph = LHS graph object:
    
    //graph.points = interpolatePrices(graph.points, graph.options.xmax);

    // update values from the random path at the given frame in Values legends:
    if (graph.points.length < graph.options.xmax) {
        svg.select("#currentPriceText").text("Current Price: $" + Math.NaN);

        svg.select("#fullValueText").text("Full Open Strategy: $" + Math.NaN);

        svg.select("#optimalValueText").text("Optimal Strategy: $" + Math.NaN);

        svg.select("#savedValueText").text("Optimal - Full: $" + Math.NaN);
    }
    else {
        svg.select("#currentPriceText").text("Current Price: $" + 
          formatFloat(mineData["path"][newFrame], 2));

        svg.select("#fullValueText").text("Full Open Strategy: $" + 
          calculateFullOpenProfit(mineData, 
            graph.points[newFrame], true));

        svg.select("#optimalValueText").text("Optimal Strategy: $" + 
          calculateOptimalStrategyProfit(mineData, 
            graph.points[newFrame], true));

        svg.select("#savedValueText").text("Optimal - Full: $" + 
          calculateSaving(mineData, graph.points[newFrame], true));
    }
    
    // observedPriceDot = display Current Operating Regime:
    var observedPriceDotFlag = 
      document.getElementById('observedPriceDot').value === 'On';
      
    if (graph.points.length-1 < newFrame) observedPriceDotFlag = false;
      
    if (observedPriceDotFlag) {
      var observedPricePickerx = reserveLevels["reserve"][newFrame];
      var observedPricePickery = mineData["path"][newFrame];
    
      var yearStr = " years)";
      if (newFrame < 3) yearStr = " year)";
      document.getElementById("debug1").innerHTML = 'Decision Time = ' + 
        newFrame + ' (i.e. ' + formatFloat(newFrame * dt, 1) + yearStr;
      document.getElementById("debug2").innerHTML = 'Price = $ ' + 
        formatFloat(observedPricePickery, 2) + ' ($1m)';
      document.getElementById("debug3").innerHTML = 'Reserve = ' + 
        observedPricePickerx + ' (1,000 tons)';
      document.getElementById("debug4").innerHTML = 'Regime = ' + 
        capitalizeFirstLetter(reserveLevels["regime"][newFrame]) + ' Mine';
    
      var tduration;
      if (newFrame == 0) {
        tduration = 300;
      } else {
        tduration = 600;
      }
      
      // update the circle on RHS graph if enabled:
      visualiser.select("#observedPricePicker")
                .transition()
                .duration(tduration)
                .ease(d3.easeLinear)
                .attr("transform",
                      "translate(" + 
                        xRangeLabel(observedPricePickerx) + "," +
                        yRangeLeft(observedPricePickery) + ")")
                .style("fill", reserveLevels["colours"][newFrame])
                .style("opacity", 1);
                
      var d = graph.points[newFrame];
      graph.updateTooltips(d);
    }

    lines = newLines;
}

/*
  Define the behaviour of the tooltip as the mouse is moved over the RHS graph.
  This function will compute which values to display on legend based on 
  the x-position of the mouse pointer and use this to display 
  the 4 circle data points and tooltip line on the RHS graph.
*/
function mousemove() {
    var maxD = null;
    var currentMaximum = -1;

    for(var i = 0; i < lines.length; i++){
        var mousepointer = d3.mouse(this);
        
        // get x-location of mouse pointer:
        var x0 = xRange.invert(mousepointer[0]);
        
        // get array element corresponding to location
        var j = bisectValues(lines[i], x0);

        j = j >= lines[0].length ? lines[0].length - 1 : j;
        j = j <= 0 ? 1 : j;
        
        var d0 = lines[i][j - 1];
        var d1 = lines[i][j];
        
        // select the array element closest to the mouse pointer for tooltip:
        var d = x0 - d0.x > d1.x - x0 ? d1 : d0;

        if (d.y > currentMaximum) {
            currentMaximum = d.y;
            maxD = d;
        }

        // set coordinates of tooltip circle on RHS graph:
        focus.select("#tooltip_circle" + i)
            .attr("transform",
                  "translate(" + xRange(d.x) + "," +
                                 yRangeLeft(d.y) + ")");

        // update the legend below "Switching Boundaries":
        legend.select("#legend_sb_critical"+i)
             .text(lineNames[i] + " " + sb_y_tooltipLabel(d));
    }
    
    // plot vertical dotted line at tooltip from the toppest circle to 
    // bottom x-axis in RHS graph:
    focus.select("#x_tooltip_line")
         .attr("transform",
               "translate(" + xRange(maxD.x) + "," +
                              yRangeLeft(maxD.y) + ")")
         .attr("y2", height - yRangeLeft(maxD.y));
}

function vis_showBorders() {
  var strokeWidth = 1;
  
  // outer switching boundary border:
  var border1 = rhs_original.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", vis_spanx)
    .attr("height", vis_spany)
    .style("stroke", 'green')
    .style("fill", "none")
    .style("stroke-width", strokeWidth);
  
  // inner switching boundary border:
  var border2 = visualiser.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .style("stroke", 'red')
    .style("fill", "none")
    .style("stroke-width", strokeWidth);
    
  var border3 = legend.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", legendAspectRatioWidth)
    .attr("height", legendAspectRatioHeight)
    .style("stroke", 'red')
    .style("fill", "none")
    .style("stroke-width", strokeWidth);

  graph.showBorders();
}

/*
  Define cleanup behaviour on mouseout. 
  Currently hides the tooltip features and 
  cleans up the switching boundary values in legend to avoid confusion.
*/
function mouseout() {
    focus.style("display", "none");   // hide tooltips

    for (var i = 0; i < lines.length; i++) {
        legend.select("#legend_sb_critical"+i)
             .text(lineNames[i] + " ");
    }
}

function findMaxTime(regime) {
  var maxtime = 119;
  for (var i=0; i<regime.length; i++) {
    if ((regime[i] === "abandoned") || (regime[i] === "depleted")) {
      maxtime = i;
      break;
    }
  }
  return maxtime;
}

/*
  Function that automatically plays the animation of the 
  switching boundaries from frame 0 to end of frame.
*/
function animateFunc() {
    var animateVar = document.getElementById("playAnimation").value;

    if (animateVar === "Play") {
        document.getElementById("playAnimation").value = "Pause";

        if (initPlay) {
          // start animation from frame 0
          document.getElementById("frameNumber").value = 0;
          initPlay = false;
        }
        
        // increment frame number every 0.1 sec.
        var intervalHolder = setInterval(move, animateSpeed);

        function move() {
            var frame = document.getElementById("frameNumber");
            
            var playAnimation = document.getElementById("playAnimation").value;
            var maxtimes = findMaxTime(reserveLevels["regime"]);

            if (playAnimation === "Pause" && frame.value <= maxtimes) {
                frame.dispatchEvent(new Event('change'));
                frame.value++;
            }
            else {
                clearInterval(intervalHolder);
                document.getElementById("playAnimation").value = "Play";
                
                if (frame.value > maxtimes)
                {
                  // reset frame number to 0, so that 
                  // it is easier to restart animation again:
                  document.getElementById("frameNumber").value = 0;
                }
            }
        }
    }
    else {
        document.getElementById("playAnimation").value = "Play";
    }
}

/*
  A function that takes path y-data (prices) and returns the array of dictionaries required for graphing.
  
  Ex: input = [10, 20, 30, 40, 50];
      generatePoints(input) === [
        {"x": 0, "y": 10}, 
        {"x": 1, "y": 20}, 
        {"x": 2, "y": 30}, 
        {"x": 3, "y": 40}, 
        {"x": 4, "y": 50}}]
*/
function generatePoints(path) {
    points = [];

    for (var i = 0; i < path.length; i++) {
        points.push({"x": i, 
                     "x2": i/2,
                     "y": path[i]});
    }

    return points;
}

// Function that recalculates the path for the user.
function recalculatePath() {
    pathData = getNewPath();
    pathData = JSON.parse(pathData);

    path = pathData["path"];

    mineData["path"] = path;
    prices = path;

    reserveLevels = getReserveLevel(mineData, prices, 5);

    var frame = document.getElementById("frameNumber");
    frame.dispatchEvent(new Event('change'));  // update RHS plot
    
    graph.points = generatePoints(path);
    graph.updateYScale();       // update LHS graph
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

/*
  Update the path in the global state, and set new colours.
  first = true when the LHS priceline graph is being constructed, 
        = false otherwise.
*/
function pathUpdate(newPath, first) {
  reserveLevels = getReserveLevel(mineData, newPath, 5);
  
  mineData["path"] = newPath;
  
  // not call frameChangeUpdate() when the 
  // priceline graph is being constructed:
  if (!first) {
      frameChangeUpdate(false);
  }
}

// Handle the switching of the dynamic update button.
function updateDynamicUpdate() {
    var dynamicUpdate = document.getElementById('dynamicUpdate').value;
    var viewTooltip = document.getElementById('viewTooltip').value;

    if (dynamicUpdate === "Off" && viewTooltip === "On") {
        document.getElementById("dynamicUpdate").value = "On";
    }
    else if (dynamicUpdate === "Off" && viewTooltip === "Off") {
        updateViewTooltip();
        document.getElementById("dynamicUpdate").value = "On";
        //alert("You must have the tooltip enabled to use this feature");
    }
    else {
        document.getElementById("dynamicUpdate").value="Off";
    }
}

// Turn on price tooltip and dynamic update.
function turnOnTooltipDynamicUpdate() {
    document.getElementById("dynamicUpdate").value = "On";
    
    if (document.getElementById('viewTooltip').value === "Off") {
        updateViewTooltip();
    }
}

/*
  Function that updates the view of the operating regime dot 
  when the On/Off view is selected.
*/
function updatePriceDot() {
    var priceDot = document.getElementById('observedPriceDot').value;
    var maxtimes = mineData["data"]["value0"]["times"].length;

    if (priceDot === "Off" && graph.points.length >= maxtimes) {
        document.getElementById("observedPriceDot").value = "On";
        var frameNum = document.getElementById('frameNumber').value;
        
        visualiser.select("#observedPricePicker")
            .style("fill", reserveLevels["colours"][frameNum])
            .style("opacity", 1);
            
        turnOnTooltipDynamicUpdate();
    }
    else if (priceDot === "Off" && graph.points.length < maxtimes) {
        alert("You must have all " + maxtimes + 
          " points set before using this feature.");
    }
    else {
        document.getElementById("observedPriceDot").value="Off";
        
        visualiser.select("#observedPricePicker")
            .style("fill", null)
            .style("opacity", 0);
    }
}

var pl_title = function() {
  return "Price Simulation";
}

var pl_xAxisLabel = function(mineData) {
  return mineData["zlabel"];
}

var pl_yAxisLeftLabel = function(mineData) {
  return mineData["ylabel"];
}

/**
  Convert an array of dictionaries that is plottable into a dictionary of arrays.
  @param {Object[]} graphable - The array of plottable dictionary values.
  @param {string} [key1 = "x"] - The first key of the Objects in the array.
  @param {string} [key2 = "y"] - The second key of the Objects in the array.
  @param {string} [newkey1 = "x"] - The key under which the array of key1 values of graphable will be stored in ungraphable.
  @param {string} [newkey2 = "y"] - The key under which the array of key2 values of graphable will be stored in ungraphable.
  @returns {Object} The dictionary of key1 and key2 values stored under newkey1 and newkey2
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

var decisionLabel = function (reserves, i) {
  return capitalizeFirstLetter(reserves["regime"][i]);
}

var pl_x_tooltipLabel = function(d) { 
  return "Year: " + formatFloat(d.x * dt, 1) + 
    " (" + decisionLabel(reserveLevels, d.x) +")";
}

var pl_y_tooltipLabel = function(d) {
  return "$ " + formatFloat(d.y, 2);
}

// Function that turns on/off the tooltip feature of the price path graph
function updateViewTooltip() {
  var viewTooltip = document.getElementById('viewTooltip').value;

  if (viewTooltip === "Off" && 
    graph.points.length === mineData["data"]["value0"]["times"].length) {
    document.getElementById('viewTooltip').value = "On";
  }
  else if (graph.points.length !== mineData["data"]["value0"]["times"].length) {
    alert("You need all " + mineData["data"]["value0"]["times"].length + 
      " points to use the feature.");
  }
  else {
    document.getElementById('viewTooltip').value = "Off";
    document.getElementById('dynamicUpdate').value = "Off";
  }
}

// Enable path editing through user input.
function updateEditPrices() {
  var editPrices = document.getElementById("editPrices").value;

  var circles = graph.vis.select("svg")
                         .selectAll("circle")
                         .data(graph.points);

  if (editPrices === "Off") {
    document.getElementById("editPrices").value = "On";
    
    circles.style("opacity", 1);
    circles.on("mousedown.drag",  graph.datapoint_drag());
    circles.on("touchstart.drag", graph.datapoint_drag());
  }
  else {
    document.getElementById("editPrices").value = "Off";
    
    circles.style("opacity", 0);
    circles.on("mousedown.drag",  null);
    circles.on("touchstart.drag", null);
  }
}

function turnOnPriceEditing() {
  document.getElementById("editPrices").value = "On";
  
  var circles = graph.vis.select("svg")
                         .selectAll("circle")
                         .data(graph.points);

  circles.style("opacity", 1);
  circles.on("mousedown.drag",  graph.datapoint_drag());
  circles.on("touchstart.drag", graph.datapoint_drag());
}

/**
  Check whether price array has enough data to establish the reserve levels.
  
  If not, linear interpolation is used to estimate values for all x.
  
  Any boundary values left off the prices (0 or requiredLength - 1)
  are assumed to be horizontal from the closest point.
*/
function interpolatePrices(prices, requiredLength) {
  if (prices.length >= requiredLength) {
    return prices;
  }
  else if (prices.length === 0) {
    var newPrices = [];
    
    for (var i = 0; i < requiredLength; i++) {
      newPrices.push({"x": i, 
                      "x": i/2,
                      "y": 0});
    }
    
    return newPrices;
  }
  else {
    var newPrices = [];
    var currentTime = 1;

    if (prices[0]["x"] !== 0) {
      newPrices.push({"x": 0, "x2": 0, "y": prices[0]["y"]});

      for (var i = 0; i < prices.length; i++) {
        var nextTime = prices[i]["x"];

        if (nextTime === currentTime) {
          newPrices.push(prices[i]);
          currentTime += 1;
          continue;
        }
        else {
          var timeDifference = nextTime - currentTime;

          var rise = prices[i]["y"] - (i === 0 ? newPrices[0]["y"] : prices[i-1]["y"]);

          var interval = rise/(timeDifference + 1);

          var step = 1;

          for (var j = currentTime; j < nextTime; j++) {
            newPrices.push({"x": j, 
                            "x2": j/2,
                            "y": newPrices[currentTime-1]["y"] + interval*step});

            step += 1;
          }

          newPrices.push(prices[i]);

          currentTime = nextTime + 1;
        }
      }
    }
    else {
      newPrices.push(prices[0]);

      for (var i = currentTime; i < prices.length; i++) {
        var nextTime = prices[i]["x"];

        if (nextTime === currentTime) {
          newPrices.push(prices[i]);
          currentTime += 1;
          continue;
        }
        else {
          var timeDifference = nextTime - currentTime;

          var rise = prices[i]["y"] - prices[i-1]["y"];

          var interval = rise/(timeDifference + 1);

          var step = 1;

          for (var j = currentTime; j < nextTime; j++) {
            newPrices.push({"x": j, 
                            "x2": j/2,
                            "y": newPrices[currentTime-1]["y"] + interval*step});

            step += 1;
          }

          newPrices.push(prices[i]);

          currentTime = nextTime + 1;
        }
      }
    }

    var lpoint = currentTime;

    while (currentTime < requiredLength) {
      newPrices.push({"x": currentTime, 
                      "x2": currentTime/2, 
                      "y": newPrices[lpoint - 1]["y"]});
      currentTime += 1;
    }

    newPrices.sort(function(a, b) {
      if (a.x2 < b.x2) { return -1 };
      if (a.x2 > b.x2) { return  1 };
      return 0
    });

    return newPrices;
  }

  return prices;
}

// Function that updates whether or not the user would like 
// linear interpolation on.
function autoInterpolatePath() {
  var autoFillPath = document.getElementById("autoFillPath").value;

  if (autoFillPath === "Off") {
    document.getElementById("autoFillPath").value = "On";
    
    graph.points = interpolatePrices(graph.points, graph.options.xmax);
    
    pathUpdate(convertToUngraphable(graph.points)["y"], false);
    
    graph.update(false);
    
    turnOnPriceEditing();
  }
  else {
    document.getElementById("autoFillPath").value = "Off";
  }
}

// Clear current path.
function clearPath() {
  graph.points = [];
  prices = [];
  mineData["path"] = [];

  document.getElementById('viewTooltip').value = "Off";
  document.getElementById('observedPriceDot').value = "Off";
  document.getElementById('dynamicUpdate').value = "Off";

  visualiser.select("#observedPricePicker")
            .style("fill", null)
            .style("opacity", 0);

  graph.update(false);
}

/**
  Get the maximum of an input array of dictionaries, over the specified key.

  Ex: input = [{"x": 1, "y": 10}, 
               {"x": 2, "y": 20}, 
               {"x": 3, "y": 30}, 
               {"x": 4, "y": 40}, 
               {"x": 5, "y": 50}];
               
      getMaximum(input, "x") === 5
      getMaximum(input, "y") === 50
*/
function getMaximum(input, key) {
  var maxi = 0;

  for (var i = 0; i < input.length; i++) {
    if (input[i][key] > maxi) {
      maxi = input[i][key];
    }
  }

  return maxi;
}

/*
  Take an input array and key and 
  use the maximum value to calculate the order of the scales.
  
  Ex: input = [{"x": 1, "y": 10}, 
               {"x": 2, "y": 20}, 
               {"x": 3, "y": 30}, 
               {"x": 4, "y": 40}, 
               {"x": 5, "y": 50}];
               
      getRoundInd(input, "x") === 10  // x axis should be scaled to the nearest 10.
      getRoundInd(input, "y") === 100 // y axis should be scaled to the nearest 100.
*/
function getRoundInd(input, key) {
  dataMax = getMaximum(input, key);
  divider = 1;

  if (isNaN(dataMax)) {
    return divider;
  }

  while ((parseInt(dataMax / divider)) >= 1) {
    divider *= 10;

    if (parseInt(dataMax / divider) === 0) {
      break;
    }
  }

  return divider;
}

var findMaxY = function (maxtimes) {
  var maxy = 0;;
  for (var i = 0; i < maxtimes; i++) {
    if (mineData["path"][i] > maxy) {
      maxy = mineData["path"][i];
    }
  }
  return maxy;
}

var checkVisYScale = function (newFrame) {
  var newVisYmax;
  if (newFrame > 60) {
    newVisYmax = visYmax1;
  } else {
    var maxtimes = findMaxTime(reserveLevels["regime"]);
    var maxY = findMaxY(maxtimes+1);
    if (maxY > visYmax2) {
      newVisYmax = visYmax2;
      //newVisYmax = roundToNearest(maxY, mineData["roundfactor"]);
    } else {
      newVisYmax = visYmax2;
    }
  }
  if (newVisYmax != prevVisYmax)
  {
    updateVisYScale(newVisYmax);
    prevVisYmax = newVisYmax;
  }
}

var updateVisYScale = function (newVisYmax) {
  yRangeLeft.domain([mineData["ymin"], newVisYmax]);
  
  yAxisLeft = d3.axisLeft(yRangeLeft)
                .tickSize(5);

  d3.select("#visualiser_yaxisLeft").call(yAxisLeft);
  
  lineFunc.y(function (d) {
            return yRangeLeft(d.y);
          });

  areaBelow.y1(function(d) {
             return yRangeLeft(d.y);
           });

  area.y0(function(d) { 
        return yRangeLeft(d[0].y);
      })
      .y1(function(d) { 
        return yRangeLeft(d[1].y);
      });

  areaAbove.y1(function(d) { 
             return yRangeLeft(d.y);
           });

  d3.select("#observedPricePicker")
    .attr("transform",
          "translate(" + xRangeLabel(reserveLevels["reserve"][0]) + "," +
                         yRangeLeft(mineData["path"][0]) + ")");
}

var toPercent = function (percent) {
  var p = percent * 100;
  return p.toString().concat("%");
}

var getCSSHeight = function (tag) {
  var element = document.getElementById(tag);
  var style = window.getComputedStyle(element);
  var height = style.getPropertyValue('height');
  var n = height.indexOf("px");
  var height2 = height.substring(0,n);
  var n2 = Number(height2);
  return n2;
}

var convertPxToNum = function (num) {
  var n = num.indexOf("px");
  var num2 = num.substring(0,n);
  var n2 = Number(num2);
  return n2;
}

var getCSSWidth = function (tag) {
  var element = document.getElementById(tag);
  var width = element.offsetWidth;
  return width;
}

var getCSSHeight = function (tag) {
  var element = document.getElementById(tag);
  var height = element.offsetHeight;
  return height;
}

var getCSSDimension = function (tag) {
  var element = document.getElementById(tag);
  var width = element.offsetWidth;
  var height = element.offsetHeight;
  var height2 = Math.floor(pricelineAspectRatioWidth * height / width);
  return width.toString() + ' * ' + height.toString() + 
    ' (' + height2.toString() + ')';
}

var getCSSDimension2 = function (tag) {
  var element = document.getElementById(tag);
  var width = element.offsetWidth;
  var height = element.offsetHeight;
  var height2 = Math.floor(1571 * height / width);
  return width.toString() + ' * ' + height.toString() + 
    ' (' + height2.toString() + ')';
}

var getTotalDimension = function () {
  var width = screen.width;
  var height = screen.height;
  return width.toString() + ' * ' + height.toString();
}

var getAvailDimension = function () {
  var width = screen.availWidth;
  var height = screen.availHeight;
  return width.toString() + ' * ' + height.toString();
}

var getInnerWindowDim = function () {
  var width = window.innerWidth;
  var height = window.innerHeight;
  return width.toString() + ' * ' + height.toString();
}

var getOuterWindowDim = function () {
  var width = window.outerWidth;
  var height = window.outerHeight;
  return width.toString() + ' * ' + height.toString();
}

var getScreenLeftTop = function (tag2, tag) {
  var element = document.getElementById(tag);
  var left = element.offsetLeft;
  var top = element.offsetTop;

  element = document.getElementById(tag2);
  var height2 = element.offsetHeight;
  var totalHeight = top + height2;
  
  return left.toString() + ' * ' + top.toString() + 
    '; h=' + totalHeight.toString();
}

var dspDebugMsg = function (num, msg) {
  var field = "debug" + num.toString();
  document.getElementById(field).innerHTML = msg;
}

var dspDebugMsg2 = function (num, num2) {
  var field = "debug" + num.toString();
  document.getElementById(field).innerHTML = num2.toString();
}

var appendDebugMsg = function (num, msg2) {
  var field = "debug" + num.toString();
  var msg = document.getElementById(field).innerHTML;
  document.getElementById(field).innerHTML = msg + '; ' + msg2;
}

var findPricelineHeight = function () {
  var graph1Width = getCSSWidth("pathSVG");
  var graph1Height = getCSSHeight("pathSVG");
  var aspectHeight = Math.floor(pricelineAspectRatioWidth * 
    graph1Height / graph1Width);
  
  var windowTop = window.innerHeight;

  var graph2Top = document.getElementById("visualisation").offsetTop;
  graph2Top += document.getElementById("td11").offsetHeight;
  
  var newGraph1Height = graph1Height + (windowTop - graph2Top) - 20;
  if (newGraph1Height < 0) return;
  
  var newAspectHeight = Math.floor(pricelineAspectRatioWidth * 
    newGraph1Height / graph1Width);
  pricelineAspectRatioHeight = newAspectHeight;
    
  var n = newAspectHeight/pricelineAspectRatioWidth*100;
  var newPaddingBottom = n.toFixed(2).concat("%");
  
  $('.svg-container').css('padding-bottom',newPaddingBottom);
  $('.svg-inwrap').css('padding-bottom',newPaddingBottom);
  //document.getElementById("pathSVG").style.height = newGraph1Height;
  //document.getElementById("pathSVG").style.paddingBottom = newPaddingBottom;
    
  //dspDebugMsg2(2, newPaddingBottom);
}

var setAspectRatios = function () {
  var h1str = getCSSDimension("td1");
  dspDebugMsg(1, h1str);

  h1str = getCSSDimension("pathSVG");
  appendDebugMsg(1, h1str);

  var h2str = getCSSDimension2("td11");
  //dspDebugMsg(2, h2str);

  h2str = getCSSDimension2("visualisation");
  //appendDebugMsg(2, h2str);
  
  var h3str;
  //h3str = getTotalDimension();
  //dspDebugMsg(3, h3str);

  //h3str = getAvailDimension();
  //appendDebugMsg(3, h3str);

  h3str = getInnerWindowDim();
  dspDebugMsg(3, h3str);

  var h4str = getScreenLeftTop("td11", "visualisation");
  dspDebugMsg(4, h4str);
}

function mineHelpFunc() {
    var h = window.outerHeight;
    var w = window.outerWidth;
    
    var height = h*7/9;
    var top = (h-height)/2;
    
    var width = w*7/9;
    var left = (w-width)/2;
    
    var specs = "toolbar=yes,scrollbars=yes,resizable=yes,top="+top+
                   ",left="+left+
                   ",width="+width+
                   ",height="+height;
    
    var url = "http://" + ip_addr + ":5001/mine_help";
    //window.open(url, "_blank", specs);
    window.open(url);
}
