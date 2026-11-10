<script setup>
// 外壳组件：只负责"装页面"（导航 + 路由出口），不写业务逻辑
// 原来残留的 import HelloWorld 已删除——它没被模板用到，还可能引入多余样式
import { ref } from 'vue'     

const menuOpen = ref(false)
function toggleMenu() { menuOpen.value = !menuOpen.value }
function closeMenu() { menuOpen.value = false }   
</script>

<template>
  <div class="app">
    <!-- 悬浮菜单按钮：固定在左上角，任何页面都在 -->
    <button class="menu-btn" @click="toggleMenu">☰</button>

    <!-- 侧边抽屉：menuOpen 为真时加 open 类（滑入） -->
    <nav class="drawer" :class="{ open: menuOpen }">
      <!-- 每个链接都带 @click="closeMenu"，点完自动收起 -->
      <router-link to="/dashboard" @click="closeMenu">大屏总览</router-link>
      <router-link to="/alarm" @click="closeMenu">报警管理</router-link>
      <router-link to="/personnel" @click="closeMenu">人员进出</router-link>
      <router-link to="/cranes" @click="closeMenu">塔吊监控</router-link>
      <router-link to="/vehicle" @click="closeMenu">车辆管理</router-link>
      <router-link to="/progress" @click="closeMenu">进度管理</router-link>
      <router-link to="/map" @click="closeMenu">场布示意图</router-link>
      <router-link to="/env" @click="closeMenu">环境监测</router-link>

      <!-- P4 占位模块：分隔标题 -->
      <div class="nav-group">扩展模块（占位）</div>
      <router-link to="/video" @click="closeMenu">视频监控</router-link>
      <router-link to="/bim" @click="closeMenu">BIM 模型</router-link>
      <router-link to="/face" @click="closeMenu">人脸实名制</router-link>
    </nav>

    <!-- 遮罩：抽屉打开时点击空白处也能关掉 -->
    <div v-if="menuOpen" class="mask" @click="closeMenu"></div>

    <router-view></router-view>
  </div>
</template>

<style scoped>
.app { width: 100%; height: 100%; }

/* 悬浮菜单按钮 */
.menu-btn {
  position: fixed; left: 16px; top: 16px; z-index: 1001;   /* z-index 高于抽屉和遮罩 */
  width: 40px; height: 40px; border-radius: 8px;
  background: rgba(10,30,55,.85); color: #36e2ff;
  border: 1px solid rgba(54,226,255,.45);
  font-size: 18px; cursor: pointer; backdrop-filter: blur(4px);
}
.menu-btn:hover { background: rgba(54,226,255,.22); color: #fff; }

/* 侧边抽屉：默认移到屏幕外（translateX(-100%)），加 open 后滑入 */
.drawer {
  position: fixed; left: 0; top: 0; bottom: 0; z-index: 1000;
  width: 200px; padding: 70px 0 0;
  display: flex; flex-direction: column;
  overflow-y: auto;                                        /* 入口变多后允许滚动 */
  background: linear-gradient(180deg, rgba(12,32,56,.98), rgba(6,18,34,.98));
  border-right: 1px solid rgba(54,226,255,.25);
  transform: translateX(-100%);                            /* 藏在屏幕左侧外 */
  transition: transform .28s ease;                         /* 滑动动画 */
}
.drawer.open { transform: translateX(0); }                 /* 滑进来 */

.drawer a {
  padding: 12px 20px; color: #9ecbff; text-decoration: none; font-size: 15px;
  border-left: 3px solid transparent;                      /* 预留左侧高亮条位置 */
}
.drawer a:hover { background: rgba(54,226,255,.08); color: #fff; }
.drawer a.router-link-active {                             /* 当前页高亮 */
  color: #36e2ff; border-left-color: #36e2ff;
  background: rgba(54,226,255,.12);
}

/* 导航分组标题（区分"核心功能"和"扩展模块"） */
.nav-group {
  padding: 16px 20px 6px;
  font-size: 12px; color: #4a6b8f;
  letter-spacing: 1px;
  border-top: 1px solid rgba(54,226,255,.12);
  margin-top: 8px;
}

/* 遮罩层 */
.mask { position: fixed; inset: 0; z-index: 999; background: rgba(0,0,0,.45); }
</style>
