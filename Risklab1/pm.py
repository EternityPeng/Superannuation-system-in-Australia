#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Sep 30 13:48:14 2019

@author: soongyingquah
"""

from flask import request
from flask import make_response

import sys
sys.path.append("pm")

import numpy as np
import math

import modules.SimulationExtendedSUPA as SIM
from modules.RetirementIncome_PM import RetirementIncome as RI
import modules.CONST as CONST
import modules.Metrics as MT

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
        
        M_sim = 1000 # initialize simulated path as 1000
        freq = 1         # rebalancing frequency (rebalances per year)
        back_test = 0    # it is forward simulation
        life_expectancy = 104
        retired_age = 67
        T_max = life_expectancy - retired_age
        relationship = ['single','couple']
        
        # simulates the number of years until retirement age
        #time = np.arange(retired_age, life_expectancy+2) 
        
        # calls ExtendedSUPA class to get calibrated data and simulates economic variables
        Model_ExtSUPA.ForwardSimulation(M_sim, T_max, freq, back_test) 
        SUPA_X = Model_ExtSUPA.SIM_X
        
        ## RetirementIncome class
        unit_balance = 0
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
    
        # the current policies:
        a_taper_rate = CONST.TAPER_RATE_ASSET
        i_taper_rate = CONST.TAPER_RATE_INCOME
        asset_limit= CONST.ASSET_TEST_LIMIT

        # calculate onepension
        RI0 = RI("Mo", retired_age,   gender, relationship[0], #relationship: 0 single, 1 couple
           unit_balance, #0 
           testable,financial,income_wkly,home,T_max,
           strategy, fund_level,
           withdrawal,
           A_annuity,# not consider annuity
           t_income,
           a_taper_rate, 
           i_taper_rate,
           asset_limit
           )                               
        # list all the element RetirementIncomeA.__dict__.keys()
        RI0.SUPA_SIM(SUPA_X) # read in SUPA simulation
        RI0.RISimulation()   # simulate RI
        MT0 = MT.Metrics()
        MT0.UserInfo(retired_age,gender,relationship[0], RI0)
        MT0.SetMCParam(M_sim, T_max)
        MT0.ProbCon()
        MT0.MortalityWeightedSum(RI0.AgePension_NPV_median)
        OnePension=MT0.MortalitySum
        
        # calculate TotalRI
        RIA = RI("Mo", retired_age,   gender, relationship[0], #relationship: 0 single, 1 couple
           super_balance, 
           testable,financial,income_wkly,home,T_max,
           strategy,fund_level,
           withdrawal,
           A_annuity,
           t_income,
           a_taper_rate, 
           i_taper_rate,
           asset_limit
           )                                     

        RIA.SUPA_SIM(SUPA_X) # read in SUPA simulation
        RIA.RISimulation()   # simulate RI
        MTA = MT.Metrics()
        MTA.UserInfo(retired_age,gender,relationship[0], RIA)
        MTA.SetMCParam(M_sim, T_max)
        MTA.ProbCon()
        MTA.MortalityWeightedSum(RIA.Consump_NPV_median)
        
        TotalRI = MTA.MortalitySum
        
        PM_user = TotalRI/OnePension
           
        #%% First graph of different withdrawal strategies
        perS = 50000
        if super_balance > 1200000:
            n = math.ceil(super_balance/perS)+1;
        else:
            n=23
        superbalance = np.append(np.arange(n)*perS,super_balance)
        AA_strategy = ['cash','conservative','moderate','balanced','growth','highGrowth',strategy]
        
        #labels
        PM =  np.zeros([7,n+1])
        for i in range(7):
            for j in range(n+1):
                RIPM_inv = RI("Mo", retired_age,   gender, relationship[0], #relationship: 0 single, 1 couple
                       superbalance[j], 
                       testable,financial,income_wkly,home,T_max,
                       AA_strategy[i], fund_level,
                       withdrawal , # WEB: use user's choice
                       A_annuity,
                       t_income,
                       a_taper_rate,
                       i_taper_rate,
                       asset_limit
                       )            
                                                               
                RIPM_inv.SUPA_SIM(SUPA_X) # read in SUPA simulation
                RIPM_inv.RISimulation()   # simulate RI
                MTPM = MT.Metrics()
                MTPM.UserInfo(retired_age,gender,relationship[0], RIPM_inv)
                MTPM.SetMCParam(M_sim, T_max)
                MTPM.ProbCon()
                MTPM.MortalityWeightedSum(RIPM_inv.Consump_NPV_median)
            
                TotalRI = MTPM.MortalitySum
                PensionMultiplier = TotalRI/OnePension
                PM[i,j]= float(PensionMultiplier)
                
        #%% Second graph: different dd strategies 
        
        PM_dd =  np.zeros([7,n+1])
        
        for i in range(4):
            for j in range(n+1):
                RIPM_dd = RI("Mo", retired_age,   gender, relationship[0], #relationship: 0 single, 1 couple
                       superbalance[j], 
                       testable,financial, income_wkly,
                       home,T_max,
                       strategy, fund_level,
                       withdrawal_strategy_3[i],
                       A_annuity,
                       targeted_income[0],
                       a_taper_rate,
                       i_taper_rate,
                       asset_limit
                       )                                                                 
                RIPM_dd.SUPA_SIM(SUPA_X) # read in SUPA simulation
                RIPM_dd.RISimulation()   # simulate RI
                MTPM_dd = MT.Metrics()
                MTPM_dd.UserInfo(retired_age,gender,relationship[0], RIPM_dd)
                MTPM_dd.SetMCParam(M_sim, T_max)
                MTPM_dd.ProbCon()
                MTPM_dd.MortalityWeightedSum(RIPM_dd.Consump_NPV_median) 
                TotalRI = MTPM_dd.MortalitySum
                PensionMultiplier = TotalRI/OnePension
                PM_dd[i,j]= float(PensionMultiplier)
        for i in range(3):
            for j in range(n+1):
                RIPM_dd = RI("Mo", retired_age,   gender, relationship[0], #relationship: 0 single, 1 couple
                       superbalance[j], 
                       testable,financial, income_wkly,
                       home,T_max,
                       strategy, fund_level,
                       withdrawal_strategy_3[0],
                       A_annuity,
                       targeted_income[i+1],
                       a_taper_rate,
                       i_taper_rate,
                       asset_limit
                       )                                                                 
                RIPM_dd.SUPA_SIM(SUPA_X) # read in SUPA simulation
                RIPM_dd.RISimulation()   # simulate RI
                MTPM_dd = MT.Metrics()
                MTPM_dd.UserInfo(retired_age,gender,relationship[0], RIPM_dd)
                MTPM_dd.SetMCParam(M_sim, T_max)
                MTPM_dd.ProbCon()
                MTPM_dd.MortalityWeightedSum(RIPM_dd.Consump_NPV_median)
                
            
                TotalRI = MTPM_dd.MortalitySum
                PensionMultiplier = TotalRI/OnePension
                PM_dd[i+4,j]= float(PensionMultiplier)
                
        jsonData = make_response('{"PM": ' + str(round(PM_user,2)) + \
                                   ',"Graph1": ' + json.dumps(PM.tolist()) + \
                                   ',"Graph2": ' + json.dumps(PM_dd.tolist()) + \
                                   ',"Balance": ' + json.dumps((superbalance[:-1]/1000).tolist()) + '}')
        
        return jsonData
        