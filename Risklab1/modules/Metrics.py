# -*- coding: utf-8 -*-
"""
Created on Wed May 15 20:57:45 2019
This file is to calculate different measures for drawdown comparison
@author: che27g
"""

import numpy as np
import pandas as pd
from scipy.stats import norm
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import CONST
from matplotlib.collections import LineCollection
from matplotlib.colors import ListedColormap, BoundaryNorm
import matplotlib.colors as colors
import matplotlib as mpl
from scipy.stats import norm
import csv

#%%
def truncate_colormap(cmap, minval=0.0, maxval=1.0, n=100):
    new_cmap = colors.LinearSegmentedColormap.from_list(
        'trunc({n},{a:.2f},{b:.2f})'.format(n=cmap.name, a=minval, b=maxval),
        cmap(np.linspace(minval, maxval, n)))
    return new_cmap


p_male = np.array(CONST.SURVIVAL_MALE)
p_female = np.array(CONST.SURVIVAL_FEMALE)

fsize = 12

#%%
class Metrics:
    def __init__(self):
        pass
    def UserInfo(self, age, gender, relationship, RetirementIncome):
        self.gender = gender
        self.retirementAge = age
        self.relationship = relationship
        self.RI = RetirementIncome
        self.Wealth = RetirementIncome.Superb_Sim_NPV
        self.Consump = RetirementIncome.Consump_Sim_NPV
        self.AP = RetirementIncome.AgePension_NPV       
        
    
    def SetMCParam(self, NumOfSim, NumOfTime):   
        self.NumOfSim = NumOfSim
        self.NumOfYears = NumOfTime
        
    def ProbCon(self):
        
        if self.gender == "M":
            self.p_survival = p_male            
        else:
            self.p_survival = p_female
            #print(self.p_survival)
        # compute two conditional prob: _tp_x and _t-1q_x
        # survival rate given alive at age x 
        self.p_xt = np.cumprod(self.p_survival[self.retirementAge : self.retirementAge+self.NumOfYears])
        # given alive at age x+t-1 and death rate               
        self.q_xt = np.append(1,np.cumprod(self.p_survival[self.retirementAge : self.retirementAge+self.NumOfYears-1]))\
        *(1 -self.p_survival[self.retirementAge  : self.retirementAge + self.NumOfYears])
        
    def PlotMetric(self, x, ylim = None, title=None):
        t=range(self.retirementAge, self.retirementAge + self.NumOfYears+1)
        plt.figure(figsize=(8,5))
        ax=plt.subplot(111)        
        ax.plot(t, x, linewidth = 3)
        ax.set_title(title)
        ax.set_xlabel('Age (years old)')
        ax.set_xlim(self.retirementAge, self.retirementAge + self.NumOfYears-1)
        ax.set_ylim(0,ylim)
        ax.yaxis.grid(which="major",color='k', linestyle=':', alpha=0.2)
        plt.tight_layout()
        
    def PrintMetric(self,x, var_name=None):
        print(var_name, x)
        np.set_printoptions(precision=3)
        
    def ColorGradientLine(self, Y, life_expectancy, var_name=None):
        
        t=range(self.retirementAge, self.retirementAge + self.NumOfYears+1)
        #t = np.arange(x.age, x.age + x.NumOfYears)
        #Y = x.super_NPV_median       
        if self.gender == "M":# or "Male":
            p = np.asarray(p_male[self.retirementAge: life_expectancy])
        else:
            p = np.asarray(p_female[self.retirementAge: life_expectancy])
                
        fig, axs = plt.subplots(1, 1, sharex=True, sharey=True,figsize=(10,5))
        points = np.array([t, Y]).T.reshape(-1, 1, 2)
        segments = np.concatenate([points[:-1], points[1:]], axis=1)
        
        # Create a continuous norm to map from data points to colors
        Norm = plt.Normalize(p.max(), p.min())
        # colormaps: 'Greys', 'Spectral','hot','RdPu','cool','YlOrBr','PuRd'    
        cmap = plt.get_cmap('PuRd')
        new_cmap = truncate_colormap(cmap, 0, 0.9) # select the piece of colormap
        lc = LineCollection(segments, cmap=new_cmap, norm=Norm, linewidth = 4)
        # Set the values used for colormapping
        lc.set_array(p)
        line = axs.add_collection(lc)
    
        cb = fig.colorbar(line, ax=axs)    
        cb.set_label("Conditional Survival Rate $p_x$", rotation=90, labelpad=25,fontsize=fsize+3)
        cb.ax.tick_params(labelsize = fsize)
        axs.yaxis.grid(which="major",color='k', linestyle=':', alpha=0.2)
        axs.set_xlim(self.retirementAge, self.retirementAge + self.NumOfYears)
        axs.set_ylim(-0.01, Y.max()+0.01)
        axs.tick_params(labelsize = fsize) # figure ticks
        
        fig.tight_layout()
        plt.show()
        
    def MortalityWeightedSum(self,X): # use for functions such as Pension Multiplier
        self.ProbCon()
        if X.ndim == 1:
            self.MortalitySum = np.sum(X*np.append(1, self.p_xt))
        else:
            self.MortalitySum = np.sum(X*np.append(1, self.p_xt),axis=1)
        
        
    
        
class ProbRuin(Metrics):
    def __init__(self):
        pass 
    
    def Prob_ruin(self): # can be removed to objective function module       
       self.Ruin = np.where( self.RI.Superb_Sim > 0, 0, 1 ) # return the simulated ruin        
       self.Prob_ruin_t = np.sum( self.Ruin,0 ) /self.NumOfSim    
       self.ProbCon()
       self.P_ruin = np.sum( self.Prob_ruin_t * np.append(1,self.p_xt)*np.append(self.q_xt,0))
       self.P_ruin_t =  np.cumsum(self.Prob_ruin_t * np.append(1,self.p_xt)*np.append(self.q_xt,0)) 
        
class ProbInadequacy(Metrics): 
    def __init__(self):
        pass 
    
    def SetAdequacy(self, adequate_income):
        self.adequate_income = adequate_income
       
    def ProbInadequacy(self):
        self.ProbCon()
        self.Inadequacy = np.where(self.Consump > self.adequate_income, 0 , 1)
        self.Prob_inadequacy_t  = np.sum( self.Inadequacy, 0 ) /self.NumOfSim
        # probability of inadequacy at a particular age, mortality weihted over all future time horizon. 
        self.P_inadequacy = np.sum( self.Prob_inadequacy_t * np.append(1,self.p_xt)*np.append(self.q_xt,0))
        self.P_inadequacy_t =  np.cumsum(self.Prob_inadequacy_t * np.append(1,self.p_xt)*np.append(self.q_xt,0))
        
class UtilityFunction(Metrics):
    def __init__(self):
        pass

class MDUF(UtilityFunction):
    def __init__(self):
        pass
    
    def SetUtilityParam(self, risk_aversion, bequest_motive):
        # when rho = 0 (risk neutral), phi = 0.5 , it is the NPV         
        self.rho = risk_aversion # in MDUF paper, rho = 8 and phi = 0.83
        self.phi = bequest_motive
        
    def MDUF_EU(self):# the expected utility 
        # to let W stay positive by adding forthnightly pension to the residual
        self.ProbCon()
        # bequest residual
        W = self.Wealth[:,1:]
        # to avoid W to be negative: the final wealth is above the min fortnightly pension
        W = W + CONST.MAX_PENSION_F[0]
        # exptectation of utility : u(c)=c^(1-rho})/(1-rho) and v(w)=w^(1-rho})/(1-rho)*(phi/(1-phi))^rho
        EU_Sim = self.p_xt[:-1] * self.Consump[:,:-1]**(1-self.rho)/ (1-self.rho)+\
        self.q_xt[1:] * W**(1-self.rho) / (1-self.rho) * (np.power(self.phi/(1-self.phi),self.rho))
        # compute the expetected utility
        EU = np.mean (np.sum(EU_Sim, axis = 1) )                
        self.EU = EU
        # compute the MDUF score
        Sum_total = np.sum(self.p_xt[:-1] + self.q_xt[1:]*self.phi/(1-self.phi))
        score = np.power(EU *(1-self.rho)/Sum_total, (1/(1-self.rho)))
        self.Score = score
        np.set_printoptions(precision=3)
        
    def DisplayMDUF(self): # print the values of expected MDUF and MDUF score
        print('Expected Utility: ', self.EU)
        print('MDUF Score: ', self.Score)
        
        
    def MDUFSaver(X, title='None'):
        
        with open(title,'a') as f:
            csv.writer(f,X)
        
#        with open(title,'ab') as f:
#            np.savetxt(f, X, fmt="%d",newline='\n',  delimiter=",")
        
#        for i in range(len(X)):
#            #x_p = np.percentile(X[i], p, axis=0, interpolation='linear')
#            #x_m = np.percentile(X[i], 50, axis=0, interpolation='linear')
#            #x_q = np.percentile(X[i], 100-p, axis=0, interpolation='linear')
#            np.savetxt(f, (X[], x_m, x_q), fmt="%d",newline='\n',  delimiter=",")
#            