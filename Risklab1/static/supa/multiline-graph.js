
multilineGraph = function(containerId, options, tt, lines_data, percent_data2, tt_pct2) {
  var self = this;

  var percent_data = self.getPctArray(percent_data2);
  var tt_pct = self.getPctArray(tt_pct2);

  // the document element in which the graph will be rendered.
  this.chart = document.getElementById(containerId);

  this.options = options || {};

  this.tt = tt;
  this.tt_pct = tt_pct;

  // defines aspect ratio of the width and height of the graph container.
  this.spanx = this.options.width;
  this.spany = this.options.height;

  // specify graph options such as min/max values.
  this.options.xmax = Math.max.apply(Math, tt) + 1;
  this.options.xmin = Math.min.apply(Math, tt) - 1;

  var combined_data = lines_data.concat(percent_data2);
  var maxNum = adjustMax(findArraysMax(combined_data));
  var minNum = adjustMin(findArraysMin(combined_data));
  this.options.roundfactor = calRoundFactor(maxNum, minNum);
  this.options.ymax = roundToMaxNearest(maxNum, this.options.roundfactor);
  this.options.ymin = roundToMinNearest(minNum, this.options.roundfactor);

  // stores whether the shift key is being held.
  this.shiftKey = false;

  this.lastY = [];

  // stores the padding between the container and the graph.
  // these values change depending on extra features such as graph titles.
  this.padding = {
     "top":    70,
     "right":  50,
     "bottom": 100,
     "left":   120
  };

  // size of graph: whole chart excluding padding
  this.size = {
    "width":  this.spanx - this.padding.left - this.padding.right,
    "height": this.spany - this.padding.top  - this.padding.bottom
  };

  this.xscale = d3.scaleLinear()
      .domain([this.options.xmin, this.options.xmax])
      .range([0, this.size.width]);

  var xscale = d3.scaleLinear()
      .domain([this.options.xmin, this.options.xmax])
      .range([0, this.size.width]);

  this.new_xscale = xscale;

  // variable that stores the change in x axis scale.
  // it contains x-coordinate of mouse position
  //   initially clicked in x-axis when dragging:
  this.dragx = Math.NaN;

  this.yscale = d3.scaleLinear()   // inverted domain
      .domain([this.options.ymax, this.options.ymin])
      .nice()
      .range([0, this.size.height])
      .nice();

  var yscale = d3.scaleLinear()
      .domain([this.options.ymax, this.options.ymin])
      .nice()
      .range([0, this.size.height])
      .nice();

  this.new_yscale = yscale;

  // Variable that stores the change in y axis scale.
  // it contains y-coordinate of mouse position
  //   initially clicked in y-axis when dragging:
  this.dragy = Math.NaN;

  // stores the currently selected data points.
  this.selected = [];

  // stores the data points currently being dragged.
  this.dragged = [];

  this.thin_line_width = thin_line_width;
  this.thick_line_width = thick_line_width;

  this.pct_line_width = pct_line_width;

  this.num_lines = lines_data.length;

  this.lines = d3.range(this.num_lines).map(function(i) {
    line = lines_data[i];
    // set of data points in each line used to create the graph.
    points = d3.range(line.length).map(function(j) {
    return { x: tt[j],
             y: line[j] };
    });
    return { points };
  });

  this.num_percent_lines = percent_data.length;

  this.percent_lines = d3.range(this.num_percent_lines).map(function(i) {
    line = percent_data[i];
    // set of data points in each line used to create the graph.
    points = d3.range(line.length).map(function(j) {
    return { x: tt_pct[j],
             y: line[j] };
    });
    return { points };
  });

  // the element used to create the graph visualisation;
  // this is a container inside of the main container.
  this.vis_original = d3.select(this.chart)
      // the extra div and CSS class allows dynamic rescaling
      // of the charts on window resize.
      .append("div")
      .classed("svg-container", true)

      .append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", "0 0 " + this.spanx + " " + this.spany);

  // subsequent elements appending to this.vis will start to draw from padding:
  this.vis = this.vis_original
                 .classed("svg-content", true)
                 .append("g")
                 .attr("transform", "translate(" +
                   this.padding.left + "," + this.padding.top + ")");

  // rectangle object used to render the plot. This is separate from the axes.
  // this.plot occupies whole chart excluding padding:
  //   this.plot can respond to all mouse events
  this.plot = this.vis.append("rect")
                      .attr("width", this.size.width)
                      .attr("height", this.size.height)
                      .style("fill", graph_background_color)
                      .attr("pointer-events", "all")
                      .on("mousedown.drag", self.plot_drag())
                      .on("touchstart.drag", self.plot_drag());

  this.plot.call(d3.zoom()
                   .on("zoom", self.zoomFunction(true))
                   .on("end", self.mouseup()));

  // append an SVG element that bounds the lines
  this.vis.append("svg")
      .attr("id", "linegraph".concat(this.options.graphID))
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", this.size.width)  // whole chart excluding padding
      .attr("height", this.size.height)
      .attr("viewBox", "0 0 "+this.size.width+" "+this.size.height)
      .attr("class", "path");

  this.vis.append("svg")
      .attr("id", "pctgraph".concat(this.options.graphID))
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", this.size.width)  // whole chart excluding padding
      .attr("height", this.size.height)
      .attr("viewBox", "0 0 "+this.size.width+" "+this.size.height)
      .attr("class", "path");

  self.pathlen = 0;

  // append and draw lines to the graph:
  var lineFunction = d3.line()
                     .x(function (d) {
                       return self.new_xscale(d.x);
                     })
                     .y(function (d) {
                       return self.new_yscale(d.y);
                     })
                     .curve(line_type);

  this.lineFunction = lineFunction;

  var colors = this.options.lineColors;

  this.vis.select("#linegraph".concat(this.options.graphID))
          .selectAll('path')
          .data(self.lines)
          .enter()
          .append('path')
          .attr('d', function(d, i) {
            return self.lineFunction(d.points);
          })
          .style("stroke", function(d, i) {
            return colors[i];
          })
          .attr("opacity", 0.8)
          .attr("fill", "none")
          .attr("stroke-width", function(d, i) {
            return (i == (self.num_lines-1) ? self.thick_line_width : self.thin_line_width);
          });

  var pct_colors = this.options.percentileColors;

  this.vis.select("#pctgraph".concat(this.options.graphID))
          .selectAll('path')
          .data(self.percent_lines)
          .enter()
          .append('path')
          .attr('d', function(d, i) {
            return self.lineFunction(d.points);
          })
          .style("stroke", function(d, i) {
            return pct_colors[i];
          })
          .attr("opacity", 0.8)
          .attr("fill", "none")
          .attr("stroke-width", function(d, i) {
            return self.pct_line_width;
          });

  // append the title to the graph.
  if (this.options.title) {
    this.vis.append("text")
        .text(this.options.title)
        .attr("x", this.size.width/2)
        .attr("dy","-0.6em")
        .attr("text-anchor", "middle")
        .style("font-size", lg_title_font_size)
        .style("text-decoration", "underline")
        .style("font-weight", "bold")
  }

  // append the x-Label to the graph
  if (this.options.xlabel) {
    this.vis.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" +
          (this.size.width/2) + "," + // centre text below axis
          (this.size.height + (this.padding.bottom - 15)) + ")")
        .style("font-size", lg_label_font_size)
        .style("font-weight", "bold")
        .text(this.options.xlabel);
  }

  // append the y-Label to the graph
  if (this.options.ylabel) {
    this.vis.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" +
          -(this.padding.left/2+18) + "," + // centre text on left side of graph
          (this.size.height/2) + ")rotate(-90)")
        .style("font-size", lg_label_font_size)
        .style("font-weight", "bold")
        .text(this.options.ylabel);
  }

  d3.select(this.chart)
      .on("mouseover", self.mouseover())
      .on("mouseout", self.mouseout())
      .on("mousemove.drag", self.mousemove())
      .on("touchmove.drag", self.mousemove())
      .on("mouseup.drag",   self.mouseup())
      .on("touchend.drag",  self.mouseup());

  this.redraw(true)();

  // ************************* tooltips *****************************

  // a grouping element that stores the lines of the graph
  // for use by tooltip logic.
  this.focus = this.vis.append("g")
                       .style("display", "none");

  // append a line that will be used as the x-tooltip;
  // no y-tooltip is needed as this is multiline;
  // the line extends the height of the graph.
  this.focus.append("line")
      .attr("id", "x_tooltip_price_line".concat(this.options.graphID))
      .style("stroke", tooltip_color)
      .style("stroke-dasharray", "3,3")
      .style("opacity", 1)
      .style("stroke-width", 2)
      .attr("y1", 0)
      .attr("y2", this.size.height);

  // append a circle that will appear at the intersection of
  // the x-tooltip line and the imaginary y-tooltip line for each curve
  this.focus.append("circle")
      .attr("class", "tooltip")
      .attr("id", "tooltip_circle_price_line".concat(this.options.graphID))
      .style("fill", "none")
      .style("stroke", tooltip_color)
      .style("stroke-width", 2)
      .style("opacity", 0.8)
      .attr("r", tooltip_radius);

  // display the value of the curve at the tooltip
  this.focus.append("text")
      .attr("class", "y1")
      .attr("id", "tooltip_texty1_price_line".concat(this.options.graphID))
      .style("fill", "none")
      .style("stroke", tooltip_color)
      .style("stroke-width", 2)
      .style("font-size", lg_axis_font_size)
      .style("font", "Arial")
      .style("font-style", "normal")
      .style("opacity", 1)
      .attr("dx", "-2.5em")
      .attr("dy", "-2.0em");

  // display the x-value at the tooltip
  this.focus.append("text")
      .attr("class", "y3")
      .attr("id", "tooltip_texty3_price_line".concat(this.options.graphID))
      .style("fill", "none")
      .style("stroke", tooltip_color)
      .style("stroke-width", 2)
      .style("font-size", lg_axis_font_size)
      .style("font", "Arial")
      .style("font-style", "normal")
      .style("opacity", 1)
      .attr("dx", "-2.5em")
      .attr("dy", "-0.7em");
}

multilineGraph.prototype.getPctArray = function(arr) {
  if (show_percentiles)
    return arr;
  else
    return [];
}

multilineGraph.prototype.showBorders = function() {
  var self = this;

  var border1 = self.vis_original.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", self.spanx)
    .attr("height", self.spany)
    .style("stroke", 'green')
    .style("fill", "none")
    .style("stroke-width", 2);

  var border2 = self.vis.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", self.size.width)
    .attr("height", self.size.height)
    .style("stroke", 'red')
    .style("fill", "none")
    .style("stroke-width", 2);
}

// triggered when panning or zooming:
multilineGraph.prototype.zoomFunction = function(first) {
}

/**
  Redraws the background graph features (axes and rectangular grids)
  when data changes. Redraw these when zooming and panning.

  first = true when the LHS line graph is being constructed,
        = false otherwise.
*/
multilineGraph.prototype.redraw = function(first) {
  var self = this;
  return function() {
    var ttlength = self.tt.length - 1;
    var x_num_ticks = (ttlength > 12) ? 12 : ttlength;

    var tx = function(d) {
      return "translate(" + self.new_xscale(d) + ",0)";
    },
    ty = function(d) {
      return "translate(0," + self.new_yscale(d) + ")";
    },
    // #666 is darker color for axis, #ccc is lighter color for grid lines:
    strokey = function(d) {
      return d ? "#ccc" : "#666";
    },
    strokex = function(d) {
      return d !== self.options.ytooltipAxis ? "#ccc" : "#666";
    },
    fx = self.new_xscale.tickFormat(x_num_ticks, "d"),
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

    gxe.append("line")     // draw the y-axis and vertical grid lines
        .attr("stroke", strokey)
        .attr("y1", 0)
        .style("opacity", 1)
        .attr("y2", self.size.height);

    gxe.append("text")     // add values on x-axis
        .attr("class", "axis")
        .attr("y", self.size.height)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .text(fx)
        .style("font-size", lg_axis_font_size)
        .on("mouseover", function(d) {
          d3.select(this).style("font-weight", "bold");
        })
        .on("mouseout",  function(d) {
          d3.select(this).style("font-weight", "normal");
        })
        .on("mousedown.drag",  null)
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

    gye.append("line")     // draw the x-axis and horizontal grid lines
        .attr("stroke", strokex)
        .style("opacity", 1)
        .attr("x1", 0)
        .attr("x2", self.size.width);

    gye.append("text")     // add values on y-axis
        .attr("class", "axis")
        .attr("x", -3)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(fy)
        .style("font-size", lg_axis_font_size)
        .on("mouseover", function(d) {
          d3.select(this).style("font-weight", "bold");
        })
        .on("mouseout",  function(d) {
          d3.select(this).style("font-weight", "normal");
        })
        .on("mousedown.drag",  null)
        .on("touchstart.drag", null);

    gy.exit().remove();

    self.plot.call(d3.zoom()
                     .on("zoom", self.zoomFunction(false))
                     .on("end", self.mouseup()));

    self.update(first);
  }
}

/**
  arr - array of objects to search.
  obj - object to find in the array.
  returns a boolean indicating whether the array contains the object or not
*/
function inArray(arr, obj) {
  for(var i = 0; i < arr.length; i++) {
      if (arr[i] == obj) return true;
  }
  return false;
}

multilineGraph.prototype.animate_pct = function(fraction) {
  var self = this;

  if (self.pathlen == 0)
  {
    self.pathlen = document.querySelector("#pctgraph".concat(self.options.graphID)).childNodes[0].getTotalLength();
  }

  aktPos = -self.pathlen*fraction;

  var lines = self.vis.select("#pctgraph".concat(self.options.graphID));

  lines.style("stroke-dashoffset", aktPos);
}

multilineGraph.prototype.update_pct = function(first) {
  var self = this;

  var pct_colors = self.options.percentileColors;

  var lines = self.vis.select("#pctgraph".concat(self.options.graphID))
                      .selectAll('path')
                      .data(self.percent_lines);

  lines.enter()
       .append('path')
       .attr('d', function(d, i) {
         return self.lineFunction(d.points);
       })
       .style("stroke", function(d, i) {
         return pct_colors[i];
       })
       .style("stroke-dasharray", pct_dash)
       .attr("opacity", 0.8)
       .attr("fill", "none")
       .attr("stroke-width", function(d, i) {
         return self.pct_line_width;
       });

  lines.transition()
       .delay(function(d, i) {
           return i / self.lines[0].points.length * transition_delay;
       })
       .duration(transition_duration)
       .ease(transition_easing)
       .attr('d', function(d, i) {
         return self.lineFunction(d.points);
       })
       .style("stroke", function(d, i) {
         return pct_colors[i];
       })
       .style("stroke-dasharray", pct_dash)
       .attr("opacity", 0.8)
       .attr("fill", "none")
       .attr("stroke-width", function(d, i) {
         return self.pct_line_width;
       });

  lines.exit().remove();
}

/**
  Update the LHS price line graph.
  This is called during initial setup, drag events, replotting etc.
  This method makes the graph responsive to user input.

  first = true when the line graph is being constructed,
        = false otherwise.
*/
multilineGraph.prototype.update = function(first) {
  var self = this;

  self.update_pct(first);

  // redraw the lines, in case some points / lines are removed:
  var colors = self.options.lineColors;

  var lines = self.vis.select("#linegraph".concat(self.options.graphID))
                      .selectAll('path')
                      .data(self.lines);

  lines.enter()
       .append('path')
       .attr('d', function(d, i) {
         return self.lineFunction(d.points);
       })
       .style("stroke", function(d, i) {
         return colors[i];
       })
       .attr("opacity", 0.8)
       .attr("fill", "none")
       .attr("stroke-width", function(d, i) {
         return (i == (self.num_lines-1) ? self.thick_line_width : self.thin_line_width);
       });

  lines.transition()
       .delay(function(d, i) {
           return i / self.lines[0].points.length * transition_delay;
       })

       .duration(transition_duration)
       .ease(transition_easing)
       .attr('d', function(d, i) {
         return self.lineFunction(d.points);
       })
       .style("stroke", function(d, i) {
         return colors[i];
       })
       .attr("opacity", 0.8)
       .attr("fill", "none")
       .attr("stroke-width", function(d, i) {
         return (i == (self.num_lines-1) ? self.thick_line_width : self.thin_line_width);
       });

  lines.exit().remove();

  // redraw circles:
  var allPoints = [];
//  for (var ii = 0; ii < self.lines.length; ii++) {
    allPoints = self.lines[self.num_lines-1].points; //only show last line
  //}

  var circle = self.vis.select("svg")
                       .selectAll("circle")
                       .data(allPoints);
  // go inside only if appending new circles:
  if (self.options.allowDrag)
  {
    circle.enter()
          .append("circle")
          // return class = "selected" if equal to selected point
          // highlighted the selected circle using CSS code
          .attr("class", function(d) {
            return inArray(self.selected, d) ? "selected" : "unselected";
          })
          .attr("cx", function(d) {
            return self.new_xscale(d.x);
          })
          .attr("cy", function(d) {
            return self.new_yscale(d.y);
          })
          .attr("r", datapoint_radius)
          .style("opacity", 1)
          .style("cursor", "ns-resize")
          .on("mousedown.drag",  self.datapoint_drag())
          .on("touchstart.drag", self.datapoint_drag());

    circle.attr("class", function(d) {
            return inArray(self.selected, d) ? "selected" : "unselected";
          })
          .transition()
          .delay(function(d, i) {
              return i / self.lines[0].points.length * transition_delay;
          })
          .duration(transition_duration)
          .ease(transition_easing)
          .attr("cx", function(d) {
            return self.new_xscale(d.x); })
          .attr("cy", function(d) {
            return self.new_yscale(d.y);
          });
  } else {
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
          .attr("r", datapoint_radius)
          .style("opacity", 1)
          .style("cursor", "default");

    circle.transition()
          .delay(function(d, i) {
              return i / self.lines[0].points.length * transition_delay;
          })
          .duration(transition_duration)
          .ease(transition_easing)
          .attr("cx", function(d) {
            return self.new_xscale(d.x);
          })
          .attr("cy", function(d) {
            return self.new_yscale(d.y);
          });
  }

  circle.exit().remove();

  if (first) {
    circle.style("opacity", 0);
    circle.on("mousedown.drag",  null);
    circle.on("touchstart.drag", null);
  }

  if (first === null) {
    circle.style("opacity", 0);
    circle.on("mousedown.drag",  null);
    circle.on("touchstart.drag", null);

    var currentFrame = document.getElementById("frameNumber");
    currentFrame.value = 0;
      currentFrame.dispatchEvent(new Event('change'));
  }

  // cancel any key press event (after removing a selected point, if any):
  if (d3.event && d3.event.keyCode) {
    d3.event.preventDefault();
    d3.event.stopPropagation();
  }

  pathUpdate(first);
}

multilineGraph.prototype.mouseout = function(d) {
  var self = this;
  return function(d) {
    self.focus.style("display", "none");
  }
};

multilineGraph.prototype.mouseover = function(d) {
  var self = this;
  return function(d) {
    self.focus.style("display", null);
  }
};

/**
  Register a handler on keyboard key down.
  callback - callback function for the handler.

  Start to register keydown event handler only after:
  a mouse is pressed on the rectangular this.plot or on a data-point circle:
*/
registerKeyDownHandler = function(callback) {
  var callback = callback;
  d3.select(window).on("keydown", callback);
};

/**
  Handle key press event of backspace / delete to remove selected point(s),
  and then update the graph.
*/
multilineGraph.prototype.keydown = function() {
  var self = this;

  return function() {
    if (!(self.selected.length > 0)) return;
    if (!self.options.allowDelete) return;

    switch (d3.event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        for (var d = 0; d < self.selected.length; d++) {
            var i = self.lines[0].points.indexOf(self.selected[d]);
            self.lines[0].points.splice(i, 1);  // delete selected point(s)
        }
        self.selected = [];
        self.update(false);
        self.recalculate();
        break;
      }
    }
  }
};

/**
  Triggered when a mouse is pressed on a data-point circle:
  Select the current circle, and highlight it using CSS code.
*/
multilineGraph.prototype.datapoint_drag = function() {
  var self = this;

  // d is a dictionary containing the selected point (x, y)
  return function(d) {
    registerKeyDownHandler(self.keydown());

    // cancel any other further selection on the document,
    // after selecting the circle:
    document.onselectstart = function() { return false; };

    d3.select('body').style("cursor", "move");

    self.selected = [d];

    self.dragged = self.selected;
    self.update(false);
  }
};

/**
  Remove an element from an array of dictionaries,
  based on the value assigned to a specified key.
  array - array to remove an element from.
  valueToRemove - the value to remove if found in the array.
  Either the value in the array, or
  the value of the key of the object to be removed.
  [key = null] - the key of the Object over which to search the array.
  Returns the array with the object removed, or
  the same array if the object was not found.
*/
function removeArrayElement(array, valueToRemove, key = null) {
  if (typeof array[0] === typeof valueToRemove) {
    for (var i = 0; i < array.length; i++) {
      if (array[i] === valueToRemove) {
        array.splice(i, 1);
        return array;
      }
    }
  }
  else {
    for (var i = 0; i < array.length; i++) {
      if (array[i][key] === valueToRemove) {
        array.splice(i, 1);
        return array;
      }
    }
  }
  return array;
}

multilineGraph.prototype.plot_drag = function() {
  var self = this;

  return function() {
    registerKeyDownHandler(self.keydown());

    d3.select('body').style("cursor", "move");

    var p = d3.mouse(self.vis.node());

    x0 = self.new_xscale.invert(p[0]);

    var j = bisectValues(self.lines[0].points, x0);
    j = j >= self.lines[0].points.length ? self.lines[0].points.length - 1 : j;
    j = j <= 0 ? 1 : j;

    var d0 = self.lines[0].points[j - 1];
    var d1 = self.lines[0].points[j];
    if (d1) {
        var d = x0 - d0.x > d1.x - x0 ? d1 : d0;
    }
    else{
        d = d0;
    }

    self.selected = [d];

    self.dragged = self.selected;
    self.update(false);
  }
}

multilineGraph.prototype.updateXScale = function(tt) {
  var self = this;

  self.options.xmax = Math.max.apply(Math, tt) + 1;
  self.options.xmin = Math.min.apply(Math, tt) - 1;

  self.xscale = d3.scaleLinear()
      .domain([self.options.xmin, self.options.xmax])
      .range([0, self.size.width]);

  var xscale = d3.scaleLinear()
      .domain([self.options.xmin, self.options.xmax])
      .range([0, self.size.width]);

  self.new_xscale = xscale;
};

multilineGraph.prototype.updateYScale = function(lines_data, percent_data2) {
  var self = this;
  self.redraw(false)();
};

/**
  Handles all mousemove events. Behaviour changes depending on key presses.
  Triggered when a mouse is moved while over the div chart:
  If multiple points are selected,
    it updates their y values and display in graph while dragging;
  update dragging of x-axis or y-axis and display in graph.
*/
multilineGraph.prototype.mousemove = function() {
  var self = this;

  return function() {
    var p = d3.mouse(self.vis._groups[0][0]);

    for (var i = 0; i < self.dragged.length; i++) {
      var mousey = self.new_yscale.invert(
          Math.max(0, Math.min(self.size.height, p[1])));

      if (self.lastY.length < self.dragged.length) {
        self.lastY.push(mousey);
      }

      var d = self.dragged[i];
      d.y = d.y + (mousey - self.lastY[i]);
      //d.y = d.y > 0 ? d.y : 0;   // d.y can be negative for asset return
      self.lastY[i] = mousey;
    }

    self.update(false);

    if (!isNaN(self.dragx)) {
      // into here if x-axis is dragged:
      d3.select('body').style("cursor", "ew-resize");

      var rupx = self.new_xscale.invert(p[0]),  // x-coordinate of mousepointer
          xaxis1 = self.new_xscale.domain()[0], // min x
          xaxis2 = self.new_xscale.domain()[1], // max x
          xextent = xaxis2 - xaxis1;

      if (rupx != 0) {
        var changex, new_domain;
        changex = self.dragx / rupx;
        if (changex > 0) {
          new_domain = [xaxis1, xaxis1 + (xextent * changex)];
          self.new_xscale.domain(new_domain);
        }
        self.redraw(false)();
      }

      d3.event.preventDefault();
      d3.event.stopPropagation();
    };

    if (!isNaN(self.dragy)) {
      // into here if y-axis is dragged:
      d3.select('body').style("cursor", "ns-resize");

      var rupy = self.new_yscale.invert(p[1]),  // y-coordinate of mousepointer
          yaxis1 = self.new_yscale.domain()[1], // min y
          yaxis2 = self.new_yscale.domain()[0], // max y
          yextent = yaxis2 - yaxis1;

      if (rupy != 0) {
        var changey, new_domain;
        changey = self.dragy / rupy;
        if (changey > 0) {
          new_domain = [yaxis1 + (yextent * changey), yaxis1];
          self.new_yscale.domain(new_domain);
        }
        self.redraw(false)();
      }

      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
    else{
      //Get x-location of mousepointer
      var x0 = self.new_xscale.invert(d3.mouse(d3.select("#linegraph".concat(self.options.graphID)).node())[0]);

      //Get value from array corresponding to location
      var j = bisectValues(self.lines[self.num_lines-1].points, x0);
      j = j >= self.lines[self.num_lines-1].points.length ? self.lines[self.num_lines-1].points.length - 1 : j;
      j = j <= 0 ? 1 : j;

      var d0 = self.lines[self.num_lines-1].points[j - 1];
      var d1 = self.lines[self.num_lines-1].points[j];
      var d;
      if (d1) {
        //Select the array element that is closest to the mouse pointer for tooltip
        d = x0 - d0.x > d1.x - x0 ? d1 : d0;
      }
      else{
        d = d0;
      }

      self.updateTooltips(d);

      var currentFrame = document.getElementById("frameNumber");
      currentFrame.value = d.x;

      //Create a new change event to trigger the graph update function
      currentFrame.dispatchEvent(new Event('change'));
    }
  }
};

multilineGraph.prototype.updateTooltips = function(d) {
  if (typeof d === "undefined") return;

  var self = this;

  self.focus.style("display", null);

  self.focus.select("#x_tooltip_price_line".concat(self.options.graphID))
      .attr("transform",
            "translate(" + self.new_xscale(d.x) + "," +
                           self.new_yscale(d.y) + ")")
      .attr("y2", self.new_yscale(self.options.ytooltipAxis) - self.new_yscale(d.y));

  self.focus.select("#tooltip_circle_price_line".concat(self.options.graphID))
      .attr("transform",
            "translate(" + self.new_xscale(d.x) + "," +
                           self.new_yscale(d.y) + ")");

  self.focus.select("#tooltip_texty1_price_line".concat(self.options.graphID))
      .attr("transform",
            "translate(" + self.new_xscale(d.x) + "," +
                           self.new_yscale(d.y) + ")")
      .text(lg_y_tooltipLabel(d));

  self.focus.select("#tooltip_texty3_price_line".concat(self.options.graphID))
      .attr("transform",
            "translate(" + self.new_xscale(d.x) + "," +
                           self.new_yscale(d.y) + ")")
      .text(lg_x_tooltipLabel(d));

}

/**
  Clean up function for when the mouse is released.
*/
multilineGraph.prototype.mouseup = function() {
  var self = this;

  return function() {
    document.onselectstart = function() { return true; };

    d3.select('body').style("cursor", "auto");
    d3.select('body').style("cursor", "auto");

    if (!isNaN(self.dragx)) {
      self.redraw(false)();

      self.dragx = Math.NaN;

      d3.event.preventDefault();
      d3.event.stopPropagation();
    };

    if (!isNaN(self.dragy)) {
      self.redraw(false)();

      self.dragy = Math.NaN;

      d3.event.preventDefault();
      d3.event.stopPropagation();
    }

    if (self.dragged.length > 0) {
      self.dragged = [];
      self.lastY = [];
      self.recalculate();
    }
  }
}

multilineGraph.prototype.findPoint = function(newFrame)
{
  var self = this;

  for (var i = 0; i < self.lines[self.num_lines-1].points.length; i++) {
    if (self.lines[self.num_lines-1].points[i]["x"] == newFrame)
      return self.lines[self.num_lines-1].points[i];
  }
  return undefined;
}

multilineGraph.prototype.updateData = function(lines_data, percent_data2, tt, tt_pct2, colors)
{
  var self = this;

  var percent_data = self.getPctArray(percent_data2);
  var tt_pct = self.getPctArray(tt_pct2);

  self.tt = tt;
  self.tt_pct = tt_pct;

  self.options.lineColors = colors;

  self.num_lines = lines_data.length;

  self.lines = d3.range(self.num_lines).map(function(i) {
    line = lines_data[i];
    // set of data points in each line used to create the graph.
    points = d3.range(line.length).map(function(j) {
    return { x: tt[j],
             y: line[j] };
    });
    return { points };
  });

  self.num_percent_lines = percent_data.length;

  self.percent_lines = d3.range(self.num_percent_lines).map(function(i) {
    var line = percent_data[i];
    // set of data points in each line used to create the graph.
    points = d3.range(line.length).map(function(j) {
    return { x: tt_pct[j],
             y: line[j] };
    });
    return { points };
  });

  self.updateXScale(tt);

  self.updateYScale(lines_data, percent_data);
}

multilineGraph.prototype.isDataChanged = function()
{
  var self = this;

  return false;
}

multilineGraph.prototype.recalculate = function()
{
  var self = this;

  if (!self.options.allowDrag) return;
  if (!self.options.allowDelete) return;

  if (!self.isDataChanged()) return;

  recalculateAndUpdateGraphs();
}
