import { currentInstance, setCurrentInstance } from "./component"

export enum LifecycleHooks{
    BEFORE_MOUNT='bm',
    MOUNTED='m',
    BEFORE_UPDATE='bu',
    UPDATED='u',
}

// bm=[]
// m =[]
// bu=[]
// u =[]

// 利用工厂模式
function createHook(type) {
    // type => 当前hook存放到哪
    // hook => 用户传递的钩子回调
    return (hook,target=currentInstance)=>{
        console.log(hook,target);
        // 判断当前实例是否存在
        // 因为生命周期钩子只能在组件内部使用
        if (target) {
            // 生命周期钩子 必须在setup中使用
            const hooks = target[type] ||(target[type]=[])
            
            // 将包裹后的hook加入数组
            // 利用闭包机制 保存当前target 使得后续调用钩子时 不丢失对应实例
            const wrapperHooks=()=>{
                // 将当前实例放在全局
                setCurrentInstance(target)
                // 执行hook
                hook.call(target)
                // 清空全局实例
                setCurrentInstance(null)
            }
            hooks.push(wrapperHooks)
        }
    }
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)


export const invokeArr =(arr)=>{
    arr.forEach(hook =>hook());
}