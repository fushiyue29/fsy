/**
 * 数据管理器扩展
 * 提供对原始dataManager的增强功能
 */

const dataManager = require('./dataManager');

// 获取记录详情(作为getRecordById的别名)
function getRecordDetail(id) {
    try {
        const record = dataManager.getRecordById(id);
        if (!record) return null;

        // 格式化记录数据
        const startDate = new Date(record.startTime);
        const endDate = record.endTime ? new Date(record.endTime) : new Date();

        // 添加格式化的时间和时长
        return {
            ...record,
            startTime: formatTime(startDate),
            endTime: formatTime(endDate),
            formattedDuration: formatDuration(record.duration || 0)
        };
    } catch (error) {
        console.error('获取记录详情失败:', error);
        return null;
    }
}

// 导出记录
function exportRecord(id) {
    try {
        const record = dataManager.getRecordById(id);
        if (!record) return null;

        // 创建导出数据格式
        const exportData = {
            id: record.id,
            startTime: record.startTime,
            endTime: record.endTime,
            duration: record.duration,
            channels: {
                channel1: {
                    ...record.channels.channel1,
                    // 数据点可能很多，可能需要进行采样或压缩
                    data: record.channels.channel1.data
                },
                channel2: {
                    ...record.channels.channel2,
                    data: record.channels.channel2.data
                },
                channel3: {
                    ...record.channels.channel3,
                    data: record.channels.channel3.data
                }
            },
            exportTime: new Date().toISOString(),
            exportFormat: 'JSON'
        };

        return exportData;
    } catch (error) {
        console.error('导出记录失败:', error);
        return null;
    }
}

// 格式化时间
function formatTime(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();

    return [year, month, day].map(formatNumber).join('/') + ' ' +
        [hour, minute].map(formatNumber).join(':');
}

// 格式化时长
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes < 1) {
        return `${secs}秒`;
    } else if (secs === 0) {
        return `${minutes}分钟`;
    } else {
        return `${minutes}分${secs}秒`;
    }
}

// 格式化数字
function formatNumber(n) {
    n = n.toString();
    return n[1] ? n : '0' + n;
}

// 扩展原始的dataManager
module.exports = {
    ...dataManager,  // 保留原始方法
    getRecordDetail,
    exportRecord
};
