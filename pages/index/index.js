const app = getApp()
const deviceManager = require('../../utils/deviceManager')
const dataManager = require('../../utils/dataManager')

Page({
    data: {
        userInfo: null,
        deviceStatus: {
            connected: false,
            name: '',
            signalStrength: 0
        },
        healthData: {
            heartRate: 0,
            maxHeartRate: null,
            minHeartRate: null,
            lastUpdated: '暂无数据'
        },
        canUseWifi: false,
        hasRecentRecords: false,
        recentRecordCount: 0,
        simulationMode: false,
        showIconTip: true,  // 是否显示图标修复提示
        fontLoaded: false,   // Material Icons字体是否加载完成
        contentHeight: 0,
        lastScrollTop: 0,
        scrollThreshold: 20,
        tabBarVisible: true
    },

    onLoad: function () {
        // 计算内容区域高度
        this.calculateContentHeight()

        // 获取TabBar实例
        if (typeof this.getTabBar === 'function') {
            this.tabBarInstance = this.getTabBar()
        }

        // 检查是否可以使用WiFi能力
        wx.getSystemInfo({
            success: (res) => {
                this.setData({
                    canUseWifi: res.wifiEnabled
                })
                console.log('WiFi能力:', res.wifiEnabled)
            }
        })

        // 获取全局数据
        if (app.globalData.userInfo) {
            this.setData({
                userInfo: app.globalData.userInfo
            })
        }

        // 获取模拟模式状态
        this.setData({
            simulationMode: app.globalData.simulationMode,
            fontLoaded: app.globalData.fontLoaded
        })

        // 初始化设备管理器
        deviceManager.init().then(() => {
            this.checkDeviceStatus()
        }).catch(err => {
            console.error('设备管理器初始化失败:', err)
            // 即使初始化失败，也设置为模拟模式
            this.setData({
                simulationMode: true
            })
        })
    },

    onShow: function () {
        // 设置TabBar选中状态
        if (this.tabBarInstance) {
            this.tabBarInstance.setData({
                selected: 0
            })
        }

        // 重新计算内容高度
        this.calculateContentHeight()

        // 确保TabBar可见
        this.showTabBar()

        // 页面显示时刷新数据
        this.checkDeviceStatus()
        this.refreshData()
        this.checkRecentRecords()
    },

    // 当字体加载完成时调用
    onFontLoaded: function () {
        this.setData({
            fontLoaded: true
        });
    },

    checkDeviceStatus: function () {
        const app = getApp()
        if (!app || !app.globalData) {
            console.log('App instance not initialized')
            this.setData({
                deviceStatus: {
                    connected: false,
                    signalStrength: 0
                }
            })
            return
        }

        // 从全局数据获取设备信息
        const isConnected = app.globalData.deviceConnected
        const deviceInfo = app.globalData.deviceInfo
        const isSimulation = app.globalData.simulationMode

        // 获取最近心率数据，包括最大最小值
        const latestData = app.globalData.latestData
        const heartRate = latestData && latestData.channel1 ? latestData.channel1.currentValue : null
        const maxHeartRate = latestData && latestData.channel1 ? latestData.channel1.max : null
        const minHeartRate = latestData && latestData.channel1 ? latestData.channel1.min : null

        // 格式化更新时间
        let lastUpdated = '暂无数据'
        if (latestData && latestData.timestamp) {
            const date = new Date(latestData.timestamp)
            lastUpdated = `${this.formatDate(date)} ${this.formatTime(date)}`
        }

        // 更新页面数据
        this.setData({
            deviceStatus: {
                connected: isConnected,
                name: deviceInfo ? deviceInfo.name : '',
                signalStrength: deviceInfo ? deviceInfo.signalStrength : 0
            },
            healthData: {
                heartRate: heartRate,
                maxHeartRate: maxHeartRate,
                minHeartRate: minHeartRate,
                lastUpdated: lastUpdated
            },
            simulationMode: isSimulation
        })
    },

    refreshData: function () {
        // 如果设备已连接或处于模拟模式，获取实时数据
        if (this.data.deviceStatus.connected || this.data.simulationMode) {
            deviceManager.getPulseData().then(data => {
                if (data && data.channels) {
                    // 使用channel1的数据
                    const heartRate = data.channels.channel1 || 0;

                    // 初始化最大最小值（如果不存在）
                    let maxHeartRate = this.data.healthData.maxHeartRate || heartRate;
                    let minHeartRate = this.data.healthData.minHeartRate || heartRate;

                    // 更新最大最小值
                    if (heartRate > maxHeartRate) maxHeartRate = heartRate;
                    if (heartRate < minHeartRate || minHeartRate === null) minHeartRate = heartRate;

                    // 更新数据
                    this.setData({
                        'healthData.heartRate': heartRate,
                        'healthData.maxHeartRate': maxHeartRate,
                        'healthData.minHeartRate': minHeartRate,
                        'healthData.lastUpdated': this.formatTime(new Date())
                    });

                    // 更新全局数据，确保其他页面可以访问
                    const app = getApp();
                    if (app && app.globalData) {
                        if (!app.globalData.latestData) {
                            app.globalData.latestData = {
                                channel1: {}
                            };
                        }
                        if (!app.globalData.latestData.channel1) {
                            app.globalData.latestData.channel1 = {};
                        }
                        app.globalData.latestData.channel1.currentValue = heartRate;
                        app.globalData.latestData.channel1.max = maxHeartRate;
                        app.globalData.latestData.channel1.min = minHeartRate;
                        app.globalData.latestData.timestamp = Date.now();
                    }
                }
            }).catch(err => {
                console.error('获取脉搏数据失败:', err)
                // 如果在模拟模式下，生成模拟数据
                if (this.data.simulationMode) {
                    const mockHeartRate = 70 + Math.floor(Math.random() * 10 - 5);

                    // 初始化最大最小值（如果不存在）
                    let maxHeartRate = this.data.healthData.maxHeartRate || mockHeartRate;
                    let minHeartRate = this.data.healthData.minHeartRate || mockHeartRate;

                    // 更新最大最小值
                    if (mockHeartRate > maxHeartRate) maxHeartRate = mockHeartRate;
                    if (mockHeartRate < minHeartRate || minHeartRate === null) minHeartRate = mockHeartRate;

                    this.setData({
                        'healthData.heartRate': mockHeartRate,
                        'healthData.maxHeartRate': maxHeartRate,
                        'healthData.minHeartRate': minHeartRate,
                        'healthData.lastUpdated': this.formatTime(new Date()) + ' (模拟)'
                    });

                    // 更新全局数据
                    const app = getApp();
                    if (app && app.globalData) {
                        if (!app.globalData.latestData) {
                            app.globalData.latestData = {
                                channel1: {}
                            };
                        }
                        if (!app.globalData.latestData.channel1) {
                            app.globalData.latestData.channel1 = {};
                        }
                        app.globalData.latestData.channel1.currentValue = mockHeartRate;
                        app.globalData.latestData.channel1.max = maxHeartRate;
                        app.globalData.latestData.channel1.min = minHeartRate;
                        app.globalData.latestData.timestamp = Date.now();
                    }
                }
            });
        }
    },

    checkRecentRecords: function () {
        const app = getApp()
        if (!app || !app.globalData) {
            console.log('App instance not initialized')
            return
        }

        // 模拟模式下生成一些随机数据
        if (app.globalData.simulationMode && !app.globalData.recentRecords) {
            // 生成固定的随机记录数
            const mockRecordCount = 3;  // 固定为3条记录，与图片中显示一致

            this.setData({
                hasRecentRecords: true,
                recentRecordCount: mockRecordCount
            });

            // 保存到全局变量，确保历史页面可以使用相同的数据
            app.globalData.recentRecords = {
                count: mockRecordCount,
                date: new Date()
            };

            return;
        }

        // 如果全局变量中已有最近记录计数，直接使用
        if (app.globalData.recentRecords) {
            const now = new Date();
            const lastUpdate = app.globalData.recentRecords.date;

            // 如果数据是最近5分钟内的，直接使用
            if ((now - lastUpdate) < 5 * 60 * 1000) {
                this.setData({
                    hasRecentRecords: app.globalData.recentRecords.count > 0,
                    recentRecordCount: app.globalData.recentRecords.count
                });
                return;
            }
        }

        // 实际功能：检查最近7天的记录
        // 获取最近7天的记录数量
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 7)

        const filter = {
            startDate: this.formatDate(start),
            endDate: this.formatDate(end)
        }

        try {
            const records = dataManager.getRecords(filter)

            // 更新全局变量
            app.globalData.recentRecords = {
                count: records.length,
                date: new Date(),
                filter: filter
            };

            this.setData({
                hasRecentRecords: records.length > 0,
                recentRecordCount: records.length
            })
        } catch (error) {
            console.error('获取记录失败:', error)
            this.setData({
                hasRecentRecords: false,
                recentRecordCount: 0
            })
        }
    },

    navigateToDevice: function () {
        wx.switchTab({
            url: '/pages/device/device'
        })
    },

    navigateToMonitor: function () {
        wx.switchTab({
            url: '/pages/monitor/monitor'
        })
    },

    navigateToHistory: function () {
        wx.switchTab({
            url: '/pages/history/history'
        })
    },

    // 关闭图标提示
    closeIconTip: function () {
        this.setData({
            showIconTip: false
        });
    },

    formatDate: function (date) {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()

        return [year, month, day].map(this.formatNumber).join('-')
    },

    formatTime: function (date) {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const hour = date.getHours()
        const minute = date.getMinutes()

        return [year, month, day].map(this.formatNumber).join('/') + ' ' +
            [hour, minute].map(this.formatNumber).join(':')
    },

    formatNumber: function (n) {
        n = n.toString()
        return n[1] ? n : '0' + n
    },

    calculateContentHeight: function (tabBarHidden = false) {
        const that = this
        wx.getSystemInfo({
            success: function (res) {
                // 获取屏幕高度
                const windowHeight = res.windowHeight

                // TabBar高度（98rpx，转换为px）
                const tabBarHeight = tabBarHidden ? 0 : 49  // 98rpx约等于49px

                // 底部安全区域高度（20rpx，转换为px）
                const safeAreaHeight = 10  // 20rpx约等于10px

                // 计算内容区域高度
                const contentHeight = windowHeight - (tabBarHidden ? safeAreaHeight : tabBarHeight)

                that.setData({
                    contentHeight: contentHeight,
                    tabBarVisible: !tabBarHidden
                })
            }
        })
    },

    onScrollEvent: function (e) {
        const scrollTop = e.detail.scrollTop
        const oldScrollTop = this.data.lastScrollTop
        const threshold = this.data.scrollThreshold

        // 判断滚动方向
        if (scrollTop > oldScrollTop + threshold) {
            // 向下滚动
            this.setData({
                lastScrollTop: scrollTop
            })
            this.hideTabBar()
        } else if (scrollTop < oldScrollTop - threshold) {
            // 向上滚动
            this.setData({
                lastScrollTop: scrollTop
            })
            this.showTabBar()
        }
    },

    hideTabBar: function () {
        if (!this.data.tabBarVisible) return

        this.setData({
            tabBarVisible: false
        })

        if (this.tabBarInstance) {
            this.tabBarInstance.setData({
                hideTabBar: true
            })
        }

        this.calculateContentHeight(true)
    },

    showTabBar: function () {
        if (this.data.tabBarVisible) return

        this.setData({
            tabBarVisible: true
        })

        if (this.tabBarInstance) {
            this.tabBarInstance.setData({
                hideTabBar: false
            })
        }

        this.calculateContentHeight(false)
    }
}) 