# app/__init__.py

import dash
from flask import Flask
import secrets
import sys

# 导入自定义模块
sys.path.append("modules")
import modules.SimulationExtendedSUPA as SIM

def create_app():
    """
    创建 Flask 应用实例，并返回 Dash 应用实例
    """
    # 创建 Flask 应用实例
    app = Flask(__name__)

    # 设置 Flask session secret_key
    app.secret_key = secrets.token_hex(16)  # 安全地生成一个密钥

    # 创建 Dash 应用实例
    dash_app = dash.Dash(__name__, server=app, url_base_pathname='/dash/')

    return app, dash_app
