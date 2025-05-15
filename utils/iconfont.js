// 图标字体配置
Component({
    properties: {
        // 图标名称
        type: {
            type: String,
            value: ''
        },
        // 图标颜色
        color: {
            type: String,
            value: ''
        },
        // 图标大小
        size: {
            type: Number,
            value: 24
        }
    },
    data: {
        // 图标映射表，这里使用Unicode字符
        icons: {
            // 常用图标
            'home': '\ue88a',
            'device': '\ue32a',
            'monitor': '\ue026',
            'history': '\ue889',
            'user': '\ue7fd',
            'search': '\ue8b6',
            'add': '\ue145',
            'close': '\ue5cd',
            'disconnect': '\ue14b',
            // 设备相关图标
            'device-connected': '\ue1b1',
            'device-disconnected': '\ue1b0',
            'device-searching': '\ue1b2',
            'device-error': '\ue000',
            'device-simulation': '\ue30c',
            // 网络相关图标
            'wifi-strong': '\ue1d8',
            'wifi-medium': '\ue1d8',
            'wifi-weak': '\ue1d8',
            'wifi-none': '\ue1d9',
            'mobile-network': '\ue1bc',
            'no-network': '\ue1ba',
            // 连接相关图标
            'connection-success': '\ue5ca',
            'connection-failed': '\ue5cd',
            'connection-pending': '\ue86a',
            'connection-unstable': '\ue8b2'
        }
    },
    methods: {
        // 根据类型获取对应的图标
        getIcon() {
            const { type, color, size } = this.properties;
            const icon = this.data.icons[type] || '';
            return { icon, color, size };
        }
    }
}) 