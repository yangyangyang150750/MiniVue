import { proxyRefs, reactive } from "@vue/reactivity"
import { hasOwn, isFunction, ShapeFlags } from "@vue/shared"

// 1、创建组件
export function createComponentInstance(vnode,parent) {
    // 1、解构当前组件虚拟节点
    // 解构出状态(数据)、 render方法 、props
    const {data=()=>{},render,props:propsOption=()=>{}}= vnode.type // 注意是 从.type上解构
    // 2、将data包裹为响应式
    // data方法执行 返回一个对象 对此对象包裹为响应式
    const ReactiveData=reactive(data())
    // 3、 创建组件实例对象
    const instance = {
        data:ReactiveData, // 数据
        vnode, // 保存当前组件对应的虚拟节点
        isMounted:false,    // 标记是否挂载
        subTree:null,   // 保存子树 真正需要渲染的虚拟节点
        update:null,     // 保存当前组件的更新函数
        props:{},     // 保存当前组件的props
        attrs:{},     // 保存当前组件的attrs
        propsOption,    // 保存当前组件声明接受的属性
        component:null,  // 保存当前组件实例对象对应的组件
        proxy:null,     // 保存对当前组件的props attrs 以及 data的代理
        render:null,     //
        setupState:null, //保存setup返回的数据
        slots:null,   //保存插槽
        exposed:null,
        parent,
        ctx: {} as any, // 若是keepalive组件 就将dom api 放入此属性中
        provides:parent?parent.provides:Object.create(null)
    }
    // 4、返回实例对象
    return instance
}


// 初始化组件属性方法
const initProps=(instance,rawProps)=>{
    // 保存props 和 attrs
    const props ={}
    const attrs ={}
    
    // 保存用户声明接收的属性
    const propsOption = instance.propsOption
    // 遍历用户传入的属性
    if (rawProps) {
        for (const key in rawProps) {
            // 判断组件是否声明接收此属性
            if (key in propsOption ) {
                // 若组件声明接受此属性
                // 则将此属性加入props中
                props[key]=rawProps[key]  
            } else {
                // 若组件未声明接收此属性
                // 则将此属性加入attrs中
                attrs[key] = rawProps[key]
            }
        }
    }
    // 将当前收集的props attrs
    // 保存到组件实例身上
    instance.props = reactive(props)  // props 需要包裹为响应式对象
    instance.attrs = attrs
}

// 初始化插槽方法
const initSlots=(instance,children)=>{
    if (children | ShapeFlags.SLOTS_CHILDREN) {
        // 若是插槽
        instance.slots=children
    } else {
        // 否则
        instance.slots={}
    }
}

// 公共属性
const publicProperty = {
    $attrs:(instance)=>instance.attrs,
    $slots:(instance)=>instance.slots
    // ....
}

// 创建代理回调
const handler={
        get(target,key){
            // 解构当前实例 取出props data setupState
            const {props,data,setupState}=target
            if ( data && hasOwn(data,key) ) {
                // 若state有key属性
                return data[key]
            } else if (props && hasOwn(props,key)) {
                // 若props有key属性
                return props[key]
            }else if (setupState && hasOwn(setupState,key)) {
                // 若setupState有key属性
                return setupState[key]
            }
            // 若props 和 data 都没有
            // 则去$attrs $slot.. 身上找
            const getter = publicProperty[key]
            if (getter) {
                return getter(target)
            }
        },
        set(target,key,value){
            // 解构实例
            const {data,props,setupState} = target
            if (data && hasOwn(data,key)) {
                data[key]=value
                return true
            } else if(props && hasOwn(props,key)){
                console.warn('props 属性不可修改');
                return false
            }else if(setupState && hasOwn(setupState,key)) {
                setupState[key]=value
                return true
            }
        }
}
    


// 2、初始化组件
export function setupComponent(instance) {
    //解构出vnode
    const { vnode } = instance
    // 1、初始化组件属性
    // 将propsOption => props和attrs
    // 将用户传入的属性 变为 声明接收的响应式属性 以及 默认的属性
    initProps(instance,vnode.props)
    
    // 2、初始化插槽 
    initSlots(instance,vnode.children)

    // 2、创建代理属性
    // 用于代理props data attrs
    instance.proxy=new Proxy(instance,handler)


    // 3、给组件实例添加data属性
    // 解构出data render setup
    const { data=()=>{},render,setup } = vnode.type

    // 判断是否有setup
    if (setup) {
        // 如果有setup

        // 1、创建上下文
        const setupContext ={
            slots:instance.slots,
            attrs:instance.attrs,
            expose(value){
                instance.exposed = value
            },
            emit(event,...payload){
                // 获取事件名
                // onMyEvent => myEvent
                const eventName = `on${event[0].toUpperCase()+event.slice(1)}`

                // 获取对应回调函数
                const handler = instance.vnode.props[eventName]

                // 若存在 则执行
                handler&&handler(...payload) 
            }
        }

        // 2、执行setup 获取setup返回结果
        // 执行setup之前 将当前实例放在全局
        setCurrentInstance(instance)
        const setupResult = setup(instance.props,setupContext)
        // 执行setup之吼 将全局实例置空
        setCurrentInstance(null)

        // 3、判断setup返回值类型
        if (isFunction(setupResult)) {
            // 若是函数
            // => 返回的就是render方法
            instance.render = setupResult
        } else {
            // 若不是函数 则为对象
            // => 保存此对象数据
            instance.setupState = proxyRefs(setupResult)   // 自动脱ref
        }
    }

    // 判断当前data是否为函数式
    if (!isFunction(data)) {
        // 若不是 则打印错误信息
        console.warn('data option must be a function');
    }else{
        // 给组件添加data属性
        // 同时将其包裹为响应式 并且更改this指向  使其可以访问到其他属性
        instance.data = reactive(data.call(instance.proxy))
    }
    // 4、给组件实例添加render属性
    if (!instance.render) {
        instance.render = render
    }
}

export let currentInstance =null
export const getCurrentInstance=()=>{
    return currentInstance
}
export const setCurrentInstance=(instance)=>{
    currentInstance= instance
}