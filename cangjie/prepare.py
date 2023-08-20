import re 
import httpx
import asyncio
from itertools import chain
from bs4 import BeautifulSoup as bs
from asyncio import Semaphore, create_task, gather 

fileformat_baseurl = "https://www.fileformat.info/info/unicode/block"
fileformat_url = f"{fileformat_baseurl}/index.htm"
response = httpx.get(fileformat_url)
soup = bs(response.text)

atags = soup.select(".table tbody a")
atag_values = [x.contents[0] for x in atags]

cjk_tags = [atags[i] for i, x in enumerate(atag_values) if "CJK " in x]
cjk_urls = [x.get_attribute_list("href")[0] for x in cjk_tags]
cjk_urls = [f"{fileformat_baseurl}/{x.replace('index.htm', 'utf8test.htm')}" for x in cjk_urls]

async def _request(url, sem, client):
    async with sem:
        print("Requesting url: {}".format(url))
        try:
            response = await client.get(url)
            print(f"{response.status_code} for {url}")
            return response
        except Exception:
            print(f"failed for {url}")
            return None

async def _wrap_request(urls, sem):
    async with httpx.AsyncClient() as client:
        client.timeout = 30
        task = [create_task(_request(url, sem, client)) for url in urls]
        result = await gather(*task)
        return result

def request(urls, concurrency=50):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    sem = Semaphore(concurrency)
    result = asyncio.run(_wrap_request(urls, sem))
    loop.close()
    return result

sample_responses = request(cjk_urls)

cjk_baseurl = "https://www.fileformat.info"
sample_tables = [bs(x.text).select(".table tbody a") for x in sample_responses]
sample_urls = [
    [[y.contents[0], y.get_attribute_list("href")[0]] for y in x] for x in sample_tables
]
sample_urls = list(chain(*sample_urls))

for i, x in enumerate(sample_urls):
    sample_urls[i][1] = f"{cjk_baseurl}{x[1]}"

main_response = request([x[1] for x in sample_urls])

main_response_na = [i for i, x in enumerate(main_response) if x is None]
missing_urls = [sample_urls[i][1] for i in main_response_na]
missing_response = request(missing_urls)

failed_urls = [sample_urls[i][1] for i, x in enumerate(main_response) if (x.status_code != 200 if x is not None else False)]
failed_response = request(failed_urls)

final_responses = main_response + missing_response + failed_response
final_responses = [x for x in final_responses if x is not None]
final_responses = [x for x in final_responses if x.status_code == 200]


def process_response(x): 
    soup = bs(x)
    trs = soup.select("tr")
    output = {"url": x.url}
    for tr in trs:
        tds = tr.find_all("td")
        try:
            if tds[0].contents[0] == "kCangjie":
                output["kCangjie"] = tds[1].contents[0]
            if tds[0].contents[0] == "kTraditionalVariant":
                output["kTraditionalVariant"] = tds[1].contents[0]
        except Exception:
            continue
    return output


cangjie_list = [process_response(x) for x in final_responses]
final_list = [x for x in cangjie_list if (x.get("kCangjie") is not None) and (x.get("KTraditionalVariant") is None)]

re_utf8 = re.compile(".*char/(\\w+)/index.htm")

utf8_list = [bytes("\\u" + re_utf8.match(x["url"].path).groups()[0], "utf-8").decode("unicode-escape") for x in final_list]

output_list = {}
for x in final_list:
    char = re_utf8.match(x["url"].path).groups()[0]
    if len(char) > 4:
        char = bytes("\\U" + char.zfill(8), "utf-8").decode("unicode-escape")
    else:
        char = bytes("\\u" + char, "utf-8").decode("unicode-escape")
    output_list[char] = x["kCangjie"]

output_text = str(output_list).replace("'", '"')

with open("cangjie/main.js", "w",encoding='utf-8') as f:
    f.write(f"var data = " + output_text)

