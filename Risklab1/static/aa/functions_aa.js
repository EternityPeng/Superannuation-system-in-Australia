// initial settings:
var initFrameNum = 0;

// turn on "Enable Price Editing"?
var priceEditOn = true;

// true to indicate not playing animation yet:
var initPlay = true;

var animateSpeed = 600;    // in milliseconds

// bc = "bar chart"
var bc_title_font_size = "1.9vw";
var bc_axis_font_size = "1.5vw";

// lg = "line graph"
var lg_title_font_size = "2.5vw";
var lg_axis_font_size = "2.2vw";

var graph_background_color = "LavenderBlush";

var tooltip_color = "blue";
var tooltip_radius = 14;

var datapoint_radius = 10;

var tduration = 2500;
var tdelay = 300;
var transition_easing = d3.easeSin;


//Function to send a POST request to python for the aa data. 
//This will return a JSON encoded string containing the times,
//prices and selection matrix that has been computed.
function getAAData() {
    var jqXHR = $.ajax({
        type: "POST",
        url: "http://" + ip_addr + ":5000/aa_main",
        async: false,
        //timeout: 18000,
        data: {curve: 1}
    });
    
    var str = jqXHR.statusText;

    return jqXHR.responseText;
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
    number2 *= 1.01;
  else
    number2 *= 0.99;
  return Math.ceil(number2/n) * n;
}

function roundToMinNearest(number, n) {
  var number2 = number;
  if (number2 < 0)
    number2 *= 1.01;
  else
    number2 *= 0.99;
  return Math.floor(number2/n) * n;
}

var formatFloat = function(float, precision) {
  return float.toFixed(precision);
}

var lg_x_tooltipLabel = function(d) { 
  return "Month: " + formatFloat(d.x, 0);
}

var lg_y_tooltipLabel = function(d) {
  return formatFloat(d.y, 5);
}

var bisectValues = 
  d3.bisector(function(d) { 
    return d.x; 
  }).left;

// Enable path editing through user input.
function updateEditPrices() {
  var editPrices = document.getElementById("editPrices").value;

  var circles1 = graph1.vis.select("svg")
                       .selectAll("circle")
                       .data(graph1.points);

  var circles2 = graph2.vis.select("svg")
                       .selectAll("circle")
                       .data(graph2.points);

  if (editPrices === "Off") {
    document.getElementById("editPrices").value = "On";
    
    circles1.style("opacity", 1);
    circles1.on("mousedown.drag",  graph1.datapoint_drag());
    circles1.on("touchstart.drag", graph1.datapoint_drag());
    
    // not allowed to drag Wealth graph:
    circles2.style("opacity", 1);
    //circles2.on("mousedown.drag",  graph2.datapoint_drag());
    //circles2.on("touchstart.drag", graph2.datapoint_drag());
  }
  else {
    document.getElementById("editPrices").value = "Off";
    
    circles1.style("opacity", 0);
    circles1.on("mousedown.drag",  null);
    circles1.on("touchstart.drag", null);
    
    circles2.style("opacity", 0);
    //circles2.on("mousedown.drag",  null);
    //circles2.on("touchstart.drag", null);
  }
}

var erf = function(x) {
  var a1 =  0.254829592;
  var a2 = -0.284496736;
  var a3 =  1.421413741;
  var a4 = -1.453152027;
  var a5 =  1.061405429;
  var p  =  0.3275911;
  
  var sign = x >= 0 ? 1 : -1;
  var y = Math.abs(x);
  var t = 1.0/(1.0 + p*y);
  var y2 = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);
  return sign*y2;
}

var normalCdf = function(x, mean, variance) {
  return 0.5 * (1 + erf((x - mean) / (Math.sqrt(2 * variance))));
}

var stdNormalCdf = function(x) {
  return normalCdf(x, 0, 1);
}

var stdNormalPdf = function(x) {
  return Math.exp(-x*x/2)/Math.sqrt(2*pi);
}

var calCV = function(R2,W2,coef2,std2,L,U) {
  var EW = 1*coef2[0] + R2*coef2[1] + W2*coef2[2] + R2*W2*coef2[3] + 
    Math.pow(R2,2)*coef2[4] + Math.pow(W2,2)*coef2[5];
  var u1 = (U-EW)/std2;
  var l1 = (L-EW)/std2;
  var CV = (EW-L)*(stdNormalCdf(u1)-stdNormalCdf(l1)) - 
           std2*(stdNormalPdf(u1)-stdNormalPdf(l1));
  return CV;
}

var calWealthWeight = function() {
  var CV_list = new Array(NumOfStrategy).fill(0);
  
  for (var tt=1; tt<T+1; tt++) {
    Wealth[tt] = Wealth[tt-1] * (1 + w_cash[tt-1]*rf*dt + R[tt]*(1-w_cash[tt-1]));
    if (tt < T) {
      coef = coef_tt[tt-1];
      std = std_tt[tt-1];
      for (var wi=0; wi<NumOfStrategy; wi++) {
        CV_list[wi] = calCV(R[tt],Wealth[tt],coef[wi],std[wi],L,U);
      }
      w_cash[tt] = CV_list.indexOf(Math.max.apply(Math, CV_list)) / 100;
      w_equity[tt] = 1- w_cash[tt];
    }
  }
  w_cash[T] = w_cash[T-1];
  w_equity[T] = 1- w_cash[T];
}

/**
  Function called when the user updates the frame number. 
  This will update the plot with the appropriate line data.
*/
function frameChangeUpdate(userChanging = true){

  var newFrame = document.getElementById("frameNumber").value;

  if (newFrame > T) {
    newFrame = T;
    document.getElementById("frameNumber").value = newFrame;

    if (userChanging) {
      alert("You have reached the maximum frame number");
    }
  }
  
  var d1 = graph1.findPoint(newFrame);
  graph1.updateTooltips(d1);
  var dspAssetReturn = 'Asset Return = ';
  if (typeof d1 != "undefined") {
    dspAssetReturn += formatFloat(d1["y"], 5);
  }
  
  var d2 = graph2.findPoint(newFrame);
  graph2.updateTooltips(d2);
  var dspWealth = 'Wealth = ';
  if (typeof d2 != "undefined") {
    dspWealth += formatFloat(d2["y"], 5);
  }
  
  var d3 = barchart1.findPoint(newFrame);
  barchart1.updateTooltips(d3);
  var dspWeights = 'Weights: Cash = ';
  if (typeof d3 != "undefined") {
    dspWeights += formatFloat(d3["y"]*100, 0) + '%, Equity = ' +
      formatFloat((1-d3["y"])*100, 0) + '%';
  }
  
  document.getElementById("debug1").innerHTML = 'Month: ' + newFrame;
  document.getElementById("debug2").innerHTML = dspAssetReturn;
  document.getElementById("debug3").innerHTML = dspWealth;
  document.getElementById("debug4").innerHTML = dspWeights;
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
            var maxtimes = T;

            if (playAnimation === "Pause" && frame.value <= maxtimes) {
                frame.dispatchEvent(new Event('change'));
                frame.value++;
            }
            else {
                // udpate screen for last frame:
                //frame.dispatchEvent(new Event('change'));
                
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

function vis_showBorders() {
  graph1.showBorders();
  graph2.showBorders();
  barchart1.showBorders();
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

var findLineGraphHeight = function () {
  var graph1Width = getCSSWidth("td01");
  var graph1Height = getCSSHeight("td01");
  var aspectHeight = Math.floor(pricelineAspectRatioWidth * 
    graph1Height / graph1Width);
  
  var windowTop = window.innerHeight;

  var graph2Top = document.getElementById("pathSVG3").offsetTop;
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
  
  //document.getElementById("pathSVG1").style.height = newGraph1Height;
  //document.getElementById("pathSVG1").style.paddingBottom = newPaddingBottom;
}

var findBarchartHeight = function () {
  var graph1Width = getCSSWidth("td11");
  var graph1Height = getCSSHeight("td11");
  var aspectHeight = Math.floor(pricelineAspectRatioWidth * 
    graph1Height / graph1Width);
  
  var windowTop = window.innerHeight;

  var graph2Top = document.getElementById("pathSVG3").offsetTop;
  graph2Top += document.getElementById("td11").offsetHeight;
  
  var newGraph1Height = graph1Height + (windowTop - graph2Top)/2 - 20;
  if (newGraph1Height < 0) return;
  
  var newAspectHeight = Math.floor(pricelineAspectRatioWidth * 
    newGraph1Height / graph1Width);
  barchartAspectRatioHeight = newAspectHeight;
    
  var n = newAspectHeight/pricelineAspectRatioWidth*100;
  var newPaddingBottom = n.toFixed(2).concat("%");
  
  $('.svg-container2').css('padding-bottom',newPaddingBottom);
  $('.svg-inwrap2').css('padding-bottom',newPaddingBottom);
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
                      "y": 0});
    }
    
    return newPrices;
  }
  else {
    var newPrices = [];
    var currentTime = 1;

    if (prices[0]["x"] !== 0) {
      newPrices.push({"x": 0, "y": prices[0]["y"]});

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
                      "y": newPrices[lpoint - 1]["y"]});
      currentTime += 1;
    }

    newPrices.sort(function(a, b) {
      if (a.x < b.x) { return -1 };
      if (a.x > b.x) { return  1 };
      return 0
    });

    return newPrices;
  }

  return prices;
}

function turnOnPriceEditing() {
  document.getElementById("editPrices").value = "On";
  
  var circles1 = graph1.vis.select("svg")
                       .selectAll("circle")
                       .data(graph1.points);

  var circles2 = graph2.vis.select("svg")
                       .selectAll("circle")
                       .data(graph2.points);

  circles1.style("opacity", 1);
  circles1.on("mousedown.drag",  graph1.datapoint_drag());
  circles1.on("touchstart.drag", graph1.datapoint_drag());

  circles2.style("opacity", 1);
  //circles2.on("mousedown.drag",  graph2.datapoint_drag());
  //circles2.on("touchstart.drag", graph2.datapoint_drag());
}

// Function that updates whether or not the user would like 
// linear interpolation on.
function autoInterpolatePath() {
  graph1.points = interpolatePrices(graph1.points, graph1.options.xmax);
  graph1.update(false);
  
  graph2.points = interpolatePrices(graph2.points, graph2.options.xmax);
  graph2.update(false);
  
  pathUpdate(false);
  
  turnOnPriceEditing();
}

//Function to send a POST request to python to generate a new random path. 
//This will return a JSON encoded string containing the y values (prices)
//that make up the new path.
function getNewPath() {
    var jqXHR = $.ajax({
        type: "POST",
        url: "http://" + ip_addr + ":5000/aa_recalculate",
        async: false,
        //timeout: 18000,
        data: {curve: 1}
    });

    return jqXHR.responseText;
}

function recalculateAndUpdateGraphs()
{
    calWealthWeight();
    
    graph1.updateData(R);
    graph2.updateData(Wealth);
    barchart1.updateData(w_equity);

    var frame = document.getElementById("frameNumber");
    frame.value = 0;
    frame.dispatchEvent(new Event('change'));  // update graphs
}

// Function that recalculates the path for the user.
function recalculatePath() {
    var pathData = getNewPath();
    pathData = JSON.parse(pathData);

    R = pathData["R"];

    calWealthWeight();
    
    graph1.updateData(R);
    graph2.updateData(Wealth);
    barchart1.updateData(w_equity);

    var frame = document.getElementById("frameNumber");
    frame.value = 0;
    frame.dispatchEvent(new Event('change'));  // update graphs
}

function aaHelpFunc() {
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
    
    var url = "http://" + ip_addr + ":5000/aa_help";
    //window.open(url, "_blank", specs);
    window.open(url);
}
