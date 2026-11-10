// ============================================================
// 接口集合：把后端每个接口包装成一个"有名字的函数"
// 页面里调用 getCranes() 比写 request.get('/cranes/') 更好懂
// 所有路径都不用再写 http://127.0.0.1:8000/api 前缀，request 已带
// ============================================================
import request from './request'   // 导入上面那条统一通道

// ---------- 塔吊 ----------
export const getCranes = () => request.get('/cranes/')              // 拉全部塔吊

// ---------- 环境 ----------
// hours 可选：传 24 就是"近 24 小时"，不传就是全部
export const getEnvs = (hours) => request.get('/envs/', { params: { hours } })

// ---------- 报警 ----------
// filters 是个对象，例如 { level: 'urgent', is_handled: false }
// axios 会把 params 自动拼成 ?level=urgent&is_handled=false
export const getAlarms = (filters = {}) => request.get('/alarms/', { params: filters })
// 处理某条报警（写回后端把它标记为已处理）
export const markAlarmHandled = (id) => request.post(`/alarms/${id}/mark_handled/`)

// ---------- 人员 ----------
export const getWorkers = () => request.get('/workers/')            // 拉全部人员

// ---------- 新增的几张表 ----------
export const getEntryLogs = () => request.get('/entrylogs/')        // 人员进出记录
export const getInspections = () => request.get('/inspections/')    // 隐患巡检
export const getVehicles = () => request.get('/vehicles/')          // 车辆进出
export const getThresholds = () => request.get('/thresholds/')      // 阈值配置

export const getProgress = () => request.get('/progress/')          // 项目进度

// ---------- P4 占位模块（后端返回写死的配置，将来接真实设备） ----------
export const getCameras = () => request.get('/cameras/')            // 视频监控清单
export const getBim = () => request.get('/bim/')                    // BIM 模型元信息
export const getFace = () => request.get('/face/')                  // 人脸闸机统计
