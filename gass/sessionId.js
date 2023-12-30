// 登录接口
const LOGIN_URL = 'https://wgzx.gass.cn/wxopen/OnLogin'

// 全局变量
const GLOBAL_VALUES = {
  SESSION_ID_KEY: 'gassSessionId',
  SESSION_ID_DATE_KEY: 'gassSessionIdDate',
  GOODS: 'gassGoods',
  WORK_DAYS_KEY: 'gassWorkDays',
}

// 2024年日期为周一至周五的，但是是节假日的，字符串数组，日期格式为：yyyymmdd
const holiday = [
  // 元旦
  '20240101',
  // 春节
  '20240210',
  '20240211',
  '20240212',
  '20240213',
  '20240214',
  '20240215',
  '20240216',
  '20240217',
  // 清明节
  '20240404',
  '20240405',
  '20240406',
  // 劳动节
  '20240501',
  '20240502',
  '20240503',
  '20240504',
  '20240505',
  // 端午节
  '20240608',
  '20240609',
  '20240610',
  // 中秋节
  '20240915',
  '20240916',
  '20240917',
  // 国庆节
  '20241001',
  '20241002',
  '20241003',
  '20241004',
  '20241005',
  '20241006',
  '20241007',
]

// 调休工作日
const specialWeekdays = [
  '20230204',
  '20230218',
  '20230407',
  '20230428',
  '20230511',
  '20230914',
  '20230929',
  '20231012',
]

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



// 获取今日日期，格式为 20231229
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



;(() => {
  const url = $request.url

  if (url === LOGIN_URL) {
    const res = JSON.parse($response.body)

    const { sessionId } = res
    if (sessionId) {
      const sessionIdDate = readValue(GLOBAL_VALUES.SESSION_ID_DATE_KEY)
      const today = getToday()
      if (sessionIdDate === today) {
        $done({})
        return
      }
      storeValue(GLOBAL_VALUES.SESSION_ID_KEY, sessionId)
      storeValue(GLOBAL_VALUES.SESSION_ID_DATE_KEY, today)
      $notification.post(`${today} SessionId 更新`, sessionId)

      const workdays = getNextWeekWorkdays()
      storeValue(GLOBAL_VALUES.WORK_DAYS_KEY, JSON.stringify(workdays))

      Promise.all([fetchIndex(sessionId), fetchOrderQueryAcc(sessionId), fetchGoods()])
        .finally(() => {
          $done({})
        })
    }
  } else {
    const sessionId = readValue(GLOBAL_VALUES.SESSION_ID_KEY)
    if (sessionId) {
      storeValue(GLOBAL_VALUES.WORK_DAYS_KEY, '')

      const workdays = getNextWeekWorkdays()
      storeValue(GLOBAL_VALUES.WORK_DAYS_KEY, JSON.stringify(workdays))
      workdays.forEach((item) => {
        storeValue(item.key, '')
      })

      Promise.all([fetchGoods()])
        .then(([res1]) => {
          $notification.post(
            'Goods',
            `数量：${res1.length}，${res1[0].goodsName}`,
            `工作日：${readValue(GLOBAL_VALUES.WORK_DAYS_KEY)}`,
          )
        })
        .finally(() => {
          $done({})
        })
    } else {
      $done({})
    }
  }
})()
