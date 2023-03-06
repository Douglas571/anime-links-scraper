const puppeteer = require('puppeteer-core')


let DEBUG = false
let HEADLESS = false

async function setUpBrowserInstance() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
    headless: HEADLESS,
  })

  if (DEBUG) console.log('[debug] browser set up')

  return browser
}

async function setUpPageInstance(browser) {
  if (DEBUG) console.log('[debug] page set up')
  const page = await browser.newPage({ waitUntil: "domcontentloaded"});
  await avoidLoadingUnnecessaryData(page)

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36')

  return page
}

async function takeScreenshot(page) {
  await page.screenshot({ path: 'screenshot.jpg' })
}

async function avoidLoadingUnnecessaryData(page) {
  await page.setRequestInterception(true)
  await page.on('request', (req) => {
    if (['image', 'stylesheet', 'font', 'png', 'gif'].includes(req.resourceType())) {
      req.abort()
    } else {
      req.continue()
    }
  })
}

async function getZippyshareLink(page, url) {
  await page.goto(url, { timeout: 0 })

  if (DEBUG) console.log(`[debug] page go to ${url}`)

  await page.waitForSelector('.Button.fa-download')

  // <a target="_blank" rel="nofollow" href="https://www10.zippyshare.com/v/3YauFI2O/file.html" class="Button Sm fa-download">DESCARGAR</a>

  let links = await page.$$eval('.Button.fa-download', buttons => {
    // TO-DO: Add the use case where page have multiple languages.
    return buttons.map( b => b.href )
  })
  let link = links.find(l => l.includes('zippyshare'))

  if (DEBUG) console.log(`[debug] scraped link to ${link}`)

  return link
}

async function getZippyshareDownloadLink(page, url) {
  // <a id="dlbutton" href="/d/3YauFI2O/43172/3162_1.mp4">
  //   <div class="download"></div>
  // </a>
  await page.goto(url, { timeout: 0 })

  await page.waitForSelector('#dlbutton')

  let link = await page.$eval('#dlbutton', button => button.href)

  if (DEBUG) console.log(`[debug] scraped download link to ${link}`)

  return link
}

(async () => {
  // SET UP
  const browser = await setUpBrowserInstance()

  let startEpisode = 19 
  let endEpisode = 24
  let slug = "https://www3.animeflv.net/ver/vinland-saga-"

  // SCRAPING

  let episodeLinks = Array.from({length: (endEpisode-startEpisode+1)}, (_, i) => `${slug}${startEpisode + i}`)
  
  let dlinks = await Promise.allSettled(episodeLinks.map( async url => {
    let page = await setUpPageInstance(browser)
    let zippyshareLink = await getZippyshareLink(page, url)
    let zippyshareDownloadLink = await getZippyshareDownloadLink(page, zippyshareLink)

    await page.close();

    if (DEBUG) console.log(`[debug] zippyshare download link scraped: ${zippyshareDownloadLink}`)

    return zippyshareDownloadLink
  }))

  dlinks = dlinks.map( p => p.value)

  // CONCLUTION

  console.log('the links are: ')
  dlinks.forEach(l => console.log(l))

  // CLEAN UP
  await browser.close();
  
})()
