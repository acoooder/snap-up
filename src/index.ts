import * as schedule from 'node-schedule';
import * as puppeteer from 'puppeteer';
import * as querystring from 'querystring';
import task from './task';

declare const $: any;
/**
 * 注意：在抢购程序打开的浏览器里操作
 * 具体操作：https://github.com/tychxn/jd-assistant/wiki/3.-%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98#3-eid-fp-track_id-risk_control-%E5%8F%82%E6%95%B0%E5%A6%82%E4%BD%95%E8%8E%B7%E5%8F%96
 */
const eid = '';
const fp = '';
const customHtml = `
<!DOCTYPE html>
<html lang="zh-cmn-Hans">
  <head>
    <title>京东抢购</title>
    <meta charset="UTF-8">
  </head>
  <body>
    <span id="main"></span>
    <span id="sub"></span>
  </body>
</html>
`;

function parseJsonp(data: string) {
  const start = data.indexOf('(') + 1;
  const end = data.lastIndexOf(')');
  return JSON.parse(data.slice(start, end));
}

// 打开页面后等待预约或抢购的时间
function getWaitTime(fireDate: Date, diffTime: number) {
  // 60 - 5;
  // 5为定时任务设置时间的秒数，因为抢购和预约是整点，所以要补上时间
  const addTime = 55 * 1000;
  const startTime = fireDate.getTime();
  const endTime = Date.now();
  const scheduleTime = startTime + addTime;
  return scheduleTime - endTime + diffTime;
}

async function isLogin(page: puppeteer.Page): Promise<void> {
  return new Promise((resolve) => {
    const getNick = (data: string) => {
      const start = data.indexOf('"nick":"') + 8;
      const end = data.indexOf('","info"');
      return data.slice(start, end);
    };
    const listener = async (response: puppeteer.Response) => {
      if (response.url().indexOf('https://passport.jd.com/new/helloService.ashx') >= 0) {
        page.off('response', listener);
        const text = await response.text();
        if (!getNick(text)) {
          // eslint-disable-next-line no-console
          console.log('当前状态未登录，请及时登录');
          await page.evaluate(() => {
            alert('当前状态未登录，请及时登录');
          });
        }
        resolve();
      }
    };
    page.on('response', listener);
  });
}

async function getReservationInfo(page: puppeteer.Page): Promise<{ d: number; url: string }> {
  return new Promise((resolve) => {
    const listener = async (response: puppeteer.Response) => {
      if (response.url().indexOf('https://yushou.jd.com/youshouinfo.action') >= 0) {
        page.off('response', listener);
        const text = await response.text();
        // console.log(parseJsonp(text));
        resolve(parseJsonp(text));
      }
    };
    page.on('response', listener);
  });
}

/** 获取收货信息 */
async function getDeliveryInfo(page: puppeteer.Page, skuId: string): Promise<any> {
  page.evaluate((sku) => {
    $.post('https://marathon.jd.com/seckillnew/orderService/pc/init.action', {
      sku,
      num: 1,
      isModifyAddress: 'false'
    });
  }, skuId);
  return new Promise((resolve) => {
    const listener = async (response: puppeteer.Response) => {
      if (response.url().indexOf('https://marathon.jd.com/seckillnew/orderService/pc/init.action') >= 0) {
        page.off('response', listener);
        const data = JSON.parse(await response.text());
        resolve(data);
      }
    };
    page.on('response', listener);
  });
}

async function getSnapUpUrl(page: puppeteer.Page): Promise<string> {
  let count = 0;
  return new Promise((resolve) => {
    const listener = async (response: puppeteer.Response) => {
      if (response.url().indexOf('https://itemko.jd.com/itemShowBtn') >= 0) {
        count++;
        console.log(page.url(), `获取链接次数${count}`);
        const text = await response.text();
        const data = parseJsonp(text);
        if (data.url) {
          page.off('response', listener);
          resolve('https:' + data.url);
        }
      }
    };
    page.on('response', listener);
  });
}

// async function getUrl(page: puppeteer.Page, url: string, type: '预约' | '抢购'): Promise<string> {
//   await page.goto(url, {
//     waitUntil: 'domcontentloaded'
//   });
//   if (type === '预约') {
//     const data = await getReservationInfo(page);
//     return 'https:' + data.url;
//   } else {
//     return await getSnapUpUrl(page);
//   }
// }

// async function clickReservation(page: puppeteer.Page): Promise<string> {
//   await page.waitForSelector('#btn-reservation');
//   const url = await page.evaluate(() => {
//     const btn = document.querySelector('#btn-reservation') as HTMLAnchorElement;
//     btn.click();
//     return btn.href;
//   });
//   return url;
// }

async function newPage(browser: puppeteer.Browser) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36');

  return page;
}

function scheduleCronstyle(browser: puppeteer.Browser, diffTime: number) {
  for (const key in task) {
    const item = task[key as keyof typeof task];
    schedule.scheduleJob(item.预约时间, async (fireDate) => {
      const page = await newPage(browser);
      await page.goto(item.url, {
        waitUntil: 'domcontentloaded'
      });
      const data = await getReservationInfo(page);
      const waitTime = getWaitTime(fireDate, diffTime);
      console.log(key + '  waitTime', (waitTime) / 1000);
      console.log(key + '  预约链接', data.url);
      isLogin(page);
      
      await page.waitFor(waitTime + 2000);
      console.log(key +  '  localTime', new Date().getSeconds());
      await page.goto('https:' + data.url);
    });

    schedule.scheduleJob(item.抢购时间, async (fireDate) => {
      const page = await newPage(browser);
      await page.goto('https://marathon.jd.com/koFail.html');
      const deliveryData = await getDeliveryInfo(page, item.skuId);

      await page.goto(item.url, {
        waitUntil: 'domcontentloaded'
      });
      const waitTime = getWaitTime(fireDate, 0);
      
      await page.waitFor(waitTime - 500);
      page.evaluate((skuId) => {
        let recount = 0;
        const request = () => {
          $.ajax({
            url: 'https://itemko.jd.com/itemShowBtn',
            type: 'get',
            dataType: 'jsonp',
            data: {
              'skuId': skuId,
              'from': 'pc'
            },
            success: (res: any) => {
              if (res.url === '' && recount < 1000) {
                setTimeout(() => {
                  request();
                }, 100);
              }
            }
          });
        };
        request();
      }, item.skuId);
      const targetUrl = await getSnapUpUrl(page);
      console.log(key + '  立即抢购链接', targetUrl);
      console.log(key + '  localTime', new Date().getSeconds());
      await page.setRequestInterception(true);
      page.on('request', async (request) => {
        const type = request.resourceType();
        if (request.url().indexOf('marathon.jd.com') >= 0 && (type === 'document')) {
          await request.respond({
            status: 200,
            contentType: 'text/html',
            body: customHtml
          });
        } else {
          await request.continue();
        }
      });
      page.on('domcontentloaded', () => {
        if (page.url().indexOf('https://marathon.jd.com') >= 0) {
          console.log(key + '  订单页面localTime', Date.now());
          const address = deliveryData.addressList[0];
          const invoice = deliveryData.invoiceInfo;
          const requestData = querystring.stringify({
            num: 1,
            yuShou: true,
            isModifyAddress: false,
            skuId: item.skuId,
            addressId: address.id,
            name: address.name,
            provinceId: address.provinceId,
            cityId: address.cityId,
            countyId: address.countyId,
            townId: address.townId,
            addressDetail: address.addressDetail,
            mobile: address.mobile,
            mobileKey: address.mobileKey,
            email: address.email,
            postCode: address.postCode,
            areaCode: address.areaCode,
            overseas: address.overseas,
            phone: address.phone,
            invoice: true,
            ...invoice,
            password: '',
            codTimeType: 3,
            paymentType: 4,
            // addressId: '2099993864',
            // name: '丁孝辉',
            // provinceId: 4,
            // cityId: 50950,
            // countyId: 88,
            // townId: 0,
            // addressDetail: '重庆江北区南桥寺盘溪路150号保利香雪17栋',
            // mobile: '136****9016',
            // mobileKey: 'f1fb5b8c090a35ab0a3ed1f7131746fd',
            // email: '',
            // postCode: '',
            // areaCode: '0086',
            // overseas: 0,
            // phone: '',
            // invoiceTitle: 4,
            // invoiceCompanyName: '',
            // invoiceContent: 1,
            // invoiceTaxpayerNO: '',
            // invoiceEmail: '281654501@qq.com',
            // invoicePhone: '136****9016',
            // invoicePhoneKey: 'f1fb5b8c090a35ab0a3ed1f7131746fd',
            eid,
            fp,
            token: deliveryData.token,
            pru: ''
          });
          page.evaluate((skuId, requestData, referrer) => {
            let recount = 0;
            const request = () => {
              fetch(`https://marathon.jd.com/seckillnew/orderService/pc/submitOrder.action?skuId=${skuId}`,{
                "credentials":"include",
                "headers":{
                  "accept": "application/json, text/plain, */*",
                  "accept-language":"zh-CN,zh;q=0.9",
                  "content-type": "application/x-www-form-urlencoded",
                  "sec-fetch-dest":"empty",
                  "sec-fetch-mode":"cors",
                  "sec-fetch-site":"same-origin"
                },
                "referrer": referrer,
                "referrerPolicy": "no-referrer-when-downgrade",
                "method":"POST",
                "mode":"cors",
                "body": requestData
              }).then((res) => res.text()).then((res) => {
                if (res.indexOf('"success":true') < 0) {
                  if (recount < 10) {
                    document.querySelector('#main')!.textContent = '正在抢购中...';
                    document.querySelector('#sub')!.textContent = `尝试次数${recount + 1}/10`;
                    setTimeout(() => {
                      recount++;
                      request();
                    }, 100);
                  }
                } else {
                  document.querySelector('#main')!.textContent = '抢购成功！';
                }
              });
            };
            request();
          }, item.skuId, requestData, targetUrl);
        }
      });
      // const targetUrl = `https://marathon.jd.com/seckill/seckill.action?skuId=${item.skuId}&num=1&rid=${Date.now().toString().slice(0, 10)}`;
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded'
      });
    });
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './cache',
    defaultViewport: {
      width: 1600,
      height: 1080
    }
  });
  // 获取第一个标签页
  const page = (await browser.pages())[0];
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36');
  await page.goto('https://home.jd.com');

  scheduleCronstyle(browser, 0);
})();