import { isFunction } from "@vue/shared";
import { ReactiveEffect } from "./effect";
import { trackRefValue, triggerRefValue } from "./ref";

class ComputedRefImpl{
    // 保存旧值
    public _value
    public effect
    // 保存此计算属性的依赖
    public dep
    // 构造器
    constructor(getter,public setter){
        // 我们需要创建effect 用于管理当前计算属性的dirty属性
        this.effect = new ReactiveEffect(
            ()=>getter(this._value),
            ()=>{
                // 计算属性依赖的属性改变时 触发此回调
                // 依赖更新
                triggerRefValue(this) // 重新执行此计算属性绑定的effect
            }
        )
    }
    get value(){
        // 取值时
        // 收集依赖
        trackRefValue(this)
        // 判断当前计算属性是否为脏数据
        if (this.effect.dirty) {
            // 若是脏数据
            // => 执行effect,缓存执行结果,并将结果返回
            this._value = this.effect.run()  // 每次run时，会将当前计算属性变为干净数据
        }
        // => 返回缓存结果
        return this._value
    }
    set value(newValue){
        // 调用ref的setter方法
        this.setter(newValue)
    }


}

// computed方法
export function computed(getterOrOptions) {
    // 注意！！
    // 由于computed有对象式和函数式写法
    // 所以 参数可能为函数或对象
    // => 需要分情况讨论

    // 1、实现getter和setter方法
    // 记录getter和setter方法
    let getter
    let setter
    // 标识当前参数是否为函数
    let onlyGetter = isFunction(getterOrOptions)
    // 判断onlyGetter的值
    if (onlyGetter) {
        // 若当前参数为函数
        getter = getterOrOptions    // 当前参数即为getter方法
        setter = ()=>{}     // setter为空函数
    }else{
        // 若当前参数为对象
        getter = getterOrOptions.get
        setter = getterOrOptions.set
    }

    // 2、返回计算属性ref
    return new ComputedRefImpl(getter,setter)
}