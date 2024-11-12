/**
  function_pm.js
	This is the JavaScript file for Pension Multiplier(PM) and it consists of three main functions:
	1. getPM - Post Request function
	2. drawPM - consists of the d3 and svg elements of drawing the pension multiplier (different investment strategies) graph
							>Consists of sections: SCALE, LINES, CIRCLE, AXIS, LEGEND
	3. calculateFunc - function called when pressed on Calculate button, calls getPM and drawPM
	Search for the section headers for easy skip to the sections.
*/

/** Initializations **/
var line_type = d3.curveCardinal;
var label_fs = "8px";
var axis_label_fs = "10px"
var legend = ['    0% Cash', '  30% Conservative', '  50% Moderate', '  70% Balanced', '  85% Growth', '100% HighGrowth', 'Super balance', 'Selected Strategy'];
var legend_dd = ['minimum', 'minimum+1%', '4% Rule', 'RuleOfThumb', 'Modest', 'Comfortable', 'Luxury', 'Super balance', 'Selected Strategy'];

var viewBoxOuter = "0 0 450 300";

var viewboxInner = {
    "width": 350,
    "height": 250
};

var graphPadding = {
    "top": 70,
    "right": 50,
    "bottom": 70,
    "left": 40
};

//Colors: d61green,midday blue,ocean blue, fuchsia, light mint, light teal
var lineColors = ['#2FB787', '#00A9CE', '#004B87', '#DF1995', 'rgb(113,204,152)', '#2DCCD3', '#ccc'];
//Colors: C[CSIRO['d61green'], CSIRO['midday blue'], CSIRO['light teal'], CSIRO['ocean blue'], CSIRO['plum'], CSIRO['fuchsia'],  CSIRO['vermillion']]
var lineColors_dd = ['#2FB787', '#00A9CE', '#2DCCD3', '#004B87', '#6D2077', '#DF1995', '#E4002B', '#ccc'];

var symbol = d3.symbol();

/*
 *	INPUT FORM - SLIDER INPUT RANGE
 * Change input range colour before and after thumb according to the input range value
 */
$(function(ready) {
    $('#aRange1').on("change mousemove", function() {
        var val = ($(this).val() - $(this).attr('min')) / ($(this).attr('max') - $(this).attr('min'));

        $(this).css('background-image',
            '-webkit-gradient(linear, left top, right top, ' +
            'color-stop(' + val + ', #2FB787), ' +
            'color-stop(' + val + ', #ddd)' +
            ')'
        );
    });
});


/**
 *	POST REQUEST
 *  Send POST request to python for superbalance data
 */
function getPM() {

    var jqXHR = $.ajax({
        type: "POST",
        url: "http://" + ip_addr + ":5001/pm_main",
        async: false,
        data: $('#form').serialize(),
        error: function(error) {
            console.log(error);
        }
    });
    var str = jqXHR.statusText;
    return jqXHR.responseText;
}

/**
 *	CALCULATE FUNCTION
 *  Calculate and draw graph of user's superbalance
 */
function calculateFunc() {
    //Before sending POST request, do input validation
    if (validateInput()) {
        var jsonData = getPM();

        // Parsing the json data
        jsonData = JSON.parse(jsonData);
        pensionMultiplier = jsonData["PM"];
        data1 = jsonData["Graph1"];
        data2 = jsonData["Graph2"];
        balance = jsonData["Balance"];

    };

    removeGraph();
    drawPM(data1, balance, 1, legend, lineColors); // draw first graph
    drawPM(data2, balance, 2, legend_dd, lineColors_dd); // draw second graph

    document.getElementById("divgraphs").style.display = "block";
    document.getElementById("pm_info").innerHTML = "Pension Multiplier: " + pensionMultiplier;

    //}
}

/**
 *	DRAW FUNCTION for different investment strategies
 *  This section is on drawing the first graph which will be using d3.js components with SVG elements.
 *	drawPM(data, balance)
 *  @param data: pension multipliers for y-axis
 *  @param balance: the x-axis super balance data
 *  @param integer id: the id of the graph 1-different investment strategy 2-different withdrawal strategy
 *	@param legendlabel: legend titles in list of strings
 *	@param colors: hex codes of colours for legend and line colors
 */

function drawPM(data, balance, id, legendlabel, colors) {
    var self = this;
    // specify graph options such as min/max values.
    this.xmax = Math.max.apply(Math, balance);
    console.log(this.xmax);
    this.xmin = Math.min.apply(Math, balance);

    var superbalance = document.getElementById("superbalance").value
    this.ymax = 3.00;
    this.ymin = 1.00;

    this.size = viewboxInner;

    this.padding = graphPadding;

    this.chart = document.getElementById("pathSVG-" + id);
    // append the svg obgect to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    this.vis_original = d3.select(this.chart)
        // the extra div and CSS class allows dynamic rescaling
        // of the charts on window resize.
        .append("div")
        .classed("svg-container", true)

        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", viewBoxOuter);

    // subsequent elements appending to this.vis will start to draw from padding:
    this.vis = this.vis_original
        .classed("svg-content", true)
        .append("g")
        .attr("transform", "translate(60,5)");

    // adds background colour for graph
    this.vis.append("rect")
        .attr("width", this.size.width)
        .attr("height", this.size.height)
        .style("fill", "#F8F8F8");

    // append an SVG element that bounds the lines
    this.vis.append("svg")
        .attr("id", "linegraph" + id)
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", this.size.width) // whole chart excluding padding
        .attr("height", this.size.height)
        .attr("class", "path");

    // Get the number of data points
    if(id==1){
      this.num_lines = data.length - 1;
    }
    else {
      this.num_lines = data.length;
    }
    // Map the data to lines of the graph
    this.lines = d3.range(this.num_lines).map(function(i) {
        line = data[i];
        // set of data points in each line used to create the graph.
        points = d3.range(line.length - 1).map(function(j) {
            return {
                x: balance[j],
                y: line[j]
            };
        });
        return {
            points
        };
    });

    /*
      SCALE
		  Scaling functions that transforms the data into visual variables.
		*/

    // scales the x domain to output into the range
    var xscale = d3.scaleLinear()
        .domain([this.xmin, this.xmax])
        .range([0, this.size.width]);

    this.new_xscale = xscale;
    // scales the y domain to output into the range
    var yscale = d3.scaleLinear()
        .domain([this.ymax, this.ymin])
        .nice()
        .range([0, this.size.height])
        .nice();

    this.new_yscale = yscale;

    // append and draw lines to the graph:
    var lineFunction = d3.line()
        .x(function(d) {
            return self.new_xscale(d.x);
        })
        .y(function(d) {
            return self.new_yscale(d.y);
        })
        .curve(line_type);

    this.lineFunction = lineFunction;

    /*
      LINES
		  This section is for drawing the lines for each plot
		*/
    // append and draw the line to the graph
    this.vis.select("#linegraph" + id)
        .selectAll('null')
        .data(self.lines)
        .enter()
        .append('path')
        .attr('d', function(d, i) {
            return self.lineFunction(d.points);
        })
        .style("stroke", function(d, i) {
            return colors[i];
        })
        .style("stroke-width", 2)
        .attr("opacity", 1)
        .style("fill", "none");

    // Appends a line that shows user's superbalance
    this.vis.append("line")
        .style("stroke", "#ccc")
        .style("stroke-dasharray", "1,1")
        .style("opacity", 0.8)
        .style("stroke-width", 1)
        .style("pointer-events", "all")
        .attr("y1", 0)
        .attr("y2", this.size.height)
        .attr("transform", "translate(" + self.new_xscale(superbalance / 1000) + ",0)");

    /*
    	CROSS SIGN
    	Adds a cross sign to the graph to show selected strategies with user's super balance.
    */
    if (id == 1) {
        var datax = {
            "x": superbalance / 1000,
            "y": data[data.length - 1].slice(-1)
        } //data point
    } else {
        var withdraw_index = $("select[name='withdrawal'] option:selected").index();
        var datax = {
            "x": superbalance / 1000,
            "y": data[withdraw_index].slice(-1)
        } //data point
    }
    var cross = this.vis
        .append("path")
        .datum(datax)
        .attr("d", symbol.type(d3.symbolCross))
        .style('fill', "#FFB81C")
        .style('stroke', 'none')
        .attr('transform', function(d) {
            return "translate(" + self.new_xscale(d.x) + "," + self.new_yscale(d.y) + ")";
        });


    /*
    	CIRCLE
    	Add data points to the graph
    */
    var allPoints = [];
    for (var ii = 0; ii < self.lines.length; ii++) {
        allPoints = allPoints.concat(self.lines[ii].points); //only show last line
    }
    var circle = self.vis.select("svg")
        .selectAll("circle")
        .data(allPoints)

    circle.enter()
        .append("circle")
        .attr("class", function(d) {
            return "unchanged";
        })
        .attr("cx", function(d) {
            return self.new_xscale(d.x);
        })
        .attr("cy", function(d) {
            return self.new_yscale(d.y);
        })
        .attr("r", 2)
        .style("stroke", "none")
        .style("fill", function(d, i) {
            return colors[Math.floor((i) / self.lines[0].points.length)];
        })
        .style("opacity", 1)
        .style("cursor", "default");

    /*
      AXIS
		  This section draws the x and y axis lines
		*/
    var x_num_ticks = 5,
        xaxis = [],
        superb;
    //fixed axis labels
    yaxis = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];
    if (superbalance > 1200000) {
        xaxis = [0, 400, 800, 1200, 1600, 2000];
    } else {
        xaxis = [0, 200, 400, 600, 800, 1000];
    }

    var tx = function(d) {
            return "translate(" + self.new_xscale(d) + ",0)";
        },
        ty = function(d) {
            return "translate(0," + self.new_yscale(d) + ")";
        },
        fx = self.new_xscale.tickFormat(function(d) {
            return xaxis[d] / 1000;
        }, "d"),
        fy = self.new_yscale.tickFormat(function(d) {
            return yaxis[d];
        }, ".2f");

    // Regenerate x-ticks:
    var gx = self.vis.selectAll("g.x")
        .data(xaxis)
        .attr("transform", tx);

    gx.select("text")
        .text(fx);

    var gxe = gx.enter().insert("g", "a")
        .attr("class", "x")
        .attr("transform", tx);

    gxe.append("line") // draw the y-axis and vertical grid lines
        .attr("stroke", "#ccc")
        .style("stroke-width", 0.5)
        .style("opacity", 0.5)
        .attr("y1", self.size.height)
        .attr("y2", 0);

    gxe.append("text") // add values on x-axis
        .attr("y", self.size.height)
        .attr("dy", "1.2em")
        .attr("text-anchor", "middle")
        .text(fx)
        .style("font-size", label_fs)
        .on("mouseover", function(d) {
            d3.select(this).style("font-weight", "bold");
        })
        .on("mouseout", function(d) {
            d3.select(this).style("font-weight", "normal");
        })
        .on("mousedown.drag", null)
        .on("touchstart.drag", null);
    gx.exit().remove();

    // Regenerate y-ticks:
    var gy = self.vis.selectAll("g.y")
        .data(yaxis)
        .attr("transform", ty);

    gy.select("text")
        .text(fy);

    var gye = gy.enter().insert("g", "a")
        .attr("class", "y")
        .attr("transform", ty);

    gye.append("line") // draw the x-axis and horizontal grid lines
        .attr("stroke", "#ccc")
        //.style("stroke-dasharray", "1,1")
        .style("stroke-width", 0.5)
        .style("opacity", 0.5)
        .attr("x1", 0)
        .attr("x2", self.size.width);

    gye.append("text") // add values on y-axis
        .attr("x", -6)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(fy)
        .style("font-size", label_fs)
        .on("mouseover", function(d) {
            d3.select(this).style("font-weight", "bold");
        })
        .on("mouseout", function(d) {
            d3.select(this).style("font-weight", "normal");
        })
        .on("mousedown.drag", null)
        .on("touchstart.drag", null);

    gy.exit().remove();

    /*
    	LEGEND
    	This section is for drawing the legends for the stacked area and line
    */

    // Appends a label
    this.vis.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + this.size.width / 2 + "," +
            (this.size.height + 25) + ")")
        .style("font-size", axis_label_fs)
        .style("font-weight", "bold")
        .text("Balance (k$)");

    // Add one dot in the legend for each name.
    var size = 20,
        svg = this.vis.append("rect")
        .attr("width", this.size.width / 3)
        .attr("height", function(d, i) {
            return id == 1 ? self.size.height / 2.4 : self.size.height / 2.2;
        })
        .attr("transform", "translate(5,0)")
        .style("stroke", "#ddd")
        .style("stroke-width", 0.5)
        .style("fill", "#FFF");

    var lineLegend = this.vis.selectAll(".lineLegend").data(legendlabel)
        .enter().append("g")
        .attr("class", "lineLegend")
        .attr("transform", function(d, i) {
            return "translate(" + (self.padding.left - 10) + " ," + (10 + (i * 12)) + ")";
        });

    lineLegend.append("text").text(function(d) {
            return d;
        })
        .attr("transform", "translate(15,3)")
        .style("font-size", label_fs);

    lineLegend.append("line")
        .style("stroke", function(d, i) {
            return colors[i];
        })
        .style("stroke-width", 1)
        .style("stroke-dasharray", function(d, i) {
            return i == self.num_lines ? "1,1" : "";
        })
        .attr("x1", -20)
        .attr("x2", 10);

    //Cross sign for selected strategy at legend
    this.vis.append("path")
        .datum(datax)
        .attr('transform', function(d, i) {
            return id == 1 ? 'translate(25,93)' : 'translate(25,105)';
        })
        .attr('d', d3.symbol().type(d3.symbolCross).size(50))
        .style("fill", "#FFB81C")
        .style("stroke", "none");


}

/**
 *  VALIDATION
 *  Validate the inputs of the form and return true/false
 */
function validateInput() {
    var inputSuper = document.getElementById("superbalance").value;

    if (inputSuper > 100) {} else {
        document.getElementById("superbalance").value = 100;
    }
    return true;
}

/**
 *  REMOVE GRAPH
 *  Remove previous graphs when recalculating
 */
function removeGraph() {
    var elements = document.getElementById("divgraphs").getElementsByClassName("svg-inwrap");
    for (var i = 0; i < elements.length; i++) {
        while (elements[i].firstChild) {
            elements[i].removeChild(elements[i].firstChild);
        }
    }
}

/**
 *  Shows popup contents
 */
function showDisclaimer(toggle) {
    if (toggle) {
        document.getElementById("popup").style.display = "block";
        document.getElementById("popup_content" + toggle).style.display = "block";
    } else {
        document.getElementById("popup").style.display = "none";
        document.getElementById("popup_content1").style.display = "none";
        document.getElementById("popup_content2").style.display = "none";
        document.getElementById("popup_content3").style.display = "none";
        document.getElementById("popup_content4").style.display = "none";
        document.getElementById("popup_content5").style.display = "none";
    }

}

function findArraysMax(data) {
    datamax = Math.max.apply(Math, data[0]);
    for (i = 1; i < data.length; i++) {
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
    for (i = 1; i < data.length; i++) {
        newmin = Math.min.apply(Math, data[i]);
        if (newmin < datamin)
            datamin = newmin;
    }
    return datamin;
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

function roundToMaxNearest(number, n) {
    var number2 = number;
    if (number2 > 0)
        number2 = number2 * 1.01;
    else
        number2 = number2 * 0.99;
    var maxNearest = Math.ceil(number2 / n) * n;
    var diff = maxNearest - number;
    var fraction = diff / n;
    if (fraction <= 0.5)
        maxNearest += n;
    return maxNearest;
}

function roundToMinNearest(number, n) {
    var number2 = number;
    if (number2 < 0)
        number2 = number2 * 1.01;
    else
        number2 = number2 * 0.99;
    var minNearest = Math.floor(number2 / n) * n;
    var diff = number - minNearest;
    var fraction = diff / n;
    if (fraction <= 0.5)
        minNearest -= n;
    return minNearest;
}

/**
 * Number.prototype.format(n, x)
 *
 * @param integer n: length of decimal
 * @param integer x: length of sections
 */
Number.prototype.format = function(n, x) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    return this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$&,');
};
