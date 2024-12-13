import { getCurrentInstance } from "./component";

export function inject(key,defaultValue) {
    // 例：const name = inject('name')
    // 例：const name = inject('name','ywh')
    // 1、判断当前provide 是否写在组件内部
    let currentInstance = getCurrentInstance()
    if (!currentInstance) return
    // 2、判断父组件上是否提供了此属性
    const parentProvides = currentInstance.parent?.provides
    if (parentProvides && key in parentProvides) {
        // 父组件上提供了此属性
        return parentProvides[key]
    }else if(defaultValue){
        return defaultValue
    }
}

export function provide(key,value) {
    // 例：provide('name',state.name)

    // 因为provide 将属性挂载至组件身上
    // 所以 先判断当前provide 是否写在组件内部 
    // 1、判断当前provide 是否写在组件内部
    let currentInstance = getCurrentInstance()
    // 若当前组件实例为空 说明未写在组件内部 
    // =>   直接返回
    if (!currentInstance)  return

    // 2、获取子组件和父组件的provide
    // * * * * * * * * * * * * * * * * * *
    // 当前组件第一次的provides 一定来自于父组件的provides(当父组件存在时)
    // => 直接拷贝一份 作为自己的provides
    // =>   下次当前组件调用provide()时 获取的就是自己的provides
    // =>   避免重复创建provides,也避免交叉影响
    // * * * * * * * * * * * * * * * * * *
    let provides = currentInstance.provides
    const parentProvides = currentInstance.parent&&currentInstance.parent.provides
    // 判断二者是否相等
    if (provides === parentProvides) {
        // 若相等
        // 将父组件provides 拷贝一份
        // =>   避免子组件修改provides 影响父组件
        provides =(currentInstance.provides = Object.create(parentProvides))
    }

    // 3、赋值
    provides[key]=value
}