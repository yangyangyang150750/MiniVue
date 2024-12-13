import { activeEffect, trackEffect, triggerEffects } from "./effect"
import { toReactive } from "./reactive"
import { createDep } from "./reactiveEffect"

// 判断是否为ref方法
export function isRef(value) {
    return !!(value && value.__v_isRef)
}

// ref 方法
export const ref =(value)=>{
    // 调用创建ref方法
    return createRef(value)
}

// 创建ref方法
const createRef = (value)=>{
    // 返回一个RefImpl实例对象
    return new RefImpl(value)
}

// RefImpl 类
export class RefImpl{
    // 表示当前对象为ref实例对象
    __v_isRef=true
    // 用于保存当前ref的值
    _value = undefined
    // 保存当前对象的依赖
    dep
    // 构造器
    constructor(public rawValue){
        // 若rawValue 则将其转换为reactive对象
        this._value=toReactive(rawValue)
    }
    // get方法
    get value(){
        // 依赖收集
        trackRefValue(this)
        return this._value
    }
    // set方法
    set value(newValue){
        // 判断当前新值与旧值是否相同
        if (newValue !== this.rawValue) {
            // 不同 才需要更新
            this.rawValue=newValue  //更新
            this._value=newValue
            // 依赖更新
            triggerRefValue(this)
        }
    }
}

// 依赖收集
export const trackRefValue = (ref)=>{
    // 只有在effect 中
    // 才需要依赖收集
    if (activeEffect) {
        // 调用收集依赖方法
        trackEffect(activeEffect,(ref.dep = ref.dep||createDep(()=>ref.dep=undefined)))
    }
}

// 依赖更新
export const triggerRefValue = (ref)=>{
    let dep = ref.dep
    if (dep) {
        // 调用依赖更新方法
        triggerEffects(dep)
    }
}

// ObjectRefImpl对象
class ObjectRefImpl {
    // 表示当前对象为ref实例对象
    public __v_isRef:true
    constructor(public _object,public _key){
    }
    get value(){
        return this._object[this._key]
    }
    set value(newValue){
        this._object[this._key]=newValue
    }
}

// toRef
export function toRef(object,key) {
    // 返回一个ObjectRefImpl对象
    return new ObjectRefImpl(object,key)
}

// toRefs
export function toRefs(object){
    // 保存结果对象
    const res = {}
    // 循环当前对象
    for (let key in object) {
        // 对每个属性都包裹为ref
        res[key]= toRef(object,key)
    }
    console.log(res);
    
    return res
}

// proxyRefs
export function proxyRefs(objectWithRef){
    return new Proxy(objectWithRef,{
        get(target,key,receiver){
            let r = Reflect.get(target,key,receiver)
            return r.__v_isRef?r.value:r    // 实现自动.value
        },
        set(target,key,value,receiver){
            // 获取旧值
            let oldValue = target[key]
            // 判断旧值是否为ref
            if (oldValue.__v_isRef) {
                // 若是ref
                oldValue.value = value
                return true
            }else{
                // 否则
                return Reflect.set(target,key,value,receiver)
            }
        }
    })
}

