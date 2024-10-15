/**
  functions_supacalculator.js
*/
var line_type = d3.curveCardinal;
var label_fs = "24px";
var label_axis_fs = "18px";

var viewboxSize = {
	"width": 1800,
	"height": 600
};

var graphPadding = {
	"top": 70,
	"right": 50,
	"bottom": 90,
	"left": 100
};

var bisectValues =
	d3.bisector(function(d) {
		return d.x;
	}).left;

/*
  Controls the opacity of the link button to Stage 3 decumulation while scrolling to the end
*/
$(document).ready(function() {

	$(window).scroll(function() {
		var offset1 = $(document).height();
		var offset = $(window).scrollTop();

		if (offset > 550) {
			$(".button-link").css('display', 'block');
			$(".button-link").css('opacity', offset / (offset1 / 2));
		} else {
			$(".button-link").css('display', 'none');
			$(".button-link").css('opacity', 0);
		}
	});
});

/**
 *  POST REQUEST
 *  Send POST request to python for superbalance data
 */
function getSuperBalance() {
	var jqXHR = $.ajax({
		type: "POST",
		url: "http://" + ip_addr + ":5000/calculator_main",
		async: false,
		data: $('form').serialize(),
		error: function(error) {
			console.log(error);
		}
	});

	var str = jqXHR.statusText;
	return jqXHR.responseText;
}

/**
 *  CALCULATE FUNCTION
 *  Calculate and draw graph of user's superbalance
 */
function calculateFunc() {
	//Before sending POST request, do input validation
	if (validateInput()) {
		var superJSON = getSuperBalance();
		var inputStrategy = document.getElementById("strategy").options[document.getElementById('strategy').selectedIndex].text;
		var inputFund = document.getElementById("fundlevel").options[document.getElementById('fundlevel').selectedIndex].text;
		var disTitle = document.getElementById("distribution_title")
		// Parsing the json data
		superJSON = JSON.parse(superJSON);
		superBal = superJSON["superBal"];
		superYear = superJSON["year"];
		superDist = {
			"x": superJSON["xdistPlot"],
			"y": superJSON["ydistPlot"]
		};
		superHist = superJSON["histdata"];
		superPerctl = superJSON["Perctl"];

		removeGraph(); //remove previous graphs to prevent overlaps or extra graphs
		//document.getElementById("supertitle").style.display = "block"; // show the text after calculate
		document.getElementById("distribution_title").style.display = "block";
		document.getElementById("distribution_title").innerHTML = "The distribution of your superannuation balance with <i>" +
			inputStrategy + "</i> strategy at aged 67.";

		// draws graph
		drawSuperBalAcc(superBal, superYear);
		drawDistPlot(superDist, superHist, superPerctl);

		interpretGraph(superPerctl);
	}
}

/**
  This section is on drawing the superbalance accumulation graph which will be
  using d3.js components with SVG elements.
  drawSuperBalAcc(superBalance, year)
  @param integer superBalance: superbalance accumulation data
  @param integer year: the span of age of the user
 */
function drawSuperBalAcc(superBalance, year) {
	var self = this;

	// specify graph options such as min/max values.
	this.xmax = Math.max.apply(Math, year) + 0.5;
	this.xmin = Math.min.apply(Math, year) - 0.5;
	var maxNum = adjustMax(findArraysMax(superBalance));
	//var minNum = adjustMin(findArraysMin(superBalance));
	this.roundfactor = calRoundFactor(maxNum, 0);
	this.ymax = roundToMaxNearest(maxNum, this.roundfactor);
	//this.ymin = roundToMinNearest(0, this.roundfactor);

	var num_lines = year.length;

	this.size = viewboxSize;

	this.padding = graphPadding;

	this.chart = document.getElementById("visualisation");
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
		.attr("viewBox", "0 0 2100 680");

	// subsequent elements appending to this.vis will start to draw from padding:
	this.vis = this.vis_original
		.classed("svg-content", true)
		.append("g")
		.attr("transform", "translate(200,-30)");

	// append an SVG element that bounds the lines
	this.vis.append("svg")
		.attr("id", "linegraph")
		.attr("top", 0)
		.attr("left", 0)
		.attr("width", this.size.width) // whole chart excluding padding
		.attr("height", this.size.height)
		.attr("class", "path");

	// Get length of the data
	this.num_lines = superBalance.length;

	// Map the data to lines of the graph
	this.lines = d3.range(this.num_lines).map(function(i) {
		line = superBalance[i];
		// set of data points in each line used to create the graph.
		points = d3.range(line.length).map(function(j) {
			return {
				x: year[j],
				y: line[j]
			};
		});
		return {
			points
		};
	});

	/*
	  Scaling functions that transforms the data into visual variables.
	*/

	// scales the x domain to output into the range
	var xscale = d3.scaleLinear()
		.domain([this.xmin, this.xmax])
		.range([0, this.size.width]);

	this.new_xscale = xscale;
	// scales the y domain to output into the range
	var yscale = d3.scaleLinear()
		.domain([this.ymax, 0])
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

	this.vis.select("#linegraph")
		.selectAll('path')
		.data(self.lines)
		.enter()
		.append('path')
		.attr('d', function(d, i) {
			return self.lineFunction(d.points);
		})
		.style("stroke", function(d, i) {
			return (i == (self.num_lines - 1) ? "#FFB81C" : "#004B87");
		})
		.style("stroke-width", 4)
		.attr("opacity", function(d, i) {
			return (i == (self.num_lines - 1) ? 1 : 0.2);
		})
		.attr("fill", "none");

	this.points = d3.range(line.length).map(function(j) {
		return {
			x: year[j],
			y: superBalance[self.num_lines - 1][j]
		};
	});

	var circle = self.vis.select("svg")
		.selectAll("circle")
		.data(this.points)

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
		.attr("r", 6)
		.style("fill", "#FFB81C")
		.style("opacity", 1)
		.style("cursor", "default");

	this.vis.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" +
			(this.size.width / 2) + "," + // centre text below axis
			(this.size.height + (this.padding.bottom - 15)) + ")")
		.style("font-size", label_fs)
		.style("font-weight", "bold")
		.text("Age");

	this.vis.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" +
			-(this.padding.left + 18) + "," + // centre text on left side of graph
			(this.size.height / 2) + ")rotate(-90)")
		.style("font-size", label_fs)
		.style("font-weight", "bold")
		.text("Superannuation balance ($)");

	/*
	  This section draws the x and y axis lines
	*/
	var x_num_ticks = year.length;

	var tx = function(d) {
			return "translate(" + self.new_xscale(d) + ",0)";
		},
		ty = function(d) {
			return "translate(0," + self.new_yscale(d) + ")";
		},
		fx = self.new_xscale.tickFormat(x_num_ticks, "d");

	if (maxNum > 100000) {
		var fy = self.new_yscale.tickFormat(20, "s");
	} else {
		var fy = self.new_yscale.tickFormat(20);
	}
	// Regenerate x-ticks:
	var gx = self.vis.selectAll("g.x")
		.data(self.new_xscale.ticks(x_num_ticks), String)
		.attr("transform", tx);

	gx.select("text")
		.text(fx);

	var gxe = gx.enter().insert("g", "a")
		.attr("class", "x")
		.attr("transform", tx);

	gxe.append("line") // draw the y-axis and vertical grid lines
		.attr("stroke", "#ccc")
		.attr("y1", self.size.height - 10)
		.style("opacity", 1)
		.attr("y2", self.size.height + 10);

	gxe.append("text") // add values on x-axis
		.attr("y", self.size.height)
		.attr("dy", "1.2em")
		.attr("text-anchor", "middle")
		.text(fx)
		.style("font-size", label_axis_fs)
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
		.data(self.new_yscale.ticks(8), String)
		.attr("transform", ty);

	gy.select("text")
		.text(fy);

	var gye = gy.enter().insert("g", "a")
		.attr("class", "y")
		.attr("transform", ty);

	gye.append("line") // draw the x-axis and horizontal grid lines
		.attr("stroke", "#ccc")
		.style("opacity", 1)
		.attr("x1", 0)
		.attr("x2", self.size.width);

	gye.append("text") // add values on y-axis
		.attr("x", -6)
		.attr("dy", ".35em")
		.attr("text-anchor", "end")
		.text(fy)
		.style("font-size", label_axis_fs)
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
	  This section appends and sets the tooltip for the line chart
	*/
	var focus = this.vis.append("g")
		.attr("class", "focus")
		.style("display", "none");

	focus.append("line")
		.attr("class", "x-hover-line hover-line")
		.attr("y1", 0)
		.attr("y2", self.size.height);

	focus.append("circle")
		.attr("r", 7.5);

	focus.append("text")
		.attr("class", "tooltip-text")
		.attr("dx", "-2.5em")
		.attr("dy", "-1em");

	this.vis.append("rect")
		.attr("class", "overlay2")
		.attr("width", self.size.width)
		.attr("height", self.size.height)
		.on("mouseover", function() {
			focus.style("display", null);
		})
		.on("mouseout", function() {
			focus.style("display", "none");
		})
		.on("mousemove", function() {
			var x0 = xscale.invert(d3.mouse(this)[0]);
			//Get value from array corresponding to location
			var j = bisectValues(self.points, x0);
			j = j >= self.points.length ? self.points.length - 1 : j;
			j = j <= 0 ? 1 : j;

			var d0 = self.points[j - 1];
			var d1 = self.points[j];
			var d;
			if (d1) {
				//Select the array element that is closest to the mouse pointer for tooltip
				d = x0 - d0.x > d1.x - x0 ? d1 : d0;
			} else {
				d = d0;
			}
			focus.attr("transform", "translate(" + xscale(d.x) + "," + yscale(d.y) + ")");
			focus.select("text").text(function() {
				return "$" + d.y.format(2);
			});
			focus.select(".x-hover-line").attr("y2", self.size.height - yscale(d.y));
		});
}

/**
  This section is on drawing the distrbution of the simulated superannuation balances at age 67
  and will be using d3.js components with SVG elements.
  drawDistPlot(data,hdata,pdata)
  @param integer data: the datapoints of the density plot from python sns.distplot
  @param integer hdata: the x value and height of the histogram patches from python sns.distplot
  @param integer pdata: an array of percentiles for superannuation balance at age 67
*/
function drawDistPlot(data, hdata, pdata) {
	var self = this;

	// specify graph options such as min/max values.
	this.xmax = Math.max.apply(Math, data.x);
	this.xmin = Math.min.apply(Math, data.x);
	var maxNum = Math.max.apply(Math, data.y);
	var minNum = Math.min.apply(Math, data.y);
	this.roundfactor = calRoundFactor(maxNum, minNum);
	this.ymax = roundToMaxNearest(maxNum, this.roundfactor);
	this.ymin = roundToMinNearest(minNum, this.roundfactor);

	var num_lines = data.x.length;

	this.size = viewboxSize;
	this.padding = graphPadding;

	this.chart = document.getElementById("distribution");
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
		.attr("viewBox", "0 0 2100 680");

	// subsequent elements appending to this.vis will start to draw from padding:
	this.vis = this.vis_original
		.classed("svg-content", true)
		.append("g")
		.attr("transform", "translate(200,-30)");

	// Get the number of data points
	this.num_lines = data.x.length;
	// An array of objects with key x -> x datapoint of distribution plot and y -> y datapoint of distribution plot
	this.lines = d3.range(this.num_lines).map(function(i) {
		return {
			x: data.x[i],
			y: data.y[i]
		};
	});

	/*
	  Scaling functions that transforms the data into visual variables.
	*/

	// scales the x domain to output into the range
	var xscale = d3.scaleLinear()
		.domain([this.xmin, this.xmax])
		.range([0, this.size.width]);

	this.new_xscale = xscale;

	// scales the y domain to output into the range
	var yscale = d3.scaleLinear()
		.domain([this.ymax, 0])
		.nice()
		.range([0, this.size.height])
		.nice();

	this.new_yscale = yscale;

	// d3's line generator
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
	  Appends the histogram of the distribution plot
	*/

	var bar = this.vis.selectAll("bar")
		.data(hdata)
		.enter().append("g")
		.attr("class", "bar")
		.attr("transform", function(d) {
			return "translate(" + self.new_xscale(d.x) + "," + self.new_yscale(d.height) + ")";
		});

	bar.append("rect")
		.attr("x", 1)
		.attr("width", (self.new_xscale(hdata[1].x) - self.new_xscale(hdata[0].x)))
		.attr("height", function(d) {
			return self.size.height - self.new_yscale(d.height);
		})
		.style("fill", "#2FB787")
		.style("opacity", 0.8);

	/*
	  This section is for drawing the line graph of the distribution plot
	*/

	// append an SVG element that bounds the lines
	this.vis.append("svg")
		.attr("id", "linegraph")
		.attr("top", 0)
		.attr("left", 0)
		.attr("width", this.size.width) // whole chart excluding padding
		.attr("height", this.size.height)
		.attr("class", "path");

	this.vis.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" +
			(this.size.width / 2) + "," + // centre text below axis
			(this.size.height + (this.padding.bottom - 15)) + ")")
		.style("font-size", label_fs)
		.style("font-weight", "bold")
		.text("Superannuation balance ($)");

	this.vis.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" +
			-(this.padding.left + 18) + "," + // centre text on left side of graph
			(this.size.height / 2) + ")rotate(-90)")
		.style("font-size", label_fs)
		.style("font-weight", "bold")
		.text("Probability Density");

	// append and draw the distribution plot line to the graph
	this.vis.select("#linegraph")
		.append('path')
		.datum(self.lines)
		.attr('d', lineFunction)
		.style("stroke", "rgb(0,75,135)")
		.attr("opacity", 1)
		.attr("fill", "none")
		.attr("stroke-width", 4);

	/*
	  This section draws the x and y axis lines
	*/
	var x_num_ticks = 10;

	var tx = function(d) {
			return "translate(" + self.new_xscale(d) + ",0)";
		},
		ty = function(d) {
			return "translate(0," + self.new_yscale(d) + ")";
		},
		fx = self.new_xscale.tickFormat(x_num_ticks),
		fy = self.new_yscale.tickFormat(20);
	// Regenerate x-ticks:
	var gx = self.vis.selectAll("g.x")
		.data(self.new_xscale.ticks(x_num_ticks), String)
		.attr("transform", tx);

	gx.select("text")
		.text(fx);

	var gxe = gx.enter().insert("g", "a")
		.attr("class", "x")
		.attr("transform", tx);

	gxe.append("line") // draw the y-axis and vertical grid lines
		.attr("stroke", "#ccc")
		.attr("y1", self.size.height - 10)
		.style("opacity", 1)
		.attr("y2", self.size.height + 10);

	gxe.append("text") // add values on x-axis
		.attr("y", self.size.height)
		.attr("dy", "1em")
		.attr("text-anchor", "middle")
		.text(fx)
		.style("font-size", label_axis_fs)
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
		.data(self.new_yscale.ticks(8), String)
		.attr("transform", ty);

	gy.select("text")
		.text(fy);

	var gye = gy.enter().insert("g", "a")
		.attr("class", "y")
		.attr("transform", ty);

	gye.append("line") // draw the x-axis and horizontal grid lines
		.attr("stroke", "#ccc")
		.style("opacity", 1)
		.attr("x1", 0)
		.attr("x2", self.size.width);

	gye.append("text") // add values on y-axis
		.attr("x", -5)
		.attr("dy", ".35em")
		.attr("text-anchor", "end")
		.text(fy)
		.style("font-size", label_axis_fs)
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
	  This section is for appending tooltips and circle to the distribution graph
	*/

	var focus = this.vis.append("g")
		.attr("id", "tooltip_dist")
		.style("display", "none");
	// append a circle that will appear at the intersection of
	// the x-tooltip line and the imaginary y-tooltip line for each curve
	focus.append("rect")
		.attr("width", 300)
		.attr("height", 80)
		.style("fill", "none")
		.style("stroke", "rgb(0,75,135)")
		.style("stroke-width", 4)
		.style("opacity", 0.8);

	// display the value of the curve at the tooltip
	focus.append("text")
		.style("fill", "rgb(0,75,135)")
    .style("font-size", "120%")
		.style("font-style", "normal")
		.style("opacity", 1)
		.attr("dx", "0.5em")
		.attr("dy", "2.0em");

	focus.append("line")
		.attr("class", "y-hover-line hover-line")
		.attr("x1", 0)
		.attr("x2", self.size.width)
		.style("stroke-width", 4);
	/*
	  Appends the percentile line to the plot
	*/
	var ptls_data = [pdata[1], pdata[4], pdata[9]],
		ptls_label = ["10th Percentile", "25th Percentile", "Median"]
	ptls = this.vis.append("g")
		.on("mouseover", function() {
			focus.style("display", null);
		})
		.on("mouseout", function() {
			focus.style("display", "none");
		})
		.on("mousemove", function() {
			var x0 = xscale.invert(d3.mouse(this)[0]);
			var bisect =
				d3.bisector(function(d) {
					return d;
				}).left;
			//Get value from array corresponding to location
			var j = bisect(ptls_data, x0);
			j = j >= ptls_data.length ? ptls_data.length - 1 : j;
			j = j <= 0 ? 1 : j;

			var d0 = ptls_data[j - 1];
			var d1 = ptls_data[j];
			var d;
			if (d1) {
				//Select the array element that is closest to the mouse pointer for tooltip
				d = x0 - d0 > d1 - x0 ? d1 : d0;
			} else {
				d = d0;
			}
			focus.attr("transform", "translate(" + (self.size.width / 2 + 100) + "," + (yscale(data.y[data.x.indexOf(closestValue(d, data.x))]) - 40) + ")");
			focus.select("text").text(function() {
				return ptls_label[ptls_data.indexOf(d)] + ": $" + d.format(2);
			});
			focus.select(".y-hover-line").attr("x2", ((self.size.width / 2 + 100) - xscale(d)));
			focus.select(".y-hover-line").attr("transform", "translate(-" + ((self.size.width / 2 + 100) - xscale(d)) + ", 40)");
		});

	//appends 10th percentile dashed line
	ptls.append("line")
		.style("stroke", "#DF1995")
		.style("stroke-dasharray", "10,10")
		.style("opacity", 1)
		.style("stroke-width", 6)
		.style("pointer-events", "all")
		.attr("y1", 0)
		.attr("y2", this.size.height)
		.attr("transform", "translate(" + self.new_xscale(pdata[1]) + ",0)");

	//appends 25th percentile dashed line
	ptls.append("line")
		.style("stroke", "#FFB81C")
		.style("stroke-dasharray", "10,10")
		.style("opacity", 1)
		.style("stroke-width", 6)
		.style("pointer-events", "all")
		.attr("y1", 0)
		.attr("y2", this.size.height)
		.attr("transform", "translate(" + self.new_xscale(pdata[4]) + ",0)");

	//appends 50th percentile dashed line
	ptls.append("line")
		.style("stroke", "#E4002B")
		.style("stroke-dasharray", "10,10")
		.style("opacity", 1)
		.style("stroke-width", 6)
		.style("pointer-events", "all")
		.attr("y1", 0)
		.attr("y2", this.size.height)
		.attr("transform", "translate(" + self.new_xscale(pdata[9]) + ",0)");

	for (var i = 0; i < 3; i++) {
		var closeV = closestValue(pdata[Math.pow(i + 1, 2)], data.x);
		ptls.append("circle")
			.style("fill", "rgb(0,75,135)")
			.style("stroke", "#000")
			.style("stroke-width", 1)
			.style("pointer-events", "all")
			.attr("r", 8)
			.attr("transform", "translate(" + xscale(pdata[Math.pow(i + 1, 2)]) + "," + yscale(data.y[data.x.indexOf(closeV)]) + ")");
	}

}

/*
  Shows the interpretation and tabulation of percentiles for superannuation balance
*/
function interpretGraph(superPerctl) {
	var table = document.getElementById("tabulation");
	document.getElementById("interpretation").style.display = "block";
	var row = table.insertRow(1);

	row.insertCell(0).innerHTML = "Superannuation balances";
	row.insertCell(1).innerHTML = "$" + superPerctl[0].format(2);
	row.insertCell(2).innerHTML = "$" + superPerctl[4].format(2);
	row.insertCell(3).innerHTML = "$" + superPerctl[9].format(2);
	row.insertCell(4).innerHTML = "$" + superPerctl[14].format(2);
	row.insertCell(5).innerHTML = "$" + superPerctl[18].format(2);

	// simple analysis
	document.getElementById("analysis").innerHTML = "*<i>The percentile rank of a score is the " +
		"percentage of scores in its frequency distribution that are equal to or lower than it. " +
		"For example, your superannuation balance has a 95% chance to get an accumulation of less than $" +
		superPerctl[18].format(2) + " when you retire at age 67</i>.";
}

/*
  Remove previous charts when recalculating
*/
function removeGraph() {
	var elementv = document.getElementById("visualisation");
	var elementd = document.getElementById("distribution");
	while (elementv.firstChild) {
		elementv.removeChild(elementv.firstChild);
		elementd.removeChild(elementd.firstChild);
		document.getElementById("tabulation").deleteRow(1); //remove the tabulation first row
	}
}

/*
  Find closest value in the data array
*/
function closestValue(num, arr) {
	curr = arr[0];
	for (var i = 0; i < arr.length; i++) {
		if (Math.abs(num - arr[i]) < Math.abs(num - curr)) {
			curr = arr[i];
		}
	}
	return curr;
}

/*
  Validate the inputs of the form and return true/false
*/
function validateInput() {
	var inputAge = document.getElementById("age").value;
	var inputIncome = document.getElementById("income").value;

	if (inputAge < 18 || inputAge > 66) {
		alert("Please enter age between 18 and 66.");
		return false;
	} else if (inputIncome < 30000) {
		alert("Your income should not be less than the minimum wage.");
		return false;
	}

	return true;

}

function showDisclaimer(toggle) {
	if (toggle) {
		document.getElementById("popup").style.display = "block";
		document.getElementById("popup_content" + toggle).style.display = "block";
	} else {
		document.getElementById("popup").style.display = "none";
		document.getElementById("popup_content1").style.display = "none";
		document.getElementById("popup_content2").style.display = "none";
		document.getElementById("popup_content3").style.display = "none";
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
