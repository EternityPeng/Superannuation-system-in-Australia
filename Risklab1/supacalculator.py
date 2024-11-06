#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Aug 12 12:27:28 2019

@author: soongyingquah
"""

from flask import request
from flask import make_response

import numpy as np

import modules.SimulationExtendedSUPA as SIM
import modules.AccumulationUser2 as Accumulation

import json
import datetime

def main():
    if request.method == "POST":
        
        # form data requested via jQuery
        age = int(request.form['age'])
        income = float(request.form['income'])
        strategy = str(request.form['strategy'])
        fund_level = str(request.form['fundlevel'])
        super_balance_init = float(request.form['superbal'])
        
        starting_year = datetime.date.today().year
        SG = True # assume there is super guarantee
        
        NumOfSim = 10000 # initialize simulated path as 1000
        NumOfTime = 68 - age# assume that 67 is retirement age, this is accumulating years of life
        freq = 1         # rebalancing frequency (rebalances per year)
        back_test = 0    # it is forward simulation
        
        # simulates the number of years until retirement age
        time = np.arange(age, 68) 
        
        # calls ExtendedSUPA class to get calibrated data and simulates economic variables
        model_ExtSUPA = SIM.ExtendedSUPA('./data/supa/calib9218.csv')
        model_ExtSUPA.ForwardSimulation(NumOfSim, NumOfTime+1, freq, back_test)
        supa_X = model_ExtSUPA.SIM_X #get SIM variable data
        
        # calls AccumulationUser class with form data 
        Acc = Accumulation.AccumulationUser("","",age,starting_year,income,\
                                            NumOfTime, strategy,super_balance_init,fund_level)
        
        Acc.SUPA_SIM(supa_X) #intialize SUPA_SIM function 
        Acc.Super_accumulation(SG) #calculate superbalance accumulation
        Acc.Superbalance_percentile()
        
        # appends median data to end of array
        # only get the last 1000 elements for showing monte carlo paths of accumulated super balance
        Superbalance = np.vstack((Acc.Super_balance[-200:],Acc.superbalance_median))
        
        # forms json data to return back to POST request
        jsonData = make_response('{"superBal": ' + json.dumps(Superbalance.tolist()) + \
                                   ',"year": ' + json.dumps(time.tolist()) +  \
                                   ',"xdistPlot": ' + json.dumps(Acc.data_points[0].tolist()) + \
                                   ',"ydistPlot": ' + json.dumps(Acc.data_points[1].tolist()) + \
                                   ',"histdata": ' + json.dumps(Acc.hist_data) + \
                                   ',"Perctl": ' + json.dumps(Acc.Perctl.tolist()) + '}')
        return jsonData
        