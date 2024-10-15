#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Thu Sep 12 11:24:00 2019

@author: soongyingquah
"""

from flask import request
from flask import make_response

import sys
sys.path.append("modules")

import numpy as np

import SimulationExtendedSUPA as SIM
from RetirementIncome2 import RetirementIncome as RI

import json
import datetime

def main():
    if request.method == "POST":
        Model_ExtSUPA = SIM.ExtendedSUPA('./data/calib9218.csv')
        Model_ExtSUPA.Dictionary_Param
        # define number of variables in extended SUPA model
        Model_ExtSUPA.NumOfVariable=Model_ExtSUPA.Dictionary_Param['NumVar']

        # form data requested via jQuery
        gender = str(request.form['gender'])
        home = str(request.form['home'])
        super_balance = float(request.form['superbalance'])
        testable = int(request.form['testable'])
        financial = int(request.form['financial'])
        income_wkly = int(request.form['income_wkly'])
        annuity = float(request.form['annuity'])
        strategy = str(request.form['strategy'])
        fund_level = str(request.form['fundlevel'])
        withdrawal = str(request.form['withdrawal'])

        if annuity > 0: 
            annuity = annuity/100
        
        M_sim = 10000 # initialize simulated path as 1000
        freq = 1         # rebalancing frequency (rebalances per year)
        back_test = 0    # it is forward simulation
        life_expectancy = 104
        retired_age = 67
        T_max = life_expectancy - retired_age
        relationship = ['single','couple']
        
        # simulates the number of years until retirement age
        time = np.arange(retired_age, life_expectancy+2) 
        
        # calls ExtendedSUPA class to get calibrated data and simulates economic variables
        Model_ExtSUPA.ForwardSimulation(M_sim, T_max, freq, back_test) 
        SUPA_X = Model_ExtSUPA.SIM_X
        
        ## RetirementIncome class
        r_risky = strategy
        A_annuity = annuity
        withdrawal_strategy_3 = ['minimum','minimumplus','4percentRule','RoT']
        # dd strategies
        targeted_income = ['na','modest','comfortable',60000] # when use withdrawal-strategy e.g. minimum, the targeted_income should be 'na'
        
        if withdrawal in withdrawal_strategy_3:
            t_income = targeted_income[0]
        else:
            if withdrawal == 'luxury':
                t_income = targeted_income[3]
                withdrawal = withdrawal_strategy_3[0]
            else:
                t_income = withdrawal
                withdrawal = withdrawal_strategy_3[0]
            
        if A_annuity > 0 :
            r_risky = np.minimum(0.5/(1-A_annuity),1)
    
    
        RetirementIncomeA = RI("Mo", retired_age, gender, 
                               relationship[0], #relationship: 0 single, 1 couple
                               super_balance, 
                               testable,financial,income_wkly,home,T_max,
                               r_risky, fund_level,
                               withdrawal,
                               A_annuity,
                               t_income
                               )                                     
        RetirementIncomeA.SUPA_SIM(SUPA_X) # read in SUPA simulation
        RetirementIncomeA.RISimulation()   # simulate RI
           
        # form stackplot data
        stackRI = {}
        i=0
        for k in range(retired_age, life_expectancy+1):
            stackRI[str(k)] = np.transpose(RetirementIncomeA.StackRI).tolist()[k-retired_age]
            
        # forms json data to return back to POST request
        jsonData = make_response('{"year": ' + json.dumps(time.tolist()) + \
                                   ',"Consumption": ' + json.dumps(RetirementIncomeA.ConsumpRI.tolist()) + \
                                   ',"Super": ' + json.dumps(RetirementIncomeA.superRI.tolist()) + \
                                   ',"AgePension": ' + json.dumps(RetirementIncomeA.AgePensionRI.tolist()) + \
                                   ',"SuperW": ' + json.dumps(RetirementIncomeA.superWRI.tolist()) + \
                                   ',"StackPlot": ' + json.dumps(stackRI) + '}')
        return jsonData
        