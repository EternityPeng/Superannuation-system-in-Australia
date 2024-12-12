# run.py

from app import create_app

# 创建 Flask 和 Dash 应用实例
app, dash_app = create_app()

if __name__ == '__main__':
    # 启动 Flask 应用（同时运行 Dash）
    app.run(debug=True, host='0.0.0.0', port=5000)
