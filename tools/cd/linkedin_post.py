#!/usr/bin/python

import os
import requests 
import json 
import srsly
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

def main():
    linkedin_user_id = os.environ.get("LINKEDIN_USER_ID")
    linkedin_token = os.environ.get("LINKEDIN_TOKEN")
    linkedin_post_endpoint = "https://api.linkedin.com/v2/ugcPosts"

    with open("./posts/posts.json", "r") as file:
        page_posts = json.loads(file.read())

    linkedin_posts = list(srsly.read_jsonl("./tools/cd/linkedin_posts.json"))

    missing_post = find_latest_missing_post(page_posts, linkedin_posts)

    if missing_post:
        rmd_file = os.listdir(f"./_{missing_post['path']}")
        rmd_file = list(filter(lambda x: ".rmd" in x.lower(), rmd_file))[0]

        rmd_yml = read_rmd_yml(f"./_{missing_post['path']}/{rmd_file}")
        
        body = build_post_body(
            user_id=linkedin_user_id,
            post_content=rmd_yml["abstract"],
            media_title=rmd_yml["title"],
            media_description=rmd_yml["description"],
            article_url=f"https://wilsonkkyip.github.io/{missing_post['path']}"
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
        linkedin_posts.append({
            "path": missing_post["path"],
            "id": content.get("id")
        })

        srsly.write_jsonl("./tools/cd/linkedin_posts.json", linkedin_posts)

if __name__ == "__main__": 
    main()
