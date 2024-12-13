// packages/shared/src/index.ts
function isObject(value) {
  return typeof value === "object" && value != null;
}
function isFunction(value) {
  return typeof value === "function";
}
function isString(value) {
  return typeof value === "string";
}
function isReactive(value) {
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}
var hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn(target, key) {
  return hasOwnProperty.call(target, key);
}

// packages/runtime-core/src/component/Teleport.ts
var Teleport = {
  // 标识是否为teleport组件
  __isTeleport: true,
  remove(vnode, unmountChildren) {
    const { shapeFlag, children } = vnode;
    if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      unmountChildren(children);
    }
  },
  // 组件初始化时 会调用此方法
  process(preVNode, CurVNode, container, anchor, parentComponent, Operators) {
    const { mountChildren, patchChildren, query, move } = Operators;
    if (!preVNode) {
      const target = CurVNode.target = query(CurVNode.props.to);
      if (target) {
        mountChildren(CurVNode.children, target, anchor, parentComponent);
      }
    } else {
      patchChildren(preVNode, CurVNode, preVNode.target, parentComponent);
      CurVNode.target = preVNode.target;
      if (CurVNode.props.to !== preVNode.props.to) {
        const newTarget = CurVNode.target = query(CurVNode.props.to);
        CurVNode.children.forEach((child) => move(child, newTarget, anchor));
      }
    }
  }
};
var isTeleport = (type) => type.__isTeleport;

// packages/runtime-core/src/createVnode.ts
var Text = Symbol("Text");
var Fragment = Symbol("Fragment");
function createVNode(type, props, children, patchFlag) {
  let shapeFlag = isString(type) ? 1 /* ELEMENT */ : isTeleport(type) ? 64 /* TELEPORT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : isFunction(type) ? 2 /* FUNCTIONAL_COMPONENT */ : 0;
  const vnode = {
    // 虚拟节点标识
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key,
    // 用于后续实现diff算法
    shapeFlag,
    ref: props?.ref,
    patchFlag
  };
  if (currentBlock && patchFlag > 0) {
    currentBlock.push(vnode);
  }
  if (children) {
    if (Array.isArray(children)) {
      vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */;
    } else if (isObject(children)) {
      vnode.shapeFlag |= 32 /* SLOTS_CHILDREN */;
    } else {
      children = String(children);
      vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
    }
  }
  return vnode;
}
function isVnode(value) {
  return !!(value && value.__v_isVnode);
}
function isSameVnode(vnode1, vnode2) {
  return vnode1.type === vnode2.type && vnode1.key === vnode2.key;
}
var currentBlock = null;
function openBlock() {
  currentBlock = [];
}
function closeBlock() {
  currentBlock = null;
}
function setupBlock(vnode) {
  vnode.dynamicChildren = currentBlock;
  closeBlock();
  return vnode;
}
function createElementBlock(type, props, children, patchFlag) {
  const vnode = createVNode(type, props, children, patchFlag);
  return setupBlock(vnode);
}
function isDisplayString(value) {
  return isString(value) ? value : value === null ? "" : isObject(value) ? JSON.stringify(value) : String(value);
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  let l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
      if (isVnode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      } else {
        return createVNode(type, propsOrChildren);
      }
    }
    return createVNode(type, null, propsOrChildren);
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    }
    if (l === 3 && isVnode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}

// packages/runtime-core/src/seq.ts
function getSequence(arr) {
  let length = arr.length;
  let result = [0];
  let resultLastIndex;
  let p = arr.slice(0);
  for (let i2 = 0; i2 < arr.length; i2++) {
    let arrI = arr[i2];
    let star;
    let end;
    let middle;
    if (arrI != 0) {
      resultLastIndex = result[result.length - 1];
      if (arrI > arr[resultLastIndex]) {
        result.push(i2);
        p[i2] = resultLastIndex;
      } else {
        star = 0;
        end = result.length - 1;
        while (star < end) {
          middle = (star + end) / 2 | 0;
          if (arr[result[middle]] > arrI) {
            end = middle;
          } else {
            star = middle + 1;
          }
        }
        if (arrI < arr[result[star]]) {
          p[i2] = result[star - 1];
          result[star] = i2;
        }
      }
    }
  }
  let i = result.length;
  let lastIndex = result[i - 1];
  while (i-- > 0) {
    result[i] = lastIndex;
    lastIndex = p[lastIndex];
  }
  return result;
}
getSequence([2, 5, 8, 4, 6, 7, 9, 3]);

// packages/reactivity/src/effect.ts
var preCleanEffect = (effect3) => {
  effect3._depsLength = 0;
  effect3._trackId++;
};
var postCleanEffect = (effect3) => {
  if (effect3.deps.length > effect3._depsLength) {
    for (let i = effect3._depsLength; i < effect3.deps.length; i++) {
      cleanDepEffect(effect3.deps[i], effect3);
    }
    effect3.deps.length = effect3._depsLength;
  }
};
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  if (options) {
    Object.assign(_effect, options);
  }
  _effect.run();
  let runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
var activeEffect;
var lastEffect;
var cleanDepEffect = (dep, effect3) => {
  dep.delete(effect3);
  if (dep.size === 0) {
    dep.cleanup();
  }
};
var ReactiveEffect = class {
  // 构造函数
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    // 标记当前是否在运行
    this._running = 0;
    // 用于避免死循环
    // 记录当前effect执行了几次
    this._trackId = 0;
    // 记录与当前effect绑定的属性
    this.deps = [];
    this._depsLength = 0;
    // 表示是否是脏的 即是否需要重新执行计算属性
    this._dirtyLevel = 4 /* Dirty */;
    // 默认为脏数据
    // 标识当前effect是否为响应式
    this.active = true;
  }
  // 获取当前是否为脏数据方法
  get dirty() {
    return this._dirtyLevel === 4 /* Dirty */;
  }
  // 设置当前为脏数据方法
  set dirty(v) {
    this._dirtyLevel = v ? 4 /* Dirty */ : 0 /* NoDirty */;
  }
  // run方法
  run() {
    this._dirtyLevel = 0 /* NoDirty */;
    if (!this.active) {
      return this.fn();
    }
    try {
      lastEffect = activeEffect;
      activeEffect = this;
      preCleanEffect(this);
      this._running++;
      return this.fn();
    } finally {
      postCleanEffect(this);
      activeEffect = lastEffect;
      this._running--;
    }
  }
  // stop方法
  stop() {
    if (this.active) {
      this.active = false;
      preCleanEffect(this);
      postCleanEffect(this);
    }
  }
};
var trackEffect = (effect3, dep) => {
  if (dep.get(effect3) !== effect3._trackId) {
    dep.set(effect3, effect3._trackId);
    let oldDep = effect3.deps[effect3._depsLength];
    if (oldDep != dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect3);
      }
      effect3.deps[effect3._depsLength++] = dep;
    } else {
      effect3._depsLength++;
    }
  }
};
var triggerEffects = (dep) => {
  for (let effect3 of dep.keys()) {
    if (effect3._dirtyLevel < 4 /* Dirty */) {
      effect3._dirtyLevel = 4 /* Dirty */;
    }
    if (effect3.scheduler) {
      if (!effect3._running) {
        effect3.scheduler();
      }
    }
  }
};

// packages/reactivity/src/reactiveEffect.ts
var targetMap = /* @__PURE__ */ new WeakMap();
var createDep = (cleanup) => {
  let dep = /* @__PURE__ */ new Map();
  dep.cleanup = cleanup;
  return dep;
};
function track(target, key) {
  if (activeEffect) {
    let desMap = targetMap.get(target);
    if (!desMap) {
      targetMap.set(target, desMap = /* @__PURE__ */ new Map());
    }
    let dep = desMap.get(key);
    if (!dep) {
      desMap.set(key, dep = createDep(() => desMap.delete(key)));
    }
    trackEffect(activeEffect, dep);
  }
}
function trigger(target, key, newValue, oldValue) {
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  let dep = depsMap.get(key);
  if (dep) {
    triggerEffects(dep);
  }
}

// packages/reactivity/src/baseHandler.ts
var mutableHandlers = {
  // 读取对象属性时的回调方法
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return true;
    }
    track(target, key);
    let res = Reflect.get(target, key, receiver);
    if (isObject(res)) {
      res = reactive(res);
    }
    return res;
  },
  // 设置对象属性时的回调方法
  set(target, key, value, receiver) {
    let oldValue = target[key];
    let result = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
    }
    return result;
  }
};

// packages/reactivity/src/reactive.ts
function reactive(target) {
  return createReactiveObject(target);
}
var reactiveMap = /* @__PURE__ */ new WeakMap();
function createReactiveObject(target) {
  if (!isObject(target)) {
    return target;
  }
  if (target["__v_isReactive" /* IS_REACTIVE */]) {
    return target;
  }
  const exitsProxy = reactiveMap.get(target);
  if (exitsProxy) {
    return exitsProxy;
  }
  let proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}
function toReactive(obj) {
  return isObject(obj) ? reactive(obj) : obj;
}

// packages/reactivity/src/ref.ts
function isRef(value) {
  return !!(value && value.__v_isRef);
}
var ref = (value) => {
  return createRef(value);
};
var createRef = (value) => {
  return new RefImpl(value);
};
var RefImpl = class {
  // 构造器
  constructor(rawValue) {
    this.rawValue = rawValue;
    // 表示当前对象为ref实例对象
    this.__v_isRef = true;
    // 用于保存当前ref的值
    this._value = void 0;
    this._value = toReactive(rawValue);
  }
  // get方法
  get value() {
    trackRefValue(this);
    return this._value;
  }
  // set方法
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this.rawValue = newValue;
      this._value = newValue;
      triggerRefValue(this);
    }
  }
};
var trackRefValue = (ref2) => {
  if (activeEffect) {
    trackEffect(activeEffect, ref2.dep = ref2.dep || createDep(() => ref2.dep = void 0));
  }
};
var triggerRefValue = (ref2) => {
  let dep = ref2.dep;
  if (dep) {
    triggerEffects(dep);
  }
};
var ObjectRefImpl = class {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
  }
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function toRef(object, key) {
  return new ObjectRefImpl(object, key);
}
function toRefs(object) {
  const res = {};
  for (let key in object) {
    res[key] = toRef(object, key);
  }
  console.log(res);
  return res;
}
function proxyRefs(objectWithRef) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      let r = Reflect.get(target, key, receiver);
      return r.__v_isRef ? r.value : r;
    },
    set(target, key, value, receiver) {
      let oldValue = target[key];
      if (oldValue.__v_isRef) {
        oldValue.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    }
  });
}

// packages/reactivity/src/computed.ts
var ComputedRefImpl = class {
  // 构造器
  constructor(getter, setter) {
    this.setter = setter;
    this.effect = new ReactiveEffect(
      () => getter(this._value),
      () => {
        triggerRefValue(this);
      }
    );
  }
  get value() {
    trackRefValue(this);
    if (this.effect.dirty) {
      this._value = this.effect.run();
    }
    return this._value;
  }
  set value(newValue) {
    this.setter(newValue);
  }
};
function computed(getterOrOptions) {
  let getter;
  let setter;
  let onlyGetter = isFunction(getterOrOptions);
  if (onlyGetter) {
    getter = getterOrOptions;
    setter = () => {
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  return new ComputedRefImpl(getter, setter);
}

// packages/reactivity/src/watch.ts
function watch(source, callBack, options = {}) {
  return doWatch(source, callBack, options);
}
function watchEffect(source, options = {}) {
  return doWatch(source, null, options);
}
function traverse(source, depth, currentDepth = 0, seen = /* @__PURE__ */ new Set()) {
  if (!isObject(source)) {
    return source;
  }
  if (depth) {
    if (currentDepth >= depth) {
      return source;
    }
    currentDepth++;
  }
  if (seen.has(source)) {
    return source;
  }
  for (const key in source) {
    traverse(source[key], depth, currentDepth, seen);
  }
}
function doWatch(source, callBack, { deep, immediate }) {
  const reactiveGetter = (source2) => traverse(source2, deep === false ? 1 : void 0);
  let getter;
  if (isReactive(source)) {
    getter = () => reactiveGetter(source);
  } else if (isRef(source)) {
    getter = () => source.value;
  } else if (isFunction(source)) {
    getter = source;
  }
  let clean;
  function onCleanup(fn) {
    clean = () => {
      fn();
      clean = void 0;
    };
  }
  let oldValue;
  let scheduler = () => {
    if (callBack) {
      const newValue = effect3.run();
      if (clean) {
        clean();
      }
      callBack(oldValue, newValue, onCleanup);
      oldValue = newValue;
    } else {
      effect3.run();
    }
  };
  let effect3 = new ReactiveEffect(getter, scheduler);
  if (callBack) {
    if (immediate) {
      scheduler();
    } else {
      oldValue = effect3.run();
    }
  } else {
    effect3.run();
  }
  const unwatch = () => {
    effect3.stop();
  };
  return unwatch;
}

// packages/runtime-core/src/scheduler.ts
var queue = [];
var isFlushing = false;
var resolvePromise = Promise.resolve();
var queueJob = (job) => {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  if (!isFlushing) {
    isFlushing = true;
    resolvePromise.then(() => {
      isFlushing = false;
      let copy = queue.slice(0);
      queue.length = 0;
      copy.forEach((job2) => job2());
      copy.length = 0;
    });
  }
};

// packages/runtime-core/src/component.ts
function createComponentInstance(vnode, parent) {
  const { data = () => {
  }, render, props: propsOption = () => {
  } } = vnode.type;
  const ReactiveData = reactive(data());
  const instance = {
    data: ReactiveData,
    // 数据
    vnode,
    // 保存当前组件对应的虚拟节点
    isMounted: false,
    // 标记是否挂载
    subTree: null,
    // 保存子树 真正需要渲染的虚拟节点
    update: null,
    // 保存当前组件的更新函数
    props: {},
    // 保存当前组件的props
    attrs: {},
    // 保存当前组件的attrs
    propsOption,
    // 保存当前组件声明接受的属性
    component: null,
    // 保存当前组件实例对象对应的组件
    proxy: null,
    // 保存对当前组件的props attrs 以及 data的代理
    render: null,
    //
    setupState: null,
    //保存setup返回的数据
    slots: null,
    //保存插槽
    exposed: null,
    parent,
    ctx: {},
    // 若是keepalive组件 就将dom api 放入此属性中
    provides: parent ? parent.provides : /* @__PURE__ */ Object.create(null)
  };
  return instance;
}
var initProps = (instance, rawProps) => {
  const props = {};
  const attrs = {};
  const propsOption = instance.propsOption;
  if (rawProps) {
    for (const key in rawProps) {
      if (key in propsOption) {
        props[key] = rawProps[key];
      } else {
        attrs[key] = rawProps[key];
      }
    }
  }
  instance.props = reactive(props);
  instance.attrs = attrs;
};
var initSlots = (instance, children) => {
  if (children | 32 /* SLOTS_CHILDREN */) {
    instance.slots = children;
  } else {
    instance.slots = {};
  }
};
var publicProperty = {
  $attrs: (instance) => instance.attrs,
  $slots: (instance) => instance.slots
  // ....
};
var handler = {
  get(target, key) {
    const { props, data, setupState } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    } else if (setupState && hasOwn(setupState, key)) {
      return setupState[key];
    }
    const getter = publicProperty[key];
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    const { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
      return true;
    } else if (props && hasOwn(props, key)) {
      console.warn("props \u5C5E\u6027\u4E0D\u53EF\u4FEE\u6539");
      return false;
    } else if (setupState && hasOwn(setupState, key)) {
      setupState[key] = value;
      return true;
    }
  }
};
function setupComponent(instance) {
  const { vnode } = instance;
  initProps(instance, vnode.props);
  initSlots(instance, vnode.children);
  instance.proxy = new Proxy(instance, handler);
  const { data = () => {
  }, render, setup } = vnode.type;
  if (setup) {
    const setupContext = {
      slots: instance.slots,
      attrs: instance.attrs,
      expose(value) {
        instance.exposed = value;
      },
      emit(event, ...payload) {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        const handler2 = instance.vnode.props[eventName];
        handler2 && handler2(...payload);
      }
    };
    setCurrentInstance(instance);
    const setupResult = setup(instance.props, setupContext);
    setCurrentInstance(null);
    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else {
      instance.setupState = proxyRefs(setupResult);
    }
  }
  if (!isFunction(data)) {
    console.warn("data option must be a function");
  } else {
    instance.data = reactive(data.call(instance.proxy));
  }
  if (!instance.render) {
    instance.render = render;
  }
}
var currentInstance = null;
var getCurrentInstance = () => {
  return currentInstance;
};
var setCurrentInstance = (instance) => {
  currentInstance = instance;
};

// packages/runtime-core/src/apiLifeCycle.ts
var LifecycleHooks = /* @__PURE__ */ ((LifecycleHooks2) => {
  LifecycleHooks2["BEFORE_MOUNT"] = "bm";
  LifecycleHooks2["MOUNTED"] = "m";
  LifecycleHooks2["BEFORE_UPDATE"] = "bu";
  LifecycleHooks2["UPDATED"] = "u";
  return LifecycleHooks2;
})(LifecycleHooks || {});
function createHook(type) {
  return (hook, target = currentInstance) => {
    console.log(hook, target);
    if (target) {
      const hooks = target[type] || (target[type] = []);
      const wrapperHooks = () => {
        setCurrentInstance(target);
        hook.call(target);
        setCurrentInstance(null);
      };
      hooks.push(wrapperHooks);
    }
  };
}
var onBeforeMount = createHook("bm" /* BEFORE_MOUNT */);
var onMounted = createHook("m" /* MOUNTED */);
var onBeforeUpdate = createHook("bu" /* BEFORE_UPDATE */);
var onUpdated = createHook("u" /* UPDATED */);
var invokeArr = (arr) => {
  arr.forEach((hook) => hook());
};

// packages/runtime-core/src/KeepAlive.ts
var KeepAlive = {
  // 标识
  __isKeepAlive: true,
  // 接收属性
  props: {
    max: Number
  },
  setup(props, { slots }) {
    const { max } = props;
    const keys = /* @__PURE__ */ new Set();
    const cache = /* @__PURE__ */ new Map();
    let pendingCacheKey = null;
    const instance = getCurrentInstance();
    const cacheSubtree = () => {
      cache.set(pendingCacheKey, instance.subTree);
    };
    const { move, createElement, unmount: _unmount } = instance.ctx.renderer;
    instance.ctx.activate = function(vnode, container, anchor) {
      move(vnode, container, anchor);
    };
    const storageContent = createElement("div");
    instance.ctx.deactivate = function(vnode) {
      move(vnode, storageContent, null);
    };
    function reset(vnode) {
      let shapeFlag = vnode.shapeFlag;
      if (shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
        shapeFlag -= 512 /* COMPONENT_KEPT_ALIVE */;
      }
      if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
        shapeFlag -= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
      }
      vnode.shapeFlag = shapeFlag;
    }
    function unmount(cached) {
      reset(cached);
      _unmount(cached);
    }
    function purneCacheEntry(key) {
      keys.delete(key);
      const cached = cache.get(key);
      unmount(cached);
    }
    onMounted(cacheSubtree);
    onUpdated(cacheSubtree);
    return () => {
      const vnode = slots.default();
      const comp = vnode.type;
      const key = vnode.key === null ? comp : vnode.key;
      pendingCacheKey = key;
      const cacheVNode = cache.get(key);
      if (cacheVNode) {
        vnode.component = cacheVNode.component;
        vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */;
        keys.delete(key);
        keys.add(key);
      } else {
        keys.add(key);
        if (max && keys.size > max) {
          purneCacheEntry(keys.keys().next().value);
        }
      }
      vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
      return vnode;
    };
  }
};
var isKeepAlive = (value) => value.type.__isKeepAlive;

// packages/runtime-core/src/renderer.ts
function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    querySelector: hostQuerySelector
  } = renderOptions;
  const normalize = (children) => {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        if (typeof children[i] === "string" || typeof children[i] === "number") {
          children[i] = createVNode(Text, null, String(children[i]));
        }
      }
    }
    return children;
  };
  const mountChildren = (childrenArr, container, anchor, parentComponent) => {
    normalize(childrenArr);
    for (let i = 0; i < childrenArr.length; i++) {
      patch(null, childrenArr[i], container, anchor, parentComponent);
    }
  };
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, props, children, shapeFlag, transition } = vnode;
    const el = vnode.el = hostCreateElement(type);
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el, anchor, parentComponent);
    }
    if (transition) {
      transition.beforeEnter(el);
    }
    hostInsert(el, container, anchor);
    if (transition) {
      transition.enter(el);
    }
  };
  const processElement = (preVNode, curVNode, container, anchor, parentComponent) => {
    if (preVNode === null) {
      mountElement(curVNode, container, anchor, parentComponent);
    } else {
      patchElement(preVNode, curVNode, container, anchor, parentComponent);
    }
  };
  const patchProps = (preVNode, curVNode, el) => {
    let oldProps = preVNode.props || {};
    let newProps = curVNode.props || {};
    for (const key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key]);
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  };
  const unmountChildren = (ChildrenArr, parentComponent) => {
    for (let i = 0; i < ChildrenArr.length; i++) {
      unmount(ChildrenArr[i], parentComponent);
    }
  };
  const patchKeyedChildren = (preChildren, curChildren, el, parentComponent) => {
    let i = 0;
    let preEndIndex = preChildren.length - 1;
    let curEndIndex = curChildren.length - 1;
    while (i <= preEndIndex && i <= curEndIndex) {
      if (isSameVnode(preChildren[i], curChildren[i])) {
        patch(preChildren[i], curChildren[i], el);
      } else {
        break;
      }
      i++;
    }
    while (i <= preEndIndex && i <= curEndIndex) {
      if (isSameVnode(preChildren[preEndIndex], curChildren[curEndIndex])) {
        patch(preChildren[preEndIndex], curChildren[curEndIndex], el);
      } else {
        break;
      }
      preEndIndex--;
      curEndIndex--;
    }
    if (i > preEndIndex) {
      if (i <= curEndIndex) {
        let nextIndex = curEndIndex + 1;
        let anchor = curChildren[nextIndex]?.el;
        while (i <= curEndIndex) {
          patch(null, curChildren[i], el, anchor);
          i++;
        }
      }
    } else if (i > curEndIndex) {
      if (i <= preEndIndex) {
        while (i <= preEndIndex) {
          unmount(preChildren[i], parentComponent);
          i++;
        }
      }
    }
    let preStarIndex = i;
    let curStarIndex = i;
    const keyToNewIndexMap = /* @__PURE__ */ new Map();
    let toBePatched = curEndIndex - curStarIndex + 1;
    let newIndxToOldMapIndex = new Array(toBePatched).fill(0);
    for (let i2 = curStarIndex; i2 <= curEndIndex; i2++) {
      keyToNewIndexMap.set(curChildren[i2].key, i2);
    }
    for (let i2 = preStarIndex; i2 <= preEndIndex; i2++) {
      let newIndex = keyToNewIndexMap.get(preChildren[i2].key);
      if (newIndex === void 0) {
        unmount(preChildren[i2], parentComponent);
      } else {
        newIndxToOldMapIndex[newIndex - curStarIndex] = i2 + 1;
        patch(preChildren[i2], curChildren[newIndex], el);
      }
    }
    console.log(newIndxToOldMapIndex);
    let increasingSeq = getSequence(newIndxToOldMapIndex);
    let j = increasingSeq.length - 1;
    for (let i2 = toBePatched - 1; i2 >= 0; i2--) {
      let newIndex = curStarIndex + i2;
      let anchor = curChildren[newIndex + 1]?.el;
      if (!curChildren[newIndex].el) {
        patch(null, curChildren[newIndex], el, anchor);
      } else {
        if (i2 === increasingSeq[j]) {
          j--;
        } else {
          hostInsert(curChildren[newIndex].el, el, anchor);
        }
      }
    }
  };
  const patchChildren = (preVNode, curVNode, el, anchor, parentComponent) => {
    let preChildren = normalize(preVNode.children);
    let curChildren = normalize(curVNode.children);
    let preShapeflag = preVNode.shapeFlag;
    let curShapeflag = curVNode.shapeFlag;
    if (curShapeflag & 8 /* TEXT_CHILDREN */) {
      if (preShapeflag & 16 /* ARRAY_CHILDREN */) {
        debugger;
        unmountChildren(preChildren, parentComponent);
      }
      if (preChildren !== curChildren) {
        hostSetElementText(el, curChildren);
      }
    } else {
      if (preShapeflag & 16 /* ARRAY_CHILDREN */) {
        if (curShapeflag & 16 /* ARRAY_CHILDREN */) {
          patchKeyedChildren(preChildren, curChildren, el, parentComponent);
        } else {
          unmountChildren(preChildren, parentComponent);
        }
      } else {
        if (preShapeflag & 8 /* TEXT_CHILDREN */) {
          hostSetElementText(el, "");
        }
        if (curShapeflag & 16 /* ARRAY_CHILDREN */) {
          mountChildren(curChildren, el, anchor, parentComponent);
        }
      }
    }
  };
  const patchBlockChildren = (preVNode, curVNode, el, anchor, parentComponent) => {
    for (let i = 0; i < curVNode.dynamicChildren.length; i++) {
      patch(preVNode.dynamicChildren[i], curVNode.dynamicChildren[i], el, anchor, parentComponent);
    }
  };
  const patchElement = (preVNode, curVNode, container, anchor, parentComponent) => {
    let el = curVNode.el = preVNode.el;
    const { patchFlag, dynamicChildren } = curVNode;
    if (patchFlag) {
      if (patchFlag & 2 /* CLASS */) {
      }
      if (patchFlag & 4 /* STYLE */) {
      }
    } else {
      patchProps(preVNode, curVNode, el);
    }
    if (patchFlag & 1 /* TEXT */) {
      if (preVNode.children !== curVNode.children) {
        return hostSetElementText(el, curVNode.children);
      }
    }
    if (dynamicChildren) {
      patchBlockChildren(preVNode, curVNode, el, anchor, parentComponent);
    } else {
      patchChildren(preVNode, curVNode, el, anchor, parentComponent);
    }
  };
  const processText = (preVNode, curVNode, container) => {
    if (preVNode == null) {
      hostInsert(curVNode.el = hostCreateText(curVNode.children), container);
    } else {
      curVNode.el = preVNode.el;
      hostSetText(curVNode.el, curVNode.children);
    }
  };
  const processFragment = (preVNode, curVNode, container, anchor, parentComponent) => {
    if (preVNode == null) {
      mountChildren(curVNode.children, container, anchor, parentComponent);
    } else {
      patchChildren(preVNode, curVNode, container, anchor, parentComponent);
    }
  };
  const updateComponentPreRender = (instance, curVNode) => {
    instance.next = null;
    instance.vnode = curVNode;
    updateProps(instance, instance.props, curVNode.props || {});
    Object.assign(instance.slots, curVNode.children);
  };
  const setupReactiveEffect = (instance, container, anchor, parentComponent) => {
    const componentUpdateFn = () => {
      const { render: render2, m, bm, u, bu } = instance;
      if (!instance.isMounted) {
        const subTree = render2.call(instance.proxy, instance.proxy);
        if (bm) {
          invokeArr(bm);
        }
        patch(null, subTree, container, anchor, instance);
        instance.subTree = subTree;
        instance.isMounted = true;
        if (m) {
          invokeArr(m);
        }
      } else {
        if (instance.next) {
          const { next } = instance;
          updateComponentPreRender(instance, next);
        }
        if (bu) {
          invokeArr(bu);
        }
        const subTree = render2.call(instance.proxy, instance.proxy);
        patch(instance.subTree, subTree, container, anchor, instance);
        instance.subTree = subTree;
        if (u) {
          invokeArr(u);
        }
      }
    };
    const effect3 = new ReactiveEffect(componentUpdateFn, () => queueJob(update));
    const update = instance.update = () => effect3.run();
    update();
  };
  const mountComponent = (curVNode, container, anchor, parentComponent) => {
    const instance = curVNode.component = createComponentInstance(curVNode, parentComponent);
    if (isKeepAlive(curVNode)) {
      Object.defineProperty(curVNode.ctx, "renderer", {
        value: {
          // 1、内部需要有创建元素方法 用于创建缓存dom的容器
          createElement: hostCreateElement,
          // 2、需要将要缓存的dom移动至容器内
          move(vnode, container2, anchor2) {
            hostInsert(vnode.component.subTree.el, container2, anchor2);
          },
          // 3、组件切换时需要将容器内的dom元素移除
          unmount
        }
      });
    }
    setupComponent(instance);
    setupReactiveEffect(instance, container, anchor, parentComponent);
  };
  const hasPropsChanged = (preProps, curProps) => {
    const nKeys = Object.keys(preProps);
    if (nKeys.length !== Object.keys(curProps).length) {
      return true;
    }
    for (let i = 0; i < nKeys.length; i++) {
      let key = nKeys[i];
      if (preProps[key] !== curProps[key]) {
        return true;
      }
    }
    return false;
  };
  const updateProps = (instance, preProps, curProps) => {
    if (hasPropsChanged(preProps, curProps || {})) {
      const curKeys = Object.keys(curProps);
      for (let i = 0; i < curKeys.length; i++) {
        let key = curKeys[i];
        instance.props[key] = curProps[key];
      }
      for (const key in instance.props) {
        if (!(key in curProps)) {
          delete instance.props[key];
        }
      }
    }
  };
  const shouldComponentUpdate = (preVNode, curVNode) => {
    const { props: preProps, children: preChildren } = preVNode;
    const { props: curProps, children: curChildren } = curVNode;
    if (preChildren || curChildren) {
      return true;
    }
    if (preProps === curProps) {
      return false;
    }
    return hasPropsChanged(preProps, curProps || {});
  };
  const updateComponent = (preVNode, curVNode) => {
    const instance = curVNode.component = preVNode.component;
    if (shouldComponentUpdate(preVNode, curVNode)) {
      instance.next = curVNode;
      instance.update();
    }
  };
  const processComponent = (preVNode, curVNode, container, anchor, parentComponent) => {
    if (preVNode == null) {
      if (curVNode.shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
        parentComponent.ctx.activate(curVNode, container, anchor);
      } else {
        mountComponent(curVNode, container, anchor, parentComponent);
      }
    } else {
      updateComponent(preVNode, curVNode);
    }
  };
  const patch = (preVNode, curVNode, container, anchor = null, parentComponent = null) => {
    if (preVNode === curVNode) {
      return;
    }
    if (preVNode && !isSameVnode(preVNode, curVNode)) {
      unmount(preVNode, parentComponent);
      preVNode = null;
    }
    let { type, shapeFlag, ref: ref2 } = curVNode;
    switch (type) {
      case Text:
        processText(preVNode, curVNode, container);
        break;
      case Fragment:
        processFragment(preVNode, curVNode, container, anchor, parentComponent);
        break;
      default:
        if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(preVNode, curVNode, container, anchor, parentComponent);
        } else if (shapeFlag & 64 /* TELEPORT */) {
          type.process(
            preVNode,
            curVNode,
            container,
            anchor,
            parentComponent,
            {
              // 传递方法
              mountChildren,
              patchChildren,
              query: hostQuerySelector,
              move(vnode, container2, anchor2) {
                hostInsert(
                  vnode.component ? vnode.component.subTree.el : vnode.el,
                  container2,
                  anchor2
                );
              }
            }
          );
        }
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(preVNode, curVNode, container, anchor, parentComponent);
          break;
        }
    }
    if (ref2 !== null) {
      setRef(ref2, curVNode);
    }
  };
  const setRef = (rawRef, curVNode) => {
    const { shapeFlag } = curVNode;
    let value = shapeFlag & 4 /* STATEFUL_COMPONENT */ ? curVNode.component.exposed || curVNode.component.proxy : curVNode.el;
    if (isRef(rawRef)) {
      rawRef.value = value;
    }
  };
  const unmount = (vnode, parentComponent) => {
    const { shapeFlag } = vnode;
    if (vnode.shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
      parentComponent.ctx.deactivate(vnode);
    } else if (vnode.type === "Fragment") {
      unmountChildren(vnode.children, parentComponent);
    } else if (shapeFlag & 6 /* COMPONENT */) {
      unmount(vnode.component.subTree, parentComponent);
    } else if (shapeFlag & 64 /* TELEPORT */) {
      vnode.type.remove(vnode, unmountChildren);
    } else {
      hostRemove(vnode.el);
    }
  };
  const render = (vnode, container) => {
    if (vnode === null) {
      if (container.vnode) {
        unmount(container.vnode, null);
      }
    } else {
      patch(container.vnode || null, vnode, container);
      container.vnode = vnode;
    }
  };
  return {
    render
  };
}

// packages/runtime-core/src/apiInject.ts
function inject(key, defaultValue) {
  let currentInstance2 = getCurrentInstance();
  if (!currentInstance2) return;
  const parentProvides = currentInstance2.parent?.provides;
  if (parentProvides && key in parentProvides) {
    return parentProvides[key];
  } else if (defaultValue) {
    return defaultValue;
  }
}
function provide(key, value) {
  let currentInstance2 = getCurrentInstance();
  if (!currentInstance2) return;
  let provides = currentInstance2.provides;
  const parentProvides = currentInstance2.parent && currentInstance2.parent.provides;
  if (provides === parentProvides) {
    provides = currentInstance2.provides = Object.create(parentProvides);
  }
  provides[key] = value;
}

// packages/runtime-core/src/component/Transition.ts
var nextFrame = (fn) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fn;
    });
  });
};
function resolveTransitionProps(props) {
  const {
    name = "v",
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave
  } = props;
  return {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter();
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
    },
    onEnter(el, done) {
      const resolve = () => {
        el.classList.remove(enterFromClass);
        el.classList.remove(enterActiveClass);
        done && done();
      };
      onEnter && onEnter(el, resolve);
      nextFrame(() => {
        el.classList.remove(enterFromClass);
        el.classList.add(enterToClass);
        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener("transitionEnd", resolve);
        }
      });
    },
    onLeave(el, done) {
      const resolve = () => {
        el.classList.remove(enterFromClass);
        el.classList.remove(enterActiveClass);
        done && done();
      };
      onEnter && onEnter(el, resolve);
      el.classList.add(leaveFromClass);
      document.body.offsetHeight;
      el.classList.add(leaveActiveClass);
      nextFrame(() => {
        el.classList.remove(leaveFromClass);
        el.classList.add(leaveToClass);
        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener("transitionEnd", resolve);
        }
      });
    }
  };
}
function Transition(props, { slots }) {
  return h(BaseTransitionImpl, resolveTransitionProps(props), slots);
}
var BaseTransitionImpl = {
  props: {
    onBeforeEnter: Function,
    onEnter: Function,
    onLeave: Function
  },
  setup(props, { slots }) {
    return () => {
      const vnode = slots.default && slots.default();
      if (!vnode) {
        return;
      }
      vnode.transition = {
        beforeEnter: props.onBeforeEnter,
        onEnter: props.onEnter,
        leave: props.onLeave
      };
      return vnode;
    };
  }
};

// packages/runtime-core/src/defineAsyncComponent.ts
var defineAsyncComponent = (options) => {
  if (isFunction(options)) {
    options = { loader: options };
  }
  return {
    setup() {
      const { loader, timeout, errorComponent, delay, loadingComponent, onError } = options;
      const loaded = ref(false);
      const error = ref(false);
      const loading = ref(false);
      let Comp = null;
      let loadingTimer = null;
      if (timeout) {
        setTimeout(() => {
          error.value = true;
          throw new Error("\u7EC4\u4EF6\u52A0\u8F7D\u5931\u8D25\uFF01\uFF01");
        }, timeout);
      }
      if (delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true;
        }, delay);
      }
      let attempts = 0;
      function loadFunc() {
        return loader().catch((err) => {
          if (onError) {
            return new Promise((resolve, reject) => {
              const retry = () => resolve(loadFunc());
              const fail = () => reject(err);
              onError(err, retry, fail, ++attempts);
            });
          } else {
            throw err;
          }
        });
      }
      loadFunc().then((comp) => {
        Comp = comp;
        loaded.value = true;
      }).catch((err) => {
        error.value = err;
      }).finally(() => {
        loading.value = false;
        clearTimeout(loadingTimer);
      });
      let placeholder = h("div");
      return () => {
        if (loaded.value) {
          return h(Comp);
        } else if (error.value && errorComponent) {
          return h(errorComponent);
        } else if (loading.value && loadingComponent) {
          return h(loadingComponent);
        } else {
          return placeholder;
        }
      };
    }
  };
};
export {
  Fragment,
  KeepAlive,
  LifecycleHooks,
  ReactiveEffect,
  RefImpl,
  Teleport,
  Text,
  Transition,
  activeEffect,
  closeBlock,
  computed,
  createComponentInstance,
  createElementBlock,
  createVNode as createElementVNode,
  createRenderer,
  createVNode,
  currentInstance,
  defineAsyncComponent,
  effect,
  getCurrentInstance,
  h,
  inject,
  invokeArr,
  isDisplayString,
  isKeepAlive,
  isRef,
  isSameVnode,
  isTeleport,
  isVnode,
  onBeforeMount,
  onBeforeUpdate,
  onMounted,
  onUpdated,
  openBlock,
  provide,
  proxyRefs,
  reactive,
  ref,
  resolveTransitionProps,
  setCurrentInstance,
  setupBlock,
  setupComponent,
  toReactive,
  toRef,
  toRefs,
  trackEffect,
  trackRefValue,
  triggerEffects,
  triggerRefValue,
  watch,
  watchEffect
};
//# sourceMappingURL=runtime-core.js.map
