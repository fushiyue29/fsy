// app.js
const deviceManager = require('./utils/deviceManager')
const dataManager = require('./utils/dataManager')

App({
    globalData: {
        userInfo: null,
        deviceConnected: false,
        deviceInfo: null,
        simulationMode: true, // 默认启用模拟模式
        pulseData: {
            channel1: [],
            channel2: [],
            channel3: []
        },
        // 新增WiFi设备连接所需变量
        latestPulseData: null,
        // 添加最新心率数据结构
        latestData: {
            channel1: {
                currentValue: 0,
                max: null,
                min: null
            },
            timestamp: null
        },
        clientId: 'wx_client_' + Date.now(),
        dataFetchFailCount: 0,
        currentNetworkId: null,
        settings: {
            autoStartMonitoring: false,
            notifyAbnormalPulse: true,
            recordInterval: 1 // 分钟
        },
        // 数据校准设置
        calibrationSettings: {
            channel1: { offset: -15, scale: 0.85 }, // 脉搏率校准
            channel2: { offset: 0, scale: 1.0 },    // 血氧校准
            channel3: { offset: 0, scale: 1.0 }     // 温度校准
        },
        // 用于存储生成的图标路径
        iconPaths: {},
        // Material Icons 字体加载状态
        fontLoaded: false,
        // 应用初始化状态
        isInitialized: false,
        // 记录数缓存，确保首页和历史页面一致
        recentRecords: null
    },

    onLaunch: function () {
        console.log('应用启动');

        // 标记应用正在初始化
        this.globalData.isInitialized = false;

        // 预加载字体
        this.preloadFont();

        // 初始化设备管理器
        deviceManager.init().then(() => {
            // 检查设备连接状态
            this.checkDeviceStatus();

            // 检查网络状态
            this.checkNetworkStatus();

            // 标记应用已完成初始化
            this.globalData.isInitialized = true;
            console.log('应用初始化完成');
        }).catch(err => {
            console.error('初始化设备管理器失败:', err);

            // 即使出错，也标记为已初始化
            this.globalData.isInitialized = true;
        });

        // 加载用户设置
        this.loadUserSettings();
    },

    // 预加载 Material Icons 字体
    preloadFont: function () {
        const that = this;
        wx.loadFontFace({
            family: 'Material Icons',
            source: 'url("https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2")',
            success: function () {
                console.log('Material Icons 字体加载成功');
                that.globalData.fontLoaded = true;

                // 通知所有页面更新
                const pages = getCurrentPages();
                if (pages && pages.length > 0) {
                    pages.forEach(page => {
                        if (page && typeof page.onFontLoaded === 'function') {
                            try {
                                page.onFontLoaded();
                            } catch (error) {
                                console.error('调用页面onFontLoaded失败:', error);
                            }
                        }
                    });
                }
            },
            fail: function (res) {
                console.error('Material Icons 字体加载失败:', res);

                // 尝试使用备用方法
                console.log('尝试使用备用方法加载字体');
                that.loadFontFromCache();
            },
            complete: function () {
                // 即使字体加载失败，也更新状态以允许应用继续运行
                if (!that.globalData.fontLoaded) {
                    that.globalData.fontLoaded = true;
                    console.log('字体加载未成功完成，但应用将继续运行');
                }
            }
        });
    },

    // 尝试从缓存加载字体
    loadFontFromCache: function () {
        // 此处可以实现备用字体加载策略
        // 如果在线加载失败，可以尝试从本地缓存加载
        console.log('从缓存加载字体功能尚未实现');

        // 即使没有备用策略，也标记为已加载，允许应用继续运行
        this.globalData.fontLoaded = true;
    },

    checkDeviceStatus: function () {
        const that = this;
        try {
            deviceManager.getDeviceInfo().then(deviceInfo => {
                if (deviceInfo) {
                    that.globalData.deviceConnected = true;
                    that.globalData.deviceInfo = deviceInfo;
                } else {
                    that.globalData.deviceConnected = false;
                    that.globalData.deviceInfo = null;

                    // 如果未连接设备，检查是否启用模拟模式
                    console.log('未连接设备，模拟模式状态:', that.globalData.simulationMode);
                }
            }).catch(err => {
                console.error('获取设备信息错误:', err);
                that.globalData.deviceConnected = false;
                that.globalData.deviceInfo = null;
            });
        } catch (error) {
            console.error('检查设备状态出错:', error);
            that.globalData.deviceConnected = false;
            that.globalData.deviceInfo = null;
        }
    },

    checkNetworkStatus: function () {
        const that = this;
        try {
            deviceManager.checkNetworkStatus().then(networkInfo => {
                console.log('当前网络状态:', networkInfo);
                if (networkInfo.type === 'wifi') {
                    that.globalData.currentNetworkId = networkInfo.name;
                }
            }).catch(err => {
                console.error('获取网络状态错误:', err);
            });
        } catch (error) {
            console.error('检查网络状态出错:', error);
        }
    },

    loadUserSettings: function () {
        // 从本地存储加载用户设置
        try {
            const settings = wx.getStorageSync('userSettings')
            if (settings) {
                this.globalData.settings = { ...this.globalData.settings, ...settings }
            }
        } catch (error) {
            console.error('加载用户设置失败:', error);
        }
    },

    saveUserSettings: function () {
        // 保存用户设置到本地存储
        try {
            wx.setStorageSync('userSettings', this.globalData.settings)
        } catch (error) {
            console.error('保存用户设置失败:', error);
        }
    },

    // 获取TabBar实例的安全方法
    getTabBarInstance: function (page) {
        if (!page) return null;

        try {
            if (typeof page.getTabBar === 'function') {
                return page.getTabBar();
            }
        } catch (error) {
            console.error('获取TabBar实例失败:', error);
        }

        return null;
    }
}) 