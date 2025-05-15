Page({
    data: {
        icons: [
            { name: 'home', color: '#999999', activeColor: '#4696f7' },
            { name: 'device', color: '#999999', activeColor: '#4696f7' },
            { name: 'monitor', color: '#999999', activeColor: '#4696f7' },
            { name: 'history', color: '#999999', activeColor: '#4696f7' },
            { name: 'user', color: '#999999', activeColor: '#4696f7' }
        ],
        generated: false
    },

    onLoad: function (options) {
        this.iconMap = {
            'home': '\ue88a',
            'device': '\ue32a',
            'monitor': '\ue026',
            'history': '\ue889',
            'user': '\ue7fd'
        };
    },

    /**
     * 生成图标文件
     */
    generateIcons: function () {
        // 检查是否在开发者工具中，仅在开发者工具中允许操作
        const systemInfo = wx.getSystemInfoSync();
        const isDevTools = systemInfo.platform === 'devtools';

        if (!isDevTools) {
            wx.showModal({
                title: '提示',
                content: '图标生成功能仅在开发者工具中可用',
                showCancel: false
            });
            return;
        }

        // 首先提示用户
        wx.showModal({
            title: '生成图标',
            content: '此操作将使用Material Icons字体生成图标并应用到TabBar，确定继续吗？',
            success: (res) => {
                if (res.confirm) {
                    this.proceedGenerateIcons();
                }
            }
        });
    },

    /**
     * 执行图标生成过程
     */
    proceedGenerateIcons: function () {
        const promises = [];
        this.data.icons.forEach(icon => {
            // 生成普通图标
            promises.push(this.drawIcon(icon.name, icon.color));
            // 生成激活图标
            promises.push(this.drawIcon(icon.name, icon.activeColor, true));
        });

        Promise.all(promises).then(() => {
            this.setData({ generated: true });
            wx.showToast({
                title: '图标生成成功',
                icon: 'success'
            });
        }).catch(err => {
            console.error('生成图标失败:', err);
            wx.showToast({
                title: '生成图标失败',
                icon: 'none'
            });
        });
    },

    /**
     * 绘制单个图标
     */
    drawIcon: function (name, color, isActive = false) {
        return new Promise((resolve, reject) => {
            const iconText = this.iconMap[name] || '';
            if (!iconText) {
                reject(new Error(`图标 ${name} 未找到`));
                return;
            }

            const suffix = isActive ? '-active' : '';
            const canvasId = `canvas-${name}${suffix}`;
            const ctx = wx.createCanvasContext(canvasId, this);

            // 绘制图标
            ctx.setFillStyle(color);
            ctx.setFontSize(32);
            ctx.setTextAlign('center');
            ctx.setTextBaseline('middle');
            ctx.font = '32px "Material Icons"';
            ctx.fillText(iconText, 40, 40);

            ctx.draw(false, () => {
                // 将Canvas转换为临时文件
                wx.canvasToTempFilePath({
                    canvasId: canvasId,
                    fileType: 'png',
                    width: 80,
                    height: 80,
                    destWidth: 80,
                    destHeight: 80,
                    success: (res) => {
                        // 由于无法直接写入assets/icons目录，我们将临时文件保存在用户目录
                        // 然后在应用图标时使用预先定义的路径
                        const iconFilename = `${name}${suffix}.png`;
                        const targetPath = wx.env.USER_DATA_PATH + '/' + iconFilename;

                        // 获取文件系统管理器
                        const fs = wx.getFileSystemManager();

                        // 读取临时文件内容
                        fs.readFile({
                            filePath: res.tempFilePath,
                            success: (readRes) => {
                                // 将文件写入用户目录
                                fs.writeFile({
                                    filePath: targetPath,
                                    data: readRes.data,
                                    success: () => {
                                        console.log(`图标 ${iconFilename} 保存成功:`, targetPath);

                                        // 保存图标路径到全局
                                        const app = getApp();
                                        if (!app.iconPaths) app.iconPaths = {};
                                        app.iconPaths[`${name}${suffix}`] = targetPath;

                                        resolve(targetPath);
                                    },
                                    fail: (err) => {
                                        console.error(`写入图标 ${iconFilename} 失败:`, err);
                                        reject(err);
                                    }
                                });
                            },
                            fail: (err) => {
                                console.error(`读取临时图标 ${iconFilename} 失败:`, err);
                                reject(err);
                            }
                        });
                    },
                    fail: (err) => {
                        console.error(`生成图标 ${name}${suffix} 失败:`, err);
                        reject(err);
                    }
                }, this);
            });
        });
    },

    /**
     * 应用图标到tabBar
     */
    applyIcons: function () {
        const app = getApp();

        if (!app.iconPaths && !this.data.generated) {
            wx.showToast({
                title: '请先生成图标',
                icon: 'none'
            });
            return;
        }

        // 在使用自定义tabBar时，我们不需要修改tabBar的图标路径
        // 但我们可以通知页面刷新tabBar，使用新的图标
        wx.showToast({
            title: '图标已应用',
            icon: 'success'
        });

        // 安全地更新各页面的tabBar
        this.updateTabBarSafely();
    },

    /**
     * 安全地更新TabBar
     */
    updateTabBarSafely: function () {
        try {
            // 获取当前页面栈
            const pages = getCurrentPages();
            if (!pages || pages.length === 0) {
                console.log('无法获取页面栈');
                return;
            }

            // 获取应用实例
            const app = getApp();
            if (!app) {
                console.log('无法获取应用实例');
                return;
            }

            // 更新所有页面的TabBar
            pages.forEach(page => {
                if (page) {
                    const tabBar = app.getTabBarInstance(page);
                    if (tabBar) {
                        // 使用当前页面的索引或默认索引
                        const selected = pages.length > 0 ?
                            pages[pages.length - 1] === page ?
                                tabBar.data.selected :
                                tabBar.data.selected
                            : 0;

                        tabBar.setData({ selected });
                    }
                }
            });
        } catch (error) {
            console.error('更新TabBar失败:', error);
        }
    },

    /**
     * 直接使用wx.setTabBarItem方法来设置tabBar图标
     */
    setTabBarIconsDirectly: function (iconPaths) {
        // 定义tab页面和索引的映射
        const tabMapping = [
            { index: 0, name: 'home' },
            { index: 1, name: 'device' },
            { index: 2, name: 'monitor' },
            { index: 3, name: 'history' },
            { index: 4, name: 'user' }
        ];

        // 使用Promise.all来处理所有的setTabBarItem调用
        const promises = tabMapping.map(tab => {
            return new Promise((resolve, reject) => {
                const iconPath = iconPaths[tab.name];
                const selectedIconPath = iconPaths[`${tab.name}-active`];

                if (!iconPath || !selectedIconPath) {
                    console.warn(`图标 ${tab.name} 未找到，跳过设置`);
                    resolve();
                    return;
                }

                // 使用应用内的固定路径，这些图标文件应该已经存在
                const standardIconPath = `assets/icons/${tab.name}.png`;
                const standardSelectedIconPath = `assets/icons/${tab.name}-active.png`;

                wx.setTabBarItem({
                    index: tab.index,
                    iconPath: standardIconPath,
                    selectedIconPath: standardSelectedIconPath,
                    success: (res) => {
                        console.log(`设置tab ${tab.name} 图标成功`);
                        resolve(res);
                    },
                    fail: (err) => {
                        console.error(`设置tab ${tab.name} 图标失败:`, err);
                        reject(err);
                    }
                });
            });
        });

        Promise.all(promises)
            .then(() => {
                wx.showToast({
                    title: '应用图标成功',
                    icon: 'success'
                });
            })
            .catch(err => {
                console.error('设置tabBar图标失败:', err);
                wx.showToast({
                    title: '应用图标失败',
                    icon: 'none'
                });
            });
    }
}) 