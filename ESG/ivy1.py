from flask import Flask, render_template, request
import numpy as np
import plotly.graph_objs as go
import plotly.io as pio
import sys
import pandas as pd

# Import custom simulation module
sys.path.append("modules")
import modules.SimulationExtendedSUPA as SIM

app = Flask(__name__)

def getSimulateData(m_sim, t_max):
    """
    Perform SUPA model simulation to generate future t_max years of data.
    """
    model_ExtSUPA = SIM.ExtendedSUPA('./data/supa/calib9218.csv')
    params = model_ExtSUPA.Dictionary_Param
    numVar = model_ExtSUPA.Dictionary_Param['NumVar']

    freq = 1         # Frequency of rebalancing (once per year)
    back_test = 0    # Forward simulation

    model_ExtSUPA.ForwardSimulation(m_sim, t_max, freq, back_test)
    supa_X = model_ExtSUPA.SIM_X

    dt = 1.0 / freq
    t = np.linspace(0, dt * t_max, t_max + 1)

    qt = supa_X[:, :, 0]  # Inflation rate
    wt = supa_X[:, :, 1]  # Wage growth rate
    lt = supa_X[:, :, 2]  # Long-term interest rate
    st = supa_X[:, :, 3]  # Short-term interest rate
    et = supa_X[:, :, 8]  # Domestic equity total return
    nt = supa_X[:, :, 9]  # International equity total return
    bt = supa_X[:, :, 10] # Domestic bond return
    ot = supa_X[:, :, 11] # International bond return
    ht = supa_X[:, :, 12] # House price growth rate
    return (t, qt, wt, lt, st, et, nt, bt, ot, ht)

@app.route('/simulate', methods=['POST'])
def simulate():
    """
    Simulate future economic data and combine with historical data.
    Display both time series and distribution plots.
    """
    # User inputs
    t_max = int(request.json.get('t_max', 20))  # Simulated years
    m_sim = int(request.json.get('m_sim', 10))  # Simulation paths
    indicator = request.json.get('indicator', 'qt')  # Default to inflation rate

    # Generate simulated data
    t_sim, qt, wt, lt, st, et, nt, bt, ot, ht = getSimulateData(m_sim, t_max)

    # Construct simulated_data dictionary
    simulated_data = {
        "qt": qt,  # Inflation rate
        "wt": wt,  # Wage index
        "lt": lt,  # Long-term interest rate
        "st": st,  # Short-term interest rate
        "et": et,  # Domestic asset return index
        "nt": nt,  # International asset return index
        "bt": bt,  # Domestic bond index
        "ot": ot,  # International bond index
        "ht": ht   # House price index
    }

    # Load historical data from CSV
    historical_df = pd.read_csv('./data/supa/sim_hist9218.csv')
    historical_df.columns = historical_df.columns.str.strip()

    # Prepare historical data dictionary
    historical_data = {
        "time": historical_df['tt'].values,  # Extract actual time values
        "qt": historical_df['qt'].values,  # Inflation rate
        "wt": historical_df['wt'].values,  # Wage index
        "lt": historical_df['lt'].values,  # Long-term interest rate
        "st": historical_df['st'].values,  # Short-term interest rate
        "et": historical_df['et'].values,  # Domestic asset return index
        "nt": historical_df['nt'].values,  # International asset return index
        "bt": historical_df['bt'].values,  # Domestic bond index
        "ot": historical_df['ot'].values,  # International bond index
        "ht": historical_df['ht'].values   # House price index
    }

    # Get selected indicator data
    hist_time = historical_data.get("time")  # Historical time values
    hist_data = historical_data.get(indicator)  # Historical data
    sim_data = simulated_data.get(indicator)   # Simulated data

    if hist_time is None or hist_data is None or sim_data is None:
        return f"Invalid indicator: {indicator}", 400

    # Create time series plot
    fig1 = go.Figure()

    # Add historical data trace
    fig1.add_trace(go.Scatter(
        x=hist_time,  # Use historical time as x-axis
        y=hist_data,
        mode='lines',
        name='Historical Data',
        line=dict(color='white', width=2)  # Set historical line color to white
    ))

    # Add simulation paths trace
    t_sim = np.linspace(hist_time[-1] + 1, hist_time[-1] + t_max, t_max + 1)  # Extend time for simulation
    for i in range(sim_data.shape[0]):
        combined_time = np.concatenate([hist_time, t_sim])  # Combine historical and simulated time
        combined_y = np.concatenate([hist_data, sim_data[i]])  # Combine historical and simulated data
        fig1.add_trace(go.Scatter(
            x=combined_time,
            y=combined_y,
            mode='lines',
            name=f'Simulation Path {i + 1}',
            line=dict(width=1)  # Default line color for simulation
        ))

    # Update layout
    fig1.update_layout(
        title=f"Historical and Simulated Data for {indicator}",
        xaxis=dict(title="Time"),  # Reflect actual time values
        yaxis=dict(title="Value"),
        template="plotly_dark"
    )

    # Return single plot as HTML (no distribution plot in this case)
    return pio.to_html(fig1, full_html=False)

@app.route('/')
def index():
    """
    Home page with input form for simulation parameters.
    """
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug=True)
