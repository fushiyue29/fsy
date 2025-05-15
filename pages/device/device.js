const app = getApp()
const deviceManager = require('../../utils/deviceManager')

// IP地址验证正则表达式
const IP_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

Page({
    data: {
        deviceConnected: false,
        connectedDevice: null,
        simulationMode: false,
        searching: false,
        devices: [],
        networkInfo: {
            connected: false,
            type: '',
            name: ''
        },
        manualIP: '',
        manualPort: '8080',
        isValidIP: false,
        // 图标相关
        networkIcon: '/assets/icons/wifi-none.png',
        deviceIcon: '/assets/icons/device-disconnected.png',
        showAddDeviceModal: false
    },

    onLoad: function () {
        // 初始化页面数据
        this.setData({
            deviceConnected: app.globalData.deviceConnected,
            simulationMode: app.globalData.simulationMode,
            connectedDevice: app.globalData.deviceInfo
        });

        // 更新图标状态
        this.updateIcons();

        // 检查网络状态
        this.checkNetwork();
    },

    onShow: function () {
        // 设置tabBar选中状态
        if (typeof this.getTabBar === 'function') {
            this.getTabBar().setData({
                selected: 1
            });
        }

        // 更新设备状态
        this.refreshData();
    },

    // 添加更新图标方法
    updateIcons: function () {
        // 获取当前网络图标
        const networkIcon = this.data.networkInfo ?
            deviceManager.getNetworkIcon(this.data.networkInfo) :
            deviceManager.ICONS.NETWORK.DISCONNECTED;

        // 获取当前设备图标
        const deviceIcon = deviceManager.getDeviceIcon(
            this.data.deviceConnected,
            this.data.simulationMode
        );

        this.setData({
            networkIcon,
            deviceIcon
        });
    },

    checkNetwork: function () {
        deviceManager.checkNetworkStatus()
            .then(networkInfo => {
                this.setData({ networkInfo });

                // 更新网络图标
                const networkIcon = deviceManager.getNetworkIcon(networkInfo);
                this.setData({ networkIcon });

                if (networkInfo.type !== 'wifi') {
                    wx.showToast({
                        title: '请连接WiFi网络',
                        icon: 'none'
                    });
                }
            })
            .catch(err => {
                console.error('检查网络状态失败:', err);

                // 设置断开连接图标
                this.setData({
                    networkIcon: deviceManager.ICONS.NETWORK.DISCONNECTED
                });
            });
    },

    startSearch: function () {
        if (!this.data.networkInfo.connected || this.data.networkInfo.type !== 'wifi') {
            wx.showToast({
                title: '请先连接WiFi网络',
                icon: 'none'
            });
            return;
        }

        this.setData({
            searching: true,
            devices: []
        });

        deviceManager.searchDevices()
            .then(devices => {
                this.setData({
                    devices: devices,
                    searching: false
                });

                if (devices.length === 0) {
                    wx.showToast({
                        title: '未找到设备',
                        icon: 'none'
                    });
                }
            })
            .catch(err => {
                console.error('搜索设备失败:', err);
                this.setData({ searching: false });

                wx.showToast({
                    title: '搜索设备失败',
                    icon: 'none'
                });
            });
    },

    stopSearch: function () {
        this.setData({ searching: false });
    },

    onIPInput: function (e) {
        const ip = e.detail.value;
        const isValid = IP_REGEX.test(ip);

        this.setData({
            manualIP: ip,
            isValidIP: isValid
        });
    },

    onPortInput: function (e) {
        const port = e.detail.value;
        this.setData({ manualPort: port });
    },

    addDeviceByIP: function () {
        const { manualIP, manualPort } = this.data;

        if (!IP_REGEX.test(manualIP)) {
            wx.showToast({
                title: 'IP地址格式不正确',
                icon: 'none'
            });
            return;
        }

        const port = parseInt(manualPort) || 80;

        wx.showLoading({
            title: '连接设备中...'
        });

        deviceManager.addDeviceByIP(manualIP, port)
            .then(device => {
                wx.hideLoading();

                // 添加到设备列表
                const devices = [...this.data.devices];
                const existingIndex = devices.findIndex(d => d.ip === device.ip && d.port === device.port);

                if (existingIndex >= 0) {
                    devices[existingIndex] = device;
                } else {
                    devices.push(device);
                }

                this.setData({ devices });

                // 询问是否立即连接
                wx.showModal({
                    title: '发现设备',
                    content: `发现设备: ${device.name}，是否立即连接？`,
                    confirmText: '连接',
                    cancelText: '取消',
                    success: (res) => {
                        if (res.confirm) {
                            this.connectToDevice({ currentTarget: { dataset: { device } } });
                        }
                    }
                });
            })
            .catch(err => {
                wx.hideLoading();
                console.error('添加设备失败:', err);

                wx.showToast({
                    title: err.message || '添加设备失败',
                    icon: 'none'
                });
            });
    },

    connectToDevice: function (e) {
        const device = e.currentTarget.dataset.device;

        wx.showLoading({
            title: '连接设备中...'
        });

        deviceManager.connectDevice(device)
            .then(connectedDevice => {
                wx.hideLoading();

                this.setData({
                    deviceConnected: true,
                    connectedDevice: connectedDevice,
                    simulationMode: false
                });

                // 更新图标状态
                this.updateIcons();

                wx.showToast({
                    title: '连接成功',
                    icon: 'success'
                });
            })
            .catch(err => {
                wx.hideLoading();
                console.error('连接设备失败:', err);

                wx.showToast({
                    title: err.message || '连接设备失败',
                    icon: 'none'
                });
            });
    },

    disconnectDevice: function () {
        wx.showLoading({
            title: '断开连接中...'
        });

        deviceManager.disconnectDevice()
            .then(() => {
                wx.hideLoading();

                this.setData({
                    deviceConnected: false,
                    connectedDevice: null
                });

                // 更新图标状态
                this.updateIcons();

                wx.showToast({
                    title: '已断开连接',
                    icon: 'success'
                });
            })
            .catch(err => {
                wx.hideLoading();
                console.error('断开连接失败:', err);

                // 即使请求失败，也认为已断开
                this.setData({
                    deviceConnected: false,
                    connectedDevice: null
                });

                // 更新图标状态
                this.updateIcons();

                wx.showToast({
                    title: '已断开连接',
                    icon: 'success'
                });
            });
    },

    toggleSimulationMode: function (e) {
        const simulationMode = e.detail.value;

        // 如果开启模拟模式，自动断开设备连接
        if (simulationMode && this.data.deviceConnected) {
            deviceManager.disconnectDevice()
                .then(() => {
                    app.globalData.simulationMode = simulationMode;
                    app.globalData.deviceConnected = false;
                    app.globalData.deviceInfo = null;

                    this.setData({
                        simulationMode: simulationMode,
                        deviceConnected: false,
                        connectedDevice: null
                    });

                    // 更新图标状态
                    this.updateIcons();
                });
        } else {
            app.globalData.simulationMode = simulationMode;

            this.setData({
                simulationMode: simulationMode
            });

            // 更新图标状态
            this.updateIcons();
        }
    },

    onUnload: function () {
        // 停止搜索
        if (this.data.searching) {
            this.stopSearch();
        }
    },

    // 当字体加载完成时调用
    onFontLoaded: function () {
        this.setData({
            fontLoaded: true
        });
    },

    // 刷新设备数据
    refreshData: function () {
        // 更新连接状态
        this.setData({
            deviceConnected: app.globalData.deviceConnected,
            simulationMode: app.globalData.simulationMode,
            connectedDevice: app.globalData.deviceInfo
        });

        // 更新图标状态
        this.updateIcons();

        // 检查网络状态
        this.checkNetwork();
    }
}) 