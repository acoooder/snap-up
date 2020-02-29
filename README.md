# 介绍

> **至今没有抢购成功，依然还在测试阶段**

目前只对京东口罩类抢购产品进行测试;

此代码只在`win10`和`node v12`中进行过测试;

## 安装

1.`.npmrc`文件添加以下2个镜像

```text
registry=https://registry.npm.taobao.org/
PUPPETEER_DOWNLOAD_HOST=https://npm.taobao.org/mirrors
```

2.当前文件目录执行`npm i`

## 使用

1.当前文件目录执行`npm run start`

2.打开浏览器后先进行手动登录

3.定时任务会按时间执行预约和抢购

4.抢购前设置好默认收货地址

5.抢购成功后需要手动进行支付
