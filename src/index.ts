import * as puppeteer from 'puppeteer';
import * as schedule from 'node-schedule';
import task from './task';

async function login(page: puppeteer.Page): Promise<boolean> {
  return await page.evaluate(() => {
    if (!!document.querySelector('#ttbar-login')?.querySelector('.nickname') === true) {
      return true;
    } else {
      alert('请先手动登录');
      return false;
    }
  });
}

async function getUrl(page: puppeteer.Page, url: string): Promise<string> {
  await page.goto(url, {
    waitUntil: 'domcontentloaded'
  });
  return new Promise((resolve) => {
    const listener = async (response: puppeteer.Response) => {
      // 获取商品预约抢购信息的接口
      if (response.url().indexOf('https://yushou.jd.com/youshouinfo.action') >= 0) {
        page.off('response', listener);
        const text = await response.text();
        const data = JSON.parse(text.slice(10, text.length - 2));
        const time = data.d;
        const getSec = () => {
          const hour = Math.floor(time / 3600);
          const min =  Math.floor((time - hour * 3600) / 60);
          return time - hour * 3600 - min * 60; 
        };
        console.log(data);
        await page.waitFor(getSec() * 1000 + 500);
        resolve('https://' + data.url);
      }
    };
    page.on('response', listener);
  });
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

// async function checkInfo(page: puppeteer.Page): Promise<void> {
//   return new Promise((resolve) => {
//     const listener = async (response: puppeteer.Response) => {
//       // 获取商品预约抢购信息的接口
//       if (response.url().indexOf('https://yushou.jd.com/youshouinfo.action') >= 0) {
//         page.off('response', listener);
//         const text = await response.text();
//         const data = JSON.parse(text.slice(10, text.length - 2));
//         const time = data.d;
//         const getSec = () => {
//           const hour = Math.floor(time / 3600);
//           const min =  Math.floor((time - hour * 3600) / 60);
//           return time - hour * 3600 - min * 60; 
//         };
//         // eslint-disable-next-line no-console
//         console.log(data);
//         console.log(getSec());
//         await clickReservation(page);
//         resolve(data.info);
//       }
//     };
//     page.on('response', listener);
//   });
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
      const targetUrl = await getUrl(page, item.url);
      await page.goto(targetUrl);
    });
    schedule.scheduleJob(item.抢购时间, async () => {
      const page = await newPage(browser);
      const targetUrl = await getUrl(page, item.url);
      try {
        await page.goto(targetUrl, {
          waitUntil: 'domcontentloaded'
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

  // 获取第一个标签页
  const page = (await browser.pages())[0];
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36');
  await page.goto('https://www.jd.com/');
  await login(page);
  scheduleCronstyle(browser);
})();