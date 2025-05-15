const app = getApp()
const deviceManager = require('../../utils/deviceManager')

Page({
    data: {
        userInfo: null,
        hasUserProfile: false,
        isLoggedIn: false,
        deviceConnected: false,
        settings: {
            autoStartMonitoring: false,
            notifyAbnormalPulse: true,
            recordInterval: 1
        },
        recordIntervalOptions: ['1分钟', '5分钟', '10分钟', '15分钟', '30分钟'],
        recordIntervalValues: [1, 5, 10, 15, 30],
        appInfo: {
            version: '1.0.0',
            build: '2023112401'
        },
        fontLoaded: false,
        calibrationSettings: null,
        showCalibrationModal: false,
        currentChannel: 'channel1',
        editingParam: 'offset'
    },

    onLoad: function () {
        // 检查是否已有用户信息
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo) {
            this.setData({
                userInfo: userInfo,
                isLoggedIn: true
            })
        }

        // 检查是否可获取用户信息
        wx.getSetting({
            success: (res) => {
                this.setData({
                    hasUserProfile: res.authSetting['scope.userInfo']
                })
            }
        })

        // 加载应用设置
        this.setData({
            settings: app.globalData.settings
        })

        // 加载校准设置
        this.setData({
            calibrationSettings: app.globalData.calibrationSettings
        })
    },

    onShow: function () {
        // 设置tabBar选中状态
        if (typeof this.getTabBar === 'function') {
            this.getTabBar().setData({
                selected: 4
            });
        }

        // 更新状态
        this.checkDeviceStatus();
    },

    onFontLoaded: function () {
        this.setData({
            fontLoaded: true
        });
    },

    getUserProfile: function () {
        wx.getUserProfile({
            desc: '用于完善用户资料',
            success: (res) => {
                // 保存用户信息
                const userInfo = res.userInfo
                wx.setStorageSync('userInfo', userInfo)
                app.globalData.userInfo = userInfo

                this.setData({
                    userInfo: userInfo,
                    isLoggedIn: true,
                    hasUserProfile: true
                })

                wx.showToast({
                    title: '登录成功',
                    icon: 'success'
                })
            },
            fail: (err) => {
                console.error('获取用户信息失败:', err)
                wx.showToast({
                    title: '登录失败',
                    icon: 'none'
                })
            }
        })
    },

    logOut: function () {
        wx.showModal({
            title: '退出登录',
            content: '确定要退出登录吗？',
            success: (res) => {
                if (res.confirm) {
                    // 清除用户信息
                    wx.removeStorageSync('userInfo')
                    app.globalData.userInfo = null

                    this.setData({
                        userInfo: null,
                        isLoggedIn: false
                    })

                    wx.showToast({
                        title: '已退出登录',
                        icon: 'success'
                    })
                }
            }
        })
    },

    checkDeviceStatus: function () {
        const app = getApp();
        if (!app || !app.globalData) {
            console.log('应用实例未初始化，设置默认状态');
            this.setData({
                deviceConnected: false,
                simulationMode: true
            });
            return;
        }

        deviceManager.getDeviceInfo()
            .then(deviceInfo => {
                this.setData({
                    deviceConnected: app.globalData.deviceConnected || false,
                    deviceInfo: deviceInfo,
                    simulationMode: app.globalData.simulationMode || false
                });
            })
            .catch(err => {
                console.error('获取设备信息失败:', err);
                // 错误时设置默认状态
                this.setData({
                    deviceConnected: false,
                    deviceInfo: null,
                    simulationMode: true
                });
            });
    },

    toggleAutoStartMonitoring: function (e) {
        const value = e.detail.value

        this.setData({
            'settings.autoStartMonitoring': value
        })

        // 保存设置
        app.globalData.settings.autoStartMonitoring = value
        app.saveUserSettings()
    },

    toggleNotifyAbnormalPulse: function (e) {
        const value = e.detail.value

        this.setData({
            'settings.notifyAbnormalPulse': value
        })

        // 保存设置
        app.globalData.settings.notifyAbnormalPulse = value
        app.saveUserSettings()
    },

    recordIntervalChange: function (e) {
        const index = parseInt(e.detail.value)
        const value = this.data.recordIntervalValues[index]

        this.setData({
            'settings.recordInterval': value
        })

        // 保存设置
        app.globalData.settings.recordInterval = value
        app.saveUserSettings()

        wx.showToast({
            title: '设置已保存',
            icon: 'success'
        })
    },

    navigateToDevice: function () {
        wx.switchTab({
            url: '/pages/device/device'
        })
    },

    contactSupport: function () {
        wx.showModal({
            title: '联系客服',
            content: '如有问题，请拨打客服热线：\n400-123-4567\n\n或发送邮件至：\nsupport@pulseapp.com',
            showCancel: false
        })
    },

    checkForUpdates: function () {
        wx.showLoading({
            title: '检查更新中',
        })

        // 模拟检查更新的过程
        setTimeout(() => {
            wx.hideLoading()

            wx.showModal({
                title: '已是最新版本',
                content: '当前版本 v' + this.data.appInfo.version + ' 已是最新版本',
                showCancel: false
            })
        }, 1500)
    },

    clearCache: function () {
        wx.showModal({
            title: '清除缓存',
            content: '确定要清除应用缓存吗？这将不会删除您的记录数据。',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({
                        title: '清除中',
                    })

                    // 模拟清除缓存过程
                    setTimeout(() => {
                        wx.hideLoading()

                        wx.showToast({
                            title: '缓存已清除',
                            icon: 'success'
                        })
                    }, 1500)
                }
            }
        })
    },

    showCalibrationModal: function () {
        this.setData({
            showCalibrationModal: true,
            currentChannel: 'channel1',
            editingParam: 'offset'
        });
    },

    hideCalibrationModal: function () {
        this.setData({
            showCalibrationModal: false
        });
    },

    changeChannel: function (e) {
        this.setData({
            currentChannel: e.currentTarget.dataset.channel
        });
    },

    changeEditingParam: function (e) {
        this.setData({
            editingParam: e.currentTarget.dataset.param
        });
    },

    adjustCalibrationParam: function (e) {
        const { channel, param, change } = e.currentTarget.dataset;
        const value = parseFloat(change);

        if (!this.data.calibrationSettings) {
            this.setData({
                calibrationSettings: app.globalData.calibrationSettings
            });
            return;
        }

        let newValue;
        if (param === 'offset') {
            newValue = this.data.calibrationSettings[channel][param] + value;
        } else if (param === 'scale') {
            newValue = Math.max(0.1, this.data.calibrationSettings[channel][param] + value);
            newValue = Math.round(newValue * 100) / 100;
        }

        const calibrationSettings = this.data.calibrationSettings;
        calibrationSettings[channel][param] = newValue;

        this.setData({
            calibrationSettings: calibrationSettings
        });

        app.globalData.calibrationSettings = calibrationSettings;

        wx.showToast({
            title: '校准已更新',
            icon: 'success',
            duration: 1000
        });
    },

    resetCalibrationSettings: function () {
        wx.showModal({
            title: '重置校准参数',
            content: '确定要将所有校准参数重置为默认值吗？',
            success: (res) => {
                if (res.confirm) {
                    const defaultCalibration = {
                        channel1: { offset: -15, scale: 0.85 },
                        channel2: { offset: 0, scale: 1.0 },
                        channel3: { offset: 0, scale: 1.0 }
                    };

                    this.setData({
                        calibrationSettings: defaultCalibration
                    });

                    app.globalData.calibrationSettings = defaultCalibration;

                    wx.showToast({
                        title: '已重置校准参数',
                        icon: 'success',
                        duration: 1500
                    });
                }
            }
        });
    }
}) 