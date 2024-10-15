
// adjust padding-bottom of .svg-container and .svg-inwrap:
var pricelineAspectRatioWidth = 1500;
var pricelineAspectRatioHeight = 600;  // default value, updated later

updateFromCheckboxes();

var supaData = getSupaData();         // string

//JSON is a string that holds the supaData and
//JSON.parse converts the string into variables.
//"{'data': Array.String}" ---> {"data": Array}
supaData = JSON.parse(supaData);      // object

xlabels = supaData["xlabels"];
ylabels = supaData["ylabels"];

graphTitles = supaData["graphTitles"];

t_max = supaData["t_max"];
m_sim = supaData["m_sim"];

hist_t = supaData["hist_t"];

hist_qt = supaData["hist_qt"];
hist_wt = supaData["hist_wt"];
hist_lt = supaData["hist_lt"];
hist_st = supaData["hist_st"];
hist_ct = supaData["hist_ct"];
hist_yt = supaData["hist_yt"];
hist_dt = supaData["hist_dt"];
hist_pt = supaData["hist_pt"];

hist_et = supaData["hist_et"];
hist_nt = supaData["hist_nt"];
hist_bt = supaData["hist_bt"];
hist_ot = supaData["hist_ot"];
hist_ht = supaData["hist_ht"];
hist_ut = supaData["hist_ut"];

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

// percentiles:
percentile_qt = getPercentileArray(supaData, hist_qt, "qt")
percentile_wt = getPercentileArray(supaData, hist_wt, "wt")
percentile_lt = getPercentileArray(supaData, hist_lt, "lt")
percentile_st = getPercentileArray(supaData, hist_st, "st")
percentile_ct = getPercentileArray(supaData, hist_ct, "ct")
percentile_yt = getPercentileArray(supaData, hist_yt, "yt")
percentile_dt = getPercentileArray(supaData, hist_dt, "dt")
percentile_pt = getPercentileArray(supaData, hist_pt, "pt")
percentile_et = getPercentileArray(supaData, hist_et, "et")
percentile_nt = getPercentileArray(supaData, hist_nt, "nt")
percentile_bt = getPercentileArray(supaData, hist_bt, "bt")
percentile_ot = getPercentileArray(supaData, hist_ot, "ot")
percentile_ht = getPercentileArray(supaData, hist_ht, "ht")
percentile_ut = getPercentileArray(supaData, hist_ut, "ut")

transition_duration = 0;
transition_delay = 0;

[tt_all, qt_all, wt_all, lt_all, st_all, ct_all, yt_all, dt_all, pt_all,
         et_all, nt_all, bt_all, ot_all, ht_all, ut_all] = updateFromHistData();

[tt_pct, qt_pct, wt_pct, lt_pct, st_pct, ct_pct, yt_pct, dt_pct, pt_pct,
         et_pct, nt_pct, bt_pct, ot_pct, ht_pct, ut_pct] = updatePercentiles();

document.getElementById("frameNumber").value = minFrameNum;

document.getElementById("numYears").value = t_max;

document.getElementById("numPaths").value = m_sim;

var colors = findColors(m_sim);

graphs = [];
graphs = graphs.concat(getNewGraph("pathSVG-qt", 0, qt_all, qt_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-wt", 1, wt_all, wt_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-lt", 2, lt_all, lt_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-st", 3, st_all, st_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-ct", 4, ct_all, ct_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-yt", 5, yt_all, yt_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-dt", 6, dt_all, dt_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-pt", 7, pt_all, pt_pct, tt_all, tt_pct, colors));

graphs = graphs.concat(getNewGraph("pathSVG-et", 8, et_all, et_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-nt", 9, nt_all, nt_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-bt", 10, bt_all, bt_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-ot", 11, ot_all, ot_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-ht", 12, ht_all, ht_pct, tt_all, tt_pct, colors));
graphs = graphs.concat(getNewGraph("pathSVG-ut", 13, ut_all, ut_pct, tt_all, tt_pct, colors));

max_num_graphs = graphs.length;

transition_duration = tduration;
transition_delay = tdelay;

//vis_showBorders();

displayDataPoints();
showPercentiles();
