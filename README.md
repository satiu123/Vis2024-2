# Job Wanted 可视化实验台

一个基于 D3 + ECharts 的 ChinaVis 2024 赛题 2 可视化作品。前端静态运行，无需构建步骤。

## 目录结构
- index.html：入口页面，前端联动可视化
- src/js/app.js：业务逻辑与联动
- src/css/styles.css：样式
- assets/data/dashboard-data.json、records-lite.json：可视化所需聚合与精简数据
- scripts/build_dashboard_data.py：从预处理 CSV 生成上述 JSON

## 运行（本地预览）
```bash
# 直接起一个简单 HTTP 服务
python -m http.server 8000
# 然后访问 http://localhost:8000

```

## 数据再生成（可选）
可重建 JSON：
```bash
# 使用仓库内的虚拟环境
python scripts/build_dashboard_data.py
```
生成文件会写入 assets/data/dashboard-data.json 与 assets/data/records-lite.json。

## 浏览器支持
现代 Chromium/Edge/Firefox，若遇缓存问题，请 Ctrl+F5 强制刷新。
