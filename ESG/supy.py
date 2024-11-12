import numpy as np
import pandas as pd
import plotly.graph_objs as go
import plotly.io as pio
import sys
import json
# 添加模块路径，确保可以导入 SIM 模块
sys.path.append("modules")

# 导入 ExtendedSUPA 模块
import modules.SimulationExtendedSUPA as SIM  # 确保路径和模块名正确


def getSimulateData(m_sim, t_max):
    """
    进行 SUPA 模型数据模拟，生成未来 t_max 年的模拟数据。

    参数：
        m_sim (int): 模拟路径数量
        t_max (int): 模拟年数

    返回：
        tuple: 包括模拟参数、变量数量、模拟时间序列及各经济指标数据
    """
    # 从 CSV 文件读取参数数据并初始化模型对象
    model_ExtSUPA = SIM.ExtendedSUPA('./data/supa/calib9218.csv')
    params = model_ExtSUPA.Dictionary_Param  # 获取模型参数字典
    numVar = model_ExtSUPA.Dictionary_Param['NumVar']  # 获取变量数量

    # 设置模拟的频率和回测参数
    freq = 1  # 每年重新平衡频率 (每年1次)
    back_test = 0  # 前向模拟（0表示不进行回测）

    # 运行前向模拟，生成未来 t_max 年的数据
    model_ExtSUPA.ForwardSimulation(m_sim, t_max, freq, back_test)

    # 获取模拟输出数据，包含所有经济指标的模拟结果
    supa_X = model_ExtSUPA.SIM_X

    # 生成模拟时间序列
    dt = 1.0 / freq
    t = np.linspace(0, dt * t_max, t_max + 1)

    # 提取各经济指标数据
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
    bt = supa_X[:, :, 10]  # 国内债券回报率
    ot = supa_X[:, :, 11]  # 国际债券回报率
    ht = supa_X[:, :, 12]  # 房价增长率
    ut = supa_X[:, :, 13]  # 失业率

    # 返回各参数和模拟数据
    return (params, numVar, t_max, m_sim, t, qt, wt, lt, st, ct, yt, dt, pt,
            et, nt, bt, ot, ht, ut)


def plot_simulation_results(t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut):
    """
    使用 Plotly 绘制未来经济走势的模拟数据图像。

    参数：
        各经济指标数据：时间序列t及各指标（qt, wt, lt, 等）
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

    # 显示图像
    pio.show(fig)


# 主运行部分用于测试
if __name__ == "__main__":
    # 设置随机种子，确保结果可复现
    np.random.seed(1000)

    # 定义模拟年数和路径数
    t_max = 20  # 模拟年数
    m_sim = 10  # 模拟路径数量

    # 运行模拟并获取数据
    (params, numVar, t_max, m_sim, t, qt, wt, lt, st, ct, yt, dt, pt,
     et, nt, bt, ot, ht, ut) = getSimulateData(m_sim, t_max)

    # 打印返回数据以验证模拟结果
    print("模型参数:", json.dumps(params, indent=2))  # 打印参数字典
    print("变量数量:", numVar)  # 打印变量数量
    print("模拟时间序列:", t)  # 打印时间序列
    print("模拟数据 (通货膨胀率 qt):", qt)  # 打印模拟通货膨胀率数据
    print("模拟数据 (工资增长率 wt):", wt)  # 打印工资增长率数据
    # 可添加更多 print 语句以查看其他经济指标数据

    # 其他模拟数据可根据需要打印和分析
    
    # 绘制模拟结果
    plot_simulation_results(t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut)