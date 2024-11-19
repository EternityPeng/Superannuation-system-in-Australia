from flask import Flask, render_template, request
import numpy as np
import plotly.graph_objs as go
import plotly.io as pio
import sys

# 导入自定义模块
sys.path.append("modules")
import modules.SimulationExtendedSUPA as SIM

app = Flask(__name__)

def getSimulateDataWithHistory(m_sim, t_max):
    """
    获取历史数据并模拟未来数据。
    """
    model_ExtSUPA = SIM.ExtendedSUPA('./data/supa/calib9218.csv')
    params = model_ExtSUPA.Dictionary_Param

    freq = 1         # 每年重新平衡频率
    back_test = 0    # 前向模拟

    # 从模型中提取历史数据
    historical_data = {
        "qt": [model_ExtSUPA.Parameter['pre_inflation']],
        "lt": [model_ExtSUPA.Parameter['pre_longTerm']],
        "st": [model_ExtSUPA.Parameter['pre_cash']],
        "yt": [model_ExtSUPA.Parameter['pre_domDivYield']],
        "ht": [model_ExtSUPA.Parameter['pre_Hgr']],
        "ut": [model_ExtSUPA.Parameter['pre_unemply']]
    }

    # 假设历史数据跨度为10年（可以扩展为更长时间）
    t_hist = np.linspace(0, 10, len(historical_data["qt"]))

    # 运行未来模拟
    model_ExtSUPA.ForwardSimulation(m_sim, t_max, freq, back_test)
    supa_X = model_ExtSUPA.SIM_X

    dt = 1.0 / freq
    t_sim = np.linspace(0, dt * t_max, t_max + 1)

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

    return t_hist, historical_data, t_sim, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut

def plot_simulation_results_with_history(t_hist, hist_data, t_sim, sim_data, indicator):
    """
    绘制历史数据与模拟数据，确保正确显示历史曲线和未来路径。
    """
    # 拼接时间轴
    t_combined_sim = t_sim + t_hist[-1]  # 模拟时间从历史的最后一个时间点开始

    # 创建图表
    fig = go.Figure()

    # 添加历史数据曲线
    fig.add_trace(go.Scatter(
        x=t_hist,
        y=hist_data,
        mode='lines',
        name='历史数据',
        line=dict(color='black', width=3)  # 黑色粗线表示历史数据
    ))

    # 添加模拟路径曲线
    for i in range(sim_data.shape[0]):
        fig.add_trace(go.Scatter(
            x=t_combined_sim,
            y=sim_data[i],
            mode='lines',
            name=f'模拟路径 {i+1}',
            line=dict(width=1)  # 模拟路径为细线
        ))

    # 更新图表布局
    fig.update_layout(
        title=f"历史与模拟数据 - {indicator}",
        xaxis=dict(title="时间（年）"),
        yaxis=dict(title="指标值"),
        template="plotly_white",  # 使用白色主题以更清晰区分曲线
        legend=dict(title="图例", font=dict(size=10))
    )

    # 返回图表 HTML
    return pio.to_html(fig, full_html=False)

@app.route('/simulate', methods=['POST'])
def simulate():
    """
    根据用户输入的 t_max 和 m_sim 获取历史和模拟数据，并返回图表。
    """
    # 获取用户输入
    t_max = int(request.form.get('t_max', 20))
    m_sim = int(request.form.get('m_sim', 10))
    indicator = request.form.get('indicator', 'qt')  # 默认显示通货膨胀率

    # 获取历史数据和模拟数据
    t_hist, historical_data, t_sim, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateDataWithHistory(m_sim, t_max)

    # 指标映射
    indicators = {
        "qt": (historical_data["qt"], qt),
        "lt": (historical_data["lt"], lt),
        "st": (historical_data["st"], st),
        "yt": (historical_data["yt"], yt),
        "ht": (historical_data["ht"], ht),
        "ut": (historical_data["ut"], ut)
    }

    # 获取用户选择的指标数据
    hist_data, sim_data = indicators.get(indicator)

    # 调用绘图函数
    plot_html = plot_simulation_results_with_history(t_hist, hist_data, t_sim, sim_data, indicator)

    return plot_html

@app.route('/')
def index():
    """
    渲染主页，提供表单输入以设置 t_max 和 m_sim。
    """
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug=True)
