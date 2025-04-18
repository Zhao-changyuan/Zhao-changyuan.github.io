// 全局变量
const GLOBAL_VALUES = {
  SESSION_ID_KEY: 'gassSessionId',
  SESSION_ID_DATE_KEY: 'gassSessionIdDate',
  GOODS: 'gassGoods',
  WORK_DAYS_KEY: 'gassWorkDays',
  CUR_WORK_DAYS_KEY: 'curGassWorkDays',
  CUR_WORK_LAST_WORKDAY: 'curWeekLastWorkday',
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

function encodeFormData(data) {
  const pairs = [];
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
    }
  }
  return pairs.join('&');
}

function fetchGoods(sessionId) {
  return new Promise((resolve, reject) => {
    $httpClient.post(
      {
        url: `https://wgzx.gass.cn:18083/home/FetchGoods`,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // body: `SessionId=${sessionId}`,
        body: encodeFormData({
          SessionId: sessionId,
        }),
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
    const oldCount = readValue(key) ? +readValue(key) : 0
    console.log(`${key} oldCount:`, oldCount, typeof URLSearchParams)

    try {
      // const body = `SessionId=${sessionId}&RoomNo=1&ReserveDate=${date}&SegNo=2`
      $httpClient.post(
        {
          url: 'https://wgzx.gass.cn:18083/home/FetchPreMenu',
          headers: {
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: encodeFormData({
            SessionId: sessionId,
            RoomNo: '1',
            ReserveDate: date,
            SegNo: '2',
          }),
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
              console.log('FetchPreMenu data:', data.length, JSON.stringify(data))

              // 当日菜单数量未更新，不提醒
              const newCount = data.length
              if (data.length > 1 && oldCount !== newCount) {
                // 获取商品信息
                fetchGoods(sessionId).then((goods) => {
                  const menuStr = data
                    .map((item) => {
                      const { goodsNo } = item

                      // 获取商品详情
                      const good = goods.find((good) => good.goodsNo === goodsNo)

                      return `${good.goodsName}:${goodsNo}`
                    })
                    .join(',')

                  $notification.post(`${date.substring(2)}周${no}-王子请下单`, `共${newCount}，上新${newCount - oldCount}个!`, menuStr)
                  storeValue(key, `${newCount}`)
                })
              } else {
                console.log(`${date} 菜单无变化!!!`)
              }

              resolve(data)
            }
          }
        }
      )
    } catch (error) {
      console.error(error)
    } finally {
    }
  })
}

// 获取今日日期，格式为 20241229
function getToday() {
  const date = new Date()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${date.getFullYear()}${month}${day}`
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
    // const curWorkdaysStr = readValue(GLOBAL_VALUES.CUR_WORK_DAYS_KEY)
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
