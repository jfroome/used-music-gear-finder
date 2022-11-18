import { createPlaywrightRouter, Dataset, PlaywrightCrawler } from 'crawlee';
import { Listing } from "../models/listing.js";
import { createTokens } from "../util/createTokens.js";
import { createUID } from "../util/createUID.js";

// https://cicadasound.ca/collections/used

export const router = createPlaywrightRouter();
router.addHandler('SM_NEXT', async ({ request, page, enqueueLinks, log }) => {
    log.info("Crawling " + request.url);
    if (!request.url.includes('page')) {
        await page.waitForSelector('ul.page-numbers');
        let pages = await page.locator('li > a:not(.next).page-numbers');
        var maxPage = parseInt(await (await pages.last().allInnerTexts()).join()) ?? 0;
        let urls: string[] = [];
        for(let i = 2; i <= maxPage; i++){
            urls.push('https://www.spacemanmusic.com/shop/page/' + i + '/');
        }
        await enqueueLinks({
            urls: urls,
            label: 'SM_NEXT'
        })
    }
    await enqueueLinks({
        selector: 'div.info.style-grid1 > div.text-center > a[href*="product"]',
        label: 'SM_DETAILS',
        //limit: 12
    })
});

router.addHandler('SM_DETAILS', async ({ request, page, log }) => {
    log.debug(`Extracting data: ${request.url}`);
    log.info("Scraping " + request.url);

    //await page.locator('div[itemscope]').getAttribute('class').then((value) => { return !value?.includes('outOfStock')});
    var isInStock = await page.locator('.outofstock').count() == 0;

    //title
    const title = await page.locator('h1.entry-title').textContent();

    //description
    const description = await page.locator('#tab-description').allInnerTexts();

    //price
    const priceString = await page.locator('p.price').allInnerTexts();
    const priceNoDollarSign = priceString?.join().split("$")[1] ?? "";
    const price: number = parseFloat(priceNoDollarSign);

    //uid hash
    const id = await page.locator('div[itemscope][id*="product"]').getAttribute('id');
    let seed = request.url + id;
    const uid = createUID(seed);


    const listing: Listing = {
        uid: uid,
        title: title,
        description: description.join('\n'),
        price: price,
        shipping: null,
        currency: "CAD",
        site: "https://spacemanmusic.com/",
        url: request.url,
        posted: null,
        tags: createTokens(title),
        inStock: isInStock // if its listed its in stock at this store
    }
    log.debug(`Saving data: ${request.url}`)
    await Dataset.pushData(listing);
});