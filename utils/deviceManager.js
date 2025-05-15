/**
 * 设备管理工具类
 * 提供WiFi设备连接、监测和数据传输功能
 */

let dataPollingInterval = null; // 数据轮询定时器
let currentSocket = null; // 全局变量，用于保存 socket 实例

// 设备服务器地址 - 根据您的设备实际IP地址和端口进行修改
const DEVICE_BASE_URL = "http://192.168.1.x:port/api"; // 替换为您的设备IP和端口

// 添加图标相关常量
const ICONS = {
    // 网络状态图标
    NETWORK: {
        WIFI_STRONG: "/assets/icons/wifi-strong.png",
        WIFI_MEDIUM: "/assets/icons/wifi-medium.png",
        WIFI_WEAK: "/assets/icons/wifi-weak.png",
        WIFI_NONE: "/assets/icons/wifi-none.png",
        MOBILE: "/assets/icons/mobile-network.png",
        DISCONNECTED: "/assets/icons/no-network.png"
    },
    // 设备状态图标
    DEVICE: {
        CONNECTED: "/assets/icons/device-connected.png",
        DISCONNECTED: "/assets/icons/device-disconnected.png",
        SEARCHING: "/assets/icons/device-searching.png",
        ERROR: "/assets/icons/device-error.png",
        SIMULATION: "/assets/icons/device-simulation.png"
    },
    // 连接状态图标
    CONNECTION: {
        SUCCESS: "/assets/icons/connection-success.png",
        FAILED: "/assets/icons/connection-failed.png",
        PENDING: "/assets/icons/connection-pending.png",
        UNSTABLE: "/assets/icons/connection-unstable.png"
    }
};

// 添加init方法，用于初始化设备管理器
function init() {
    return new Promise((resolve) => {
        console.log('设备管理器初始化成功');
        resolve(true);
    });
}

// 添加getDeviceInfo方法，用于获取当前连接的设备信息
function getDeviceInfo() {
    return new Promise((resolve) => {
        const app = getApp();
        if (!app || !app.globalData) {
            console.log('应用实例未初始化，无法获取设备信息');
            resolve(null);
            return;
        }

        if (app.globalData.deviceInfo) {
            resolve(app.globalData.deviceInfo);
        } else {
            resolve(null);
        }
    });
}

// 搜索本地网络中的设备 (通过 TCP 连接) - 直接连接到指定 IP 和端口
function searchDevices(ipAddress = "192.168.36.243", port = 3030) {
    return new Promise((resolve, reject) => {
        wx.showLoading({
            title: '搜索设备中...',
            mask: true
        });

        pingDevice(ipAddress, port)
            .then(device => {
                wx.hideLoading();
                console.log('发现设备 (TCP):', device);
                resolve([device]); // 返回包含单个设备的数组
            })
            .catch(err => {
                wx.hideLoading();
                console.error('设备搜索失败:', err);
                reject(err);
            });
    });
}

// 使用 TCP 连接探测设备 - 仅检查设备是否存在，不建立连接
function pingDevice(ipAddress, port) {
    return new Promise((resolve, reject) => {
        // 创建 TCP Socket
        const tempSocket = wx.createTCPSocket();

        tempSocket.connect({
            address: ipAddress,
            port: port
        });

        let connected = false;

        tempSocket.onConnect(() => {
            console.log(`TCP 连接到 ${ipAddress}:${port} 成功 (ping)`);
            connected = true;

            // 创建设备信息对象
            const device = {
                id: `pulse_${ipAddress.replace(/\./g, '_')}`,
                name: `脉搏监测设备 (${ipAddress})`,
                ip: ipAddress,
                port: port,
                type: 'pulseMonitor',
                status: 'available',
                isSimulated: false // 假设是真实设备
            };

            tempSocket.close();
            resolve(device);
        });

        tempSocket.onError((err) => {
            console.error(`TCP 连接到 ${ipAddress}:${port} 发生错误 (ping):`, err);
            tempSocket.close();
            reject(err);
        });

        tempSocket.onClose(() => {
            console.log(`TCP 连接到 ${ipAddress}:${port} 已关闭 (ping)`);
            if (!connected) {
                reject(new Error('连接失败'));
            }
        });

        // 设置超时时间
        setTimeout(() => {
            if (!connected) {
                console.log(`TCP 连接到 ${ipAddress}:${port} 超时 (ping)`);
                tempSocket.close();
                reject(new Error('连接超时'));
            }
        }, 5000); // 5秒超时
    });
}

function connectDevice(device) {
    return new Promise((resolve, reject) => {
        // 检查设备信息是否完整
        if (!device || !device.ip || !device.port) {
            reject(new Error('设备信息不完整 (IP 和端口必须提供)'));
            return;
        }

        // 获取应用实例
        const app = getApp();
        if (!app || !app.globalData) {
            reject(new Error('应用实例未初始化'));
            return;
        }

        // 检查是否已经连接到设备
        if (app.globalData.deviceConnected && app.globalData.deviceInfo && app.globalData.deviceInfo.ip === device.ip && app.globalData.deviceInfo.port === device.port) {
            console.log('设备已连接，无需重复连接');
            resolve(app.globalData.deviceInfo);
            return;
        }

        // 显示加载提示
        wx.showLoading({
            title: '正在连接...'
        });

        // 创建新的 TCP Socket
        currentSocket = wx.createTCPSocket(); // 保存 socket 实例
        let isResolved = false; // 防止多次 resolve/reject
        let connectionConfirmed = false; // 标记连接是否已确认
        let timeoutId = null; // 超时ID
        let receivedInitialData = false; // 标记是否收到初始数据

        // 定义清理函数，用于清理socket和状态
        const cleanup = (error) => {
            if (isResolved) return; // 避免多次执行
            isResolved = true;

            clearTimeout(timeoutId); // 清除超时
            wx.hideLoading();

            // 移除所有事件监听器
            if (currentSocket) { // 确保 socket 存在
                currentSocket.offConnect();
                currentSocket.offError();
                currentSocket.offClose();
                currentSocket.offMessage();

                try {
                    currentSocket.close(); // 尝试关闭socket
                } catch (e) {
                    console.warn("关闭socket时发生错误:", e);
                }
            }
            currentSocket = null; // 清空全局 socket 实例

            // 根据是否有错误来resolve或reject
            if (error) {
                wx.showToast({
                    title: '连接失败',
                    icon: 'error',
                    duration: 2000
                });
                reject(error);
            } else {
                resolve(device); // Resolve with the original device object
            }
        };

        // 定义错误处理函数
        const handleError = (err) => {
            console.error(`TCP 连接到 ${device.ip}:${device.port} 发生错误:`, err);
            cleanup(err); // 先清理，再处理错误
        };

        // 连接成功的回调函数
        currentSocket.onConnect(() => {
            console.log(`TCP 连接到 ${device.ip}:${device.port} 成功`);

            // 设置消息监听器
            currentSocket.onMessage(handleMessage);
        });

        // 连接错误的回调函数
        currentSocket.onError(handleError);

        currentSocket.onClose(() => {
            console.log(`TCP 连接到 ${device.ip}:${device.port} 已关闭`);
            if (app.globalData.deviceConnected) {
                // 如果是意外断开，需要处理
                app.globalData.deviceConnected = false;
                app.globalData.deviceInfo = null;
                wx.showToast({
                    title: '设备已断开连接',
                    icon: 'none',
                    duration: 2000
                });
            }
        });

        // 连接到设备
        currentSocket.connect({
            address: device.ip,
            port: device.port
        });

        // 定义消息处理函数
        const handleMessage = (result) => {
            let message = '';
            const uintArray = new Uint8Array(result.message);
            message = String.fromCharCode.apply(null, uintArray);

            console.log(`接收到来自 ${device.ip} 的消息:`, message);

            // 如果尚未收到初始数据，则处理数据并确认连接
            if (!receivedInitialData) {
                // 尝试处理数据
                try {
                    processData(message); // 尝试处理数据
                    console.log('设备连接成功确认');
                    receivedInitialData = true;
                    connectionConfirmed = true;

                    wx.hideLoading();
                    wx.showToast({
                        title: '连接成功',
                        icon: 'success',
                        duration: 2000
                    });

                    // 创建连接设备的信息对象
                    const connectedDevice = {
                        id: device.id,
                        name: device.name,
                        ip: device.ip,
                        port: device.port,
                        sessionId: '01', // 假设设备不返回 sessionId
                        isSimulated: false
                    };

                    // 更新全局数据
                    app.globalData.deviceConnected = true;
                    app.globalData.deviceInfo = connectedDevice;
                    app.globalData.simulationMode = false;

                    // 开始监听数据
                    startListeningForData(currentSocket); // 使用全局 socket 实例
                } catch (error) {
                    console.error('处理初始数据失败:', error);
                    cleanup(new Error('处理初始数据失败')); // 连接失败
                }
            } else {
                // 连接确认后处理数据
                processData(message);
            }
        };

        // 设置超时时间，如果在 60 秒内没有收到任何数据，则认为连接失败
        timeoutId = setTimeout(() => {
            cleanup(new Error('连接超时'));
        }, 60000); // 60秒超时
    });
}

// 断开设备连接
function disconnectDevice() {
    return new Promise((resolve, reject) => {
        const currentApp = getApp();
        if (!currentApp || !currentApp.globalData) {
            console.log('应用实例未初始化');
            resolve(true);
            return;
        }

        if (!currentApp.globalData.deviceConnected || !currentApp.globalData.deviceInfo) {
            resolve(true);
            return;
        }

        // 停止数据轮询
        if (dataPollingInterval) {
            clearInterval(dataPollingInterval);
            dataPollingInterval = null;
        }

        // 检查是否在开发者工具中或处于模拟模式
        const systemInfo = wx.getSystemInfoSync();
        const isDevTools = systemInfo.platform === 'devtools';
        const isSimulation = currentApp.globalData.simulationMode;

        if (isDevTools || isSimulation) {
            // 在开发环境或模拟模式下，直接模拟断开连接
            console.log('开发环境或模拟模式：模拟断开设备连接');
            currentApp.globalData.deviceConnected = false;
            currentApp.globalData.deviceInfo = null;
            resolve(true);
            return;
        }

        // 实际环境中的断开连接逻辑
        if (currentSocket) { // 使用全局 socket 实例
            // 移除所有事件监听器
            currentSocket.offConnect();
            currentSocket.offError();
            currentSocket.offClose();
            currentSocket.offMessage();

            try {
                currentSocket.close(); // 尝试关闭socket
            } catch (e) {
                console.warn("关闭socket时发生错误:", e);
            }
            currentSocket = null; // 清空全局 socket 实例
        }

        // 重置全局状态
        currentApp.globalData.deviceConnected = false;
        currentApp.globalData.deviceInfo = null;
        resolve(true);
    });
}

// 获取脉搏数据 (供监测页面调用)
function getPulseData() {
    return new Promise((resolve, reject) => {
        const app = getApp();

        if (app.globalData.simulationMode) {
            console.log("当前处于模拟模式");
        } else {
            // 返回最近一次获取的数据
            if (app.globalData.latestPulseData) {
                resolve(app.globalData.latestPulseData);
            } else {
                // 如果没有数据，尝试获取一次
                reject(new Error('没有可用的脉搏数据'));
            }
        }
    });
}

// 手动添加设备 (通过IP地址) - 按照自动搜索设备的逻辑
function addDeviceByIP(ipAddress, port = 80) {
    return new Promise((resolve, reject) => {
        // 验证 IP 地址是否为空
        if (!ipAddress) {
            reject(new Error('IP地址不能为空'));
            return;
        }

        // 验证 IP 地址格式是否正确
        const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const isValidIp = ipPattern.test(ipAddress) && ipAddress.split('.').every(part => parseInt(part) <= 255);

        if (!isValidIp) {
            reject(new Error('IP地址格式不正确'));
            return;
        }

        const app = getApp();
        if (!app || !app.globalData) {
            reject(new Error('应用实例未初始化'));
            return;
        }

        // 检查是否已经添加过该设备
        if (app.globalData.deviceInfo && app.globalData.deviceInfo.ip === ipAddress && app.globalData.deviceInfo.port === port) {
            console.log('设备已添加，无需重复添加');
            resolve(app.globalData.deviceInfo);
            return;
        }

        wx.showLoading({
            title: '添加设备中...'
        });

        // 使用 pingDevice 来验证设备是否存在
        pingDevice(ipAddress, port)
            .then((device) => {
                // 设备存在，创建设备信息对象
                // const device = { // pingDevice 已经返回了 device 对象
                //   id: `pulse_${ipAddress.replace(/\./g, '_')}`,
                //   name: `脉搏监测设备 (${ipAddress})`,
                //   ip: ipAddress,
                //   port: port,
                //   type: 'pulseMonitor',
                //   status: 'available',
                //   isSimulated: false // 假设是真实设备
                // };

                console.log('已添加设备 (通过IP):', device);
                wx.hideLoading();
                resolve(device); // 返回设备信息

                //尝试连接设备
                connectDevice(device).catch(err => {
                    console.error("连接设备失败：", err);
                    //这里可以根据实际情况处理连接失败的情况，例如显示错误信息
                });

            })
            .catch(err => {
                // 设备不存在
                wx.hideLoading();
                console.error('设备添加失败:', err);
                reject(new Error('设备无法访问'));
            });
    });
}

// 处理接收到的数据
function processData(data) {
    try {
        let remainingData = data;

        while (remainingData.length > 0) {
            const endIndex = remainingData.indexOf('#1000');

            if (endIndex > -1) {
                const dataPointsString = remainingData.substring(0, endIndex);
                const dataPoints = dataPointsString.split('#');

                console.log('通道数据字符串:', dataPointsString);
                console.log('通道数据数组:', dataPoints);

                if (dataPoints.length === 3) {
                    // 解析三个通道的数据
                    const rawChannel1 = parseInt(dataPoints[0]);
                    const rawChannel2 = parseInt(dataPoints[1]);
                    const rawChannel3 = parseInt(dataPoints[2]);

                    if (isNaN(rawChannel1) || isNaN(rawChannel2) || isNaN(rawChannel3)) {
                        console.warn('解析通道数据失败，使用默认值或忽略');
                        remainingData = remainingData.substring(endIndex + 5);
                        continue;
                    }

                    // 校准数据
                    const calibratedData = calibrateData({
                        channel1: rawChannel1,
                        channel2: rawChannel2,
                        channel3: rawChannel3
                    });

                    const app = getApp();
                    if (app && app.globalData) {
                        app.globalData.latestPulseData = {
                            timestamp: Date.now(),
                            channels: calibratedData,
                            rawChannels: {
                                channel1: rawChannel1,
                                channel2: rawChannel2,
                                channel3: rawChannel3
                            },
                            isSimulated: false
                        };
                    } else {
                        console.error('应用实例未初始化，无法更新全局数据');
                    }
                } else {
                    console.warn('通道数据数量不正确，期望3个通道');
                }

                remainingData = remainingData.substring(endIndex + 5);
            } else {
                console.warn('未找到数据结束标志 #1000');
                remainingData = "";
            }
        }
    } catch (error) {
        console.error('处理数据失败:', error);
        throw error; // 抛出错误，以便 `handleMessage` 函数可以捕获它
    }
}

// 校准数据函数
function calibrateData(rawChannels) {
    // 获取校准参数
    const app = getApp();
    const calibrationSettings = app && app.globalData && app.globalData.calibrationSettings;

    // 默认校准参数 - 减少偏大值
    const defaultCalibration = {
        channel1: { offset: -15, scale: 0.85 }, // 脉搏率校准：减少偏大值
        channel2: { offset: 0, scale: 1.0 },   // 血氧校准：通常不需要太多调整
        channel3: { offset: 0, scale: 1.0 }    // 温度校准：通常不需要太多调整
    };

    // 使用用户设置或默认值
    const calibration = calibrationSettings || defaultCalibration;

    // 应用校准公式: 校准值 = 原始值 × 缩放系数 + 偏移量
    return {
        channel1: Math.round(rawChannels.channel1 * calibration.channel1.scale + calibration.channel1.offset),
        channel2: Math.round(rawChannels.channel2 * calibration.channel2.scale + calibration.channel2.offset),
        channel3: Math.round(rawChannels.channel3 * calibration.channel3.scale + calibration.channel3.offset)
    };
}

// 开始监听数据
function startListeningForData(socket) { // 移到 connectDevice 函数外部
    if (!socket) {
        console.warn("Socket is null, cannot start listening for data.");
        return;
    }
    socket.onMessage((result) => {
        const uintArray = new Uint8Array(result.message);
        const message = String.fromCharCode.apply(null, uintArray);
        console.log("接收到的消息：" + message);
        try {
            processData(message);
        } catch (error) {
            console.error("处理数据时发生错误:", error);
            // 可以选择断开连接或采取其他措施
        }
    });
}

// 生成模拟脉搏数据，基于正弦波加随机变化
function generateMockPulseData(baseValue, variability) {
    // 获取当前时间，用于生成波形
    const now = Date.now();

    // 使用时间来模拟心跳频率
    const frequency = 1.2; // 心跳频率 (约70-75bpm)
    const time = now / 1000; // 转换为秒

    // 生成主波和第二次谐波，加入随机变化
    const mainWave = Math.sin(time * frequency * Math.PI);
    const secondHarmonic = 0.3 * Math.sin(time * frequency * 2 * Math.PI); // 添加第二谐波
    const randomVariation = (Math.random() * variability * 2 - variability) / 10; // 随机变化

    // 合成波形并添加基准值
    const pulse = baseValue + (mainWave + secondHarmonic + randomVariation) * variability;

    // 返回四舍五入后的值
    return Math.round(pulse);
}

// 检查网络状态
function checkNetworkStatus() {
    return new Promise((resolve, reject) => {
        // 检查是否在开发者工具中
        const systemInfo = wx.getSystemInfoSync();
        const isDevTools = systemInfo.platform === 'devtools';

        wx.getNetworkType({
            success: (res) => {
                const app = getApp();
                if (res.networkType === 'wifi') {
                    if (isDevTools) {
                        // 在开发者工具中直接返回模拟数据
                        console.log('开发环境：模拟WiFi连接');
                        if (app && app.globalData) {
                            app.globalData.currentNetworkId = '开发环境WiFi';
                        }
                        resolve({
                            type: 'wifi',
                            connected: true,
                            name: '开发环境WiFi',
                            signalStrength: 100,
                            frequency: '2.4GHz',
                            isSimulated: true
                        });
                        return;
                    }

                    // 真机环境才调用getConnectedWifi
                    wx.startWifi({ // 尝试启动 WiFi
                        success: () => {
                            wx.getConnectedWifi({
                                success: (wifiInfo) => {
                                    if (app && app.globalData) {
                                        app.globalData.currentNetworkId = wifiInfo.wifi.SSID;
                                    }
                                    resolve({
                                        type: 'wifi',
                                        name: wifiInfo.wifi.SSID,
                                        connected: true,
                                        signalStrength: wifiInfo.wifi.signalStrength || 100,
                                        frequency: wifiInfo.wifi.frequency || '2.4GHz',
                                        isSimulated: false
                                    });
                                },
                                fail: (err) => {
                                    console.log('获取WiFi信息失败:', err);
                                    // WiFi API调用失败时的降级处理
                                    resolve({
                                        type: 'wifi',
                                        connected: true,
                                        name: '未知WiFi',
                                        signalStrength: 0,
                                        frequency: 'unknown',
                                        isSimulated: true,
                                        error: err.errMsg
                                    });
                                }
                            });
                        },
                        fail: (err) => {
                            console.error('启动 WiFi 失败:', err);
                            resolve({
                                type: 'wifi',
                                connected: false,
                                name: 'WiFi 未启动',
                                signalStrength: 0,
                                frequency: 'unknown',
                                isSimulated: true,
                                error: err.errMsg
                            });
                        }
                    });
                } else {
                    // 非WiFi网络
                    resolve({
                        type: res.networkType,
                        connected: res.networkType !== 'none',
                        name: res.networkType,
                        isSimulated: false
                    });
                }
            },
            fail: (err) => {
                console.error('获取网络状态失败:', err);
                // 返回默认网络状态
                resolve({
                    type: 'unknown',
                    connected: false,
                    name: '未知网络',
                    isSimulated: true,
                    error: err.errMsg
                });
            }
        });
    });
}

// 获取网络状态图标
function getNetworkIcon(networkInfo) {
    if (!networkInfo || !networkInfo.connected) {
        return ICONS.NETWORK.DISCONNECTED;
    }

    if (networkInfo.type === 'wifi') {
        // 根据信号强度返回不同的WiFi图标
        const strength = networkInfo.signalStrength || 0;
        if (strength > 70) {
            return ICONS.NETWORK.WIFI_STRONG;
        } else if (strength > 40) {
            return ICONS.NETWORK.WIFI_MEDIUM;
        } else {
            return ICONS.NETWORK.WIFI_WEAK;
        }
    } else {
        return ICONS.NETWORK.MOBILE;
    }
}

// 获取设备状态图标
function getDeviceIcon(isConnected, isSimulation) {
    if (isSimulation) {
        return ICONS.DEVICE.SIMULATION;
    }
    return isConnected ? ICONS.DEVICE.CONNECTED : ICONS.DEVICE.DISCONNECTED;
}

// 获取连接状态图标
function getConnectionIcon(connectionStatus) {
    switch (connectionStatus) {
        case 'success':
            return ICONS.CONNECTION.SUCCESS;
        case 'failed':
            return ICONS.CONNECTION.FAILED;
        case 'pending':
            return ICONS.CONNECTION.PENDING;
        case 'unstable':
            return ICONS.CONNECTION.UNSTABLE;
        default:
            return ICONS.CONNECTION.FAILED;
    }
}

module.exports = {
    init, // 新增方法
    getDeviceInfo, // 新增方法
    searchDevices,
    addDeviceByIP,
    connectDevice,
    disconnectDevice,
    getPulseData,
    checkNetworkStatus,
    // 图标相关
    ICONS,
    getNetworkIcon,
    getDeviceIcon,
    getConnectionIcon,
    // 模拟数据生成器
    generateMockPulseData
};
