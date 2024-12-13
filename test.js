const person ={
    name:'ywh',
    get outputName(){
        return this.name + 'is good man!'
    }
}

const proxyPerson = new Proxy(person,{
    get(target,key,receiver){
        console.log(key);
        return target[key]
    }
})

console.log(proxyPerson.outputName);