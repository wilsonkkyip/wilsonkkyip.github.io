import os
import requests 

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

if __name__ == "__main__":
    linkedin_user_id = os.getenv("LINKEDIN_USER_ID")    # user_id 
    linkedin_token = os.getenv("LINKEDIN_TOKEN")        # access_token
    linkedin_post_endpoint = "https://api.linkedin.com/v2/ugcPosts"

    headers = {
        "X-Restli-Protocol-Version": "2.0.0",
        "Authorization": "Bearer " + linkedin_token 
    }

    body = build_post_body(
        user_id=linkedin_user_id,
        post_content="Content of the LinkedIn post",
        media_title="The title of the article",
        media_description="The description of the article",
        article_url="https://www.link-to-article.com/article"
    )

    response = requests.post(
        url=linkedin_post_endpoint, 
        json=body, 
        headers=headers
    )
    
