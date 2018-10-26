const http = require('http');
const fs = require('fs');
const mysql = require('mysql');
const io = require('socket.io');
const regs = require('./lib/regs');

//数据库
let db = mysql.createPool({host: 'localhost', user: 'root', password: '', database: 'wechart'});

// http服务器
let httpServer = http.createServer((req, res) =>{
    fs.readFile(`www${req.url}`, (err, data) => {
        if (err) {
            res.writeHeader(404);
            res.write('Not Found');
        } else {
            res.write(data);
        }
        res.end();
    })
});

httpServer.listen(82);
let aSock = [];
// 2:
let wsServer = io.listen(httpServer);
wsServer.on('connection', sock => {
    aSock.push(sock);

    let cur_username = '';
    let cur_userid = '';

    sock.on('reg', (user, pass) => {
        if (!regs.username.test(user)) {
            sock.emit('reg_ret', 1, '用户名不符合规范');
        } else if (!regs.password.test(pass)) {
            sock.emit('reg_ret', 1, '密码不符合规范');
        } else {
            db.query(`SELECT ID FROM user_table WHERE username='${user}'`, (err, data) => {
                if (err) {
                    sock.emit('reg_ret', 1, '数据库有误, 37');
                } else if (data.length > 0){
                    sock.emit('reg_ret', 1, '用户名存在');
                } else {
                    db.query(`INSERT INTO user_table (username, password, online) VALUES ('${user}', '${pass}', 0)`, err => {
                        if (err) {
                            sock.emit('reg_ret', 1, '数据库有误, 37');
                        } else {
                            sock.emit('reg_ret', 0, '账号注册成功');
                        }
                    })
                }
            })
        }
    });

    sock.on('login', (user, pass) => {
        if (!regs.username.test(user)) {
            sock.emit('login_ret', 1, '用户名不符合规范');
        } else if (!regs.password.test(pass)) {
            sock.emit('login_ret', 1, '密码不符合规范');
        } else {
            db.query(`SELECT ID,password FROM user_table WHERE username='${user}'`, (err, data) => {
                if (err) {
                    sock.emit('login_ret', 1, '数据库有误, 37');
                } else if (data[0].password !== pass){
                    sock.emit('login_ret', 1, '用户名或者密码错误, 65');
                } else {
                    db.query(`UPDATE user_table SET online=1 WHERE ID=${data[0].ID}`, err => {
                        if (err) {
                            sock.emit('login_ret', 1, '数据库有误, 37');
                        } else {
                            sock.emit('login_ret', 0, '登陆成功!');
                            cur_username = user;
                            cur_userid = data[0].ID
                        }
                    })
                }
            })
        }
    });

    sock.on('msg', txt => {
        if (!txt) {
            sock.emit('msg_ret', 1, '消息文本为空!');
        } else {
            aSock.forEach(item => {
                if(item===sock)return;
                item.emit('msg', cur_username, txt);
            });
            sock.emit('msg_ret', 0, '发送成功');
        }
    })

    sock.on('disconnect', () => {
        db.query(`UPDATE user_table SET online=0 WHERE ID=${cur_userid}`, err => {
            cur_username = '';
            cur_userid = ''
            aSock = aSock.filter(item=>item!==sock)
        })
    })
})
