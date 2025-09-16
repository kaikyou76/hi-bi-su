import { defineConfig } from "vitepress";

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
  markdown: {
    theme: {
      light: "github-light", // 白背景のテーマ

      dark: "material-theme", // ダークテーマ（黒ではない）
    },
  },

  // 追加のCSSカスタマイズ

  head: [
    [
      "style",

      {},

      `

        :root {

          --vp-code-block-bg: #f6f8fa !important; /* ライトモード背景色 */

        }

        

        .dark {

          --vp-code-block-bg: #2d333b !important; /* ダークモード背景色（濃いグレー） */

        }

      `,
    ],
  ],

  vite: {
    css: {
      postcss: {
        plugins: [],
      },
    },
  },

  themeConfig: {
    nav: [
      { text: "🏠 ホーム", link: "/" },
      { text: "📚 ガイド", link: "/guide/" },
      { text: "🛠️ チュートリアル", link: "/tutorial/" },
      { text: "📒 記事一覧", link: "/posts/" },
      { text: "👤 私について", link: "/about/me" },
      { text: "📒 設定について", link: "/code/" },
      { text: "📒 説明", link: "/coment/" },
      { text: "📒 フロント", link: "/frontend/" },
    ],

    sidebar: {
      "/about/": [
        {
          text: "私について",
          collapsed: true,
          items: [
            {
              text: "11. 📝 管理ログ（Admin Logs）API開発",
              link: "/about/api11",
            },
          ],
        },
        {
          text: "GitHub運用計画",
          collapsed: true,
          items: [
            { text: "運用フロー", link: "/about/GitHubFlow" },
            { text: "提案-1", link: "/about/GitHubFlow01" },
          ],
        },
      ],
      "/code/": [
        {
          text: "awsデプロイ計画",
          collapsed: true,
          items: [
            { text: "awsデプロイ方法", link: "/code/aws-cli" },
            { text: "awsプラン", link: "/code/aws-cli02" },
          ],
        },
        {
          text: "フロントエンド設定",
          collapsed: false,
          items: [
            { text: "環境変数設定ファイル", link: "/code/kankyou" },
            { text: "Tailwind CSSセットアップ", link: "/code/css" },
          ],
        },
      ],
      "/coment/": [
        {
          text: "Struts项目环境配置",
          collapsed: false,
          items: [
            { text: "代理配置", link: "/coment/daili" },
            { text: "002プロジェクト構成案", link: "/coment/keikaku002" },
          ],
        },
      ],
      "/guide/": [
        {
          text: "開発ツール",
          collapsed: true,
          items: [{ text: "iFlow CLI", link: "/guide/iFlow_CLI" }],
        },
        {
          text: "sqlクリエ",
          collapsed: true,
          items: [
            { text: "保険契約情報結合クエリ001", link: "/guide/hoken001" },
            {
              text: "年間保険料収入統計報告書クエリ002",
              link: "/guide/hoken002",
            },
            {
              text: "顧客価値分析クエリ003",
              link: "/guide/hoken003",
            },
            {
              text: "営業成績ランキングクエリ004",
              link: "/guide/hoken004",
            },
          ],
        },
        {
          text: "在Eclipse上调试Java Web项目",
          collapsed: true,
          items: [{ text: "Eclipse调试指南", link: "/guide/Eclipse001" }],
        },
        {
          text: "老旧保险系统学习流程java-1.8",
          collapsed: true,
          items: [
            {
              text: "✅各个模块流程",
              link: "/guide/cpt001",
            },
            {
              text: "✅老旧保险系统初学者开发流程书",
              link: "/guide/cpt002",
            },
          ],
        },
        {
          text: "老旧保险系统学习流程java1.8-Velocity",
          collapsed: true,
          items: [
            {
              text: "✅开发历史记录",
              link: "/guide/development-history",
            },
            {
              text: "✅快速理解和掌握",
              link: "/guide/jv001",
            },
            {
              text: "✅主要功能模块",
              link: "/guide/jv001-0",
            },
            {
              text: "✅Velocity模板和JSP页面",
              link: "/guide/jv001-1",
            },
          ],
        },
        {
          text: "Velocity模板页面完整流程",
          collapsed: true,
          items: [
            {
              text: "✅✅Velocity模板页面完整流程分析",
              link: "/guide/Velocity000",
            },
          ],
        },
        {
          text: "API文件的工作原理",
          collapsed: true,
          items: [
            {
              text: "✅✅API 文件工作原理与调用流程",
              link: "/guide/api000",
            },
          ],
        },
        {
          text: "API Servlet与传统Controller",
          collapsed: true,
          items: [
            {
              text: "✅✅API Servlet与传统Controller的对比",
              link: "/guide/apiController000",
            },
          ],
        },
        {
          text: "外部系统集成接口",
          collapsed: true,
          items: [
            {
              text: "✅✅外部系统的数据交换和集成",
              link: "/guide/ExternalSystemIntegration.java",
            },
          ],
        },
        {
          text: "顾客列表查询",
          collapsed: true,
          items: [
            {
              text: "✅顾客列表查询执行流程",
              link: "/guide/jv002",
            },
            {
              text: "✅CustomerServlet.java",
              link: "/guide/jv003",
            },
            {
              text: "✅CustomerService.java",
              link: "/guide/jv004",
            },
            {
              text: "✅CustomerDAO.java",
              link: "/guide/jv005",
            },
            {
              text: "✅DatabaseUtil.java",
              link: "/guide/jv006",
            },
            {
              text: "✅Customer.java",
              link: "/guide/jv007",
            },
            {
              text: "✅list.jsp ",
              link: "/guide/jv008",
            },
          ],
        },
        {
          text: "安全认证和权限管理",
          collapsed: true,
          items: [
            {
              text: "✅✅安全认证和权限管理流程",
              link: "/guide/auth000",
            },
            {
              text: "✅用户认证流程",
              link: "/guide/auth000-2",
            },
          ],
        },
        {
          text: "顾客管理流程",
          collapsed: true,
          items: [
            {
              text: "✅✅顾客管理流程",
              link: "/guide/Customer.java000",
            },
          ],
        },
        {
          text: "保险料计算流程",
          collapsed: true,
          items: [
            {
              text: "✅✅保险料计算流程",
              link: "/guide/Premium000",
            },
          ],
        },
        {
          text: "系统监控和日志管理",
          collapsed: true,
          items: [
            {
              text: "✅系统监控和日志管理流程1",
              link: "/guide/log000",
            },
            {
              text: "✅系统监控和日志管理流程2",
              link: "/guide/log002",
            },
          ],
        },
        {
          text: "バッチ处理和定时任务",
          collapsed: true,
          items: [
            {
              text: "✅✅批处理执行流程详解",
              link: "/guide/batch-execution-flow",
            },
            {
              text: "✅保险费率更新批处理",
              link: "/guide/PremiumUpdateBatch.java",
            },
            {
              text: "MySQL存储过程：`calculate_premium` ",
              link: "/guide/calculate_premium",
            },
            {
              text: "✅合同状态更新批处理",
              link: "/guide/ContractStatusBatch.java",
            },
            {
              text: "✅报告生成批处理",
              link: "/guide/ReportGenerationBatch.java",
            },
          ],
        },
        {
          text: "git 开发",
          collapsed: true,
          items: [
            { text: "从克隆到提交的正确步骤", link: "/guide/git001" },
            { text: "Git开发流程", link: "/guide/git002" },
          ],
        },
      ],
      "/posts/": [
        {
          text: "記事",
          collapsed: true,
          items: [
            { text: "bean登録問題解決", link: "/posts/error_01" },
            {
              text: "プロパティの連携",
              link: "/posts/properties_settings",
            },
          ],
        },
      ],
      "/tutorial/": [
        {
          text: "チュートリアル",
          collapsed: true,
          items: [{ text: "高速な Maven 実行", link: "/tutorial/mvnd_tool" }],
        },

        {
          text: " Repository層テスト実施",
          collapsed: true,
          items: [
            {
              text: "🔍上記単体と統合の違い",
              link: "/tutorial/MockIntegration_m",
            },
          ],
        },
      ],
      "/frontend/": [
        {
          text: "AWS Amplifyへのデプロイ",
          collapsed: true,
          items: [{ text: "githubからAWSへ", link: "/frontend/github_aws" }],
        },
        {
          text: "フロント開発",
          collapsed: true,
          items: [
            { text: "ログイン後の処理01", link: "/frontend/login_001" },
            { text: "ログイン後の処理02", link: "/frontend/login_002" },
          ],
        },
        {
          text: "spring batchの一部流れ",
          collapsed: true,
          items: [
            {
              text: "HumanResourceJobConfig",
              link: "/posts/HumanResourceJobConfig",
            },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/your-account" }],
  },
});
