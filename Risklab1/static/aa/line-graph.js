
lineGraph = function(containerId, options, data) {
  var self = this;

  // the document element in which the graph will be rendered.
  this.chart = document.getElementById(containerId);

  this.options = options || {};
  
  // defines aspect ratio of the width and height of the graph container.
  this.spanx = this.options.width;
  this.spany = this.options.height;

  // specify graph options such as min/max values.
  this.options.xmax = data.length;
  this.options.xmin = -1;
  this.options.roundfactor = 0.01;
  this.options.ymax = roundToMaxNearest(Math.max.apply(Math, data), this.options.roundfactor);
  this.options.ymin = roundToMinNearest(Math.min.apply(Math, data), this.options.roundfactor);

  // stores whether the shift key is being held.
  this.shiftKey = false;

  this.lastY = [];

  // stores the padding between the container and the graph. 
  // these values change depending on extra features such as graph titles.
  this.padding = {
     "top":    70,
     "right":  30,
     "bottom": 100,
     "left":   160
  };

  // size of graph: whole chart excluding padding
  this.size = {
    "width":  this.spanx - this.padding.left - this.padding.right,
    "height": this.spany - this.padding.top  - this.padding.bottom
  };

  this.xscale = d3.scaleLinear()
      .domain([this.options.xmin, this.options.xmax])
      .range([0, this.size.width]);

  xscale = d3.scaleLinear()
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

  yscale = d3.scaleLinear()
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

  // set of data points used to create the graph.
  this.points = d3.range(data.length).map(function(i) {
    return { x: i, 
             y: data[i] };
  });

  // the element used to create the graph visualisation;
  // this is a container inside of the main container.
  // subsequent elements appending to this.vis will start to draw from padding:
  this.vis_original = d3.select(this.chart)
      // the extra div and CSS class allows dynamic rescaling 
      // of the charts on window resize.
      .append("div")
      .classed("svg-container", true)
      
      .append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", "0 0 " + this.spanx + " " + this.spany);
      
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
                   .on("zoom", this.zoomFunction(true))
                   .on("end", self.mouseup()));

  // append an SVG element that bounds the price lines
  this.vis.append("svg")
      .attr("id", "linegraph".concat(this.options.graphID))
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", this.size.width)  // whole chart excluding padding
      .attr("height", this.size.height)
      .attr("viewBox", "0 0 "+this.size.width+" "+this.size.height)
      .attr("class", "line")

  // append and draw price lines to the graph:
  this.vis.select("#linegraph".concat(this.options.graphID))
          .selectAll('line')
          .data(self.points)
          .enter()
          .append('line')
          .attr('x1', function(d, i) { 
            return xscale(d.x);
          })
          .attr('y1', function(d, i) {
            return yscale(d.y);
          })
          .attr('x2', function(d, i) {
            var next_index = i === data.length - 1 ? i : i + 1;
            return xscale(self.points[next_index]["x"])
          })
          .attr('y2', function(d, i) {
            var next_index = i === data.length - 1 ? i : i + 1;
            return yscale(self.points[next_index]["y"])
          })
          .attr("stroke", function (d, i) {
            return self.options.strokeColor;
          })
          .attr("opacity", 0.8)
          .attr("fill", "none")
          .attr("stroke-width", 4);
          
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
        .style("font-size", lg_axis_font_size)
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
        .style("font-size", lg_axis_font_size)
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
        .style("font-size", "180%")
        .style("font", "Arial")
        .style("font-style", "normal")
        .style("opacity", 1)
        .attr("dx", "-0.3em")
        .attr("dy", "-2.0em");

    // display the x-value at the tooltip
    this.focus.append("text")
        .attr("class", "y3")
        .attr("id", "tooltip_texty3_price_line".concat(this.options.graphID))
        .style("fill", "none")
        .style("stroke", tooltip_color)
        .style("stroke-width", 2)
        .style("font-size", "180%")
        .style("font", "Arial")
        .style("font-style", "normal")
        .style("opacity", 1)
        .attr("dx", "-0.3em")
        .attr("dy", "-0.7em");
}

lineGraph.prototype.showBorders = function() {
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
lineGraph.prototype.zoomFunction = function(first) {
  var self = this;
  
  return function(first) {
    self.new_xscale = d3.event.transform.rescaleX(self.xscale);
    self.new_yscale = d3.event.transform.rescaleY(self.yscale);
    
    self.redraw(first)();
  }
}

/**
  Redraws the background graph features (axes and rectangular grids)
  when data changes. Redraw these when zooming and panning.
  
  first = true when the LHS line graph is being constructed, 
        = false otherwise.
*/
lineGraph.prototype.redraw = function(first) {
  var self = this;
  return function() {
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
    fx = self.new_xscale.tickFormat(10),
    fy = self.new_yscale.tickFormat(10);
    
    // Regenerate x-ticks:
    var gx = self.vis.selectAll("g.x")
        .data(self.new_xscale.ticks(10), String)
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
        .style("font-size", "1.8vw")
        .style("cursor", "ew-resize")
        .on("mouseover", function(d) {
          d3.select(this).style("font-weight", "bold");
        })
        .on("mouseout",  function(d) {
          d3.select(this).style("font-weight", "normal");
        })
        .on("mousedown.drag",  self.xaxis_drag())
        .on("touchstart.drag", self.xaxis_drag());

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
        .style("font-size", "1.8vw")
        .style("cursor", "ns-resize")
        .on("mouseover", function(d) {
          d3.select(this).style("font-weight", "bold");
        })
        .on("mouseout",  function(d) {
          d3.select(this).style("font-weight", "normal");
        })
        .on("mousedown.drag",  self.yaxis_drag())
        .on("touchstart.drag", self.yaxis_drag());

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

/**
  Update the LHS price line graph. 
  This is called during initial setup, drag events, replotting etc. 
  This method makes the graph responsive to user input.
  
  first = true when the line graph is being constructed, 
        = false otherwise.
*/
lineGraph.prototype.update = function(first) {
  var self = this;

  // redraw the lines, in case a selected point is removed:
  var lines = self.vis.select("#linegraph".concat(self.options.graphID))
                      .selectAll('line')
                      .data(self.points);

  lines.enter()
       .append('line')
       .attr('x1', function(d, i) {
         return self.new_xscale(self.points[i]["x"]);
       })
       .attr('y1', function(d, i) {
         return self.new_yscale(self.points[i]["y"]);
       })
       .attr('x2', function(d, i) {
         var next_index = i === self.points.length - 1 ? i : i + 1;
         return self.new_xscale(self.points[next_index]["x"]);
       })
       .attr('y2', function(d, i) {
         var next_index = i === self.points.length - 1 ? i : i + 1;
         return self.new_yscale(self.points[next_index]["y"]);
       })
       .attr("stroke", function (d, i) {
           return self.options.strokeColor;
       })
       .attr("opacity", 0.8)
       .attr("fill", "none")
       .attr("stroke-width", 4);

  lines.transition()
       .delay(function(d, i) {
           return i / self.points.length * transition_delay;
       })
       .duration(transition_duration)
       .ease(transition_easing)
       .attr('x1', function(d, i) {
         return self.new_xscale(self.points[i]["x"]);
       })
       .attr('y1', function(d, i) {
         return self.new_yscale(self.points[i]["y"]);
       })
       .attr('x2', function(d, i) {
         var next_index = i === self.points.length - 1 ? i : i + 1;
         return self.new_xscale(self.points[next_index]["x"]);
       })
       .attr('y2', function(d, i) {
         var next_index = i === self.points.length - 1 ? i : i + 1;
         return self.new_yscale(self.points[next_index]["y"]);
       })
       .attr("stroke", function (d, i) {
           return self.options.strokeColor;
       })
       .attr("opacity", 0.8)
       .attr("fill", "none")
       .attr("stroke-width", 4);

  lines.exit().remove();

  var circle = self.vis.select("svg")
                       .selectAll("circle")
                       .data(self.points);

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
          .style("opacity", 0)
          .style("cursor", "ns-resize")
          .on("mousedown.drag",  self.datapoint_drag())
          .on("touchstart.drag", self.datapoint_drag());

    circle.attr("class", function(d) {
            return inArray(self.selected, d) ? "selected" : "unselected";
          })
          .transition()
          .delay(function(d, i) {
              return i / self.points.length * transition_delay;
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
          .style("opacity", 0)
          .style("cursor", "default");

    circle.transition()
          .delay(function(d, i) {
              return i / self.points.length * transition_delay;
          })
          .duration(transition_duration)
          .ease(transition_easing)
          .attr("cx", function(d) {
            return self.new_xscale(d.x); })
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

lineGraph.prototype.mouseout = function(d) {
  var self = this;
  return function(d) {
    self.focus.style("display", "none");
  }
};

lineGraph.prototype.mouseover = function(d) {
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
lineGraph.prototype.keydown = function() {
  var self = this;
  
  return function() {
    if (!(self.selected.length > 0)) return;
    if (!self.options.allowDelete) return;
    
    switch (d3.event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        for (var d = 0; d < self.selected.length; d++) {
            var i = self.points.indexOf(self.selected[d]);
            self.points.splice(i, 1);  // delete selected point(s)
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
  Allow to select / deselect multiple points when Shift key is pressed.
*/
lineGraph.prototype.datapoint_drag = function() {
  var self = this;

  // d is a dictionary containing the selected point (x, y)
  return function(d) {
    registerKeyDownHandler(self.keydown());
    
    // cancel any other further selection on the document, 
    // after selecting the circle:
    document.onselectstart = function() { return false; };
    
    d3.select('body').style("cursor", "move");

    self.shiftKey = d3.event.shiftKey;

    if (!inArray(self.selected, d) && self.shiftKey) {
        self.selected.push(d);
    }
    else if (inArray(self.selected, d) && self.shiftKey) {
        removeArrayElement(self.selected, d);
    }
    else {
        self.selected = [d];
    }

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

/**
  Add new points in the event that the alt-key is being held, and 
  the prevention of dragging when the shift key is being held.
  
  Triggered when a mouse is pressed on the rectangular this.plot:
  If the Alt key and mouse are pressed, then
    find and add the selected point into the circle array, and highlight it.
*/
lineGraph.prototype.plot_drag = function() {
  var self = this;
  
  return function() {
    registerKeyDownHandler(self.keydown());
    
    d3.select('body').style("cursor", "move");

    if (document.getElementById("editPrices").value !== "On") return;

    if (d3.event.altKey) {
      // p[0] = x-coordinate of mouse position clicked
      // p[1] = y-coordinate of mouse position clicked
      var p = d3.mouse(self.vis.node());
      
      // compute (x, y) of new selected point in domain
      //   within the whole chart excluding padding
      var newpoint = {};
      
      newpoint.x = Math.round(self.new_xscale.invert(
        Math.max(0, Math.min(self.size.width,  p[0]))));
      newpoint.x = newpoint.x < self.options.xmax ? 
        newpoint.x : self.options.xmax;

      newpoint.y = self.new_yscale.invert(
        Math.max(0, Math.min(self.size.height, p[1])));

      // remove old point with same x, if any:
      removeArrayElement(self.points, newpoint.x, "x");

      self.points.push(newpoint);  // append new point

      self.points.sort(function(a, b) {   // sorting points with ascending x
        if (a.x < b.x) { return -1 };
        if (a.x > b.x) { return  1 };
        return 0;
      });

      // highlight the selected new point:
      self.selected.push(newpoint);
      self.update(false);
      
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
    else {
      var p = d3.mouse(self.vis.node());

      x0 = self.new_xscale.invert(p[0]);
      
      var j = bisectValues(self.points, x0);
      j = j >= self.points.length ? self.points.length - 1 : j;
      j = j <= 0 ? 1 : j;
      
      var d0 = self.points[j - 1];
      var d1 = self.points[j];
      if (d1) {
          var d = x0 - d0.x > d1.x - x0 ? d1 : d0;
      }
      else{
          d = d0;
      }

      self.shiftKey = d3.event.shiftKey;
      
      var inflag = inArray(self.selected, d);

      if (!inflag && self.shiftKey) {
          self.selected.push(d);
      }
      else if (inflag && self.shiftKey) {
          removeArrayElement(self.selected, d);
      }
      else {
          self.selected = [d];
      }

      self.dragged = self.selected;
      self.update(false);
    }
  }
};

lineGraph.prototype.updateYScale = function() {
  var self = this;
  
  var yarray = convertToUngraphable(self.points)["y"];
  
  var ymax = Math.max.apply(Math, yarray);
  self.options.ymax = roundToMaxNearest(ymax, self.options.roundfactor);

  var ymin = Math.min.apply(Math, yarray);
  //ymin = Math.min(ymin, self.options.ymin);
  self.options.ymin = roundToMinNearest(ymin, self.options.roundfactor);
  
  self.yscale = d3.scaleLinear()   // inverted domain
      .domain([self.options.ymax, self.options.ymin])
      .nice()
      .range([0, self.size.height])
      .nice();

  var yscale = d3.scaleLinear()
      .domain([self.options.ymax, self.options.ymin])
      .nice().range([0, self.size.height])
      .nice();

  self.new_yscale = yscale;

  self.redraw(false)();
};

/**
  Handles the scaling of the x-axis.
*/
lineGraph.prototype.xaxis_drag = function() {
  var self = this;
  
  return function(d) {
    document.onselectstart = function() { return false; };
    
    var p = d3.mouse(self.vis._groups[0][0]);
    
    self.dragx = self.new_xscale.invert(p[0]);
  }
};

/**
  Handles the scaling of the y-axis.
*/
lineGraph.prototype.yaxis_drag = function(d) {
  var self = this;
  
  return function(d) {
    document.onselectstart = function() { return false; };
    
    var p = d3.mouse(self.vis._groups[0][0]);
    
    self.dragy = self.new_yscale.invert(p[1]);
  }
};

/**
  Handles all mousemove events. Behaviour changes depending on key presses.
  Triggered when a mouse is moved while over the div chart:
  If multiple points are selected, 
    it updates their y 	values and display in graph while dragging;
  update dragging of x-axis or y-axis and display in graph.
*/
lineGraph.prototype.mousemove = function() {
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
      var j = bisectValues(self.points, x0);
      j = j >= self.points.length ? self.points.length - 1 : j;
      j = j <= 0 ? 1 : j;

      var d0 = self.points[j - 1];
      var d1 = self.points[j];
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

lineGraph.prototype.updateTooltips = function(d) {
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
lineGraph.prototype.mouseup = function() {
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

lineGraph.prototype.findPoint = function(newFrame)
{
  var self = this;
  
  for (var i = 0; i < self.points.length; i++) {
    if (self.points[i]["x"] == newFrame)
      return self.points[i];
  }
  return undefined;
}

lineGraph.prototype.updateData = function(data)
{
  var self = this;

  self.points = d3.range(data.length).map(function(i) {
    return { x: i, 
             y: data[i] };
  });
  
  self.updateYScale();
}

lineGraph.prototype.isDataChanged = function()
{
  var self = this;
  
  if (self.points.length != (T+1)) return true;
  
  for (var i = 0; i < self.points.length; i++) {
    if (Math.abs(self.points[i]["y"] - R[i]) > 1e-5) return true;
  }
  return false;
}

lineGraph.prototype.recalculate = function()
{
  var self = this;
  
  if (!self.options.allowDrag) return;
  if (!self.options.allowDelete) return;
  
  if (!self.isDataChanged()) return;
  
  autoInterpolatePath();
  
  for (var i = 0; i < self.points.length; i++) {
    R[i] = self.points[i]["y"];
  }
  
  recalculateAndUpdateGraphs();
}

