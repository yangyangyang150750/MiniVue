
import { getCurrentInstance } from "./component"
import { onMounted,onUpdated } from "./apiLifeCycle"
import { ShapeFlags } from "@vue/shared"

export const KeepAlive = {
    // 标识
    __isKeepAlive:true,
    // 接收属性
    props:{
        max:Number
    },
    setup(props,{slots}){
        const {max} =props
        // 用于记录哪些组件缓存过
        const keys = new Set()   
        // 创建缓存表
        // <keep-alive key='a'>
        //      <xxx>  </xxx>
        // <keep-alive>
        const cache = new Map()
        // 保存待缓存组件的key值
        let pendingCacheKey = null
        // 获取当前组件实例
        const instance = getCurrentInstance()

        
        // 缓存
        const cacheSubtree = ()=>{
            // 缓存key值 与 对应的dom元素
            cache.set(pendingCacheKey,instance.subTree)
        }


        const {move,createElement,unmount:_unmount} = instance.ctx.renderer
        // 此处是keepalive特有的初始化方法
        // 激活时执行
        instance.ctx.activate=function (vnode,container,anchor) {
            move(vnode,container,anchor)
        }
        // 卸载时执行
        // 创建存储容器 
        const storageContent = createElement('div')
        instance.ctx.deactivate=function (vnode) {
            move(vnode,storageContent,null)   // 将当前dom元素移动至存储容器
        }

        // 删除标志信息
        function reset(vnode){
            let shapeFlag = vnode.shapeFlag

            // 删除标志信息
            if (shapeFlag&ShapeFlags.COMPONENT_KEPT_ALIVE) {
                shapeFlag-=ShapeFlags.COMPONENT_KEPT_ALIVE
            }
            if (shapeFlag&ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
                shapeFlag-=ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
            }

            vnode.shapeFlag=shapeFlag
        }

        // 删除dom元素
         function  unmount(cached){
            //删除标志信息
            reset(cached)
            // 调用删除方法
            _unmount(cached)
         }
        // 清除缓存
        function purneCacheEntry(key) {
            keys.delete(key)

            // 获取缓存的结果
            const cached = cache.get(key)

            // 删除dom元素
            unmount(cached)
        }

        // 当当前keepLive挂载完成时
        onMounted(cacheSubtree)
        // 当当前keepLive更新完成时
        onUpdated(cacheSubtree)


        return ()=>{

            // 获取真正要渲染的虚拟节点
            const vnode = slots.default()

            // 获取key值
            const comp = vnode.type
            const key = vnode.key===null?comp:vnode.key
            // 先保存当前key值
            pendingCacheKey=key

            // 根据当前key 查找缓存表
            const cacheVNode = cache.get(key)
            if (cacheVNode) {
                // 若有缓存
                // 复用组件 避免重复创建
                vnode.component = cacheVNode.component
                // 标识当前虚拟节点为keepalive组件
                // => 使得当前虚拟节点可以不用再进行初始化操作
                vnode.shapeFlag|=ShapeFlags.COMPONENT_KEPT_ALIVE

                // 将当前key值放在最末尾 标识当前读取了key
                // 用于配合LRU算法
                keys.delete(key)
                keys.add(key)
            } else {
                // 若无缓存
                // 将当前key值缓存
                keys.add(key)
                // 当前虚拟节点对应的组件 等到其渲染完成后再去缓存
                
                // 判断当前是否超出缓存限额
                if (max && keys.size > max) {
                    // 若超出
                    // 调用方法 删除第一个
                    purneCacheEntry(keys.keys().next().value)
                }
            }

            // 当前元素不不需要卸载 只要调用deactivate方法 存入指定容器就好
            vnode.shapeFlag|=ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
            return vnode
        }
    }
}
export const isKeepAlive =(value)=>value.type.__isKeepAlive