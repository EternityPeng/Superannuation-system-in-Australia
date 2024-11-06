# supa model

from flask import request
from flask import make_response

import numpy as np
import pandas as pd

import sys
sys.path.append("modules")

import modules.SimulationExtendedSUPA as SIM


import logging
import json


def getSimulateData(m_sim, t_max):
    # read csv file and save as Dictionary
    #model_ExtSUPA = SIM.ExtendedSUPA('data\\supa\\calib9218.csv')
    model_ExtSUPA = SIM.ExtendedSUPA('./data/supa/calib9218.csv')
    params = model_ExtSUPA.Dictionary_Param
    numVar = model_ExtSUPA.Dictionary_Param['NumVar']

    freq = 1         # rebalancing frequency (rebalances per year)
    back_test = 0    # it is forward simulation

    model_ExtSUPA.ForwardSimulation(m_sim, t_max, freq, back_test)

    supa_X = model_ExtSUPA.SIM_X  # forward simulation for the next T_max years

    dt = 1.0/freq
    t = np.linspace(0, dt*t_max, t_max+1)

    qt = supa_X[:,:,0]
    wt = supa_X[:,:,1]
    lt = supa_X[:,:,2]
    st = supa_X[:,:,3]
    ct = supa_X[:,:,4]
    yt = supa_X[:,:,5]
    dt = supa_X[:,:,6]
    pt = supa_X[:,:,7]
    et = supa_X[:,:,8]
    nt = supa_X[:,:,9]
    bt = supa_X[:,:,10]
    ot = supa_X[:,:,11]
    ht = supa_X[:,:,12]
    ut = supa_X[:,:,13]

    return (params, numVar, t_max, m_sim, t, qt, wt, lt,  st, ct, yt, dt, pt,
            et, nt, bt, ot, ht, ut)


def main():
    logging.info("Supa Model Data")

    if request.method == "POST":

        # set random seed
        #np.random.seed(1000)

        t_max = 20       # number of years after retirement
        m_sim = 10       # number of paths

        (params, numVar, t_max, m_sim, t, qt, wt, lt, st, ct, yt, dt, pt, \
            et, nt, bt, ot, ht, ut) = getSimulateData(m_sim, t_max)

        #df = pd.read_csv('data\\supa\\sim_hist9218.csv')
        #df_percentiles = pd.read_csv('data\\supa\\percentile1959.csv')
        df = pd.read_csv('./data/supa/sim_hist9218.csv')
        df_percentiles = pd.read_csv('./data/supa/percentile1959.csv')

        #Set graph variables.
        xlabels = ["Time (years)"]

        ylabels = ["q(t)",
                   'w(t)',
                   'l(t)',
                   's(t)',
                   'c(t)',
                   'y(t)',
                   'd(t)',
                   'p(t)',

                   'e(t)',
                   'n(t)',
                   'b(t)',
                   'o(t)',
                   'h(t)',
                   'u(t)']

        graphTitles = ["Inflation q(t)",
                   'Wage Inflation w(t)',
                   'Long Term Interest Rate l(t)',
                   'Short Term Interest Rate s(t)',
                   'Cash Return c(t)',
                   'Domestic Dividend Yield y(t)',
                   'Domestic Dividend Growth Rate d(t)',
                   'Domestic Equity Price Return p(t)',

                   'Domestic Equity Total Return e(t)',
                   'International Equity Total Return n(t)',
                   'Domestic Bond Return b(t)',
                   'International Bond Return o(t)',
                   'House Price Growth Rate h(t)',
                   'Unemployment Rate u(t)']

        #Format the response and return.
        returner = make_response('{"numVar": ' + json.dumps(numVar) +
                ', "params": ' + json.dumps(params) +

                ', "xlabels": ' + json.dumps(xlabels) +
                ', "ylabels": ' + json.dumps(ylabels) +
                ', "graphTitles": ' + json.dumps(graphTitles) +

                ', "t_max": ' + json.dumps(t_max) +
                ', "m_sim": ' + json.dumps(m_sim) +

                # new data:
                ', "t": ' + json.dumps(t.tolist()) +

                ', "qt": ' + json.dumps(qt.tolist()) +
                ', "wt": ' + json.dumps(wt.tolist()) +
                ', "lt": ' + json.dumps(lt.tolist()) +
                ', "st": ' + json.dumps(st.tolist()) +
                ', "ct": ' + json.dumps(ct.tolist()) +
                ', "yt": ' + json.dumps(yt.tolist()) +
                ', "dt": ' + json.dumps(dt.tolist()) +
                ', "pt": ' + json.dumps(pt.tolist()) +

                ', "et": ' + json.dumps(et.tolist()) +
                ', "nt": ' + json.dumps(nt.tolist()) +
                ', "bt": ' + json.dumps(bt.tolist()) +
                ', "ot": ' + json.dumps(ot.tolist()) +
                ', "ht": ' + json.dumps(ht.tolist()) +
                ', "ut": ' + json.dumps(ut.tolist()) +

                # historical data:
                ', "hist_t": ' + json.dumps(df['tt'].values.tolist()) +

                ', "hist_qt": ' + json.dumps(df['qt'].values.tolist()) +
                ', "hist_wt": ' + json.dumps(df['wt'].values.tolist()) +
                ', "hist_lt": ' + json.dumps(df['lt'].values.tolist()) +
                ', "hist_st": ' + json.dumps(df['st'].values.tolist()) +
                ', "hist_ct": ' + json.dumps(df['ct'].values.tolist()) +
                ', "hist_yt": ' + json.dumps(df['yt'].values.tolist()) +
                ', "hist_dt": ' + json.dumps(df['dt'].values.tolist()) +
                ', "hist_pt": ' + json.dumps(df['pt'].values.tolist()) +

                ', "hist_et": ' + json.dumps(df['et'].values.tolist()) +
                ', "hist_nt": ' + json.dumps(df['nt'].values.tolist()) +
                ', "hist_bt": ' + json.dumps(df['bt'].values.tolist()) +
                ', "hist_ot": ' + json.dumps(df['ot'].values.tolist()) +
                ', "hist_ht": ' + json.dumps(df['ht'].values.tolist()) +
                ', "hist_ut": ' + json.dumps(df['ut'].values.tolist()) +

                # percentile data:
                ', "qt5": ' + json.dumps(df_percentiles['qt5'].values.tolist()) +
                ', "qt25": ' + json.dumps(df_percentiles['qt25'].values.tolist()) +
                ', "qt50": ' + json.dumps(df_percentiles['qt50'].values.tolist()) +
                ', "qt75": ' + json.dumps(df_percentiles['qt75'].values.tolist()) +
                ', "qt95": ' + json.dumps(df_percentiles['qt95'].values.tolist()) +

                ', "wt5": ' + json.dumps(df_percentiles['wt5'].values.tolist()) +
                ', "wt25": ' + json.dumps(df_percentiles['wt25'].values.tolist()) +
                ', "wt50": ' + json.dumps(df_percentiles['wt50'].values.tolist()) +
                ', "wt75": ' + json.dumps(df_percentiles['wt75'].values.tolist()) +
                ', "wt95": ' + json.dumps(df_percentiles['wt95'].values.tolist()) +

                ', "lt5": ' + json.dumps(df_percentiles['lt5'].values.tolist()) +
                ', "lt25": ' + json.dumps(df_percentiles['lt25'].values.tolist()) +
                ', "lt50": ' + json.dumps(df_percentiles['lt50'].values.tolist()) +
                ', "lt75": ' + json.dumps(df_percentiles['lt75'].values.tolist()) +
                ', "lt95": ' + json.dumps(df_percentiles['lt95'].values.tolist()) +

                ', "st5": ' + json.dumps(df_percentiles['st5'].values.tolist()) +
                ', "st25": ' + json.dumps(df_percentiles['st25'].values.tolist()) +
                ', "st50": ' + json.dumps(df_percentiles['st50'].values.tolist()) +
                ', "st75": ' + json.dumps(df_percentiles['st75'].values.tolist()) +
                ', "st95": ' + json.dumps(df_percentiles['st95'].values.tolist()) +

                ', "ct5": ' + json.dumps(df_percentiles['ct5'].values.tolist()) +
                ', "ct25": ' + json.dumps(df_percentiles['ct25'].values.tolist()) +
                ', "ct50": ' + json.dumps(df_percentiles['ct50'].values.tolist()) +
                ', "ct75": ' + json.dumps(df_percentiles['ct75'].values.tolist()) +
                ', "ct95": ' + json.dumps(df_percentiles['ct95'].values.tolist()) +

                ', "yt5": ' + json.dumps(df_percentiles['yt5'].values.tolist()) +
                ', "yt25": ' + json.dumps(df_percentiles['yt25'].values.tolist()) +
                ', "yt50": ' + json.dumps(df_percentiles['yt50'].values.tolist()) +
                ', "yt75": ' + json.dumps(df_percentiles['yt75'].values.tolist()) +
                ', "yt95": ' + json.dumps(df_percentiles['yt95'].values.tolist()) +

                ', "dt5": ' + json.dumps(df_percentiles['dt5'].values.tolist()) +
                ', "dt25": ' + json.dumps(df_percentiles['dt25'].values.tolist()) +
                ', "dt50": ' + json.dumps(df_percentiles['dt50'].values.tolist()) +
                ', "dt75": ' + json.dumps(df_percentiles['dt75'].values.tolist()) +
                ', "dt95": ' + json.dumps(df_percentiles['dt95'].values.tolist()) +

                ', "pt5": ' + json.dumps(df_percentiles['pt5'].values.tolist()) +
                ', "pt25": ' + json.dumps(df_percentiles['pt25'].values.tolist()) +
                ', "pt50": ' + json.dumps(df_percentiles['pt50'].values.tolist()) +
                ', "pt75": ' + json.dumps(df_percentiles['pt75'].values.tolist()) +
                ', "pt95": ' + json.dumps(df_percentiles['pt95'].values.tolist()) +

                ', "et5": ' + json.dumps(df_percentiles['et5'].values.tolist()) +
                ', "et25": ' + json.dumps(df_percentiles['et25'].values.tolist()) +
                ', "et50": ' + json.dumps(df_percentiles['et50'].values.tolist()) +
                ', "et75": ' + json.dumps(df_percentiles['et75'].values.tolist()) +
                ', "et95": ' + json.dumps(df_percentiles['et95'].values.tolist()) +

                ', "nt5": ' + json.dumps(df_percentiles['nt5'].values.tolist()) +
                ', "nt25": ' + json.dumps(df_percentiles['nt25'].values.tolist()) +
                ', "nt50": ' + json.dumps(df_percentiles['nt50'].values.tolist()) +
                ', "nt75": ' + json.dumps(df_percentiles['nt75'].values.tolist()) +
                ', "nt95": ' + json.dumps(df_percentiles['nt95'].values.tolist()) +

                ', "bt5": ' + json.dumps(df_percentiles['bt5'].values.tolist()) +
                ', "bt25": ' + json.dumps(df_percentiles['bt25'].values.tolist()) +
                ', "bt50": ' + json.dumps(df_percentiles['bt50'].values.tolist()) +
                ', "bt75": ' + json.dumps(df_percentiles['bt75'].values.tolist()) +
                ', "bt95": ' + json.dumps(df_percentiles['bt95'].values.tolist()) +

                ', "ot5": ' + json.dumps(df_percentiles['ot5'].values.tolist()) +
                ', "ot25": ' + json.dumps(df_percentiles['ot25'].values.tolist()) +
                ', "ot50": ' + json.dumps(df_percentiles['ot50'].values.tolist()) +
                ', "ot75": ' + json.dumps(df_percentiles['ot75'].values.tolist()) +
                ', "ot95": ' + json.dumps(df_percentiles['ot95'].values.tolist()) +

                ', "ht5": ' + json.dumps(df_percentiles['ht5'].values.tolist()) +
                ', "ht25": ' + json.dumps(df_percentiles['ht25'].values.tolist()) +
                ', "ht50": ' + json.dumps(df_percentiles['ht50'].values.tolist()) +
                ', "ht75": ' + json.dumps(df_percentiles['ht75'].values.tolist()) +
                ', "ht95": ' + json.dumps(df_percentiles['ht95'].values.tolist()) +

                ', "ut5": ' + json.dumps(df_percentiles['ut5'].values.tolist()) +
                ', "ut25": ' + json.dumps(df_percentiles['ut25'].values.tolist()) +
                ', "ut50": ' + json.dumps(df_percentiles['ut50'].values.tolist()) +
                ', "ut75": ' + json.dumps(df_percentiles['ut75'].values.tolist()) +
                ', "ut95": ' + json.dumps(df_percentiles['ut95'].values.tolist()) +

                '}')

        return returner


def recalculate():

    logging.info("Supa Model - Recalculating Path")
    if request.method == "POST":

        t_max =  int(request.form['numYears'])       # number of years after retirement
        m_sim = int(request.form['numPaths'])        # number of paths

        #print ("super recalculate!")
        #print (t_max)
        #print (m_sim)

        (params, numVar, t_max, m_sim, t, qt, wt, lt, st, ct, yt, dt, pt, \
            et, nt, bt, ot, ht, ut) = getSimulateData(m_sim, t_max)

        #Set graph variables.
        xlabels = ["Time (years)"]

        ylabels = ["q(t)",
                   'w(t)',
                   'l(t)',
                   's(t)',
                   'c(t)',
                   'y(t)',
                   'd(t)',
                   'p(t)',

                   'e(t)',
                   'n(t)',
                   'b(t)',
                   'o(t)',
                   'h(t)',
                   'u(t)']

        graphTitles = ["Inflation q(t)",
                   'Wage Inflation w(t)',
                   'Long Term Interest Rate l(t)',
                   'Short Term Interest Rate s(t)',
                   'Cash Return c(t)',
                   'Domestic Dividend Yield y(t)',
                   'Domestic Dividend Growth Rate d(t)',
                   'Domestic Equity Price Return p(t)',

                   'Domestic Equity Total Return e(t)',
                   'International Equity Total Return n(t)',
                   'Domestic Bond Return b(t)',
                   'International Bond Return o(t)',
                   'House Price Growth Rate h(t)',
                   'Unemployment Rate u(t)']

        #Format the response and return.
        returner = make_response('{"numVar": ' + json.dumps(numVar) +
                ', "params": ' + json.dumps(params) +

                ', "xlabels": ' + json.dumps(xlabels) +
                ', "ylabels": ' + json.dumps(ylabels) +
                ', "graphTitles": ' + json.dumps(graphTitles) +

                ', "t_max": ' + json.dumps(t_max) +
                ', "m_sim": ' + json.dumps(m_sim) +

                ', "t": ' + json.dumps(t.tolist()) +

                ', "qt": ' + json.dumps(qt.tolist()) +
                ', "wt": ' + json.dumps(wt.tolist()) +
                ', "lt": ' + json.dumps(lt.tolist()) +
                ', "st": ' + json.dumps(st.tolist()) +
                ', "ct": ' + json.dumps(ct.tolist()) +
                ', "yt": ' + json.dumps(yt.tolist()) +
                ', "dt": ' + json.dumps(dt.tolist()) +
                ', "pt": ' + json.dumps(pt.tolist()) +

                ', "et": ' + json.dumps(et.tolist()) +
                ', "nt": ' + json.dumps(nt.tolist()) +
                ', "bt": ' + json.dumps(bt.tolist()) +
                ', "ot": ' + json.dumps(ot.tolist()) +
                ', "ht": ' + json.dumps(ht.tolist()) +
                ', "ut": ' + json.dumps(ut.tolist()) +
                '}')

        return returner


def combine_t(df, key, d2, offset):
    t1 = df[key].values
    t2 = d2 + offset
    t3 = np.concatenate([t1, t2])
    return t3


if __name__ == "__main__":
    np.random.seed(1000)

    t_max = 20       # number of years after retirement
    m_sim = 10       # number of paths

    (params, numVar, t_max, m_sim, t, qt, wt, lt, st, ct, yt, dt, pt, \
        et, nt, bt, ot, ht, ut) = getSimulateData(m_sim, t_max)

    df = pd.read_csv('./data/supa/sim_hist9218.csv')

    t_new = t.tolist()
    hist_t = df['tt'].values.tolist()
    t_all = combine_t(df, 'tt', t, 2019)

    hist_qt = df['qt'].values.tolist()
    hist_wt = df['wt'].values.tolist()
    hist_lt = df['lt'].values.tolist()
    hist_st = df['st'].values.tolist()
    hist_ct = df['ct'].values.tolist()
    hist_yt = df['yt'].values.tolist()
    hist_dt = df['dt'].values.tolist()
    hist_pt = df['pt'].values.tolist()

    hist_et = df['et'].values.tolist()
    hist_nt = df['nt'].values.tolist()
    hist_bt = df['bt'].values.tolist()
    hist_ot = df['ot'].values.tolist()
    hist_ht = df['ht'].values.tolist()
    hist_ut = df['ut'].values.tolist()

    df_percentiles = pd.read_csv('./data/supa/percentile1959.csv')

    qt5 = df_percentiles['qt5'].values.tolist()
    qt25 = df_percentiles['qt25'].values.tolist()
    qt50 = df_percentiles['qt50'].values.tolist()
    qt75 = df_percentiles['qt75'].values.tolist()
    qt95 = df_percentiles['qt95'].values.tolist()
