<template>
  <div class="page">
    <h1>报警管理</h1>

    <!-- ① 统计卡：直接读 store 的 getter -->
    <div class="stats">
      <div class="stat-card">
        <div class="v">{{ store.total }}</div>
        <div class="l">报警总数</div>
      </div>
      <div class="stat-card urgent">
        <div class="v">{{ store.urgentCount }}</div>
        <div class="l">紧急报警</div>
      </div>
      <div class="stat-card warn">
        <div class="v">{{ store.unhandledCount }}</div>
        <div class="l">待处理</div>
      </div>
    </div>

    <!-- ② 筛选区：双向绑定到 store 的筛选条件，@change 触发重新拉取 -->
    <div class="filters">
      <label>级别
        <select v-model="store.filterLevel" @change="store.fetchAlarms()">
          <option value="">全部</option>
          <option value="urgent">紧急</option>
          <option value="important">重要</option>
          <option value="normal">一般</option>
        </select>
      </label>
      <label>类型
        <select v-model="store.filterType" @change="store.fetchAlarms()">
          <option value="">全部</option>
          <option value="safety">安全</option>
          <option value="quality">质量</option>
          <option value="env">环境</option>
          <option value="device">设备</option>
        </select>
      </label>
      <label>状态
        <select v-model="store.filterHandled" @change="store.fetchAlarms()">
          <option value="">全部</option>
          <option value="false">只看未处理</option>
        </select>
      </label>
      <button class="btn-reset" @click="onReset">重置筛选</button>
    </div>

    <!-- ③ 数据表格 -->
    <table class="tbl">
      <thead>
        <tr>
          <th style="width:44px">
            <!-- 全选：勾了就把所有 id 加进 selected -->
            <input type="checkbox" :checked="allChecked" @change="toggleAll" />
          </th>
          <th style="width:90px">级别</th>
          <th style="width:90px">类型</th>
          <th>内容</th>
          <th style="width:170px">时间</th>
          <th style="width:100px">状态</th>
          <th style="width:100px">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in store.list" :key="a.id">
          <td>
            <!-- 单条勾选：v-model 绑定到 selected 数组，存的是 id -->
            <input type="checkbox" :value="a.id" v-model="selected" />
          </td>
          <td><span class="tag" :class="a.level">{{ levelText(a.level) }}</span></td>
          <td>{{ typeText(a.type) }}</td>
          <td class="msg">{{ a.message }}</td>
          <td class="time">{{ fmtTime(a.create_at) }}</td>
          <td>
            <span v-if="a.is_handled" class="done">已处理</span>
            <span v-else class="todo">待处理</span>
          </td>
          <td>
            <button v-if="!a.is_handled" class="btn-sm" @click="store.handleOne(a.id)">处理</button>
            <span v-else class="muted">—</span>
          </td>
        </tr>
        <!-- 没数据时提示 -->
        <tr v-if="!store.loading && store.list.length === 0">
          <td colspan="7" class="empty">暂无数据</td>
        </tr>
      </tbody>
    </table>

    <!-- ④ 批量操作条：只在有勾选时出现 -->
    <div v-if="selected.length" class="batch">
      已选 {{ selected.length }} 条
      <button class="btn-batch" @click="onBatchHandle">批量处理</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAlarmStore } from '../stores/alarm'      // 导入刚才建的仓库

const store = useAlarmStore()                        // 拿到仓库实例（所有页面共用同一份）
const selected = ref([])                             // 当前勾选的报警 id 数组

// 是否全选：已选数量 === 列表长度，且列表非空
const allChecked = computed(() =>
  store.list.length > 0 && selected.value.length === store.list.length
)

// 全选 / 取消全选
function toggleAll(e) {
  selected.value = e.target.checked ? store.list.map(a => a.id) : []   // 勾上=取所有 id，取消=清空
}

// 英文 → 中文 的映射函数
function levelText(level) {
  return { urgent: '紧急', important: '重要', normal: '一般' }[level] || level
}
function typeText(type) {
  return { safety: '安全', quality: '质量', env: '环境', device: '设备' }[type] || type
}

// 格式化时间：把 ISO 字符串转成"09-28 10:00"
function fmtTime(s) {
  const d = new Date(s)                                       // 转成 Date 对象
  const p = n => String(n).padStart(2, '0')                   // 补零：9 → "09"
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 重置筛选：清空条件 → 重新拉取 → 清空勾选
async function onReset() {
  store.resetFilters()
  await store.fetchAlarms()
  selected.value = []
}

// 批量处理：调 store，然后清空勾选
async function onBatchHandle() {
  await store.handleMany(selected.value)
  selected.value = []
}

// 页面进入时拉取数据
onMounted(() => {
  store.fetchAlarms()
})
</script>

<style scoped>
/* 页面容器：padding-top 避开左上角菜单按钮 */
.page { padding: 70px 30px 30px; color: #fff; min-height: 100vh; background: #06121f; }
.page h1 { color: #36e2ff; margin-bottom: 20px; font-size: 26px; }

/* ===== 统计卡 ===== */
.stats { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-card {
  flex: 1; padding: 16px 20px; text-align: center;
  background: linear-gradient(180deg, rgba(16,42,74,.92), rgba(8,24,46,.92));
  border: 1px solid rgba(45,120,200,.4); border-radius: 8px;
}
.stat-card .v { font-size: 32px; font-weight: bold; color: #36e2ff; }
.stat-card .l { font-size: 13px; color: #9ecbff; margin-top: 4px; }
.stat-card.urgent .v { color: #ff4d4f; }     /* 紧急：红 */
.stat-card.warn .v { color: #faad14; }       /* 待处理：橙 */

/* ===== 筛选区 ===== */
.filters { display: flex; align-items: center; gap: 18px; margin-bottom: 14px; font-size: 14px; color: #9ecbff; }
.filters select {
  background: rgba(10,30,55,.9); color: #cfe8ff; margin-left: 6px;
  border: 1px solid rgba(45,120,200,.5); border-radius: 4px; padding: 4px 8px; outline: none;
}
.btn-reset, .btn-batch, .btn-sm {
  background: rgba(54,226,255,.15); color: #36e2ff;
  border: 1px solid rgba(54,226,255,.5); border-radius: 4px;
  padding: 4px 14px; font-size: 13px; cursor: pointer;
}
.btn-reset:hover, .btn-batch:hover, .btn-sm:hover { background: rgba(54,226,255,.3); }
.btn-sm { padding: 2px 10px; font-size: 12px; }

/* ===== 表格 ===== */
.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl th, .tbl td { padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(45,120,200,.18); }
.tbl th { color: #9ecbff; font-weight: normal; background: rgba(16,42,74,.6); }
.tbl tbody tr:hover { background: rgba(54,226,255,.05); }

.tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag.urgent { background: #ff4d4f; color: #fff; }
.tag.important { background: #faad14; color: #000; }
.tag.normal { background: #52c41a; color: #000; }

.msg { color: #cfe8ff; }
.time { color: #6b8db0; font-variant-numeric: tabular-nums; }
.done { color: #52c41a; }
.todo { color: #faad14; }
.muted { color: #4a6a8a; }
.empty { text-align: center; color: #6b8db0; padding: 40px 0; }

/* ===== 批量操作条 ===== */
.batch {
  margin-top: 16px; padding: 12px 18px; border-radius: 8px;
  display: flex; align-items: center; gap: 16px;
  background: rgba(16,42,74,.9); border: 1px solid rgba(54,226,255,.35);
  color: #9ecbff; font-size: 14px;
}
</style>
