/*
  function_supadrawdown.js
*/
var line_type = d3.curveCardinal;
var label_fs = "16px";

var viewBoxOuter = "0 0 450 300";

var keys = ["Annuity", "ABP", "AgePension"];

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

var incomeColors = ['rgb(000,169,206)', 'rgb(120,190,032)', 'rgb(159,174,229)'];

var bisectValues =
	d3.bisector(function(d) {
		return d.x;
	}).left;

/*
  Change input range colour before and after thumb according to the input range value
*/
$(function(ready){
  $('#aRange1,#aRange2').on("change mousemove", function () {
      var val = ($(this).val() - $(this).attr('min')) / ($(this).attr('max') - $(this).attr('min'));

      $(this).css('background-image',
                  '-webkit-gradient(linear, left top, right top, '
                  + 'color-stop(' + val + ', #2FB787), '
                  + 'color-stop(' + val + ', #ddd)'
                  + ')'
                  );
  });
});


/*
  Send POST request to python for superbalance data
*/
function getDrawDown(id) {

	var jqXHR = $.ajax({
		type: "POST",
		url: "http://" + ip_addr + ":5000/drawdown_main",
		async: false,
		data: $('#form,#form' + id).serialize(),
		error: function(error) {
			console.log(error);
		}
	});

	var str = jqXHR.statusText;
	return jqXHR.responseText;
}

/*
  Calculate and draw graph of user's superbalance
*/
function calculateFunc(id) {
	//Before sending POST request, do input validation
	if (validateInput()) {
		var jsonData = getDrawDown(id);

		// Parsing the json data
		jsonData = JSON.parse(jsonData);
		year = jsonData["year"];
		RetirementIncome = {
			"RI1": jsonData["Consumption"],
			"RI2": jsonData["Super"],
			"RI3": jsonData["AgePension"],
			"RI4": jsonData["SuperW"]
		};
		stackRI = jsonData["StackPlot"];

		// mapping the stackRI to an array of data for stack generator
		var dataArray = [];

		for (var key in stackRI) {
			var obj = {};
			obj.year = key;
			stackRI[key].forEach(function(d, i) {
				obj[keys[i]] = d;
			})
			dataArray.push(obj)
		}

		if (id == 1) {
			removeGraph(id);//remove existing graph
			drawRI(RetirementIncome, dataArray, year, 1);
		} else {
			removeGraph(id);//remove existing graph
			drawRI(RetirementIncome, dataArray, year, 2);
		}
		document.getElementById("divgraphs").style.display = "flex";

	}
}

/**
  This section is on drawing the graph which will be
  using d3.js components with SVG elements.
  drawRI(data, stackdata, year, id)
  @param list of float data: income, superannuation residual, age pension and drawdown data
  @param list of float stackdata: data of stacked area graph
  @param integer year: the span of age of the user
  @param integer id: strategy 1 or strategy 2
*/
function drawRI(data, stackdata, year, id) {
	var self = this;
	// specify graph options such as min/max values.
	this.xmax = Math.max.apply(Math, year) - 1;
	this.xmin = Math.min.apply(Math, year);

	var num_lines = year.length;
	var superbalance = document.getElementById("superbalance").value;
	// loop 4 times to draw all four graphs
	for (var k = 1; k < 5; k++) {

		var dataRI = data["RI" + k];
		//var maxNum = adjustMax(findArraysMax(dataRI));
		//this.roundfactor = calRoundFactor(maxNum, 0);
		//this.ymax = roundToMaxNearest(maxNum, this.roundfactor)*1.2;

		//piecewise limit of y depending on different graph
		if (k == 1) { //first graph is income
			if (superbalance > 999999) {
				ylim = 100000;
			} else {
				ylim = 60000;
			}
		} else if (k == 2) { //second graph is superannuation residual
			ylim = superbalance * 1.2;
		} else if (k == 3) { //third graph is age pension
			ylim = 30000;
		} else { //last graph is superannuation drawdown
			ylim = superbalance * 0.08;
		}
		this.ymax = ylim;

		this.size = viewboxInner;

		this.padding = graphPadding;

		this.chart = document.getElementById("pathSVG-".concat("RI" + id + k));
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
			.attr("transform", "translate(60,20)");

    // adds background colour for graph
		this.vis.append("rect")
			.attr("width", this.size.width)
			.attr("height", this.size.height)
			.style("fill", "#F8F8F8");

		// append an SVG element that bounds the lines
		this.vis.append("svg")
			.attr("id", "linegraph".concat("RI" + id + k))
			.attr("top", 0)
			.attr("left", 0)
			.attr("width", this.size.width) // whole chart excluding padding
			.attr("height", this.size.height)
			.attr("class", "path");

		// Get the number of data points
		this.num_lines = dataRI.length;
		// Map the data to lines of the graph
		this.lines = d3.range(this.num_lines).map(function(i) {
			line = dataRI[i];
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

		/*
      STACKED AREA PLOT
		  This section is on drawing the stacked area plot for the income plot
		*/
		if (k == 1) {

			//stack the data?
			var stackedData = d3.stack()
				.keys(keys)
				(stackdata);
			var svg = this.vis.select("#linegraph".concat("RI" + id + k));
			var areaChart = svg.append('g');

			// Area generator
			var area = d3.area()
				.x(function(d) {
					return self.new_xscale(d.data.year);
				})
				.y0(function(d) {
					return self.new_yscale(d[0]);
				})
				.y1(function(d) {
					return self.new_yscale(d[1]);
				})

			// Show the areas
			areaChart
				.selectAll("mylayers")
				.data(stackedData)
				.enter()
				.append("path")
				.attr("class", function(d) {
					return "myArea " + d.key
				})
				.style("fill", function(d) {
					return incomeColors[d.index];
				})
        .style("stroke","none")
				.style("opacity", 0.7)
				.attr("d", area);

      /*
        LEGEND
        This section is for drawing the legends for the stacked area and line
      */
      // Only applies to the first graph of Strategy 1
			if (id == 1) {

        // Appends a label
				this.vis.append("text")
					.attr("text-anchor", "middle")
					.attr("transform", "translate(-" + this.padding.left + "," +
						(this.size.height + 20) + ")")
					.style("font-size", label_fs)
					.style("font-weight", "bold")
					.text("Age");

				// Add one dot in the legend for each name.
				var size = 20
				svg.selectAll("myrect")
					.data(keys)
					.enter()
					.append("rect")
					.attr("x", function(d, i) {
						return self.size.width * 0.4
					})
					.attr("y", function(d, i) {
						return (7 + (i * 15));
					})
					.attr("width", 5)
					.attr("height", 5)
					.style("fill", function(d, i) {
						return incomeColors[i];
					})

				// Add one dot in the legend for each name.
				svg.selectAll("mylabels")
					.data(keys)
					.enter()
					.append("text")
					.attr("x", function(d, i) {
						return self.size.width * 0.4 + 10
					})
					.attr("y", function(d, i) {
						return (12 + (i * 15));
					})
					.style("fill", function(d, i) {
						return incomeColors[i];
					})
					.text(function(d) {
						return d
					})
					.attr("text-anchor", "left")
					.style("font-size", label_fs)
					.style("alignment-baseline", "middle");

				var legend_keys = ["Median", "20%,80%", "5%,95%"];
				var lineLegend = this.vis.selectAll(".lineLegend").data(legend_keys)
					.enter().append("g")
					.attr("class", "lineLegend")
					.attr("transform", function(d, i) {
						return "translate(" + self.size.width * 0.75 + "," + (10 + (i * 15)) + ")";
					});

				lineLegend.append("text").text(function(d) {
						return d;
					})
					.attr("transform", "translate(15,5)") //align texts with boxes
					.style("font-size", label_fs);

				var legendColours = ["#004B87", "#DF1995", "#FFB81C"];
				lineLegend.append("line")
					.style("stroke", function(d, i) {
						return legendColours[i];
					})
					.style("stroke-dasharray", function(d, i) {
						return i == 0 ? "" : i == 1 ? "10,10" : "3,3";
					})
					.style("stroke-width", function(d, i) {
						return (i == 0 ? 2 : 1.5);
					})
					.attr("x1", -20)
					.attr("x2", 10);
			}
		} // endif for i==1 (first graph)

		/*
      LINES
		  This section is for drawing the lines for each plot
		*/
		// append and draw the line to the graph
		this.vis.select("#linegraph".concat("RI" + id + k))
			.selectAll('null')
			.data(self.lines)
			.enter()
			.append('path')
			.attr('d', function(d, i) {
				return self.lineFunction(d.points);
			})
			.style("stroke", function(d, i) {
				return (i == 0 ? "#004B87" : i > 2 ? "#DF1995" : "#FFB81C");
			})
			.style("stroke-dasharray", function(d, i) {
				return (i == 0 ? "" : i > 2 ? "10,10" : "3,3");
			})
			.style("stroke-width", function(d, i) {
				return (i == 0 ? 2 : 1.5);
			})
			.attr("opacity", function(d, i) {
				return (i == 0 ? 1 : 0.8);
			})
			.style("fill", "none");

		/*
      AXIS
		  This section draws the x and y axis lines
		*/
		var x_num_ticks = 10;
		xdata = [67, 71, 75, 79, 83, 87, 91, 95, 99, 103];

		var tx = function(d) {
				return "translate(" + self.new_xscale(d) + ",0)";
			},
			ty = function(d) {
				return "translate(0," + self.new_yscale(d) + ")";
			},
			fx = self.new_xscale.tickFormat(function(d) {
				return xdata[d];
			}, "d");


		var fy = self.new_yscale.tickFormat(20, "s");

		// Regenerate x-ticks:
		var gx = self.vis.selectAll("g.x")
			.data(xdata)
			.attr("transform", tx);

		gx.select("text")
			.text(fx);

		var gxe = gx.enter().insert("g", "a")
			.attr("class", "x")
			.attr("transform", tx);

		gxe.append("line") // draw the y-axis and vertical grid lines
			.attr("stroke", "#ccc")
			.style("opacity", 1)
			.style("stroke-dasharray", "1,1")
			.style("stroke-width", 0.5)
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
			.data(self.new_yscale.ticks(4), String)
			.attr("transform", ty);

		gy.select("text")
			.text(fy);

		var gye = gy.enter().insert("g", "a")
			.attr("class", "y")
			.attr("transform", ty);

		gye.append("line") // draw the x-axis and horizontal grid lines
			.attr("stroke", "#ccc")
			.style("opacity", 1)
			.style("stroke-dasharray", "1,1")
			.style("stroke-width", 0.5)
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

	}

}

/*
  VALIDATION
  Validate the inputs of the form and return true/false
*/
function validateInput() {
	var inputSuper = document.getElementById("superbalance").value;

	if (inputSuper > 100) {} else {
		document.getElementById("superbalance").value = 100;
	}
	return true;
}

/*
  REMOVE GRAPH
  Remove previous charts when recalculating
*/
function removeGraph(id) {
	var elements = document.getElementById("RIgraph").getElementsByClassName("svg-inwrap" + id);
	for (var i = 0; i < elements.length; i++) {
		while (elements[i].firstChild) {
			elements[i].removeChild(elements[i].firstChild);
		}
	}
}

/*
  Shows popup contents
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
