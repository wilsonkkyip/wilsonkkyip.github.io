#!/usr/bin/python

import os
import requests 
import json 
from time import time
import jwt
import yaml

def build_post_body(
    user_id, 
    post_content, 
    media_title, 
    media_description, 
    article_url
):
    body = {
        "author": f"urn:li:person:{user_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
            "shareCommentary": {
                    "text": post_content
                },
                "shareMediaCategory": "ARTICLE",
                "media": [
                    {
                        "status": "READY",
                        "description": {
                            "text": media_description
                        },
                        "originalUrl": article_url,
                        "title": {
                            "text": media_title
                        }
                    }
                ]
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }
    return body

def find_latest_missing_post(page_posts, linkedin_posts):
    page_post_paths = [x.get("path") for x in page_posts]
    linkedin_post_paths = [x.get("path") for x in linkedin_posts]
    missing_idx = [
        i for i, x in enumerate(page_post_paths) if x not in linkedin_post_paths
    ]
    
    if missing_idx:
        missing_paths = [page_post_paths[i] for i in missing_idx]
        missing_post_dates = [page_posts[i].get("date") for i in missing_idx]
        latest_missing_post = missing_paths[missing_post_dates.index(max(missing_post_dates))]
        latest_missing_post = page_posts[page_post_paths.index(latest_missing_post)]
    else:
        latest_missing_post = None

    return latest_missing_post

def read_rmd_yml(path):
    with open(path, "r") as f:
        rmd_yml = f.readlines()
    
    yml_idx = [i for i, x in enumerate(rmd_yml) if x == "---\n"]
    return yaml.safe_load("".join(rmd_yml[(yml_idx[0]+1):(yml_idx[1])]))

def auth_gapi_token(client_email, private_key_id, private_key):
    payload: dict = {
        "iss": client_email,
        "scope": "https://www.googleapis.com/auth/drive",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": int(time()),
        "exp": int(time() + 3599)
    }
    headers: dict[str, str] = {'kid': private_key_id}

    signed_jwt: bytes = jwt.encode(
        payload=payload,
        key=private_key.replace("\\n", "\n"),
        algorithm="RS256",
        headers=headers
    )

    body: dict = {
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed_jwt
    }
    response: requests.Response = requests.request(
        "POST", "https://oauth2.googleapis.com/token", json=body
    )

    response.raise_for_status()

    content = response.json()
    return content.get('access_token')

def read_gsheet(ssid, ranges, token):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{ssid}/values/{ranges}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def append_gsheet(ssid, ranges, data, token):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{ssid}/values/{ranges}:append"

    body = {
        "range": ranges,
        "majorDimension": "ROWS",
        "values": data
    }
    headers = {
        "Authorization": f"Bearer {token}"
    }
    response = requests.post(url, params={"valueInputOption": "RAW"}, headers=headers, json=body)
    response.raise_for_status()

def create_linkedin_post(post):
    linkedin_user_id = os.getenv("LINKEDIN_USER_ID")
    linkedin_token = os.getenv("LINKEDIN_TOKEN")
    linkedin_post_endpoint = "https://api.linkedin.com/v2/ugcPosts"

    rmd_file = os.listdir(f"./_{post['path']}")
    rmd_file = list(filter(lambda x: ".rmd" in x.lower(), rmd_file))[0]

    rmd_yml = read_rmd_yml(f"./_{post['path']}/{rmd_file}")
    post_note = "The post was created by Github Actions.\nhttps://github.com/wilsonkkyip/wilsonkkyip.github.io"
    abstract = rmd_yml["abstract"] + f"\n\n{post_note}"

    body = build_post_body(
        user_id=linkedin_user_id,
        post_content=abstract,
        media_title=rmd_yml["title"],
        media_description=rmd_yml["description"],
        article_url=f"https://wilsonkkyip.github.io/{post['path']}"
    )

    headers = {
        "X-Restli-Protocol-Version": "2.0.0",
        "Authorization": "Bearer " + linkedin_token 
    }

    response = requests.post(
        url=linkedin_post_endpoint, 
        json=body, 
        headers=headers
    )

    content = response.json()

    return content


def main():
    gcp_client_email = os.getenv("GCP_CLIENT_EMAIL")
    gcp_private_key_id = os.getenv("GCP_PRIVATE_KEY_ID")
    gcp_private_key = os.getenv("GCP_PRIVATE_KEY")

    log_ssid = os.getenv("LINKEDIN_POSTS_LOG_SSID")
    log_range = os.getenv("LINKEDIN_POSTS_LOG_RANGE")

    gcp_token = auth_gapi_token(
        gcp_client_email, gcp_private_key_id, gcp_private_key
    )

    logs = read_gsheet(log_ssid, log_range, gcp_token)
    linkedin_posts = [
        {logs["values"][0][0]: x[0], logs["values"][0][1]: x[1]} for x in logs["values"][1:]
    ]

    with open("./posts/posts.json", "r") as file:
        page_posts = json.loads(file.read())

    missing_post = find_latest_missing_post(page_posts, linkedin_posts)

    if missing_post:
        response = create_linkedin_post(missing_post)
        appending_data = [[missing_post["path"], response.get("id")]]
        append_gsheet(log_ssid, log_range, appending_data, gcp_token)

if __name__ == "__main__": 
    main()
