const config = require('./config');

const axios = require('axios');
const qs = require('querystring');

const puppeteer = require('puppeteer-core');

async function pushStatus(message) {
    if (!config.push_api) {
        return;
    }

    let resp = await axios.post(config.push_api, qs.stringify({
        message
    }), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    if (!resp.success) {
        console.warn(resp.message);
    } else {
        console.info('Message pushed successfully');
    }
}

/**
 * @param {import('puppeteer-core').Page} page
 */
async function loginHandler(page) {
    if (!page.url().startsWith('https://newids.seu.edu.cn/authserver/login')) {
        return;
    }
    console.info('Enter login procedure');

    await page.evaluate((username, password) => {
        $('#username').val(username);
        $('#password').val(password);
        $('#casLoginForm').submit();
    }, config.username, config.password);
}

/**
 * @param {import('puppeteer-core').Page} page
 */
async function dailyReport(page) {
    const report_app = 'http://ehall.seu.edu.cn/qljfwapp2/sys/lwReportEpidemicSeu';

    await page.goto(report_app + '/index.do');

    let e = await page.waitForSelector('[data-action="add"]');
    if (!e) {
        throw 'Unable to find add button!';
    }

    console.info('Begin daily report procedure.');

    let resp = await Promise.all([
        page.waitForResponse(report_app + '/modules/dailyReport/getTodayHasReported.do')
            .then(r => r.json()),
        e.click()
    ]);
    if (resp[0].datas.getTodayHasReported.totalSize != 0) {
        console.info('Already reported!');
        return true;
    }

    console.debug('Waiting for temperature input.');

    let temp = (Math.random() * (config.report_range[1] - config.report_range[0]) + config.report_range[0]).toFixed(1);
    e = await page.waitForSelector('[data-name="DZ_JSDTCJTW"]');
    if (!e) {
        throw 'Unable to find temperature box!';
    }
    e.evaluate((e, v) => e.value = v, temp);

    console.debug('Searching for save button.');

    e = await page.waitForSelector('[data-action="save"]');
    if (!e) {
        throw 'Unable to find save button!';
    }
    e.click();

    console.debug('Searching for OK button.');

    e = await page.waitForSelector('.bh-dialog-btn.bh-bg-primary.bh-color-primary-5');
    if (!e) {
        throw 'Unable to find OK button!';
    }
    e.click();

    console.debug('Submitting...');

    e = await page.waitForResponse(report_app + '/modules/dailyReport/T_REPORT_EPIDEMIC_CHECKIN_SAVE.do')
        .then(r => r.json());
    if (e.code != '0') {
        throw 'Report failed!';
    }

    console.info('Report success! Temperature = ' + temp);
    return temp;
}

var browser = null;

(async () => {
    browser = await puppeteer.launch(Object.assign({
        args: [
            // '--no-sandbox',
            // '--disable-setuid-sandbox',
            '--window-size=1366,768',
            '--lang=zh-CN',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        defaultViewport: null
    }, config.browser));

    let page = await browser.newPage();
    page.addListener('load', async () => loginHandler(page));

    let temp = await dailyReport(page);
    if (temp !== true) {
        let date = new Date();
        await pushStatus('✅ SEU Report Success\nDate: `' + date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + '`\nTemperature: `' + temp + '`');
    }

    await page.close();
    await browser.close();
})().catch(e => {
    pushStatus('❌ SEU Report Error:\n`' + e.toString() + '`');
    if (browser) {
        browser.close();
    }
});
