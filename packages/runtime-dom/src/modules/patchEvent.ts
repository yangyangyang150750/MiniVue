// 创建invoker方法
// fn=f1 => fn=f2
// invoker = ()=>fn()
function createInvoker(value){
    const invoker = (e)=>invoker.value(e)
    invoker.value = value   // 更改invoker内的value属性 可实现修改对应调用函数
    return invoker
}
export function patchEvent(el,name,newValue) {
    // 1、获取事件名
    const eventName = name.slice(2).toLowerCase()

    // 2、绑定事件
    // 创建缓存,用于记录当前元素绑定的事件及回调方法 
    // vei => vue-event-invoker
    const invokers = el._vei||(el._vei={})
    // 查看当前缓存 是否已经缓存过此事件
    const existingInvoker = invokers[name]

    // 若缓存过 且有新值
    // =>  更改invoker的value属性 让其指向新值
    if (existingInvoker && newValue) {
        // 换绑事件
        return existingInvoker.value = newValue
    }
    // 若未缓存过 但有新值
    // => 创建invoker回调 并且缓存
    if (newValue) {
        // 创建invoker 并且缓存
        const invoker =(invokers[name]=createInvoker(newValue))
        // 给当前元素绑定事件以及回调
        el.addEventListener(eventName,invoker)
    } 
    // 若缓存过 但新值为空
    if (existingInvoker) {
        // 清除绑定事件
        el.removeEventListener(eventName,existingInvoker)
        // 清除缓存
        invokers[name]=undefined
    }
}