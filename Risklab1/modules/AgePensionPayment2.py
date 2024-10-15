# -*- coding: utf-8 -*-
"""
Created on Sat Mar  2 12:21:12 2019

@author: che27g
"""
# -*- coding: utf-8 -*-
"""
Created on Mon Feb 25 12:21:53 2019
Age Pension Payment
@author: che27g
"""

import numpy as np
import AnnuityPayment2
import CONST

WeekPerYear=CONST.WeekPerYear

def RatesAcc(Inflation, Wage, t):
    Inf_acc= np.transpose(np.exp(np.cumsum(Inflation,1)))
    Wage_acc = np.transpose(np.exp(np.cumsum(Wage,1)))
    return Inf_acc, Wage_acc

def DeemedIncome(relationship, fin_asset_t, Inf_acc_t):
    
    #http://guides.dss.gov.au/guide-social-security-law/4/4/1/10
    rate_deeming = np.array([CONST.DEEMING_RATE_LOW, CONST.DEEMING_RATE_HIGH])
    # threshold values financial asset for different deeming rate https://www.humanservices.gov.au/individuals/enablers/deeming
    fin_T_0 = np.array([CONST.DEEMING_LIMIT_LOW])
    # update financial asset values with inflation  
    fin_T = np.matmul(Inf_acc_t, fin_T_0)
    
    if (relationship == "single"):
        DeemedIncome = rate_deeming[0]* np.minimum(fin_T[:,0],fin_asset_t) + rate_deeming[1] * np.maximum(0, fin_asset_t-fin_T[:,0])
    else: #"couple"
        DeemedIncome = rate_deeming[0]* np.minimum(fin_T[:,1],fin_asset_t) + rate_deeming[1] * np.maximum(0, fin_asset_t-fin_T[:,1])
    #print(DeemedIncome)  
    return DeemedIncome #vector     

def FullPension(Inf_acc_t, Wage_acc_t):
    #  fortnightly full pension in 2018 for single and couple 
    #  https://www.superguide.com.au/accessing-superannuation/age-pension-rates
    #full_pension_wkly = np.array([CONST.MAX_PENSION])/2
    full_pension_fortnight = np.array([CONST.MAX_PENSION])
    # full pension simulation for single and couple indexed with both CPI and wage
    #Full_pension = np.matmul(0.5*(Inf_acc_t + Wage_acc_t), full_pension_fortnight)  
    Full_pension = np.matmul(Inf_acc_t, full_pension_fortnight) 
    #Full_pension = np.matmul(Wage_acc_t, full_pension_fortnight) 
    return Full_pension

def MinimumSuper(age, superb, extra_p):
    rate_min = np.array( [5,6,7,9,11,14] )/100
    age_index = np.minimum(int(np.floor((np.maximum(age,70)-70)/5)),5)
    superwithdrawal_min = superb * (rate_min[age_index]+extra_p)
    return superwithdrawal_min

# compute the pension payment after asset and income test with annuity
# 1 annuity_portion is 100,000 
def AgePension_payment( total_asset_t, super_balance_t, income_wkly_t, financial_asset_t, annuity_portion,\
                  gender, age, relationship, home, Inf_acc_t, Wage_acc_t, t):
    
    # 1 July 2018 https://www.humanservices.gov.au/individuals/enablers/assets/30621
    # history pension http://guides.dss.gov.au/guide-social-security-law/5/2/2/10
    asset_T0 = np.array(CONST.ASSET_TEST_LIMIT)
    a_taper_rate = CONST.TAPER_RATE_ASSET
    # income threshold per fortnight
    income_T0 = np.array(CONST.INCOME_TEST_LIMIT)    
    # reduce by 50 cent per dollar income
    i_taper_rate = CONST.TAPER_RATE_INCOME
    
    # fortnight full pension at time t
    Full_pension_t = FullPension(Inf_acc_t, Wage_acc_t)
    # pick thresholds for asset and income test
    if relationship == "single": #fp is full pension
        fp = Full_pension_t[:,0]
        i_T0 = income_T0[0]
        if home == "yes":
            a_T0 = asset_T0[0] #a_T: asset test threshold value  
        else: 
            a_T0 = asset_T0[1]
    else:
        fp = Full_pension_t[:,1]
        i_T0 = income_T0[1]
        if home=="yes":
            a_T0 = asset_T0[2]
        else:
            a_T0 = asset_T0[3] 
            
    #i_T = i_T0.flatten() * (Inf_acc_t+Wage_acc_t).flatten()/2
    
    i_T = i_T0.flatten() * Inf_acc_t.flatten()
    a_T = a_T0.flatten() * Inf_acc_t.flatten()       

    Annuity_asset_t = AnnuityPayment2.AnnuityAssetTest(gender, age, t)*annuity_portion*Inf_acc_t.flatten()
    Annuity_income_t = AnnuityPayment2.AnnuityIncomeTest(gender, age, t)*annuity_portion*Inf_acc_t.flatten()
    #implement the new rules for annuity after 1 July 2019
    if age+t < 84:
        r_annuity_asset = CONST.ANNUITY_HIGH #0.6
    else:
        r_annuity_asset = CONST.ANNUITY_LOW  #0.3
            
    
    # fortnight pension after asset test when total_asset is below the threshold a_T and get at most fp
    p_at =  np.maximum(fp - np.maximum(total_asset_t + r_annuity_asset*Annuity_asset_t + super_balance_t + financial_asset_t- a_T,0) * a_taper_rate, 0)
#    print(total_asset_t + r_annuity_asset*Annuity_asset_t + super_balance_t +financial_asset_t- a_T)
#    print("time: ",t)
#    print("total_asset_t: ",total_asset_t)
#    print("super_balance_t: ",super_balance_t)
#    print("financial_asset_t: ",financial_asset_t)
#    print("a_taper_rate: ",a_taper_rate)
#    print("fp",fp)
#    print("pension_at:",fp - np.maximum(total_asset_t + r_annuity_asset*Annuity_asset_t + super_balance_t +financial_asset_t- a_T,0) * a_taper_rate)
    #super_min = MinimumSuper(age+t, super_balance_t, 0)
    # deemed income from financial asset
    deemed_income = DeemedIncome(relationship, financial_asset_t +super_balance_t, Inf_acc_t) 
    deemed_income_fortnight = deemed_income/CONST.FortnightPerYear
    
    # total weekly income: real income + deemed income from fin_asset + annuity weekly income
    #total_income_wkly = income_wkly_t + deemed_income_wkly +  Annuity_income_t*CONST.ANNUITY_INCOME/CONST.WeekPerYear
    total_income_fortnight = income_wkly_t*2 + deemed_income_fortnight +  Annuity_income_t*CONST.ANNUITY_INCOME/CONST.FortnightPerYear

    # entitlement after income test
    p_it = np.maximum(fp - np.maximum( total_income_fortnight - i_T, 0 ) * i_taper_rate ,0)  
    # annual age pension entitlement is the min of p_at and p_it 
    pension = np.minimum(p_at, p_it) * CONST.FortnightPerYear
#    print(t)
#    print(p_at)
    # to show whether asset test or income test play the role in means test.
    pension_id = np.argmin([p_at, p_it], axis=0)
    #print('pension_id', pension_id)#, 'pension', pension)
    #print(pension)
    # return both the pension entitlement and the indicator
    return pension, pension_id
    


