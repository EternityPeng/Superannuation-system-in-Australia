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
    #ct = supa_X[:, :, 4]  # Cash return rate
    #yt = supa_X[:, :, 5]  # Domestic dividend yield
    #dt = supa_X[:, :, 6]  # Domestic dividend growth rate
    #pt = supa_X[:, :, 7]  # Domestic price return
    et = supa_X[:, :, 8]  # Domestic equity total return
    nt = supa_X[:, :, 9]  # International equity total return
    bt = supa_X[:, :, 10] # Domestic bond return
    ot = supa_X[:, :, 11] # International bond return
    ht = supa_X[:, :, 12] # House price growth rate
    #ut = supa_X[:, :, 13] # Unemployment rate
    return (t, qt, wt, lt, st, et, nt, bt, ot, ht)
    #return (t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut)

@app.route('/simulate', methods=['POST'])
def simulate():
    """
    Simulate future economic data and combine with historical data.
    """
    # User inputs
    t_max = int(request.json.get('t_max', 20))  # Simulated years
    m_sim = int(request.json.get('m_sim', 10))  # Simulation paths
    indicator = request.json.get('indicator', 'qt')  # Default to inflation rate

    # Generate simulated data
    t_sim, qt, wt, lt, st, et, nt, bt, ot, ht = getSimulateData(m_sim, t_max)

    # Load historical data from CSV
    historical_df = pd.read_csv('./data/supa/sim_hist9218.csv')

    # Clean column names
    historical_df.columns = historical_df.columns.str.strip()

    # Prepare historical timeline (negative time for historical data)
    t_hist = np.linspace(-len(historical_df) + 1, 0, len(historical_df))

    # Prepare historical data dictionary
    historical_data = {
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

    # Indicator mapping for simulated data
    simulated_data = {
        "qt": qt,
        "wt": wt,
        "lt": lt,
        "st": st,
        "et": et,
        "nt": nt,
        "bt": bt,
        "ot": ot,
        "ht": ht
    }

    # Get selected indicator data
    hist_data = historical_data.get(indicator)  # Historical data
    sim_data = simulated_data.get(indicator)   # Simulated data

    if hist_data is None or sim_data is None:
        return f"Invalid indicator: {indicator}", 400

    # Create combined timeline
    t_sim = np.linspace(0, t_max, t_max + 1)  # Simulation timeline starts from 0
    combined_timeline = np.concatenate([t_hist, t_sim])

    # Create plot
    fig = go.Figure()

    # Add historical data trace
    fig.add_trace(go.Scatter(
        x=t_hist,
        y=hist_data,
        mode='lines',
        name='Historical Data',
        line=dict(color='white', width=2)  # Set historical line color to white
    ))

    # Add simulation paths trace
    for i in range(sim_data.shape[0] - 1):
        combined_y = np.concatenate([hist_data, sim_data[i]])
        fig.add_trace(go.Scatter(
            x=combined_timeline,
            y=combined_y,
            mode='lines',
            name=f'Simulation Path {i + 1}',
            line=dict(width=1)  # Default line color for simulation
        ))

    # Update layout
    fig.update_layout(
        title=f"Historical and Simulated Data for {indicator}",
        xaxis=dict(title="Time"),
        yaxis=dict(title="Value"),
        template="plotly_dark"
    )

    # Return plot as HTML
    plot_html = pio.to_html(fig, full_html=False)
    return plot_html




@app.route('/')
def index():
    """
    Home page with input form for simulation parameters.
    """
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug=True)
