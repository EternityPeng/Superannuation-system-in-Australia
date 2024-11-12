# -*- coding: utf-8 -*-
"""
Created on Mon Jun 25 14:39:30 2018

@author: che27g
"""

import matplotlib.pyplot as plt
import numpy as np
from CSIROcolour import CSIRO

class PlotSUPA:
    
    def __init__(self):
        pass 
    def _InputData(self,X):
        self.X = X
        self.NumOfVariable = X.shape[1]
        self.dX = np.diff(self.X,axis=0)
    def PlotPercentile(self, Backtest_SIMi, NumOfDraw, NumOfTime, freq):        
        dt = 1.0/freq
        t=np.linspace(0, dt*NumOfTime, NumOfTime+1)
        p=5
        Lower = np.percentile(Backtest_SIMi,p,axis=0)
        Upper = np.percentile(Backtest_SIMi,100-p,axis=0)      
        plt.plot(t, Lower,color='b')
        plt.plot(t, Upper,color='b')

        
class SUPASimulation(PlotSUPA):

    def PlotSUPA(self, SIM_X, NumOfSim, NumOfTime, freq):
        dt = 1.0/freq
        t=np.linspace(0, dt*NumOfTime, NumOfTime+1)
     
        fig_SIM = plt.figure(figsize=(25,15))
        ax1 = fig_SIM .add_subplot(441)
        ax1.plot(t, np.transpose(SIM_X[:,:,0])) #inflation
        ax1.set_title('inflation q(t)')
        
        ax2 = fig_SIM .add_subplot(442)
        ax2.plot(t,np.transpose(SIM_X[:,:,1])) #wageinflation
        ax2.set_title('wage inflation w(t)')
        
        ax3 = fig_SIM .add_subplot(443)
        ax3.plot(t,np.transpose(SIM_X[:,:,2])) #long term interest rate
        ax3.set_title('long term interest rate l(t)')
        
        ax4 = fig_SIM .add_subplot(444)
        ax4.plot(t,np.transpose(SIM_X[:,:,3])) #short term interest rate
        ax4.set_title('short term interest rate s(t)')
        
        ax5 = fig_SIM.add_subplot(445)
        ax5.plot(t,np.transpose(SIM_X[:,:,4])) # cash
        ax5.set_title('cash c(t)')


        ax6 = fig_SIM.add_subplot(446)
        ax6.plot(t,np.transpose(SIM_X[:,:,5])) #domest dividends yield
        ax6.set_title('domestic dividends yield y(t)')
        
        
        ax7 = fig_SIM.add_subplot(447)
        ax7.plot(t,np.transpose(SIM_X[:,:,6])) #domest dividend
        ax7.set_title('domestic equityies dividends d(t)')
        
        ax8 = fig_SIM.add_subplot(448)
        ax8.plot(t,np.transpose(SIM_X[:,:,7])) #domest  price return
        ax8.set_title('domestic equities price return p(t)')
        
        ax9 = fig_SIM.add_subplot(449)
        ax9.plot(t,np.transpose(SIM_X[:,:,8])) # total return
        ax9.set_title('domestic equities total return e(t)')
        
        ax10 = fig_SIM.add_subplot(4,4,10)
        ax10.plot(t,np.transpose(SIM_X[:,:,9])) #international total
        ax10.set_title('international dividends total return n(t)')
        
        ax11 = fig_SIM.add_subplot(4,4,11)
        ax11.plot(t,np.transpose(SIM_X[:,:,10])) #domestic bond
        ax11.set_title('domestic bonds b(t)')
        
        ax12 = fig_SIM.add_subplot(4,4,12)
        ax12.plot(t,np.transpose(SIM_X[:,:,11])) #international bond
        ax12.set_title('international bonds o(t)')
        
        ax13 = fig_SIM.add_subplot(4,4,13)
        ax13.plot(t,np.transpose(SIM_X[:,:,12])) # cash
        ax13.set_title('house h(t)')
        
        ax14 = fig_SIM.add_subplot(4,4,14)
        ax14.plot(t,np.transpose(SIM_X[:,:,13])) #domest dividends yield
        ax14.set_title('unemployment rate u(t)')


    def QuantilePlot(self,ax,x,Sim,p):
        p_l = p
        p_u = 100-p
        ax.plot(x,np.percentile(Sim,p_l,axis=1),color=CSIRO['orange'],alpha=0.7, linestyle = '--',linewidth=2)
        ax.plot(x,np.percentile(Sim,50,axis=1),color=CSIRO['ocean blue'],alpha=0.7, linestyle = '--',linewidth=2)
        ax.plot(x,np.percentile(Sim,p_u,axis=1),color=CSIRO['orange'],alpha=0.7, linestyle = '--',linewidth=2)
        
    def PlotSUPA3(self, Year, SIM_X, NumOfSim, NumOfTime, freq):
        
        #x_age = np.arange(Year, Year + NumOfTime+1)
        
        dt = 1.0/freq
        t=np.linspace(0, dt*NumOfTime, NumOfTime+1)
     
        fig_SIM = plt.figure(figsize=(9,15))
        ax1 = fig_SIM .add_subplot(311)
        ax1.plot(t[1:], np.transpose(SIM_X[:,:,0])) #inflation
        ax1.set_title('inflation q(t)')
        
        ax2 = fig_SIM .add_subplot(312)
        ax2.plot(t[1:],np.transpose(SIM_X[:,:,2])) #wageinflation
        ax2.set_title('long term interest rate l(t)')
        
        ax3 = fig_SIM .add_subplot(313)
        ax3.plot(t[1:],np.transpose(SIM_X[:,:,8])) #long term interest rate
        ax3.set_title('domestic equities total return e(t)')             
            
        axx=[ax1,ax2,ax3]
   
        for i in range(len(axx)):                   
            axx[i].set_xlim((1, 0+NumOfTime-1))
            
    def PlotQuantiles3(self, Year, SIM_X, NumOfSim, NumOfTime, freq):
        
        dt = 1.0/freq
        t=np.linspace(0, dt*NumOfTime, NumOfTime+1)
     
        fig_SIM = plt.figure(figsize=(9,15))
        p=10
        
        ax4 = fig_SIM.add_subplot(311)      
        self.QuantilePlot(ax4, t, np.transpose(SIM_X[:,:,0]),p)
        
        
        ax5 = fig_SIM.add_subplot(312)      
        self.QuantilePlot(ax5, t, np.transpose(SIM_X[:,:,2]),p)
        
        ax6 = fig_SIM.add_subplot(313)      
        self.QuantilePlot(ax6, t, np.transpose(SIM_X[:,:,8]),p)
            
        axx=[ax4, ax5, ax6]
   
        for i in range(len(axx)):                   
            axx[i].set_xlim((1, 0+NumOfTime-1))
            

        

        
class SUPABackTest(PlotSUPA): 
    
    def BackTestPlot(self,Backtest_SIM_X,Calib_SUPA, M_backtest, T_history, freq_history ):
        
        
        fig_SIM = plt.figure(figsize=(25,15))
        ax1 = fig_SIM .add_subplot(441)
        ax1.set_title('inflation q(t)')
        self.PlotPercentile(Backtest_SIM_X[:,:,0], M_backtest, T_history, freq_history )
    #Model_SUPA.PlotSUPA_BackTest(M_backtest, T_history, freq_history)
        plt.plot(Calib_SUPA.inflation)
        
        ax2 = fig_SIM .add_subplot(442)
        ax2.set_title('wage inflation w(t)')
        self.PlotPercentile(Backtest_SIM_X[:,:,1], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.wage)
        
        ax3 = fig_SIM .add_subplot(443)
        self.PlotPercentile(Backtest_SIM_X[:,:,2], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.r_longTerm)
        ax3.set_title('long term interest rate l(t)')
        
        ax4 = fig_SIM .add_subplot(444)
        self.PlotPercentile(Backtest_SIM_X[:,:,3], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.r_shortTerm)
        ax4.set_title('short term interest rate s(t)')
        
        ax5 = fig_SIM.add_subplot(445)
        self.PlotPercentile(Backtest_SIM_X[:,:,4], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.cash)
        ax5.set_title('cash c(t)')
               
        ax6 = fig_SIM.add_subplot(446)
        self.PlotPercentile(Backtest_SIM_X[:,:,5], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.DivYield)
        ax6.set_title('domestic dividends yield y(t)')

        
        ax7 = fig_SIM.add_subplot(447)
        self.PlotPercentile(Backtest_SIM_X[:,:,6], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.dt)
        ax7.set_title('domestic equityies dividends d(t)')
        
        ax8 = fig_SIM.add_subplot(448)
        self.PlotPercentile(Backtest_SIM_X[:,:,7], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.Dom_price)
        ax8.set_title('domestic equities price return p(t)')
        
        ax9 = fig_SIM.add_subplot(449)
        self.PlotPercentile(Backtest_SIM_X[:,:,8], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.Dom_total_return)
        ax9.set_title('domestic equities total return e(t)')
        
        ax10 = fig_SIM.add_subplot(4,4,10)
        self.PlotPercentile(Backtest_SIM_X[:,:,9], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.Int_total_return)
        ax10.set_title('international dividends total return n(t)')
        
        ax11 = fig_SIM.add_subplot(4,4,11)
        self.PlotPercentile(Backtest_SIM_X[:,:,10], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.Dom_bond)
        ax11.set_title('domestic bonds b(t)')
        
        ax12 = fig_SIM.add_subplot(4,4,12)
        self.PlotPercentile(Backtest_SIM_X[:,:,11], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.Int_bond[1:])
        ax12.set_title('international bonds o(t)')

        ax13 = fig_SIM.add_subplot(4,4,13)
        self.PlotPercentile(Backtest_SIM_X[:,:,12], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.House_rate)
        ax13.set_title('house h(t)')
        
        ax14 = fig_SIM.add_subplot(4,4,14)
        self.PlotPercentile(Backtest_SIM_X[:,:,13], M_backtest, T_history, freq_history )
        plt.plot(Calib_SUPA.Unemply)
        ax14.set_title('unemployment u(t)')

