import numpy as np
import plotly.graph_objs as go
import plotly.io as pio
import plotly.figure_factory as ff
import plotly.express as px
from scipy.stats import gaussian_kde

def plot_simulation_results(t, data, indicator_name):
    """
    绘制经济指标的图表
    :param t: 时间数组
    :param data: 该经济指标的数据（例如：qt, wt, lt等）
    :param indicator_name: 显示在图表中的指标名称
    :return: 返回图表的HTML
    """
    fig = go.Figure()
    # print("data  = ", data)
    print("t  = ", t)
    # 绘制每条模拟路径
    for i in range(data.shape[0]):
        fig.add_trace(go.Scatter(
            x=t,
            y=data[i],
            mode='lines',
            name=f'{indicator_name} - Path {i + 1}',
            line=dict(width=2),  # 设置线宽
            opacity=0.6,  # 设置透明度
            line_shape='spline'  # 使用样条曲线
        ))

    # 设置图像布局
    fig.update_layout(
        title=f"Future Economic Simulation - {indicator_name}",
        xaxis=dict(title="Time (years)"),
        yaxis=dict(title="Indicator Values"),
        template="plotly_dark",
        hovermode="x unified"
    )

    # 返回图像的HTML
    return pio.to_html(fig, full_html=False)


def plot_cumulative_simulation_results(t, data, indicator_name):
    """
    绘制经济指标的累积图表
    :param t: 时间数组
    :param data: 该经济指标的数据（例如：qt, wt, lt等）
    :param indicator_name: 显示在图表中的指标名称
    :return: 返回图表的HTML
    """

    # 计算累积值
    cumulative_data = np.cumsum(data, axis=1)

    fig = go.Figure()

    # 绘制每条累积路径
    for i in range(cumulative_data.shape[0]):
        fig.add_trace(go.Scatter(
            x=t,
            y=cumulative_data[i],
            mode='lines',
            name=f'{indicator_name} - Cumulative Path {i + 1}',
            line=dict(width=2),
            opacity=0.6,
            line_shape='spline'  # 使用样条曲线
        ))

    # 设置图像布局
    fig.update_layout(
        title=f"Cumulative Economic Simulation - {indicator_name}",
        xaxis=dict(title="Time (years)"),
        yaxis=dict(title="Cumulative Indicator Values"),
        template="plotly_dark",
        hovermode="x unified"
    )

    # 返回图像的HTML
    return pio.to_html(fig, full_html=False)


def plot_final_value_distribution(t, data, indicator_name):
    """
    绘制经济指标的最终累积值分布图，并显示百分位数线和分布曲线
    :param t: 时间数组
    :param data: 经济指标的原始数据（例如：qt, wt, lt等）
    :param indicator_name: 指标名称，用于图表标题
    :return: 返回图表的HTML
    """
    # 计算累积值
    cumulative_data = np.cumsum(data, axis=1)

    # 提取每条路径的最终值
    final_values = cumulative_data[:, -1]

    # 计算百分位数
    percentile_25 = np.percentile(final_values, 25)
    percentile_50 = np.percentile(final_values, 50)
    percentile_75 = np.percentile(final_values, 75)

    # 创建概率密度函数（PDF）估计
    kde = gaussian_kde(final_values)
    values_range = np.linspace(min(final_values), max(final_values), 1000)
    kde_values = kde(values_range)

    # 绘制直方图和分布曲线
    fig_distribution = go.Figure(data=[
        go.Histogram(x=final_values, nbinsx=50, opacity=0.75, name='Histogram'),
        go.Scatter(x=values_range, y=kde_values, mode='lines', name='PDF')
    ])

    # 添加百分位数线
    fig_distribution.add_vline(x=percentile_25, line_dash='dash', line_color='blue', annotation_text=f'25%: {percentile_25:.2f}', annotation_position='top right')
    fig_distribution.add_vline(x=percentile_50, line_dash='dash', line_color='red', annotation_text=f'50%: {percentile_50:.2f}', annotation_position='top right')
    fig_distribution.add_vline(x=percentile_75, line_dash='dash', line_color='green', annotation_text=f'75%: {percentile_75:.2f}', annotation_position='top right')

    # 设置布局
    fig_distribution.update_layout(
        title=f'Distribution of Final {indicator_name} Values',
        xaxis_title=f'Final {indicator_name} Value',
        yaxis_title='Density',
        legend=dict(title='Legend'),
        template='plotly_white'
    )

    # 返回图像的HTML
    return pio.to_html(fig_distribution, full_html=False)

import dash
from dash import dcc, html
from dash.dependencies import Input, Output


# # from app import dash_app
#
# def create_investment_portfolio_dashboard(stock_annual_returns, bond_annual_returns, years=10):
#     """
#     创建一个投资组合仪表板，允许通过滑动条调节股票与债券的权重。
#
#     :param years: 模拟的时间长度，默认为10年
#     :return: Dash 应用实例
#     """
#
#     # 计算每年的累计回报
#     stock_cumulative = np.cumprod(1 + stock_annual_returns)
#     bond_cumulative = np.cumprod(1 + bond_annual_returns)
#
#     # 创建 Dash 应用
#     app = dash.Dash(__name__)
#
#     # 应用布局
#     app.layout = html.Div([
#         html.H1("Investment Portfolio Performance", style={'textAlign': 'center'}),
#
#         # 滑动条组件
#         html.Div([
#             html.Label("Adjust Stock Weight (%):", style={'fontSize': '18px'}),
#             dcc.Slider(
#                 id='weight-slider',
#                 min=0, max=100, step=1,
#                 marks={i: f'{i}%' for i in range(0, 101, 10)},
#                 value=70  # 默认值
#             ),
#             html.Div(id='weight-display', style={'marginTop': '10px', 'fontSize': '18px'})
#         ], style={'width': '50%', 'margin': 'auto'}),
#
#         # 图表
#         dcc.Graph(id='portfolio-chart')
#     ])
#
#     # 回调函数
#     @app.callback(
#         [Output('portfolio-chart', 'figure'),
#          Output('weight-display', 'children')],
#         [Input('weight-slider', 'value')]
#     )
#     def update_portfolio_chart(stock_weight_percent):
#         # 转换股票权重为小数
#         stock_weight = stock_weight_percent / 100
#         bond_weight = 1 - stock_weight
#
#         # 计算组合累计回报
#         portfolio_cumulative = (stock_weight * stock_cumulative + bond_weight * bond_cumulative)
#
#         # 创建图表
#         fig = go.Figure()
#
#         # 股票
#         fig.add_trace(go.Scatter(
#             x=np.arange(1, years + 1),
#             y=stock_cumulative,
#             mode='lines+markers',
#             name='Stock',
#             line=dict(color='blue', width=2),
#             marker=dict(size=8)
#         ))
#
#         # 债券
#         fig.add_trace(go.Scatter(
#             x=np.arange(1, years + 1),
#             y=bond_cumulative,
#             mode='lines+markers',
#             name='Bond',
#             line=dict(color='green', width=2),
#             marker=dict(size=8)
#         ))
#
#         # 投资组合
#         fig.add_trace(go.Scatter(
#             x=np.arange(1, years + 1),
#             y=portfolio_cumulative,
#             mode='lines+markers',
#             name=f'Portfolio ({stock_weight_percent}% Stock, {100 - stock_weight_percent}% Bond)',
#             line=dict(color='red', width=2),
#             marker=dict(size=8)
#         ))
#
#         # 图表布局
#         fig.update_layout(
#             title='Investment Portfolio Performance Over 10 Years (Annual View)',
#             xaxis_title='Years',
#             yaxis_title='Cumulative Return',
#             legend=dict(title='Asset'),
#             template='plotly_white'
#         )
#
#         # 更新显示权重
#         weight_text = f"Current Allocation: {stock_weight_percent}% Stock, {100 - stock_weight_percent}% Bond"
#
#         return fig, weight_text
#
#     # 返回 Dash 应用实例
#     return app


# def create_investment_portfolio_dashboard(dash_app, stock_annual_returns, bond_annual_returns):
#     """
#     创建一个投资组合仪表板，允许通过滑动条调节股票与债券的权重。
#
#     :param dash_app: 已创建的 Dash 应用实例
#     :param stock_annual_returns: 股票的年度回报
#     :param bond_annual_returns: 债券的年度回报
#     :param years: 模拟的时间长度，默认为10年
#     :return: None
#     """
#     # 清空旧布局和回调
#     # dash_app.layout = None
#     print("Callback map before clear:", dash_app.callback_map)
#     # dash_app.callback_map.clear()
#     print("Callback map after clear:", dash_app.callback_map)
#     # 动态调整 years
#     years = len(stock_annual_returns)-1
#
#     # 计算每年的累计回报
#     stock_cumulative = np.cumprod(1 + stock_annual_returns)
#     bond_cumulative = np.cumprod(1 + bond_annual_returns)
#
#     print("stock_cumulative = ", stock_cumulative)
#     print("bond_cumulative = ", bond_cumulative)
#
#     # 设置 Dash 应用的布局
#     dash_app.layout = html.Div([
#         html.H1("Investment Portfolio Performance", style={'textAlign': 'center'}),
#
#         # 滑动条组件
#         html.Div([
#             html.Label("Adjust Stock Weight (%):", style={'fontSize': '18px'}),
#             dcc.Slider(
#                 id='weight-slider',
#                 min=0, max=100, step=1,
#                 marks={i: f'{i}%' for i in range(0, 101, 10)},
#                 value=70  # 默认值
#             ),
#             html.Div(id='weight-display', style={'marginTop': '10px', 'fontSize': '18px'})
#         ], style={'width': '50%', 'margin': 'auto'}),
#
#         # 图表
#         dcc.Graph(id='portfolio-chart')
#     ])
#     print("after layout")
#
#     """
#     回调函数是 Dash 应用中的核心机制之一，它定义了应用中用户交互的响应。
#     回调函数通常用来根据用户的输入动态地更新页面中的内容，例如图表、文本、样式等。
#     在 Dash 中，回调函数通过 @app.callback 装饰器与输入组件（如按钮、滑块、输入框等）
#     和输出组件（如图表、文本显示区域等）绑定。
#     """
#     # 定义回调函数
#     @dash_app.callback(
#         [Output('portfolio-chart', 'figure'),
#          Output('weight-display', 'children')],
#         [Input('weight-slider', 'value')]
#     )
#     def update_portfolio_chart(stock_weight_percent):
#         print("Callback triggered with stock_weight_percent:", stock_weight_percent)
#         # 转换股票权重为小数
#         stock_weight = stock_weight_percent / 100
#         bond_weight = 1 - stock_weight
#
#         # 计算组合累计回报
#         portfolio_cumulative = (stock_weight * stock_cumulative + bond_weight * bond_cumulative)
#
#         # 创建图表
#         fig = go.Figure()
#
#         # 股票
#         fig.add_trace(go.Scatter(
#             x=np.arange(1, years + 1),
#             y=stock_cumulative,
#             mode='lines+markers',
#             name='Stock',
#             line=dict(color='blue', width=2),
#             marker=dict(size=8)
#         ))
#
#         # 债券
#         fig.add_trace(go.Scatter(
#             x=np.arange(1, years + 1),
#             y=bond_cumulative,
#             mode='lines+markers',
#             name='Bond',
#             line=dict(color='green', width=2),
#             marker=dict(size=8)
#         ))
#
#         # 投资组合
#         fig.add_trace(go.Scatter(
#             x=np.arange(1, years + 1),
#             y=portfolio_cumulative,
#             mode='lines+markers',
#             name=f'Portfolio ({stock_weight_percent}% Stock, {100 - stock_weight_percent}% Bond)',
#             line=dict(color='red', width=2),
#             marker=dict(size=8)
#         ))
#
#         # 图表布局
#         fig.update_layout(
#             title=f'Investment Portfolio Performance Over {years} Years (Annual View)',
#             xaxis_title='Years',
#             yaxis_title='Cumulative Return',
#             legend=dict(title='Asset'),
#             template='plotly_white'
#         )
#
#         # 更新显示权重
#         weight_text = f"Current Allocation: {stock_weight_percent}% Stock, {100 - stock_weight_percent}% Bond"
#
#         return fig, weight_text

from dash import dcc, html
from dash.dependencies import Input, Output, State
import numpy as np
import plotly.graph_objs as go
from dash.exceptions import PreventUpdate
def create_investment_portfolio_dashboard(dash_app, stock_annual_returns, bond_annual_returns):
    """
    创建一个投资组合仪表板，允许通过滑动条调节股票与债券的权重。

    :param dash_app: 已创建的 Dash 应用实例
    :param stock_annual_returns: 股票的年度回报 (numpy 数组)
    :param bond_annual_returns: 债券的年度回报 (numpy 数组)
    :return: None
    """
    # 动态调整 years
    years = len(stock_annual_returns)

    # 计算每年的累计回报
    stock_cumulative = np.cumprod(1 + stock_annual_returns)
    bond_cumulative = np.cumprod(1 + bond_annual_returns)

    # 设置 Dash 应用的布局
    dash_app.layout = html.Div([
        html.H1("Investment Portfolio Performance", style={'textAlign': 'center'}),

        # 用于存储需要跨页面共享的临时数据
        dcc.Store(id='portfolio-data', data={
            'stock_cumulative': stock_cumulative.tolist(),
            'bond_cumulative': bond_cumulative.tolist(),
        }),

        # 滑动条组件
        html.Div([
            html.Label("Adjust Stock Weight (%):", style={'fontSize': '18px'}),
            dcc.Slider(
                id='weight-slider',
                min=0, max=100, step=1,
                marks={i: f'{i}%' for i in range(0, 101, 10)},
                value=70  # 默认值
            ),
            html.Div(id='weight-display', style={'marginTop': '10px', 'fontSize': '18px'}),
            html.Div("Slider loaded!")  # 添加简单的调试信息
        ], style={'width': '50%', 'margin': 'auto'}),

        # 图表
        dcc.Graph(id='portfolio-chart'),
        dcc.Interval(id='trigger-interval', interval=100000, n_intervals=1)  # 添加 Interval
    ])

    print("-------------------------------")  # 打印回调是否触发
    @dash_app.callback(
        [Output('portfolio-chart', 'figure'),
         Output('weight-display', 'children')],
        [Input('weight-slider', 'value'),
         Input('trigger-interval', 'n_intervals')],  # 使用 Interval 作为触发器
        [State('portfolio-data', 'data')]
    )
    def update_portfolio_chart(stock_weight_percent, n_intervals, portfolio_data):
        if n_intervals > 0:  # 确保在页面加载时触发
            print("Callback triggered")  # 打印回调是否触发
            print("stock_weight_percent:", stock_weight_percent)
            print("portfolio_data:", portfolio_data)
            # 检查数据并继续处理
            # 检查数据是否存在
            if not portfolio_data or 'stock_cumulative' not in portfolio_data or 'bond_cumulative' not in portfolio_data:
                print("portfolio_data is missing or incomplete.")
                raise PreventUpdate

            # 从 State 获取数据
            stock_cumulative = np.array(portfolio_data['stock_cumulative'])
            bond_cumulative = np.array(portfolio_data['bond_cumulative'])

            # 转换股票权重为小数
            stock_weight = stock_weight_percent / 100
            bond_weight = 1 - stock_weight

            # 计算组合累计回报
            portfolio_cumulative = stock_weight * stock_cumulative + bond_weight * bond_cumulative

            # 创建图表
            years = len(stock_cumulative)
            fig = go.Figure()

            # 股票
            fig.add_trace(go.Scatter(
                x=np.arange(0, years),
                y=stock_cumulative,
                mode='lines+markers',
                name='Stock',
                line=dict(color='blue', width=2),
                marker=dict(size=8)
            ))

            # 债券
            fig.add_trace(go.Scatter(
                x=np.arange(0, years),
                y=bond_cumulative,
                mode='lines+markers',
                name='Bond',
                line=dict(color='green', width=2),
                marker=dict(size=8)
            ))

            # 投资组合
            fig.add_trace(go.Scatter(
                x=np.arange(0, years),
                y=portfolio_cumulative,
                mode='lines+markers',
                name=f'Portfolio ({stock_weight_percent}% Stock, {100 - stock_weight_percent}% Bond)',
                line=dict(color='red', width=2),
                marker=dict(size=8)
            ))

            # 图表布局
            fig.update_layout(
                title=f'Investment Portfolio Performance Over {years-1} Years (Annual View)',
                xaxis_title='Years',
                yaxis_title='Cumulative Return',
                legend=dict(title='Asset'),
                template='plotly_white'
            )

            # 更新显示权重
            weight_text = f"Current Allocation: {stock_weight_percent}% Stock, {100 - stock_weight_percent}% Bond"
            print("Figure created:", fig)  # 打印图表对象

            return fig, weight_text
