<template>
  <div class="page">
    <h1>BIM 模型</h1>

    <!-- ① 模型元信息 -->
    <div class="stats">
      <div class="stat-card"><div class="v">{{ info.floors || 0 }}</div><div class="l">楼层数</div></div>
      <div class="stat-card"><div class="v">{{ info.built_area || 0 }}</div><div class="l">建筑面积 (㎡)</div></div>
      <div class="stat-card"><div class="v">{{ info.progress || 0 }}%</div><div class="l">模型对应进度</div></div>
      <div class="stat-card fmt"><div class="v">{{ (info.format || '—').split(' ')[0] }}</div><div class="l">模型格式</div></div>
    </div>

    <!-- ② 占位提示 -->
    <div class="notice">
      <span class="ico">i</span>
      当前为<strong>占位模块</strong>：真实项目需接入 IFC / glTF 模型服务与 WebGL 渲染器（如 three.js）。接口 <code>/api/bim/</code> 已预留。
    </div>

    <div class="layout">
      <!-- ③ 左侧：用纯 CSS 画一个建筑剖面示意图（不用 3D 库，保持轻量） -->
      <PanelBox title="主体结构模型示意">
        <div class="bim-view">
          <div class="grid-bg"></div>
          <!-- 楼层堆叠：从下往上，已完成楼层高亮 -->
          <div class="building">
            <div v-for="f in info.floors" :key="f" class="floor"
                 :class="{ done: f <= doneFloors, doing: f === doingFloor }">
              <span class="fnum">{{ f }}F</span>
            </div>
          </div>
          <div class="bim-tip">模型占位 · 接入 three.js 后可旋转/缩放查看</div>
        </div>
      </PanelBox>

      <!-- ④ 右侧：模型信息与接入说明 -->
      <aside class="side">
        <PanelBox title="模型信息">
          <ul class="info-list">
            <li><span class="k">模型名称</span><span class="val">{{ info.model_name }}</span></li>
            <li><span class="k">格式</span><span class="val">{{ info.format }}</span></li>
            <li><span class="k">楼层数</span><span class="val">{{ info.floors }} 层</span></li>
            <li><span class="k">建筑面积</span><span class="val">{{ info.built_area }} ㎡</span></li>
            <li><span class="k">施工进度</span><span class="val hl">{{ info.progress }}%</span></li>
            <li><span class="k">更新时间</span><span class="val">{{ fmtTime(info.updated_at) }}</span></li>
          </ul>
          <p class="api-hint">接口：GET /api/bim/</p>
        </PanelBox>

        <PanelBox title="接入说明">
          <p class="desc">{{ info.note }}</p>
          <ul class="steps">
            <li>① 导出 IFC / glTF 模型文件</li>
            <li>② 后端提供模型下载接口</li>
            <li>③ 前端 three.js 加载并绑定构件</li>
            <li>④ 构件与实时数据关联（点选构件看数据）</li>
          </ul>
        </PanelBox>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getBim } from '../api'
import PanelBox from '../components/PanelBox.vue'

const info = ref({})          // 模型元信息

// 已完工楼层数：用 progress 按比例换算，让剖面图有"盖到哪了"的直观感
const doneFloors = computed(() => {
  if (!info.value.floors) return 0
  return Math.round((info.value.progress / 100) * info.value.floors)
})

// 当前正在施工的楼层 = 已完成 + 1
const doingFloor = computed(() => Math.min(doneFloors.value + 1, info.value.floors || 0))

function fmtTime(s) {
  if (!s) return '—'
  const d = new Date(s)
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(async () => {
  info.value = await getBim()
})
</script>

<style scoped>
.page { padding: 70px 30px 30px; color: #fff; min-height: 100vh; background: #06121f; }
.page h1 { color: #36e2ff; margin-bottom: 20px; font-size: 26px; }

.stats { display: flex; gap: 16px; margin-bottom: 16px; }
.stat-card {
  flex: 1; padding: 16px 20px; text-align: center;
  background: linear-gradient(180deg, rgba(16,42,74,.92), rgba(8,24,46,.92));
  border: 1px solid rgba(45,120,200,.4); border-radius: 8px;
}
.stat-card .v { font-size: 30px; font-weight: bold; color: #36e2ff; }
.stat-card .l { font-size: 13px; color: #9ecbff; margin-top: 4px; }
.stat-card.fmt .v { font-size: 20px; padding: 8px 0; }

.notice {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; margin-bottom: 16px; font-size: 13px;
  background: rgba(54,226,255,.08);
  border: 1px solid rgba(54,226,255,.3);
  border-left: 3px solid #36e2ff;
  border-radius: 4px; color: #9ecbff;
}
.notice strong { color: #36e2ff; }
.notice code {
  background: rgba(0,0,0,.35); padding: 1px 6px;
  border-radius: 3px; color: #ffd166; font-size: 12px;
}
.notice .ico {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%;
  background: #36e2ff; color: #06121f; font-size: 11px;
  font-weight: bold; font-style: italic; flex-shrink: 0;
}

.layout { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; height: 560px; }
.side { display: flex; flex-direction: column; gap: 16px; }

/* 模型视图区 */
.bim-view {
  position: relative; height: 100%; min-height: 460px;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  border-radius: 6px; overflow: hidden;
  background: radial-gradient(circle at 50% 100%, #0d2a4a 0%, #061426 70%);
}
/* 网格背景：模拟 3D 视口的透视网格 */
.grid-bg {
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(0deg, rgba(54,226,255,.07) 0 1px, transparent 1px 34px),
    repeating-linear-gradient(90deg, rgba(54,226,255,.07) 0 1px, transparent 1px 34px);
  /* 透视变形，营造"地面往远处延伸"的感觉 */
  transform: perspective(400px) rotateX(48deg) scale(1.6);
  transform-origin: center bottom;
}

/* 楼层堆叠：从上往下画（CSS 里先出现的高，用 column-reverse 翻转） */
.building {
  position: relative; z-index: 2;
  display: flex; flex-direction: column-reverse;   /* 让 1F 在底部 */
  gap: 2px; margin-bottom: 40px;
}
.floor {
  width: 150px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(45,120,200,.5);
  background: rgba(20,50,85,.35);          /* 未完工：暗 */
  border-radius: 2px;
  transition: all .3s;
}
.floor.done {
  background: linear-gradient(90deg, rgba(54,226,255,.28), rgba(31,111,235,.28));
  border-color: rgba(54,226,255,.8);
  box-shadow: 0 0 8px rgba(54,226,255,.25);
}
.floor.doing {
  background: linear-gradient(90deg, rgba(255,209,102,.28), rgba(250,173,20,.22));
  border-color: rgba(255,209,102,.9);
  animation: pulse 1.8s ease-in-out infinite;   /* 施工中的楼层"呼吸"闪烁 */
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(255,209,102,.3); }
  50%      { box-shadow: 0 0 16px rgba(255,209,102,.7); }
}
.floor .fnum { font-size: 11px; color: #9ecbff; }
.floor.done .fnum { color: #e8f6ff; }
.floor.doing .fnum { color: #ffd166; }

.bim-tip {
  position: absolute; left: 0; right: 0; bottom: 12px; z-index: 3;
  text-align: center; font-size: 12px; color: #6b8db0;
}

/* 信息列表 */
.info-list { list-style: none; margin: 0; padding: 0; }
.info-list li {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 4px; font-size: 13px;
  border-bottom: 1px solid rgba(45,120,200,.18);
}
.info-list .k { color: #6b8db0; }
.info-list .val { color: #cfe8ff; text-align: right; }
.info-list .val.hl { color: #36e2ff; font-weight: bold; font-size: 15px; }

.api-hint { margin: 12px 0 0; font-size: 12px; color: #6b8db0; font-family: monospace; }

.desc { margin: 0 0 10px; font-size: 13px; color: #9ecbff; line-height: 1.7; }
.steps { margin: 0; padding-left: 0; list-style: none; }
.steps li { font-size: 12px; color: #6b8db0; line-height: 2; }
</style>
