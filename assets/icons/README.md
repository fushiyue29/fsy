# 图标文件说明

这个目录包含应用中使用的所有图标文件。目前所有文件均为占位符，需要替换为实际的图标文件。

## 图标列表

### 网络状态图标
- wifi-strong.png - 强信号WiFi图标
- wifi-medium.png - 中等信号WiFi图标
- wifi-weak.png - 弱信号WiFi图标
- wifi-none.png - 无WiFi图标
- mobile-network.png - 移动网络图标
- no-network.png - 无网络图标

### 设备状态图标
- device-connected.png - 设备已连接图标
- device-disconnected.png - 设备未连接图标
- device-searching.png - 设备搜索中图标
- device-error.png - 设备错误图标
- device-simulation.png - 模拟模式图标
- device-available.png - 可用设备图标

### 连接状态图标
- connection-success.png - 连接成功图标
- connection-failed.png - 连接失败图标
- connection-pending.png - 连接中图标
- connection-unstable.png - 连接不稳定图标

### 通用操作图标
- search.png - 搜索图标
- add.png - 添加图标
- disconnect.png - 断开连接图标
- close.png - 关闭图标

### 导航图标
- home.png - 首页图标 (非选中状态)
- home-active.png - 首页图标 (选中状态)
- device.png - 设备页面图标 (非选中状态)
- device-active.png - 设备页面图标 (选中状态)
- monitor.png - 监测页面图标 (非选中状态)
- monitor-active.png - 监测页面图标 (选中状态)
- history.png - 历史页面图标 (非选中状态)
- history-active.png - 历史页面图标 (选中状态)
- user.png - 用户页面图标 (非选中状态)
- user-active.png - 用户页面图标 (选中状态)

## 图标使用

在需要使用图标的地方，通过以下方式引用：

```html
<image src="/assets/icons/图标名称.png" mode="aspectFit"></image>
```

## 图标来源

应用使用的图标可以来自以下几个来源：
1. 自行设计的图标
2. WeUI 图标库 (推荐微信小程序使用)
3. Material Design 图标库 
4. 其他开源图标库

请确保使用的图标拥有合适的使用许可。

## 图标大小指南

- 导航栏图标 (tabBar): 81px × 81px (3x尺寸) 或 27px × 27px (1x尺寸)
- 页面内图标: 
  - 小图标: 48px × 48px (3x尺寸) 或 16px × 16px (1x尺寸)
  - 中图标: 72px × 72px (3x尺寸) 或 24px × 24px (1x尺寸)
  - 大图标: 96px × 96px (3x尺寸) 或 32px × 32px (1x尺寸)

## 替换图标指南

1. 准备好设计好的PNG格式图标文件
2. 确保图标尺寸符合上述大小指南
3. 使用相同的文件名替换此目录中的占位符文件
4. 如果使用不同文件名，请确保更新代码中的引用路径

## 注意事项

- 所有图标应保持统一的设计风格
- 为保证在各种屏幕尺寸上的显示效果，建议使用3x尺寸的图标
- 为了适配深色模式，可以考虑使用不同颜色版本的图标，或使用SVG格式
- 微信小程序推荐使用PNG格式图标，支持透明背景 