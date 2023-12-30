// 全局变量
const GLOBAL_VALUES = {
  SESSION_ID_KEY: 'gassSessionId',
  SESSION_ID_DATE_KEY: 'gassSessionIdDate',
  GOODS: 'gassGoods',
  WORK_DAYS_KEY: 'gassWorkDays',
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
 * 获取所有商品
 * @returns 
 */
function getGoods() {
  const str = readValue(GLOBAL_VALUES.GOODS)
  if (!str) {
    return []
  }

  return JSON.parse(str)
}

/**
 * 获取菜单
 * @param {string} sessionId
 * @param {number} weekday 1-7
 * @returns
 */
function fetchPreMenu(sessionId, weekday) {
  const { key, date, no } = weekday
  return new Promise((resolve, reject) => {
    const status = readValue(key)
    console.log(`${key}:`, status)
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
            console.log(`${date}, desc: ${desc}!!!`)
            reject(desc)
          } else {
            if (data.length > 1) {
              const goods = getGoods()
              const data1 = data.slice(1)
              const menuStr = data1.map((item) => {
                const { goodsNo } = item
                const good = goods.find((good) => good.goodsNo === goodsNo)
                return good.goodsName
              }).join(',')

              $notification.post(`${date}(下周${no})菜单 王子请下单`, menuStr, menuStr)
              storeValue(key, '1')
            } else {
              console.log(`${date} 菜单未更新!!!!`)
            }

            resolve(data)
          }
        }
      }
    )
  })
}

;(() => {
  const sessionId = getSessionId()
  const sessionIdDate = readValue(GLOBAL_VALUES.SESSION_ID_DATE_KEY)
  console.log(`sessionId: ${sessionId}，sessionIdDate: ${sessionIdDate}`)

  if (!sessionId) {
    $notification.post('刷新菜单', '未获取到sessionId，请登录小程序')
    $done({})
    return
  } else {
    const workdaysStr = readValue(GLOBAL_VALUES.WORK_DAYS_KEY)
    if (!workdaysStr) {
      $notification.post('刷新菜单失败', '未获取到工作日，请登录小程序')
      $done({})
      return
    } else {
      const workdays = JSON.parse(workdaysStr)

      Promise.all([workdays.forEach((weekday) => fetchPreMenu(sessionId, weekday))])
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
  }
})()
