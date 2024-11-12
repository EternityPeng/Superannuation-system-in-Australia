# -*- coding: utf-8 -*-
"""
Created on Wed Aug 22 14:13:16 2018

@author: che27g
"""
#import sys
#sys.path.append("AssetAllocation")
import numpy as np
import SimulationExtendedSUPA as SIM
#import SimulationSUPA as SIM
#from RetiredUser import RetiredUser as RU
import PlotSUPA as PF
import matplotlib.pyplot as plt
import matplotlib as mpl
# read csv file and save as Dictionary
Model_ExtSUPA = SIM.ExtendedSUPA('calib9218.csv')

Model_ExtSUPA.Dictionary_Param
# define number of variables in extended SUPA model
Model_ExtSUPA.NumOfVariable=Model_ExtSUPA.Dictionary_Param['NumVar']

# number of years after retirement
T_max = 20
life_expectancy = 100
retired_age = 65
#T_max = life_expectancy - retired_age
# number of simulated paths
M_sim =10
freq=1 # rebalancing frequency (rebalances per year)
back_test=0 # it is forward simulation
# forward Simulation since 2014
# start from 2017, therefore T_max+3
Model_ExtSUPA.ForwardSimulation(M_sim, T_max, freq, back_test) 
# forward simulation for the next T_max years since 2018
SUPA_X = Model_ExtSUPA.SIM_X[:,:,:] 

# forward simulation plot
Plot_SUPA_Forward = PF.SUPASimulation()
Plot_SUPA_Forward.PlotSUPA(Model_ExtSUPA.SIM_X, M_sim, T_max, freq)
#Plot_SUPA_Forward.PlotSUPA3(2018, Model_ExtSUPA.SIM_X, M_sim, T_max, freq)
Plot_SUPA_Forward.PlotQuantiles3(2018, Model_ExtSUPA.SIM_X, M_sim, T_max, freq)

