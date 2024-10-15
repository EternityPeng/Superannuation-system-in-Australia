var equityReturnLineColor = 'seagreen';
var wealthLineColor = 'GoldenRod';

var barChartAColor = 'Tomato';      // equity
var barChartBColor = 'LightSkyBlue';    // cash

var aaData = getAAData();         // string

//JSON is a string that holds the aaData and
//JSON.parse converts the string into variables.
//"{'data': Array.String}" ---> {"data": Array}
aaData = JSON.parse(aaData);      // object

rf = aaData["rf"];

L = aaData["L"];
U = aaData["U"];

weight0 = aaData["weight0"];
W0 = aaData["W0"];

T = aaData["T"];
dt = 1/T;

R = aaData["R"];

pi = Math.PI;

w1 = new Array(13).fill(1);

w_cash = new Array(T+1).fill(0);  // weights of cash
w_cash[0] = weight0;

w_equity = new Array(T+1).fill(0);
w_equity[0] = 1- w_cash[0];

Wealth = new Array(T+1).fill(0);  // wealths under optimal portfolio weights
Wealth[0] = W0;

x_pos = d3.range(0,T+1);

coef_tt = aaData["coef_tt"];
std_tt = aaData["std_tt"];

NumOfStrategy = coef_tt[0].length;

transition_duration = 0;
transition_delay = 0;

calWealthWeight();

var pricelineAspectRatioWidth = 1500;
var pricelineAspectRatioHeight = 400;  // default value, updated later
var barchartAspectRatioHeight = 400;  // default value, updated later

document.getElementById("frameNumber").value = initFrameNum;

findBarchartHeight();
findLineGraphHeight();

graph1 = new lineGraph("pathSVG1", {
      "title": aaData["graphTitles"][0],
      "xlabel": aaData["xlabels"][0],
      "ylabel": aaData["ylabels"][0],
      "strokeColor": equityReturnLineColor,
      "graphID": "1",
      "ytooltipAxis": 0,
      "allowDrag": true,
      "allowDelete": true,
      "width": pricelineAspectRatioWidth,
      "height": pricelineAspectRatioHeight
    }, R);

graph2 = new lineGraph("pathSVG2", {
      "title": aaData["graphTitles"][2],
      "xlabel": aaData["xlabels"][2],
      "ylabel": aaData["ylabels"][2],
      "strokeColor": wealthLineColor,
      "graphID": "2",
      "ytooltipAxis": 1,
      "allowDrag": false,
      "allowDelete": false,
      "width": pricelineAspectRatioWidth,
      "height": pricelineAspectRatioHeight
    }, Wealth);

barchart1 = new barChart("pathSVG3", {
      "title": aaData["graphTitles"][1],
      "xlabel": aaData["xlabels"][1],
      "ylabel": aaData["ylabels"][1],
      "graphID": "3",
      "ytooltipAxis": 0,
      "width": pricelineAspectRatioWidth,
      "height": barchartAspectRatioHeight,
      "tooltipType": "Equity"
    }, w_equity);

transition_duration = tduration;
transition_delay = tdelay;

if (priceEditOn) {
  updateEditPrices();
}

//vis_showBorders();
