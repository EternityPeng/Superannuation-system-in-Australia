# -*- coding: utf-8 -*-
"""
Created on Thu Nov 15 16:49:11 2018

@author: che27g
"""


import statsmodels.api as sm
import pandas as pd
import numpy as np
from sklearn import linear_model
import statistics as st
from statsmodels.tsa.arima_model import ARMA
from collections import OrderedDict
import csv

class Calibration:
    
    def __init__(self, csv_history, csv_param):
        # historical data csv file name
        self.csv_history = csv_history 
        # calibrated parameters save in csv_param
        self.csv_param = csv_param
        
        hd=pd.read_csv(csv_history) 
        Value=np.zeros([hd.shape[0]-1,hd.shape[1]-1])
        for i in range(1,hd.shape[1]):    
            for j in range(1,hd.shape[0]):
                Value[j-1,i-1]=hd.iloc[j,i]    
        
        # read in historical data inputs
        Dictionary_History={hd.iloc[0,1]:np.expand_dims(Value[:,0],axis=1)}           
        Dictionary_History.update({hd.iloc[0,i]: np.expand_dims(Value[:,i-1],axis=1) for i in range(1,hd.shape[1])})
        self.HistoricalData = Dictionary_History 
        
        # Parameters are going to be written in csv_param
        self.Parameter = OrderedDict()
        return
               
class SUPA(Calibration):
    
    def DataProcess(self):
        
        # q(t)
        CPI = self.HistoricalData['CPI'] #N+1 0-N 22 1993- 2014       
        self.inflation = np.log(CPI[1:]/CPI[:-1]) #N 1-N 21 1994-2014
        
        wage_index=self.HistoricalData['Wage_index'] #N
        self.wage= np.log(wage_index[1:]/wage_index[:-1]) #N-1
        
        r_shortTerm_index = self.HistoricalData['r_shortTerm'] #N
        self.r_shortTerm = r_shortTerm_index/100
        r_longTerm_index = self.HistoricalData['r_longTerm'] #N
        self.r_longTerm = r_longTerm_index/100
        
        self.cash =  ( self.r_shortTerm[1:] + self.r_shortTerm[:-1])/2
        
        # P(t) 0-21 N+1
        Dom_price_index = self.HistoricalData['Dom_asset_price_index']
        # p(t) 1-21 N 
        self.Dom_price = np.log( Dom_price_index[1:] / Dom_price_index[:-1] )  
        # E(t)
        Dom_total_return_index = self.HistoricalData['Dom_asset_total_return_index']
        # e(t) 1-21 N
        self.Dom_total_return = np.log( Dom_total_return_index[1:] / Dom_total_return_index[:-1] )  
        # D(t) 1-21 N 
        self.DivEstimate = ( np.exp( self.Dom_total_return - self.Dom_price ) -1 ) * Dom_price_index[1:] * np.exp(- self.Dom_price / 2 ) 
        #y(t)     N 1-21    
        self.DivYield = np.log( 1 + self.DivEstimate / Dom_price_index[1:]) 
        logmuy = np.log(np.mean(self.DivYield)) 
        # intermediate variable Xy  N 1-21
        self.Xy = np.log(self.DivYield) - logmuy
        
        #d(t) div growth rate 2-21 N-1
        self.dt = np.log(self.DivEstimate[1:]/self.DivEstimate[:-1]) 
        
        # international total return
        Int_total_return_index = self.HistoricalData['Int_asset_total_return_index']
        # n(t) 1-21 N
        self.Int_total_return = np.log(Int_total_return_index[1:]/Int_total_return_index[:-1])  
        
        Dom_bond_index = self.HistoricalData['Dom_bond_index']
        #b(t) 1-21 N
        self.Dom_bond=np.log(Dom_bond_index[1:]/Dom_bond_index[:-1]) #b(t)
        
        Int_bond_index = self.HistoricalData['Int_bond_index']
        # o(t) 1-21 o(t)
        self.Int_bond=np.log(Int_bond_index[1:] / Int_bond_index[:-1]) #o(t)
                      
        #self.Parameter['preeps_domDiv'] 
        self.Parameter['pre_inflation'] = float(self.inflation[-1])
        self.Parameter['pre_longTerm'] = float(self.r_longTerm[-1])
        self.Parameter['pre_cash'] = float(0.5*(self.r_shortTerm[-1]+self.r_shortTerm[-2]))
        
        self.Parameter['pre_divIndex'] = float(self.DivEstimate[-1]) # pre_divIndex D(t)                  
        self.Parameter['pre_shareIndex'] = float(Dom_price_index[-1])# pre_priceIndex P(t) 
        
        self.Parameter['pre_Xy'] =float( np.log(self.Xy[-1])) # pre_Xy
        self.Parameter['mu_domDivYield'] = float(np.mean(self.DivYield))
        print("domDY_std:", np.std(self.DivYield)/np.sqrt(21))
        
        # unemployment rate
        self.Unemply = self.HistoricalData['Unemployment'] #N+1
        self.Parameter['pre_unemply'] = float(self.Unemply[-1])# pre_unemployment u(t) 
        
        # house price index
        self.HPI = self.HistoricalData['HPI']  # ABS index      
        # house price growth rate
        self.House_rate =np.log(self.HPI[1:] / self.HPI[:-1])
        self.Parameter['pre_Hgr'] = float(self.House_rate[-1]) # pre_house growth rate h(t)
        
         #save the first historical data for backtesting
        self.History_init_inflation = float(self.inflation[0])
        self.History_init_longTerm = float(self.r_longTerm[0])
        self.History_init_shortTerm = float(self.r_shortTerm[0])
        self.History_init_Xy = float(self.Xy[0])
        self.History_init_domDivYield = float(self.DivYield[0])
        self.History_init_D_index = float(self.DivEstimate[0])
        self.History_init_P_index = float(Dom_price_index[0])
        self.History_init_houseGR = float(self.House_rate[0])
        self.History_init_unemply =  float(self.Unemply[0])
        
    def Calib_Param(self):        
        #CPI = self.HistoricalData['CPI']  inflation = np.log(CPI[1:]/CPI[:-1])
        X_q = self.inflation[:-1]  #1-20  1-(N-1)  Dim :N-1
        Y_q = self.inflation[1:]  #2-21  2-(N)
              
        X_q=sm.add_constant(X_q)
        model_q=sm.OLS(Y_q,X_q).fit()
        
        self.Parameter['mu_inflation'] = model_q.params[0]/(1-model_q.params[1])
        self.Parameter['phi_inflation'] = model_q.params[1]
        #self.model_res_q = Y_q - model_q.predict(X_q)
        self.model_res_q = model_q.resid
        self.Parameter['epsStd_inflation'] =np.std(self.model_res_q )
        print(np.std(self.model_res_q ))
#        model_q = linear_model.LinearRegression(fit_intercept=True)
#        model_q.fit(X_q,Y_q)        
#        self.model_res_q = Y_q - model_q.predict(X_q) #2-21 
#        self.Parameter['mu_inflation']=float(model_q.intercept_)/(1 - float(model_q.coef_))# dt=1
#        self.Parameter['phi_inflation']=float(model_q.coef_)
#        self.Parameter['epsStd_inflation']=float(np.std(self.model_res_q))
        print(model_q.summary())
         
        ## wage = np.log(wage_index[1:]/wage_index[:-1])    
        X_w = self.inflation[:-1] # N-2
        Y_w = self.wage[1:] #2-21
        
        X_w = sm.add_constant(X_w)
        model_w=sm.OLS(Y_w, X_w).fit()
        
        self.Parameter['mu_wage'] = model_w.params[0]
        self.Parameter['psi2_wage']= model_w.params[1]
        self.Parameter['psi1_wage']=0.0  #hard coded     
        #self.model_res_w = Y_w - model_w.predict(X_w)
        self.model_res_w = model_w.resid
        self.Parameter['epsStd_wage'] =np.std(self.model_res_w )
        #print(np.std(self.model_res_w ))       
        #print(model_w.summary())
        
#        model_w = linear_model.LinearRegression(fit_intercept=True)
#        model_w.fit(X_w,Y_w)        
#        self.model_res_w = Y_w - model_w.predict(X_w)  #2-21
#        
#        self.Parameter['psi1_wage']=0.0  #hard coded
#        self.Parameter['psi2_wage']=float(model_w.coef_)
#        self.Parameter['mu_wage']=float(model_w.intercept_)
#        self.Parameter['epsStd_wage']=float(np.std(self.model_res_w))
#      
        # long term real interest rate
        lnoq = self.r_longTerm[1:] - self.inflation #N-1
        X_lnoq = lnoq[:-1] # N-2 #1-20
        Y_lnoq = lnoq[1:] # 2-21
        
        
        X_lnoq = sm.add_constant(X_lnoq)
        model_lnoq=sm.OLS(Y_lnoq, X_lnoq).fit()
        
        self.Parameter['mu_longTermNoq'] = model_lnoq.params[0]/(1-model_lnoq.params[1])
        self.Parameter['kappa_longTermNoq']= 1- model_lnoq.params[1]
        #self.model_res_lnoq = Y_lnoq - model_lnoq.predict(X_lnoq)
        self.model_res_lnoq = model_lnoq.resid
        self.Parameter['epsStd_longTermNoq'] =np.std(self.model_res_lnoq )
        #print(np.std(self.model_res_w ))       
        print(model_lnoq.summary())
        
        
#        model_lnoq = linear_model.LinearRegression(fit_intercept=True)
#        model_lnoq.fit(X_lnoq,Y_lnoq)        
#        self.model_res_lnoq = Y_lnoq - model_lnoq.predict(X_lnoq) #2-21
#        
#        self.Parameter['mu_longTermNoq'] = float(model_lnoq.intercept_)/(1 - float(model_lnoq.coef_))
#        self.Parameter['kappa_longTermNoq'] = 1 - float(model_lnoq.coef_)
#        self.Parameter['epsStd_longTermNoq'] = np.std(self.model_res_lnoq)
 
        # Short Term real interest rate
        snoq = self.r_shortTerm[1:] - self.inflation # N-1       
        X_s = lnoq[:-1] - snoq[:-1] # N-2 1-20
        Y_s = snoq[1:] - snoq[:-1] # N-2  2-21
        
        model_snoq=sm.OLS(Y_s, X_s).fit()
        #self.model_res_snoq = Y_s - model_snoq.predict(X_s)
        self.model_res_snoq = model_snoq.resid
        self.Parameter['kappa_shortTermNoq'] = model_snoq.params[0]
        self.Parameter['epsStd_shortTermNoq'] = np.std(self.model_res_snoq)
        print(model_snoq.summary())
#        model_snoq = linear_model.LinearRegression(fit_intercept=False)
#        model_snoq.fit(X_s,Y_s)        
#        self.model_res_snoq = Y_s - model_snoq.predict(X_s)  #2-21
#        self.Parameter['kappa_shortTermNoq'] = float(model_snoq.coef_)
#        self.Parameter['epsStd_shortTermNoq'] = np.std(self.model_res_snoq)
        
        # domestic dividend yield
        X_xy = self.Xy[:-1] # N-1 1-20
        Y_xy = self.Xy[1:] #2-21
        
        model_xy=sm.OLS(Y_xy, X_xy).fit()
        
        #self.model_res_xy = Y_xy - model_xy.predict(X_xy)
        self.model_res_xy = model_xy.resid
        self.Parameter['phi_domDivYield'] = model_xy.params[0]
        self.Parameter['epsStd_domDivYield'] = np.std(self.model_res_xy)
        print(model_xy.summary())
        
#        model_xy = linear_model.LinearRegression(fit_intercept=False)
#        model_xy.fit(X_xy, Y_xy)        
#        self.model_res_xy = Y_xy - model_xy.predict(X_xy)     # 2-21  
#       
#        self.Parameter['phi_domDivYield'] = float(model_xy.coef_)
#        self.Parameter['epsStd_domDivYield'] = np.std(self.model_res_xy)
        self.Parameter['pre_domDivYield'] =float(self.DivYield[-1])
        self.Parameter['pre_Xy'] = float(self.Xy[-1])


        # domestic dividend growth rate       
        Y_dnoq = self.dt - self.inflation[1:] # 2-21 N-2
        X_exog = np.zeros([len(self.model_res_xy) - 1,2]) 
        X_exog[:,0] = self.model_res_xy[1:]
        X_exog[:,1] = self.model_res_xy[:-1]
        
        model_d = ARMA(Y_dnoq[1:], order=(0,1),exog=X_exog).fit()
        
        self.Parameter['mu_domDiv'] = model_d.params[0]
        self.Parameter['tau1_domDiv'] = model_d.params[1]
        self.Parameter['tau2_domDiv'] = model_d.params[2]
        self.Parameter['delta_domDiv'] = model_d.params[3]
        self.Parameter['epsStd_domDiv'] =  np.std(model_d.resid)
        print(model_d.summary())
        
        self.Parameter['pre_domDiv'] =  float(self.dt[-1])
        self.Parameter['preeps_domDivYield'] = self.model_res_xy[-1] 
        self.Parameter['preeps_domDiv'] = float(model_d.resid[-1] )
        self.model_res_d = model_d.resid.reshape(len(model_d.resid),1) #2-21
        
        
        self.History_init_domDiv = float(self.dt[0,0])
        self.History_init_eps_domDivYield =  self.model_res_xy[0] 
        self.History_init_eps_domDiv = float(model_d.resid[0] )
        
        # save dictionary of initial values for backtesting
        self.Dictionary_Backtest_init = \
        {'History_init_inflation':self.History_init_inflation,
         'History_init_longTerm':self.History_init_longTerm,
         'History_init_shortTerm':self.History_init_shortTerm,
         'History_init_Xy':self.History_init_Xy,
         'History_init_domDivYield': self.History_init_domDivYield, 
         'History_init_D_index':self.History_init_D_index,
         'History_init_P_index':self.History_init_P_index,
         'History_init_domDiv':self.History_init_domDiv,
         'History_init_eps_domDivYield':self.History_init_eps_domDivYield,
         'History_init_eps_domDiv':self.History_init_eps_domDiv,
         'History_init_houseGR':self.History_init_houseGR,
         'History_init_unemply':self.History_init_unemply,
         }
           
         # international equity return #n(t)
    
        X_n = self.Dom_total_return #e(t) domestic
        Y_n = self.Int_total_return #n(t) international
        
        X_n = sm.add_constant(X_n)
        model_n=sm.OLS(Y_n, X_n).fit()
        
        self.Parameter['mu_IntEqReturn'] = model_n.params[0]
        self.Parameter['psi_IntEqReturn']= model_n.params[1]
       
        #self.model_res_n = Y_n - model_n.predict(X_n)
        self.model_res_n = model_n.resid
        self.Parameter['epsStd_IntEqReturn'] =np.std(self.model_res_n )
        print(model_n.summary())
        
#        model_n = linear_model.LinearRegression(fit_intercept=True)
#        model_n.fit(X_n,Y_n)        
#        self.model_res_n = Y_n - model_n.predict(X_n)
#        
#        self.Parameter['mu_IntEqReturn'] = float(model_n.intercept_)
#        self.Parameter['psi_IntEqReturn'] = float(model_n.coef_)
#        self.Parameter['epsStd_IntEqReturn'] = np.std(self.model_res_n)

        # domestic bond b(t)
        X_b = np.zeros([len(self.r_shortTerm)-1, 4])
        X_b[:,0] = np.squeeze(self.r_longTerm[1:])
        X_b[:,1] = np.squeeze(self.r_longTerm[:-1])
        X_b[:,2] = np.squeeze(self.r_shortTerm[1:])
        X_b[:,3] = np.squeeze(self.r_shortTerm[:-1])        
        Y_b = self.Dom_bond
        
        model_b=sm.OLS(Y_b, X_b).fit()
        
        #model_b = linear_model.LinearRegression(fit_intercept=False)
        #model_b.fit(X_b,Y_b)        
        #self.model_res_b = Y_b - model_b.predict(X_b)
        self.model_res_b = model_b.resid
        self.Parameter['psi1_domBond'] = model_b.params[0]
        self.Parameter['psi2_domBond'] = model_b.params[1]
        self.Parameter['psi3_domBond'] = model_b.params[2] 
        self.Parameter['psi4_domBond'] = model_b.params[3]
        self.Parameter['epsStd_domBond'] = np.std(self.model_res_b)
        print(model_b.summary())

        
#        self.Parameter['psi1_domBond'] = model_b.coef_[0,0]
#        self.Parameter['psi2_domBond'] = model_b.coef_[0,1]
#        self.Parameter['psi3_domBond'] = model_b.coef_[0,2] 
#        self.Parameter['psi4_domBond'] = model_b.coef_[0,3]
#        self.Parameter['epsStd_domBond'] = np.std(self.model_res_b)

        #international bond(t)
        X_o = np.zeros([len(self.Int_bond[1:]),2])
        X_o[:,0] = np.squeeze(self.Dom_bond[1:]) #2:21
        X_o[:,1] = self.model_res_q #np.squeeze(self.model_res_q)
        Y_o = self.Int_bond[1:]
        
        X_o = sm.add_constant(X_o)
        model_o=sm.OLS(Y_o, X_o).fit()
        
        self.Parameter['psi_intBond'] = model_o.params[1]
        self.Parameter['tau_intBond'] = model_o.params[2]
        self.Parameter['mu_intBond'] =  model_o.params[0]
        #self.model_res_o = Y_o - model_o.predict(X_o)
        self.model_res_o = model_o.resid
        self.Parameter['epsStd_intBond'] = np.std(self.model_res_o)   
        print(model_o.summary())
        
#        model_o = linear_model.LinearRegression(fit_intercept=True)
#        model_o.fit(X_o,Y_o)        
#        
#        
#        self.Parameter['psi_intBond'] = model_o.coef_[0,0]
#        self.Parameter['tau_intBond'] = model_o.coef_[0,1]
#        self.Parameter['mu_intBond'] = float(model_o.intercept_)
#        self.Parameter['epsStd_intBond'] = np.std(self.model_res_o)
#        
        # Unemployment rate (q, s)
        D_inflation = self.inflation[1:] - self.inflation[:-1] #N-1  
        D_short = snoq[1:]-snoq[:-1]       
        X_u = np.column_stack((self.Unemply[1:-1], np.squeeze(D_inflation),np.squeeze(D_short)))
        X_u = sm.add_constant(X_u)
        Y_u = self.Unemply[2:]                    
        model_u = sm.OLS(Y_u,X_u).fit()
    
        self.Parameter['kappa_unemply'] = 1 - model_u.params[1]
        self.Parameter['alpha_u_inflation'] = model_u.params[2]
        self.Parameter['alpha_u_short'] = model_u.params[3]
        self.Parameter['mu_unemply'] = float(model_u.params[0])/(1 - model_u.params[1])
        self.Parameter['epsStd_unemply'] = np.std(np.squeeze(Y_u) - model_u.predict(X_u))
        #self.model_res_u = Y_u - model_u.predict(X_u)
        self.model_res_u = model_u.resid
        print(model_u.summary())
        
        # house price growth rate (q)
        X_Hgr = np.column_stack((np.squeeze(self.House_rate[:-1]), np.squeeze(self.inflation[:-1]))) 
        Y_Hgr  =  self.House_rate[1:]
        model_Hgr = sm.OLS(Y_Hgr,X_Hgr).fit()
        self.Parameter['alpha_Hgr'] = model_Hgr.params[0] 
        self.Parameter['alpha_Hgr_inflation'] = model_Hgr.params[1] 
        self.model_res_Hgr = model_Hgr.resid
        self.Parameter['epsStd_Hgr'] = np.std(self.model_res_Hgr)
        #self.model_res_Hgr = Y_Hgr - model_Hgr.predict(X_Hgr)
        
        print(model_Hgr.summary())

        
    def print_Corr(self): # test the correlation of the residuals of each variables.


        Res=np.squeeze(np.stack((self.model_res_q[1:],\
                                 self.model_res_w[1:],\
                                 self.model_res_lnoq[1:],\
                                 self.model_res_snoq[1:],\
                                 self.model_res_xy[1:], \
                                 self.model_res_d,\
                                 self.model_res_n[2:],
                                 self.model_res_b[2:],
                                 self.model_res_o[1:],
                                 self.model_res_u[2:],)))#int bond
        self.Res=Res
        self.Corr=np.corrcoef(Res)
        np.set_printoptions(precision=4,threshold=np.inf, suppress=True)
        print(self.Corr)
        return 
        
           
    def WriteCSV(self): # save dictionary in csv to keep the order
        with open(self.csv_param,'w',newline='') as csvfile:
            
            fieldnames=['Param_name','Param_value']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            # number of variables in extended SUPA model
            writer.writerow({'Param_name':'NumVar','Param_value':int(14)})
            # inflation
            writer.writerow({'Param_name':'mu_inflation','Param_value':self.Parameter['mu_inflation']})
            writer.writerow({'Param_name':'phi_inflation','Param_value':self.Parameter['phi_inflation']})
            writer.writerow({'Param_name':'pre_inflation','Param_value':self.Parameter['pre_inflation']})
            writer.writerow({'Param_name':'epsStd_inflation','Param_value':self.Parameter['epsStd_inflation']})
            # wage
            writer.writerow({'Param_name':'mu_wage','Param_value':self.Parameter['mu_wage']})
            writer.writerow({'Param_name':'psi1_wage','Param_value':self.Parameter['psi1_wage']})
            writer.writerow({'Param_name':'psi2_wage','Param_value':self.Parameter['psi2_wage']})
            writer.writerow({'Param_name':'epsStd_wage','Param_value':self.Parameter['epsStd_wage']})
            # long term rate
            writer.writerow({'Param_name':'mu_longTermNoq','Param_value':self.Parameter['mu_longTermNoq']})
            writer.writerow({'Param_name':'kappa_longTermNoq','Param_value':self.Parameter['kappa_longTermNoq']})
            writer.writerow({'Param_name':'epsStd_longTermNoq','Param_value':self.Parameter['epsStd_longTermNoq']})
            # short term rate
            writer.writerow({'Param_name':'kappa_shortTermNoq','Param_value':self.Parameter['kappa_shortTermNoq']})
            writer.writerow({'Param_name':'epsStd_shortTermNoq','Param_value':self.Parameter['epsStd_shortTermNoq']})
            # cash
            writer.writerow({'Param_name':'pre_cash','Param_value':self.Parameter['pre_cash']})
            # domestic div yield
            writer.writerow({'Param_name':'mu_domDivYield','Param_value':self.Parameter['mu_domDivYield']})
            writer.writerow({'Param_name':'phi_domDivYield','Param_value':self.Parameter['phi_domDivYield']})
            writer.writerow({'Param_name':'pre_domDivYield','Param_value':self.Parameter['pre_domDivYield']})
            writer.writerow({'Param_name':'epsStd_domDivYield','Param_value':self.Parameter['epsStd_domDivYield']})
            writer.writerow({'Param_name':'pre_Xy','Param_value':self.Parameter['pre_Xy']})
            
            
            # domestic div
            writer.writerow({'Param_name':'mu_domDiv','Param_value':self.Parameter['mu_domDiv']})
            writer.writerow({'Param_name':'delta_domDiv','Param_value':self.Parameter['delta_domDiv']})
            writer.writerow({'Param_name':'tau1_domDiv','Param_value':self.Parameter['tau1_domDiv']})
            writer.writerow({'Param_name':'tau2_domDiv','Param_value':self.Parameter['tau2_domDiv']})
            writer.writerow({'Param_name':'preeps_domDivYield','Param_value':self.Parameter['preeps_domDivYield']})
            writer.writerow({'Param_name':'preeps_domDiv','Param_value':self.Parameter['preeps_domDiv']})
            writer.writerow({'Param_name':'epsStd_domDiv','Param_value':self.Parameter['epsStd_domDiv']})
            #  index
            writer.writerow({'Param_name':'pre_divIndex','Param_value':self.Parameter['pre_divIndex']})
            writer.writerow({'Param_name':'pre_shareIndex','Param_value':self.Parameter['pre_shareIndex']})
            # domestic equity return
            writer.writerow({'Param_name':'domEqReturn','Param_value':0})
            # international equity return
            writer.writerow({'Param_name':'mu_IntEqReturn','Param_value':self.Parameter['mu_IntEqReturn']})
            writer.writerow({'Param_name':'psi_IntEqReturn','Param_value':self.Parameter['psi_IntEqReturn']})
            writer.writerow({'Param_name':'epsStd_IntEqReturn','Param_value':self.Parameter['epsStd_IntEqReturn']})
            # domestic bond
            writer.writerow({'Param_name':'psi1_domBond','Param_value':self.Parameter['psi1_domBond']})
            writer.writerow({'Param_name':'psi2_domBond','Param_value':self.Parameter['psi2_domBond']})
            writer.writerow({'Param_name':'psi3_domBond','Param_value':self.Parameter['psi3_domBond']})
            writer.writerow({'Param_name':'psi4_domBond','Param_value':self.Parameter['psi4_domBond']})
            writer.writerow({'Param_name':'pre_longTerm','Param_value':self.Parameter['pre_longTerm']})
            writer.writerow({'Param_name':'epsStd_domBond','Param_value':self.Parameter['epsStd_domBond']})
            # international bond
            writer.writerow({'Param_name':'mu_intBond','Param_value':self.Parameter['mu_intBond']})
            writer.writerow({'Param_name':'psi_intBond','Param_value':self.Parameter['psi_intBond']})
            writer.writerow({'Param_name':'tau_intBond','Param_value':self.Parameter['tau_intBond']})
            writer.writerow({'Param_name':'epsStd_intBond','Param_value':self.Parameter['epsStd_intBond']})
            # house price
            writer.writerow({'Param_name':'alpha_Hgr','Param_value':self.Parameter['alpha_Hgr']})
            writer.writerow({'Param_name':'alpha_Hgr_inflation','Param_value':self.Parameter['alpha_Hgr_inflation']})
            writer.writerow({'Param_name':'epsStd_Hgr','Param_value':self.Parameter['epsStd_Hgr']})
            writer.writerow({'Param_name':'pre_Hgr','Param_value':self.Parameter['pre_Hgr']})
            
            
            #writer.writerow({'Param_name':'pre_Hgr22222','Param_value':1111})
            # unemployment
            writer.writerow({'Param_name':'mu_unemply','Param_value':self.Parameter['mu_unemply']})
            writer.writerow({'Param_name':'kappa_unemply','Param_value':self.Parameter['kappa_unemply']})
            writer.writerow({'Param_name':'alpha_u_inflation','Param_value':self.Parameter['alpha_u_inflation']})
            writer.writerow({'Param_name':'alpha_u_short','Param_value':self.Parameter['alpha_u_short']})
            writer.writerow({'Param_name':'epsStd_unemply','Param_value':self.Parameter['epsStd_unemply']})
            writer.writerow({'Param_name':'pre_unemply','Param_value':self.Parameter['pre_unemply']})

                        # historical value for backtesting
            writer.writerow({'Param_name':'inflation_HistInit','Param_value':self.History_init_inflation})
            writer.writerow({'Param_name':'longTerm_HistInit','Param_value':self.History_init_longTerm})
            writer.writerow({'Param_name':'shortTerm_HistInit','Param_value':self.History_init_shortTerm})
            writer.writerow({'Param_name':'Xy_HistInit','Param_value':self.History_init_Xy})
            #new added line below
            writer.writerow({'Param_name':'domDivYield_HistInit','Param_value':self.History_init_domDivYield})

            writer.writerow({'Param_name':'D_index_HistInit','Param_value':self.History_init_D_index})
            writer.writerow({'Param_name':'P_index_HistInit','Param_value':self.History_init_P_index})
            writer.writerow({'Param_name':'domDiv_HistInit','Param_value':self.History_init_domDiv})
            writer.writerow({'Param_name':'eps_domDivYield_HistInit','Param_value':self.History_init_eps_domDivYield})
            writer.writerow({'Param_name':'eps_domDiv_HistInit','Param_value':self.History_init_eps_domDiv})
            writer.writerow({'Param_name':'houseGR_HistInit','Param_value':self.History_init_houseGR})
            writer.writerow({'Param_name':'unemply_HistInit','Param_value':self.History_init_unemply})

                             


