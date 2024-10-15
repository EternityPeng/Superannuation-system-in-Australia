# -*- coding: utf-8 -*-
"""
Created on Sat Mar 30 08:53:27 2019
CONSTANT
@author: che27g
"""
import pandas as pd
import numpy as np
SURVIVAL = pd.read_csv("./data/survival.csv")
#SURVIVAL = pd.read_csv(r"C:/Users/che27g/Desktop/Superannuation - Copy/trunk/MortalityData/survival.csv")

SURVIVAL_MALE = SURVIVAL.iloc[:,1]
SURVIVAL_FEMALE = SURVIVAL.iloc[:,2]

MAX_PENSION_F =  [834.4, 1258.0]

#Q20 = pd.read_csv(r"C:/Users/che27g/Desktop/Superannuation - Copy/trunk/MortalityData/Quantisation20.csv",header=None)
#Q10 = pd.read_csv(r"C:/Users/che27g/Desktop/Superannuation - Copy/trunk/MortalityData/Quantisation10.csv",header=None)
WeekPerYear=365/7
FortnightPerYear = WeekPerYear/2

## CONSTANTS adjust quarterly ###
# fortnight persion per person for single and double Mar 2019
PENSION= np.array([843.6, 635.9])
PENSION_SUPP = np.array([68.5, 51.6])
ENERGY_SUPP = np.array([14.1,10.6])
MAX_PENSION = PENSION + PENSION_SUPP +ENERGY_SUPP 
MAX_PENSION_ANNUAL = MAX_PENSION * FortnightPerYear

MAX_PENSION_2017 = np.array([888.3,669.6])
MAX_PENSION_2018Jun = np.array([826.2+81.4,622.8+61.3])
MAX_PENSION_2019Sep = [933.4,703.5] #Sep 2019 to Mar 2020

#MAX_PENSION= MAX_PENSION_2017 # will comment out this line #only for paper 1 test from 2017

ASSET_TEST_LIMIT = [258500, 465500, 387500, 594500] #July 2018
INCOME_TEST_LIMIT = [172,304] #per fortnight
DEEMING_LIMIT_LOW = [51200, 85000]

#https://www.humanservices.gov.au/individuals/services/centrelink/age-pension/how-much-you-can-get/assets-test/assets
ASSET_TEST_LIMIT_2019 = [263250.0, 473750.0, 394500.0, 605000.0] #July 2018
#https://www.humanservices.gov.au/individuals/topics/income-test-pensions/30406
INCOME_TEST_LIMIT_2019 = [174,308] #per fortnight
#https://www.humanservices.gov.au/individuals/topics/deeming/29656
DEEMING_LIMIT_LOW_2019 = [51800.0, 86200.0]
DEEMING_RATE_LOW_2019 = 1.75/100 # new deeming rate
DEEMING_RATE_HIGH_2019  = 3.25/100

## CONSTATNT update when policy changes ##
TAPER_RATE_ASSET = 0.3/100
DEEMING_INCOME_LIMIT = 51200
DEEMING_RATE_LOW = 1.75/100
DEEMING_RATE_HIGH  = 3.25/100
TAPER_RATE_INCOME = 0.5

ANNUITY_HIGH = 0.6
ANNUITY_LOW = 0.3
ANNUITY_INCOME = 0.6


