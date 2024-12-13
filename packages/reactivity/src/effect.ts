import { DirtyLevel } from "./constants"

// 清除effect的依赖
const preCleanEffect = (effect)=>{
    // 记录与当前effect绑定的属性的 数组deps 长度清零
    effect._depsLength=0
    // 当前effect执行次数+1
    effect._trackId++
}

// 清除当前effect多余的属性依赖
const postCleanEffect = (effect)=>{
    // 旧：[flag,name,a,b,c]
    // 新：[flag]       => effect._depsLength =1

    // 判断是否有多余依赖
    if (effect.deps.length > effect._depsLength) {
        // 若有
        // 循环删除
        for(let i =effect._depsLength;i<effect.deps.length;i++ ){
            // 调用删除effect方法
            cleanDepEffect(effect.deps[i],effect)
        }
        //更新依赖列表长度
        effect.deps.length = effect._depsLength
    }
}

// effect 方法
export function effect(fn,options?) {
    // fn为用户传入的函数
    // options为配置对象，例如watch里的lazy
    // 例：effect(()=>{
    //      document.querySelector('#id').innerHTML=proxyObj.name
    //      })
    
    // 创建响应式effect对象
    // fn为用户传入的函数
    // 第二个参数是scheduler 当fn所依赖的变量发生变化时的回调函数
    // 例：
    // 在上面的例子中，fn依赖的变量是proxyObj.name
    // 当proxyObj.name 后续改变时 会触发_effect的scheduler回调
    const _effect=new ReactiveEffect(fn,()=>{
        // 默认回调方法
        _effect.run()
    })

    // 判断用户是否传入scheduler
    if (options) {
        // 若传入
        // 利用assign方法 覆盖默认的scheduler
        Object.assign(_effect,options)
    }

    // effect会默认执行一次
    _effect.run()

    // 将run方法暴露
    let runner = _effect.run.bind(_effect)
    runner.effect = _effect
    // 将响应式effect对象返回
    return runner
}

// 全局effect
export let activeEffect

// 记录父effect
// 可用于处理effect嵌套的情况
let lastEffect 



// 将dep依赖表中的当前effect清除
const cleanDepEffect=(dep,effect)=>{
    // 清除当前effect
    dep.delete(effect)
    // 若当前dep依赖表为空 则删除此表
    if (dep.size ===0) {
        dep.cleanup()
    }
}
// 创建响应式effect对象
export class ReactiveEffect{
    // 标记当前是否在运行
    _running=0      // 用于避免死循环
    // 记录当前effect执行了几次
    _trackId = 0
    // 记录与当前effect绑定的属性
    deps=[]
    _depsLength=0
    // 表示是否是脏的 即是否需要重新执行计算属性
    _dirtyLevel = DirtyLevel.Dirty  // 默认为脏数据
    // 标识当前effect是否为响应式
    public active = true 
    // 构造函数
    constructor(public fn,public scheduler){
    }
    // 获取当前是否为脏数据方法
    public get dirty(){
        return this._dirtyLevel === DirtyLevel.Dirty
    }
    // 设置当前为脏数据方法
    public set dirty(v){
        this._dirtyLevel = v?DirtyLevel.Dirty:DirtyLevel.NoDirty
    }
    // run方法
    run(){
        // 每次运行后 当前数据就为干净数据
        this._dirtyLevel=DirtyLevel.NoDirty
        // 判断当前effect是否为响应式
        if (!this.active) {
            // 若不是响应式
            // 直接执行函数即可
            return this.fn()
        }
        // 若是响应式
        try {
            // 1、将上一个effect作为父effect
            lastEffect = activeEffect
            // 2、将当前effect挂载至全局
            activeEffect=this
            // 3、清除当前effect的依赖
            preCleanEffect(this)
            // 4、执行fn方法
            this._running++
            return this.fn()
        } finally{
            postCleanEffect(this)
            // 将父effect挂载至全局
            activeEffect=lastEffect
            this._running--
        }
    }
    // stop方法
    stop(){
        if (this.active) {
            this.active=false
            preCleanEffect(this)
            postCleanEffect(this)
        }
    }
}

// 依赖收集
export const trackEffect = (effect,dep)=>{
    // 参数effect 为当前effect
    // 参数dep 为属性与effect的映射表

    /*
        优化后 
        当effect中重复出现某一属性时
        可以避免同一属性 多次收集同一effect
    */
    // 优化后：
    if (dep.get(effect) !== effect._trackId) {
        // 若是第一次收集依赖 
        // dep.get(effect) 为undefined

        // 1、映射表记录当前effect以及其执行次数
        dep.set(effect,effect._trackId)     // 更新id

        // 2、当前effect记录与其绑定的属性的dep
        // * * * * * 简易diff算法 * * * * *
        // 2-1 获取旧dep值
        let oldDep =effect.deps[effect._depsLength]
        // 2-2 判断新旧dep值是否相同
        if (oldDep != dep) {
            // 若不同
            // 2-3 判断旧dep是否有值
            if (oldDep) {
                // 若有值 则删除旧dep
                cleanDepEffect(oldDep,effect)
            }
            // 2-4 替换新dep
            effect.deps[effect._depsLength++]= dep
        }else{
            // 若相同
            effect._depsLength++
        }
    } 

    // 优化前：
    // 1、映射表记录当前effect以及其执行次数
    // dep.set(effect,effect._trackId)
    // 2、当前effect记录与其绑定的属性的dep
    // effect.deps[effect._depsLength++]=dep  
}

// 激活依赖
export const triggerEffects = (dep)=>{
    // 参数dep为当前属性的effect依赖
    // 此时 让这些effect依次执行就可
    for(let effect of dep.keys()){
        // 判断当前effect是否为脏
        if (effect._dirtyLevel < DirtyLevel.Dirty) {
            // 若是干净数据， 则将其变为脏
            effect._dirtyLevel = DirtyLevel.Dirty
        }

        // 调用effect的回调方法
        if (effect.scheduler) {
            // 当前effect执行完毕 才可执行
            if (!effect._running) {
                effect.scheduler() 
            }
        }
    }
}