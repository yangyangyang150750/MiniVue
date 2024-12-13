


// 对于元素的增删改查、查找关系、文本的增删改查

// nodeOps是一个对象 内部包含了对元素、文本的操作
export const nodeOps = {
    // 创建元素操作
    createElement(tagName) {
        // tagName为要创建的元素名称
        // 返回创建出的元素
        return document.createElement(tagName)
    },
    // 插入元素、修改元素操作
    insert(child, parent, anchor) {
        // 将子节点加入父节点中
        // insertBefore方法具有移动性
        //  A B C D => A C B D
        parent.insertBefore(child, anchor || null)  //若anchor为空 此方法等价于 parent.appendChild(child)
    },
    // 移除元素操作
    remove(child) {
        // 1、查找父节点
        let parent = child.parentNode
        // 2、利用父节点方法 删除此节点
        if (parent) {
            parent.removeChild(child)
        }
        
    },
    // 查询元素操作
    querySelector(selector) {
        // selector为查询参数
        // 返回查询结果
        return document.querySelector(selector)
    },

    // 查询节点关系操作
    // 获取父节点
    parent(node) {
        return node.parentNode
    },
    nextSibling(node) {
        return node.nextSibling
    },

    // 文本操作
    // 给节点添加文本
    setElementText(el, text) {
        // 给el元素这是文本内容为text
        el.textContent = text
    },
    // 创建文本节点
    createText(text) {
        // 返回根据文本创建出的节点
        return document.createTextNode(text)
    },
    // 修改文本节点文本内容
    setText(node, text) {
        node.nodeValue = text
    }
}