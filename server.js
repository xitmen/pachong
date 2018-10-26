const http = require('http');
const fs = require('fs');
const url = require('url');
const mysql = require('mysql');
const io = require('socket.io');
const regs = require('./lib/regs');

//数据库
let db = mysql.createPool({host: 'localhost', user: 'root', password: '', database: 'wechart'});

// 接口
// 用户注册 /reg?user=xxx&pass=xxx {"code": 0, "msg": "信息"}
// 用户登录 /login?user=xxx$pass=xxx {"code": 0, "msg": "信息"}

// http服务器
let httpServer = http.createServer((req, res) =>{
    let {pathname, query} = url.parse(req.url, true);
    if (pathname === '/reg') {
        let {user, pass} = query;
        // 1.数据校验
        if (!regs.username.test(user)) {
            res.write(JSON.stringify({code: 1, msg: '用户名不符合规范'}));
            res.end();
        } else if (!regs.password.test(pass)) {
            res.write(JSON.stringify({code: 1, msg: '密码不符合规范'}));
        } else {
            // 2.检验用户名是否重复
            db.query(`SELECT * FROM user_table WHERE username='${user}'`, (err, data) => {
                if (err) {
                    res.write(JSON.stringify({code: 1, msg: '数据库有错,29'}));
                    res.end()
                } else if (data.length > 0) {
                    res.write(JSON.stringify({code: 1, msg: '用户名已存在'}));
                    res.end()
                } else {
                    // 3.插入
                    db.query(`INSERT INTO user_table (username, password, online) VALUES ('${user}', '${pass}', 0)`, (err, data) => {
                        if (err) {
                            res.write(JSON.stringify({code: 1, msg: '数据库出错,37'}));
                            res.end()
                        } else {
                            res.write(JSON.stringify({code: 0, msg: '用户注册成功'}));
                            res.end()
                        }
                    })
                }
            })
        }
    } else if (pathname === '/login') {
        let {user, pass} = query;
        if (!regs.username.test(user)) {
            res.write(JSON.stringify({code: 1, msg: '请输入用户名'}));
            res.end()
        } else if (!regs.password.test(pass)) {
            res.write(JSON.stringify({code: 1, msg: '请输入密码'}));
            res.end()
        } else {
            db.query(`SELECT ID,password FROM user_table WHERE username='${user}'`, (err, data) => {
                if (err) {
                    res.write(JSON.stringify({code: 1, msg: '数据有问题, 60'}));
                    res.end()
                } else if (data.length === 0){
                    res.write(JSON.stringify({code: 1, msg: '此用户名不存在'}));
                    res.end()
                } else if (data[0].password != pass) {
                    res.write(JSON.stringify({code: 1, msg: '用户名或密码有误!'}));
                    res.end()
                } else {
                    db.query(`UPDATE user_table SET online=1 WHERE ID = ${data[0].ID}`, (err, data) => {
                        if (err) {
                            res.write(JSON.stringify({code: 1, msg: '数据有错!, 71'}));
                            res.end()
                        } else {
                            res.write(JSON.stringify({code: 0, msg: '用户登陆成功!'}));
                            res.end()
                        }
                    })
                }
            })
        }
    } else {
        fs.readFile(`www${pathname}`, (err, data) => {
            if (err) {
                res.writeHeader(404);
                res.write('Not Found');
            } else {
                res.write(data);
            }
            res.end();
        })
    }
});

httpServer.listen(82);
