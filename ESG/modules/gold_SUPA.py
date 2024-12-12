# -*- coding: utf-8 -*-

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

class SUPAModel:

    def __init__(self, csv_param):
        self.param = csv_param
        
        hd=pd.read_csv(csv_param)
        self.Dictionary_Param ={hd.iloc[0,0]:hd.iloc[0,1]}
        self.Dictionary_Param.update({hd.iloc[i,0]: hd.iloc[i,1] for i in range(hd.shape[0])})
        self.Parameter = self.Dictionary_Param
        self.NumV=int(self.Parameter['NumVar'])
  
        
class ExtendedSUPA(SUPAModel): 

    def AssumeSimulationParameters(self):

        self.Parameter = self.Dictionary_Param
#        #self.BacktestInit = Dictionary_BacktestInit# parameters        
    def ForwardSimulation(self, NumOfSim, NumOfTime, freq, back_test): 
        # back_test == 0 forward simulation, back_test == 1, true. It controls differenti initial values
        # freq : number of time steps per year
        # dt: time step
        NumOfTime = NumOfTime+1
        self.dt=1.0/freq          
        dt=self.dt  
        sqrt_dt=np.sqrt(dt)  
        
        # add extra sim for median
        if NumOfSim > 1:
            NumOfSim = NumOfSim+1
          
        # Read in parameters for SUPA model
        # mu is the mean , sigma is the volatility
        
        # 1 q(t) = mu_q (1-phi_q) + phi_q q(t-1) + e_q(t)
        mu_inflation=self.Parameter['mu_inflation']
        phi_inflation=self.Parameter['phi_inflation']
        sigma_inflation=self.Parameter['epsStd_inflation']
        
        # 2 wage
        #w(t) = psi_1 q(t) + psi_2 q(t-1) + mu_w + e_w(t)        
        mu_wage=self.Parameter['mu_wage']    
        psi1_wage=self.Parameter['psi1_wage']
        psi2_wage=self.Parameter['psi2_wage']
        sigma_wage=self.Parameter['epsStd_wage']
        
        # 3 long term interest 
        # l_noq(t) = l_noq(t-1) + kappa_l_noq (mu_l - mu_q - l_noq (t-1) ) + e_l(t)
        mu_longTerm=self.Parameter['mu_longTermNoq']
        kappa_longTerm=self.Parameter['kappa_longTermNoq']  
        sigma_longTerm=self.Parameter['epsStd_longTermNoq']
        
        # 4 short term interst
        # s_noq(t) = s_noq(t-1) + kappa_s ( l_noq(t-1) - s_noq(t-1) ) + e_s(t)
        kappa_shortTerm=self.Parameter['kappa_shortTermNoq']
        sigma_shortTerm=self.Parameter['epsStd_shortTermNoq']
        
        # 5 cash c(t)
        # c(t+1) = (s(t+1) + s(t))/2
        
        # 6 domestic equity dividend yield y(t)
        # ln(y(t)) = ln(mu_y) + X_y(t) 
        # X_y(t) = phi_y X_y(t-1) + e_y(t)
        # X_y(t) is the deviation of ln(y(t)) from mean ln(mu_y)
        
        mu_domDivYield=self.Parameter['mu_domDivYield']
        phi_domDivYield=self.Parameter['phi_domDivYield']
        #pre_xy=self.Parameter['pre_domDivYield'] This one is wrong
        pre_xy=self.Parameter['pre_Xy']
        sigma_domDivYield=self.Parameter['epsStd_domDivYield']
        
        # 7 d[t] domestic equity dividends growth rate
        # d(t) = q(t) + mu_d + tau_1 e_y(t) + tau_2 e_y(t-1) + e_d(t) + theta_d e_d(t-1)
        mu_domDiv=self.Parameter['mu_domDiv']  
        delta_domDiv=self.Parameter['delta_domDiv']  
        tau1_domDiv=self.Parameter['tau1_domDiv'] 
        tau2_domDiv=self.Parameter['tau2_domDiv'] 
        pre_zdomDivYield=self.Parameter['preeps_domDivYield'] 
        pre_zdomDiv=self.Parameter['preeps_domDiv'] 
        sigma_domDiv=self.Parameter['epsStd_domDiv']
        
        # dividends: D(t)= D(t-1)exp(d(t))
    
        # 8 p[t] domestic price return
        # p(t) = ln(D(t)/ln(1+y(t))) - ln(P(t-1))
        # price index: P(t) = P(t-1) exp( p(t) )
        

        # 9 e[t] domestic total return
        # e(t) = p(t) + ln( 1+ln(1+y(t))exp(p(t)/2) )
        
        # 10 n[t] international equity total return
        # n(t) = mu_n + psi_n e(t) + e_n(t)
        mu_IntEqReturn=self.Parameter['mu_IntEqReturn'] 
        psi_IntEqReturn=self.Parameter['psi_IntEqReturn'] 
        sigma_IntEqReturn=self.Parameter['epsStd_IntEqReturn'] 

        # 11 b[t] domestic bond
        # b(t) = psi1 l(t) + psi2 l(t-1) + psi3 s(t) + psi4 s(t-1) + e_b(t)
        psi1_domBond=self.Parameter['psi1_domBond']
        psi2_domBond=self.Parameter['psi2_domBond']
        psi3_domBond=self.Parameter['psi3_domBond']
        psi4_domBond=self.Parameter['psi4_domBond']      
        sigma_domBond=self.Parameter['epsStd_domBond']
        
        # 12 o[t] international bond
        # o(t) = mu_o + psi_o b(t) + tau_o e_q(t) + e_o(t)
        mu_intBond=self.Parameter['mu_intBond']
        psi_intBond=self.Parameter['psi_intBond']
        tau_intBond=self.Parameter['tau_intBond']
        sigma_intBond=self.Parameter['epsStd_intBond']
        
        # 13 h[t] h(t) = h(t-1) + kapapa_h (mu_h - h(t-1)) + e_h(t)
        alpha_Hgr = self.Parameter['alpha_Hgr']
        alpha_Hgr_inflation = self.Parameter['alpha_Hgr_inflation']
        sigma_Hgr= self.Parameter['epsStd_Hgr']
        pre_Hgr = self.Parameter['pre_Hgr']
        
        # 14 u[t] u(t) = u(t-1) + kappa_u (mu_u - u(t-1)) + alpha_q (q(t)-q(t-1)) + alpha_s (s_noq(t)-s_noq(t-1))+e_u(t)
        mu_unemply=self.Parameter['mu_unemply']
        kappa_unemply = self.Parameter['kappa_unemply']
        alpha_u_inf = self.Parameter['alpha_u_inflation']
        alpha_u_short = self.Parameter['alpha_u_short']
        sigma_unemply = self.Parameter['epsStd_unemply']
        pre_unemply = self.Parameter['pre_unemply']

        # pick initial values to start simulation.
        # forward simulation, start from the last historical values
        if back_test == 0:            
            pre_inflation=self.Parameter['pre_inflation']
            pre_longTerm=self.Parameter['pre_longTerm']
            pre_cash=self.Parameter['pre_cash'] #s[0]
            pre_domDivYield=self.Parameter['pre_domDivYield']
            pre_xy=self.Parameter['pre_Xy']
            pre_zdomDivYield=self.Parameter['preeps_domDivYield'] 
            pre_zdomDiv=self.Parameter['preeps_domDiv'] 
            pre_D_index=self.Parameter['pre_divIndex']
            pre_P_index=self.Parameter['pre_shareIndex']
            pre_Hgr = self.Parameter['pre_Hgr']
            pre_unemply = self.Parameter['pre_unemply']
            pre_gold = self.Parameter['pre_gold']
        else: #initial value for backtesting is the first historical values
            pre_inflation=self.Parameter['inflation_HistInit']
            pre_longTerm=self.Parameter['longTerm_HistInit']
            pre_cash=self.Parameter['shortTerm_HistInit'] #s[0]
            pre_domDivYield = self.Parameter['domDivYield_HistInit']
            pre_xy=self.Parameter['Xy_HistInit']
            pre_zdomDivYield=self.Parameter['eps_domDivYield_HistInit'] 
            pre_zdomDiv=self.Parameter['eps_domDiv_HistInit'] 
            pre_D_index=self.Parameter['D_index_HistInit']
            pre_P_index=self.Parameter['P_index_HistInit']
            pre_Hgr = self.Parameter['houseGR_HistInit']
            pre_unemply = self.Parameter['unemply_HistInit']
            pre_gold = self.Parameter['pre_gold']

                
        
        # set random seed
        np.random.seed(1000)
        
        # simulate all the facotrs 
        SIM_X = np.zeros([NumOfSim, NumOfTime+1, self.NumV])
        
        # slicing variables into NumV=14 slices     
        inflation = SIM_X[:,:,0]
        wage = SIM_X[:,:,1]
        r_longTerm = SIM_X[:,:,2]
        r_shortTerm = SIM_X[:,:,3]        
        cash  = SIM_X[:,:,4]
        domDivYield = SIM_X[:,:,5] #y
        domDiv = SIM_X[:,:,6] #d
        domPriceReturn = SIM_X[:,:,7] #p
        domEqReturn = SIM_X[:,:,8] # e[t]
        intEqReturn = SIM_X[:,:,9] # n[t]
        domBond = SIM_X[:,:,10] # b[t]
        intBond = SIM_X[:,:,11] # o[t]
        house_gr = SIM_X[:,:,12] # h[t]
        unemply =  SIM_X[:,:,13] # u[t]
        gold = SIM_X[:,:,14] # g[t]

        #Initial values before simulation 
        inflation[:,0]= pre_inflation #initial inflation
        wage[:,0]= psi2_wage * inflation[:,0] + mu_wage #initial wage inflation
        pre_lnoq = np.zeros(NumOfSim) # pre_lnoq and lnoq are two temporary variables
        pre_lnoq = pre_longTerm - pre_inflation
        r_longTerm[:,0] = pre_longTerm #initial long term rate
        
        pre_snoq = np.zeros(NumOfSim)
        
        pre_snoq = pre_cash - pre_inflation 
        r_shortTerm[:,0] = pre_cash # initial short term rate
        
        cash[:,0] = pre_cash # initial cash
        
        z_domDivYield = np.random.randn(NumOfSim) 
        
        #pre_Xy = phi_domDivYield * pre_xy + z_domDivYield * sigma_domDivYield * sqrt_dt #initial xy
        pre_Xy = pre_xy #initial xy
        #domDivYield[:,0]= mu_domDivYield*np.exp(pre_Xy)
        #domDivYield[:,0]=  pre_domDivYield
        domDivYield[:,0]= mu_domDivYield * np.exp(pre_Xy) # initial y
        
        domDiv[:,0] = inflation[:,0] + mu_domDiv*dt # initial dividend d
        
        pre_D_index = pre_D_index * np.exp(domDiv[:,0])
        domPriceReturn[:,0] =np.log(pre_D_index/np.log(1.0 + domDivYield[:,0])) - np.log(pre_P_index)     
        pre_P_index = pre_P_index * np.exp(domPriceReturn[:,0])
        
        # domestic total return is computed from price return and dividend
        domEqReturn[:,0] = domPriceReturn[:,0] + np.log(1 + np.log(1+domDivYield[:,0]) )* np.exp(domPriceReturn[:,0]/2.0)
        
        intEqReturn[:,0] = mu_IntEqReturn + psi_IntEqReturn * domEqReturn[:,0]
        
        domBond[:,0] = (psi1_domBond + psi2_domBond)  * r_longTerm[:,0] + (psi3_domBond + psi4_domBond) * r_shortTerm[:,0]
        intBond[:,0] = mu_intBond + psi_intBond * domBond[:,0] 
        
        house_gr[:,0] = pre_Hgr
        unemply[:,0] = pre_unemply
        nagetive_interest = -0.005
        # simulation
        for tt in range(NumOfTime):
            #inflation  
            # q(t) = mu_q (1-phi_q) + phi_q q(t-1) + e_q(t)
            z_inflation = np.random.randn(NumOfSim)
            inflation[:,tt+1] = inflation[:,tt] + (1-phi_inflation)*(mu_inflation - inflation[:,tt]) * dt + sigma_inflation * z_inflation * sqrt_dt
            
            #wage inflation 
            #w(t) = psi_1 q(t) + psi_2 q(t-1) + mu_w + e_w(t)        
            z_wage = np.random.randn(NumOfSim)
            wage[:,tt+1] = psi1_wage * inflation[:,tt+1] + psi2_wage * inflation[:,tt] + mu_wage + sigma_wage * z_wage * sqrt_dt
            #long term
            # l_noq(t) = l_noq(t-1) + kappa_l_noq (mu_l - mu_q - l_noq (t-1) ) + e_l(t)
            z_longTerm = np.random.randn(NumOfSim)
            lnoq = pre_lnoq + kappa_longTerm * (mu_longTerm - mu_inflation - pre_lnoq) * dt + sigma_longTerm * z_longTerm * sqrt_dt 
            #lnoq = pre_lnoq + kappa_longTerm * (mu_longTerm - r_longTerm[:,tt]) * dt + sigma_longTerm * z_longTerm * sqrt_dt 
            r_longTerm[:,tt+1] = np.maximum(lnoq + inflation[:,tt+1], nagetive_interest )           
            
            #short term r
            # s_noq(t) = s_noq(t-1) + kappa_s ( l_noq(t-1) - s_noq(t-1) ) + e_s(t)
            z_shortTerm = np.random.randn(NumOfSim)
            snoq = pre_snoq + kappa_shortTerm * (pre_lnoq - pre_snoq) * dt + sigma_shortTerm * z_shortTerm * sqrt_dt 
            r_shortTerm[:,tt+1] = np.maximum(snoq + inflation[:,tt+1], nagetive_interest )
            #cash
            cash[:,tt+1] = 0.5 * (r_shortTerm[:,tt] + r_shortTerm[:,tt+1])
            #domestic equity dividend yield y(t)
            z_domDivYield = np.random.randn(NumOfSim)
            Xy = pre_Xy + (1-phi_domDivYield) * (-pre_Xy) * dt + sigma_domDivYield * z_domDivYield * sqrt_dt
            #pre_Xy = Xy
            domDivYield[:,tt+1] = mu_domDivYield * np.exp(Xy)
            
            # domestic equity dividends d(t)
            z_domDiv = np.random.randn(NumOfSim)
            domDiv[:,tt+1] = inflation[:,tt+1] + mu_domDiv * dt+ \
            ( sigma_domDivYield * ( tau1_domDiv * z_domDivYield +  tau2_domDiv * pre_zdomDivYield )+\
              sigma_domDiv * (z_domDiv + delta_domDiv * pre_zdomDiv) ) * sqrt_dt
             
            # dom price return p(t)           
            pre_D_index = pre_D_index * np.exp(domDiv[:,tt+1]) #indexd          
            domPriceReturn[:,tt+1] = np.log(pre_D_index/np.log(1.0 + domDivYield[:,tt+1])) - np.log(pre_P_index)
            pre_P_index = pre_P_index * np.exp(domPriceReturn[:,tt+1])
            
            #domestic equity total return e(t)
            domEqReturn[:,tt+1] = domPriceReturn[:,tt+1] + np.log(1.0 + np.log(1+domDivYield[:,tt+1])  * np.exp(domPriceReturn[:,tt+1]/2.0))
        
            # international equity total return n(t)
            z_IntEqReturn = np.random.randn(NumOfSim)
            intEqReturn[:,tt+1] = mu_IntEqReturn + psi_IntEqReturn * domEqReturn[:,tt+1] + sigma_IntEqReturn * z_IntEqReturn * sqrt_dt
            
            # domestic bond
            z_domBond = np.random.randn(NumOfSim)
            domBond[:,tt+1] = psi1_domBond * r_longTerm[:,tt+1] + psi2_domBond * r_longTerm[:,tt]\
            + psi3_domBond * r_shortTerm[:,tt+1] + psi4_domBond * r_shortTerm[:,tt] + sigma_domBond * z_domBond * sqrt_dt
                        
            # international bond
            z_intBond = np.random.randn(NumOfSim)
            intBond[:, tt+1] = mu_intBond + psi_intBond * domBond[:,tt+1] +\
            (tau_intBond * sigma_inflation * z_inflation + sigma_intBond * z_intBond )* sqrt_dt
                       
            pre_Xy = Xy # update xy
            
            pre_zdomDivYield = z_domDivYield
            pre_zdomDiv = z_domDiv
            
            z_house = np.random.randn(NumOfSim)    
            house_gr[:,tt+1] = alpha_Hgr * house_gr[:,tt] + alpha_Hgr_inflation * inflation[:,tt] + sigma_Hgr * z_house * sqrt_dt

            z_unemply = np.random.randn(NumOfSim)
            unemply[:,tt+1] = unemply[:,tt] + kappa_unemply * ( mu_unemply - unemply[:,tt]) * dt + \
            alpha_u_inf * (inflation[:,tt+1]-inflation[:,tt]) + alpha_u_short * (snoq - pre_snoq) + sigma_unemply * z_unemply * sqrt_dt
           # Temporary saves
            pre_lnoq = lnoq # temporarily save lnoq
            pre_snoq = snoq # update pre_snoq
            
        SIM_X[:,:,0] = inflation
        SIM_X[:,:,1] = wage 
        SIM_X[:,:,2] = r_longTerm
        SIM_X[:,:,3] = r_shortTerm      
        SIM_X[:,:,4] = cash 
        SIM_X[:,:,5] = domDivYield  #y
        SIM_X[:,:,6] = domDiv #d
        SIM_X[:,:,7] = domPriceReturn #p
        SIM_X[:,:,8] = domEqReturn  # e[t]
        SIM_X[:,:,9] = intEqReturn  # n[t]
        SIM_X[:,:,10] = domBond  # b[t]
        SIM_X[:,:,11] = intBond  # o[t]
        SIM_X[:,:,12] = house_gr  # h[t]
        SIM_X[:,:,13] = unemply # u[t]
        SIM_X[:,:,14] = gold # g[t]

        self.SIM_X = SIM_X[:,1:,:]
        self.SIM_X_full = SIM_X[:,:,:]
        
        # Add median data to each variable simulation
        if NumOfSim > 1:
            for z in range(self.NumV):
                for y in range(NumOfTime):
                    SIM_X[NumOfSim-1,y+1,z]=np.percentile(SIM_X[:-1,y,z],50,axis=0)


        self.SIM_X = SIM_X[:,1:,:]
        self.SIM_X_full = SIM_X[:,:,:]
        

