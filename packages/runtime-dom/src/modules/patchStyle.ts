

export function patchStyle(el,oldStyle,newStyle) {
    // 获取当前对象的样式属性
    let style= el.style

    // {style={color:'red'}}
    // =>
    // {style={backgroud:'white'}}

    // 遍历新样式
    for (const key in newStyle) {
        // 将新样式全部加入
        style[key] = newStyle[key]
    }

    // 判断旧样式是否存在
    if (oldStyle) {
        // 遍历旧样式
        for (const key in oldStyle) {
            // 若旧样式有 而新样式没有
            // => 清除此央视
            if (newStyle) {
                if (newStyle[key] === null) {
                style[key]=null
                }
            }
        }
    }
}