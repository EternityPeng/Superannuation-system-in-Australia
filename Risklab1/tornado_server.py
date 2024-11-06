from tornado.wsgi import WSGIContainer
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from flask_service import app  # 假设 app 是你在 Flask 服务中定义的应用

# 将 Flask 应用包装为 Tornado 可处理的 WSGI 应用
http_server = HTTPServer(WSGIContainer(app))

# 在端口 5001 上监听
http_server.listen(5001)

# 启动 I/O 循环，使 Tornado 接管请求并处理
IOLoop.instance().start()
