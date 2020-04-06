# 介绍

> **已成功抢购几次**

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

3.设置`src/index.ts`的`eid`和`fp`常量;

4.定时任务会按时间执行预约和抢购

5.抢购前设置好默认收货地址

6.抢购成功后需要手动进行支付
