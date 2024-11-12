# from flask import Flask
# from flask import request
# from flask import render_template
#
# app = Flask(__name__)
#
# # @app.route('/')
# # def hello_world():
# #     return 'Hello, World!'
# #
# # @app.route('/about')
# # def about():
# #     return 'This is the About Page.'
#
# # 视图函数是处理请求并返回响应的 Python 函数。它们通常接收请求对象作为参数，并返回响应对象，或者直接返回字符串、HTML 等内容。
# # greet 函数接收 URL 中的 name 参数，并返回一个字符串响应。
# @app.route('/greet/<name>')
# def greet(name):
#     return f'Hello, {name}!'
#
# @app.route('/submit', methods=['POST'])
# def submit():
#     username = request.form.get('username')
#     return f'Hello, {username}!'
#
#
# @app.route('/hello/<name>')
# def hello(name):
#     return render_template('index.html', name=name)
#
# if __name__ == '__main__':
#     app.run(debug=True)
#
#
# # from flask import Flask： 这行代码从 flask 模块中导入了 Flask 类。Flask 类是 Flask 框架的核心，用于创建 Flask 应用程序实例。
# #
# # app = Flask(__name__)： 这行代码创建了一个 Flask 应用实例。__name__ 是一个特殊的 Python 变量，它在模块被直接运行时是 '__main__'，
# # 在被其他模块导入时是模块的名字。传递 __name__ 给 Flask 构造函数允许 Flask 应用找到和加载配置文件。
# #
# # @app.route('/')： 这是一个装饰器，用于告诉 Flask 哪个 URL 应该触发下面的函数。在这个例子中，它指定了根 URL（即网站的主页）。
# #
# # def hello_world():： 这是定义了一个名为 hello_world 的函数，它将被调用当用户访问根URL时。
# #
# # return 'Hello, World!'： 这行代码是 hello_world 函数的返回值。当用户访问根 URL 时，这个字符串将被发送回用户的浏览器。
# #
# # if __name__ == '__main__':：这行代码是一个条件判断，用于检查这个模块是否被直接运行，而不是被其他模块导入。如果是直接运行，下面的代码块将被执行。
# #
# # app.run(debug=True)：这行代码调用 Flask 应用实例的 run 方法，启动 Flask 内置的开发服务器。debug=True 参数会启动调试模式，这意味着应用会在代码改变时自动重新加载，并且在发生错误时提供一个调试器。

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

# @app.route('/simulate', methods=['GET'])
# def simulate():
#     """
#     模拟未来经济数据并返回图像
#     """
#     # 默认的模拟年数和路径数
#     t_max = 20
#     m_sim = 10
#
#     # 生成模拟数据
#     t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(m_sim, t_max)
#
#     # 生成图像
#     plot_html = plot_simulation_results(t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut)
#
#     return plot_html

@app.route('/simulate', methods=['POST'])
def simulate():
    """
    根据用户输入的 t_max 和 m_sim 模拟未来经济数据并返回图像
    """
    # 获取用户输入的模拟年数和路径数
    t_max = int(request.form.get('t_max', 20))
    m_sim = int(request.form.get('m_sim', 10))

    # 生成模拟数据
    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(m_sim, t_max)

    # 生成图像
    plot_html = plot_simulation_results(t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut)

    return plot_html

@app.route('/')
def index():
    """
    主页，包含表单输入用于设置 t_max 和 m_sim
    """
    return render_template('index.html')


@app.route('/about')
def about():
    return 'This is the About Page. Flask is running!'

if __name__ == "__main__":
    app.run(debug=True)
