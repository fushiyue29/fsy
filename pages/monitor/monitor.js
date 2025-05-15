const app = getApp()
const deviceManager = require('../../utils/deviceManager')
const dataManager = require('../../utils/dataManager')

// 模拟脉搏数据生成函数 (仅在没有设备连接时使用)
function generatePulseData(baseValue, variability) {
    return Math.floor(baseValue + (Math.random() * variability * 2) - variability)
}

// 模拟生成一组脉搏数据点
function generateDataPoints(count, baseValue, variability) {
    const data = []
    for (let i = 0; i < count; i++) {
        data.push(generatePulseData(baseValue, variability))
    }
    return data
}

// 生成脉冲波形数据，更平滑的曲线波形
function generateWaveformData(baseValue, amplitude, count) {
    const data = []
    // 使用更长的波长以创建更平滑的曲线
    const wavelength = Math.floor(count / 2)

    // 增加默认振幅，使波形更加明显
    amplitude = amplitude || baseValue * 0.3

    // 生成基础的正弦波
    for (let i = 0; i < count; i++) {
        // 使用正弦函数生成基础波形
        const x = (i % wavelength) / wavelength * 2 * Math.PI
        // 增加振幅倍数，使波形更高
        let value = baseValue + amplitude * Math.sin(x) * 1.2

        // 添加轻微的噪声，但保持曲线平滑
        const noise = (Math.random() - 0.5) * (amplitude * 0.1)
        value += noise

        // 使波形在不同阶段有不同特性
        if (i % wavelength < wavelength * 0.3) {
            // 波峰区域增强
            value += amplitude * 0.15
        } else if (i % wavelength > wavelength * 0.7) {
            // 波谷区域增强
            value -= amplitude * 0.1
        }

        data.push(Math.round(value))
    }

    return data
}

Page({
    data: {
        deviceConnected: false,
        monitoring: false,
        recording: false,
        currentView: 'realtime', // realtime 或 analysis
        channels: {
            channel1: {
                name: '通道1',
                active: true,
                color: '#ff4081',
                currentValue: 0,
                data: [],
                average: 0,
                min: 0,
                max: 0,
                baseValue: 70, // 基准值
                safeRange: { min: 60, max: 100 }, // 脉搏安全范围
                unit: '次/分',
                historyData: [] // 新增：历史数据
            },
            channel2: {
                name: '通道2',
                active: true,
                color: '#4caf50',
                currentValue: 0,
                data: [],
                average: 0,
                min: 0,
                max: 0,
                baseValue: 65, // 基准值
                safeRange: { min: 55, max: 90 }, // 脉搏安全范围
                unit: '次/分',
                historyData: [] // 新增：历史数据
            },
            channel3: {
                name: '通道3',
                active: true,
                color: '#2196f3',
                currentValue: 0,
                data: [],
                average: 0,
                min: 0,
                max: 0,
                baseValue: 75, // 基准值
                safeRange: { min: 65, max: 95 }, // 脉搏安全范围
                unit: '次/分',
                historyData: [] // 新增：历史数据
            }
        },
        maxDataPoints: 200, // 最大数据点数量
        dataPoints: 100, // 图表中显示的数据点数量
        updateInterval: 500, // 数据更新间隔（毫秒）
        recordStartTime: '', // 记录开始时间
        recordDuration: 0, // 记录持续时间（秒）
        errorMsg: '',
        simulationMode: false, // 模拟模式标志
        contentHeight: 0,
        lastScrollTop: 0,
        scrollThreshold: 20,
        tabBarVisible: true
    },

    updateTimer: null, // 数据更新定时器
    recordTimer: null, // 记录时间定时器
    currentRecord: null, // 当前记录
    tabBarInstance: null, // 存储TabBar实例

    onLoad: function () {
        // 计算内容区域高度
        this.calculateContentHeight()

        // 获取TabBar实例
        if (typeof this.getTabBar === 'function') {
            this.tabBarInstance = this.getTabBar()
        }

        // 检查是否处于模拟模式
        this.setData({
            simulationMode: app.globalData.simulationMode
        })

        // 初始化通道数据
        this._initChannelData()
    },

    onShow: function () {
        // 设置TabBar选中状态
        if (this.tabBarInstance) {
            this.tabBarInstance.setData({
                selected: 2
            })
        }

        // 重新计算内容高度
        this.calculateContentHeight()

        // 确保TabBar可见
        this.showTabBar()

        // 获取设备连接状态
        this.setData({
            deviceConnected: app.globalData.deviceConnected,
            simulationMode: app.globalData.simulationMode
        })

        // 如果设备已连接或模拟模式，自动开始监测
        if (this.data.deviceConnected && !this.data.monitoring) { // 修改：仅在设备连接时自动开始监测
            this.startMonitoring()
        }
    },

    onHide: function () {
        // 页面隐藏时停止监测和记录
        this.stopMonitoring()
    },

    onUnload: function () {
        // 页面卸载时清除定时器
        this._clearTimers()
    },

    _initChannelData: function () {
        // 初始化每个通道的数据数组
        const channels = this.data.channels
        const dataPoints = this.data.dataPoints

        // for (let key in channels) {
        //     // 生成初始波形数据而不是空数据
        //     const baseValue = channels[key].baseValue
        //     const amplitude = 15 // 波形振幅
        //     channels[key].data = generateWaveformData(baseValue, amplitude, dataPoints)
        // }

        this.setData({ channels }, () => {
            // 初始化后绘制波形
            this._drawWaveforms()
        })
    },

    // 绘制波形图的函数
    _drawWaveforms: function () {
        const channels = this.data.channels;

        // 绘制每个活跃通道的波形
        if (channels.channel1.active) {
            this._drawSingleWaveform('waveform-canvas-1', channels.channel1);
        }

        if (channels.channel2.active) {
            this._drawSingleWaveform('waveform-canvas-2', channels.channel2);
        }

        if (channels.channel3.active) {
            this._drawSingleWaveform('waveform-canvas-3', channels.channel3);
        }
    },

    // 绘制单个通道的波形
    _drawSingleWaveform: function (canvasId, channelData) {
      const ctx = wx.createCanvasContext(canvasId, this);
      const data = channelData.historyData;
  
      if (!data || data.length === 0) return;
  
      // 获取Canvas尺寸
      const query = wx.createSelectorQuery();
      query.select('#' + canvasId).boundingClientRect();
      query.exec((res) => {
          // 如果无法获取尺寸，使用默认值
          const width = (res && res[0] && res[0].width) || 300;
          const height = (res && res[0] && res[0].height) || 150;
  
          // 清空画布
          ctx.clearRect(0, 0, width, height);
  
          // 设置波形线样式
          ctx.setLineWidth(1.5);
          ctx.setStrokeStyle(channelData.color);
          ctx.setLineCap('round');
          ctx.setLineJoin('round');
  
          // 计算缩放因子
          const maxValue = Math.max(...data);
          const minValue = Math.min(...data);
          const valueRange = maxValue - minValue;
          const paddingPercent = 0.1; // 上下各预留10%的空间
          const paddingPixels = height * paddingPercent;
  
          // 计算缩放因子，使波形垂直居中并有适当的边距
          const scaledHeight = (height - (paddingPixels * 2)) / valueRange;
  
          // 计算X轴步长，实现滚动效果
          const xStep = width / (data.length - 1);
  
          // 开始绘制路径
          ctx.beginPath();
  
          // 绘制波形线
          data.forEach((value, index) => {
              // 计算坐标，使波形垂直居中并有适当的边距
              const x = index * xStep;
              const y = height - paddingPixels - ((value - minValue) * scaledHeight);
  
              if (index === 0) {
                  ctx.moveTo(x, y);
              } else {
                  ctx.lineTo(x, y);
              }
          });
  
          // 绘制线条
          ctx.stroke();
  
          // 应用变更
          ctx.draw();
      });
  },
  

    startMonitoring: function () {
        if (!this.data.deviceConnected) { // 修改：仅在设备连接时才允许开始监测
            this.setData({
                errorMsg: '请先连接设备'
            })
            return
        }

        this.setData({
            monitoring: true,
            errorMsg: ''
        })

        // 启动数据更新定时器
        this.updateTimer = setInterval(() => {
            this._fetchDeviceData()
        }, this.data.updateInterval)
    },

    _fetchDeviceData: function () {
      // 从设备管理器获取数据
      deviceManager.getPulseData().then(pulseData => {
          // 确认 pulseData 的结构
          console.log("从 deviceManager.getPulseData() 接收到的数据:", pulseData);
  
          // 安全地访问 pulseData 的属性
          if (pulseData && pulseData.channels && typeof pulseData.channels === 'object' && pulseData.channels.channel1) {
              console.log("页面中接收到的 channel1 数据为:", pulseData.channels.channel1);
              console.log("页面中接收到的 channel2 数据为:", pulseData.channels.channel2);
              console.log("页面中接收到的 channel3 数据为:", pulseData.channels.channel3);
              //console.log("页面中接收到的 channel1 数据为:", pulseData.channels.channel1);
          } else {
              console.warn("pulseData 结构不符合预期，无法访问 channel1.channelData");
          }
  
          this._handlePulseData(pulseData);
      }).catch(err => {
          console.error('获取脉搏数据失败:', err);
          this.setData({
              errorMsg: '获取脉搏数据失败' // 显示错误信息
          });
          //  this._updateChannelData(); // 移除：不再使用模拟数据作为回退
      });
  
      // 在数据更新后重绘波形
      this._drawWaveforms()
  },
  

    stopMonitoring: function () {
        // 停止监测和记录
        if (this.data.recording) {
            this.stopRecording()
        }

        this._clearTimers()

        this.setData({
            monitoring: false
        })
    },

    toggleChannel: function (e) {
        const channelKey = e.currentTarget.dataset.channel
        const channelActive = `channels.${channelKey}.active`

        this.setData({
            [channelActive]: !this.data.channels[channelKey].active
        }, () => {
            // 重绘波形
            this._drawWaveforms()
        })
    },

    switchView: function (e) {
        const view = e.currentTarget.dataset.view
        this.setData({
            currentView: view
        })
    },

    startRecording: function () {
        if (!this.data.monitoring) {
            this.startMonitoring()
        }

        try {
            // 使用数据管理器开始新记录
            this.currentRecord = dataManager.startNewRecord()

            const now = new Date()

            this.setData({
                recording: true,
                recordStartTime: this._formatTime(now),
                recordDuration: 0
            })

            // 更新记录时间
            this.recordTimer = setInterval(() => {
                this.setData({
                    recordDuration: this.data.recordDuration + 1
                })
            }, 1000)
        } catch (error) {
            console.error('开始记录失败:', error)
            wx.showToast({
                title: '开始记录失败',
                icon: 'none'
            })
        }
    },

    stopRecording: function () {
        if (this.recordTimer) {
            clearInterval(this.recordTimer)
            this.recordTimer = null
        }

        // 使用数据管理器完成记录
        if (this.currentRecord) {
            try {
                const savedRecord = dataManager.finishCurrentRecord()
                this.currentRecord = null

                if (savedRecord) {
                    console.log('记录已保存:', savedRecord.id)

                    wx.showToast({
                        title: '记录已保存',
                        icon: 'success'
                    })
                }
            } catch (error) {
                console.error('保存记录失败:', error)
                wx.showToast({
                    title: '保存记录失败',
                    icon: 'none'
                })
                this.currentRecord = null
            }
        }

        this.setData({
            recording: false
        })
    },

    _handlePulseData: function (pulseData) {
        // 处理来自设备的脉搏数据
        if (!pulseData) {
            return;
        }

        const channels = this.data.channels;

        // 转换数据格式，兼容数组和对象格式
        const channelData = {};

        // 处理数组格式 [{id: 'channel1', currentValue: 70}, ...]
        if (pulseData.channels && Array.isArray(pulseData.channels)) {
            pulseData.channels.forEach(ch => {
                if (ch && ch.id && ch.currentValue !== undefined) {
                    channelData[ch.id] = ch.currentValue;
                }
            });
        }
        // 处理对象格式 {channel1: 70, channel2: 65, ...}
        else if (pulseData.channels && typeof pulseData.channels === 'object') {
            Object.assign(channelData, pulseData.channels);
        }

        // 更新每个通道的数据
        for (let key in channels) {
            if (channels[key].active && channelData[key] !== undefined) {
                const newValue = channelData[key];

                // 更新当前值
                channels[key].currentValue = newValue;
                // 更新历史数据
                channels[key].historyData.push(newValue);
                if (channels[key].historyData.length > this.data.maxDataPoints) {
                  channels[key].historyData.shift(); // 移除最旧的数据
                }
                // 更新波形数据（使用更真实的波形生成方法）
                const baseValue = newValue; // 使用新值作为基准
                const amplitude = newValue * 0.3; // 增加波幅为基准值的30%
                const newDataPoints = 15; // 增加每次更新的数据点数量
                const newWaveformData = generateWaveformData(baseValue, amplitude, newDataPoints);

                // 只移除前面的一部分点，添加新生成的波形
                channels[key].data = [...channels[key].data.slice(newDataPoints), ...newWaveformData];

                // 检查是否在安全范围内
                channels[key].isInSafeRange = (
                    newValue >= channels[key].safeRange.min &&
                    newValue <= channels[key].safeRange.max
                );

                // 更新全局数据
                if (app.globalData.pulseData[key]) {
                    app.globalData.pulseData[key].push(newValue);

                    // 保持数据量合理
                    if (app.globalData.pulseData[key].length > 1000) {
                        app.globalData.pulseData[key] = app.globalData.pulseData[key].slice(-1000);
                    }
                }
            }
        }

        this.setData({ channels });

        // 如果正在记录，更新统计数据
        if (this.data.recording && this.currentRecord) {
            try {
                // 将数据转换为与dataManager兼容的格式
                const recordData = {
                    timestamp: pulseData.timestamp || Date.now(),
                    channels: channelData
                };

                dataManager.updateCurrentRecord(recordData);
                this._updateStatistics();
            } catch (error) {
                console.error('更新记录数据失败:', error);
            }
        }
    },

    // _updateChannelData: function () {
    //     // 使用模拟数据
    //     // 创建模拟数据
    //     const mockPulseData = {
    //         timestamp: Date.now(),
    //         channels: {}
    //     }

    //     const channels = this.data.channels

    //     // 生成每个通道的模拟数据
    //     for (let key in channels) {
    //         if (channels[key].active) {
    //             let baseValue = channels[key].baseValue;
    //             let variability = 0;

    //             // 为不同通道设置不同的变化范围
    //             if (key === 'channel1') {
    //                 variability = 8; // 增加变化范围
    //             } else if (key === 'channel2') {
    //                 variability = 10; // 增加变化范围
    //             } else if (key === 'channel3') {
    //                 variability = 6; // 增加变化范围
    //             }

    //             mockPulseData.channels[key] = generatePulseData(baseValue, variability);
    //         }
    //     }

    //     // 处理模拟数据
    //     this._handlePulseData(mockPulseData);
    // },

    _updateStatistics: function () {
        try {
            const channels = this.data.channels

            // 从当前记录中获取统计数据
            if (this.currentRecord) {
                for (let key in channels) {
                    if (channels[key].active && this.currentRecord.channels[key]) {
                        channels[key].average = this.currentRecord.channels[key].average
                        channels[key].min = this.currentRecord.channels[key].min
                        channels[key].max = this.currentRecord.channels[key].max
                    }
                }

                this.setData({ channels })
            }
        } catch (error) {
            console.error('更新统计数据失败:', error)
        }
    },

    navigateToDevice: function () {
        wx.switchTab({
            url: '/pages/device/device'
        })
    },

    _formatTime: function (date) {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const hour = date.getHours()
        const minute = date.getMinutes()
        const second = date.getSeconds()

        return [year, month, day].map(this._formatNumber).join('/') + ' ' +
            [hour, minute, second].map(this._formatNumber).join(':')
    },

    _formatNumber: function (n) {
        n = n.toString()
        return n[1] ? n : '0' + n
    },

    _clearTimers: function () {
        if (this.updateTimer) {
            clearInterval(this.updateTimer)
            this.updateTimer = null
        }

        if (this.recordTimer) {
            clearInterval(this.recordTimer)
            this.recordTimer = null
        }
    },

    // 格式化记录时间
    formatDuration: function (seconds) {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60

        return [hours, minutes, secs].map(this._formatNumber).join(':')
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
