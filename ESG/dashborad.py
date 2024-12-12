from plot_functions import *

if __name__ == "__main__":
    # 设置随机种子和模拟参数
    np.random.seed(42)
    years = 10

    # 生成随机数据作为示例
    stock_mean, stock_std = 0.05, 0.15  # 股票年均回报率和波动率
    bond_mean, bond_std = 0.02, 0.03    # 债券年均回报率和波动率

    stock_annual_returns = np.random.normal(stock_mean, stock_std, years)
    bond_annual_returns = np.random.normal(bond_mean, bond_std, years)
    print("使用随机生成的数据作为示例。")

    # 创建并运行 Dash 应用
    app = create_investment_portfolio_dashboard(stock_annual_returns, bond_annual_returns, years=years)
    app.run_server(debug=True)