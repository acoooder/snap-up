import * as puppeteer from 'puppeteer';
import * as schedule from 'node-schedule';
import task from './task';

function parseJsonp(data: string) {
  const start = data.indexOf('(') + 1;
  const end = data.lastIndexOf(')');
  return JSON.parse(data.slice(start, end));
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

function getSec(time: number) {
  const hour = Math.floor(time / 3600);
  const min =  Math.floor((time - hour * 3600) / 60);
  return time - hour * 3600 - min * 60; 
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

async function getSnapUpUrl(page: puppeteer.Page): Promise<string> {
  const reservationInfo = await getReservationInfo(page);
  const time = getSec(reservationInfo.d);
  await page.waitFor(time * 1000 - 200);
  await page.reload({
    waitUntil: 'domcontentloaded'
  });
  return new Promise((resolve) => {
    const listener = async (response: puppeteer.Response) => {
      if (response.url().indexOf('https://itemko.jd.com/itemShowBtn') >= 0) {
        page.off('response', listener);
        const text = await response.text();
        const data = parseJsonp(text);
        resolve('https:' + data.url);
      }
    };
    page.on('response', listener);
  });
}

async function getUrl(page: puppeteer.Page, url: string, type: '预约' | '抢购'): Promise<string> {
  await page.goto(url, {
    waitUntil: 'domcontentloaded'
  });
  await isLogin(page);
  if (type === '预约') {
    const data = await getReservationInfo(page);
    const time = getSec(data.d);
    await page.waitFor(time * 1000 + 500);
    return 'https:' + data.url;
  } else {
    return await getSnapUpUrl(page);
  }
}

// async function clickReservation(page: puppeteer.Page, url: string): Promise<void> {
//   await page.waitForSelector('#btn-reservation');
//   const text = await page.evaluate(() => {
//     const btn = document.querySelector('#btn-reservation') as HTMLAnchorElement;
//     btn.click();
//     return btn.innerHTML;
//   });
 
  
//   // return await page.evaluate(() => {
//   //   setTimeout(() => {
//   //     const btn = document.querySelector('#btn-reservation') as HTMLAnchorElement;
//   //     btn.click();
//   //   });
//   // });
// }

async function newPage(browser: puppeteer.Browser) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36');

  return page;
}

function scheduleCronstyle(browser: puppeteer.Browser) {
  for (const key in task) {
    const item = task[key as keyof typeof task];
    schedule.scheduleJob(item.预约时间, async () => {
      const page = await newPage(browser);
      const targetUrl = await getUrl(page, item.url, '预约');
      await page.goto(targetUrl);
    });
    schedule.scheduleJob(item.抢购时间, async () => {
      const page = await newPage(browser);
      const targetUrl = await getUrl(page, item.url, '抢购');
      console.log('targetUrl', targetUrl);
      
      try {
        await page.goto(targetUrl, {
          waitUntil: 'domcontentloaded'
        });
        // 如果抢购失败页面，则尝试触发再次抢购按钮
        page.on('load', () => { 
          if (page.url() === 'https://marathon.jd.com/koFail.html') {
            page.evaluate(() => {
              // @ts-ignore
              tryAgain();
            });
          }
        });
        await page.waitForSelector('.checkout-submit');
        await page.evaluate(() => {
          const btn = document.querySelector('.checkout-submit') as HTMLButtonElement;
          btn.click();
        });
      } catch (err) {
        console.error('抢购失败');
      }
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
  scheduleCronstyle(browser);
  // 获取第一个标签页
  const page = (await browser.pages())[0];
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36');
  await page.goto('https://www.jd.com/');
  await isLogin(page);
})();