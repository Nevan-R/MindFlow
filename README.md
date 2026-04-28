# 🧠 MindFlow - 思维导图

一个功能强大、界面美观的网页思维导图应用，支持自由编辑、导入导出等功能。

## ✨ 特性

- 🎨 **现代化界面** - 深色主题，渐变效果，流畅动画
- 🖱️ **自由编辑** - 添加、删除、编辑节点，支持展开/折叠
- 🎯 **多种操作方式** - 工具栏按钮 + 快捷键，操作更高效
- 💾 **导入导出** - 支持 JSON 格式导入导出
- 🔍 **画布控制** - 缩放、平移，自由调整视图
- 📱 **响应式设计** - 适配不同屏幕尺寸

## 🚀 运行方式

### 方式一：VS Code 直接运行（推荐）

1. 在 VS Code 中打开项目文件夹
2. 按 `F5` 或点击左侧调试图标，选择 **"Launch MindMap"**
3. 或者按 `Ctrl+Shift+P`，输入 `Tasks: Run Task`，选择 **"Open MindMap"**

### 方式二：命令行运行

```bash
# 使用 Node.js 启动服务器
npm start

# 或直接使用 node
node server.js
```

然后打开浏览器访问 `http://localhost:5500`

### 方式三：直接双击打开

直接双击 `mindmap.html` 文件在浏览器中打开

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Tab` | 添加子节点 |
| `Enter` | 添加兄弟节点 |
| `Delete` | 删除节点 |
| `F2` | 编辑节点 |
| `Space` + 拖拽 | 平移画布 |
| `Ctrl` + 滚轮 | 缩放画布 |
| `Ctrl` + `S` | 导出 JSON |
| `?` | 显示/隐藏帮助面板 |

## 📁 文件结构

```
mind/
├── mindmap.html      # 主应用文件
├── server.js         # Node.js 服务器
├── package.json      # 项目配置
├── README.md         # 说明文档
└── .vscode/          # VS Code 配置
    ├── settings.json
    ├── launch.json
    └── tasks.json
```

## 🛠️ 技术栈

- HTML5
- CSS3 (CSS Variables, Flexbox, Grid)
- Vanilla JavaScript (ES6+ Classes)
- SVG (连接线绘制)

## 📄 许可证

MIT License
