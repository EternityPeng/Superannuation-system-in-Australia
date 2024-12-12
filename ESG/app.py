from flask import Flask, jsonify, render_template, request
from flask import session
import sys
from plot_functions import * # 导入整个 plot_functions 文件
import pandas as pd
import json
import webbrowser

# 导入自定义模块
sys.path.append("modules")
import modules.SimulationExtendedSUPA as SIM

# 创建 Flask 应用实例
app = Flask(__name__)

# 创建 Dash 应用实例
dash_app = dash.Dash(__name__, server=app, url_base_pathname='/dash/')
# 初始化占位布局
dash_app.layout = html.Div("Loading...")

# 设置 secret_key
"""
会话加密：secret_key 用于对会话数据进行签名和加密，防止数据被篡改。
安全性：secret_key 应该是唯一的且随机生成，不能硬编码简单的字符串（如 "12345"）。
全局配置：必须在 Flask 应用实例中设置，否则会导致 session 功能不可用。
"""
import secrets

app.secret_key = secrets.token_hex(16)  # 安全地生成一个密钥

'''
下面可以用作存储的优化选项，Redis或者本地server存储
'''
from flask_session import Session
import redis

# # 配置 Flask-Session 使用 Redis
# app.config['SESSION_TYPE'] = 'redis'
# app.config['SESSION_PERMANENT'] = False  # 会话数据不持久化
# app.config['SESSION_USE_SIGNER'] = True  # 为会话数据添加签名
# app.config['SESSION_KEY_PREFIX'] = 'esg_simulator_session:'  # Redis 键前缀
# app.config['SESSION_REDIS'] = redis.StrictRedis(host='localhost', port=5001, db=0)  # 配置 Redis 连接
#
# # 初始化 Session
# Session(app)


def getSimulateData(t_max, m_sim):
    """
    进行 SUPA 模型数据模拟，生成未来 t_max 年的模拟数据。
    m_sim: 表示模拟的次数（可能用于生成多个模拟结果）。
    t_max: 表示模拟的时间范围，通常是年数。
    函数的目的是生成 SUPA 模型的模拟数据，并返回相应的结果。
    """
    model_ExtSUPA = SIM.ExtendedSUPA('./data/supa/calib9218.csv')
    params = model_ExtSUPA.Dictionary_Param
    numVar = model_ExtSUPA.Dictionary_Param['NumVar']

    """
    freq: 每年时间步长的数量（时间步的频率）。
    在这里，freq=1 表示每年只有一个时间步，模型按年进行模拟。
    back_test: 模型的模拟模式设置。
    在这里，back_test=0 表示执行“前向模拟”，即预测未来的数据，而不是回测历史数据。
    """
    freq = 1  # freq : number of time steps per year
    back_test = 0  # 前向模拟

    model_ExtSUPA.ForwardSimulation(m_sim, t_max, freq, back_test)
    supa_X = model_ExtSUPA.SIM_X

    """
    dt:表示每个时间步的时间间隔。
    计算方法为 1.0 / freq，在 freq=1 的情况下，dt=1.0，即每步代表 1 年。
    t:使用 np.linspace 生成时间轴，长度为 t_max + 1。
    
    np.linspace(start, stop, num):
    start=0：时间从 0 开始。
    stop=dt * t_max：时间到达 t_max 年。
    num=t_max + 1：生成 t_max + 1 个时间点（包括起点和终点）。
    """
    dt = 1.0 / freq

    # 时间轴
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
    bt = supa_X[:, :, 10]  # 国内债券回报率
    ot = supa_X[:, :, 11]  # 国际债券回报率
    ht = supa_X[:, :, 12]  # 房价增长率
    ut = supa_X[:, :, 13]  # 失业率

    return (t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut)




@app.route('/')
def index():
    """
    主页，包含表单输入用于设置 t_max 和 m_sim
    视图函数的名称 是你定义的函数名，例如 index()就是视图函数，它与路由 (@app.route('/')) 相关联。
    使用 url_for('index') 可以动态生成该视图函数对应的 URL（在本例中为 /）。
    """
    return render_template('index.html')


@app.route('/test')
def about():
    return 'This is the test page. Flask is running!'


from flask import request, jsonify, session

@app.route('/save_session', methods=['POST'])
def save_session():
    # 获取 POST 数据
    data = request.get_json()

    # 提取参数，并设置默认值
    t_max = int(data.get('t_max', 20))  # 默认值 20
    m_sim = int(data.get('m_sim', 10))  # 默认值 10
    current_salary = float(data.get('current_salary', 0.0))  # 默认工资 0
    current_assets = float(data.get('current_assets', 0.0))  # 默认资产 0

    # 保存到 session 中
    session['t_max'] = t_max
    session['m_sim'] = m_sim
    session['current_salary'] = current_salary
    session['current_assets'] = current_assets

    print("Session Data:", session)

    return jsonify({'status': 'success'})


"""
使用全局变量（开发模式）
如果不需要为每个用户分别存储数据，可以使用全局变量存储数据：

优点：实现简单，适合快速开发。
限制：多个用户同时使用时，数据可能互相干扰。
"""
simulated_data = {}


@app.route('/Portfolio')
def Portfolio():
    print("Portfolio route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
    print("year = ", t[-1])

    # 在 Flask 应用中定义全局变量，并在生成数据时赋值
    simulated_data['stock_annual_returns'] = et[-1]
    simulated_data['bond_annual_returns'] = bt[-1]

    print("stock_annual_returns = ", simulated_data['stock_annual_returns'])
    print("bond_annual_returns = ", simulated_data['bond_annual_returns'])

    create_investment_portfolio_dashboard(dash_app, simulated_data['stock_annual_returns'], simulated_data['bond_annual_returns'])

    # 渲染 HTML 模板
    return render_template('portfolio.html')


@app.route('/Inflation_Rate')
def inflation_rate():
    print("Inflation_Rate route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    # 确保参数是整数类型（防止恶意篡改）
    try:
        t_max = int(t_max)
        m_sim = int(m_sim)
    except ValueError:
        # 如果类型转换失败，设置为默认值
        t_max = 20
        m_sim = 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)

    # t = session.get('t')
    # qt = session.get('qt')
    # t = np.array(t)
    # qt = np.array(qt)
    # if t is None or qt is None:
    #     return "No data available for Inflation Rate", 400

    # 将数据从列表转换回 NumPy 数组
    # t = np.array(t)
    # qt = np.array(qt)
    # print("t = ", t)
    # print("qt = ", qt)
    plot1_html = plot_simulation_results(t, qt, "Inflation Rate")
    plot2_html = plot_cumulative_simulation_results(t, qt, "Inflation Rate")
    plot3_html = plot_final_value_distribution(t, qt, "Inflation Rate")

    # 渲染模板
    return render_template('show_plot.html', plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


@app.route('/Wage_Growth')
def wage_growth():
    print("Wage_Growth route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    # 确保参数是整数类型（防止恶意篡改）
    try:
        t_max = int(t_max)
        m_sim = int(m_sim)
    except ValueError:
        # 如果类型转换失败，设置为默认值
        t_max = 20
        m_sim = 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim-1)
    plot1_html = plot_simulation_results(t, wt, "Wage Growth")
    plot2_html = plot_cumulative_simulation_results(t, wt, "Wage Growth")
    plot3_html = plot_final_value_distribution(t, wt, "Wage Growth")
    return render_template('show_plot.html',  plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


@app.route('/Long_term_Interest_Rate')
def long_term_interest_rate():
    print("Long_term_Interest_Rate route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    # 确保参数是整数类型（防止恶意篡改）
    try:
        t_max = int(t_max)
        m_sim = int(m_sim)
    except ValueError:
        # 如果类型转换失败，设置为默认值
        t_max = 20
        m_sim = 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
    plot1_html = plot_simulation_results(t, lt, "Long-term Interest Rate")
    plot2_html = plot_cumulative_simulation_results(t, lt, "Long-term Interest Rate")
    plot3_html = plot_final_value_distribution(t, lt, "Long-term Interest Rate")

    return render_template('show_plot.html', plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


@app.route('/Short_term_Interest_Rate')
def short_term_interest_rate():
    print("short_term_interest_rate route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    # 确保参数是整数类型（防止恶意篡改）
    try:
        t_max = int(t_max)
        m_sim = int(m_sim)
    except ValueError:
        # 如果类型转换失败，设置为默认值
        t_max = 20
        m_sim = 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
    plot1_html = plot_simulation_results(t, st, "Short-term Interest Rate")
    plot2_html = plot_cumulative_simulation_results(t, st, "Short-term Interest Rate")
    plot3_html = plot_final_value_distribution(t, st, "Short-term Interest Rate")
    return render_template('show_plot.html', plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


# @app.route('/Cash_Return')
# def cash_return():
#     print("Cash_Return route in")
#
#     # 从 session 获取参数，设置默认值
#     t_max = session.get('t_max', 20)  # 默认值为 20
#     m_sim = session.get('m_sim', 10)  # 默认值为 10
#
#     # 确保参数是整数类型（防止恶意篡改）
#     try:
#         t_max = int(t_max)
#         m_sim = int(m_sim)
#     except ValueError:
#         # 如果类型转换失败，设置为默认值
#         t_max = 20
#         m_sim = 10
#
#     t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
#     plot1_html = plot_simulation_results(t, ct, "Cash Return Rate")
#     plot2_html = plot_cumulative_simulation_results(t, ct, "Cash Return Rate")
#     plot3_html = plot_final_value_distribution(t, ct, "Cash Return Rate")
#     return render_template('Cash_Return.html',  plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)
#
#
# @app.route('/Dividend_Yield')
# def dividend_yield():
#     print("Dividend_Yield route in")
#
#     # 从 session 获取参数，设置默认值
#     t_max = session.get('t_max', 20)  # 默认值为 20
#     m_sim = session.get('m_sim', 10)  # 默认值为 10
#
#     # 确保参数是整数类型（防止恶意篡改）
#     try:
#         t_max = int(t_max)
#         m_sim = int(m_sim)
#     except ValueError:
#         # 如果类型转换失败，设置为默认值
#         t_max = 20
#         m_sim = 10
#
#     t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
#     plot1_html = plot_simulation_results(t, yt, "Dividend Yield Rate")
#     plot2_html = plot_cumulative_simulation_results(t, yt, "Dividend Yield Rate")
#     plot3_html = plot_final_value_distribution(t, yt, "Dividend Yield Rate")
#     return render_template('show_plot.html', plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


# @app.route('/Dividend_Growth')
# def dividend_growth():
#     t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(10, 20)
#     plot_html = plot_simulation_results(t, dt)
#     return render_template('Dividend_Growth.html', plot_html=plot_html)


# @app.route('/Stock_Price_Return')
# def stock_price_return():
#     t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(10, 20)
#     plot_html = plot_simulation_results(t, pt)
#     return render_template('Stock_Price_Return.html', plot_html=plot_html)


@app.route('/Stock_Total_Return')
def stock_total_return():
    print("stock_total_return route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    # 确保参数是整数类型（防止恶意篡改）
    try:
        t_max = int(t_max)
        m_sim = int(m_sim)
    except ValueError:
        # 如果类型转换失败，设置为默认值
        t_max = 20
        m_sim = 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
    plot1_html = plot_simulation_results(t, et, "Stock Total Return")
    plot2_html = plot_cumulative_simulation_results(t, et, "Stock Total Return")
    plot3_html = plot_final_value_distribution(t, et, "Stock Total Return")
    return render_template('show_plot.html',  plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


@app.route('/International_Stock_Total_Return')
def international_stock_total_return():
    print("international_stock_total_return route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    # 确保参数是整数类型（防止恶意篡改）
    try:
        t_max = int(t_max)
        m_sim = int(m_sim)
    except ValueError:
        # 如果类型转换失败，设置为默认值
        t_max = 20
        m_sim = 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
    plot1_html = plot_simulation_results(t, nt, "International Stock Total Return")
    plot2_html = plot_cumulative_simulation_results(t, nt, "International Stock Total Return")
    plot3_html = plot_final_value_distribution(t, nt, "International Stock Total Return")
    return render_template('show_plot.html', plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


@app.route('/Bond_Return')
def bond_return():
    print("bond_return route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    # 确保参数是整数类型（防止恶意篡改）
    try:
        t_max = int(t_max)
        m_sim = int(m_sim)
    except ValueError:
        # 如果类型转换失败，设置为默认值
        t_max = 20
        m_sim = 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
    plot1_html = plot_simulation_results(t, bt, "International Stock Total Return")
    plot2_html = plot_cumulative_simulation_results(t, bt, "International Stock Total Return")
    plot3_html = plot_final_value_distribution(t, bt, "International Stock Total Return")
    return render_template('show_plot.html', plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


@app.route('/International_Bond_Return')
def international_bond_return():
    print("International_Bond_Return route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    # 确保参数是整数类型（防止恶意篡改）
    try:
        t_max = int(t_max)
        m_sim = int(m_sim)
    except ValueError:
        # 如果类型转换失败，设置为默认值
        t_max = 20
        m_sim = 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
    plot1_html = plot_simulation_results(t, ot, "International Bond Return")
    plot2_html = plot_cumulative_simulation_results(t, ot, "International Bond Return")
    plot3_html = plot_final_value_distribution(t, ot, "International Bond Return")
    return render_template('show_plot.html', plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


@app.route('/House_Price_Growth')
def house_price_growth():
    print("house_price_growth route in")

    # 从 session 获取参数，设置默认值
    t_max = session.get('t_max', 20)  # 默认值为 20
    m_sim = session.get('m_sim', 10)  # 默认值为 10

    # 确保参数是整数类型（防止恶意篡改）
    try:
        t_max = int(t_max)
        m_sim = int(m_sim)
    except ValueError:
        # 如果类型转换失败，设置为默认值
        t_max = 20
        m_sim = 10

    t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(t_max, m_sim - 1)
    plot1_html = plot_simulation_results(t, ht, "House Price Growth")
    plot2_html = plot_cumulative_simulation_results(t, ht, "House Price Growth")
    plot3_html = plot_final_value_distribution(t, ht, "House Price Growth")
    return render_template('show_plot.html', plot1_html=plot1_html, plot2_html=plot2_html, plot3_html=plot3_html)


# @app.route('/Unemployment_Rate')
# def unemployment_rate():
#     t, qt, wt, lt, st, ct, yt, dt, pt, et, nt, bt, ot, ht, ut = getSimulateData(10, 20)
#     plot_html = plot_simulation_results(t, ut)
#     return render_template('Unemployment_Rate.html', plot_html=plot_html)


if __name__ == "__main__":
    webbrowser.open("http://127.0.0.1:5000/")
    app.run(debug=False)
