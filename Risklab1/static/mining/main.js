/********************* BEGIN SWITCHING BOUNDARIES GRAPH IMPLEMENTATION *********************/

// colors for the price line in LHS graph:
var depletedColourRegime = 'rgb(' + 228 + ',' + 0 + ',' + 43 + ')'; //'lightskyblue';
var openColourRegime = 'rgb(' + 0 + ',' + 109 + ',' + 44 + ')'; //'green';
var closedColourRegime = 'rgb(' + 232 + ',' + 119 + ',' + 34 + ')'; //'darkgray';
var abandonedColourRegime = 'rgb(' + 223 + ',' + 25 + ',' + 149 + ')'; //'pink';

var colourOpenToClosed =      'rgb(' + 115 + ',' + 115 + ',' + 115 + ')';       // red
var colourClosedToAbandoned = 'rgb(' + 8 + ',' + 48 + ',' + 107 + ')';      // lime
var colourClosedToOpen =      'rgb(' + 0 + ',' + 115 + ',' + 119 + ')';      // teal
var colourOpenToAbandoned =   'rgb(' + 8 + ',' + 81 + ',' + 156 + ')';   // magenta

var lineColours = [colourOpenToClosed, 
                   colourClosedToAbandoned, 
                   colourClosedToOpen, 
                   colourOpenToAbandoned];

var lineNames = ["Open to Closed", 
                 "Closed to Abandoned", 
                 "Closed to Open", 
                 "Open to Abandoned"];

var openColour = 'rgb(' + 113 + ',' + 204 + ',' + 152 + ')';
var hysteresisColour = 'rgb(' + 151 + ',' + 197 + ',' + 170 + ')';
var abandonedFromOpenColour = 'rgb(' + 111 + ',' + 151 + ',' + 185 + ')';
var abandonedFromClosedColour = 'rgb(' + 73 + ',' + 159 + ',' + 166 + ')';
var closedColour = 'rgb(' + 189 + ',' + 189 + ',' + 189 + ')';  // orange
var abandonedColour = 'rgb(' + 33 + ',' + 113 + ',' + 181 + ')';

var depletedColour = 'rgb(' + 228 + ',' + 0 + ',' + 43 + ')';
var infeasibleColour = 'rgb(' + 222 + ',' + 235 + ',' + 247 + ')';

var areaColours = [openColour, 
                   hysteresisColour, 
                   abandonedFromOpenColour, 
                   abandonedFromClosedColour, 
                   closedColour, 
                   abandonedColour];

var areaNames = ["Open Regime", 
                 "Hysteresis", 
                 "Abandon from Open", 
                 "Abandon from Close", 
                 "Closed Regime", 
                 "Abandoned Regime"];

/********************* BEGIN STATIC GRAPH DATA *********************/

/*****
  This secion of code takes the mineData from the python script and uses the 'static' variables; xmin, xmax, ymin, ymax, roundfactor;
  to construct the base graph elements. These elements should not change in time, the only exception being a rescaling of the axis between
  say, years and months etc. The mineData is then accessible to the remainder of the graphing procedure, therefore only only call to the python
  function is needed (This may need to be changed to multiple calls as they are needed, however this requires further logic and is synchronous,
  implying timing issues).

  The format of the mineData object should be:
    mineData === {"data": {'Dictionary containing {value_x: matrix_x} key: value pairs for each line x'},
                  "xmax": xmax,
                  "xmin": xmin,
                  "ymax": ymax,
                  "ymin": ymin,
                  "roundfactor": roundfactor}
  EDIT
*****/

var mineData = getMineData();         // string

//JSON is a string that holds the mineData and
//JSON.parse converts the string into variables.
//"{'data': Array.String}" ---> {"data": Array}
mineData = JSON.parse(mineData);      // object

appendReserveLevel0(mineData);

var reserveLevels = getReserveLevel(mineData, mineData["path"], 5);

var maxReserve = Math.max.apply(Math, mineData["data"]["value0"]["reserves"]);

var margin = {top: 50, right: 30, bottom: 60, left: 70};

var pricelineAspectRatioWidth = 1500;
var pricelineAspectRatioHeight = 400;

var vis_spanx = 1100;
var vis_spany = 550;

width = vis_spanx - margin.left - margin.right;
height = vis_spany - margin.top - margin.bottom;

var svg_container2_width = 70;
var svg_container2_legend_width = 30;

var legendAspectRatioWidth = vis_spanx * 
  svg_container2_legend_width / svg_container2_width;  // 176 > 265
var legendAspectRatioHeight = vis_spany;

//Create the function that scales the x-axis.
//This is likely to remain unchanged for our reserve/prices time series.
var xRange = d3.scaleLinear()
               .domain([mineData["xmin"], mineData["xmax"]])
               .range([0, width]);

var xRangeLabel = d3.scaleLinear()
                    .domain([mineData["xmax"], mineData["xmin"]])
                    .range([0, width]);

var visYmax1 = roundToNearest(mineData["ymax"], mineData["roundfactor"]);
var visYmax2 = 10;

//Create the function that scales the y-axis. 
//This is likely to remain unchanged for our reserve/prices time series.
//D3 uses 0 as the TOP of the y axis.
var yRangeLeft = d3.scaleLinear()
                   .domain([mineData["ymin"], visYmax2])
                   .range([height, 0]);

var prevVisYmax = visYmax2;

//Create a variable to hold the x-axis information.
//This is important for rescaling data or completely changing the axis later.
//This axis is at the bottom of the graph. Possibility to have top axis too.
var xAxis = d3.axisBottom(xRangeLabel)
              .tickValues(getVisLabels(mineData["xmin"], mineData["xmax"]));

//Create a variable to hold the y-axis information.
//This is important for rescaling data or completely changing the axis later.
//This axis is the left hand side of the graph.
//Possibility to have a right hand side axis too.
var yAxisLeft = d3.axisLeft(yRangeLeft)
                  .tickSize(5);

//Create an element that holds the zoom functionality information (unused)
var zoomVariable = d3.zoom()
                     //.x(xRange)
                     //.y(yRangeLeft)
                     .scaleExtent([1, 10])
                     .on("zoom", zoomed);
                     
//Visualiser is our RHS SVG element where 
//all of the graph elements will be appended
var rhs_original = d3.select("#visualisation")
                   .append("div")
                   .classed("svg-container2", true) //The extra div and CSS class allows dynamic rescaling of the charts on window resize.
                   .append("svg")
                   .attr("id", "innerGraph")
                   .attr("preserveAspectRatio", "xMinYMin meet")
                   .attr("viewBox", "0 0 " + vis_spanx + " " + vis_spany); //Having the view box slightly larger than the chart size gives it a zoomed out and cleaner look.

var visualiser = rhs_original.classed("svg-content", true)
                   //.call(zoomVariable)
                   .append("g")
                   .attr("transform", "translate(" + 
                     margin.left + "," + margin.top + ")");
                     
//Append the x-axis element to the SVG.
//We give it an ID to make updating this easier in the future.
visualiser.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .attr("id", "visualiser_xaxis")
          .call(xAxis);

//Append the y-axis element to the SVG.
//We give it an ID to make updating this easier in the future.
visualiser.append("g")
          .attr("class", "y axis")
          .style("fill", "steelblue")
          .attr("id", "visualiser_yaxisLeft")
          .call(yAxisLeft);

// add y-axis label to the RHS graph:
visualiser.append("text")
          .attr("text-anchor", "middle")
          .attr("transform", 
            "translate(" + -(margin.left/2+5) + "," + (height/2) + 
              ")rotate(-90)") //centre y-axis label on left side of RHS graph
          .style("font-size", axis_font_size)
          .style("font-weight", "bold")
          .text(sb_yAxisLeftLabel(mineData));

// add x-axis label to the RHS graph:
visualiser.append("text")
          .attr("text-anchor", "middle")
          .attr("transform", 
            "translate(" + (width/2) + "," + (height + (margin.bottom - 5)) + ")")
               //centre x-axis label of RHS graph
          .style("font-size", axis_font_size)
          .style("font-weight", "bold")
          .text(sb_xAxisLabel(mineData));

// add title to the RHS graph:
visualiser.append("text")
          .attr("id", "vis_title")
          .attr("x", (width / 2))
          .attr("y", -20)
          .attr("text-anchor", "middle")
          .style("font-size", title_font_size)
          .style("text-decoration", "underline")
          .style("font-weight", "bold")
          .text(sb_title(mineData));

/********************* END STATIC GRAPH DATA *********************/

/********************* BEGIN DYNAMIC GRAPH DATA *********************/

/*****
  This section of code defines the dynamic graph data. 
  It uses user input to determine the correct frame, continuous vs static output etc. 
  The data is obtained from the value_x keys of mineData["data"]. 
  Conversion to plottable input is done via the convertToGraphable function. 
  The method programatically determines how many lines are needed, 
  so there is the functionality to change the number of lines 
  by giving appropriate data output functions in the python script.
*****/

//Compute the number of lines in the data and store them in the lineData variable.
//lineData[0] = "value0" of mineData: o>c
//lineData[1] = "value1" of mineData: c>a
//lineData[2] = "value2" of mineData: c>o
//lineData[3] = "value3" of mineData: o>a
//  each lineData has 120 times: 
//    each time has a reserve level and a boundary price level
var numberOfLines = Object.keys(mineData["data"]).length;

var lineData = [];
for (var i = 0; i < numberOfLines; i++) {
    var currentValues = mineData["data"]["value"+i];
    
    var line = []

    for (var j = 0; j < currentValues["times"].length; j++) {
        line.push({"time": currentValues["times"][j], 
          "reserve": currentValues["reserves"], 
          "prices": getCol(currentValues["matrix"], j)})
    }

    lineData.push(line);
}

document.getElementById("frameNumber").value = initFrameNum;

// get the frame number and plot the lines based on this.
var frame = document.getElementById("frameNumber").value;  // "0" initially

// containing 4 lines of 30 points each at time=frame#
var lines = getLineList(frame);
var lines2 = getLineList2(lines);
var lines3 = getLineList3(lines);

var interpolateRule = d3.curveLinear; //Basis, Cardinal or Linear. Basis gives a smoother curve but disorients the tooltips.

// lineFunc converts the raw line data into d3 plottable form. 
// data is scaled by the XRange and yRangeLeft functions from before.
var lineFunc = d3.line()
                 .x(function (d) {
                   return xRange(d.x);
                 })
                 .y(function (d) {
                   return yRangeLeft(d.y);
                 })
                 .curve(interpolateRule);

var areaBelow = d3.area()
                  .x(function(d) { 
                    return xRange(d.x);
                  })
                  .y0(height)
                  .y1(function(d) {
                    return yRangeLeft(d.y);
                  });

var area = d3.area()
             .x(function(d) { 
               return xRange(d[0].x);
             })
             .y0(function(d) { 
               return yRangeLeft(d[0].y);
             })
             .y1(function(d) { 
               return yRangeLeft(d[1].y);
             });

var areaAbove = d3.area()
                  .x(function(d) { 
                    return xRange(d.x);
                  })
                  .y0(0)
                  .y1(function(d) { 
                    return yRangeLeft(d.y);
                  });

//Create the legend using the line data and global variables

var box = d3.select('#visualisation');

var legend_original = 
  box.append("div")
     .classed("svg-container2-legend", true)
     .append("svg")
     .attr("preserveAspectRatio", "xMinYMin meet")
     .attr("viewBox", "0 0 " + legendAspectRatioWidth + " " + legendAspectRatioHeight);

var legend = legend_original.classed("svg-content", true)
                            .append("g");

//Legend Variables

var legendLineLength = 15 //Length of the axis lines representing graph lines.
var legendBoxSize = 5 //Side length of the box that represents the regions in the legend.

var legendSpacing = 25; //Spacing of elements. Y distance between labels.
var legendXSpacing = 5 //Spacing in x between text and box.

var legendUpperPadding = 80; //How many pixels to pad the top of the svg element (This extends above the graph).
var legendTextOffsetLine = 2 //How far the y offset of the text should be to match the line.
var legendTextOffsetBox = 4 //How far the y offset of the text should be to match the box.
var legendRegionOffset = 30; //How far the y offset between groups of legend text should be.

var sb_legendLineTitle = "Switching Boundaries"; //The title above the line legend data.
var sb_legendAreaTitle = "Decision Regions"; //The title above the area legend data.
var sb_legendValueTitle = "Values ($1m)"; //The title above the value legend data.

// ==============================================================================
// "Switching Boundaries" legend:
legend.append("text")
      .attr("x", 0)
      .attr("y", legendUpperPadding - (legendSpacing + legendTextOffsetLine))
      .attr("class", "legend-label")
      .style("font-family", "sans-serif")
      .style("color", "Black")
      .style("font-weight", "bold")
      .text(sb_legendLineTitle);

var legendLastY = 0;

for (var i = 0; i < lines.length; i++) {
  // plot the 4 legend rectangles below "Switching Boundaries":
  legend.append('rect')
       .attr('width', legendLineLength)
       .attr('height', legendBoxSize*2)
       .attr("x", 0)
       .attr("y", legendUpperPadding + (i * legendSpacing) - 8)
       .style('fill', lineColours[i])
       .style('stroke', lineColours[i]);

  // plot the legend text:
  legend.append("text")
        .attr("id", "legend_sb_critical"+i)
        .attr("x", legendLineLength + legendXSpacing)
        .attr("y", legendUpperPadding + (i * legendSpacing) + legendTextOffsetLine)
        .attr("class", "legend-name")
        .style("font-family", "sans-serif")
        .style("color", "Black")
        .text(lineNames[i]);

  legendLastY = (i * legendSpacing) + legendRegionOffset;
}

// =============================================================================
// "Boundaries" legend:
legend.append("text")
     .attr("x", 0)
     .attr("y", legendUpperPadding + legendLastY + legendSpacing)
     .attr("class", "legend-label")
     .style("font-family", "sans-serif")
     .style("color", "Black")
     .style("font-weight", "bold")
     .text(sb_legendAreaTitle);

for (var i = 0; i < areaNames.length; i++) {
  // plot the 6 boundary rectangles below "Boundaries":
  legend.append('rect')
        .attr('width', legendBoxSize*3)
        .attr('height', legendBoxSize*2)
        .attr("x", 0)
        .attr("y", legendUpperPadding + legendLastY + ((i + 2) * legendSpacing) - 8)
        .style('fill', areaColours[i])
        .style('stroke', areaColours[i]);

  // plot the boundary text:
  legend.append("text")
        .attr("x", legendBoxSize + legendXSpacing*4)
        .attr("y", legendUpperPadding + legendLastY + ((i + 2) * legendSpacing) + legendTextOffsetBox)
        .attr("class", "legend-name")
        .style("font-family", "sans-serif")
        .style("color", "Black")
        .text(areaNames[i]);

  if (i === areaNames.length - 1) {
      legendLastY += (i + 2) * legendSpacing + legendRegionOffset;
  }
}

var currentFrame = document.getElementById("frameNumber").value;

// =============================================================================
// "Values" legend:
legend.append("text")
      .attr("x", 0)
      .attr("y", legendUpperPadding + legendLastY + legendSpacing)
      .attr("class", "legend-label")
      .style("font-family", "sans-serif")
      .style("color", "Black")
      .style("font-weight", "bold")
      .text(sb_legendValueTitle);

// "Current Price" legend:
legend.append("text")
     .attr("id", "currentPriceText")
     .attr("x", 0)
     .attr("y", legendUpperPadding + legendLastY + 
       (2 * legendSpacing) + legendRegionOffset/2)
     .attr("class", "legend-name")
     .style("font-family", "sans-serif")
     .style("color", "Black")
     .style("font-weight", "bold")
     .text("Current Price: $" + formatFloat(mineData["path"][currentFrame], 2));

// "Full Open Strategy" legend:
var fullOpenStrategy = calculateFullOpenProfit(mineData, 
      {"x": currentFrame, "y": mineData["path"][currentFrame]}, true);

legend.append("text")
      .attr("id", "fullValueText")
      .attr("x", 0)
      .attr("y", legendUpperPadding + legendLastY + 
        (3 * legendSpacing) + legendRegionOffset/2)
      .attr("class", "legend-name")
      .style("font-family", "sans-serif")
      .style("color", "Black")
      .style("font-weight", "bold")
      .text("Full Open Strategy: $" + fullOpenStrategy);

// "Optimal Strategy" legend:

var optimalStrategy = calculateOptimalStrategyProfit(mineData, 
      {"x": currentFrame, "y": mineData["path"][currentFrame]}, true);

legend.append("text")
     .attr("id", "optimalValueText")
     .attr("x", 0)
     .attr("y", legendUpperPadding + legendLastY + 
       (4 * legendSpacing) + legendRegionOffset/2)
     .attr("class", "legend-name")
     .style("font-family", "sans-serif")
     .style("color", "Black")
     .style("font-weight", "bold")
     .text("Optimal Strategy: $" + optimalStrategy);

// "Optimal - Full" legend:

var valueSaved = calculateSaving(mineData, 
  {"x": currentFrame, "y": mineData["path"][currentFrame]}, true);

legend.append("text")
     .attr("id", "savedValueText")
     .attr("x", 0)
     .attr("y", legendUpperPadding + legendLastY + (
       5 * legendSpacing) + legendRegionOffset/2)
     .attr("class", "legend-name")
     .style("font-family", "sans-serif")
     .style("color", "Black")
     .style("font-weight", "bold")
     .text("Optimal - Full: $" + valueSaved);

//End of legend

// fill the "open" color above the closed to open line:
visualiser.append("svg:path")
          .datum(lines2[2])
          .attr("class", "area")
          .attr("id", "areaOpen")
          .style("fill", openColour)
          .attr("d", areaAbove);
          
// fill the "infeasible" color above the y=0 line:
var infeasibleData = extractZeroValues(lines3[2]);

visualiser.append("svg:path")
          .datum(infeasibleData)
          .attr("class", "area")
          .attr("id", "areaInfeasible")
          .style("fill", infeasibleColour)
          .attr("d", areaAbove);

// fill the "abandoned" color below the closed to abandoned line:
visualiser.append("svg:path")
          .datum(lines2[1])
          .attr("class", "area")
          .attr("id", "areaAbandoned")
          .style("fill", abandonedColour)
          .attr("d", areaBelow);

/*
  lines[0] = open to closed
  lines[1] = closed to abandoned
  lines[2] = closed to open
  lines[3] = open to abandoned
*/

// fill the 4 colors for hysteresis, afo, afc, closed regions in RHS graph:

var regionBounds = [[2, 0, 3],   // hysteresis: either open / closed: i.e.
                                 //   open remains open, 
                                 //   closed remains closed
                    [0, 0, 3],   // between closed and abandoned from open
                    [3, 1, 3],   // between open and closed from abandoned:
                                 //   region not found
                    [1, 0, 1]];  // closed

var regionColours = [hysteresisColour, 
                     abandonedFromOpenColour, 
                     abandonedFromClosedColour, 
                     closedColour];

for (var i = 0; i < lines2.length; i++) {
    var zoneData = makeZoneData(lines2, regionBounds[i]);
    
    visualiser.append("svg:path")
              .datum(zoneData)
              .attr("class", "area")
              .attr("id", "area"+i)
              .style("fill", regionColours[i])
              .attr("d", area);
}

/*
  draw the 4 lines:
    open to closed
    closed to abandoned
    closed to open
    open to abandoned
*/

var lineWidth = 5;

for (var i = 0; i < lines2.length; i++){
  visualiser.append("svg:path")
            .attr("d", lineFunc(lines2[i]))
            .attr("class", "line")
            .attr("stroke-width", lineWidth)
            .attr("id", "line"+i)
            .style("stroke", lineColours[i])
            .attr("fill", "none");
}

/********************* END DYNAMIC GRAPH DATA *********************/


/********************* BEGIN DYNAMIC GRAPH FEATURES *********************/

/*****
  This section of code defines the tooltips, labels and 
  other interactive data objects for the graph. 
  The interactive elements depend upon both the static graph elements and 
  the dynamic graph data in the previous two sections.
*****/

// Define an object in the SVG that has no display properties,
// i.e. it is invisible.

// focus = x-tooltip line:
var focus = visualiser.append("g")
                      .style("display", "none");

// Append a line that will be used as the x-tooltip. 
// No y-tooltip is needed as this is multiline.
// The line extends the height of the graph.

focus.append("line")
     .attr("class", "x")
     .attr("id", "x_tooltip_line")
     .style("stroke", "blue")
     .style("stroke-dasharray", "3,3")
     .style("opacity", 0.5)
     .attr("y1", 0)
     .attr("y2", height);

// Append a RHS circle that will be used to display 
// the current operating regime.
visualiser.append("circle")
          .attr("class", "selection")
          .attr("id", "observedPricePicker")
          .attr("transform",
                "translate(" + xRangeLabel(reserveLevels["reserve"][0]) + "," +
                               yRangeLeft(mineData["path"][0]) + ")")
          .style("fill", "black")
          .style("stroke", "black")
          .style("stroke-width", vis_circle_border1)
          .style("opacity", 0)
          .attr("r", vis_circle_radius1);

//Update the visuality of the operating regime dot:
for (var i = 0; i < lines.length; i++){
  // Append a RHS circle that will appear at the intersection of the 
  // x-tooltip line and the imaginary y-tooltip line for each curve.
  focus.append("circle")
       .attr("class", "y")
       .attr("id", "tooltip_circle" + i)
       .style("fill", "none")
       .style("stroke", "blue")
       .style("stroke-width", vis_circle_border2)
       .attr("r", vis_circle_radius2);
}

// Append a rectangle which will capture the mouse movements on RHS graph:
visualiser.append("rect")
          .attr("width", width)
          .attr("height", height)
          .attr("id", "visualiser_tooltip_surface")
          .style("fill", "none")
          .style("pointer-events", "all")
          .on("mouseover", function() { 
            focus.style("display", null);  // to display tooltips
          })
          .on("mouseout", mouseout)
          .on("mousemove", mousemove);

var bisectValues = 
  d3.bisector(function(d) { 
    return d.x; 
  }).left;

var bisectValues2 = 
  d3.bisector(function(d) { 
    return d.x2; 
  }).left;

/********************* END DYNAMIC GRAPH FEATURES *********************/

/********************* END SWITCHING BOUNDARIES GRAPH IMPLEMENTATION *********************/

findPricelineHeight();

// LHS graph:
graph = new pricelineGraph("pathSVG", {
      "title": pl_title(),
      "xlabel": pl_xAxisLabel(mineData),
      "ylabel": pl_yAxisLeftLabel(mineData),
      "width": pricelineAspectRatioWidth,
      "height": pricelineAspectRatioHeight
    }, mineData);

if (tooltipOn) {
  updateViewTooltip();  // turn on price tooltip
}

if (dynamicUpdateOn) {
  updateDynamicUpdate();
}

if (updatePriceDotOn) {
  updatePriceDot();
}

if (priceEditOn) {
  updateEditPrices();
}

//setAspectRatios();

//vis_showBorders();
