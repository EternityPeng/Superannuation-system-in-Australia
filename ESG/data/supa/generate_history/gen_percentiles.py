# calculate various required percentiles of the 14 variables 
# (using 100,000 paths of simulation and 40 years ahead)

import numpy as np
import pandas as pd

import SimulationExtendedSUPA as SIM


Model_ExtSUPA = SIM.ExtendedSUPA('./../calib9218.csv')
percentile_file = './../percentile1959.csv'


np.random.seed(1000)

T_max = 40          # number of years after retirement

M_sim  = 100000     # number of simulated paths

freq = 1        # rebalancing frequency (rebalances per year)
back_test = 0   # it is forward simulation

# forward simulation for the next T_max years since 2018
Model_ExtSUPA.ForwardSimulation(M_sim, T_max, freq, back_test) 

sim_x = Model_ExtSUPA.SIM_X

p = np.array([5, 25, 50, 75, 95])


def getYears(T_max, freq):
    dt = 1.0 / freq
    tt = np.linspace(0, dt*T_max, T_max+1)
    tt += 2019
    df = pd.DataFrame(data=tt, index=None, columns=['tt'])
    return df


def getPercentiles(df, sim_x, name, index, percents):
    data = np.transpose(sim_x[:,:,index])
    for i in range(len(percents)):
        df1 = pd.DataFrame(data=np.percentile(data, percents[i], axis=1), 
                           index=None, 
                           columns=[name + str(percents[i])])
        df = pd.concat([df, df1], axis=1)
    return df


df = getYears(T_max, freq)

df = getPercentiles(df, sim_x, "qt", 0, p)
df = getPercentiles(df, sim_x, "wt", 1, p)
df = getPercentiles(df, sim_x, "lt", 2, p)
df = getPercentiles(df, sim_x, "st", 3, p)
df = getPercentiles(df, sim_x, "ct", 4, p)
df = getPercentiles(df, sim_x, "yt", 5, p)
df = getPercentiles(df, sim_x, "dt", 6, p)
df = getPercentiles(df, sim_x, "pt", 7, p)
df = getPercentiles(df, sim_x, "et", 8, p)
df = getPercentiles(df, sim_x, "nt", 9, p)
df = getPercentiles(df, sim_x, "bt", 10, p)
df = getPercentiles(df, sim_x, "ot", 11, p)
df = getPercentiles(df, sim_x, "ht", 12, p)
df = getPercentiles(df, sim_x, "ut", 13, p)

df.to_csv(percentile_file, index=False)

df2 = pd.read_csv(percentile_file)

