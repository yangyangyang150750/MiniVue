import { ReactiveFlags } from "packages/reactivity/src/constants"

export function isObject (value:any) {
    return typeof value === 'object'&& value!=null
}

export function isFunction(value){
    return typeof value === 'function'
}

export function isString(value){
    return typeof value === 'string'
}

export function isReactive(value) {
    return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

const hasOwnProperty =Object.prototype.hasOwnProperty
export function hasOwn(target,key) {
    return hasOwnProperty.call(target,key)
}

export * from './shapeFlags'