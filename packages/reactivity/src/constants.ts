// 用于保存标识符

// 代理标记
export enum ReactiveFlags{
    IS_REACTIVE="__v_isReactive",
}

// 标记是否为脏值
export enum DirtyLevel{
    Dirty = 4, //脏值 => 取值时 需要运行计算属性
    NoDirty = 0 // 不脏 => 取值时 返回缓存值
}