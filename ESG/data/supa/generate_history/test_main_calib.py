# -*- coding: utf-8 -*-
"""
Created on Wed Aug 22 13:12:19 2018

the main function which calibrates SUPA model from historical data

@author: che27g
"""

# run this function to calibrate SUPA paramters and save in csv files
import csv
import CalibrationExtendedSUPA2 as CLB

#  create or overwrite calib.csv

HistoricalData = 'History9218.csv'
CalibrationFile = 'calib9218.csv'

with open(CalibrationFile, 'wb') as csvfile_calib:
    filewriter = csv.writer(csvfile_calib, delimiter=',',
                            quotechar='|', quoting=csv.QUOTE_MINIMAL)

# test main function for calibraionExtendedSUPA
Calib_ExtSUPA = CLB.SUPA(HistoricalData, CalibrationFile)



# convert index to rates
Calib_ExtSUPA.DataProcess()

# Calibration
Calib_ExtSUPA.Calib_Param()
Calib_ExtSUPA.Parameter
Calib_ExtSUPA.WriteCSV() # write the parameters to csv file


