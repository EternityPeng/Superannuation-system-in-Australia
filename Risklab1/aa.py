# asset allocation for (cash, 1 asset) only

from flask import request
from flask import make_response

import numpy as np
from scipy.stats import norm
import scipy.io as sio
import math

import logging
import json


def main():
  logging.info("Asset Allocation Data")

  if request.method == "POST":
      
    #np.random.seed(555)

    rf = 0.036  # risk-free annual interest rate

    a = 1.052800163
    b = -0.19616424
    sig_R = 0.12939376171063691

    L = 1
    U = 1.1

    weight0 = 0.16  # initial weight of cash

    W0 = 1          # initial wealth

    T = 12       # number of months
    dt = 1/T

    b0 = (a-1)*dt
    b1 = b*dt
    sig = sig_R*math.sqrt(dt)

    #Set graph variables.
    xlabels = ["Time Step (months)",
               'Time Step (months)',
               'Time Step (months)']
    
    ylabels = ["Equity Return",
               'Portfolio Weights',
               'Cumulative Wealth']
    
    graphTitles = ["Time Series of Equity Return",
                   'Portfolio Allocation',
                   'Time Series of Cumulative Wealth']

    zt = np.random.normal(0.0, 1.0, T)
    
    R = np.zeros([T+1])  # returns of asset, initial return = 0
    for tt in range(1,T+1,1):
      R[tt] = b0 + b1*R[tt-1] + sig*zt[tt-1]

    pydict = sio.loadmat("../data/aa/aa.mat")
    coef_tt = pydict.get('coef_tt')
    std_tt = pydict.get('std_tt')
    std = std_tt.squeeze()

    #Format the response and return.
    returner = make_response('{"rf": ' + json.dumps(rf) + 
            ', "L": ' + json.dumps(L) + 
            ', "U": ' + json.dumps(U) + 
            ', "weight0": ' + json.dumps(weight0) + 
            ', "W0": ' + json.dumps(W0) + 
            ', "T": ' + json.dumps(T) + 
            ', "xlabels": ' + json.dumps(xlabels) + 
            ', "ylabels": ' + json.dumps(ylabels) + 
            ', "graphTitles": ' + json.dumps(graphTitles) + 
            ', "R": ' + json.dumps(R.tolist()) + 
            ', "coef_tt": ' + json.dumps(coef_tt.tolist()) + 
            ', "std_tt": ' + json.dumps(std.tolist()) + 
            '}')

    return returner


def recalculate():

  logging.info("Asset Allocation - Recalculating Path")
  if request.method == "POST":

    a = 1.052800163
    b = -0.19616424
    sig_R = 0.12939376171063691

    T = 12       # number of months
    dt = 1/T

    b0 = (a-1)*dt
    b1 = b*dt
    sig = sig_R*math.sqrt(dt)

    zt = np.random.normal(0.0, 1.0, T)
    
    R = np.zeros([T+1])  # returns of asset, initial return = 0
    for tt in range(1,T+1,1):
      R[tt] = b0 + b1*R[tt-1] + sig*zt[tt-1]

    #logging.info("R: " + json.dumps(R.tolist()));

    returner = make_response('{"R": ' + json.dumps(R.tolist()) + '}')
    
    return returner
