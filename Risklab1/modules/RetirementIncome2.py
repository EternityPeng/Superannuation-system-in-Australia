# -*- coding: utf-8 -*-
"""
Created on Sat Mar  2 12:12:36 2019

@author: che27g
"""


import numpy as np
import AgePensionPayment2 as AgePensionPayment
import AnnuityPayment2
import matplotlib.pyplot as plt

WeekPerYear = 365.25/7
class RetirementIncome:
    
    def __init__(self,name, age, gender, relationship, super_balance, total_testable,\
                 financial_asset, income_wkly, home_ownership, max_life,\
                 investment_strategy, fund_level,  withdrawal_strategy, annuity_percentage, targeted_income, 
                 partialLAtarget=None, deferredLA=None, deferredYear=None):
        self.name = name
        self.age = age
        self.gender = gender # M, F
        self.relationship = relationship #single, couple
        self.super = super_balance # 300k, 500k, 1m
        self.total_testable = total_testable
        self.financial_asset = financial_asset
        self.income_wkly = income_wkly
        self.max_life = max_life
        self.home = home_ownership
        self.strategy = investment_strategy
        self.fund_level = fund_level
        self.withdrawal_strategy = withdrawal_strategy # 'minimum', 'minimumplus', '4percent',
        self.annuity_percentage = annuity_percentage
        self.targeted_income = targeted_income
        self.PLAtarget = partialLAtarget
        self.deferredLA = deferredLA
        self.deferredYear = deferredYear
        
    def PortfolioWeight_strategy(self, s):
        if isinstance(s,float):
            return s
        else:
            return {                
                   "halfhalf" : 0.5,
                   "linearDecrease":1 - np.minimum( np.arange( 65, 65 + self.NumOfYears )/100, np.ones([1, self.NumOfYears])),            
                   "highGrowth" : 1,
                   "growth" : 0.85,
                   "balanced": 0.7,
                   "moderate": 0.5,
                   "conservative": 0.3,
                   "cash": 0,
                   #"optimal": self.Optimal(), 
                }[s]  
        
    def InvestmentFee_strategy(self, s):
        if isinstance(s,float):
            return 0.5/100
        else:
            return {
                   "halfhalf" : 0.4/100,
                   "linearDecrease":0.35/100,
                   "optimal": 0.6/100,
                   # from Money smart
                   "highGrowth" : 0.7/100,
                   "growth" : 0.6/100,
                   "balanced": 0.5/100,
                   "moderate": 0.4/100,
                   "conservative": 0.3/100,
                   "cash": 0.05/100,                                           
                }[s] 
    # data from ASIC money smart superannuation calculator
    def AccountFees(self, SuperBalance):
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
        # the total annual cost = fixed admin (50) + balance based charges on fund level and investment strategy
        TotalAnnualFees = AdminFee + (FundICR[self.fund_level] + InvestmentFR) * SuperBalance
        return TotalAnnualFees
    
    def TargetedIncome(self):
        
        Life_Style = np.array([[42764, 40633],[60264,56295],[27368,25841],[39353,36897]])# life standard from ASAF
        junior_to_senior = np.divide(Life_Style[:,1],Life_Style[:,0])
        ls=np.zeros(2)
        # if the target is a number
        if isinstance(self.targeted_income, float) or isinstance(self.targeted_income,int):
            ls[0] = float(self.targeted_income)
            ls[1] = ls[0] * junior_to_senior[0]
        else:
            if self.targeted_income == "comfortable":
                if self.relationship == "single":
                    ls = Life_Style[0,:]
                else:
                    ls = Life_Style[1,:]
            else:
                if self.relationship== "single":
                    ls = Life_Style[2,:]
                else:
                    ls = Life_Style[3,:]
        return  ls    
         
        
    def SUPA_SIM(self, SUPA_SIM):
        self.SUPA_SIM = SUPA_SIM
        # 0 inflation, 1 wage, 2 longterm, 3 shortterm, 4 cash 5 domDivYield, 6 domDivGrowth, 7 domPriceReturn, 8 domTotalReturn
        # 9 intTotEqReturn, 10 domBond, 11 intBond, 12 unemployment, 13 HousePrice       
        #Risky Asset: 25% domEq, 15% intEq, 10% property
        self.Inflation = SUPA_SIM[:,:,0]
        self.Wage = SUPA_SIM[:,:,1]
        
        weight_risky = np.array([0.5, 0.3, 0.2])
        self.Risky_asset = weight_risky[0]*self.SUPA_SIM[:,:,8]+weight_risky[1]*self.SUPA_SIM[:,:,9]+ \
        weight_risky[2]*self.SUPA_SIM[:,:,12]
        weight_defensive =  np.array([0.3, 0.5, 0.2]) 
        self.Defensive_asset = weight_defensive[0]* self.SUPA_SIM[:,:,4]+ \
        weight_defensive[1]* self.SUPA_SIM[:,:,10]+weight_defensive[2]* self.SUPA_SIM[:,:,11]
        
        # obtain the dimension of simulations
        self.MC_size = np.shape(self.Inflation)
        [self.NumOfSim, self.NumOfYears] = np.shape(self.Inflation)               
           
    def AverageReturn(self):            # average return of the portfolio           
        w1 = self.PortfolioWeight_strategy(self.strategy)                                               
        w2 = 1 - w1 # w2 is the weight of defensive asset     
        self.Return_ave = w1 *self.Risky_asset + w2 * self.Defensive_asset
     
    # implement rule of thumb withdrawal
    def RoT(self, t, super_t):
        self.Inf_acc= np.exp(np.cumsum(np.hstack((np.zeros([self.NumOfSim,1]), self.Inflation)),1))
        Lower_threshold_super_t = 250000*self.Inf_acc[:,t].reshape([self.NumOfSim,1])
        Upper_threshold_super_t = 500000*self.Inf_acc[:,t].reshape([self.NumOfSim,1])
        #top = 0 if super_t>threshold_super_t else 0.02 
        top = np.where(np.all([super_t>=np.squeeze(Lower_threshold_super_t), super_t<np.squeeze(Upper_threshold_super_t) ], axis=0), 0.02, 0)
#        print("t:", t)
#        print(top)
#        print(super_t)
        rate = np.floor((self.age + t)/10)/100 + top
        superwithdrawal_RoT = super_t * rate
        return superwithdrawal_RoT

    def SuperWithdrawal_stragety(self, age_t, super_t, t, withdrawal_strategy):   
        return{
                'minimum':np.maximum(AgePensionPayment.MinimumSuper(age_t, super_t, 0),0),
                'minimumplus':np.maximum(AgePensionPayment.MinimumSuper(age_t, super_t, 0.01),0),
                '4percentRule':np.maximum(0,(np.minimum(0.04*self.super*(1-self.annuity_percentage)*self.Inf_acc[:,t] , super_t))), #4% of the initial balance            
                'RoT': np.maximum(np.maximum(AgePensionPayment.MinimumSuper(age_t, super_t, 0),0),self.RoT(t, super_t))
                }[withdrawal_strategy]
        
    def SuperWithdrawal(self,age_t, super_t, t, withdrawal_strategy, age_pension_t, annuity_t, targeted_income_t ):
        if self.targeted_income=='na': # no target
            superw_t = self.SuperWithdrawal_stragety(age_t, super_t, t, withdrawal_strategy)
        else: # with target, may have to consum more than what AP and annuity provided ( not satisfy minimum withdrawal requirement)
            superw_t = np.maximum(np.minimum(np.maximum(0, targeted_income_t - age_pension_t - annuity_t), super_t) ,0)  
            # with minimum requirement :
            #superw_t = np.maximum(np.minimum(np.maximum(0, targeted_income_t - age_pension_t - annuity_t), super_t),np.maximum(AgePensionPayment.MinimumSuper(age_t, super_t, 0),0))            
        return superw_t
    
    # This function is to simulate the super balance Superb_Sim and Consumption_Sim
    # AgePension Simulation (AgePension) based on asset and income test which are based on 
    # the simulated total testable assets Total_asset_sim and income Financial_asset_sim and Income
    # Superb_Sim_t+1 = (Superb_Sim_t - Super_withdrawal_t - Account_fee)*(1+AveReturn)
    # Consumption_Sim_t = Super_withdrawal_t + AgePension_t + Income_t
    
    def RISimulation(self):        
        # call return function for portfolio weight, inf_acc and wage_acc
        self.AverageReturn()
        self.Inf_acc= np.exp(np.cumsum(np.hstack((np.zeros([self.NumOfSim,1]), self.Inflation)),1))
        self.Wage_acc = np.exp(np.cumsum(np.hstack((np.zeros([self.NumOfSim,1]), self.Wage)),1))
         # 
        Total_asset_sim = np.zeros( self.MC_size )
        Income = np.zeros( self.MC_size)
        Financial_asset_sim = np.zeros( self.MC_size )
        Superb_Sim = np.zeros( self.MC_size )
        Super_withdrawal = np.zeros( self.MC_size )
        AgePension = np.zeros( self.MC_size )
        AP_ID = np.zeros( self.MC_size )
        Consumption_Sim =  np.zeros( self.MC_size)
        AnnuityPayment_Sim =  np.zeros( self.MC_size)
        TargetedIncome_Sim = np.zeros( self.MC_size)
        
        Total_asset_sim[:,0] = self.total_testable        
        Income[:,0] = self.income_wkly*WeekPerYear         
        Financial_asset_sim[:,0] = self.financial_asset
        ls = self.TargetedIncome()
        TargetedIncome_Sim[:,0] = ls[0]
        
        # annuity_p = 1, if using 100k to purchase
        annuity_p = self.annuity_percentage * self.super/100000.0
        AnnuityPayment_Sim[:,0] = annuity_p  * AnnuityPayment2.annuity_payment(self.gender, self.age)
        annuity_income0 = annuity_p  * AnnuityPayment2.annuity_payment(self.gender, self.age)
        
        
        #after purchase annuity
        Superb_Sim[:,0] = self.super*(1-self.annuity_percentage)
        
        AgePension[:,0], AP_ID[:,0]=AgePensionPayment.AgePension_payment(self.total_testable  , \
                  Superb_Sim[:,0],  self.income_wkly, self.financial_asset, annuity_p, self.gender,\
                  self.age, self.relationship, self.home, \
                  self.Inf_acc[:,0].reshape([self.NumOfSim,1]), self.Wage_acc[:,0].reshape([self.NumOfSim,1]), 0)
       
        Super_withdrawal[:,0] = self.SuperWithdrawal(self.age, Superb_Sim[:,0], 0, self.withdrawal_strategy, \
                        AgePension[:,0], AnnuityPayment_Sim[:,0], TargetedIncome_Sim[:,0]) 
        
        Consumption_Sim[:,0] = Income[:,0] + AgePension[:,0] + Super_withdrawal[:,0]+ AnnuityPayment_Sim[:,0]
        
        # interate forward 
        for tt in range(self.NumOfYears-1):
            #print(tt)
            # minus the last withdrawal  
            # total asset value go with inflation np.matmul(Inf_acc[:,t],income_T0)
            Inf_acc_t = self.Inf_acc[:,tt+1].reshape([self.NumOfSim,1])
            Wage_acc_t = self.Wage_acc[:,tt+1].reshape([self.NumOfSim,1])
            
            Total_asset_sim[:,tt+1] =  Total_asset_sim[:,tt] *np.exp( self.Inflation[:,tt] )
            TargetedIncome_Sim[:,tt+1]= TargetedIncome_Sim[:,tt] *np.exp( self.Inflation[:,tt] )
            Income[:,tt+1] = Income[:,tt] * np.exp(self.Wage[:,tt] ) # income go with wage inflation
            Financial_asset_sim[:,tt+1] = Financial_asset_sim[:,tt] *np.exp( self.Inflation[:,tt] )
            Superb_Sim[:,tt+1] =  (Superb_Sim[:,tt] - Super_withdrawal[:,tt]- self.AccountFees(Superb_Sim[:,tt]) ) * np.exp(self.Return_ave[:,tt] )            
        
            # Age Pension entitlement: depends on total_asset_t, super_balance_t, income_wkly_t, fin_asset_t,            
            AgePension[:,tt+1], AP_ID[:,tt+1] = AgePensionPayment.AgePension_payment(Total_asset_sim[:,tt+1] ,\
                      Superb_Sim[:,tt+1], Income[:,tt+1]/52, Financial_asset_sim[:,tt+1],\
                      annuity_p, self.gender, self.age, self.relationship, self.home, Inf_acc_t, Wage_acc_t, tt)
            # withdraw if the balance is above 0                       
            AnnuityPayment_Sim[:,tt+1] = annuity_income0 * self.Inf_acc[:,tt+1]
            Super_withdrawal[:,tt+1] = self.SuperWithdrawal(self.age+tt, Superb_Sim[:,tt+1], tt+1, self.withdrawal_strategy,\
                            AgePension[:,tt+1], AnnuityPayment_Sim[:,tt+1], TargetedIncome_Sim[:,tt+1])     
            # three componenet of RI           
            Consumption_Sim[:,tt+1] = Income[:,tt+1] + AgePension[:,tt+1] + Super_withdrawal[:,tt+1]+AnnuityPayment_Sim[:,tt+1]

        Superb_Sim = np.maximum(Superb_Sim,0) 
        self.Superb_Sim = Superb_Sim                
        self.SuperW_Sim = Super_withdrawal
        self.AgePension = AgePension
        self.AP_ID_Sim = AP_ID
        self.AP_ID = np.sum(AP_ID,axis = 0)/self.NumOfSim
        self.Consump_Sim = Consumption_Sim
        self.AnnuityPayment_Sim = AnnuityPayment_Sim
        
        self.Superb_Sim_NPV = Superb_Sim/self.Inf_acc[:,:-1] 
        self.AgePension_NPV = AgePension/self.Inf_acc[:,:-1]
        self.SuperW_Sim_NPV = Super_withdrawal/self.Inf_acc[:,:-1]
        self.Consump_Sim_NPV = Consumption_Sim/self.Inf_acc[:,:-1]
        self.AnnuityPayment_Sim_NPV = AnnuityPayment_Sim/self.Inf_acc[:,:-1]
        

        self.super_median= np.median( np.maximum( np.transpose( Superb_Sim ),0 ), 1 )
        self.super_NPV_median = np.median( np.maximum( np.transpose( self.Superb_Sim_NPV ),0 ), 1 )
        
        self.SuperW_median = np.median( np.transpose( self.SuperW_Sim), 1 )
        self.SuperW_NPV_median = np.median( np.transpose(  self.SuperW_Sim_NPV ), 1 )

        self.AgePension_median = np.median( np.transpose( AgePension ), 1 ) 
        self.AgePension_NPV_median = np.median( np.transpose( self.AgePension_NPV ), 1 )
        
        self.Consump_median = np.median(  np.transpose( self.Consump_Sim ), 1 )
        self.Consump_NPV_median = np.median(  np.transpose( self.Consump_Sim_NPV ), 1 )
        
        self.AnnuityPayment_median = np.median(  np.transpose( self.AnnuityPayment_Sim ), 1 )
        self.AnnuityPayment_NPV_median = np.median(  np.transpose( self.AnnuityPayment_Sim_NPV ), 1 )
        
        #addition by QSY
        self.superRI = np.vstack((self.super_NPV_median,np.percentile(self.Superb_Sim_NPV,5,axis=0)))
        self.superRI = np.vstack((self.superRI,np.percentile(self.Superb_Sim_NPV,95,axis=0)))
        self.superRI = np.vstack((self.superRI,np.percentile(self.Superb_Sim_NPV,20,axis=0)))
        self.superRI = np.vstack((self.superRI,np.percentile(self.Superb_Sim_NPV,80,axis=0)))
        
        self.superWRI = np.vstack((self.SuperW_NPV_median,np.percentile(self.SuperW_Sim_NPV,5,axis=0)))
        self.superWRI = np.vstack((self.superWRI,np.percentile(self.SuperW_Sim_NPV,95,axis=0)))
        self.superWRI = np.vstack((self.superWRI,np.percentile(self.SuperW_Sim_NPV,20,axis=0)))
        self.superWRI = np.vstack((self.superWRI,np.percentile(self.SuperW_Sim_NPV,80,axis=0)))
        
        self.AgePensionRI = np.vstack((self.AgePension_NPV_median,np.percentile(self.AgePension_NPV,5,axis=0)))
        self.AgePensionRI = np.vstack((self.AgePensionRI,np.percentile(self.AgePension_NPV,95,axis=0)))
        self.AgePensionRI = np.vstack((self.AgePensionRI,np.percentile(self.AgePension_NPV,20,axis=0)))
        self.AgePensionRI = np.vstack((self.AgePensionRI,np.percentile(self.AgePension_NPV,80,axis=0)))
        
        self.ConsumpRI = np.vstack((self.Consump_NPV_median,np.percentile(self.Consump_Sim_NPV,5,axis=0)))
        self.ConsumpRI = np.vstack((self.ConsumpRI,np.percentile(self.Consump_Sim_NPV,95,axis=0)))
        self.ConsumpRI = np.vstack((self.ConsumpRI,np.percentile(self.Consump_Sim_NPV,20,axis=0)))
        self.ConsumpRI = np.vstack((self.ConsumpRI,np.percentile(self.Consump_Sim_NPV,80,axis=0)))
        
        self.StackRI = np.vstack((self.AnnuityPayment_NPV_median,self.SuperW_NPV_median))
        self.StackRI = np.vstack((self.StackRI,self.AgePension_NPV_median))
        
        # number of years before ruin
        Ruin = np.sum( np.where( Superb_Sim > 0, 1, 0 ),1 )        
        T_ruin_year = float(np.mean(Ruin)) # expectation of ruin years
        self.T_ruin_year= T_ruin_year
        self.T_std = round(float(np.std(Ruin)),4)        
        return T_ruin_year    
        
    def Prob_ruin(self): # can be removed to objective function module
        self.Ruin = np.where( self.Superb_Sim > 0, 0, 1 ) # return the simulated ruin        
        self.Prob_ruin_t = np.sum( np.where( self.Superb_Sim > 0, 0, 1 ),0 ) /self.NumOfSim
        #self.Prob_ruin_age = 

    def CumulativeConsumption(self):
        self.Cumulative_Consump = np.cumsum(self.Consump_Sim_NPV, axis = 1)
        self.Cumulative_Consump_median = np.median(  np.transpose( self.Cumulative_Consump ), 1 )
        
    #def CumulativeAP(self)：
        
        