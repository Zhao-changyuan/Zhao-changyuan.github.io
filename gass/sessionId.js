// 登录接口 test
const LOGIN_URL = 'https://wgzx.gass.cn/wxopen/OnLogin'

// 全局变量
const GLOBAL_VALUES = {
  SESSION_ID_KEY: 'gassSessionId',
  SESSION_ID_DATE_KEY: 'gassSessionIdDate',
  GOODS: 'gassGoods',
  WORK_DAYS_KEY: 'gassWorkDays',
  CUR_WORK_DAYS_KEY: 'curGassWorkDays',
  CUR_WORK_LAST_WORKDAY: 'curWeekLastWorkday'
}

// 2025年日期为周一至周五的，但是是节假日的，字符串数组，日期格式为：yyyymmdd
const holiday = [
  // 元旦
  '20250101',
  // 春节
  '20250128',
  '20250129',
  '20250130',
  '20250131',
  '20250201',
  '20250202',
  '20250203',
  '20250204',
  // 清明节
  '20250404',
  '20250405',
  '20250406',
  // 劳动节
  '20250501',
  '20250502',
  '20250503',
  '20250504',
  '20250505',
  // 端午节
  '20250531',
  '20250601',
  '20250602',
  // 国庆节 & 中秋
  '20251001',
  '20251002',
  '20251003',
  '20251004',
  '20251005',
  '20251006',
  '20251007',
  '20251008',
];

// 2025 调休工作日
const specialWeekdays = [
  '20250126', // 春节调休
  '20250208', // 春节调休
  '20250427', // 劳动节调休
  '20250928', // 国庆节调休
  '20251011', // 国庆节调休
];

// 获取当前周7天的所有日期，格式为：yyyymmdd
function getCurWeekDays() {
  const arr = []
  const date = new Date()
  let day = date.getDay()
  // 默认周日day=0，后面依次1-6
  if (day === 0) {
    day = 7;
  }

  const cur = new Date(date.getTime() - (day - 1) * 24 * 60 * 60 * 1000)
  for (let i = 0; i < 7; i++) {
    const next = new Date(cur.getTime() + i * 24 * 60 * 60 * 1000)
    const month = `${next.getMonth() + 1}`.padStart(2, '0')
    const dayOfMonth = `${next.getDate()}`.padStart(2, '0')

    const dateStr = `${next.getFullYear()}${month}${dayOfMonth}`
    arr.push(dateStr)
  }

  return arr
}

/**
 * 获取下周的某个日期，参数为下周几的一个数字，1-7
 * @param {number} weekday 1-7
 * @returns
 */
function getNextWeekday(weekday) {
  const date = new Date()
  const day = date.getDay()
  const nextWeekday = new Date(date.getTime() + (7 - day + weekday) * 24 * 60 * 60 * 1000)
  const month = `${nextWeekday.getMonth() + 1}`.padStart(2, '0')
  const dayOfMonth = `${nextWeekday.getDate()}`.padStart(2, '0')

  const dateStr = `${nextWeekday.getFullYear()}${month}${dayOfMonth}`

  return {
    key: `menu${dateStr}`,
    date: dateStr,
    no: weekday,
  }
}

/**
 * 获取本周的某个日期，参数为周几的一个数字，1-7
 * @param {number} weekday 1-7
 * @returns
 */
function getCurWeekday(weekday) {
  const date = new Date()
  const day = date.getDay()
  const curWeekday = new Date(date.getTime() - (day - weekday) * 24 * 60 * 60 * 1000)
  const month = `${curWeekday.getMonth() + 1}`.padStart(2, '0')
  const dayOfMonth = `${curWeekday.getDate()}`.padStart(2, '0')

  const dateStr = `${curWeekday.getFullYear()}${month}${dayOfMonth}`

  return {
    key: `menu${dateStr}`,
    date: dateStr,
    no: weekday,
  }
}



// 获取本周最后一个工作日
function getCurWeekLastWorkday() {
  const arr = getCurWeekDays()
  let last = ''
  
  for (let i = 0; i < arr.length; i++) {
    const cur = arr[i]

    if (holiday.includes(cur) || ((i === 5 || i === 6) && !specialWeekdays.includes(cur))) {
      if (last) {
        break;
      } else {
        continue
      }
    } else {
      last = cur;
    }
  }

  return last
}

/**
 * 获取下周的工作日
 * @returns {Array<{key: string, date: string}>}
 */
function getNextWeekWorkdays() {
  const arr = []
  for (let i = 1; i <= 7; i++) {
    const cur = getNextWeekday(i)
    if (i <= 5) {
      if (!holiday.includes(cur.date)) {
        arr.push(cur)
      }
    } else {
      if (specialWeekdays.includes(cur.date)) {
        arr.push(cur)
      }
    }
  }

  return arr
}

/**
 * 获取本周的工作日
 * @returns {Array<{key: string, date: string}>}
 */
function getCurWeekWorkdays() {
  const arr = []
  for (let i = 1; i <= 7; i++) {
    const cur = getCurWeekday(i)
    if (i <= 5) {
      if (!holiday.includes(cur.date)) {
        arr.push(cur)
      }
    } else {
      if (specialWeekdays.includes(cur.date)) {
        arr.push(cur)
      }
    }
  }

  return arr
}


// 获取今日日期，格式为 20241229
function getToday() {
  const date = new Date()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${date.getFullYear()}${month}${day}`
}

/**
 * 保存数据
 * @param {string} key
 * @param {string} value
 */
function storeValue(key, value = '') {
  $persistentStore.write(value, key)
}

/**
 * 读取数据
 * @param {string} key
 * @returns
 */
function readValue(key) {
  if (!key) {
    return ''
  }

  return $persistentStore.read(key)
}

/**
 * 获取首页
 * @param {string} sessionId
 * @returns
 */
function fetchIndex(sessionId) {
  return new Promise((resolve, reject) => {
    $httpClient.get(
      {
        url: `https://wgzx.gass.cn:18085/?sessionid=${sessionId}`,
      },
      (err, response, body) => {
        if (err) {
          reject(err)
        } else {
          // console.log('fetchIndex res:', body)
          resolve(body)
        }
      }
    )
  })
}

/**
 * 查询账户信息
 * @param {string} sessionId
 * @returns
 */
function fetchOrderQueryAcc(sessionId) {
  return new Promise((resolve, reject) => {
    $httpClient.post(
      {
        url: `https://wgzx.gass.cn:18085/order/QueryAcc`,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `SessionId=${sessionId}`,
      },
      (err, response, body) => {
        if (err) {
          reject(err)
        } else {
          resolve(body)
        }
      }
    )
  })
}

function fetchGoods() {
  return new Promise((resolve, reject) => {
    $httpClient.post(
      {
        url: `https://wgzx.gass.cn:18085/order/FetchGoods`,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
      (err, response, body) => {
        if (err) {
          reject(err)
        } else {
          const res = JSON.parse(body)
          storeValue(GLOBAL_VALUES.GOODS, JSON.stringify(res.data))
          resolve(res.data)
        }
      }
    )
  })
}

// 随机0-360其中的一个数字
function getRandom() {
  return Math.floor(Math.random() * 360)
}



;(() => {
  const url = $request.url

  if (url === LOGIN_URL) {
    const res = JSON.parse($response.body)

    const { sessionId } = res
    if (sessionId) {
      const today = getToday()

      storeValue(GLOBAL_VALUES.SESSION_ID_KEY, sessionId)
      storeValue(GLOBAL_VALUES.SESSION_ID_DATE_KEY, today)
      // $notification.post(`${today}已登录`, sessionId, sessionId)

      const curWeekLastWorkday = getCurWeekLastWorkday()
      storeValue(GLOBAL_VALUES.CUR_WORK_LAST_WORKDAY, curWeekLastWorkday || '')


      const workdays = getNextWeekWorkdays()
      storeValue(GLOBAL_VALUES.WORK_DAYS_KEY, JSON.stringify(workdays))

      // const curWorkdays = getCurWeekWorkdays()
      // storeValue(GLOBAL_VALUES.CUR_WORK_DAYS_KEY, JSON.stringify(curWorkdays))

      Promise.all([fetchIndex(sessionId), fetchOrderQueryAcc(sessionId)])
        .then(([res1, res2, res3]) => {
          // $notification.post('Goods', `数量：${res3.length}`, `下周工作日：${readValue(GLOBAL_VALUES.WORK_DAYS_KEY)}`)
        })
        .finally(() => {
          $done({})
        })
    }
  } else {
    storeValue(GLOBAL_VALUES.CUR_WORK_DAYS_KEY, '')

    const curWeekLastWorkday = getCurWeekLastWorkday()
    storeValue(GLOBAL_VALUES.CUR_WORK_LAST_WORKDAY, curWeekLastWorkday || '')
    console.log('cur work last workday:', readValue(GLOBAL_VALUES.CUR_WORK_LAST_WORKDAY));
    // console.log('cur workdays:', readValue(GLOBAL_VALUES.CUR_WORK_DAYS_KEY));
    console.log('next workdays', readValue(GLOBAL_VALUES.WORK_DAYS_KEY));
    console.log('sessionId', readValue(GLOBAL_VALUES.SESSION_ID_KEY), readValue(GLOBAL_VALUES.SESSION_ID_DATE_KEY));
    $done({})
    
  }
})()
