
export function patchClass(el,newClass) {
    // 判断新类是否为空
    if (newClass===null) {
        // 若为空
        // 移除类属性
        el.removeAttribute('class')
    } else {
        // 添加新类
        // 此时会自动覆盖旧类
        // class = 'a'
        el.className=newClass
    }
}