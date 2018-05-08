'use strict';
/**
 * mvvm      
 * @param update 5/8
 */

function observer(data) {
    // 当不是对象的时候，退出
    if (!data || typeof data !== 'object') {
        return;
    }
    // 取出所有属性遍历
    Object.keys(data).forEach(function (key) {
        // 给每个属性加上get，set
        defineReactive(data, key, data[key]);
    });
};

function defineReactive(data, key, val) {
    var dep = new Dep(); //实例化一个订阅器
    observer(val); // 监听子属性
    Object.defineProperty(data, key, {
        enumerable: true, // 可遍历
        configurable: false, // 不能修改，删除
        get: function () {
            // 如果这个属性存在，说明这是watch 引起的
            if (Dep.target) {
                // 那我调用dep.addSub把这个订阅者加入订阅器里面
                dep.addSub(Dep.target)
            }
            return val;
        },
        set: function (newVal) {
            if (val === newVal) {
                return
            } //当前后数值相等，不做改变
            val = newVal;
            dep.notify(); //当前后数值变化，这时就通知订阅者了
            console.log("已改变 " + newVal);
        }
    });
}

function Dep() {
    this.subs = []; //存放消息数组
}
Dep.prototype = {
    addSub: function (sub) {　 //增加订阅者函数
        this.subs.push(sub);
    },
    notify: function () {　　　 //发布消息函数
        this.subs.forEach(function (sub) {
            sub.update(); //这里是订阅者的更新方法
        });
    }
};
Dep.target = null;  //释放订阅者

function Watcher(vm, exp, cb) {
    this.cb = cb;
    this.vm = vm;
    console.log(this.vm);
    this.exp = exp;
    this.value = this.get(); //初始化的时候就调用
}

Watcher.prototype = {
    // 只要在订阅者Watcher初始化的时候才需要添加订阅者
    get: function () {
        Dep.target = this; // 在Dep.target缓存下订阅者
        var value = this.vm.data[this.exp] // 强制执行监听器里的get函数
        Dep.target = null; // 释放订阅者
        return value;
    },
    // dep.subs[i].notify() 会执行到这里
    update: function () {
        this.run();
    },
    run: function () {
        // 执行 get（）获得value ，call更改cb的this指向 。
        var value = this.vm.data[this.exp];
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.vm, value, oldVal);
        }
    }
}

function Compile(el, vm) {
    this.vm = vm;
    this.el = document.querySelector(el);
    this.fragment = null;
    this.init(); //初始化一个方法,直接调用解析节点
}
Compile.prototype = {
    init: function () {
        if (this.el) {
            this.fragment = this.nodeToFragment(this.el); //调用了上面的方法，把元素放入并返回
            this.compileElement(this.fragment); //对这个里面的元素解析
            this.el.appendChild(this.fragment); //再重新放回去
        } else {
            console.error("找不到节点")
        }
    },
    //创造一个空白节点
    nodeToFragment: function (el) {
        var fragment = document.createDocumentFragment();
        var child = el.firstChild;
        while (child) {
            // 将Dom每个元素都移入fragment中
            fragment.appendChild(child);
            child = el.firstChild;
        }
        console.log(fragment);
        return fragment;
    },
    // 解析节点
    compileElement: function (el) {
        var childNodes = el.childNodes;
        var self = this;
        [].slice.call(childNodes).forEach(function (node) {
            var reg = /\{\{(.*)\}\}/;
            var text = node.textContent;
            if (node.nodeType == 1) { //如果是元素节点
                self.compileFirst(node);
            } else if (node.nodeType == 3 && reg.test(text)) { //如果是文本节点
                self.compileText(node, reg.exec(text)[1]);
            }
            if (node.childNodes && node.childNodes.length) { //如果下面还有子节点，继续循环
                self.compileElement(node);
            }
        });
    },
    //如果是元素节点
    compileFirst: function (node) {
        var nodeAttrs = node.attributes;
        var self = this;
        Array.prototype.forEach.call(nodeAttrs, function (attr) {
            var attrName = attr.name;
            var exp = attr.value;
            if (attrName = 'p-model') { //当这个属性为p-model的时候就解析model
                self.compileModel(node, self.vm, exp);
            }
        });
    },
    //如果是文本节点
    compileText: function (node, exp) {
        var self = this;
        var initText = this.vm[exp];
        console.log(initText);
        this.updateText(node, initText);
        new Watcher(this.vm, exp, function (value) {
            self.updateText(node, value); //通知Watcher，开始订阅
        });
    },
    //解析p-model
    compileModel: function (node, vm, exp) {
        var self = this;
        var val = this.vm[exp];
        this.modelUpdater(node, val);
        new Watcher(this.vm, exp, function (value) {
            self.modelUpdater(node, value); //通知Watcher，开始订阅
        });
        node.addEventListener('input', function (e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            self.vm[exp] = newValue;
            val = newValue;
        });
    },
    updateText: function (node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },
    modelUpdater: function (node, value, oldValue) {
        //如果不存在就返回空
        node.value = typeof value == 'undefined' ? '' : value;
    }
}

function Pvp(options) {
    var self = this;
    this.data = options.data;
    Object.keys(this.data).forEach(function (key) {
        self.proxyKeys(key);
    });
    observer(this.data); //给data每个属性加上get，set
    new Compile(options.el, this)
    return this
}
Pvp.prototype = {
    proxyKeys: function (key) {
        var self = this;
        Object.defineProperty(this, key, {
            enumerable: false,
            configurable: true,
            get: function getter() {
                return self.data[key];
            },
            set: function setter(newVal) {
                self.data[key] = newVal;
            }
        });
    }
}
