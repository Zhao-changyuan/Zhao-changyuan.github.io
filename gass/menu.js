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

// 从本地读取sessionId
function getSessionId() {
  return readValue('gassSessionId')
}

/**
 * 获取菜单
 * @param {string} sessionId
 * @param {number} weekday 1-7
 * @returns
 */
function fetchPreMenu(sessionId, weekday) {
  const { key, date } = getNextWeekday(weekday)
  return new Promise((resolve, reject) => {
    if (holiday.includes(date)) {
      console.log(`${date} 为节假日，不刷新菜单`);
      resolve(`${date} 为节假日，不刷新菜单！`)
      return
    }

    const status = readValue(key)
    console.log(`${key}:`, status);
    if (+status === 1) {
      resolve(status)
      return
    }

    const body = `SessionId=${sessionId}&RoomNo=1&ReserveDate=${date}&SegNo=2`
    $httpClient.post(
      {
        url: 'https://wgzx.gass.cn:18085/order/FetchPreMenu',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
      (error, response, body) => {
        if (error) {
          reject(error)
        } else {
          const res = JSON.parse(body)
          const { retcode, desc, data } = res

          if (retcode !== 0) {
            console.log(`${date}, desc: ${desc}!!!`);
            reject(desc)
          } else {
            if (data.length > 1) {
              $notification.post(`刷新菜单${date}`, `${date}(下周${weekday})菜单已更新，可下单`)
              storeValue(key, '1')
            } else {
              console.log(`${date} 菜单未更新!!!!`);
            }

            resolve(data)
          }
        }
      }
    )
  })
}

// 全局变量
const GLOBAL_VALUES = {
  SESSION_ID_KEY: 'gassSessionId',
  SESSION_ID_DATE_KEY: 'gassSessionIdDate',
}

;(() => {
  const sessionId = getSessionId()
  const sessionIdDate = readValue(GLOBAL_VALUES.SESSION_ID_DATE_KEY)
  console.log(`sessionId: ${sessionId}，sessionIdDate: ${sessionIdDate}`)

  if (!sessionId) {
    $notification.post('刷新菜单', '未获取到sessionId，请登录小程序')
    $done({})
    return;
  } else {
    Promise.all([fetchPreMenu(sessionId, 1), fetchPreMenu(sessionId, 2), fetchPreMenu(sessionId, 3), fetchPreMenu(sessionId, 4), fetchPreMenu(sessionId, 5)])
      .then((res) => {
        console.log('weekdayData:', res)
      })
      .catch((error) => {
        console.error(error)
        $notification.post('刷新菜单失败', error)
      })
      .finally(() => {
        $done({})
      })
  }
})()
