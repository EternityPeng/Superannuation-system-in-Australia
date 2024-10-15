# calculate and save historical data of parameters for plotting in JavaScript

import csv
import numpy as np
import pandas as pd
import CalibrationExtendedSUPA2 as CLB


HistoricalData = 'History9218.csv'
sim_hist_file = '.\\..\\sim_hist9218.csv'


sim_hist = CLB.SUPA(HistoricalData, sim_hist_file)

sim_hist.DataProcess()

# for reference:
cpi = sim_hist.HistoricalData['CPI'];
wi = sim_hist.HistoricalData['Wage_index'];

st0 = sim_hist.HistoricalData['r_shortTerm'];
lt0 = sim_hist.HistoricalData['r_longTerm'];
Et = sim_hist.HistoricalData['Dom_asset_total_return_index'];
Bt = sim_hist.HistoricalData['Dom_bond_index'];
Nt = sim_hist.HistoricalData['Int_asset_total_return_index'];
Ot = sim_hist.HistoricalData['Int_bond_index'];
Ht = sim_hist.HistoricalData['HPI'];

Pt = sim_hist.HistoricalData['Dom_asset_price_index'][1:];
Dt = sim_hist.DivEstimate;

# data to be saved:
tt = np.arange(1993, 2019);
tt = np.expand_dims(tt, axis=1);

qt = sim_hist.inflation;       # from year 1993 to 2018
wt = sim_hist.wage;
st = sim_hist.r_shortTerm[1:];
lt = sim_hist.r_longTerm[1:];
ct = sim_hist.cash;
pt = sim_hist.Dom_price;
et = sim_hist.Dom_total_return;
yt = sim_hist.DivYield;
bt = sim_hist.Dom_bond;
nt = sim_hist.Int_total_return;
ot = sim_hist.Int_bond;
ht = sim_hist.House_rate;
ut = sim_hist.Unemply[1:];

dt = sim_hist.dt;                # from year 1994 to 2018

# data frames:
df = pd.DataFrame({'tt': tt[1:,0:].squeeze(),
                   
                   'qt': qt[1:,0:].squeeze(),
                   'wt': wt[1:,0:].squeeze(),
                   
                   'lt': lt[1:,0:].squeeze(),
                   'st': st[1:,0:].squeeze(),
                   
                   'ct': ct[1:,0:].squeeze(),
                   'yt': yt[1:,0:].squeeze(),

                   'dt': dt[0:,0:].squeeze(),
                   'pt': pt[1:,0:].squeeze(),
                   
                   'et': et[1:,0:].squeeze(),
                   'nt': nt[1:,0:].squeeze(),
                   
                   'bt': bt[1:,0:].squeeze(),
                   'ot': ot[1:,0:].squeeze(),
                   
                   'ht': ht[1:,0:].squeeze(),
                   'ut': ut[1:,0:].squeeze()
                  })

df.to_csv(sim_hist_file, index=False)

df2 = pd.read_csv(sim_hist_file)

