import {defineConfig} from 'vitepress'
import {set_sidebar} from "../utils/auto-gen-sidebar.mjs";


// https://vitepress.dev/reference/site-config
export default defineConfig({
    base: "/knowledge-web/",
    title: "My Awesome Project",
    description: "A VitePress Site",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: 'Home', link: '/'},
            {text: 'Examples', link: '/knowledge/markdown-examples'},
            {text: 'Java基础', link: '/knowledge/Java基础/1.1-Java基础'}
        ],

        sidebar: [
            {
                text: 'Examples',
                items: [
                    {text: 'Markdown Examples', link: '/knowledge/markdown-examples'},
                    {text: 'Runtime API Examples', link: '/api-examples'}
                ]
            }, {
                text: 'Java基础',
                items: [
                    {text: 'Java基础', link: '/knowledge/Java基础/1.1-Java基础'},
                    {text: 'Java位运算', link: '/knowledge/Java基础/1.3-Java位运算'},
                ]
            },
        ],

        socialLinks: [
            {icon: 'github', link: 'https://github.com/EthanHTL'}
        ],
        // 底部配置
        footer: {
            copyright: "Copyright@ 2023 Albert Zhang",
        },
        // 设置搜索框的样式
        search: {
            provider: "local",
            options: {
                translations: {
                    button: {
                        buttonText: "搜索文档",
                        buttonAriaLabel: "搜索文档",
                    },
                    modal: {
                        noResultsText: "无法找到相关结果",
                        resetButtonTitle: "清除查询条件",
                        footer: {
                            selectText: "选择",
                            navigateText: "切换",
                        },
                    },
                },
            },
        }
    }
})
