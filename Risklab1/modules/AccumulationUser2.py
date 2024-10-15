
# -*- coding: utf-8 -*-
"""
Created on Mon Sep 24 22:25:58 2018

@author: che27g
"""
import numpy as np
import matplotlib.pyplot as plt
import pylab
import pandas as pd
from CSIROcolour import CSIRO
import seaborn as sns

class AccumulationUser:
    
    def __init__(self, name, gender, age, starting_year, income, acc_life,\
                 investment_strategy, super_balance_init, fund_level ):
        self.name = name
        self.gender = gender
        self.age = age
        self.starting_year = starting_year
        self.acc_life = acc_life
        self.income = income
        self.strategy = investment_strategy
        self.super_balance_init = super_balance_init
        self.fund_level = fund_level
        
        
    def SUPA_SIM(self, SUPA_SIM):
        self.SUPA_SIM = SUPA_SIM
        
        self.Inflation = SUPA_SIM[:,:,0]
        self.Wage = SUPA_SIM[:,:,1]
        
        self.X= SUPA_SIM[:,:,[8,2]]  
        # risky: 8 ; defensive: 2,3,4,10 all give similar results
        self.Risky_asset = self.X[:,:,0] 
        self.Defensive_asset = self.X[:,:,1]
        # dimension of simulation
        [self.NumOfSim, self.NumOfYears] = np.shape(self.Inflation)
        
    def PortfolioWeight_strategy(self, s):
        return {
               "halfhalf" : 0.5,
               "linearDecrease":1 - np.minimum( np.arange( 65, 65 + self.NumOfYears )/100, np.ones([1, self.NumOfYears])),            
               "highGrowth" : 1,
               "growth" : 0.85,
               "balance": 0.7,
               "moderate": 0.5,
               "conservative": 0.3,
               "cash": 0,
               #"optimal": self.Optimal(), 
               # if s is float, return s
            }[s]
            
    def Average_return(self):
        w1 = self.PortfolioWeight_strategy(self.strategy)                                 
        # w2 is the weight of bonds                
        w2 = 1 - w1
        self.Return_ave = w1 *self.Risky_asset + w2 * self.Defensive_asset
        
    def InvestmentFee_strategy(self, s):
        return {
               "halfhalf" : 0.4/100,
               "linearDecrease":0.35/100,
               "optimal": 0.6/100,
               # from Money smart
               "highGrowth" : 0.7/100,
               "growth" : 0.6/100,
               "balance": 0.5/100,
               "moderate": 0.4/100,
               "conservative": 0.3/100,
               "cash": 0.05/100,                                           
            }[s] 
            
    def AccountFees(self, Super_balance):
        # fixed annual cost of each account
        AdminFee = 50
        #fund fee level indirect cost
        FundICR = {"low": 0,
                   "low-medium": 0.3/100,
                   "medium": 0.6/100,
                   "medium-high": 1.3/100,
                   "high": 2/100,
                   "other": 0,
                  }
        # Investment fees           
        InvestmentFR =  self.InvestmentFee_strategy(self.strategy)
       
        TotalAnnualFees = AdminFee + (FundICR[self.fund_level] + InvestmentFR) * Super_balance
        return TotalAnnualFees
    
    def Accumulation_plot(self):
        # Plot setting
        fig_SIM = plt.figure(figsize=(14,8))
        # Subplot1: average wage and super balance in one graph    
        median_wage = np.median(self.Wage_sim,0).astype(int)
        median_balance = np.median(self.Super_balance,0)
        
        
        print(median_wage)
        #std_balance=np.std(Super_balance,axis=0)
        
        
        # read in ABS wage history data
        #wageFile = pd.read_csv('wage_yearly.csv')
        #Wage_ABS = wageFile.values[:-1,3]

        ## plot wage simulation
        ax1 = fig_SIM .add_subplot(121)
        ax1.set_title('full time '+self.gender+' annual income w(t): '+str(int(median_wage[-1])))
        # plot wage simulations
        time = np.arange(self.starting_year, self.starting_year + self.acc_life )
        plt.plot(time, np.transpose(self.Wage_sim),color=CSIRO['light teal'],alpha=0.3)
        # plot wage mean
        plt.plot(time, median_wage,color=CSIRO['fuchsia'], marker='o', markersize=8,
                 linewidth=2, label='Median of wage')
        
        plt.xticks(range( self.starting_year ,  self.starting_year + self.acc_life , 4))
        pylab.xlabel('year')
        ax1.set_ylim((20000,400000))
        ax1.set_xlim((self.starting_year, self.starting_year + self.acc_life ))
        ax1.legend()
        
        ## Subplot2 the Super Balance
        ax2 = fig_SIM .add_subplot(122)
        ax2.set_title('Super balance simulation B(t):'+ str(int(median_balance[-1]))+" in "+str(int(self.starting_year+self.acc_life)) )
        
        plt.plot(time,np.transpose(self.Super_balance),color=CSIRO['lavender'],alpha=0.3)
        plt.plot(time,median_balance,color=CSIRO['orange'], marker='o', markersize=8,\
                 linewidth=3, label='Median of super balances')
        plt.xticks(range( self.starting_year ,  self.starting_year + self.acc_life , 4))
        ax2.set_xlim(( self.starting_year , self.starting_year + self.acc_life ))
        ax2.set_ylim((-10000,3000000))
        ax2.legend()
               
        
    def Super_accumulation(self,SG):
        
        # start simulation from 2018
        t0 = self.starting_year - 2018
        
        if SG==True:
            SG_rate = np.array([9.5,9.5,9.5,
                    10,10.5,11.0,11.5,12,12,
                    12,12,12,12,12,12,12,12,12,
                    12,12,12,12,12,12,12,12,12,
                    12,12,12,12,12,12,12,12,12,
                    12,12,12,12,12,12,12,12,12,
                    12,12,12,12,12,12,12,12,12,
                    12,12,12,12,12])/100     
        else:
            SG_rate = np.array([                    
                    9.5,9.5,9.5,9.5,9.5,9.5,9.5,
                    9.5,9.5,9.5,9.5,9.5,9.5,9.5,
                    9.5,9.5,9.5,9.5,9.5,9.5,9.5,
                    9.5,9.5,9.5,9.5,9.5,9.5,9.5,
                    9.5,9.5,9.5,9.5,9.5,9.5,9.5,
                    9.5,9.5,9.5,9.5,9.5,9.5,9.5,
                    9.5,9.5,9.5,9.5,9.5,9.5,9.5,
                    9.5,9.5,9.5,9.5,9.5])/100    
                                
        tax_rate = 0.15
                    
        self.Average_return()
        
        Super_balance = np.zeros([self.NumOfSim, self.acc_life])
        Wage_sim = np.zeros([self.NumOfSim, self.acc_life])
        
        Wage_sim[:,0] = self.income
        Super_balance[:,0] = self.super_balance_init
        
        for tt in range(self.acc_life-1):
            # simulate wage
            Wage_sim[:,tt + 1] = Wage_sim[:,tt]*np.exp(self.Wage[ :, tt + t0 ])
            # accumulate super = previous balance + after-tax super return + after-tax salary contribution - fees
            Super_balance[:,tt + 1] = Super_balance[:,tt]  + \
            Super_balance[:,tt] *(np.exp(self.Return_ave[:,tt + t0] ) -1)*(1-tax_rate) + \
            SG_rate[ tt + t0 ] *  Wage_sim[:,tt]*(1-tax_rate)  - self.AccountFees(Super_balance[:,tt]) 

        self.Wage_sim = Wage_sim
        self.Super_balance = Super_balance
        #print(SG_rate)
        self.Inf_acc= np.exp(np.cumsum(np.hstack((np.zeros([self.NumOfSim,1]), self.Inflation)),1))
        self.wage_acc= np.exp(np.cumsum(np.hstack((np.zeros([self.NumOfSim,1]), self.Wage)),1))
        
        #self.Wage_sim_NPV = self.Wage_sim/self.Inf_acc[:,1:-2] 
        Super_balance_NPV = self.Super_balance/self.Inf_acc[:,1:-2] 
        
        self.Wage_sim_NPV = self.Wage_sim/self.wage_acc[:,1:-2] 
        #self.Super_balance_NPV = self.Super_balance/self.wage_acc[:,1:-2] 
        self.Super_balance = Super_balance_NPV

         #This section is for parsing data to generate the data points of distribution plot
        hplot = sns.distplot(self.Super_balance[:,-1], bins = 50)
        self.data_points = hplot.get_lines()[0].get_data()
        
        self.hist_data = []
        dict_data = {}
        for i in range(49):
            dict_data = {"x":hplot.patches[i].get_xy()[0], "height": hplot.patches[i].get_height()}
            self.hist_data.append(dict_data)
            
        hplot.get_figure().clf()
    
        #compute the percentile of the superbalance
    def Superbalance_percentile(self):
        
        self.Perctl = np.zeros(19)
        for pctl in range(19):
            self.Perctl[pctl] =  np.percentile(self.Super_balance[:,-1], (pctl+1)*5)  
            
        #print("percentile: ", self.Perctl )
        self.Perct15 = np.percentile(self.Super_balance[:,-1],15,axis=0)
        #print("percentile15: ", self.Perct15 )
        #get median of last 1000 element
        self.superbalance_median = np.percentile(self.Super_balance,50,axis=0) 
        #print("super median is : ", self.superbalance_median)
        self.super_std = np.std(self.Super_balance[:,-1])
        #print("super std is : ", self.super_std)
        
    def Accumulation_dist_plot(self):
        fig_SIM = plt.figure(figsize=(9,6))
        ax1 = fig_SIM .add_subplot(111)  
        plt.subplots_adjust(left=0.12, right=0.9, top=0.9, bottom=0.1)
        #fig_SIM.tight_layout()
        # plot bar chat and curves
        sns.distplot(self.Super_balance[:,-1], bins = 50)
        ax1.set_xlim([50000,3000000])
        ax1.set_xlabel('Superannuation balance ($)')
        #plt.plot(Perctl, np.zeros(9), color=CSIRO['fuschia'], marker='o', markersize=8)
        #plot vertical cuts
        #plt.axvline(x=self.Perctl[0],color=CSIRO['fuchsia'], linestyle='--',label="10th percentile: "+ str(int(self.Perctl[0]/1000))+"k")
        plt.axvline(x=self.Perctl[0],color=CSIRO['fuchsia'], linestyle='--',label="10th pctl: "+ str(int(self.Perctl[0])))
        self.Perct25 = np.percentile(self.Super_balance[:,-1],25,axis=0)
        plt.axvline(x=self.Perct25,color=CSIRO['gold'], linestyle='--',label="25th pctl: "+ str(int(self.Perct25)))

        #plt.axvline(x=self.Perctl[4],color=CSIRO['orange'], linestyle='--',label="median: "+ str(int(self.Perctl[4]/1000))+"k")
        plt.axvline(x=self.Perctl[4],color=CSIRO['orange'], linestyle='--',label="median: "+ str(int(self.Perctl[4])))
        ax1.legend(loc=1)
        plt.tight_layout()
        
        