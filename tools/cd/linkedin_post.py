#!/usr/bin/env python3

import os
import requests 
import json 

linkedin_user_id = os.environ.get("LINKEDIN_USER_ID")
linkedin_post_endpoint = "https://api.linkedin.com/v2/ugcPosts"



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

def main():

    pass


if __name__ == "__main__": 
    main()
