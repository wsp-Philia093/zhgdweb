import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue' 
import CraneView from '../views/CraneView.vue'   
import EnvView from '../views/EnvView.vue'
import AlarmView from '../views/AlarmView.vue'         
import PersonnelView from '../views/PersonnelView.vue'  
import VehicleView from '../views/VehicleView.vue'      
import ProgressView from '../views/ProgressView.vue'    
import MapView from '../views/MapView.vue' 
// ---- P4 占位模块 ----
import VideoView from '../views/VideoView.vue'          
import BimView from '../views/BimView.vue'              
import FaceView from '../views/FaceView.vue'            

const routes = [                                 
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: DashboardView },           
  { path: '/cranes', component: CraneView },     
  { path: '/env', component: EnvView }, 
  { path: '/alarm', component: AlarmView },            
  { path: '/personnel', component: PersonnelView },     
  { path: '/vehicle', component: VehicleView },         
  { path: '/progress', component: ProgressView },       
  { path: '/map', component: MapView },   
  // ---- P4 占位模块（轻占位：界面示意 + 预留接口） ----
  { path: '/video', component: VideoView },              
  { path: '/bim', component: BimView },                  
  { path: '/face', component: FaceView },                
]

const router = createRouter({                   
  history: createWebHistory(),                  
  routes,                                       
})

export default router  