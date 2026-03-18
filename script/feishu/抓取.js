const axios = require('axios');

const API_BASE_URL = 'https://orz.ai/api/v1/dailynews/';
const DEFAULT_TIMEOUT = 15000;

function getLogger() {
    if (typeof logger !== 'undefined' && logger) {
        return logger;
    }

    return console;
}

function requestJson(url, timeout) {
    return axios.get(url, {
        timeout,
        headers: {
            Accept: 'application/json'
        }
    }).then((response) => response.data);
}

function normalizeItem(item, platform) {
    return {
        platform: platform ? String(platform) : '',
        title: item && item.title ? String(item.title) : '',
        url: item && item.url ? String(item.url) : '',
        desc: item && (item.desc || item.content)
            ? String(item.desc || item.content)
            : ''
    };
}

function formatError(error) {
    if (!error) {
        return 'Unknown error';
    }

    return {
        message: error.message || String(error),
        code: error.code || '',
        status: error.response && error.response.status ? error.response.status : ''
    };
}

async function fetchPlatformNews(platform, timeout) {
    const requestUrl = `${API_BASE_URL}?platform=${encodeURIComponent(platform)}`;
    const payload = await requestJson(requestUrl, timeout);

    if (!payload || payload.status !== '200' || !Array.isArray(payload.data)) {
        throw new Error(payload && payload.msg ? payload.msg : `Invalid response for ${platform}`);
    }

    return payload.data.map((item) => normalizeItem(item, platform));
}

// 这是一个线上服务的一段脚本代码，不在本地运行
module.exports = async function main(arg1) {
    const log = getLogger();
    const timeout = arg1 && Number(arg1.timeout) > 0 ? Number(arg1.timeout) : DEFAULT_TIMEOUT;

    log.info('开始抓取热点新闻', { arg1, timeout });

    const [weiboResult, tskrResult] = await Promise.allSettled([
        fetchPlatformNews('weibo', timeout),
        fetchPlatformNews('36kr', timeout)
    ]);

    const result = [
        ...(weiboResult.status === 'fulfilled' ? weiboResult.value : []),
        ...(tskrResult.status === 'fulfilled' ? tskrResult.value : [])
    ];

    if (weiboResult.status === 'rejected') {
        log.error('抓取微博热搜失败', formatError(weiboResult.reason));
    }

    if (tskrResult.status === 'rejected') {
        log.error('抓取 36 氪热点失败', formatError(tskrResult.reason));
    }

    log.info('抓取热点新闻完成', {
        totalCount: result.length
    });

    return result;
};
