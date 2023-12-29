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
  }
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
          // console.log('fetchOrderQueryAcc res:', body)
          resolve(body)
        }
      }
    )
  })
}

// 登录接口
const LOGIN_URL = 'https://wgzx.gass.cn/wxopen/OnLogin'

// 全局变量
const GLOBAL_VALUES = {
  SESSION_ID_KEY: 'gassSessionId',
  SESSION_ID_DATE_KEY: 'gassSessionIdDate',
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

      // 清空菜单状态
      storeValue(getNextWeekday(1).key, '0')
      storeValue(getNextWeekday(2).key, '0')
      storeValue(getNextWeekday(3).key, '0')
      storeValue(getNextWeekday(4).key, '0')
      storeValue(getNextWeekday(5).key, '0')

      Promise.all([fetchIndex(sessionId), fetchOrderQueryAcc(sessionId)])
        .then(([res1, res2]) => {})
        .finally(() => {
          $done({})
        })
    }
  } else {
    const sessionId = readValue(GLOBAL_VALUES.SESSION_ID_KEY)
    if (sessionId) {
      Promise.all([fetchIndex(sessionId), fetchOrderQueryAcc(sessionId)])
        .then(([res1, res2]) => {
          $notification.post(
            '刷新账户信息',
            '',
            `${GLOBAL_VALUES.SESSION_ID_DATE_KEY}: ${readValue(GLOBAL_VALUES.SESSION_ID_DATE_KEY)}，${
              GLOBAL_VALUES.SESSION_ID_KEY
            }: ${sessionId}，账户信息：${res2}`
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
