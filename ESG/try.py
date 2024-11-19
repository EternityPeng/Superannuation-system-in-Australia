from flask import Flask, render_template, request
import numpy as np
import plotly.graph_objs as go
import plotly.io as pio
import sys
import pandas as pd




# Load historical data from CSV
historical_df = pd.read_csv('./data/supa/sim_hist9218.csv')

# Clean column names
historical_df.columns = historical_df.columns.str.strip()

# Print column names for debugging
print(historical_df.columns)
