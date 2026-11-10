<template>
  <section class="panel">
    <!-- 标题：有 title 时才显示这行 -->
    <h2 v-if="title">{{ title }}</h2>
    <!-- 默认插槽：父组件写在 <PanelBox> 标签之间的内容会渲染到这里 -->
    <div class="body">
      <slot></slot>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
})
</script>

<style scoped>
/* 面板外壳：半透明深蓝渐变 + 青色描边 + 内外发光（从原 DashboardView 搬过来） */
.panel {
  position: relative;          /* 让内部绝对定位元素以它为参照 */
  display: flex;               /* 用弹性布局，方便 body 撑满剩余高度 */
  flex-direction: column;
  flex: 1;                     /* 在父容器里平均分配剩余空间 */
  min-height: 0;               /* 关键：防止 flex 子项被内容撑破 */
  padding: 14px 16px;
  color: #fff;
  background: linear-gradient(180deg, rgba(16, 42, 74, .92), rgba(8, 24, 46, .92));
  border: 1px solid rgba(45, 120, 200, .4);
  border-radius: 8px;
  box-shadow: inset 0 0 18px rgba(20, 120, 220, .18), 0 0 10px rgba(20, 120, 220, .12);
}

.panel h2 {
  margin: 0 0 10px;
  font-size: 18px;
  padding-left: 12px;
  position: relative;
  color: #cfe8ff;
}

/* 标题左侧的青色短竖条 */
.panel h2::before {
  content: '';
  position: absolute; left: 0; top: 3px; bottom: 3px;
  width: 4px;
  border-radius: 2px;
  background: linear-gradient(180deg, #36e2ff, #1f6feb);
}

/* 内容区：占满剩余高度，内部放图表就能自适应 */
.body {
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>