/**
 * 数据管理工具类
 * 提供脉搏数据记录、存储和查询功能
 */

const app = getApp();

// 本地存储键
const RECORDS_STORAGE_KEY = 'pulse_records';

// 创建唯一ID
function generateId() {
    return 'record_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// 当前正在记录的数据
let currentRecord = null;

// 开始新记录
function startNewRecord() {
    // 如果已有记录在进行中，先停止
    if (currentRecord) {
        finishCurrentRecord();
    }

    const now = new Date();

    // 创建新记录
    currentRecord = {
        id: generateId(),
        startTime: now.toISOString(),
        endTime: null,
        duration: 0,
        channels: {
            channel1: {
                data: [],
                average: 0,
                min: 0,
                max: 0
            },
            channel2: {
                data: [],
                average: 0,
                min: 0,
                max: 0
            },
            channel3: {
                data: [],
                average: 0,
                min: 0,
                max: 0
            }
        }
    };

    return currentRecord;
}

// 更新当前记录
function updateCurrentRecord(dataPoint) {
    if (!currentRecord) {
        throw new Error('没有正在进行的记录');
    }

    // 记录每个通道的数据
    for (let key in currentRecord.channels) {
        if (dataPoint.channels && dataPoint.channels[key] !== undefined) {
            const value = dataPoint.channels[key];

            // 添加数据点
            currentRecord.channels[key].data.push({
                timestamp: dataPoint.timestamp || Date.now(),
                value: value
            });

            // 更新统计数据
            if (currentRecord.channels[key].data.length === 1) {
                // 第一个数据点
                currentRecord.channels[key].min = value;
                currentRecord.channels[key].max = value;
                currentRecord.channels[key].average = value;
            } else {
                // 更新最小值
                if (value < currentRecord.channels[key].min) {
                    currentRecord.channels[key].min = value;
                }

                // 更新最大值
                if (value > currentRecord.channels[key].max) {
                    currentRecord.channels[key].max = value;
                }

                // 更新平均值
                const sum = currentRecord.channels[key].data.reduce((acc, item) => acc + item.value, 0);
                currentRecord.channels[key].average = Math.round(sum / currentRecord.channels[key].data.length);
            }
        }
    }

    // 更新记录时长
    const startTime = new Date(currentRecord.startTime);
    const now = new Date();
    currentRecord.duration = Math.floor((now - startTime) / 1000); // 秒
}

// 完成当前记录
function finishCurrentRecord() {
    if (!currentRecord) {
        return null;
    }

    const now = new Date();
    currentRecord.endTime = now.toISOString();

    // 计算总时长
    const startTime = new Date(currentRecord.startTime);
    currentRecord.duration = Math.floor((now - startTime) / 1000); // 秒

    // 保存记录
    const savedRecord = saveRecord(currentRecord);

    // 清除当前记录
    const completedRecord = currentRecord;
    currentRecord = null;

    return completedRecord;
}

// 保存记录到本地存储
function saveRecord(record) {
    let records = getRecords();

    // 添加新记录
    records.push(record);

    // 保存到本地存储
    wx.setStorageSync(RECORDS_STORAGE_KEY, records);

    return record;
}

// 从本地存储获取所有记录
function getRecords(filter = null) {
    let records = wx.getStorageSync(RECORDS_STORAGE_KEY) || [];

    // 如果有过滤条件
    if (filter) {
        if (filter.startDate) {
            const startDate = new Date(filter.startDate);
            records = records.filter(record => new Date(record.startTime) >= startDate);
        }

        if (filter.endDate) {
            const endDate = new Date(filter.endDate);
            endDate.setHours(23, 59, 59, 999); // 设置为当天结束
            records = records.filter(record => new Date(record.startTime) <= endDate);
        }

        if (filter.minDuration) {
            records = records.filter(record => record.duration >= filter.minDuration);
        }
    }

    // 按时间倒序排列
    records.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return records;
}

// 获取指定ID的记录
function getRecordById(id) {
    const records = getRecords();
    return records.find(record => record.id === id) || null;
}

// 删除记录
function deleteRecord(id) {
    let records = getRecords();
    const initialLength = records.length;

    // 过滤掉要删除的记录
    records = records.filter(record => record.id !== id);

    // 如果数量减少了，说明删除成功
    if (records.length < initialLength) {
        wx.setStorageSync(RECORDS_STORAGE_KEY, records);
        return true;
    }

    return false;
}

// 清除所有记录
function clearAllRecords() {
    wx.removeStorageSync(RECORDS_STORAGE_KEY);
    return true;
}

// 导出记录为JSON格式
function exportRecord(id) {
    const record = getRecordById(id);

    if (!record) {
        return null;
    }

    try {
        // 格式化数据便于导出
        const exportData = {
            id: record.id,
            startTime: record.startTime,
            endTime: record.endTime,
            duration: record.duration,
            statistics: {
                channel1: {
                    average: record.channels.channel1.average,
                    min: record.channels.channel1.min,
                    max: record.channels.channel1.max
                },
                channel2: {
                    average: record.channels.channel2.average,
                    min: record.channels.channel2.min,
                    max: record.channels.channel2.max
                },
                channel3: {
                    average: record.channels.channel3.average,
                    min: record.channels.channel3.min,
                    max: record.channels.channel3.max
                }
            },
            data: {
                channel1: record.channels.channel1.data,
                channel2: record.channels.channel2.data,
                channel3: record.channels.channel3.data
            }
        };

        return exportData;
    } catch (error) {
        console.error('导出记录出错:', error);
        return null;
    }
}

module.exports = {
    startNewRecord,
    updateCurrentRecord,
    finishCurrentRecord,
    getRecords,
    getRecordById,
    deleteRecord,
    clearAllRecords,
    exportRecord
}; 