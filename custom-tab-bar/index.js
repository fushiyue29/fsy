Component({
    data: {
        selected: 0,
        color: "#999999",
        selectedColor: "#4696f7",
        hideTabBar: false,
        list: [
            {
                pagePath: "pages/index/index",
                text: "首页",
                iconText: '\ue88a'
            },
            {
                pagePath: "pages/device/device",
                text: "设备",
                iconText: '\ue32a'
            },
            {
                pagePath: "pages/monitor/monitor",
                text: "监测",
                iconText: '\ue405'
            },
            {
                pagePath: "pages/history/history",
                text: "历史",
                iconText: '\ue889'
            },
            {
                pagePath: "pages/user/user",
                text: "我的",
                iconText: '\ue7fd'
            }
        ],
        pageReady: false
    },

    attached() {
        // 延迟执行初始化，等待页面完全加载
        setTimeout(() => {
            this.initTabBar();
        }, 100);
    },

    methods: {
        initTabBar() {
            try {
                // 获取当前页面进行匹配
                const pages = getCurrentPages();

                // 安全检查：确保pages数组存在且非空
                if (!pages || pages.length === 0) {
                    console.log('无法获取当前页面信息，保持默认选中状态');
                    return;
                }

                const currentPage = pages[pages.length - 1];

                // 安全检查：确保currentPage和route存在
                if (!currentPage || !currentPage.route) {
                    console.log('无法获取当前页面路由，保持默认选中状态');
                    return;
                }

                const route = currentPage.route;

                const list = this.data.list;
                for (let i = 0; i < list.length; i++) {
                    // 去掉pages前缀进行匹配
                    if (list[i].pagePath === route || '/' + list[i].pagePath === route) {
                        this.setData({
                            selected: i,
                            pageReady: true
                        });
                        break;
                    }
                }
            } catch (error) {
                console.error('初始化TabBar时出错:', error);
                // 出错时保持默认选中状态
                this.setData({
                    pageReady: true
                });
            }
        },

        switchTab(e) {
            const data = e.currentTarget.dataset;
            const url = data.path;

            // 切换到对应tab
            wx.switchTab({
                url: '/' + url
            });

            this.setData({
                selected: data.index
            });
        }
    }
}); 