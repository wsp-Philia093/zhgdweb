import { createApp } from 'vue'
import { createPinia } from 'pinia'   // 导入 Pinia 的创建函数
import './style.css'
import App from './App.vue'
import router from './router'

const pinia = createPinia()           // 创建一个 Pinia 实例（全局状态容器）
createApp(App).use(router).use(pinia).mount('#app')   // 挂载：链式 .use() 先装路由再装 Pinia
