from flask import Flask, jsonify, render_template, request
import numpy as np
import pandas as pd
import plotly.graph_objs as go
import plotly.io as pio
import json
import sys

# 导入自定义模块
sys.path.append("modules")
import modules.SimulationExtendedSUPA as SIM

app = Flask(__name__)

def getSimulateData(m_sim, t_max):
    """
    进行 SUPA 模型数据模拟，生成未来 t_max 年的模拟数据。
    """
    model_ExtSUPA = SIM.ExtendedSUPA('./data/supa/calib9218.csv')
    params = model_ExtSUPA.Dictionary_Param
    numVar = model_ExtSUPA.Dictionary_Param['NumVar']

    freq = 1         # 每年重新平衡频率
    back_test = 0    # 前向模拟

    model_ExtSUPA.ForwardSimulation(m_sim, t_max, freq, back_test)
    supa_X = model_ExtSUPA.SIM_X

    dt = 1.0 / freq
    t = np.linspace(0, dt * t_max, t_max + 1)

    qt = supa_X[:, :, 0]  # 通货膨胀率
    wt = supa_X[:, :, 1]  # 工资增长率
    lt = supa_X[:, :, 2]  # 长期利率
    st = supa_X[:, :, 3]  # 短期利率
    ct = supa_X[:, :, 4]  # 现金回报率
    yt = supa_X[:, :, 5]  # 国内股息率
    dt = supa_X[:, :, 6]  # 国内股息增长率
    pt = supa_X[:, :, 7]  # 国内股价收益率
    et = supa_X[:, :, 8]  # 国内股票总回报率
    nt = supa_X[:, :, 9]  # 国际股票总回报率
    bt = supa_X[:, :, 10] # 国内债券回报率
    ot = supa_X[:, :, 11] # 国际债券回报率
    ht = supa_X[:, :, 12] # 房价增长率
    ut = supa_X[:, :, 13] # 失业率

    return (t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut)

def plot_simulation_results(t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut):
    """
    使用 Plotly 生成未来经济走势的模拟数据图像。
    """
    indicators = {
        "Inflation (q)": qt,
        "Wage Growth (w)": wt,
        "Long-term Rate (l)": lt,
        "Short-term Rate (s)": st,
        "Cash Return (c)": ct,
        "Dividend Yield (y)": yt,
        "Dividend Growth (d)": dt,
        "Stock Price Return (p)": pt,
        "Stock Total Return (e)": et,
        "International Stock Total Return (n)": nt,
        "Bond Return (b)": bt,
        "International Bond Return (o)": ot,
        "House Price Growth (h)": ht,
        "Unemployment Rate (u)": ut
    }

    fig = go.Figure()

    # 添加各经济指标的折线图
    for name, data in indicators.items():
        # 计算平均值路径
        avg_data = np.mean(data, axis=0)  # 在模拟路径上取平均
        fig.add_trace(go.Scatter(x=t, y=avg_data, mode='lines', name=name))

    # 设置图像布局
    fig.update_layout(
        title="Future Economic Simulation - SUPA Model",
        xaxis=dict(title="Time (years)"),
        yaxis=dict(title="Indicator Values"),
        template="plotly_dark",
        hovermode="x unified"
    )

    # 返回图像的HTML
    return pio.to_html(fig, full_html=False)

@app.route('/simulate', methods=['GET'])
def simulate():
    """
    模拟未来经济数据并返回图像
    """
    # 默认的模拟年数和路径数
    t_max = 20
    m_sim = 10

    # 生成模拟数据
    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(m_sim, t_max)

    # 生成图像
    plot_html = plot_simulation_results(t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut)

    return plot_html

@app.route('/')
def home():
    return "Flask is running!"


@app.route('/about')
def about():
    return 'This is the About Page. Flask is running!'

if __name__ == "__main__":
    app.run(debug=True)
