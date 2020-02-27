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

async function reload(page: puppeteer.Page, url: string): Promise<void> {
  await page.goto(url, {
    waitUntil: 'domcontentloaded'
  });
  // await page.waitFor(5000);
  // const sec = await page.evaluate(() => {
  //   const text = document.querySelector('.J-time')?.textContent!;
  //   return parseInt(text.slice(text.indexOf('分') + 1));
  // });
  // // 减去各种损耗和误差
  // await page.waitFor(sec * 1000 - 1000);
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
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
        console.log(getSec());
        
        await page.waitFor(getSec() * 1000);
        await page.reload({
          waitUntil: 'domcontentloaded'
        });
        resolve();
      }
    };
    page.on('response', listener);
  });
}

async function clickReservation(page: puppeteer.Page): Promise<void> {
  await page.waitForSelector('#btn-reservation');
  return await page.evaluate(() => {
    setTimeout(() => {
      const btn = document.querySelector('#btn-reservation') as HTMLAnchorElement;
      btn.click();
    });
  });
}

async function checkInfo(page: puppeteer.Page): Promise<void> {
  return new Promise((resolve) => {
    const listener = async (response: puppeteer.Response) => {
      // 获取商品预约抢购信息的接口
      if (response.url().indexOf('https://yushou.jd.com/youshouinfo.action') >= 0) {
        page.off('response', listener);
        const text = await response.text();
        const data = JSON.parse(text.slice(10, text.length - 2));
        // eslint-disable-next-line no-console
        console.log(data.d);
        await clickReservation(page);
        resolve(data.info);
      }
    };
    page.on('response', listener);
  });
}

function scheduleCronstyle(page: puppeteer.Page) {
  for (const key in task) {
    const item = task[key as keyof typeof task];
    schedule.scheduleJob(item.预约时间, async () => {
      await checkInfo(page);
    });
    schedule.scheduleJob(item.抢购时间, async () => {
      await reload(page, item.url);
      await checkInfo(page);

      try {
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
  scheduleCronstyle(page);
})();