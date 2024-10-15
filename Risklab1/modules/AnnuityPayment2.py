# -*- coding: utf-8 -*-
"""
Created on Wed Apr 17 17:05:28 2019

@author: che27g
"""



import numpy as np
import pandas as pd


#https://www.challenger.com.au/personal/products/payment-rates/lifetime-annuity-payment-rates
# Current Annual payment for every $100,000 
# - inhanced income (no liquidity, full amount of inflation protection) 
# for male and females at age: 65, 70, 75, 80

# Annual payments - Enhanced income (no liquidity)
# 04 Mar2019 to 10Mar 2019
# can be updated 
Annuity_Challenger = np.array([[5462,6379,7763,9879],[5159,5967,7156,8969]])

def annuity_payment(gender, age): #one annuity
    age_index = np.minimum(int(np.floor((age-65)/5)),3)
    if gender == 'M':
        gender_index = 0
    else:
        gender_index = 1
        
    ap = Annuity_Challenger[gender_index][age_index]
    return ap
#20years deferred LA for age：60,65,67,70
#Deferred_LA_20y = np.array([[1428,2126,2524.92,3691],[1273，1827,3049]])

# Male aged 67. Enhanced basis, Full CPI indexation of payments 
DLA_20=2524.92  # per $10,000
DLA_15=1502.16  # per $10,000

def deferredA_payment(age,deferredYear, gender=None):
    if age == 67:
        if deferredYear == 20:
            dap = DLA_20
        elif deferredYear == 15:
            dap = DLA_15
    return dap
            


#Mortality=pd.read_csv('Mortality2010.csv')
#LifeExp = pd.read_csv('LifeExpectancy2010.csv')
#Mortality is a dataframe with ‘Male' and 'Female'
# Mortality['Male'][64] is the mortality rate at age 65 for a male

# how much of asset count for Age Pension asset test per 100,000
def AnnuityAssetTest(gender, retirement_age, t):
    one_annuity = 100000.0
    Annuity_asset = one_annuity
    return Annuity_asset

def DLAnnuityAssetTest(gender, retirement_age, t):
    one_annuity = 10000.0
    Annuity_asset = one_annuity
    return Annuity_asset
    
def AnnuityIncomeTest(gender, retirement_age, t):
      
    AnnuityIncome = annuity_payment(gender, retirement_age)
    return AnnuityIncome
    