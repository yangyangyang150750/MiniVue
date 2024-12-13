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

// packages/shared/src/index.ts
function isObject(value) {
  return typeof value === "object" && value != null;
}
function isFunction(value) {
  return typeof value === "function";
}
function isReactive(value) {
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}

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
export {
  ReactiveEffect,
  RefImpl,
  activeEffect,
  computed,
  effect,
  isRef,
  proxyRefs,
  reactive,
  ref,
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
//# sourceMappingURL=reactivity.js.map
