const app = getApp()
const dataManager = require('../../utils/dataManager')

Page({
    data: {
        recordList: [],
        currentRecord: null,
        showRecordDetail: false,
        dateRange: {
            start: '',
            end: ''
        },
        isLoading: true,
        isEmpty: false,
        fontLoaded: false,
        contentHeight: 0,  // 内容区域高度
        scrollIntoView: '', // 滚动定位ID
        lastScrollTop: 0,   // 上次滚动位置
        scrollDirection: 'up', // 滚动方向
        tabBarVisible: true,    // TabBar是否可见
        scrollThreshold: 20     // 滚动阈值
    },

    onLoad: function () {
        // 获取近7天的日期范围
        this.setDefaultDateRange()

        // 计算内容区域高度
        this.calculateContentHeight()

        // 设置字体加载状态
        if (app.globalData && app.globalData.fontLoaded) {
            this.setData({
                fontLoaded: app.globalData.fontLoaded
            })
        }

        // 获取TabBar实例
        this.tabBarInstance = null;
        if (typeof this.getTabBar === 'function') {
            this.tabBarInstance = this.getTabBar();
        }
    },

    onShow: function () {
        // 设置TabBar选中状态
        if (this.tabBarInstance) {
            this.tabBarInstance.setData({
                selected: 3
            })
        } else if (typeof this.getTabBar === 'function') {
            this.tabBarInstance = this.getTabBar();
            if (this.tabBarInstance) {
                this.tabBarInstance.setData({
                    selected: 3
                })
            }
        }

        // 加载记录数据
        this.loadRecordData()

        // 重新计算内容高度，以应对可能的旋转或其他变化
        this.calculateContentHeight()

        // 重置TabBar可见性
        this.showTabBar();
    },

    setDefaultDateRange: function () {
        // 如果全局变量中有近期记录的过滤条件，使用它
        if (app.globalData.recentRecords && app.globalData.recentRecords.filter) {
            this.setData({
                'dateRange.start': app.globalData.recentRecords.filter.startDate,
                'dateRange.end': app.globalData.recentRecords.filter.endDate
            });
            return;
        }

        // 否则使用默认的7天范围
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);

        this.setData({
            'dateRange.start': this._formatDate(start),
            'dateRange.end': this._formatDate(end)
        });
    },

    startDateChange: function (e) {
        this.setData({
            'dateRange.start': e.detail.value
        })
        this.loadRecordData()
    },

    endDateChange: function (e) {
        this.setData({
            'dateRange.end': e.detail.value
        })
        this.loadRecordData()
    },

    loadRecordData: function () {
        this.setData({
            isLoading: true,
            isEmpty: false
        });

        // 使用数据管理器获取记录
        setTimeout(() => {
            const filter = {
                startDate: this.data.dateRange.start,
                endDate: this.data.dateRange.end
            };

            try {
                const records = dataManager.getRecords(filter);

                // 更新全局变量，保持首页和历史页面同步
                app.globalData.recentRecords = {
                    count: records.length,
                    date: new Date(),
                    filter: filter
                };

                this.setData({
                    recordList: records,
                    isLoading: false,
                    isEmpty: records.length === 0
                });
            } catch (error) {
                console.error('获取记录失败:', error);
                this.setData({
                    recordList: [],
                    isLoading: false,
                    isEmpty: true
                });

                wx.showToast({
                    title: '加载失败',
                    icon: 'none'
                });
            }
        }, 500); // 短暂延迟以显示加载状态
    },

    viewRecordDetail: function (e) {
        const recordId = e.currentTarget.dataset.id

        try {
            const record = dataManager.getRecordDetail(recordId)

            if (record) {
                this.setData({
                    currentRecord: record,
                    showRecordDetail: true
                })
            } else {
                wx.showToast({
                    title: '记录不存在',
                    icon: 'none'
                })
            }
        } catch (error) {
            console.error('获取记录详情失败:', error)
            wx.showToast({
                title: '获取详情失败',
                icon: 'none'
            })
        }
    },

    closeRecordDetail: function () {
        this.setData({
            showRecordDetail: false
        })
    },

    deleteRecord: function (e) {
        const recordId = e.currentTarget.dataset.id

        wx.showModal({
            title: '删除记录',
            content: '确定要删除这条记录吗？此操作不可撤销。',
            success: (res) => {
                if (res.confirm) {
                    try {
                        // 使用数据管理器删除记录
                        const success = dataManager.deleteRecord(recordId)

                        if (success) {
                            // 刷新记录列表
                            this.loadRecordData()

                            // 如果当前正在查看的详情就是被删除的记录，则关闭详情
                            if (this.data.currentRecord && this.data.currentRecord.id === recordId) {
                                this.setData({
                                    showRecordDetail: false
                                })
                            }

                            // 更新全局变量中的记录数
                            if (app.globalData.recentRecords) {
                                // 获取最新记录数
                                const filter = {
                                    startDate: this.data.dateRange.start,
                                    endDate: this.data.dateRange.end
                                };
                                const records = dataManager.getRecords(filter);

                                app.globalData.recentRecords = {
                                    count: records.length,
                                    date: new Date(),
                                    filter: filter
                                };
                            }

                            wx.showToast({
                                title: '删除成功',
                                icon: 'success'
                            })
                        }
                    } catch (error) {
                        console.error('删除记录失败:', error)
                        wx.showToast({
                            title: '删除失败',
                            icon: 'none'
                        })
                    }
                }
            }
        })
    },

    exportRecord: function (e) {
        const recordId = e.currentTarget.dataset.id

        wx.showLoading({
            title: '导出中...',
        })

        try {
            // 使用数据管理器导出记录
            const exportData = dataManager.exportRecord(recordId)

            setTimeout(() => {
                wx.hideLoading()

                if (exportData) {
                    // 转换为JSON字符串
                    const jsonStr = JSON.stringify(exportData, null, 2)

                    // 生成文件名
                    const fileName = `pulse_record_${recordId.split('_')[1]}.json`

                    // 将数据保存到临时文件
                    const fs = wx.getFileSystemManager()
                    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

                    try {
                        // 确保临时文件目录存在
                        try {
                            const stats = fs.statSync(wx.env.USER_DATA_PATH);
                        } catch (dirErr) {
                            // 如果目录不存在，尝试创建
                            fs.mkdirSync(wx.env.USER_DATA_PATH, true);
                        }

                        // 写入文件
                        fs.writeFileSync(filePath, jsonStr, 'utf8');
                        console.log('临时文件已写入:', filePath);

                        // 检查文件是否确实写入成功
                        try {
                            const fileStats = fs.statSync(filePath);
                            console.log('文件大小:', fileStats.size);

                            // 确认文件存在后再保存
                            if (fileStats.size > 0) {
                                // 使用文件系统管理器保存文件
                                fs.saveFile({
                                    tempFilePath: filePath,
                                    filePath: wx.env.USER_DATA_PATH + '/export_' + fileName,
                                    success: (res) => {
                                        const savedFilePath = res.savedFilePath;
                                        console.log('文件已保存到:', savedFilePath);

                                        wx.showModal({
                                            title: '导出成功',
                                            content: '数据已成功导出，可在手机存储中查看',
                                            showCancel: false
                                        });

                                        // 复制到剪贴板作为备份访问方式
                                        wx.setClipboardData({
                                            data: jsonStr,
                                            success: () => {
                                                console.log('数据已复制到剪贴板');
                                            }
                                        });
                                    },
                                    fail: (err) => {
                                        console.error('保存文件失败:', err);
                                        this._handleExportFallback(jsonStr);
                                    }
                                });
                            } else {
                                throw new Error('写入的文件大小为0');
                            }
                        } catch (statErr) {
                            console.error('检查文件状态失败:', statErr);
                            this._handleExportFallback(jsonStr);
                        }
                    } catch (fileErr) {
                        console.error('写入文件失败:', fileErr);
                        this._handleExportFallback(jsonStr);
                    }
                } else {
                    wx.showModal({
                        title: '导出失败',
                        content: '未找到记录或导出失败',
                        showCancel: false
                    })
                }
            }, 1000)
        } catch (error) {
            console.error('导出记录失败:', error)

            setTimeout(() => {
                wx.hideLoading()

                wx.showModal({
                    title: '导出失败',
                    content: '导出过程中发生错误: ' + error.message,
                    showCancel: false
                })
            }, 500)
        }
    },

    refreshList: function () {
        this.loadRecordData()
    },

    _formatDate: function (date) {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()

        return [year, month, day].map(this._formatNumber).join('-')
    },

    _formatTime: function (date) {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const hour = date.getHours()
        const minute = date.getMinutes()

        return [year, month, day].map(this._formatNumber).join('/') + ' ' +
            [hour, minute].map(this._formatNumber).join(':')
    },

    _formatDuration: function (seconds) {
        const minutes = Math.floor(seconds / 60)
        const secs = seconds % 60

        if (minutes < 1) {
            return `${secs}秒`
        } else if (secs === 0) {
            return `${minutes}分钟`
        } else {
            return `${minutes}分${secs}秒`
        }
    },

    _formatNumber: function (n) {
        n = n.toString()
        return n[1] ? n : '0' + n
    },

    calculateContentHeight: function (tabBarHidden = false) {
        const that = this
        wx.getSystemInfo({
            success: function (res) {
                // 获取屏幕高度
                const windowHeight = res.windowHeight

                // 计算筛选区域的高度（假设约120rpx，转换为px）
                const filterSectionHeight = 60  // 大约120rpx，根据实际情况调整

                // TabBar高度（98rpx，转换为px）
                const tabBarHeight = tabBarHidden ? 0 : 49  // 98rpx约等于49px

                // 底部安全区域高度（20rpx，转换为px）
                const safeAreaHeight = 10  // 20rpx约等于10px

                // 计算内容区域高度，包含底部安全区域
                const contentHeight = windowHeight - filterSectionHeight - (tabBarHidden ? safeAreaHeight : tabBarHeight)

                that.setData({
                    contentHeight: contentHeight,
                    tabBarVisible: !tabBarHidden
                })

                console.log('Content height calculated:', contentHeight, 'TabBar hidden:', tabBarHidden)
            }
        })
    },

    onFontLoaded: function () {
        this.setData({
            fontLoaded: true
        })
    },

    // 添加页面滚动处理函数
    onPageScroll: function (e) {
        const scrollTop = e.detail.scrollTop;
        const oldScrollTop = this.data.lastScrollTop;
        const threshold = this.data.scrollThreshold;

        // 判断滚动方向
        if (scrollTop > oldScrollTop + threshold) {
            // 向下滚动
            this.setData({
                scrollDirection: 'down',
                lastScrollTop: scrollTop
            });
            // 隐藏TabBar
            this.hideTabBar();
        } else if (scrollTop < oldScrollTop - threshold) {
            // 向上滚动
            this.setData({
                scrollDirection: 'up',
                lastScrollTop: scrollTop
            });
            // 显示TabBar
            this.showTabBar();
        }
    },

    // 隐藏TabBar
    hideTabBar: function () {
        if (!this.data.tabBarVisible) return;

        this.setData({
            tabBarVisible: false
        });

        // 设置TabBar样式
        if (this.tabBarInstance) {
            // 获取TabBar根元素
            const tabBarComponent = this.tabBarInstance;
            // 更新TabBar样式为隐藏
            tabBarComponent.setData({
                hideTabBar: true
            });
        }

        // 重新计算内容高度
        this.calculateContentHeight(true);
    },

    // 显示TabBar
    showTabBar: function () {
        if (this.data.tabBarVisible) return;

        this.setData({
            tabBarVisible: true
        });

        // 设置TabBar样式
        if (this.tabBarInstance) {
            // 获取TabBar根元素
            const tabBarComponent = this.tabBarInstance;
            // 更新TabBar样式为显示
            tabBarComponent.setData({
                hideTabBar: false
            });
        }

        // 重新计算内容高度
        this.calculateContentHeight(false);
    },

    // 处理导出失败的备用方案
    _handleExportFallback: function (jsonStr) {
        // 使用剪贴板功能作为备用方案
        wx.setClipboardData({
            data: jsonStr,
            success: () => {
                wx.showModal({
                    title: '导出成功',
                    content: '文件保存失败，但数据已复制到剪贴板',
                    showCancel: false
                });
            },
            fail: (clipErr) => {
                console.error('复制到剪贴板失败:', clipErr);
                wx.showModal({
                    title: '导出失败',
                    content: '无法保存文件或复制数据，请稍后重试',
                    showCancel: false
                });
            }
        });
    }
}) 